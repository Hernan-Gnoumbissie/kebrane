/**
 * Assemblage PCM des répliques d'un dialogue Hören.
 *
 * Pourquoi ne pas coller des MP3 bout à bout : un MP3 se découpe en trames et
 * porte un en-tête ; concaténer deux fichiers produit des trames orphelines,
 * des durées fausses et un clic audible à chaque raccord. On travaille donc sur
 * l'échantillon brut, où couper, silencer et normaliser sont des opérations
 * exactes, et on n'encode qu'UNE seule fois, à la fin.
 *
 * Format imposé par l'API TTS d'OpenAI pour `response_format: "pcm"` :
 * 24 000 Hz, 16 bits signés, little-endian, mono, sans en-tête.
 *
 * Module pur : que des `Int16Array`, aucune E/S. Il se teste sans réseau.
 */

export const FREQUENCE_HZ = 24_000;
export const OCTETS_PAR_ECHANTILLON = 2;

/** Convertit le binaire renvoyé par l'API en échantillons signés. */
export function pcmDepuisBuffer(buffer: Buffer): Int16Array {
  // Un buffer de longueur impaire signale une réponse tronquée : on refuse
  // plutôt que de décaler tout le signal d'un octet, ce qui produirait un
  // grésillement que personne ne saurait expliquer ensuite.
  if (buffer.length % OCTETS_PAR_ECHANTILLON !== 0) {
    throw new Error(`PCM tronqué : ${buffer.length} octets, attendu un multiple de 2`);
  }
  const echantillons = new Int16Array(buffer.length / OCTETS_PAR_ECHANTILLON);
  for (let i = 0; i < echantillons.length; i++) {
    echantillons[i] = buffer.readInt16LE(i * OCTETS_PAR_ECHANTILLON);
  }
  return echantillons;
}

export function dureeSecondes(echantillons: Int16Array): number {
  return echantillons.length / FREQUENCE_HZ;
}

export function silence(millisecondes: number): Int16Array {
  return new Int16Array(Math.max(0, Math.round((millisecondes / 1000) * FREQUENCE_HZ)));
}

/**
 * Rogne le silence de tête et de queue.
 *
 * Le TTS laisse souvent une respiration avant et après la phrase. Bout à bout,
 * ces respirations s'additionnent et le dialogue traîne. On coupe sous un seuil
 * d'amplitude, en gardant une marge : couper au ras de la première crête
 * ampute l'attaque de la consonne et donne un « uten Tag » au lieu d'un
 * « Guten Tag ».
 */
export function rognerSilences(
  echantillons: Int16Array,
  options: { seuil?: number; margeMs?: number } = {}
): Int16Array {
  const seuil = options.seuil ?? 500; // ~1,5 % de la pleine échelle (32 767)
  const marge = Math.round(((options.margeMs ?? 30) / 1000) * FREQUENCE_HZ);

  let debut = 0;
  while (debut < echantillons.length && Math.abs(echantillons[debut] ?? 0) < seuil) debut++;
  if (debut === echantillons.length) return new Int16Array(0); // segment entièrement muet

  let fin = echantillons.length - 1;
  while (fin > debut && Math.abs(echantillons[fin] ?? 0) < seuil) fin--;

  return echantillons.slice(Math.max(0, debut - marge), Math.min(echantillons.length, fin + marge + 1));
}

/**
 * Normalise en crête vers `cible` (fraction de la pleine échelle).
 *
 * Deux voix différentes ne sortent pas au même niveau ; sans cela l'apprenant
 * monte le volume pour l'un et le baisse pour l'autre. On normalise l'ensemble
 * du dialogue d'un seul gain, PAS chaque réplique séparément : un gain par
 * réplique écraserait les différences d'intensité voulues (une question posée
 * doucement, une réponse assurée) et sonnerait artificiel.
 */
export function normaliser(echantillons: Int16Array, cible = 0.89): Int16Array {
  let crete = 0;
  for (const e of echantillons) {
    const abs = Math.abs(e);
    if (abs > crete) crete = abs;
  }
  if (crete === 0) return echantillons;

  const gain = (cible * 32_767) / crete;
  // Un gain ≈ 1 ne justifie pas de réécrire tout le signal.
  if (gain > 0.98 && gain < 1.02) return echantillons;

  const sortie = new Int16Array(echantillons.length);
  for (let i = 0; i < echantillons.length; i++) {
    // Bornage explicite : une multiplication qui déborde de l'Int16 repasse
    // en négatif et produit une saturation atroce.
    sortie[i] = Math.max(-32_768, Math.min(32_767, Math.round((echantillons[i] ?? 0) * gain)));
  }
  return sortie;
}

export type SegmentPcm = {
  /** Identifiant du personnage — sert au contrôle d'alternance des voix. */
  speakerId: string;
  echantillons: Int16Array;
};

export type OptionsAssemblage = {
  /** Pause entre deux répliques du MÊME personnage (il enchaîne). */
  pauseMemeLocuteurMs?: number;
  /** Pause au changement de locuteur — le tour de parole, respiration réelle. */
  pauseChangementMs?: number;
  /** Amorce avant la première réplique, pour ne pas démarrer dans l'abrupt. */
  amorceMs?: number;
  /** Silence final, pour que la fin ne soit pas coupée net. */
  chuteMs?: number;
  normaliser?: boolean;
  rogner?: boolean;
};

export type ResultatAssemblage = {
  echantillons: Int16Array;
  dureeSecondes: number;
  /** Bornes de chaque réplique dans le fichier final, en secondes. */
  reperes: { speakerId: string; debut: number; fin: number }[];
};

/**
 * Assemble les répliques dans l'ordre.
 *
 * Les pauses sont courtes et inégales à dessein : une conversation réelle
 * enchaîne vite au sein d'un même tour de parole et marque un temps au
 * changement d'interlocuteur. Des pauses uniformes et longues produisent ce
 * rythme de répondeur automatique que le cahier des charges refuse.
 */
export function assemblerDialogue(
  segments: readonly SegmentPcm[],
  options: OptionsAssemblage = {}
): ResultatAssemblage {
  const pauseMeme = options.pauseMemeLocuteurMs ?? 120;
  const pauseChangement = options.pauseChangementMs ?? 320;
  const amorce = options.amorceMs ?? 150;
  const chute = options.chuteMs ?? 250;

  const morceaux: Int16Array[] = [];
  const reperes: ResultatAssemblage["reperes"] = [];
  let position = 0;

  const pousser = (bloc: Int16Array) => {
    if (bloc.length === 0) return;
    morceaux.push(bloc);
    position += bloc.length;
  };

  pousser(silence(amorce));

  segments.forEach((segment, index) => {
    const precedent = segments[index - 1];
    if (precedent) {
      pousser(
        silence(precedent.speakerId === segment.speakerId ? pauseMeme : pauseChangement)
      );
    }
    const voix =
      options.rogner === false ? segment.echantillons : rognerSilences(segment.echantillons);
    const debut = position / FREQUENCE_HZ;
    pousser(voix);
    reperes.push({ speakerId: segment.speakerId, debut, fin: position / FREQUENCE_HZ });
  });

  pousser(silence(chute));

  const total = morceaux.reduce((n, m) => n + m.length, 0);
  const assemble = new Int16Array(total);
  let curseur = 0;
  for (const m of morceaux) {
    assemble.set(m, curseur);
    curseur += m.length;
  }

  const final = options.normaliser === false ? assemble : normaliser(assemble);
  return { echantillons: final, dureeSecondes: dureeSecondes(final), reperes };
}

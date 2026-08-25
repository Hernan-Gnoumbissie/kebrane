/**
 * Encodage MP3 du dialogue assemblé.
 *
 * Un seul encodage, à la toute fin, sur le signal complet : c'est ce qui évite
 * les raccords audibles d'une concaténation de MP3 déjà encodés.
 *
 * L'encodeur est du JavaScript pur (`@breezystack/lamejs`, portage de LAME).
 * Choisi contre ffmpeg parce qu'il se comporte à l'identique dans WSL et dans
 * l'image `node:20-alpine` du worker, sans binaire système à maintenir dans
 * deux environnements. Note de licence : LGPL-3.0, utilisé sans modification et
 * uniquement côté serveur — le binaire n'est distribué à personne.
 */
import { FREQUENCE_HZ } from "@/lib/hoeren/pcm";

/**
 * 64 kbit/s mono à 24 kHz : la parole y est parfaitement intelligible, et le
 * poids compte. Une part des candidats écoute en données mobiles ; un dialogue
 * de 90 s pèse ~720 ko en MP3 contre ~4,3 Mo en WAV brut.
 */
export const DEBIT_KBPS = 64;

/** Taille de bloc recommandée par LAME — un multiple de 576 échantillons. */
const BLOC = 1152;

type EncodeurMp3 = {
  encodeBuffer(gauche: Int16Array, droite?: Int16Array): Uint8Array;
  flush(): Uint8Array;
};
type ConstructeurMp3 = new (canaux: number, frequence: number, kbps: number) => EncodeurMp3;

/**
 * Le paquet publie deux builds. L'ESM expose `Mp3Encoder` correctement ; celui
 * servi à `require` est un IIFE prévu pour le navigateur, qui n'affecte jamais
 * `module.exports` — un `import` statique se résout donc sur un objet vide dès
 * qu'on est transpilé en CJS (le worker sous tsx, les scripts), et casse à
 * l'exécution sur « Mp3Encoder is not a constructor », sans que le typecheck ne
 * voie quoi que ce soit.
 *
 * L'import DYNAMIQUE, lui, atteint la vraie build ESM dans les deux contextes.
 * D'où la fonction asynchrone, et le cache : l'encodeur ne se recharge pas à
 * chaque réplique.
 */
let constructeur: Promise<ConstructeurMp3> | null = null;

function chargerEncodeur(): Promise<ConstructeurMp3> {
  constructeur ??= import("@breezystack/lamejs").then((m) => {
    const mod = m as unknown as {
      Mp3Encoder?: ConstructeurMp3;
      default?: { Mp3Encoder?: ConstructeurMp3 };
    };
    const M = mod.Mp3Encoder ?? mod.default?.Mp3Encoder;
    if (!M) throw new Error("@breezystack/lamejs : Mp3Encoder introuvable");
    return M;
  });
  return constructeur;
}

export async function encoderMp3(
  echantillons: Int16Array,
  debitKbps = DEBIT_KBPS
): Promise<Buffer> {
  const Mp3Encoder = await chargerEncodeur();
  const encodeur = new Mp3Encoder(1, FREQUENCE_HZ, debitKbps);
  const morceaux: Uint8Array[] = [];

  for (let i = 0; i < echantillons.length; i += BLOC) {
    const bloc = echantillons.subarray(i, Math.min(i + BLOC, echantillons.length));
    const encode = encodeur.encodeBuffer(bloc);
    if (encode.length > 0) morceaux.push(encode);
  }
  // `flush` vide la dernière trame : l'omettre tronque la fin du dialogue.
  const reste = encodeur.flush();
  if (reste.length > 0) morceaux.push(reste);

  return Buffer.concat(morceaux.map((m) => Buffer.from(m)));
}

/**
 * Synthèse d'un dialogue : une réplique = un appel TTS = une voix.
 *
 * C'est ici que se joue la correction demandée. L'ancien chemin envoyait tout
 * le texte en un appel avec une voix tirée au sort ; ici chaque réplique part
 * avec la voix de SON personnage, et les segments sont recollés ensuite.
 *
 * Ce module orchestre mais ne touche ni la base ni le disque : on lui injecte
 * la fonction de synthèse. C'est ce qui permet de le tester sans dépenser un
 * centime d'API, tout en gardant la vraie intégration OpenAI en production
 * (aucun faux audio n'est produit ailleurs que dans les tests).
 */
import { assemblerDialogue, pcmDepuisBuffer, type SegmentPcm } from "@/lib/hoeren/pcm";
import { construireInstructions, supporteInstructions } from "@/lib/hoeren/instructions";
import { PROFILS_NIVEAU, type NiveauCecrl } from "@/lib/hoeren/situations";
import {
  casterPersonnages,
  profilParId,
  voixToutesDistinctes,
  type PersonnageCaste,
} from "@/lib/hoeren/voices";
import type { RepliqueGeneree } from "@/lib/hoeren/dialogue";

/** Signature d'un appel TTS brut — `lib/ai.ts` la satisfait telle quelle. */
export type AppelTts = (params: {
  text: string;
  voice: string;
  speed: number;
  model?: string;
  format?: "pcm";
  instructions?: string;
  userId?: string | null;
}) => Promise<Buffer>;

export type ParametresSynthese = {
  repliques: readonly RepliqueGeneree[];
  castes: readonly PersonnageCaste[];
  niveau: NiveauCecrl;
  modele: string;
  decor?: string;
  userId?: string | null;
  /** Nombre de tentatives par réplique avant de changer de voix. */
  essaisParReplique?: number;
};

export type SegmentSynthetise = {
  index: number;
  speakerId: string;
  voix: string;
  debut: number;
  fin: number;
};

export type ResultatSynthese = {
  echantillons: Int16Array;
  dureeSecondes: number;
  segments: SegmentSynthetise[];
  /** Casting effectivement utilisé — il peut différer si une voix a échoué. */
  castes: PersonnageCaste[];
  /** Incidents traversés, à journaliser même en cas de succès final. */
  incidents: string[];
};

export class SyntheseError extends Error {
  constructor(
    message: string,
    readonly incidents: string[]
  ) {
    super(message);
    this.name = "SyntheseError";
  }
}

const attendre = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Synthétise puis assemble.
 *
 * Politique d'échec (point 17 du cahier des charges) : on retente la même voix,
 * puis on RECASTE le personnage sur une autre voix libre, puis on abandonne.
 * Abandonner est un résultat acceptable ; publier un dialogue amputé d'une
 * réplique ne l'est pas — l'apprenant entendrait une question sans réponse et
 * conclurait qu'il n'a pas compris.
 */
export async function synthetiserDialogue(
  params: ParametresSynthese,
  tts: AppelTts
): Promise<ResultatSynthese> {
  const incidents: string[] = [];
  const profilNiveau = PROFILS_NIVEAU[params.niveau];
  const avecInstructions = supporteInstructions(params.modele);

  let castes = [...params.castes];
  if (!voixToutesDistinctes(castes)) {
    // Garde-fou : on ne synthétise pas un dialogue dont deux personnages
    // partagent une voix, c'est exactement le défaut qu'on corrige.
    incidents.push("Casting reçu avec des voix en doublon — recasting complet.");
    castes = casterPersonnages(castes);
  }

  const essais = params.essaisParReplique ?? 2;
  const segments: SegmentPcm[] = [];
  const meta: { speakerId: string; voix: string }[] = [];

  for (const [index, replique] of params.repliques.entries()) {
    const caste = castes.find((c) => c.id === replique.speaker_id);
    if (!caste) {
      throw new SyntheseError(
        `Réplique ${index + 1} attribuée au personnage inconnu « ${replique.speaker_id} »`,
        incidents
      );
    }

    let pcm: Int16Array | null = null;
    for (let tentative = 1; tentative <= essais && pcm === null; tentative++) {
      try {
        const profil = profilParId(caste.profilId);
        const buffer = await tts({
          text: replique.text,
          voice: caste.voix,
          speed: profilNiveau.vitesse,
          model: params.modele,
          format: "pcm",
          userId: params.userId ?? null,
          ...(avecInstructions && profil
            ? {
                instructions: construireInstructions({
                  profil,
                  niveau: params.niveau,
                  role: caste.role,
                  decor: params.decor,
                }),
              }
            : {}),
        });
        pcm = pcmDepuisBuffer(buffer);
      } catch (e) {
        const raison = e instanceof Error ? e.message : "erreur inconnue";
        incidents.push(
          `Réplique ${index + 1} (${caste.voix}), tentative ${tentative}/${essais} : ${raison}`
        );
        if (tentative < essais) await attendre(500 * tentative);
      }
    }

    if (pcm === null) {
      // Dernier recours : une autre voix, en excluant celles déjà distribuées
      // pour ne pas recréer le doublon qu'on interdit.
      const exclues = castes.map((c) => c.voix);
      const [recaste] = casterPersonnages([caste], { exclues });
      if (!recaste) {
        throw new SyntheseError(`Aucune voix de repli disponible pour ${caste.nom}`, incidents);
      }
      incidents.push(`Repli : ${caste.nom} passe de ${caste.voix} à ${recaste.voix}.`);
      try {
        const buffer = await tts({
          text: replique.text,
          voice: recaste.voix,
          speed: profilNiveau.vitesse,
          model: params.modele,
          format: "pcm",
          userId: params.userId ?? null,
        });
        pcm = pcmDepuisBuffer(buffer);
        castes = castes.map((c) => (c.id === recaste.id ? recaste : c));
      } catch (e) {
        throw new SyntheseError(
          `Réplique ${index + 1} définitivement impossible : ${e instanceof Error ? e.message : "erreur inconnue"}`,
          incidents
        );
      }
    }

    segments.push({ speakerId: replique.speaker_id, echantillons: pcm });
    const voixUtilisee = castes.find((c) => c.id === replique.speaker_id)?.voix ?? caste.voix;
    meta.push({ speakerId: replique.speaker_id, voix: voixUtilisee });
  }

  // Contrôle avant assemblage : autant de segments que de répliques. Un
  // dialogue amputé ne doit jamais atteindre le statut READY.
  if (segments.length !== params.repliques.length) {
    throw new SyntheseError(
      `Segments manquants : ${segments.length}/${params.repliques.length}`,
      incidents
    );
  }

  const assemble = assemblerDialogue(segments);

  return {
    echantillons: assemble.echantillons,
    dureeSecondes: assemble.dureeSecondes,
    segments: assemble.reperes.map((r, i) => ({
      index: i,
      speakerId: r.speakerId,
      voix: meta[i]?.voix ?? "",
      debut: Math.round(r.debut * 1000) / 1000,
      fin: Math.round(r.fin * 1000) / 1000,
    })),
    castes,
    incidents,
  };
}

/**
 * Contrôles postérieurs à l'assemblage (point 16, « validation audio »).
 * Retourne les raisons de refus ; vide = publiable.
 */
export function validerAudioAssemble(
  resultat: ResultatSynthese,
  attendu: { repliques: number; dureeEstimeeSecondes: number }
): string[] {
  const refus: string[] = [];
  if (resultat.segments.length !== attendu.repliques) {
    refus.push(`${resultat.segments.length} segments pour ${attendu.repliques} répliques.`);
  }
  if (resultat.dureeSecondes < 3) {
    refus.push(`Durée finale invraisemblable : ${resultat.dureeSecondes.toFixed(1)} s.`);
  }
  // Une durée très éloignée de l'estimation signale un segment vide ou une
  // réplique doublée — deux pannes silencieuses qu'un fichier valide masque.
  const rapport = resultat.dureeSecondes / Math.max(1, attendu.dureeEstimeeSecondes);
  if (rapport < 0.4 || rapport > 2.5) {
    refus.push(
      `Durée ${resultat.dureeSecondes.toFixed(1)} s très éloignée de l'estimation ${attendu.dureeEstimeeSecondes} s.`
    );
  }
  const vides = resultat.segments.filter((s) => s.fin - s.debut < 0.15);
  if (vides.length > 0) {
    refus.push(`${vides.length} segment(s) quasi muet(s).`);
  }
  return refus;
}

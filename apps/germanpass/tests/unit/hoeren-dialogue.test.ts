import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  casterPersonnages,
  voixToutesDistinctes,
  PROFILS_VOCAUX,
  CastingImpossibleError,
  type PersonnageDemande,
} from "@/lib/hoeren/voices";
import {
  dialogueGenereSchema,
  transcript,
  validerCasting,
  validerDialogue,
  versPersonnagesDemandes,
  type DialogueGenere,
} from "@/lib/hoeren/dialogue";
import {
  FREQUENCE_HZ,
  assemblerDialogue,
  normaliser,
  pcmDepuisBuffer,
  rognerSilences,
  silence,
} from "@/lib/hoeren/pcm";
import { construireInstructions, supporteInstructions } from "@/lib/hoeren/instructions";
import { PROFILS_NIVEAU, locuteursCibles, situationParCle } from "@/lib/hoeren/situations";
import { synthetiserDialogue, validerAudioAssemble } from "@/lib/hoeren/synthese";

// ── Fixture : l'exercice de recette demandé — B1, Termin beim Arzt ──────────
const TERMIN_BEIM_ARZT: DialogueGenere = {
  title: "Ein Termin beim Arzt",
  speakers: [
    { id: "speaker_1", name: "Patient", gender: "male", age_group: "adult", role: "le patient" },
    { id: "speaker_2", name: "Ärztin", gender: "female", age_group: "adult", role: "la médecin" },
  ],
  dialogue: [
    { speaker_id: "speaker_1", text: "Guten Morgen. Ich habe seit gestern starke Kopfschmerzen." },
    { speaker_id: "speaker_2", text: "Guten Morgen. Haben Sie auch Fieber?" },
    { speaker_id: "speaker_1", text: "Nein, Fieber habe ich nicht. Aber ich schlafe sehr schlecht." },
    { speaker_id: "speaker_2", text: "Wie lange geht das schon so?" },
    { speaker_id: "speaker_1", text: "Seit ungefähr zwei Wochen, würde ich sagen." },
    { speaker_id: "speaker_2", text: "Dann machen wir am Donnerstagvormittag eine Untersuchung." },
    { speaker_id: "speaker_1", text: "Am Donnerstagvormittag passt mir gut." },
    { speaker_id: "speaker_2", text: "Um zehn Uhr hätte ich noch einen Termin frei." },
    { speaker_id: "speaker_1", text: "Sehr gern. Muss ich etwas mitbringen?" },
    { speaker_id: "speaker_2", text: "Bringen Sie bitte Ihre Versichertenkarte und die alten Befunde mit." },
  ],
  questions: [
    {
      prompt: "Wann bekommt der Patient einen Termin?",
      explanation: "Die Ärztin sagt: „Um zehn Uhr hätte ich noch einen Termin frei.“",
      explanationFr: "La médecin propose dix heures le jeudi matin.",
      explanationEn: "The doctor offers ten o'clock on Thursday morning.",
      options: [
        { text: "Am Donnerstag um zehn Uhr", isCorrect: true },
        { text: "Am Dienstag um zehn Uhr", isCorrect: false },
        { text: "Am Donnerstag um zwei Uhr", isCorrect: false },
      ],
    },
  ],
};

describe("casting vocal", () => {
  test("deux personnages ne reçoivent JAMAIS la même voix", () => {
    const castes = casterPersonnages(versPersonnagesDemandes(TERMIN_BEIM_ARZT));
    assert.equal(castes.length, 2);
    assert.notEqual(castes[0]!.voix, castes[1]!.voix);
    assert.ok(voixToutesDistinctes(castes));
    assert.deepEqual(validerCasting(castes), []);
  });

  test("le casting suit le genre perçu quand il le peut", () => {
    const castes = casterPersonnages(versPersonnagesDemandes(TERMIN_BEIM_ARZT));
    const patient = castes.find((c) => c.id === "speaker_1")!;
    const medecin = castes.find((c) => c.id === "speaker_2")!;
    assert.equal(PROFILS_VOCAUX.find((p) => p.id === patient.profilId)!.percu.genre, "masculin");
    assert.equal(PROFILS_VOCAUX.find((p) => p.id === medecin.profilId)!.percu.genre, "feminin");
  });

  test("quatre personnages du même genre gardent quatre voix distinctes", () => {
    // Le cas qui casse une implémentation naïve : quand le critère de genre ne
    // peut plus être satisfait, la distinction des voix doit primer.
    const quatre: PersonnageDemande[] = [1, 2, 3, 4].map((n) => ({
      id: `speaker_${n}`,
      nom: `Person ${n}`,
      genre: "feminin" as const,
    }));
    const castes = casterPersonnages(quatre);
    assert.ok(voixToutesDistinctes(castes));
  });

  test("les voix exclues ne sont pas redistribuées", () => {
    const premier = casterPersonnages(versPersonnagesDemandes(TERMIN_BEIM_ARZT));
    const second = casterPersonnages(versPersonnagesDemandes(TERMIN_BEIM_ARZT), {
      exclues: premier.map((c) => c.voix),
    });
    for (const c of second) {
      assert.ok(!premier.some((p) => p.voix === c.voix), `${c.voix} a été redistribuée`);
    }
  });

  test("un casting impossible échoue au lieu de doubler une voix", () => {
    const trop: PersonnageDemande[] = Array.from({ length: PROFILS_VOCAUX.length + 1 }, (_, i) => ({
      id: `s${i}`,
      nom: `P${i}`,
      genre: "neutre" as const,
    }));
    assert.throws(() => casterPersonnages(trop), CastingImpossibleError);
  });
});

describe("validation du dialogue", () => {
  test("la fixture B1 est valide", () => {
    assert.deepEqual(validerDialogue(TERMIN_BEIM_ARZT, "B1"), []);
    assert.doesNotThrow(() => dialogueGenereSchema.parse(TERMIN_BEIM_ARZT));
  });

  test("une étiquette de locuteur dans la réplique est refusée", () => {
    // C'est l'exigence centrale : l'apprenant ne doit jamais entendre
    // « Mann sagt ». Le texte partant tel quel au TTS, on refuse à la source.
    const pollue: DialogueGenere = {
      ...TERMIN_BEIM_ARZT,
      dialogue: [
        { speaker_id: "speaker_1", text: "Mann: Guten Morgen." },
        { speaker_id: "speaker_2", text: "Guten Morgen." },
      ],
    };
    const codes = validerDialogue(pollue, "B1").map((p) => p.code);
    assert.ok(codes.includes("DIDASCALIE_DANS_LA_REPLIQUE"));
  });

  test("un personnage déclaré mais muet est signalé", () => {
    const muet: DialogueGenere = {
      ...TERMIN_BEIM_ARZT,
      dialogue: TERMIN_BEIM_ARZT.dialogue.filter((r) => r.speaker_id === "speaker_1"),
    };
    const codes = validerDialogue(muet, "B1").map((p) => p.code);
    assert.ok(codes.includes("PERSONNAGE_MUET"));
    assert.ok(codes.includes("MONOLOGUE_DEGUISE"));
  });

  test("une réplique attribuée à un inconnu est signalée", () => {
    const orpheline: DialogueGenere = {
      ...TERMIN_BEIM_ARZT,
      dialogue: [...TERMIN_BEIM_ARZT.dialogue, { speaker_id: "speaker_9", text: "Hallo." }],
    };
    assert.ok(
      validerDialogue(orpheline, "B1").some((p) => p.code === "REPLIQUE_ORPHELINE")
    );
  });

  test("le niveau A1 refuse un dialogue trop long en locuteurs", () => {
    const trois: DialogueGenere = {
      ...TERMIN_BEIM_ARZT,
      speakers: [
        ...TERMIN_BEIM_ARZT.speakers,
        { id: "speaker_3", name: "Pfleger", gender: "male" },
      ],
      dialogue: [...TERMIN_BEIM_ARZT.dialogue, { speaker_id: "speaker_3", text: "Bitte hier warten." }],
    };
    assert.ok(validerDialogue(trois, "A1").some((p) => p.code === "TROP_DE_LOCUTEURS"));
  });

  test("le transcript nomme les locuteurs, les répliques non", () => {
    const texte = transcript(TERMIN_BEIM_ARZT);
    assert.match(texte, /^Patient: Guten Morgen\./);
    assert.ok(texte.includes("Ärztin: Guten Morgen. Haben Sie auch Fieber?"));
    // Le transcript sert la relecture et l'anti-copie ; il ne part pas au TTS.
    for (const r of TERMIN_BEIM_ARZT.dialogue) {
      assert.ok(!/^(Patient|Ärztin):/.test(r.text));
    }
  });
});

describe("profils de niveau", () => {
  test("la difficulté ne se joue pas que sur le vocabulaire", () => {
    // Débit, longueur et nombre de locuteurs doivent progresser avec le niveau.
    assert.ok(PROFILS_NIVEAU.A1.vitesse < PROFILS_NIVEAU.B1.vitesse);
    assert.ok(PROFILS_NIVEAU.B1.vitesse <= PROFILS_NIVEAU.C1.vitesse);
    assert.ok(PROFILS_NIVEAU.A1.motsParReplique.max < PROFILS_NIVEAU.C1.motsParReplique.max);
    assert.ok(PROFILS_NIVEAU.A1.locuteursMax < PROFILS_NIVEAU.B2.locuteursMax);
    assert.ok(PROFILS_NIVEAU.A1.dureeCibleSecondes < PROFILS_NIVEAU.C1.dureeCibleSecondes);
  });

  test("une Durchsage reste un monologue, une Diskussion garde ses voix", () => {
    assert.equal(locuteursCibles(situationParCle("DURCHSAGE")!, "B1"), 1);
    assert.equal(locuteursCibles(situationParCle("TELEFONAT")!, "B1"), 2);
    assert.ok(locuteursCibles(situationParCle("DISKUSSION")!, "B2") >= 3);
  });
});

describe("instructions de jeu", () => {
  test("tts-1 ne supporte pas instructions, gpt-4o-mini-tts si", () => {
    assert.equal(supporteInstructions("tts-1"), false);
    assert.equal(supporteInstructions("tts-1-hd"), false);
    assert.equal(supporteInstructions("gpt-4o-mini-tts"), true);
  });

  test("les instructions interdisent explicitement d'annoncer le personnage", () => {
    const texte = construireInstructions({
      profil: PROFILS_VOCAUX[0]!,
      niveau: "B1",
      role: "le patient",
    });
    assert.match(texte, /UNIQUEMENT le texte fourni/);
    assert.match(texte, /aucun nom de personnage/i);
  });
});

// ── PCM : le module qui décide de la qualité audio ─────────────────────────
const bufferPcm = (echantillons: number[]): Buffer => {
  const b = Buffer.alloc(echantillons.length * 2);
  echantillons.forEach((v, i) => b.writeInt16LE(v, i * 2));
  return b;
};

/** Un segment audible d'une durée donnée, amplitude constante. */
const ton = (secondes: number, amplitude = 8000): Int16Array =>
  Int16Array.from({ length: Math.round(secondes * FREQUENCE_HZ) }, () => amplitude);

describe("assemblage PCM", () => {
  test("un buffer de longueur impaire est refusé plutôt que décalé", () => {
    assert.throws(() => pcmDepuisBuffer(Buffer.alloc(5)), /tronqué/);
  });

  test("le décodage little-endian conserve les valeurs signées", () => {
    const decode = pcmDepuisBuffer(bufferPcm([0, 1000, -1000, 32767, -32768]));
    assert.deepEqual([...decode], [0, 1000, -1000, 32767, -32768]);
  });

  test("le rognage retire les silences de bord et garde la parole", () => {
    const avec = new Int16Array([...silence(200), ...ton(0.5), ...silence(200)]);
    const rogne = rognerSilences(avec);
    assert.ok(rogne.length < avec.length, "rien n'a été rogné");
    assert.ok(rogne.length >= 0.5 * FREQUENCE_HZ, "la parole a été amputée");
  });

  test("un segment entièrement muet devient vide, il n'est pas gardé tel quel", () => {
    assert.equal(rognerSilences(silence(400)).length, 0);
  });

  test("la normalisation ramène la crête vers la cible sans saturer", () => {
    const faible = normaliser(ton(0.1, 1000));
    let crete = 0;
    for (const e of faible) crete = Math.max(crete, Math.abs(e));
    assert.ok(crete > 25_000 && crete <= 32_767, `crête inattendue : ${crete}`);
  });

  test("l'assemblage respecte l'ordre et alterne les locuteurs", () => {
    const resultat = assemblerDialogue([
      { speakerId: "speaker_1", echantillons: ton(0.4) },
      { speakerId: "speaker_2", echantillons: ton(0.4) },
      { speakerId: "speaker_1", echantillons: ton(0.4) },
    ]);
    assert.deepEqual(
      resultat.reperes.map((r) => r.speakerId),
      ["speaker_1", "speaker_2", "speaker_1"]
    );
    // Les repères se suivent sans se chevaucher.
    for (let i = 1; i < resultat.reperes.length; i++) {
      assert.ok(resultat.reperes[i]!.debut >= resultat.reperes[i - 1]!.fin);
    }
  });

  test("la pause est plus longue au changement de locuteur qu'à l'intérieur d'un tour", () => {
    // Ce qui distingue une conversation d'une lecture enchaînée.
    const memeLocuteur = assemblerDialogue([
      { speakerId: "s1", echantillons: ton(0.3) },
      { speakerId: "s1", echantillons: ton(0.3) },
    ]);
    const changement = assemblerDialogue([
      { speakerId: "s1", echantillons: ton(0.3) },
      { speakerId: "s2", echantillons: ton(0.3) },
    ]);
    const ecart = (r: typeof memeLocuteur) => r.reperes[1]!.debut - r.reperes[0]!.fin;
    assert.ok(ecart(changement) > ecart(memeLocuteur));
  });

  test("la durée finale est cohérente avec la somme des répliques", () => {
    const resultat = assemblerDialogue([
      { speakerId: "s1", echantillons: ton(1) },
      { speakerId: "s2", echantillons: ton(1) },
    ]);
    assert.ok(resultat.dureeSecondes > 2, "trop court");
    assert.ok(resultat.dureeSecondes < 3.5, "trop de silence ajouté");
  });
});

// ── Synthèse : la preuve d'alternance demandée, sans appel réseau ──────────
describe("synthèse du dialogue", () => {
  /** Faux TTS : renvoie un PCM dont l'amplitude encode la voix utilisée. */
  const ttsFactice = (appels: { text: string; voice: string }[]) =>
    async (p: { text: string; voice: string }) => {
      appels.push({ text: p.text, voice: p.voice });
      return bufferPcm(Array.from({ length: 4800 }, () => 6000)); // 0,2 s
    };

  test("chaque réplique part avec la voix de SON personnage", async () => {
    const appels: { text: string; voice: string }[] = [];
    const castes = casterPersonnages(versPersonnagesDemandes(TERMIN_BEIM_ARZT));

    const resultat = await synthetiserDialogue(
      {
        repliques: TERMIN_BEIM_ARZT.dialogue,
        castes,
        niveau: "B1",
        modele: "gpt-4o-mini-tts",
      },
      ttsFactice(appels)
    );

    assert.equal(appels.length, TERMIN_BEIM_ARZT.dialogue.length);

    // L'exigence de recette, littéralement : réplique 1 = voix A,
    // réplique 2 = voix B, réplique 3 = voix A, réplique 4 = voix B.
    const voixA = castes.find((c) => c.id === "speaker_1")!.voix;
    const voixB = castes.find((c) => c.id === "speaker_2")!.voix;
    assert.notEqual(voixA, voixB);
    assert.equal(appels[0]!.voice, voixA);
    assert.equal(appels[1]!.voice, voixB);
    assert.equal(appels[2]!.voice, voixA);
    assert.equal(appels[3]!.voice, voixB);

    // Et le texte envoyé est exactement la réplique, sans étiquette ajoutée.
    assert.equal(appels[0]!.text, TERMIN_BEIM_ARZT.dialogue[0]!.text);
    assert.equal(resultat.segments.length, TERMIN_BEIM_ARZT.dialogue.length);
  });

  test("une voix qui échoue est remplacée, jamais dupliquée", async () => {
    const castes = casterPersonnages(versPersonnagesDemandes(TERMIN_BEIM_ARZT));
    const voixCassee = castes[0]!.voix;
    const utilisees: string[] = [];

    const resultat = await synthetiserDialogue(
      {
        repliques: TERMIN_BEIM_ARZT.dialogue.slice(0, 4),
        castes,
        niveau: "B1",
        modele: "gpt-4o-mini-tts",
        essaisParReplique: 1,
      },
      async (p) => {
        if (p.voice === voixCassee) throw new Error("voix indisponible");
        utilisees.push(p.voice);
        return bufferPcm(Array.from({ length: 4800 }, () => 6000));
      }
    );

    assert.ok(resultat.incidents.some((i) => i.includes("Repli")));
    assert.ok(voixToutesDistinctes(resultat.castes), "le repli a créé un doublon");
    assert.ok(!utilisees.includes(voixCassee));
  });

  test("un échec total lève au lieu de rendre un dialogue amputé", async () => {
    const castes = casterPersonnages(versPersonnagesDemandes(TERMIN_BEIM_ARZT));
    await assert.rejects(
      synthetiserDialogue(
        {
          repliques: TERMIN_BEIM_ARZT.dialogue.slice(0, 2),
          castes,
          niveau: "B1",
          modele: "gpt-4o-mini-tts",
          essaisParReplique: 1,
        },
        async () => {
          throw new Error("API indisponible");
        }
      ),
      /impossible/
    );
  });

  test("un casting reçu avec des voix en doublon est corrigé avant synthèse", async () => {
    const appels: { text: string; voice: string }[] = [];
    const castes = casterPersonnages(versPersonnagesDemandes(TERMIN_BEIM_ARZT));
    // On force le défaut historique : les deux personnages, une seule voix.
    const doublon = castes.map((c) => ({ ...c, voix: castes[0]!.voix }));

    const resultat = await synthetiserDialogue(
      {
        repliques: TERMIN_BEIM_ARZT.dialogue.slice(0, 4),
        castes: doublon,
        niveau: "B1",
        modele: "gpt-4o-mini-tts",
      },
      ttsFactice(appels)
    );

    assert.ok(voixToutesDistinctes(resultat.castes));
    assert.notEqual(appels[0]!.voice, appels[1]!.voice);
  });

  test("un audio trop court ou incomplet est refusé à la validation", () => {
    const bidon = {
      echantillons: new Int16Array(0),
      dureeSecondes: 1,
      segments: [{ index: 0, speakerId: "s1", voix: "nova", debut: 0, fin: 0.05 }],
      castes: [],
      incidents: [],
    };
    const refus = validerAudioAssemble(bidon, { repliques: 10, dureeEstimeeSecondes: 90 });
    assert.ok(refus.length >= 2, `attendu plusieurs refus, reçu : ${refus.join(" | ")}`);
  });
});

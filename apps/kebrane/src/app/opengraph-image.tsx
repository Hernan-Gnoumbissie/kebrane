import { ImageResponse } from "next/og";

/**
 * Image de partage social (KB-16), GÉNÉRÉE plutôt que stockée.
 *
 * Un fichier binaire se périme en silence : on change la promesse de la marque,
 * et l'image continue d'annoncer l'ancienne pendant des mois. Ici le texte vit
 * dans le code, donc il suit.
 *
 * Composition fidèle à la charte : aplat Marine, wordmark Georgia interlettré,
 * et le Rouge en simple filet — l'accent reste rare (règle 60/25/10/5).
 */
export const alt = "Kebrane — un compte, tous les produits";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          // Marine #1F3352 — la couleur mère.
          backgroundColor: "#1F3352",
          color: "#FBF9F5",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {/* Le filet rouge : seul emploi de l'accent, conforme à la règle d'or. */}
        <div style={{ width: 96, height: 6, backgroundColor: "#A5322C" }} />
        <div
          style={{
            marginTop: 40,
            fontSize: 72,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Un compte Kebrane,</span>
          <span>tous les produits.</span>
        </div>
        <div style={{ marginTop: 32, fontSize: 30, color: "#A7C4DC" }}>
          Préparez vos examens, apprenez, progressez.
        </div>
        <div
          style={{
            marginTop: "auto",
            fontSize: 26,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Kebrane
        </div>
      </div>
    ),
    size
  );
}

# Kebrane — Charte graphique v1.1 (source de vérité design system)

*Extraite de `Kebrane-Charte-graphique` (v1.1 essentielle) + Brand Book v1.0. Base de `@kebrane/ui`.*
*Principe directeur : **le retrait** — « clair avant d'être élégant, sobre, jamais tapageur ; le sens naît de ce qu'on retire ».*

## Logo
- **Symbole = « le A ouvert »** (SVG : `kebrane-symbol-navy.svg`, path dans `_symbol_path.txt`).
- **Logotype** = symbole + « KEBRANE » en **Georgia capitales interlettrées** (letter-spacing ≈ 0.14em), Marine.
- **Version réservée** : A blanc sur Marine (`kebrane-symbol-reversed.svg`).
- **Une seule couleur** : aplat Marine **ou** blanc réservé. Jamais dégradé, ombre, relief.
- **Formes selon contexte** :
  - ≥ 96 px → A nu (Marine ou blanc réservé)
  - 64–24 px → A nu, uniquement sur fond clair et uni
  - < 24 px, fond chargé/photo, icône d'app, avatar → **pastille** (A blanc sur carré/cercle Marine)
  - favicon ≤ 20 px → pastille pixel-optimisée (`kebrane-favicon-16.svg`)
- **Zone de protection** : marge min = largeur d'un pied de lettre, sur 4 côtés. Taille min : A nu 24 px, pastille 16 px.
- **Interdits** : reboucher l'arche, remettre la barre, recolorer (néon/hors palette), incliner/déformer.

## Couleurs
### Primaires
| Nom | HEX | Rôle |
|---|---|---|
| **Marine** | `#1F3352` | Couleur mère. Titres, textes forts, fonds foncés. |
| **Rouge** | `#A5322C` | **Accent RARE** : dashes, règle d'or, ligne rouge. **Jamais** texte courant ni aplat dominant. |
| **Ciel** | `#A7C4DC` | Secondaire : calme, états, liens, réservé sur navy. Pas de texte fin sur blanc. |
| **Sable** | `#ECD8BE` | Secondaire chaud : fonds, respirations. **Jamais** de texte. |
### Neutres
| Nom | HEX | Rôle |
|---|---|---|
| **Encre** | `#1A1A1A` | Texte courant. |
| **Gris** | `#5C6672` | Texte secondaire, légendes. |
| **Papier** | `#FBF9F5` | Fond par défaut, chaud et calme. |
| **Blanc** | `#FFFFFF` | Réserve, cartes, surfaces. |
### Équilibre (à respecter)
**60** Marine + Papier · **25** Neutres · **10** Ciel/Sable · **5** Rouge. Le rouge ne dépasse **jamais** l'accent.

## Typographie
- **Georgia** — famille unique, éditoriale (titres, corps, citations). Autorité institutionnelle sans « défaut Word ».
- Display : capitales interlettrées, Marine. Corps : ~11/16 pt, Encre. Règle d'or : italique bordée de rouge.
- Une **sans-serif d'interface** pourra compléter Georgia pour les contextes fonctionnels (formulaires, tableaux de bord) — **à définir avec le premier produit**. Georgia reste la voix éditoriale.

## Architecture de marque
- Symbole universel partagé + **une couleur d'accent (« couleur de conteneur ») par produit** + endorsement « **By Kebrane** ».
- Traduction technique : `@kebrane/ui` fournit le socle (Marine/Rouge/Ciel/Sable, Georgia, symbole, « By Kebrane ») ; chaque produit injecte sa **couleur d'accent** via un token.

## Traduction technique (fait)
- Tokens dans `packages/ui/src/styles/theme.css` (Papier fond, Encre texte, Gris secondaire, Marine primary, Rouge accent, Ciel/Sable).
- Preset Tailwind `packages/config/tailwind-preset.cjs` (couleurs sémantiques + brutes marine/rouge/ciel/sable/encre/papier).
- Composants `packages/ui` : Button, Card, **Logo (symbole A ouvert réel, pastille, wordmark, By Kebrane)**.

## Sources (dans le dépôt)
`Kebrane-Charte-graphique.pdf/.docx`, `Kebrane-charte-graphique.html`, `Kebrane-Brand-Book.docx`,
`Kebrane-Brief-Designer-Symbole-Logotype`, `L-Identite-verbale-Kebrane`, `Le-Manifeste-de-Kebrane`,
`Le-Livre-de-la-Culture-Kebrane`, `Les-Principes-Produit-Kebrane`, assets `kebrane-symbol-*.svg`, `kebrane-favicon-16.svg`.

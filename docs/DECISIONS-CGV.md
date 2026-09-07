# Points de politique à trancher — CGV et confidentialité

**But de ce document** : remplacer les marqueurs `[À COMPLÉTER]` restants par des
clauses. Chaque point pose la question, expose les options réalistes avec leurs
conséquences, et fournit un **texte prêt à publier** pour chacune. Vous cochez, je
pose le texte dans la page — c'est mécanique à partir de là.

> ⚠ **Ce document n'est pas un avis juridique.** Il est écrit par un développeur qui
> connaît le code, pas le droit camerounais. Les clauses ci-dessous sont des points de
> départ argumentés, à faire relire par un juriste avant mise en service commerciale —
> comme le rappelle déjà `docs/content/README.md`. Les points **D** (taxe) et
> **B** (rétractation) sont ceux où l'avis d'un tiers compte le plus.

Rappel du cadre commun : droit camerounais, juridictions de Douala, prix en FCFA,
paiement par mobile money (MTN Mobile Money, Orange Money).

---

## A · Reconduction — CGV §5

**La technique a déjà tranché.** Il n'existe dans `packages/db/prisma/schema.prisma`
**aucun modèle d'abonnement récurrent** : pas de mandat, pas de jeton de paiement, pas
de date de prochain prélèvement. Il y a des `Payment` uniques et un
`ProductAccess.expiresAt` qui expire. Le mobile money en poussée ne laisse d'ailleurs
aucun mandat derrière lui : chaque paiement est initié par le client.

Annoncer une reconduction automatique serait donc **promettre ce que le système ne
sait pas faire** — et une clause de reconduction qui ne se déclenche jamais est pire
qu'une absence de clause : elle inquiète le client sans rien produire.

- [x] **Option A1 — Réengagement manuel (recommandée, et de fait la seule vraie)**

> ### 5. Durée et reconduction
>
> Chaque offre donne accès au Produit pour une **durée déterminée**, indiquée sur la
> page Tarifs et rappelée au moment de la commande. **L'abonnement ne se reconduit pas
> automatiquement** et **aucun prélèvement récurrent n'est mis en place** : à
> l'échéance, l'accès prend fin, sans démarche ni résiliation de votre part.
>
> Vous n'avez donc rien à résilier, et rien ne vous sera débité sans que vous en
> preniez l'initiative. Pour continuer, il suffit de souscrire une nouvelle offre.

- [ ] **Option A2 — Reconduction automatique.** À n'envisager qu'après avoir construit
      un vrai moteur d'abonnement (modèle récurrent, mandat chez le PSP, relances,
      résiliation en un clic, préavis d'échéance). Chantier à part entière, hors
      périmètre actuel, et dépendant du PSP retenu (KB-13).

**Bénéfice secondaire de A1** : « rien ne vous sera débité sans votre initiative » est
un argument commercial honnête sur un marché où la reconduction subie inspire la
méfiance. C'est aussi exactement la promesse du Manifeste — *libres de partir*.

---

## B · Droit de rétractation — CGV §6

La difficulté : le **droit camerounais** ne prévoit pas de rétractation de 14 jours
comparable au régime européen, mais Kebrane s'adresse à un public francophone qui
**inclut des résidents de l'Union européenne** (le `README` du contenu le relève déjà
pour le RGPD). Pour un consommateur européen achetant à distance, la directive
2011/83/UE ouvre 14 jours — et prévoit précisément, pour le **contenu numérique fourni
immédiatement**, une renonciation expresse.

- [x] **Option B1 — Régime camerounais + renonciation expresse pour l'UE (recommandée)**

> ### 6. Droit de rétractation et contenu numérique
>
> L'abonnement donne accès à un **contenu numérique fourni immédiatement** après
> confirmation du paiement.
>
> En souscrivant, vous **demandez expressément** que l'accès soit ouvert sans attendre
> et vous **reconnaissez perdre, de ce fait, tout droit de rétractation** sur la
> période déjà ouverte, dans la mesure où un tel droit vous serait applicable.
>
> Si vous résidez dans l'Union européenne, cette renonciation est celle prévue pour le
> contenu numérique fourni avant l'expiration du délai de rétractation de quatorze
> jours. **Tant que vous n'avez pas accédé au contenu**, ce délai reste ouvert et vous
> pouvez demander l'annulation et le remboursement intégral à l'adresse indiquée en
> section Contact.

- [ ] **Option B2 — Renonciation sèche, sans réserve pour l'UE.** Plus court, mais
      inopposable à un consommateur européen : la protection n'est pas renonçable par
      une clause générale. Déconseillé.

⚠ **À vérifier avec un juriste** : la formulation « dans la mesure où un tel droit vous
serait applicable » est prudente à dessein. Un juriste dira s'il faut la remplacer par
une règle ferme selon le pays de résidence du client.

⚠ **Conséquence technique de B1** : la clause distingue *avoir payé* et *avoir accédé
au contenu*. Il faudra donc pouvoir répondre à « ce membre a-t-il consommé quelque
chose ? ». Aujourd'hui `ProductAccess.aiUsedMicroUsd` et le journal d'événements le
permettent grossièrement — à consolider quand le paywall KB-13 sera live.

---

## C · Remboursement — CGV §7

Trois politiques tenables. Elles se distinguent moins par la générosité que par le
**coût de traitement** : chaque demande se règle à la main, par mobile money, sans
automatisation.

- [x] **Option C1 — Non remboursable, sauf défaillance de notre fait (recommandée au lancement)**

> ### 7. Remboursement
>
> L'accès étant ouvert immédiatement, **les abonnements ne sont pas remboursables**,
> sauf dans les cas suivants :
>
> - **paiement débité sans ouverture de l'accès** : remboursement intégral, ou
>   ouverture de l'accès, à votre choix ;
> - **double paiement** pour la même période : le second est remboursé ;
> - **indisponibilité prolongée du service** de notre fait : la durée perdue est
>   ajoutée à votre accès, ou remboursée au prorata si vous le préférez.
>
> Toute demande se fait à l'adresse indiquée en section Contact, en précisant la
> référence du paiement. Nous répondons sous **7 jours ouvrés**.

- [ ] **Option C2 — Rétractation de 7 jours si le contenu n'a pas été consommé.**
      Plus commercial, cohérent avec B1. Suppose de mesurer la consommation de façon
      fiable, et ouvre la porte à l'usage-puis-remboursement.
- [ ] **Option C3 — Satisfait ou remboursé sous 14 jours, sans condition.** Fort
      argument de conversion, mais sur des offres à 2 500 F le coût de traitement
      manuel peut dépasser le montant remboursé.

**Pourquoi C1 pour commencer** : les trois cas retenus sont ceux où **l'erreur vient de
nous**. Ils sont rares, indiscutables, et ne demandent aucun arbitrage. On peut
s'ouvrir plus tard ; se refermer, non.

---

## D · Prix, TTC et taxe — CGV §3

**Point le plus sensible du document, et il touche votre statut.** Les mentions légales
déclarent une *activité indépendante non immatriculée*. Or facturer de la TVA suppose
en principe d'être immatriculé et assujetti : une entité non immatriculée qui ferait
apparaître de la TVA sur ses justificatifs s'exposerait, et le client ne pourrait rien
en déduire.

Le taux normal de TVA au Cameroun est de **19,25 %** (19 % + centimes additionnels
communaux). **Je ne tranche pas** votre situation fiscale — c'est une question pour un
comptable, pas pour moi.

- [x] **Option D1 — Prix nets, hors champ de la TVA (cohérente avec le statut actuel)**

> Les prix sont affichés en **FCFA (franc CFA, XAF)** sur la page Tarifs. Ils
> s'entendent **nets, toutes taxes comprises le cas échéant** : aucune taxe
> additionnelle n'est ajoutée au moment du paiement. **Le montant affiché est le
> montant débité.**

- [ ] **Option D2 — Prix TTC avec TVA de 19,25 % mentionnée.** À retenir **si et
      seulement si** vous vous immatriculez et devenez assujetti. Modifie aussi les
      justificatifs de paiement (mention du taux et du montant de taxe) — donc du code.

**Ce qui est vrai dans les deux cas et mérite de rester** : « le montant affiché est le
montant débité ». C'est la seule phrase que le client lit vraiment, et notre grille en
base la rend exacte par construction.

---

## E · Âge minimum — Confidentialité §9

Le public visé (préparation d'examens de langue, départ à l'étranger) est
majoritairement adulte, mais **pas exclusivement** : des candidats de 16-17 ans
préparent le Goethe. Interdire les mineurs serait à la fois faux commercialement et
invérifiable.

- [x] **Option E1 — 16 ans, en dessous accord parental (recommandée)**

> ### 9. Mineurs
>
> La création d'un compte Kebrane est ouverte à partir de **16 ans**. En dessous de cet
> âge, un compte ne peut être créé que **par un parent ou un représentant légal**, qui
> en demeure responsable, y compris pour la souscription d'un abonnement.
>
> Si nous apprenons qu'un compte a été créé par un enfant de moins de 16 ans sans cet
> accord, nous le supprimons.

- [ ] **Option E2 — 18 ans strict.** Plus simple juridiquement, mais exclut une part
      réelle des candidats aux examens de langue, et sera contourné par une fausse date.
- [ ] **Option E3 — 15 ans** (seuil RGPD retenu par la France pour le consentement des
      mineurs). À préférer si votre cible européenne compte davantage que la
      camerounaise.

**Note technique** : la date de naissance **n'est pas collectée** aujourd'hui — ni par
Clerk tel qu'il est configuré, ni dans le modèle `Account`. La clause sera donc
déclarative, comme chez la plupart des services. Vérifier l'âge réellement supposerait
de collecter une donnée personnelle supplémentaire, ce qui va à l'encontre de la
minimisation : **je déconseille**.

---

## F · Durées de conservation — Confidentialité §4

Rien de ce qui suit n'est arbitraire : chaque durée découle d'un usage réel du système.

- [x] **Option F1 — Durées par catégorie (recommandée)**

> ### 4. Durées de conservation
>
> - **Compte** (nom, e-mail, identifiants) : conservés tant que le compte existe, puis
>   **effacés à sa suppression**.
> - **Progression et résultats d'entraînement** : conservés avec le compte, effacés
>   avec lui.
> - **Contenus soumis** (enregistrements audio, textes) : conservés le temps de
>   produire la correction et de vous la restituer, puis **supprimés au plus tard
>   12 mois** après leur envoi — ou immédiatement si vous retirez votre consentement.
> - **Justificatifs de paiement** : conservés **10 ans**, comme l'impose la
>   comptabilité. Ils survivent donc à la suppression du compte, mais **sous forme
>   anonymisée** : le numéro payeur est effacé et la ligne n'est plus rattachable à
>   une personne identifiée.
> - **Journal d'activité technique** : conservé pour la sécurité et la preuve, sans
>   donnée d'identification après suppression du compte.

- [ ] **Option F2 — Formulation générique** (« le temps nécessaire au service »).
      C'est l'état actuel. Conforme sur le principe, mais un régulateur y verra une
      non-réponse.

✓ **F1 décrit ce que le code fait déjà** : `privacy.eraseAccount` efface l'identité,
supprime les accès, retire le numéro payeur des paiements et conserve le journal
(`packages/core/src/privacy.ts`). Seule la durée de 12 mois sur les contenus soumis
est une **règle nouvelle** — elle demanderait une purge planifiée, aujourd'hui
inexistante. Si vous retenez F1, ça fait un ticket.

---

## Récapitulatif

| # | Point | Recommandation | Bloquant lancement |
|---|---|---|---|
| A | Reconduction | **A1** — manuel, imposé par la technique | oui (CGV) |
| B | Rétractation | **B1** — renonciation expresse, réserve UE | oui (CGV) |
| C | Remboursement | **C1** — non remboursable sauf notre faute | oui (CGV) |
| D | Taxe | **D1** — prix nets, tant que non immatriculé | oui (CGV) |
| E | Âge minimum | **E1** — 16 ans | oui (confidentialité) |
| F | Conservation | **F1** — durées par catégorie | non, mais attendu |

**Restent hors de ce document**, parce qu'ils ne dépendent pas d'un arbitrage mais
d'une information ou d'une décision extérieure : adresse postale et immatriculation de
l'éditeur, nom du prestataire de paiement (KB-13), adresses de support de TCFPass et
PermitPass (produits inexistants).

**Si vous validez en bloc les six recommandations**, dites-le et je pose les six
clauses ; il ne restera alors que l'adresse postale et le PSP comme marqueurs visibles
sur le site.

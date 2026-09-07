# KB-27 — Consentement CGU + confidentialité à l'inscription

**Étape de CONFIGURATION, pas de code.** Le consentement est recueilli par la
fonction « Legal acceptance » de Clerk, activée depuis le tableau de bord. Rien
n'est à ajouter dans `apps/kebrane/src/app/(auth)/register/[[...rest]]/page.tsx` :
la case apparaît d'elle-même dans le composant `<SignUp>` une fois l'option
activée.

## Pourquoi pas une case maison

Une case cochée côté client et jamais vérifiée côté serveur ne prouve rien : elle
se contourne en une requête. Surtout, elle ne laisse **aucune trace horodatée**
— or ce qu'on doit pouvoir produire le jour d'un litige, c'est « cette personne a
accepté cette version, ce jour-là ».

Clerk, lui, stocke l'acceptation sur l'utilisateur
(`legal_accepted_at`) et **refuse la création du compte** si la case n'est pas
cochée : le contrôle est du côté qui crée le compte, pas du côté qui l'affiche.

## Procédure (tableau de bord Clerk)

À faire sur **chaque instance** (développement ET production — les réglages ne
se propagent pas d'une instance à l'autre).

1. Ouvrir **dashboard.clerk.com** → sélectionner l'application Kebrane, puis
   l'instance visée (menu en haut : *Development* / *Production*).
2. **Configure → Restrictions** (section *Sign-up*), option
   **« Legal acceptance »** — l'activer.
3. Renseigner les deux URL, en **absolu** (elles sont ouvertes hors du site) :
   - *Terms of service* : `https://kebrane.com/cgu`
   - *Privacy policy* : `https://kebrane.com/confidentialite`
   > En instance de développement, pointer les URL locales
   > (`http://localhost:3001/cgu`, `http://localhost:3001/confidentialite`)
   > pour que la vérification ci-dessous soit réellement cliquable.
4. Enregistrer.

## Vérification (à refaire après chaque changement d'instance)

- [ ] `/register` affiche la case « J'accepte les CGU et la politique de
      confidentialité », avec **deux liens cliquables** qui ouvrent bien
      `/cgu` et `/confidentialite`.
- [ ] **Le refus bloque** : remplir le formulaire *sans* cocher la case → Clerk
      refuse la soumission et aucun compte n'est créé.
      Contre-preuve à faire une fois : vérifier qu'aucun `Account` Kebrane
      n'apparaît côté Core (le webhook `user.created` ne part pas, puisque
      l'utilisateur Clerk n'existe pas).
- [ ] Après une inscription réussie, l'utilisateur porte bien
      `legal_accepted_at` dans le tableau de bord Clerk (onglet *Users* → le
      compte → *Metadata / Details*).

## Ce que cela n'inclut PAS

- **L'acceptation à l'encaissement** (CGV) reste à faire au checkout, quand le
  paywall KB-13 sera branché : ce n'est pas le même consentement, ni le même
  document, ni le même moment.
- Le **re-consentement** en cas de modification substantielle des CGU. Clerk
  horodate l'acceptation mais ne versionne pas les documents ; le jour où les
  CGU changent en profondeur, il faudra redemander explicitement.

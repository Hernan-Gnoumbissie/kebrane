# 14 — Conformité légale

## Droits d'auteur (examens)
- **Aucune reproduction** de sujets, questions, audios ou textes officiels Goethe-Institut, ÖSD, telc gGmbH, ECL — contenus protégés.
- Seules les **structures pédagogiques publiques** sont utilisées (nombre de parties, types de tâches, durées, barèmes), telles que publiées par les organismes (blueprints, 02-EXAM-BLUEPRINTS.md).
- Contenu d'entraînement : **généré original** (IA + RAG sur la bibliothèque fournie par l'admin, garde anti-copie trigram+embedding, validation humaine) ou saisi par l'admin. L'admin doit n'ingérer dans la bibliothèque RAG que des documents dont il détient les droits.
- Mentions visibles (landing, /legal, footer, emails) : « **Plattform nicht mit Goethe-Institut, ÖSD, telc gGmbH oder ECL verbunden** » + équivalent FR. Aucun logo officiel. Marques citées à titre descriptif uniquement.

## RGPD
- **Base légale** : exécution du contrat (service de préparation) ; consentement explicite pour l'audio.
- **Minimisation** : email, nom, productions ; pas de données superflues. IP uniquement dans les logs de sécurité.
- **Consentement audio (Sprechen)** : `users.audioConsentAt`, requis avant tout upload, révocable (`PATCH /api/account/consent`), tracé en audit.
- **Droits des personnes** : export des données et suppression de compte (statut DELETED + anonymisation : purge email/nom/fichiers — à exposer dans /account ; les agrégats anonymes peuvent être conservés).
- **Hébergement UE** ; sous-traitant IA : privilégier un endpoint UE (`AI_BASE_URL` paramétrable) et le mentionner dans la politique de confidentialité.
- **Sécurité** : cf. 11-SECURITY.md (chiffrement, accès, audit). Sauvegardes chiffrées, rétention 30 j.
- **Transparence IA** : l'évaluation Schreiben/Sprechen est produite par IA ; la note orale est indicative et la prononciation approximative (disclaimer affiché). Possibilité de signalement → modération humaine.
- **Conservation** : comptes inactifs > 24 mois → anonymisation recommandée ; `listen_events`/attempts purgables au même horizon.

## Disclaimer financier
La plateforme prépare aux examens mais ne délivre aucune certification officielle ; la réussite au simulateur ne garantit pas la réussite à l'examen réel.

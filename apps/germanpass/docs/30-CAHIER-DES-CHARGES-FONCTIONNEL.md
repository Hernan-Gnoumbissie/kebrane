# 30 — Cahier des charges fonctionnel — GermanPass

**Version** : 1.0 · **Date** : 21 juillet 2026 · **Statut** : référence fonctionnelle
**Périmètre** : besoins métier, acteurs, parcours et exigences fonctionnelles. Les aspects techniques sont couverts par `01-ARCHITECTURE.md`, `03-DATABASE.md`, `05-API.md`, `07-DEPLOYMENT.md`, `11-SECURITY.md`.

---

## 1. Contexte et objectifs

### 1.1 Contexte
Les candidats aux certifications d'allemand (Goethe-Zertifikat, ÖSD, telc, ECL) manquent d'un environnement d'entraînement qui reproduise fidèlement les **conditions réelles d'examen** : durées imposées par section, nombre d'écoutes limité, barèmes et seuils de réussite propres à chaque organisme, correction des productions écrites et orales.

### 1.2 Objectif du système
Fournir une plateforme SaaS permettant à un candidat de :

1. **Apprendre** la langue de façon structurée (curriculum A1 → C2, leçons, exercices, mémorisation espacée) ;
2. **S'entraîner** épreuve par épreuve (Lesen, Hören, Schreiben, Sprechen) ;
3. **Se simuler en conditions d'examen** sur un examen blanc complet, avec verdict conforme aux règles de l'organisme visé ;
4. **Piloter sa progression** via un tableau de bord et des recommandations ciblées.

Et à un administrateur de gérer les accès, produire et valider le contenu, et superviser l'exploitation.

### 1.3 Contrainte fondatrice — conformité
Aucun contenu officiel d'organisme certificateur n'est reproduit. Seules les **structures pédagogiques publiques** (parties, formats, durées, barèmes) sont modélisées. Tout le contenu d'entraînement est original. La plateforme n'est affiliée à aucun organisme (cf. `14-LEGAL.md`).

### 1.4 Objectifs mesurables
| Objectif | Indicateur |
|---|---|
| Fidélité au format d'examen | 22 blueprints couvrant 4 organismes × niveaux A1–C2 |
| Autonomie du candidat | Correction et feedback disponibles sans intervention humaine |
| Qualité du contenu | 100 % du contenu généré par IA passe par une validation humaine avant publication |
| Maîtrise du coût IA | Suivi des consommations par type et par mois |

---

## 2. Acteurs et rôles

| Acteur | Rôle système | Description |
|---|---|---|
| **Visiteur** | — | Consulte les pages publiques (offre, tarifs, mentions légales), s'inscrit. |
| **Candidat** | `STUDENT` | Utilisateur inscrit. Accède aux fonctions d'apprentissage, d'entraînement et de simulation selon son statut et sa date d'expiration d'accès. |
| **Administrateur** | `ADMIN` | Gère les comptes et les accès, alimente et valide le contenu, publie les examens blancs, supervise l'exploitation et la modération. |

### 2.1 Cycle de vie d'un compte candidat
| Statut | Signification | Droits |
|---|---|---|
| `PENDING` | Inscrit, en attente de validation d'une preuve de paiement | Connexion et compte uniquement |
| `ACTIVE` | Accès valide jusqu'à `accessUntil` | Accès complet |
| `EXPIRED` | Date d'accès dépassée | Lecture du compte, renouvellement possible |
| `SUSPENDED` | Suspendu par un administrateur | Aucun accès aux contenus |
| `DELETED` | Suppression RGPD, données anonymisées | Aucun |

---

## 3. Périmètre fonctionnel

### 3.1 Inclus
- Comptes, authentification, gestion des accès à durée limitée
- Validation manuelle des paiements par preuve téléversée + codes promotionnels
- Curriculum d'apprentissage A1 → C2 avec leçons, exercices et flashcards SRS
- Entraînement libre sur les 4 épreuves
- Examens blancs complets minutés, avec verdict par organisme
- Correction automatique (QCM/appariement) et évaluation IA (écrit et oral)
- Tableau de bord de progression et recommandations
- Back-office d'administration complet
- Application installable (PWA) avec mode hors-ligne partiel

### 3.2 Exclu (hors périmètre v1)
- Paiement en ligne automatisé (le paiement est constaté hors plateforme via preuve)
- Classes, tutorat humain, correction par un enseignant
- Inscription réelle aux examens officiels
- Applications mobiles natives (iOS / Android)
- Multi-langue de l'interface au-delà du français

---

## 4. Exigences fonctionnelles

### 4.1 Comptes et accès (F-ACC)

| Réf. | Exigence | Priorité |
|---|---|---|
| F-ACC-01 | Un visiteur peut créer un compte par e-mail + mot de passe, ou via Google. | Must |
| F-ACC-02 | Le compte est créé au statut `PENDING` : aucun accès au contenu tant que l'accès n'est pas accordé. | Must |
| F-ACC-03 | Le candidat peut téléverser une preuve de paiement (JPEG, PNG, WebP ou PDF) et suivre son statut. | Must |
| F-ACC-04 | Un administrateur approuve une preuve en accordant 7, 30, 90 ou 365 jours d'accès, ou la refuse avec motif. | Must |
| F-ACC-05 | Le candidat peut échanger un code promotionnel qui crédite des jours d'accès. Un code a un nombre d'usages et une date de validité. | Must |
| F-ACC-06 | Le nombre de jours restants est visible en permanence sur le tableau de bord ; une alerte apparaît à l'approche de l'expiration. | Must |
| F-ACC-07 | Le candidat peut réinitialiser son mot de passe par e-mail. | Must |
| F-ACC-08 | Le candidat peut exporter ses données personnelles et demander la suppression de son compte (anonymisation). | Must |
| F-ACC-09 | Le traitement d'un enregistrement audio requiert un consentement explicite, révocable. | Must |

### 4.2 Apprentissage (F-LRN)

| Réf. | Exigence | Priorité |
|---|---|---|
| F-LRN-01 | Le curriculum est organisé en cours par niveau (A1 → C2) et par nature (grammaire, vocabulaire, stratégies d'épreuve). | Must |
| F-LRN-02 | Une leçon présente une explication, des exemples et une série d'exercices corrigés côté serveur. | Must |
| F-LRN-03 | Un chapitre est validé à partir de 70 % de réussite aux exercices ; la progression est mémorisée. | Must |
| F-LRN-04 | Le candidat dispose de flashcards en répétition espacée (algorithme SM-2), avec une file quotidienne des cartes dues. | Must |
| F-LRN-05 | La plateforme recommande des chapitres ciblés à partir des erreurs récurrentes relevées dans les feedbacks. | Should |
| F-LRN-06 | Les corrigés et clés de réponse ne sont jamais transmis au client avant soumission. | Must |

### 4.3 Entraînement par épreuve (F-TRN)

| Réf. | Exigence | Priorité |
|---|---|---|
| F-TRN-01 | **Lesen / Hören** : le candidat démarre une session ciblée (organisme, niveau, format) et reçoit un contenu expurgé de toute clé. | Must |
| F-TRN-02 | À la soumission, la correction est calculée côté serveur et accompagnée d'explications item par item. | Must |
| F-TRN-03 | **Hören** : le nombre d'écoutes autorisé est défini par la partie (1 ou 2) et décompté côté serveur ; toute écoute supplémentaire est refusée. | Must |
| F-TRN-04 | **Schreiben** : le candidat reçoit une consigne et rédige ; sa production est évaluée par IA selon les critères de l'organisme (contenu, cohérence, vocabulaire, correction linguistique). | Must |
| F-TRN-05 | **Sprechen** : le candidat reçoit une tâche, s'enregistre, et obtient une transcription, des métriques de fluidité et une évaluation IA. | Must |
| F-TRN-06 | Les évaluations écrites et orales sont traitées de façon asynchrone ; l'état d'avancement est visible par le candidat. | Must |
| F-TRN-07 | Le candidat peut signaler une évaluation orale qu'il conteste ; elle est alors placée en file de modération. | Should |
| F-TRN-08 | L'historique complet des entraînements est consultable. | Must |

### 4.4 Examens blancs (F-EXM)

| Réf. | Exigence | Priorité |
|---|---|---|
| F-EXM-01 | Le candidat consulte la liste des examens blancs publiés (organisme, niveau, durée, structure). | Must |
| F-EXM-02 | Un seul examen peut être en cours à la fois par candidat. | Must |
| F-EXM-03 | L'examen se déroule section par section, dans l'ordre défini par le blueprint. | Must |
| F-EXM-04 | Chaque section possède une échéance calculée et contrôlée par le serveur ; à expiration, la section est soumise automatiquement (tolérance technique de 5 secondes). | Must |
| F-EXM-05 | Des mesures anti-copie sont appliquées pendant l'épreuve (contenu non sélectionnable, restitution progressive). | Should |
| F-EXM-06 | À l'issue de l'examen, un rapport présente : score par section et par compétence, verdict de réussite selon les règles de l'organisme, points forts et axes de travail. | Must |
| F-EXM-07 | Les règles de verdict sont propres à chaque organisme et ne sont pas codées en dur : elles proviennent du blueprint (modularité, seuil par module, plancher par compétence, séparation écrit/oral). | Must |
| F-EXM-08 | Le rapport situe le résultat par rapport aux tentatives précédentes du candidat. | Should |

**Règles de réussite modélisées :**

| Organisme | Règle |
|---|---|
| Goethe (et ÖSD ZB1) | ≥ 60 % **par module** pour les examens modulaires (B1+) |
| ÖSD (hors ZB1) | Total ≥ 60 %, avec un plancher de 50 % par épreuve |
| telc | ≥ 60 % à l'écrit **et** ≥ 60 % à l'oral, notés séparément |
| ECL | Moyenne ≥ 60 % **et** ≥ 40 % par compétence |

### 4.5 Suivi et progression (F-PRG)

| Réf. | Exigence | Priorité |
|---|---|---|
| F-PRG-01 | Le tableau de bord candidat regroupe : jours d'accès restants, accès rapides aux modules, historiques (pratique, écrits, oraux, examens), recommandations. | Must |
| F-PRG-02 | La progression est visualisée par compétence et par niveau dans le temps. | Should |
| F-PRG-03 | Le candidat peut reprendre là où il s'est arrêté (leçon en cours, cartes dues). | Should |

### 4.6 Administration (F-ADM)

| Réf. | Exigence | Priorité |
|---|---|---|
| F-ADM-01 | Vue d'ensemble : preuves en attente, utilisateurs, comptes actifs. | Must |
| F-ADM-02 | File de validation des preuves de paiement (consultation du justificatif, octroi de jours, refus motivé). | Must |
| F-ADM-03 | Gestion des utilisateurs : recherche, octroi de jours, suspension, réactivation. | Must |
| F-ADM-04 | Gestion des codes promotionnels : création, quota d'usage, suivi. | Must |
| F-ADM-05 | Bibliothèque documentaire : téléversement de sources (PDF, DOCX) servant de socle à la génération assistée. | Must |
| F-ADM-06 | Génération de contenu assistée par IA (textes, items, consignes) placée en **file de validation** : aucun contenu généré n'est publié sans approbation humaine. | Must |
| F-ADM-07 | Génération audio (synthèse vocale) des supports Hören, avec régénération possible et gestion des variétés régionales (Allemagne, Autriche, Suisse). | Must |
| F-ADM-08 | Banques de contenu Schreiben et Sprechen : création, édition, publication. | Must |
| F-ADM-09 | Assemblage d'un examen blanc à partir d'un blueprint, avec refus explicite si la banque de contenu est insuffisante ; puis publication. | Must |
| F-ADM-10 | Gestion du curriculum : cours, leçons, exercices. | Must |
| F-ADM-11 | Modération des soumissions orales signalées. | Should |
| F-ADM-12 | Statistiques d'usage et de coût IA, agrégées par type d'appel et par mois. | Should |
| F-ADM-13 | Journal d'audit des actions sensibles (octroi d'accès, suspension, publication, suppression). | Must |
| F-ADM-14 | Les blueprints d'examens sont versionnés : une nouvelle version ne modifie jamais les tentatives passées. | Must |

### 4.7 Contenu et blueprints (F-BLP)

| Réf. | Exigence | Priorité |
|---|---|---|
| F-BLP-01 | Un blueprint décrit, pour un organisme et un niveau : les sections, leurs durées, leurs parties, les formats de tâches, le nombre d'items, les points et le nombre d'écoutes. | Must |
| F-BLP-02 | Le même blueprint alimente l'entraînement, le simulateur, la correction et le scoring. | Must |
| F-BLP-03 | Chaque blueprint porte une note de source (URL officielle consultée + date) à re-vérifier avant publication. | Must |
| F-BLP-04 | Couverture cible : Goethe A1–C2, ÖSD A1–C2, telc A1–C1 (dont C1 Hochschule), ECL A2–C1. | Must |

---

## 5. Parcours utilisateurs

### 5.1 Nouveau candidat — de l'inscription au premier entraînement
1. Le visiteur consulte l'offre et les tarifs, puis crée son compte.
2. Le compte est créé en attente ; le tableau de bord invite à téléverser une preuve de paiement.
3. Le candidat téléverse son justificatif ; il en suit le statut.
4. L'administrateur consulte la preuve et accorde une durée d'accès.
5. Le compte passe en actif ; l'accès complet est débloqué, avec un compteur de jours restants.
6. Le candidat choisit son organisme et son niveau cible et démarre un premier entraînement.

### 5.2 Candidat — session d'entraînement Hören
1. Sélection organisme / niveau / format.
2. Démarrage de la session : le contenu est fourni sans aucune clé de correction.
3. Écoute de l'audio, dans la limite d'écoutes autorisée par la partie ; chaque écoute est enregistrée côté serveur.
4. Réponse aux items, puis soumission.
5. Restitution du score, des bonnes réponses et des explications ; la session est archivée dans l'historique.

### 5.3 Candidat — examen blanc complet
1. Choix d'un examen publié ; vérification qu'aucun examen n'est déjà en cours.
2. Démarrage : la première section s'ouvre avec son minuteur serveur.
3. Le candidat compose ; à la soumission ou à l'échéance, la section est close et la suivante s'ouvre.
4. Les sections de production (Schreiben, Sprechen) sont évaluées de façon asynchrone.
5. Une fois toutes les évaluations disponibles, le rapport final est produit : scores, verdict selon les règles de l'organisme, comparatif avec les tentatives antérieures, recommandations de travail.

### 5.4 Administrateur — publication d'un examen blanc
1. Téléversement des documents sources dans la bibliothèque.
2. Lancement d'une génération de contenu ; le résultat est mis en file de validation.
3. Relecture, correction, approbation ou rejet des items générés.
4. Génération audio des supports Hören.
5. Assemblage automatique de l'examen à partir du blueprint ; en cas de banque insuffisante, l'assemblage est refusé avec le détail des manques.
6. Relecture finale, puis publication : l'examen devient visible pour les candidats.

---

## 6. Règles de gestion transverses

| Réf. | Règle |
|---|---|
| RG-01 | La correction et le scoring sont exclusivement réalisés côté serveur ; aucune clé de réponse n'est exposée au client avant soumission. |
| RG-02 | Les échéances de section et les décomptes d'écoute font foi côté serveur, indépendamment de l'horloge du client. |
| RG-03 | Les droits d'accès sont revalidés en base à chaque requête sensible, sans se fier au seul jeton de session. |
| RG-04 | Aucun contenu généré par IA n'est exposé aux candidats sans validation humaine préalable. |
| RG-05 | Un enregistrement audio n'est traité qu'avec consentement explicite du candidat, révocable à tout moment. |
| RG-06 | Une tentative passée reste rattachée à la version de blueprint sous laquelle elle a été composée. |
| RG-07 | Les fichiers téléversés sont stockés hors racine web et servis via un contrôle d'accès par catégorie. |
| RG-08 | Les actions administratives sensibles sont journalisées et attribuables. |

---

## 7. Exigences non fonctionnelles (rappel fonctionnel)

| Domaine | Exigence |
|---|---|
| **Disponibilité** | Point de contrôle de santé applicatif exposé ; sauvegardes régulières et restauration testée. |
| **Performance** | Restitution d'une session d'entraînement perçue comme immédiate ; les traitements longs (évaluation IA, synthèse vocale, ingestion documentaire) sont asynchrones avec état visible. |
| **Sécurité** | Chiffrement du transport, en-têtes de sécurité, limitation de débit sur les points sensibles (inscription, téléversement, évaluation, génération), validation systématique des entrées. |
| **RGPD** | Consentement audio, export des données, suppression avec anonymisation, minimisation des données, information légale accessible. |
| **Accessibilité** | Navigation clavier, contrastes conformes, libellés explicites sur les composants d'épreuve. |
| **Mobilité** | Application installable (PWA), fonctionnement dégradé hors-ligne pour les contenus d'apprentissage déjà consultés. |
| **Exploitabilité** | Statistiques d'usage et de coût IA, journal d'audit, files de traitement supervisables. |

---

## 8. Livrables

| Livrable | Description |
|---|---|
| Application web | Espace candidat + back-office administrateur |
| Jeu de blueprints | 22 blueprints versionnés, avec notes de sources |
| Curriculum initial | Cours et leçons A1 → C2 |
| Documentation | Architecture, base de données, API, déploiement, sécurité, sauvegardes, recette, go-live, conformité |
| Procédures d'exploitation | Sauvegarde/restauration, mise à jour des blueprints, go-live |

---

## 9. Critères d'acceptation

1. Un candidat peut parcourir l'intégralité du chemin inscription → validation d'accès → apprentissage → entraînement sur les 4 épreuves → examen blanc complet → rapport avec verdict.
2. Les durées de section et les limites d'écoute sont effectivement contraintes, y compris en cas de manipulation côté client.
3. Aucune clé de correction n'est récupérable avant soumission.
4. Le verdict produit correspond aux règles de l'organisme sélectionné pour chacun des 4 organismes.
5. Aucun contenu généré par IA n'est accessible à un candidat sans être passé par une approbation.
6. Un administrateur peut mener un examen blanc de la source documentaire jusqu'à la publication.
7. Les parcours RGPD (consentement, export, suppression) sont opérationnels de bout en bout.
8. Aucun contenu officiel d'organisme certificateur n'est reproduit ; les mentions de non-affiliation sont présentes.

---

## 10. Glossaire

| Terme | Définition |
|---|---|
| **Blueprint** | Description structurée d'un examen (sections, durées, parties, formats, barèmes) pilotant tout le moteur. |
| **Lesen / Hören / Schreiben / Sprechen** | Compréhension écrite / orale, production écrite / orale. |
| **Examen blanc** | Simulation complète et minutée d'un examen, aboutissant à un verdict. |
| **SRS** | Système de répétition espacée pour la mémorisation du vocabulaire. |
| **Preuve de paiement** | Justificatif téléversé par le candidat, validé manuellement pour créditer des jours d'accès. |
| **Modularité** | Propriété de certains examens où chaque module est réussi ou échoué indépendamment. |
| **Verdict** | Résultat de réussite/échec calculé selon les règles de l'organisme concerné. |

---

## 11. Références internes

`01-ARCHITECTURE.md` · `02-EXAM-BLUEPRINTS.md` · `03-DATABASE.md` · `04-RAG.md` · `05-API.md` · `06-DASHBOARDS.md` · `11-SECURITY.md` · `12-RECETTE.md` · `14-LEGAL.md` · `DECISIONS.md`

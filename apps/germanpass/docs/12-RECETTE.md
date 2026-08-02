# 12 — Cahier de recette (tests manuels)

Environnement : staging avec `.env` complet (AI_API_KEY réelle), `bootstrap.sh` exécuté, banque alimentée (§0). Cocher chaque cas.

## 0. Préparation du contenu (admin)
- [ ] Upload d'un PDF dans la bibliothèque → statut READY avec chunks > 0
- [ ] Génération IA Lesen B1 (thème « Umwelt ») → PENDING_REVIEW → approuver → PUBLISHED
- [ ] Idem Hören B1 + job TTS → audio lisible (`audio_jobs.status=DONE`)
- [ ] Créer + publier : 3 WritingPrompts Goethe B1 (tâches 1-3), 3 SpeakingTasks Goethe B1 (parties 1-3), idem TELC B1
- [ ] Assembler MockExam « Goethe B1 blanc #1 » → publier (422 attendu si banque incomplète, avec liste des manques)

## 1. Comptes
- [ ] Inscription (mot de passe faible refusé) ; e-mail dupliqué → réponse non révélatrice
- [ ] 5 mauvais mots de passe → verrou 15 min (même le bon échoue)
- [ ] Upload preuve .exe renommé .pdf → refus (magic-bytes) ; vraie image → PENDING
- [ ] Admin approuve +30 j → email reçu, dashboard affiche ~30 j ; refus motivé → email
- [ ] Code promo : valide (+jours), réutilisé → ALREADY_USED, épuisé → EXHAUSTED
- [ ] Compte expiré (forcer accessUntil passé + cron) → accès practice refusé (EXPIRED)

## 2. Entraînement Lesen/Hören
- [ ] Le payload réseau de démarrage ne contient NI isCorrect NI metadata de correction (vérifier DevTools)
- [ ] Hören : 2 écoutes max → 3e refusée (MAX_LISTENS) ; le script texte n'est pas envoyé
- [ ] Soumission → score, explications, crédit partiel sur matching/gap_fill

## 3. Schreiben / Sprechen
- [ ] Consigne conforme provider/niveau, chrono affiché, compteur de mots
- [ ] Feedback : notes par critère ≤ max, erreurs typées avec extrait/correction DE/explication FR
- [ ] Sprechen sans consentement → CONSENT_REQUIRED ; après consentement → enregistrement, statut PENDING→COMPLETED, transcription annotée + métriques + disclaimer visible
- [ ] Signalement d'une évaluation → FLAGGED (visible en BDD/admin)

## 4. Examen blanc (Goethe B1 et TELC B1)
- [ ] Sections dans l'ordre du blueprint, pas de retour arrière
- [ ] Attendre l'expiration d'une section → auto-submit ; tentative de soumission tardive manuelle → DEADLINE_PASSED
- [ ] Rapport : % par section, verdict — vérifier : Goethe tous modules ≥ 60 % ; TELC oral < 60 % avec écrit fort → nicht bestanden
- [ ] 2e tentative → comparatif des tentatives précédentes

## 5. Apprentissage
- [ ] Leçon : Markdown rendu, exercices corrigés serveur, mini-test ≥ 70 % → chapitre ✅
- [ ] Flashcards : « Oublié » → carte due demain ; « Facile » ×3 → intervalle croissant (1, 6, ~15 j)
- [ ] Recommandations présentes après plusieurs feedbacks avec erreurs Grammatik

## 6. RGPD & légal
- [ ] Disclaimers FR/DE visibles (landing, /legal, footer)
- [ ] Révocation du consentement audio → soumission Sprechen refusée ensuite

## 7. Technique
- [ ] `npm run typecheck && npm run lint && npm test` verts ; `npm run test:e2e` vert
- [ ] /api/health healthy ; redémarrage du worker → jobs repris
- [ ] backup.sh puis restore.sh sur base jetable → données intactes
- [ ] k6 : p95 < 500 ms à 50 VUs

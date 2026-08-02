# KEBRANE — Auth : Auth.js v5 centralisé vs Clerk

*Comparatif décisionnel ancré sur le code réel. 30 juillet 2026.*

## Le contexte qui pèse sur la décision

- **GermanPass et TCF tournent déjà sur Auth.js v5** (next-auth) + Prisma + Google OAuth conditionnel.
- Tu viens de faire une **refonte auth** sur GermanPass, TCF et Permis (récupération de compte, anti-énumération, inscription multi-étapes).
- Permis (JWT/MySQL) et Gestion Formation (JWT/Angular) sont sur des stacks **différentes**.
- Besoin cible : **un compte Kebrane, tous les produits** (SSO), avec 2FA.
- Fondateur solo, marché Afrique francophone (mobile money, numéros SMS coûteux/instables).

## Tableau comparatif

| Critère | Auth.js v5 centralisé | Clerk |
|---|---|---|
| **Rework immédiat** | ~zéro sur GermanPass/TCF (déjà dessus) | Migrer GermanPass + TCF hors next-auth, remplacer les écrans de la refonte |
| **Ta refonte auth récente** | Conservée | En grande partie remplacée par les flux Clerk |
| **Coût récurrent** | 0 € (open source) | Gratuit jusqu'à un palier, puis **par utilisateur actif/mois** — sensible si beaucoup d'users à faible revenu |
| **2FA / MFA** | À implémenter (TOTP via lib ; ~raisonnable, surtout si obligatoire admin seulement) | **Intégré** (TOTP, SMS, codes de secours) |
| **SSO même stack** (tout converge vers Next.js + 1 Postgres) | **Simple** : session centrale partagée, cookie `.kebrane.com` | Simple aussi |
| **SSO multi-stack** (garder Angular + Express/MySQL tels quels) | **Difficile** : il faut monter un fournisseur OIDC | **Facile** : Clerk est un fournisseur d'identité, il sert plusieurs apps/stacks nativement |
| **Gestion des utilisateurs** | Tu construis l'UI admin | Dashboard + UI clés en main |
| **Import des comptes existants** | Ils restent chez toi (rien à migrer) | Import possible (Clerk accepte les hachages bcrypt → pas de reset forcé) |
| **Verrouillage fournisseur** | Aucun | L'identité vit chez Clerk (atténué en modélisant le RBAC côté Core) |
| **Effort de maintenance** | Toi (e-mails, MFA, anti-bot, comptes) | Délégué à Clerk |

## La vraie question qui tranche

Tout dépend d'un choix de fond que tu as **déjà** fait dans le plan v0.2 :

- **Si tu converges les stacks** (tout finit en Next.js + un seul Postgres, ce qui est la direction validée) → **Auth.js centralisé suffit**, coûte 0 €, et le SSO se règle par une session partagée dans l'app unifiée. Le point faible d'Auth.js (SSO multi-stack) **disparaît**, puisque justement tu supprimes l'hétérogénéité. Le 2FA se code une fois (obligatoire admin, optionnel users).
- **Si tu veux garder les 4 produits sur leurs stacks actuelles** et juste poser du SSO par-dessus → **Clerk gagne nettement** (IdP multi-stack + MFA immédiats), au prix d'un abonnement à l'utilisateur et de la migration des deux jumeaux.

## Recommandation

**Auth.js v5 centralisé.** Parce que ton plan est précisément de **converger** (monolithe modulaire, une stack, une base) : dans ce scénario, l'avantage principal de Clerk (SSO multi-stack) ne sert plus, tandis que ses coûts (migration des jumeaux + abonnement par utilisateur + abandon de ta refonte) restent réels. Auth.js capitalise sur ce qui marche déjà, coûte 0 €, et le 2FA — y compris obligatoire pour l'admin — est un chantier borné.

**Quand reconsidérer Clerk :** si tu décides finalement de **ne pas** converger les stacks (garder Angular et l'Express/MySQL longtemps), ou si le temps d'ingénierie SSO/MFA devient ton goulot. À ce moment, l'abonnement Clerk s'achète du temps.

*Décision à prendre : c'est l'unique point qui bloque le lancement de la construction.*

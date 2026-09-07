-- KB-39 : purge les `activeSessionId` hérités de next-auth.
--
-- Le contrôle anti-partage de `requireUser()` compare ce champ à l'identifiant
-- de session Clerk. Les comptes migrés portaient encore un UUID next-auth, qui
-- ne peut par construction jamais égaler un identifiant préfixé `sess_` : la
-- comparaison était toujours vraie et rejetait l'utilisateur à chaque requête
-- gardée, rendant tout l'espace d'administration inaccessible.
--
-- La garde ignore désormais ces valeurs (correctif de code), mais les laisser en
-- base entretiendrait l'illusion d'une protection active. On les efface : la
-- protection reprend d'elle-même à la connexion suivante, quand le webhook
-- `session.created` écrit un vrai identifiant Clerk.
--
-- Volontairement conservateur : seules les valeurs qui NE SONT PAS au format
-- Clerk sont touchées. Une session légitime en cours n'est jamais invalidée.
UPDATE "users"
SET "activeSessionId" = NULL
WHERE "activeSessionId" IS NOT NULL
  AND "activeSessionId" NOT LIKE 'sess\_%';

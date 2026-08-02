/**
 * Valeurs d'environnement par défaut pour les tests unitaires.
 * Importé EN PREMIER par les fichiers de test (l'ordre d'évaluation des
 * imports garantit son exécution avant les modules qui lisent process.env).
 */
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.AUTH_SECRET ??= "unit_test_secret_0123456789";
process.env.STORAGE_DIR ??= "./storage";

export {};

-- Ajuste la valeur par défaut du niveau utilisateur pour éviter les FK invalides
ALTER TABLE "user"
  ALTER COLUMN "level_id" SET DEFAULT 1;

-- Corrige les éventuels enregistrements existants avec level_id = 0
UPDATE "user"
SET "level_id" = 1
WHERE "level_id" = 0;

-- Garantit la présence du niveau 1 requis par défaut
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "levels" WHERE id = 1) THEN
    INSERT INTO "levels" (
      id,
      title,
      number,
      duration,
      speed,
      start_balance,
      points_required,
      description,
      created_at,
      updated_at
    ) VALUES (
      1,
      'Level 1 - Beginner',
      1,
      30,
      1,
      10000,
      0,
      'Default level auto-seeded via migration',
      NOW(),
      NOW()
    );
  END IF;
END;
$$;


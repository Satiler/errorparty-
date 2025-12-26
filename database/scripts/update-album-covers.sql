UPDATE "Albums" a
SET "coverUrl" = (
  SELECT t."coverUrl"
  FROM "Tracks" t
  WHERE t."albumId" = a.id
    AND t."coverUrl" IS NOT NULL
  ORDER BY t."trackNumber" ASC NULLS LAST, t.id ASC
  LIMIT 1
)
WHERE a."coverUrl" IS NULL
  AND EXISTS (
    SELECT 1 FROM "Tracks" t2
    WHERE t2."albumId" = a.id
      AND t2."coverUrl" IS NOT NULL
  );

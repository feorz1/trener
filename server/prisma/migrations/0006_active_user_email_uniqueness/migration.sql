DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users
    WHERE email IS NOT NULL AND deleted_at IS NULL
    GROUP BY lower(email)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Active users contain duplicate case-insensitive emails; resolve them manually before applying migration 0006';
  END IF;
END
$$;

CREATE UNIQUE INDEX users_email_lower_active_unique
ON users (lower(email))
WHERE email IS NOT NULL AND deleted_at IS NULL;

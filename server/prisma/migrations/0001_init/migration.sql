CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  email_verified_at timestamp,
  display_name text,
  avatar_url text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);

CREATE TABLE auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_subject text NOT NULL,
  provider_email text,
  provider_email_verified boolean NOT NULL DEFAULT false,
  raw_profile jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT auth_identities_provider_subject_unique UNIQUE (provider, provider_subject)
);

CREATE INDEX auth_identities_user_id_idx ON auth_identities(user_id);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  device_id text,
  user_agent text,
  ip_hash text,
  expires_at timestamp NOT NULL,
  revoked_at timestamp,
  rotated_from_token_id uuid,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens(user_id);
CREATE INDEX refresh_tokens_token_hash_idx ON refresh_tokens(token_hash);

CREATE TABLE email_login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  expires_at timestamp NOT NULL,
  consumed_at timestamp,
  last_sent_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX email_login_codes_email_idx ON email_login_codes(email);

CREATE TABLE oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  state_hash text NOT NULL UNIQUE,
  code_verifier_encrypted text,
  redirect_after text,
  expires_at timestamp NOT NULL,
  consumed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE login_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  ticket_hash text NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  consumed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX login_tickets_user_id_idx ON login_tickets(user_id);

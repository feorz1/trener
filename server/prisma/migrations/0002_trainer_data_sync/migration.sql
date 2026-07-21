CREATE TYPE client_status AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE workout_session_status AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  birth_date timestamp,
  notes text,
  status client_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);

CREATE INDEX clients_trainer_id_idx ON clients(trainer_id);
CREATE INDEX clients_trainer_id_deleted_at_idx ON clients(trainer_id, deleted_at);
CREATE INDEX clients_trainer_id_updated_at_idx ON clients(trainer_id, updated_at);

CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  muscle_group text,
  equipment text,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);

CREATE INDEX exercises_trainer_id_idx ON exercises(trainer_id);
CREATE INDEX exercises_is_system_idx ON exercises(is_system);

CREATE TABLE workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);

CREATE INDEX workout_templates_trainer_id_idx ON workout_templates(trainer_id);
CREATE INDEX workout_templates_trainer_id_client_id_idx ON workout_templates(trainer_id, client_id);
CREATE INDEX workout_templates_trainer_id_deleted_at_idx ON workout_templates(trainer_id, deleted_at);

CREATE TABLE workout_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_template_id uuid NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  "order" integer NOT NULL,
  title_snapshot text,
  planned_sets integer,
  planned_reps integer,
  planned_weight double precision,
  planned_duration_sec integer,
  rest_seconds integer,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX workout_template_items_workout_template_id_idx ON workout_template_items(workout_template_id);

CREATE TABLE workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  workout_template_id uuid REFERENCES workout_templates(id) ON DELETE SET NULL,
  title text NOT NULL,
  status workout_session_status NOT NULL DEFAULT 'PLANNED',
  scheduled_at timestamp,
  started_at timestamp,
  finished_at timestamp,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);

CREATE INDEX workout_sessions_trainer_id_idx ON workout_sessions(trainer_id);
CREATE INDEX workout_sessions_trainer_id_client_id_idx ON workout_sessions(trainer_id, client_id);
CREATE INDEX workout_sessions_trainer_id_status_idx ON workout_sessions(trainer_id, status);
CREATE INDEX workout_sessions_trainer_id_scheduled_at_idx ON workout_sessions(trainer_id, scheduled_at);
CREATE INDEX workout_sessions_trainer_id_updated_at_idx ON workout_sessions(trainer_id, updated_at);

CREATE TABLE workout_session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_session_id uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  "order" integer NOT NULL,
  title_snapshot text NOT NULL,
  planned_sets integer,
  planned_reps integer,
  planned_weight double precision,
  planned_duration_sec integer,
  rest_seconds integer,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX workout_session_items_workout_session_id_idx ON workout_session_items(workout_session_id);

CREATE TABLE workout_set_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_session_item_id uuid NOT NULL REFERENCES workout_session_items(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  reps integer,
  weight double precision,
  duration_sec integer,
  distance_meters double precision,
  completed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX workout_set_results_workout_session_item_id_idx ON workout_set_results(workout_session_item_id);

CREATE TABLE activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  type text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX activity_events_user_id_idx ON activity_events(user_id);
CREATE INDEX activity_events_type_idx ON activity_events(type);
CREATE INDEX activity_events_created_at_idx ON activity_events(created_at);

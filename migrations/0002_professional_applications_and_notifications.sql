-- Apply-as-Professional workflow + notifications + admin-imposed suspension.
-- Additive only — safe to re-run.

ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS suspended_at timestamp;
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS suspended_reason text;

CREATE TABLE IF NOT EXISTS professional_applications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  specialization text NOT NULL,
  qualification text NOT NULL,
  experience integer NOT NULL,
  bio text,
  languages text[] NOT NULL DEFAULT ARRAY['English']::text[],
  price_per_minute decimal(10,2) NOT NULL,
  license_number text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  reviewed_by varchar REFERENCES users(id),
  reviewed_at timestamp,
  rejection_reason text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_professional_applications_user_id" ON professional_applications(user_id);
CREATE INDEX IF NOT EXISTS "IDX_professional_applications_status" ON professional_applications(status);

CREATE TABLE IF NOT EXISTS notifications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_notifications_user_id" ON notifications(user_id);
CREATE INDEX IF NOT EXISTS "IDX_notifications_read" ON notifications(read);

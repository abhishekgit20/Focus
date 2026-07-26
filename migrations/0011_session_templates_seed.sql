-- session_templates is real business reference data (the fixed-duration
-- session catalog), not test/sample data — but it was never captured in a
-- migration, only ever inserted by hand at some point in this project's
-- history. Any fresh database (including the new production Supabase
-- project) would otherwise have a correct schema but zero rows here, which
-- silently breaks booking entirely (professional_session_offerings and
-- sessions both FK to this table) despite the app booting and running fine.
-- ON CONFLICT makes this idempotent and safe to run against the existing
-- dev database too, where these rows already exist.
INSERT INTO session_templates (name, duration_minutes, description, sort_order, is_active) VALUES
  ('Quick Check-in', 15, 'Follow-up consultation or urgent guidance.', 1, true),
  ('Standard Session', 30, 'Most common therapy consultation.', 2, true),
  ('Deep Session', 45, 'Moderate-depth therapy.', 3, true),
  ('Extended Session', 60, 'Initial consultation or complex cases.', 4, true),
  ('Couples / Family Session', 90, 'Relationship or family counselling.', 5, true)
ON CONFLICT (duration_minutes) DO NOTHING;

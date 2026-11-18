-- v3.1: Additive admin-supplied contact corrections; never delete existing data.
-- API startup performs the equivalent ALTER statements automatically.
-- Take a database backup before manually executing in pgAdmin.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS display_name_override VARCHAR(200);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_number_override VARCHAR(60);

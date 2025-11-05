-- migrations/003_alter_register_interests_nullable.sql
ALTER TABLE register
	ALTER COLUMN interests DROP NOT NULL,
	ALTER COLUMN interests SET DEFAULT '{}';



-- migrations/004_alter_register_remove_interests_add_module.sql
ALTER TABLE register 
	ADD COLUMN module VARCHAR(100);

ALTER TABLE register
	DROP COLUMN IF EXISTS interests;


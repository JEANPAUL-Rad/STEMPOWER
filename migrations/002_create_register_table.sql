-- migrations/002_create_register_table.sql
CREATE TABLE IF NOT EXISTS register (
	id SERIAL PRIMARY KEY,
	full_name VARCHAR(150) NOT NULL,
	email_address VARCHAR(150) UNIQUE NOT NULL,
	contact_number VARCHAR(20),
	level_of_archicad_skills VARCHAR(20)
		CHECK (level_of_archicad_skills IN ('Not good', 'Good', 'Excellent')),
	interests TEXT[] DEFAULT '{}',
	payment_amount NUMERIC(10,2) DEFAULT 0,
	payment_status VARCHAR(20) DEFAULT 'Pending'
		CHECK (payment_status IN ('Pending', 'Paid', 'Failed')),
	payment_reference VARCHAR(100),
	payment_method VARCHAR(50),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



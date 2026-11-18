-- PostgreSQL reference schema derived from the SQLAlchemy models.
-- This is NOT a database migration.
-- Prefer SETUP_LOCAL.bat / SQLAlchemy create_tables() on a newly created database.
-- Use Alembic for future schema changes.

CREATE TABLE users (
	id SERIAL NOT NULL, 
	full_name VARCHAR(120) NOT NULL, 
	email VARCHAR(200) NOT NULL, 
	employee_code VARCHAR(50) NOT NULL, 
	phone VARCHAR(40) NOT NULL, 
	whatsapp_number VARCHAR(45) NOT NULL, 
	department VARCHAR(80) NOT NULL, 
	designation VARCHAR(80) NOT NULL, 
	password_hash VARCHAR(230) NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	approved BOOLEAN NOT NULL, 
	active BOOLEAN NOT NULL, 
	token_version INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (employee_code), 
	UNIQUE (whatsapp_number)
);

CREATE TABLE audit_jobs (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	requested_by INTEGER NOT NULL, 
	hours INTEGER NOT NULL, 
	status VARCHAR(25) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	summary_json TEXT NOT NULL, 
	pdf_bytes BYTEA, 
	error VARCHAR(400) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(employee_id) REFERENCES users (id), 
	FOREIGN KEY(requested_by) REFERENCES users (id)
);

CREATE TABLE conversations (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	external_key VARCHAR(64) NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	contact_number VARCHAR(60) NOT NULL,
	display_name_override VARCHAR(200),
	contact_number_override VARCHAR(60), 
	state VARCHAR(30) NOT NULL, 
	needs_review BOOLEAN NOT NULL, 
	review_reason VARCHAR(300) NOT NULL, 
	last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_conversation_employee_key UNIQUE (employee_id, external_key), 
	FOREIGN KEY(employee_id) REFERENCES users (id)
);

CREATE TABLE security_events (
	id SERIAL NOT NULL, 
	actor_id INTEGER, 
	action VARCHAR(80) NOT NULL, 
	subject_id INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(actor_id) REFERENCES users (id)
);

CREATE TABLE sync_logs (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	conversations_seen INTEGER NOT NULL, 
	new_messages INTEGER NOT NULL, 
	unread_excluded INTEGER NOT NULL, 
	review_count INTEGER NOT NULL, 
	window_hours INTEGER NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(employee_id) REFERENCES users (id)
);

CREATE TABLE messages (
	id SERIAL NOT NULL, 
	conversation_id INTEGER NOT NULL, 
	fingerprint VARCHAR(64) NOT NULL, 
	sender VARCHAR(160) NOT NULL, 
	from_me BOOLEAN NOT NULL, 
	text TEXT NOT NULL, 
	media VARCHAR(90) NOT NULL, 
	media_duration VARCHAR(60) NOT NULL, 
	timestamp VARCHAR(110) NOT NULL, 
	received_at TIMESTAMP WITH TIME ZONE NOT NULL,
	occurred_at TIMESTAMP WITH TIME ZONE,
	time_quality VARCHAR(20) NOT NULL DEFAULT 'unknown',
	PRIMARY KEY (id), 
	CONSTRAINT uq_message_fingerprint UNIQUE (conversation_id, fingerprint), 
	FOREIGN KEY(conversation_id) REFERENCES conversations (id)
);

CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE INDEX ix_audit_jobs_employee_id ON audit_jobs (employee_id);
CREATE INDEX ix_audit_jobs_status ON audit_jobs (status);
CREATE INDEX ix_conversations_last_seen_at ON conversations (last_seen_at);
CREATE INDEX ix_conversations_employee_id ON conversations (employee_id);
CREATE INDEX ix_sync_logs_employee_id ON sync_logs (employee_id);
CREATE INDEX ix_message_time ON messages (timestamp);
CREATE INDEX ix_messages_conversation_id ON messages (conversation_id);

-- New non-destructive v3.0 tables. Existing records remain intact.
CREATE TABLE sync_checkpoints (
    employee_id INTEGER PRIMARY KEY REFERENCES users(id),
    last_completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE TABLE sync_runs (
    id VARCHAR(36) PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES users(id),
    since_at TIMESTAMP WITH TIME ZONE NOT NULL,
    planned_until TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(25) NOT NULL,
    initial BOOLEAN NOT NULL,
    batches_saved INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX ix_sync_runs_employee_id ON sync_runs (employee_id);
CREATE INDEX ix_message_occurred_at ON messages (occurred_at);

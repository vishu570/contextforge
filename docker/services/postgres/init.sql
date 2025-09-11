-- Initialize ContextForge PostgreSQL database

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE contextforge'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'contextforge')\gexec

-- Connect to the contextforge database
\c contextforge;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector" CASCADE;  -- For vector embeddings (if available)

-- Create custom types
DO $$ BEGIN
    CREATE TYPE item_type AS ENUM ('prompt', 'rule', 'agent', 'collection');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create search index for full-text search
CREATE INDEX IF NOT EXISTS idx_items_search ON "Item" USING gin(to_tsvector('english', name || ' ' || content || ' ' || COALESCE(description, '')));

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_items_user_type ON "Item" (user_id, type);
CREATE INDEX IF NOT EXISTS idx_items_folder ON "Item" (folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_updated ON "Item" (updated_at DESC);

-- Create indexes for collections
CREATE INDEX IF NOT EXISTS idx_collections_user_path ON "Collection" (user_id, path);
CREATE INDEX IF NOT EXISTS idx_collections_parent ON "Collection" (parent_id) WHERE parent_id IS NOT NULL;

-- Create indexes for jobs
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON "Job" (user_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON "Job" (created_at DESC);

-- Grant permissions to contextforge user
GRANT ALL PRIVILEGES ON DATABASE contextforge TO contextforge;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO contextforge;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO contextforge;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO contextforge;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO contextforge;
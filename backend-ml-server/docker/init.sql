-- Create additional database for AI features
CREATE DATABASE carenexus_postgres_ai;

-- Grant privileges to the default user
GRANT ALL PRIVILEGES ON DATABASE carenexus_postgres_ai TO user_postgress;
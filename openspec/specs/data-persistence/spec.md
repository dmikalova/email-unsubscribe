## ADDED Requirements

### Requirement: Supabase as database provider

The application SHALL use Supabase managed PostgreSQL as its database backend.

#### Scenario: Production database on Supabase

- **WHEN** the production application runs
- **THEN** it connects to a Supabase project's PostgreSQL database

### Requirement: Connection pooler usage

The application SHALL connect to Supabase via the Supavisor connection pooler to handle connection management efficiently.

#### Scenario: Pooler connection string

- **WHEN** configuring the database connection
- **THEN** the connection string uses the Supabase pooler endpoint (port 6543) rather than direct connection

#### Scenario: Transaction mode pooling

- **WHEN** the application executes queries
- **THEN** connections are returned to the pool after each transaction completes

### Requirement: Separate production and preview databases

The system SHALL maintain separate Supabase projects for production and preview environments.

#### Scenario: Production isolation

- **WHEN** the production application runs
- **THEN** it connects to the production Supabase project only

#### Scenario: Preview isolation from production

- **WHEN** a preview environment runs
- **THEN** it connects to the preview Supabase project, never production

### Requirement: Database migrations remain additive

Database migrations SHALL continue to be additive-only, never dropping tables or columns, preserving existing data.

#### Scenario: Migration adds table

- **WHEN** a migration creates a new table
- **THEN** existing tables and data are unaffected

#### Scenario: No down migrations

- **WHEN** rolling back a deployment
- **THEN** the database schema is not rolled back (use application-level compatibility)

### Requirement: SSL connection required

All database connections SHALL use SSL/TLS encryption.

#### Scenario: SSL enforced

- **WHEN** the application connects to Supabase
- **THEN** the connection uses SSL (`sslmode=require` or stricter)

### Requirement: Connection string via Secret Manager

The database connection string SHALL be stored in Google Secret Manager, not in environment variables or code.

#### Scenario: Secret retrieval at runtime

- **WHEN** Cloud Run starts an instance
- **THEN** it retrieves the `DATABASE_URL` from Secret Manager and injects it as an environment variable

### Requirement: Graceful handling of connection limits

The application SHALL handle connection pool exhaustion gracefully without crashing.

#### Scenario: Pool exhausted temporarily

- **WHEN** all pooler connections are in use
- **THEN** new requests wait briefly for a connection rather than failing immediately

#### Scenario: Prolonged exhaustion

- **WHEN** connections cannot be obtained after the timeout
- **THEN** the request fails with an appropriate error and the application continues running

### Requirement: Database accessible from Cloud Run

The Supabase database SHALL be accessible from Cloud Run services without VPC configuration.

#### Scenario: Public pooler endpoint

- **WHEN** Cloud Run connects to Supabase
- **THEN** it uses the public pooler endpoint (no VPC peering required)

### Requirement: Supabase free tier compatible

The database usage patterns SHALL remain compatible with Supabase's free tier constraints for cost efficiency.

#### Scenario: Activity prevents pause

- **WHEN** the application runs regularly (at least weekly)
- **THEN** the Supabase project remains active and does not pause

#### Scenario: Connection limits respected

- **WHEN** the application is deployed
- **THEN** it respects the free tier connection limits through pooler usage

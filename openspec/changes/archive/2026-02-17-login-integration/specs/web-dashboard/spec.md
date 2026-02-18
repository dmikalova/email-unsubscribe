## MODIFIED Requirements

### Requirement: Authentication via login portal

The system SHALL require authentication and delegate login to the centralized login portal.

#### Scenario: Unauthenticated access

- **WHEN** a user accesses the dashboard without a valid session cookie
- **THEN** the system SHALL redirect to `https://login.{SESSION_DOMAIN}?returnUrl={current_url}`

#### Scenario: Authenticated access

- **WHEN** a user accesses the dashboard with a valid Supabase JWT in the session cookie
- **THEN** the system SHALL grant dashboard access

#### Scenario: Session validation

- **WHEN** validating a session cookie
- **THEN** the system SHALL verify the JWT signature using ES256 with public keys fetched from SUPABASE_URL JWKS endpoint
- **AND** cache JWKS keys for 1 hour to handle key rotation
- **AND** verify the JWT audience is "authenticated"
- **AND** verify the JWT is not expired (with 60s clock skew tolerance)

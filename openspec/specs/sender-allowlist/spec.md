# Sender Allowlist

## ADDED Requirements

### Requirement: Maintain sender allow list

The system SHALL maintain a configurable list of sender addresses and domains
that should never be unsubscribed.

#### Scenario: Add sender to allow list

- **WHEN** a user adds a sender email or domain to the allow list
- **THEN** the system SHALL persist that entry and exclude matching emails from
  unsubscribe processing

#### Scenario: Remove sender from allow list

- **WHEN** a user removes a sender from the allow list
- **THEN** the system SHALL remove that entry and resume processing emails from
  that sender

#### Scenario: View allow list

- **WHEN** a user requests to view the allow list
- **THEN** the system SHALL display all allowed sender addresses and domains

### Requirement: Allow list matching

The system SHALL support both exact email matching and domain-level matching.

#### Scenario: Exact email match

- **WHEN** the allow list contains `newsletter@example.com`
- **THEN** only emails from `newsletter@example.com` SHALL be excluded

#### Scenario: Domain match

- **WHEN** the allow list contains "@example.com" (domain entry)
- **THEN** all emails from any address at "example.com" SHALL be excluded

#### Scenario: Subdomain handling

- **WHEN** the allow list contains "@example.com"
- **THEN** emails from "mail.example.com" SHALL NOT be excluded unless
  explicitly allowed

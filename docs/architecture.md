# Architecture Overview

This document describes the architecture of the Email Unsubscribe application.

## System Overview

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#BBDEFB', 'primaryTextColor': '#1565C0', 'primaryBorderColor': '#1976D2', 'lineColor': '#757575', 'secondaryColor': '#C8E6C9', 'tertiaryColor': '#FFF3E0'}}}%%
flowchart LR
    subgraph Browser["Browser"]
        Vue[Vue.js]
    end

    subgraph Server["Hono Server"]
        API[REST API]
        OAuth[OAuth]
        Static[Static]
    end

    Gmail[Gmail API]
    DB[(PostgreSQL)]
    PW[Playwright]

    Vue --> Server
    API --> Gmail & DB & PW
    OAuth --> Gmail & DB

    %% Material Blue 100/700
    classDef browser fill:#BBDEFB,stroke:#1976D2,color:#0D47A1
    %% Material Deep Purple 100/700
    classDef server fill:#D1C4E9,stroke:#512DA8,color:#311B92
    %% Material Teal 100/700
    classDef external fill:#B2DFDB,stroke:#00796B,color:#004D40
    %% Material Amber 100/700
    classDef database fill:#FFECB3,stroke:#FFA000,color:#FF6F00

    class Vue browser
    class API,OAuth,Static server
    class Gmail,PW external
    class DB database
```

## Core Components

### 1. Gmail Integration (`src/gmail/`)

- **OAuth Flow**: Handles Google OAuth 2.0 authentication
- **Token Management**: Encrypts and stores refresh tokens
- **API Client**: Interfaces with Gmail API for reading emails
- **Labels**: Manages Gmail labels for tracking processed emails

### 2. Email Scanner (`src/scanner/`)

- **Header Parser**: Extracts `List-Unsubscribe` headers (RFC 8058)
- **HTML Parser**: Finds unsubscribe links in email body
- **Allow List**: Manages senders to preserve
- **Sender Tracking**: Tracks effectiveness of unsubscribes

### 3. Unsubscribe Processor (`src/unsubscribe/`)

- **URL Validator**: Validates URLs, prevents SSRF attacks
- **One-Click Handler**: Processes RFC 8058 POST requests
- **Mailto Handler**: Sends unsubscribe emails
- **Browser Automation**: Uses Playwright for complex flows
- **Pattern Manager**: Stores reusable automation patterns

### 4. Tracking System (`src/tracker/`)

- **Attempt Tracker**: Records all unsubscribe attempts
- **Audit Logger**: Logs all actions for debugging
- **Statistics**: Aggregates success/failure metrics

### 5. Web Dashboard (`src/api/`, `src/public/`)

- **REST API**: JSON endpoints for dashboard operations
- **Vue.js SPA**: Single-page application dashboard
- **Real-time Stats**: Overview of processing status

## Data Flow

### Email Processing Flow

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#BBDEFB', 'primaryTextColor': '#1565C0', 'primaryBorderColor': '#1976D2', 'lineColor': '#757575'}}}%%
flowchart TD
    A([Start]) --> B[Fetch emails]
    B --> C{Each email}
    C --> D{Allow listed?}
    D -->|Yes| C
    D -->|No| E[Extract links]
    E --> F[Validate URLs]
    F --> G{One-click?}
    G -->|Success| H[Record]
    G -->|Failed| I[Browser]
    I --> H
    H --> J[Label email]
    J --> C
    C -->|Done| K([Complete])

    %% Material Green 100/700 - start/end
    classDef start fill:#C8E6C9,stroke:#388E3C,color:#1B5E20
    %% Material Blue 100/700 - process
    classDef process fill:#BBDEFB,stroke:#1976D2,color:#0D47A1
    %% Material Orange 100/700 - decision
    classDef decision fill:#FFE0B2,stroke:#F57C00,color:#E65100

    class A,K start
    class B,E,F,H,I,J process
    class C,D,G decision
```

### Authentication Flow

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'actorBkg': '#BBDEFB', 'actorBorder': '#1976D2', 'actorTextColor': '#0D47A1', 'signalColor': '#757575', 'signalTextColor': '#212121', 'noteBkgColor': '#FFF9C4', 'noteBorderColor': '#FBC02D', 'noteTextColor': '#F57F17', 'activationBkgColor': '#E1BEE7', 'activationBorderColor': '#7B1FA2'}}}%%
sequenceDiagram
    autonumber
    actor U as User
    participant A as App
    participant G as Google
    participant DB as Database

    U->>A: Connect Gmail
    A->>G: Redirect to consent
    U->>G: Grant permissions
    G->>A: Auth code
    A->>G: Exchange for tokens
    G-->>A: Tokens
    A->>DB: Encrypt & store
    A-->>U: Dashboard

    Note over A,DB: AES-256-GCM encryption
```

## Database Schema

The application uses a dedicated `email_unsubscribe` schema in PostgreSQL:

### Core Tables

| Table                 | Purpose                        |
| --------------------- | ------------------------------ |
| `oauth_tokens`        | Encrypted OAuth refresh tokens |
| `allow_list`          | Senders to preserve            |
| `unsubscribe_history` | All unsubscribe attempts       |
| `sender_tracking`     | Per-sender statistics          |
| `processed_emails`    | Emails already processed       |
| `audit_log`           | Action audit trail             |
| `patterns`            | Reusable automation patterns   |
| `scan_state`          | Scan pagination state          |

### Key Relationships

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#E3F2FD', 'primaryTextColor': '#1565C0', 'primaryBorderColor': '#1976D2', 'lineColor': '#757575', 'tertiaryColor': '#FFF3E0'}}}%%
erDiagram
    oauth_tokens {
        int id PK
        text user_id UK
        bytea access_token
        bytea refresh_token
    }

    unsubscribe_history {
        int id PK
        text email_id
        text sender
        text sender_domain
        enum status
    }

    sender_tracking {
        int id PK
        text sender UK
        text sender_domain
        int email_count
    }

    processed_emails {
        int id PK
        text email_id UK
        timestamp processed_at
    }

    unsubscribe_history }o--|| sender_tracking : "tracks"
    unsubscribe_history ||--o| processed_emails : "marks"
```

## Security Considerations

### SSRF Prevention

All URLs are validated before processing:

- Block private IP ranges (10.x, 192.168.x, etc.)
- Block localhost and 127.x addresses
- Only allow HTTP/HTTPS protocols
- Domain validation

### Token Security

- OAuth tokens encrypted with AES-256-GCM
- Encryption key from environment variable
- Tokens stored encrypted at rest

### Authentication

- Auth delegated to main domain (cddc39.tech)
- Session cookies shared across subdomain
- CSRF protection on state-changing endpoints

### Browser Isolation

- Playwright runs in headless mode
- Separate browser context per domain
- Screenshots/traces stored locally

## Performance Characteristics

### Rate Limits

| Operation          | Limit                  | Reason               |
| ------------------ | ---------------------- | -------------------- |
| Gmail API          | 250 quota units/second | Google quota         |
| One-click requests | 10/minute              | Avoid rate limiting  |
| Browser automation | 1 concurrent           | Resource constraints |

### Resource Usage

| Component  | CPU  | Memory  | Notes                |
| ---------- | ---- | ------- | -------------------- |
| Web server | Low  | ~50 MB  | Deno is lightweight  |
| Playwright | High | ~200 MB | Per browser instance |
| PostgreSQL | Low  | Varies  | Shared instance      |

## Error Handling

### Failure Categories

1. **Network errors**: Timeout, connection refused
2. **Authentication errors**: Invalid tokens, expired
3. **Automation failures**: Element not found, unexpected flow
4. **Rate limiting**: Too many requests

### Recovery Strategies

- Automatic token refresh on expiry
- Retry with exponential backoff
- Screenshot capture on browser failures
- Playwright trace for debugging complex flows

## Extensibility

### Adding New Unsubscribe Patterns

1. Navigate to failed attempts in dashboard
2. Analyze the screenshot/trace
3. Create a pattern with CSS selectors
4. Pattern automatically applies to similar domains

### Custom Allow List Rules

Support patterns:

- `example.com` - Match domain
- `*.example.com` - Match subdomains
- `user@example.com` - Match exact sender
- `*billing*` - Match partial patterns

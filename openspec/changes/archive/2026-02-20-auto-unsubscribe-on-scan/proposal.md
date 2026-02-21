# Auto-Unsubscribe on Scan

## Why

Currently the scanner analyzes emails and stores metadata but doesn't act on
it—unsubscribes require manual user initiation. For a personal automation tool,
this defeats the purpose. The system should automatically unsubscribe from
everything not on the allow list the moment an email is scanned, with zero user
interaction required.

## What Changes

- Scanner triggers unsubscribe automation immediately after extracting
  unsubscribe links from an email
- All senders not on the allow list get automatically unsubscribed (no
  confirmation flow)
- Per-domain logging tracks all unsubscribe attempts and outcomes in the
  database
- Followup email detection identifies when unsubscribed senders keep emailing
- Dashboard shows domain-level unsubscribe logs and compliance status (no
  private message content)
- Server logs are minimal—just user ID, no domain or email details
  (privacy-first logging)

## Capabilities

### New Capabilities

- `followup-detection`: Track emails received from domains after unsubscribe to
  identify non-compliant senders. Correlates new messages with prior unsubscribe
  attempts, surfaces repeat offenders.

### Modified Capabilities

- `email-scanner`: Scanner now triggers unsubscribe automation inline during
  scan instead of only storing analysis. Checks allow list before initiating
  unsubscribe.
- `compliance-tracker`: Extended to aggregate data by domain, detect followup
  patterns, and surface domains that ignore unsubscribe requests.

## Impact

- **Code**: `scanner.ts` calls unsubscribe automation service; new followup
  detection logic added to scan processing
- **Database**: New table or columns to track per-domain unsubscribe state and
  followup counts
- **API**: Dashboard endpoints for domain compliance view and unsubscribe logs
- **Logging**: Two-tier approach—database stores domain-level details for
  dashboard, server logs emit only user ID for privacy
- **Behavior**: **BREAKING** for testing—scanning now has side effects
  (unsubscribes). Tests need isolation.

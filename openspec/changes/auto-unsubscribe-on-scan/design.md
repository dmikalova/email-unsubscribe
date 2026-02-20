# Auto-Unsubscribe on Scan

## Context

The system currently has all pieces for email unsubscribe automation:

- **Scanner** (`src/scanner/`) extracts unsubscribe links from headers and HTML
  body
- **Unsubscribe module** (`src/unsubscribe/`) handles one-click, mailto, and
  browser automation
- **Tracker** (`src/tracker/`) records attempts to `unsubscribe_history` table
- **Sender tracking** table tracks `emails_after_unsubscribe` and
  `flagged_ineffective`

These pieces are connected but require manual triggering. The gap: scanner
stores analysis but doesn't act on it.

**Constraint**: Multi-user system - privacy logging is critical to prevent
cross-user data leakage in server logs.

## Goals / Non-Goals

**Goals:**

- Scanner automatically triggers unsubscribe when link detected and sender not
  on allow list
- Database stores domain-level unsubscribe logs viewable in dashboard
- Server console logs emit only user ID (no domains, emails, or PII)
- Dashboard displays per-domain compliance status and followup detection
- Graceful recovery: errors on individual emails are logged and processing
  continues; restarts resume from last checkpoint

**Non-Goals:**

- User confirmation flows (explicitly unwanted)
- Complex prioritization or batching of unsubscribes
- Multi-tenant isolation or user-segmented logging

## Decisions

### 1. Inline unsubscribe vs async queue

**Decision**: Inline unsubscribe during scan processing

**Rationale**: Simpler architecture—no queue infrastructure needed. Scan is
already async from user's perspective. If unsubscribe fails, it records the
failure and scan continues.

**Alternative considered**: Background job queue (rejected - adds complexity,
current throughput is adequate with ~50 emails/batch per user)

### 2. Graceful error handling and restart recovery

**Decision**: Wrap each email's unsubscribe attempt in try/catch. Record
failures to DB immediately. Use existing `processed_emails` table to track
completion - scanner already marks emails processed after handling.

**Rationale**:

- Individual failures shouldn't halt the batch - log error, record to
  `unsubscribe_history` with failure status, continue to next email
- On restart, scanner's `getScanState()` and `getProcessedEmailIds()` already
  provide checkpoint data
- `unsubscribe_history` records `pending` vs `success`/`failed` status - pending
  records from interrupted runs can be detected

**Implementation**: Scanner loop catches exceptions per-email, calls
`recordUnsubscribeAttempt()` with failure details, continues iteration.

### 3. Allow list check location

**Decision**: Check allow list in scanner before calling unsubscribe, not in
unsubscribe module

**Rationale**: Keep unsubscribe module simple (it just executes). Scanner
already has allow list access via `isAllowed()`. Centralizes policy in one
place.

### 4. Two-tier logging strategy

**Decision**:

- **Database**: Store full domain/sender in `unsubscribe_history` (already
  exists)
- **Server logs**: Log only `[Unsubscribe] userId={userId}` with no domain or
  email details

**Rationale**: Dashboard needs detail to be useful. Server logs can leak to
cloud logging services and would expose user data in a multi-user system -
keeping them minimal protects privacy while DB stays queryable per-user.

**Implementation**: Wrap console.log calls in unsubscribe flow with minimal
logging helpers.

### 5. Followup detection mechanism

**Decision**: Use existing `sender_tracking.emails_after_unsubscribe` counter.

**Rationale**: Table already has:

- `unsubscribed_at` timestamp
- `emails_after_unsubscribe` counter
- `last_email_after_unsubscribe_at` timestamp
- `flagged_ineffective` boolean

Scanner's `trackSender()` already increments counts. We need to:

1. Check if `unsubscribed_at` is set when incrementing
2. If set, increment `emails_after_unsubscribe` instead
3. Flag as ineffective if: 24+ hours since unsubscribe AND any new email
   received (grace period allows confirmation emails)

### 6. Dashboard unsubscribe logs view

**Decision**: New API endpoint `/api/unsubscribe-logs` returning
domain-aggregated data from `unsubscribe_history`.

**Response structure**:

```typescript
interface DomainUnsubscribeSummary {
  domain: string;
  totalAttempts: number;
  successCount: number;
  failedCount: number;
  lastAttemptAt: Date;
  followupEmails: number;
  flaggedIneffective: boolean;
}
```

Joins `unsubscribe_history` with `sender_tracking` to get followup data.

## Risks / Trade-offs

**[Risk]** Unsubscribe failures slow down scan → **Mitigation**: Record failure
quickly, don't retry inline. Playwright timeouts set to 30s max.

**[Risk]** Rate limiting from too many unsubscribes → **Mitigation**: Natural
throttling—scan processes ~50 emails/batch with delays between. Can add explicit
delay if needed later.

**[Risk]** Accidentally unsubscribing from wanted emails → **Mitigation**: Allow
list checked before every unsubscribe. User can add domains proactively.

**[Trade-off]** Inline processing vs queueing Accepted: Simpler system;
throughput is adequate for current scale. Can revisit if user growth demands it.

**[Trade-off]** Minimal server logs reduce debuggability Accepted: Database has
full details per-user. Server logs are for liveness, not debugging. Critical for
multi-user privacy.

## Resolved Questions

1. **Threshold for "ineffective" flagging**: 24-hour grace period after
   unsubscribe (allows confirmation emails), then any subsequent email flags the
   domain as ineffective.
2. **Unsubscribe methods**: Use all three - one-click, mailto, and browser
   automation. Build out Playwright patterns iteratively.

## Future Work (Out of Scope)

**Trace storage persistence**: Currently traces are stored on ephemeral local
filesystem. See `gcs-trace-storage` change for GCS bucket with 90-day TTL.

**Playwright trace analysis for pattern learning**: On failure, surface traces
in dashboard for agent analysis to propose new selector patterns for that
domain. Depends on trace storage being persistent first.

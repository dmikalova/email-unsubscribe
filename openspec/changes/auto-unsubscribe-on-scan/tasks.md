# Auto-Unsubscribe on Scan Tasks

## 1. Scanner Core - Inline Unsubscribe

- [ ] 1.1 Add import for unsubscribe module in scanner.ts
- [ ] 1.2 Create `processUnsubscribe()` function that tries one-click, mailto,
      browser in order
- [ ] 1.3 Call `processUnsubscribe()` after extracting links if sender not on
      allow list
- [ ] 1.4 Wrap unsubscribe call in try/catch, record failures, continue to next
      email
- [ ] 1.5 Handle "no unsubscribe link" scenario - skip without recording as
      failure

## 2. Privacy Logging

- [ ] 2.1 Create `src/utils/privacy-log.ts` with minimal logging helpers
- [ ] 2.2 Add `logUnsubscribe(userId: string)` - logs only
      `[Unsubscribe] userId={userId}`
- [ ] 2.3 Add `logUnsubscribeError(userId: string, errorType: string)` - no PII
      in error logs
- [ ] 2.4 Replace console.log calls in unsubscribe flow with privacy-safe
      helpers
- [ ] 2.5 Update scanner to use privacy-safe logging for unsubscribe operations

## 3. Followup Detection

- [ ] 3.1 Modify `trackSender()` to check if `unsubscribed_at` is set
- [ ] 3.2 If unsubscribed, check if 24+ hours passed since unsubscribe
- [ ] 3.3 If past grace period, increment `emails_after_unsubscribe` counter
- [ ] 3.4 Set `flagged_ineffective = true` and `flagged_at` timestamp on first
      followup after grace period
- [ ] 3.5 Update `last_email_after_unsubscribe_at` timestamp on each followup

## 4. Dashboard API

- [ ] 4.1 Create `GET /api/unsubscribe-logs` route in routes.ts
- [ ] 4.2 Add query function to aggregate unsubscribe data by domain
- [ ] 4.3 Join `unsubscribe_history` with `sender_tracking` for followup data
- [ ] 4.4 Ensure query filters by authenticated userId (review action item)
- [ ] 4.5 Return `DomainUnsubscribeSummary[]` with domain, counts, status

## 5. Dashboard UI

- [ ] 5.1 Create UnsubscribeLogs.vue component
- [ ] 5.2 Fetch from `/api/unsubscribe-logs` on mount
- [ ] 5.3 Display table with domain, attempts, success/failed counts, last
      attempt
- [ ] 5.4 Add compliance status indicator (flagged ineffective badge)
- [ ] 5.5 Add to dashboard navigation/routing

## 6. Testing

- [ ] 6.1 Create mock for unsubscribe module in tests/setup.ts
- [ ] 6.2 Add scanner test: triggers unsubscribe when link found and not on
      allow list
- [ ] 6.3 Add scanner test: skips unsubscribe when sender on allow list
- [ ] 6.4 Add scanner test: continues batch when individual unsubscribe fails
- [ ] 6.5 Add scanner test: handles "no unsubscribe link" gracefully
- [ ] 6.6 Add followup detection test: increments counter after 24h grace period
- [ ] 6.7 Add followup detection test: does not flag within 24h grace period
- [ ] 6.8 Add API test: `/api/unsubscribe-logs` returns user-scoped data only

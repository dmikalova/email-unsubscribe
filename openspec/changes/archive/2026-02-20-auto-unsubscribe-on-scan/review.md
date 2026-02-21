# Auto-Unsubscribe on Scan Review

## Summary

Solid design that connects existing pieces with minimal new code. Main concerns
are test isolation and ensuring database queries are properly user-scoped for
multi-user privacy.

## Security

- [x] **Multi-user data isolation**: Dashboard API `/api/unsubscribe-logs` MUST
      filter by authenticated userId. Design mentions "per-user" but
      implementation must enforce this. **Address in tasks.**
- [x] **Privacy logging approved**: Two-tier logging strategy (DB stores
      details, server logs only userId) is correct for multi-user system.

## Patterns

- [x] **Reuses existing utilities**: Design correctly identifies `isAllowed()`,
      `trackSender()`, `recordUnsubscribeAttempt()`. No new abstractions needed.
- [x] **Module boundaries maintained**: Scanner calls unsubscribe module;
      unsubscribe module doesn't know about allow lists. Good separation.

## Alternatives

- [x] **No alternatives needed**: Existing modules cover all functionality. This
      change is primarily wiring them together.

## Simplifications

- [x] **Inline vs queue**: Already chose simpler approach. No further
      simplification needed.

## Missing Considerations

- [x] **Test isolation**: Proposal notes scanning now has side effects. Tests
      MUST mock unsubscribe module to avoid real network calls. **Address in
      tasks.**
- [x] **No unsubscribe link scenario**: Scanner may find emails without
      unsubscribe links. These should be tracked as "skipped" not "failed".
      **Address in tasks.**
- [x] **Dashboard pagination**: `/api/unsubscribe-logs` may return many domains
      over time. Add pagination support (limit/offset). **Defer** - can add
      later if needed.

## Valuable Additions

- [ ] **Dry-run mode**: Flag to scan and log what would be unsubscribed without
      acting. **Defer** - can add later for debugging.
- [ ] **Metrics counters**: Track unsubscribes per method
      (one-click/mailto/browser) for observability. **Defer** - not critical for
      initial release.

## Action Items

1. Ensure `/api/unsubscribe-logs` filters by authenticated user's userId
2. Add test setup to mock unsubscribe module during scanner tests
3. Handle "no unsubscribe link" case in scanner - track as skipped, not failed

## Deferred Items

1. Dashboard pagination for large result sets
2. Dry-run mode for debugging
3. Per-method metrics counters

## Updates Required

None - design is complete. Action items are implementation details for tasks.

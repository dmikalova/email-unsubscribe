// Tracker module exports

export {
  type FailureReason,
  getDomainStats,
  getFailedAttempts,
  getHistoryByDomain,
  getRecentAttempts,
  getStats,
  getUnsubscribeAttempt,
  incrementRetryCount,
  markAsResolved,
  type RecordAttemptInput,
  recordUnsubscribeAttempt,
  type UnsubscribeAttempt,
  type UnsubscribeMethod,
  type UnsubscribeStats,
  type UnsubscribeStatus,
  updateAttemptStatus,
} from "./tracker.ts";

export {
  type AuditAction,
  type AuditLogEntry,
  getAuditLog,
  log,
  logAllowlistAdd,
  logAllowlistRemove,
  type LogInput,
  logOAuthAuthorized,
  logPatternExported,
  logPatternImported,
  logScanCompleted,
  logScanStarted,
  logUnsubscribeAttempt,
  logUnsubscribeFailed,
  logUnsubscribeSuccess,
} from "./audit.ts";

// Tracker module exports

export {
  recordUnsubscribeAttempt,
  getUnsubscribeAttempt,
  getFailedAttempts,
  getRecentAttempts,
  markAsResolved,
  incrementRetryCount,
  updateAttemptStatus,
  getStats,
  getHistoryByDomain,
  getDomainStats,
  type UnsubscribeStatus,
  type UnsubscribeMethod,
  type FailureReason,
  type UnsubscribeAttempt,
  type RecordAttemptInput,
  type UnsubscribeStats,
} from './tracker.ts';

export {
  log,
  getAuditLog,
  logUnsubscribeAttempt,
  logUnsubscribeSuccess,
  logUnsubscribeFailed,
  logAllowlistAdd,
  logAllowlistRemove,
  logScanStarted,
  logScanCompleted,
  logOAuthAuthorized,
  logPatternImported,
  logPatternExported,
  type AuditAction,
  type AuditLogEntry,
  type LogInput,
} from './audit.ts';

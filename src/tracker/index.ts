// Tracker module exports

export {
  getDomainStats,
  getFailedAttempts,
  getHistoryByDomain,
  getRecentAttempts,
  getStats,
  getUnsubscribeAttempt,
  incrementRetryCount,
  markAsResolved,
  recordUnsubscribeAttempt,
  updateAttemptStatus,
  type FailureReason,
  type RecordAttemptInput,
  type UnsubscribeAttempt,
  type UnsubscribeMethod,
  type UnsubscribeStats,
  type UnsubscribeStatus,
} from './tracker.ts';

export {
  getAuditLog,
  log,
  logAllowlistAdd,
  logAllowlistRemove,
  logOAuthAuthorized,
  logPatternExported,
  logPatternImported,
  logScanCompleted,
  logScanStarted,
  logUnsubscribeAttempt,
  logUnsubscribeFailed,
  logUnsubscribeSuccess,
  type AuditAction,
  type AuditLogEntry,
  type LogInput,
} from './audit.ts';

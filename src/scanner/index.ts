// Scanner module exports

export {
  extractDomain,
  extractEmailAddress,
  getDate,
  getHeader,
  getSender,
  getSubject,
  normalizeEmail,
  parseListUnsubscribeHeader,
  type UnsubscribeInfo,
} from './headers.ts';

export {
  decodeBase64Url,
  extractUnsubscribeLinksFromHtml,
  getHtmlBodyFromPayload,
  type ExtractedLink,
} from './html.ts';

export {
  getProcessedEmailIds,
  getScanState,
  incrementScanStats,
  isEmailProcessed,
  markEmailProcessed,
  updateScanState,
  type ScanState,
} from './state.ts';

export {
  addToAllowList,
  findInAllowList,
  getAllowList,
  isAllowed,
  removeFromAllowList,
  type AllowListEntry,
} from './allowlist.ts';

export {
  clearIneffectiveFlag,
  getIneffectiveSenders,
  getSenderTracking,
  markSenderUnsubscribed,
  trackSender,
  type SenderTracking,
} from './tracking.ts';

export { isScanInProgress, scanEmails, type ScannedEmail, type ScanResult } from './scanner.ts';

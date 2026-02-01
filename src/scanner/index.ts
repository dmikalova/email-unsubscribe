// Scanner module exports

export {
  parseListUnsubscribeHeader,
  getHeader,
  getSender,
  extractEmailAddress,
  normalizeEmail,
  extractDomain,
  getSubject,
  getDate,
  type UnsubscribeInfo,
} from './headers.ts';

export {
  extractUnsubscribeLinksFromHtml,
  decodeBase64Url,
  getHtmlBodyFromPayload,
  type ExtractedLink,
} from './html.ts';

export {
  getScanState,
  updateScanState,
  incrementScanStats,
  isEmailProcessed,
  markEmailProcessed,
  getProcessedEmailIds,
  type ScanState,
} from './state.ts';

export {
  isAllowed,
  addToAllowList,
  removeFromAllowList,
  getAllowList,
  findInAllowList,
  type AllowListEntry,
} from './allowlist.ts';

export {
  trackSender,
  getSenderTracking,
  markSenderUnsubscribed,
  getIneffectiveSenders,
  clearIneffectiveFlag,
  type SenderTracking,
} from './tracking.ts';

export { scanEmails, isScanInProgress, type ScannedEmail, type ScanResult } from './scanner.ts';

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
} from "./headers.ts";

export {
  decodeBase64Url,
  decodeHtmlEntities,
  type ExtractedLink,
  extractUnsubscribeLinksFromHtml,
  getHtmlBodyFromPayload,
} from "./html.ts";

export {
  getProcessedEmailIds,
  getScanState,
  incrementScanStats,
  isEmailProcessed,
  markEmailProcessed,
  type ScanState,
  updateScanState,
} from "./state.ts";

export {
  addToAllowList,
  type AllowListEntry,
  findInAllowList,
  getAllowList,
  isAllowed,
  removeFromAllowList,
} from "./allowlist.ts";

export {
  clearIneffectiveFlag,
  getIneffectiveSenders,
  getSenderTracking,
  markSenderUnsubscribed,
  type SenderTracking,
  trackSender,
} from "./tracking.ts";

export {
  getScanProgress,
  isScanInProgress,
  scanEmails,
  type ScannedEmail,
  type ScanProgress,
  type ScanResult,
} from "./scanner.ts";

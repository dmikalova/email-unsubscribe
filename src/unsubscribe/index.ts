// Unsubscribe module exports

export {
  parseMailtoUrl,
  validateMailtoUrl,
  validateUnsubscribeUrl,
  type ValidationResult,
} from "./validation.ts";

export {
  isOneClickSupported,
  type OneClickResult,
  performOneClickUnsubscribe,
} from "./oneclick.ts";

export {
  hasMailtoOption,
  type MailtoResult,
  performMailtoUnsubscribe,
} from "./mailto.ts";

export {
  type BrowserOptions,
  type BrowserResult,
  closeBrowser,
  getBrowser,
  performBrowserUnsubscribe,
} from "./browser.ts";

export {
  addPattern,
  DEFAULT_PATTERNS,
  deletePattern,
  exportPatterns,
  getPatterns,
  importPatterns,
  incrementPatternMatchCount,
  type Pattern,
  type PatternExport,
  type PatternInput,
  type PatternType,
  seedDefaultPatterns,
} from "./patterns.ts";

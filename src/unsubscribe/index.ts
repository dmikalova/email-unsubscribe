// Unsubscribe module exports

export {
  parseMailtoUrl,
  validateMailtoUrl,
  validateUnsubscribeUrl,
  type ValidationResult,
} from './validation.ts';

export {
  isOneClickSupported,
  performOneClickUnsubscribe,
  type OneClickResult,
} from './oneclick.ts';

export { hasMailtoOption, performMailtoUnsubscribe, type MailtoResult } from './mailto.ts';

export {
  closeBrowser,
  getBrowser,
  performBrowserUnsubscribe,
  type BrowserOptions,
  type BrowserResult,
} from './browser.ts';

export {
  addPattern,
  DEFAULT_PATTERNS,
  deletePattern,
  exportPatterns,
  getPatterns,
  importPatterns,
  incrementPatternMatchCount,
  seedDefaultPatterns,
  type Pattern,
  type PatternExport,
  type PatternInput,
  type PatternType,
} from './patterns.ts';

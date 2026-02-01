// Unsubscribe module exports

export {
  validateUnsubscribeUrl,
  validateMailtoUrl,
  parseMailtoUrl,
  type ValidationResult,
} from './validation.ts';

export {
  performOneClickUnsubscribe,
  isOneClickSupported,
  type OneClickResult,
} from './oneclick.ts';

export {
  performMailtoUnsubscribe,
  hasMailtoOption,
  type MailtoResult,
} from './mailto.ts';

export {
  performBrowserUnsubscribe,
  getBrowser,
  closeBrowser,
  type BrowserResult,
  type BrowserOptions,
} from './browser.ts';

export {
  getPatterns,
  addPattern,
  deletePattern,
  incrementPatternMatchCount,
  exportPatterns,
  importPatterns,
  seedDefaultPatterns,
  DEFAULT_PATTERNS,
  type Pattern,
  type PatternInput,
  type PatternType,
  type PatternExport,
} from './patterns.ts';

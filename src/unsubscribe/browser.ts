// Browser-based unsubscribe automation using Playwright

import { chromium, type Browser, type Page } from 'playwright';
import { validateUnsubscribeUrl } from './validation.ts';
import { getPatterns, incrementPatternMatchCount, type Pattern } from './patterns.ts';

export interface BrowserResult {
  success: boolean;
  uncertain: boolean;
  error?: string;
  errorCategory?: 'timeout' | 'no_button_found' | 'navigation_error' | 'form_error' | 'captcha_detected' | 'login_required' | 'network_error' | 'unknown';
  screenshotPath?: string;
  tracePath?: string;
  matchedPattern?: string;
}

export interface BrowserOptions {
  timeout?: number;
  screenshotsDir?: string;
  tracesDir?: string;
  headless?: boolean;
}

const DEFAULT_TIMEOUT = 30000;

let browser: Browser | null = null;

export async function getBrowser(headless = true): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless,
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
    });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export async function performBrowserUnsubscribe(
  url: string,
  emailId: string,
  options: BrowserOptions = {},
): Promise<BrowserResult> {
  const {
    timeout = DEFAULT_TIMEOUT,
    screenshotsDir = './data/screenshots',
    tracesDir = './data/traces',
    headless = true,
  } = options;

  // Validate URL
  const validation = validateUnsubscribeUrl(url);
  if (!validation.valid) {
    return {
      success: false,
      uncertain: false,
      error: validation.error,
      errorCategory: 'unknown',
    };
  }

  const sanitizedUrl = validation.sanitizedUrl!;
  const browser = await getBrowser(headless);
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });

  // Start tracing for debugging
  await context.tracing.start({ screenshots: true, snapshots: true });

  let page: Page | null = null;
  let screenshotPath: string | undefined;
  let tracePath: string | undefined;

  try {
    page = await context.newPage();
    page.setDefaultTimeout(timeout);

    // Navigate to unsubscribe page
    try {
      await page.goto(sanitizedUrl, { waitUntil: 'domcontentloaded' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        uncertain: false,
        error: `Navigation failed: ${message}`,
        errorCategory: 'navigation_error',
      };
    }

    // Wait for page to settle
    await page.waitForTimeout(1000);

    // Take initial screenshot
    screenshotPath = `${screenshotsDir}/${emailId}-initial.png`;
    await Deno.mkdir(screenshotsDir, { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Load patterns
    const buttonPatterns = await getPatterns('button_selector');
    const successPatterns = await getPatterns('success_text');
    const errorPatterns = await getPatterns('error_text');

    // Check for CAPTCHA or login wall
    const pageContent = await page.content();
    if (detectCaptcha(pageContent)) {
      return {
        success: false,
        uncertain: false,
        error: 'CAPTCHA detected',
        errorCategory: 'captcha_detected',
        screenshotPath,
      };
    }

    if (detectLoginRequired(pageContent)) {
      return {
        success: false,
        uncertain: false,
        error: 'Login required',
        errorCategory: 'login_required',
        screenshotPath,
      };
    }

    // Check if already showing success message
    const preExistingSuccess = await checkForSuccessText(page, successPatterns);
    if (preExistingSuccess) {
      return {
        success: true,
        uncertain: false,
        matchedPattern: preExistingSuccess,
        screenshotPath,
      };
    }

    // Try to find and click unsubscribe button
    let buttonClicked = false;
    let matchedPattern: string | undefined;

    for (const pattern of buttonPatterns) {
      try {
        const button = await page.$(pattern.selector);
        if (button) {
          await button.click();
          buttonClicked = true;
          matchedPattern = pattern.name;
          await incrementPatternMatchCount(pattern.id);
          console.log(`Clicked button matching pattern: ${pattern.name}`);
          break;
        }
      } catch {
        // Pattern didn't match, try next
        continue;
      }
    }

    // If no pattern matched, try generic button detection
    if (!buttonClicked) {
      buttonClicked = await tryGenericButtonDetection(page);
    }

    if (!buttonClicked) {
      return {
        success: false,
        uncertain: false,
        error: 'No unsubscribe button found',
        errorCategory: 'no_button_found',
        screenshotPath,
      };
    }

    // Wait for navigation or content change
    await page.waitForTimeout(2000);

    // Take post-click screenshot
    const finalScreenshotPath = `${screenshotsDir}/${emailId}-final.png`;
    await page.screenshot({ path: finalScreenshotPath, fullPage: true });
    screenshotPath = finalScreenshotPath;

    // Check for success indicators
    const successPattern = await checkForSuccessText(page, successPatterns);
    if (successPattern) {
      return {
        success: true,
        uncertain: false,
        matchedPattern: successPattern,
        screenshotPath,
      };
    }

    // Check for error indicators
    const errorPattern = await checkForErrorText(page, errorPatterns);
    if (errorPattern) {
      return {
        success: false,
        uncertain: false,
        error: `Error text detected: ${errorPattern}`,
        errorCategory: 'form_error',
        screenshotPath,
      };
    }

    // No clear indicator - mark as uncertain
    return {
      success: false,
      uncertain: true,
      error: 'No clear success or error indicator',
      matchedPattern,
      screenshotPath,
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Categorize error
    let errorCategory: BrowserResult['errorCategory'] = 'unknown';
    if (message.includes('timeout') || message.includes('Timeout')) {
      errorCategory = 'timeout';
    } else if (message.includes('net::') || message.includes('ERR_')) {
      errorCategory = 'network_error';
    }

    return {
      success: false,
      uncertain: false,
      error: message,
      errorCategory,
      screenshotPath,
    };

  } finally {
    // Save trace on failure
    if (page) {
      try {
        tracePath = `${tracesDir}/${emailId}-trace.zip`;
        await Deno.mkdir(tracesDir, { recursive: true });
        await context.tracing.stop({ path: tracePath });
      } catch {
        // Ignore trace save errors
      }
    }

    await context.close();
  }
}

async function tryGenericButtonDetection(page: Page): Promise<boolean> {
  // Try common button patterns
  const genericSelectors = [
    'button:has-text("unsubscribe")',
    'a:has-text("unsubscribe")',
    'input[type="submit"][value*="unsubscribe" i]',
    'button:has-text("opt out")',
    'a:has-text("opt out")',
    'button:has-text("remove")',
    '[role="button"]:has-text("unsubscribe")',
  ];

  for (const selector of genericSelectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        await element.click();
        console.log(`Clicked element matching: ${selector}`);
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

async function checkForSuccessText(page: Page, patterns: Pattern[]): Promise<string | null> {
  const content = await page.content();
  const lowerContent = content.toLowerCase();

  // Check custom patterns
  for (const pattern of patterns) {
    if (lowerContent.includes(pattern.selector.toLowerCase())) {
      await incrementPatternMatchCount(pattern.id);
      return pattern.name;
    }
  }

  // Check generic success indicators
  const successIndicators = [
    'successfully unsubscribed',
    'you have been unsubscribed',
    'unsubscribe successful',
    'you are now unsubscribed',
    'removed from our mailing list',
    'email preferences updated',
    'subscription canceled',
    'you will no longer receive',
  ];

  for (const indicator of successIndicators) {
    if (lowerContent.includes(indicator)) {
      return indicator;
    }
  }

  return null;
}

async function checkForErrorText(page: Page, patterns: Pattern[]): Promise<string | null> {
  const content = await page.content();
  const lowerContent = content.toLowerCase();

  // Check custom patterns
  for (const pattern of patterns) {
    if (lowerContent.includes(pattern.selector.toLowerCase())) {
      await incrementPatternMatchCount(pattern.id);
      return pattern.name;
    }
  }

  // Check generic error indicators
  const errorIndicators = [
    'error occurred',
    'something went wrong',
    'unable to process',
    'link has expired',
    'invalid request',
    'please try again',
  ];

  for (const indicator of errorIndicators) {
    if (lowerContent.includes(indicator)) {
      return indicator;
    }
  }

  return null;
}

function detectCaptcha(content: string): boolean {
  const captchaIndicators = [
    'g-recaptcha',
    'h-captcha',
    'cf-turnstile',
    'captcha',
    'verify you are human',
    'verify you\'re human',
  ];

  const lower = content.toLowerCase();
  return captchaIndicators.some((indicator) => lower.includes(indicator));
}

function detectLoginRequired(content: string): boolean {
  const loginIndicators = [
    'please log in',
    'please sign in',
    'login required',
    'sign in to continue',
    'authentication required',
  ];

  const lower = content.toLowerCase();
  return loginIndicators.some((indicator) => lower.includes(indicator));
}

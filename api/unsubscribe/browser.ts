// Browser-based unsubscribe automation using Playwright

import { type Browser, chromium, type Page } from "playwright";
import {
  getPatterns,
  incrementPatternMatchCount,
  type Pattern,
} from "./patterns.ts";
import { validateUnsubscribeUrl } from "./validation.ts";
import { isStorageConfigured, uploadAndCleanup } from "../storage.ts";

// Helper to extract visible text from page for logging
async function getVisiblePageText(page: Page): Promise<string> {
  try {
    return await page.evaluate(
      "document.body?.innerText?.replace(/\\\\s+/g, ' ').trim().slice(0, 500) || ''",
    );
  } catch {
    return "[Unable to extract text]";
  }
}

export interface BrowserResult {
  success: boolean;
  uncertain: boolean;
  error?: string;
  errorCategory?:
    | "timeout"
    | "no_button_found"
    | "navigation_error"
    | "form_error"
    | "captcha_detected"
    | "login_required"
    | "network_error"
    | "unknown";
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
    const wsEndpoint = Deno.env.get("PLAYWRIGHT_WS_ENDPOINT");
    if (wsEndpoint) {
      // Connect to remote Playwright server
      browser = await chromium.connect(wsEndpoint);
    } else {
      // Launch locally (for development)
      browser = await chromium.launch({
        headless,
        args: ["--disable-dev-shm-usage", "--no-sandbox"],
      });
    }
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
    screenshotsDir = "./data/screenshots",
    tracesDir = "./data/traces",
    headless = true,
  } = options;

  // Validate URL
  const validation = validateUnsubscribeUrl(url);
  if (!validation.valid) {
    return {
      success: false,
      uncertain: false,
      error: validation.error,
      errorCategory: "unknown",
    };
  }

  const sanitizedUrl = validation.sanitizedUrl!;
  const browser = await getBrowser(headless);
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });

  // Start tracing for debugging
  await context.tracing.start({ screenshots: true, snapshots: true });

  let page: Page | null = null;
  let screenshotPath: string | undefined;
  let tracePath: string | undefined;
  let result: BrowserResult | null = null;

  try {
    page = await context.newPage();
    page.setDefaultTimeout(timeout);

    // Navigate to unsubscribe page
    try {
      await page.goto(sanitizedUrl, { waitUntil: "domcontentloaded" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        uncertain: false,
        error: `Navigation failed: ${message}`,
        errorCategory: "navigation_error",
      };
    }

    // Wait for page to settle
    await page.waitForTimeout(1000);

    // Log visible page text for debugging
    const initialText = await getVisiblePageText(page);
    console.log(`[Unsubscribe] URL: ${sanitizedUrl}`);
    console.log(`[Unsubscribe] Initial page text: ${initialText}`);

    // Take initial screenshot
    screenshotPath = `${screenshotsDir}/${emailId}-initial.png`;
    await Deno.mkdir(screenshotsDir, { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Load patterns
    const buttonPatterns = await getPatterns("button_selector");
    const successPatterns = await getPatterns("success_text");
    const errorPatterns = await getPatterns("error_text");

    // Check for CAPTCHA or login wall
    const pageContent = await page.content();
    if (detectCaptcha(pageContent)) {
      result = {
        success: false,
        uncertain: false,
        error: "CAPTCHA detected",
        errorCategory: "captcha_detected",
        screenshotPath,
      };
      return result;
    }

    if (detectLoginRequired(pageContent)) {
      result = {
        success: false,
        uncertain: false,
        error: "Login required",
        errorCategory: "login_required",
        screenshotPath,
      };
      return result;
    }

    // Check if already showing success message
    const preExistingSuccess = await checkForSuccessText(page, successPatterns);
    if (preExistingSuccess) {
      result = {
        success: true,
        uncertain: false,
        matchedPattern: preExistingSuccess,
        screenshotPath,
      };
      return result;
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
      result = {
        success: false,
        uncertain: false,
        error: "No unsubscribe button found",
        errorCategory: "no_button_found",
        screenshotPath,
      };
      return result;
    }

    // Wait for navigation or content change
    await page.waitForTimeout(2000);

    // Log post-click page text for debugging
    const postClickText = await getVisiblePageText(page);
    console.log(`[Unsubscribe] Post-click page text: ${postClickText}`);

    // Take post-click screenshot
    const finalScreenshotPath = `${screenshotsDir}/${emailId}-final.png`;
    await page.screenshot({ path: finalScreenshotPath, fullPage: true });
    screenshotPath = finalScreenshotPath;

    // Check for success indicators
    const successPattern = await checkForSuccessText(page, successPatterns);
    if (successPattern) {
      result = {
        success: true,
        uncertain: false,
        matchedPattern: successPattern,
        screenshotPath,
      };
      return result;
    }

    // Check for error indicators
    const errorPattern = await checkForErrorText(page, errorPatterns);
    if (errorPattern) {
      result = {
        success: false,
        uncertain: false,
        error: `Error text detected: ${errorPattern}`,
        errorCategory: "form_error",
        screenshotPath,
      };
      return result;
    }

    // No clear indicator - mark as uncertain
    result = {
      success: false,
      uncertain: true,
      error: "No clear success or error indicator",
      matchedPattern,
      screenshotPath,
    };
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Categorize error
    let errorCategory: BrowserResult["errorCategory"] = "unknown";
    if (message.includes("timeout") || message.includes("Timeout")) {
      errorCategory = "timeout";
    } else if (message.includes("net::") || message.includes("ERR_")) {
      errorCategory = "network_error";
    }

    result = {
      success: false,
      uncertain: false,
      error: message,
      errorCategory,
      screenshotPath,
    };
    return result;
  } finally {
    // Save trace for debugging - organize by outcome
    if (page) {
      try {
        const localTracePath = `${tracesDir}/${emailId}-trace.zip`;
        await Deno.mkdir(tracesDir, { recursive: true });
        await context.tracing.stop({ path: localTracePath });

        // Upload to GCS if configured, otherwise keep local path
        if (isStorageConfigured()) {
          try {
            // Organize traces by success/failed status
            const traceSubdir = result?.success ? "success" : "failed";
            tracePath = await uploadAndCleanup(
              localTracePath,
              `traces/${traceSubdir}/${emailId}-trace.zip`,
              { contentType: "application/zip" },
            );
          } catch (uploadError) {
            console.error("Failed to upload trace to GCS:", uploadError);
            tracePath = localTracePath;
          }
        } else {
          tracePath = localTracePath;
        }

        if (tracePath) {
          console.log(`Trace saved to: ${tracePath}`);
        }
      } catch {
        // Ignore trace save errors
      }
    }

    await context.close();
  }
}

async function tryGenericButtonDetection(page: Page): Promise<boolean> {
  // First, handle multi-step forms by selecting any required reason/option
  await handleReasonSelection(page);

  // Try common button patterns
  const genericSelectors = [
    'button:has-text("unsubscribe")',
    'a:has-text("unsubscribe")',
    'input[type="submit"][value*="unsubscribe" i]',
    'button:has-text("opt out")',
    'a:has-text("opt out")',
    'button:has-text("remove")',
    '[role="button"]:has-text("unsubscribe")',
    // Submit buttons (after selecting a reason)
    'button:has-text("submit")',
    'input[type="submit"]',
    'button:has-text("confirm")',
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

// Handle multi-step unsubscribe forms that require selecting a reason
async function handleReasonSelection(page: Page): Promise<boolean> {
  // First, try to handle dropdown/select menus
  const selectSelectors = [
    'select[name*="reason" i]',
    'select[name*="why" i]',
    'select[id*="reason" i]',
    'select[id*="unsubscribe" i]',
    "select", // Generic fallback for single select on page
  ];

  for (const selector of selectSelectors) {
    try {
      const selects = await page.$$(selector);
      for (const select of selects) {
        // Get all options
        const options = await select.$$("option");
        if (options.length > 1) {
          // Select the second option (first is usually placeholder)
          // Or find one with relevant text
          for (let i = 1; i < options.length; i++) {
            const text = await options[i].textContent();
            if (text) {
              await select.selectOption({ index: i });
              console.log(`Selected dropdown option: ${text.trim()}`);
              await page.waitForTimeout(500);
              return true;
            }
          }
        }
      }
    } catch {
      continue;
    }
  }

  // Look for radio buttons related to unsubscribe reasons
  const reasonSelectors = [
    // Radio buttons with common reason-related names/labels
    'input[type="radio"][name*="reason" i]',
    'input[type="radio"][name*="why" i]',
    'input[type="radio"][name*="feedback" i]',
    // Generic radio in unsubscribe context
    'label:has-text("too many emails") input[type="radio"]',
    'label:has-text("not interested") input[type="radio"]',
    'label:has-text("no longer") input[type="radio"]',
    'label:has-text("other") input[type="radio"]',
    // Reverse selector (input before label)
    'input[type="radio"] ~ label:has-text("too many")',
    // USPS specific patterns
    'input[type="radio"][id*="reason"]',
    // Checkboxes for preferences
    'input[type="checkbox"][name*="unsubscribe" i]',
  ];

  for (const selector of reasonSelectors) {
    try {
      // Try to find and click the first matching element
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        // Click the first available option
        await elements[0].click();
        console.log(`Selected reason option: ${selector}`);
        // Wait for any form updates
        await page.waitForTimeout(500);
        return true;
      }
    } catch {
      continue;
    }
  }

  // Also try clicking on labels directly (for custom styled radio buttons)
  const labelSelectors = [
    'label:has-text("too many emails")',
    'label:has-text("not relevant")',
    'label:has-text("no longer interested")',
    'label:has-text("other")',
    // USPS might use these
    'label:has-text("I receive too many")',
    'label:has-text("content is not relevant")',
    '[data-testid*="reason"]',
  ];

  for (const selector of labelSelectors) {
    try {
      const label = await page.$(selector);
      if (label) {
        await label.click();
        console.log(`Clicked reason label: ${selector}`);
        await page.waitForTimeout(500);
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

async function checkForSuccessText(
  page: Page,
  patterns: Pattern[],
): Promise<string | null> {
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
    "✅ success",
    "email preferences updated",
    "removed from our mailing list",
    "subscription canceled",
    "success",
    "successfully unsubscribed",
    "unsubscribe successful",
    "you are now unsubscribed",
    "you have been unsubscribed",
    "you will no longer receive",
  ];

  for (const indicator of successIndicators) {
    if (lowerContent.includes(indicator)) {
      return indicator;
    }
  }

  return null;
}

async function checkForErrorText(
  page: Page,
  patterns: Pattern[],
): Promise<string | null> {
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
    "error occurred",
    "something went wrong",
    "unable to process",
    "link has expired",
    "invalid request",
    "please try again",
    "invalid token",
    "missing token",
    "token expired",
    "link is no longer valid",
    "link is invalid",
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
    "g-recaptcha",
    "h-captcha",
    "cf-turnstile",
    "captcha",
    "verify you are human",
    "verify you're human",
  ];

  const lower = content.toLowerCase();
  return captchaIndicators.some((indicator) => lower.includes(indicator));
}

function detectLoginRequired(content: string): boolean {
  const loginIndicators = [
    "please log in",
    "please sign in",
    "login required",
    "sign in to continue",
    "authentication required",
    "sign in with your",
    "log in to your account",
    "enter your password",
  ];

  // Check for known login-required domains in the content
  const loginDomains = [
    "informeddelivery.usps.com",
  ];

  const lower = content.toLowerCase();

  // Check URL patterns that indicate login is required
  if (loginDomains.some((domain) => lower.includes(domain))) {
    // USPS Informed Delivery always requires login
    return true;
  }

  return loginIndicators.some((indicator) => lower.includes(indicator));
}

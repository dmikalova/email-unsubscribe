// RFC 8058 One-Click Unsubscribe Implementation

import { validateUnsubscribeUrl } from "./validation.ts";

export interface OneClickResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  fallbackRequired?: boolean;
}

export async function performOneClickUnsubscribe(
  url: string,
): Promise<OneClickResult> {
  // Validate URL first
  const validation = validateUnsubscribeUrl(url);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      fallbackRequired: false,
    };
  }

  const sanitizedUrl = validation.sanitizedUrl!;

  try {
    // RFC 8058 specifies a POST request with specific body
    const response = await fetch(sanitizedUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "List-Unsubscribe=One-Click",
      redirect: "follow",
    });

    if (response.ok) {
      console.log("One-click unsubscribe successful");
      return {
        success: true,
        statusCode: response.status,
      };
    }

    // Non-2xx response - may need fallback to browser
    return {
      success: false,
      statusCode: response.status,
      error: `HTTP ${response.status}: ${response.statusText}`,
      fallbackRequired: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return {
      success: false,
      error: message,
      fallbackRequired: true,
    };
  }
}

export function isOneClickSupported(
  listUnsubscribePost: boolean,
  httpUrls: string[],
): boolean {
  // One-click requires:
  // 1. List-Unsubscribe-Post header with "List-Unsubscribe=One-Click"
  // 2. At least one HTTP/HTTPS URL in List-Unsubscribe
  return listUnsubscribePost && httpUrls.length > 0;
}

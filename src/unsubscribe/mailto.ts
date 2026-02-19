// Mailto Unsubscribe Implementation

import { sendEmail } from "../gmail/index.ts";
import { parseMailtoUrl, validateMailtoUrl } from "./validation.ts";

export interface MailtoResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function performMailtoUnsubscribe(
  userId: string,
  mailtoUrl: string,
): Promise<MailtoResult> {
  // Validate mailto URL
  const validation = validateMailtoUrl(mailtoUrl);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  // Parse mailto URL
  const parsed = parseMailtoUrl(mailtoUrl);
  if (!parsed) {
    return {
      success: false,
      error: "Failed to parse mailto URL",
    };
  }

  try {
    // Send unsubscribe email
    const result = await sendEmail(
      userId,
      parsed.to,
      parsed.subject || "Unsubscribe",
      parsed.body || "Please unsubscribe me from this mailing list.",
    );

    console.log(
      `Mailto unsubscribe sent to ${parsed.to}, message ID: ${result.id}`,
    );

    return {
      success: true,
      messageId: result.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Mailto unsubscribe error for ${parsed.to}:`, message);

    return {
      success: false,
      error: message,
    };
  }
}

export function hasMailtoOption(mailtoUrl: string | null): boolean {
  return mailtoUrl !== null && mailtoUrl.startsWith("mailto:");
}

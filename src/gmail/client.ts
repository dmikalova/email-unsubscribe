// Gmail API Client Wrapper

import { getValidAccessToken } from "./tokens.ts";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: GmailMessagePayload;
  internalDate?: string;
}

export interface GmailMessagePayload {
  headers?: GmailHeader[];
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailMessagePayload[];
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type?: string;
}

export interface ListMessagesResponse {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

// Rate limiting state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // ms between requests

async function rateLimitedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
  return fetch(url, options);
}

async function gmailFetch(
  userId: string,
  endpoint: string,
  options: RequestInit = {},
  retries = 3,
): Promise<Response> {
  const accessToken = await getValidAccessToken(userId);

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await rateLimitedFetch(
        `${GMAIL_API_BASE}${endpoint}`,
        fetchOptions,
      );

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "5");
        console.log(`Rate limited, waiting ${retryAfter} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      // Handle server errors with retry
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries - 1) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Request failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Request failed after retries");
}

// Messages API

export async function listMessages(
  userId: string,
  query?: string,
  maxResults = 100,
  pageToken?: string,
): Promise<ListMessagesResponse> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (maxResults) params.set("maxResults", maxResults.toString());
  if (pageToken) params.set("pageToken", pageToken);

  const response = await gmailFetch(userId, `/messages?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to list messages: ${await response.text()}`);
  }

  return response.json();
}

export async function getMessage(
  userId: string,
  messageId: string,
  format: "full" | "metadata" | "minimal" = "metadata",
): Promise<GmailMessage> {
  const response = await gmailFetch(
    userId,
    `/messages/${messageId}?format=${format}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to get message: ${await response.text()}`);
  }

  return response.json();
}

export async function batchGetMessages(
  userId: string,
  messageIds: string[],
  format: "full" | "metadata" | "minimal" = "metadata",
): Promise<GmailMessage[]> {
  // Gmail API doesn't have native batch for individual messages
  // We'll use parallel requests with rate limiting
  const batchSize = 10;
  const results: GmailMessage[] = [];

  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((id) => getMessage(userId, id, format)),
    );
    results.push(...batchResults);
  }

  return results;
}

// Labels API

export async function listLabels(userId: string): Promise<GmailLabel[]> {
  const response = await gmailFetch(userId, "/labels");

  if (!response.ok) {
    throw new Error(`Failed to list labels: ${await response.text()}`);
  }

  const data = await response.json();
  return data.labels || [];
}

export async function createLabel(
  userId: string,
  name: string,
): Promise<GmailLabel> {
  const response = await gmailFetch(userId, "/labels", {
    method: "POST",
    body: JSON.stringify({
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create label: ${await response.text()}`);
  }

  return response.json();
}

export async function getOrCreateLabel(
  userId: string,
  name: string,
): Promise<GmailLabel> {
  const labels = await listLabels(userId);
  const existing = labels.find((l) => l.name === name);

  if (existing) {
    return existing;
  }

  return createLabel(userId, name);
}

export async function modifyMessageLabels(
  userId: string,
  messageId: string,
  addLabelIds: string[] = [],
  removeLabelIds: string[] = [],
): Promise<void> {
  const response = await gmailFetch(userId, `/messages/${messageId}/modify`, {
    method: "POST",
    body: JSON.stringify({ addLabelIds, removeLabelIds }),
  });

  if (!response.ok) {
    throw new Error(`Failed to modify labels: ${await response.text()}`);
  }
}

export async function archiveMessage(
  userId: string,
  messageId: string,
): Promise<void> {
  // Archiving is done by removing the INBOX label
  await modifyMessageLabels(userId, messageId, [], ["INBOX"]);
}

// Send API (for mailto unsubscribe)

export async function sendEmail(
  userId: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ id: string }> {
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");

  const encodedMessage = btoa(message).replace(/\+/g, "-").replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await gmailFetch(userId, "/messages/send", {
    method: "POST",
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send email: ${await response.text()}`);
  }

  return response.json();
}

// History API (for incremental sync)

export interface HistoryResponse {
  history?: {
    id: string;
    messagesAdded?: { message: { id: string; threadId: string } }[];
  }[];
  historyId: string;
  nextPageToken?: string;
}

export async function getHistory(
  userId: string,
  startHistoryId: string,
  pageToken?: string,
): Promise<HistoryResponse> {
  const params = new URLSearchParams({
    startHistoryId,
    historyTypes: "messageAdded",
  });
  if (pageToken) params.set("pageToken", pageToken);

  const response = await gmailFetch(userId, `/history?${params.toString()}`);

  if (!response.ok) {
    // 404 means history is too old, need full sync
    if (response.status === 404) {
      throw new Error("History too old, full sync required");
    }
    throw new Error(`Failed to get history: ${await response.text()}`);
  }

  return response.json();
}

// Profile API (for getting current history ID)

export async function getProfile(
  userId: string,
): Promise<{ emailAddress: string; historyId: string }> {
  const response = await gmailFetch(userId, "/profile");

  if (!response.ok) {
    throw new Error(`Failed to get profile: ${await response.text()}`);
  }

  return response.json();
}

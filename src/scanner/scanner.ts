// Main email scanner

import {
  listMessages,
  getMessage,
  batchGetMessages,
  getHistory,
  getProfile,
  type GmailMessage,
} from '../gmail/index.ts';
import {
  parseListUnsubscribeHeader,
  getSender,
  extractDomain,
  type UnsubscribeInfo,
} from './headers.ts';
import { extractUnsubscribeLinksFromHtml, getHtmlBodyFromPayload } from './html.ts';
import {
  getScanState,
  updateScanState,
  incrementScanStats,
  isEmailProcessed,
  markEmailProcessed,
  getProcessedEmailIds,
} from './state.ts';
import { isAllowed } from './allowlist.ts';
import { trackSender } from './tracking.ts';

const INITIAL_BACKLOG_LIMIT = 1000;
const BATCH_SIZE = 50;

// Mutex for preventing concurrent scans
let scanInProgress = false;

export interface ScannedEmail {
  id: string;
  sender: string;
  senderDomain: string;
  subject: string | null;
  date: Date | null;
  unsubscribeInfo: UnsubscribeInfo;
  htmlLinks: { url: string; text: string; confidence: number }[];
  isAllowed: boolean;
  alreadyProcessed: boolean;
}

export interface ScanResult {
  scanned: number;
  processed: number;
  skipped: number;
  errors: number;
  emails: ScannedEmail[];
}

export async function scanEmails(limit?: number): Promise<ScanResult> {
  if (scanInProgress) {
    throw new Error('Scan already in progress');
  }

  scanInProgress = true;

  try {
    const state = await getScanState();

    // If initial backlog is not complete, do initial scan
    if (!state.isInitialBacklogComplete) {
      return await performInitialScan(limit ?? INITIAL_BACKLOG_LIMIT);
    }

    // Otherwise, do incremental scan using history API
    return await performIncrementalScan(state.lastHistoryId);
  } finally {
    scanInProgress = false;
  }
}

async function performInitialScan(limit: number): Promise<ScanResult> {
  console.log(`Starting initial scan (limit: ${limit})`);

  const result: ScanResult = {
    scanned: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    emails: [],
  };

  let pageToken: string | undefined;
  let remaining = limit;

  while (remaining > 0) {
    const batchSize = Math.min(remaining, BATCH_SIZE);

    // List messages
    const listResponse = await listMessages(undefined, batchSize, pageToken);

    if (!listResponse.messages || listResponse.messages.length === 0) {
      break;
    }

    // Get message IDs
    const messageIds = listResponse.messages.map((m) => m.id);

    // Check which are already processed
    const processedIds = await getProcessedEmailIds(messageIds);

    // Filter out already processed
    const newMessageIds = messageIds.filter((id) => !processedIds.has(id));

    if (newMessageIds.length > 0) {
      // Fetch full messages
      const messages = await batchGetMessages(newMessageIds, 'full');

      // Process each message
      for (const message of messages) {
        try {
          const scanned = await processMessage(message);
          if (scanned) {
            result.emails.push(scanned);
            if (!scanned.isAllowed && !scanned.alreadyProcessed) {
              result.processed++;
            } else {
              result.skipped++;
            }
          }
          result.scanned++;
        } catch (error) {
          console.error(`Error processing message ${message.id}:`, error);
          result.errors++;
        }
      }
    }

    result.skipped += processedIds.size;
    result.scanned += processedIds.size;
    remaining -= listResponse.messages.length;

    // Update scan state
    const lastEmailId = listResponse.messages[listResponse.messages.length - 1].id;
    await updateScanState({ lastEmailId });

    // Check for more pages
    if (!listResponse.nextPageToken) {
      // No more pages, mark initial scan complete
      const profile = await getProfile();
      await updateScanState({
        isInitialBacklogComplete: true,
        lastHistoryId: profile.historyId,
      });
      break;
    }

    pageToken = listResponse.nextPageToken;
  }

  await incrementScanStats(result.scanned, result.processed);
  console.log(
    `Initial scan complete: ${result.scanned} scanned, ${result.processed} to process, ${result.skipped} skipped`,
  );

  return result;
}

async function performIncrementalScan(lastHistoryId: string | null): Promise<ScanResult> {
  if (!lastHistoryId) {
    throw new Error('No history ID available for incremental scan');
  }

  console.log(`Starting incremental scan from history ID: ${lastHistoryId}`);

  const result: ScanResult = {
    scanned: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    emails: [],
  };

  try {
    let pageToken: string | undefined;
    let newHistoryId = lastHistoryId;

    while (true) {
      const historyResponse = await getHistory(lastHistoryId, pageToken);
      newHistoryId = historyResponse.historyId;

      if (historyResponse.history) {
        for (const historyItem of historyResponse.history) {
          if (historyItem.messagesAdded) {
            for (const added of historyItem.messagesAdded) {
              try {
                // Check if already processed
                if (await isEmailProcessed(added.message.id)) {
                  result.skipped++;
                  result.scanned++;
                  continue;
                }

                // Fetch and process
                const message = await getMessage(added.message.id, 'full');
                const scanned = await processMessage(message);

                if (scanned) {
                  result.emails.push(scanned);
                  if (!scanned.isAllowed && !scanned.alreadyProcessed) {
                    result.processed++;
                  } else {
                    result.skipped++;
                  }
                }
                result.scanned++;
              } catch (error) {
                console.error(`Error processing message ${added.message.id}:`, error);
                result.errors++;
              }
            }
          }
        }
      }

      if (!historyResponse.nextPageToken) {
        break;
      }
      pageToken = historyResponse.nextPageToken;
    }

    // Update history ID
    await updateScanState({ lastHistoryId: newHistoryId, lastScanAt: new Date() });
    await incrementScanStats(result.scanned, result.processed);

    console.log(
      `Incremental scan complete: ${result.scanned} scanned, ${result.processed} to process`,
    );
    return result;
  } catch (error) {
    // If history is too old, need to do full scan
    if (error instanceof Error && error.message.includes('full sync required')) {
      console.log('History too old, switching to full scan');
      await updateScanState({ isInitialBacklogComplete: false, lastHistoryId: null });
      return await performInitialScan(INITIAL_BACKLOG_LIMIT);
    }
    throw error;
  }
}

async function processMessage(message: GmailMessage): Promise<ScannedEmail | null> {
  const headers = message.payload?.headers || [];
  const sender = getSender(headers);

  if (!sender) {
    console.log(`Skipping message ${message.id}: no sender`);
    return null;
  }

  // Track sender (for ineffective unsubscribe detection)
  await trackSender(sender);

  // Check allow list
  const allowed = await isAllowed(sender);

  // Parse unsubscribe info from headers
  const unsubscribeInfo = parseListUnsubscribeHeader(headers);

  // Extract links from HTML body
  let htmlLinks: { url: string; text: string; confidence: number }[] = [];
  if (message.payload) {
    const html = getHtmlBodyFromPayload(message.payload);
    if (html) {
      htmlLinks = extractUnsubscribeLinksFromHtml(html);
    }
  }

  // Get subject and date
  const subjectHeader = headers.find((h) => h.name.toLowerCase() === 'subject');
  const dateHeader = headers.find((h) => h.name.toLowerCase() === 'date');

  return {
    id: message.id,
    sender,
    senderDomain: extractDomain(sender),
    subject: subjectHeader?.value ?? null,
    date: dateHeader ? new Date(dateHeader.value) : null,
    unsubscribeInfo,
    htmlLinks,
    isAllowed: allowed,
    alreadyProcessed: false,
  };
}

export function isScanInProgress(): boolean {
  return scanInProgress;
}

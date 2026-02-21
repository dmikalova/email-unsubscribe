// Gmail Label Management

import {
  archiveMessage,
  deleteLabel,
  getOrCreateLabel,
  listLabels,
  listMessagesWithLabel,
  modifyMessageLabels,
} from "./client.ts";

// Parent label that contains all sub-labels
const PARENT_LABEL = "Unsubscribed";

export const LABEL_NAMES = {
  SUCCESS: `${PARENT_LABEL}/Success`,
  FAILED: `${PARENT_LABEL}/Failed`,
  PENDING: `${PARENT_LABEL}/Pending`,
} as const;

// Per-user label cache: userId -> (labelName -> labelId)
const userLabelCache: Map<string, Map<string, string>> = new Map();

export async function initializeLabels(userId: string): Promise<void> {
  const cache = new Map<string, string>();

  // First, migrate any old flat labels to properly nested ones
  await migrateOldLabels(userId);

  // Create parent label first (required for proper nesting)
  await getOrCreateLabel(userId, PARENT_LABEL);

  // Then create child labels - they will nest under parent
  for (const name of Object.values(LABEL_NAMES)) {
    const label = await getOrCreateLabel(userId, name);
    cache.set(name, label.id);
  }

  userLabelCache.set(userId, cache);
  console.log(`[Labels] Initialized for user ${userId}`);
}

// Migrate old flat labels (created before parent existed) to properly nested ones
async function migrateOldLabels(userId: string): Promise<void> {
  const labels = await listLabels(userId);
  const parent = labels.find((l) => l.name === PARENT_LABEL);

  // If parent exists, labels should already be nested
  if (parent) return;

  // Check if we have any old flat labels that need migration
  const flatLabels = labels.filter(
    (l) => l.name.startsWith(`${PARENT_LABEL}/`) && l.type === "user",
  );

  if (flatLabels.length === 0) return;

  console.log(`[Labels] Found ${flatLabels.length} flat labels to migrate`);

  // Create parent first - this is required for nesting
  await getOrCreateLabel(userId, PARENT_LABEL);

  // For each flat label, we need to recreate it so Gmail recognizes the parent
  for (const flatLabel of flatLabels) {
    const messages = await listMessagesWithLabel(userId, flatLabel.id);
    if (messages.length > 0) {
      console.log(
        `[Labels] Migrating "${flatLabel.name}" with ${messages.length} messages`,
      );

      // Delete old flat label
      await deleteLabel(userId, flatLabel.id);

      // Create new label (will properly nest under parent)
      const newLabel = await getOrCreateLabel(userId, flatLabel.name);

      // Re-apply label to all messages
      for (const msg of messages) {
        await modifyMessageLabels(userId, msg.id, [newLabel.id], []);
      }

      console.log(`[Labels] Migrated "${flatLabel.name}"`);
    } else {
      // No messages, just delete and recreate
      await deleteLabel(userId, flatLabel.id);
      console.log(`[Labels] Recreated empty label "${flatLabel.name}"`);
    }
  }
}

export async function getLabelId(
  userId: string,
  name: string,
): Promise<string> {
  let cache = userLabelCache.get(userId);
  if (!cache) {
    await initializeLabels(userId);
    cache = userLabelCache.get(userId);
  }

  const id = cache!.get(name);
  if (!id) {
    throw new Error(`Label not found: ${name}`);
  }

  return id;
}

export async function labelMessageAsSuccess(
  userId: string,
  messageId: string,
): Promise<void> {
  const labelId = await getLabelId(userId, LABEL_NAMES.SUCCESS);
  const failedLabelId = await getLabelId(userId, LABEL_NAMES.FAILED);
  const pendingLabelId = await getLabelId(userId, LABEL_NAMES.PENDING);

  await modifyMessageLabels(userId, messageId, [labelId], [
    failedLabelId,
    pendingLabelId,
  ]);
}

export async function labelMessageAsFailed(
  userId: string,
  messageId: string,
): Promise<void> {
  const labelId = await getLabelId(userId, LABEL_NAMES.FAILED);
  const successLabelId = await getLabelId(userId, LABEL_NAMES.SUCCESS);
  const pendingLabelId = await getLabelId(userId, LABEL_NAMES.PENDING);

  await modifyMessageLabels(userId, messageId, [labelId], [
    successLabelId,
    pendingLabelId,
  ]);
}

export async function labelMessageAsPending(
  userId: string,
  messageId: string,
): Promise<void> {
  const labelId = await getLabelId(userId, LABEL_NAMES.PENDING);
  await modifyMessageLabels(userId, messageId, [labelId], []);
}

export async function archiveAndLabelSuccess(
  userId: string,
  messageId: string,
): Promise<void> {
  await labelMessageAsSuccess(userId, messageId);
  await archiveMessage(userId, messageId);
}

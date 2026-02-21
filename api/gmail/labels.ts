// Gmail Label Management

import { archiveMessage, getOrCreateLabel, modifyMessageLabels } from './client.ts';

// Parent label that contains all sub-labels
const PARENT_LABEL = 'Unsubscribed';

export const LABEL_NAMES = {
  SUCCESS: `${PARENT_LABEL}/Success`,
  FAILED: `${PARENT_LABEL}/Failed`,
  PENDING: `${PARENT_LABEL}/Pending`,
} as const;

// Per-user label cache: userId -> (labelName -> labelId)
const userLabelCache: Map<string, Map<string, string>> = new Map();

export async function initializeLabels(userId: string): Promise<void> {
  const cache = new Map<string, string>();

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

export async function getLabelId(userId: string, name: string): Promise<string> {
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

export async function labelMessageAsSuccess(userId: string, messageId: string): Promise<void> {
  const labelId = await getLabelId(userId, LABEL_NAMES.SUCCESS);
  const failedLabelId = await getLabelId(userId, LABEL_NAMES.FAILED);
  const pendingLabelId = await getLabelId(userId, LABEL_NAMES.PENDING);

  await modifyMessageLabels(userId, messageId, [labelId], [failedLabelId, pendingLabelId]);
}

export async function labelMessageAsFailed(userId: string, messageId: string): Promise<void> {
  const labelId = await getLabelId(userId, LABEL_NAMES.FAILED);
  const successLabelId = await getLabelId(userId, LABEL_NAMES.SUCCESS);
  const pendingLabelId = await getLabelId(userId, LABEL_NAMES.PENDING);

  await modifyMessageLabels(userId, messageId, [labelId], [successLabelId, pendingLabelId]);
}

export async function labelMessageAsPending(userId: string, messageId: string): Promise<void> {
  const labelId = await getLabelId(userId, LABEL_NAMES.PENDING);
  await modifyMessageLabels(userId, messageId, [labelId], []);
}

export async function archiveAndLabelSuccess(userId: string, messageId: string): Promise<void> {
  await labelMessageAsSuccess(userId, messageId);
  await archiveMessage(userId, messageId);
}

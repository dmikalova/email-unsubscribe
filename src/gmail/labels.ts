// Gmail Label Management

import { getOrCreateLabel, modifyMessageLabels, archiveMessage, type GmailLabel } from './client.ts';

export const LABEL_NAMES = {
  SUCCESS: 'Unsubscribed/Success',
  FAILED: 'Unsubscribed/Failed',
  PENDING: 'Unsubscribed/Pending',
} as const;

let labelCache: Map<string, string> | null = null;

export async function initializeLabels(): Promise<void> {
  labelCache = new Map();

  for (const name of Object.values(LABEL_NAMES)) {
    const label = await getOrCreateLabel(name);
    labelCache.set(name, label.id);
  }

  console.log('Gmail labels initialized');
}

export async function getLabelId(name: string): Promise<string> {
  if (!labelCache) {
    await initializeLabels();
  }

  const id = labelCache!.get(name);
  if (!id) {
    throw new Error(`Label not found: ${name}`);
  }

  return id;
}

export async function labelMessageAsSuccess(messageId: string): Promise<void> {
  const labelId = await getLabelId(LABEL_NAMES.SUCCESS);
  const failedLabelId = await getLabelId(LABEL_NAMES.FAILED);
  const pendingLabelId = await getLabelId(LABEL_NAMES.PENDING);

  await modifyMessageLabels(messageId, [labelId], [failedLabelId, pendingLabelId]);
}

export async function labelMessageAsFailed(messageId: string): Promise<void> {
  const labelId = await getLabelId(LABEL_NAMES.FAILED);
  const successLabelId = await getLabelId(LABEL_NAMES.SUCCESS);
  const pendingLabelId = await getLabelId(LABEL_NAMES.PENDING);

  await modifyMessageLabels(messageId, [labelId], [successLabelId, pendingLabelId]);
}

export async function labelMessageAsPending(messageId: string): Promise<void> {
  const labelId = await getLabelId(LABEL_NAMES.PENDING);
  await modifyMessageLabels(messageId, [labelId], []);
}

export async function archiveAndLabelSuccess(messageId: string): Promise<void> {
  await labelMessageAsSuccess(messageId);
  await archiveMessage(messageId);
}

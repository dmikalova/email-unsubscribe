// Gmail module exports

export { getOAuthConfig, getAuthorizationUrl, exchangeCodeForTokens, refreshAccessToken } from './oauth.ts';
export { encrypt, decrypt } from './encryption.ts';
export { storeTokens, getTokens, getValidAccessToken, deleteTokens, hasValidTokens } from './tokens.ts';
export {
  listMessages,
  getMessage,
  batchGetMessages,
  listLabels,
  createLabel,
  getOrCreateLabel,
  modifyMessageLabels,
  archiveMessage,
  sendEmail,
  getHistory,
  getProfile,
  type GmailMessage,
  type GmailMessagePayload,
  type GmailHeader,
  type GmailLabel,
  type ListMessagesResponse,
  type HistoryResponse,
} from './client.ts';
export {
  LABEL_NAMES,
  initializeLabels,
  getLabelId,
  labelMessageAsSuccess,
  labelMessageAsFailed,
  labelMessageAsPending,
  archiveAndLabelSuccess,
} from './labels.ts';

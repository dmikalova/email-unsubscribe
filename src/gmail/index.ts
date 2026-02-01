// Gmail module exports

export {
  archiveMessage,
  batchGetMessages,
  createLabel,
  getHistory,
  getMessage,
  getOrCreateLabel,
  getProfile,
  listLabels,
  listMessages,
  modifyMessageLabels,
  sendEmail,
  type GmailHeader,
  type GmailLabel,
  type GmailMessage,
  type GmailMessagePayload,
  type HistoryResponse,
  type ListMessagesResponse,
} from './client.ts';
export { decrypt, encrypt } from './encryption.ts';
export {
  archiveAndLabelSuccess,
  getLabelId,
  initializeLabels,
  LABEL_NAMES,
  labelMessageAsFailed,
  labelMessageAsPending,
  labelMessageAsSuccess,
} from './labels.ts';
export {
  exchangeCodeForTokens,
  getAuthorizationUrl,
  getOAuthConfig,
  refreshAccessToken,
} from './oauth.ts';
export {
  deleteTokens,
  getTokens,
  getValidAccessToken,
  hasValidTokens,
  storeTokens,
} from './tokens.ts';

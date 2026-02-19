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
  LABEL_NAMES,
  archiveAndLabelSuccess,
  getLabelId,
  initializeLabels,
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
  checkTokenHealth,
  deleteTokens,
  getTokens,
  getValidAccessToken,
  hasValidTokens,
  storeTokens,
  type TokenHealth,
} from './tokens.ts';

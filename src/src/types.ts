// API Types

export interface Stats {
  total: number;
  success: number;
  failed: number;
  uncertain: number;
  pending: number;
  successRate: number;
}

export interface ActivityItem {
  id: string;
  sender: string;
  senderDomain: string;
  method: string;
  status: "success" | "failed" | "uncertain" | "pending";
  attemptedAt: string;
  failureReason?: string;
  failureDetails?: string;
  retryCount: number;
  screenshotPath?: string;
  tracePath?: string;
}

export interface AllowListEntry {
  id: string;
  type: "email" | "domain";
  value: string;
  notes?: string;
}

export interface DomainStats {
  domain: string;
  attemptCount: number;
  successCount: number;
  failedCount: number;
  lastAttemptAt?: string;
  flaggedIneffective: boolean;
  emailsAfterUnsubscribe: number;
}

export interface Pattern {
  id: string;
  name: string;
  type: string;
  selector: string;
  matchCount: number;
}

export interface GmailStatus {
  authorized: boolean;
  connectedEmail: string | null;
}

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
}

import type { StannpRecipient } from "@/lib/stannp";

export type LetterStatus =
  | "awaiting_confirmation"
  | "awaiting_approval"
  | "queued"
  | "sending"
  | "sent"
  | "dispatched"
  | "returned"
  | "failed"
  | "rejected"
  | "expired";

export type RecipientType = "mp" | "minister";

export type Letter = {
  id: string;
  status: LetterStatus;
  recipientType: RecipientType;
  recipientKey: string;
  recipientName: string;
  recipientAddress: StannpRecipient;
  onsCode: string;
  constituencyName: string;
  sector: string;
  senderName: string;
  senderRole: string;
  businessName: string;
  businessAddress: string;
  email: string;
  letterText: string;
  pdfSha256: string;
  pdfPath: string;
  flags: string[];
  confirmTokenHash: string;
  confirmExpiresAt: string;
  confirmedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  sentAt: string | null;
  stannpId: number | null;
  stannpTest: boolean | null;
  stannpCostPence: number | null;
  stannpPdfUrl: string | null;
  stannpStatus: string | null;
  failureReason: string | null;
  anonymisedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewLetter = Omit<
  Letter,
  | "id"
  | "status"
  | "confirmedAt"
  | "approvedAt"
  | "approvedBy"
  | "rejectedAt"
  | "rejectedBy"
  | "rejectionReason"
  | "sentAt"
  | "stannpId"
  | "stannpTest"
  | "stannpCostPence"
  | "stannpPdfUrl"
  | "stannpStatus"
  | "failureReason"
  | "anonymisedAt"
  | "createdAt"
  | "updatedAt"
  | "pdfPath"
>;

export type Settings = {
  autoSend: boolean;
  livePosting: boolean;
  dailyCap: number | null;
  totalBudgetPence: number | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type AuditEntry = {
  id: number;
  actor: string;
  action: string;
  target: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

export type LetterFilter = { status?: LetterStatus; recipientType?: RecipientType; sector?: string };

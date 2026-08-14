import type { Types } from 'mongoose';

export interface SessionMetadata {
  userAgent: string | null;
  ipAddress: string | null;
}

export interface CreatedRefreshSession {
  rawToken: string;
  publicId: string;
  familyId: string;
  userId: Types.ObjectId;
  expiresAt: Date;
}

export interface RotatedRefreshSession {
  rawToken: string;
  userId: Types.ObjectId;
  expiresAt: Date;
}
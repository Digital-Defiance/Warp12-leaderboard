import { doc, setDoc } from 'firebase/firestore';

import { FIRESTORE_COLLECTIONS, getFirestoreDb } from './config.js';
import type { PublishMatchLogInput, PublishedLogDocument } from './schema.js';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function randomSuffix(length = 4): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + length);
}

export function buildShareSlug(input: PublishMatchLogInput): string {
  const sector = input.sectorCode ? slugify(input.sectorCode) : 'sector';
  return `${sector}-r${input.roundNumber}-${randomSuffix()}`;
}

export function buildPublishedLogDocument(
  logId: string,
  input: PublishMatchLogInput
): PublishedLogDocument {
  const publishedAt = new Date().toISOString();
  return {
    id: logId,
    authorId: input.authorId,
    authorDisplayName: input.authorDisplayName,
    publishedAt,
    visibility: input.visibility ?? 'public',
    shareSlug: buildShareSlug(input),
    roundNumber: input.roundNumber,
    sectorCode: input.sectorCode,
    exportedAt: input.exportedAt,
    roundStartedAtMs: input.roundStartedAtMs,
    lines: [...input.lines],
    summary: input.summary,
  };
}

export async function publishMatchLog(
  input: PublishMatchLogInput
): Promise<PublishedLogDocument> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firebase is not configured');
  }

  const logId = crypto.randomUUID();
  const document = buildPublishedLogDocument(logId, input);
  await setDoc(doc(db, FIRESTORE_COLLECTIONS.publishedLogs, logId), document);
  return document;
}

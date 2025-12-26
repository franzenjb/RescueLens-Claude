/**
 * Transcript Storage Service
 *
 * Persists voice bot call transcripts to IndexedDB for later evaluation
 * by the Critic agent and historical analysis.
 */

import { openDB, IDBPDatabase } from 'idb';

// Types
export interface StoredTranscript {
  callId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // seconds
  transcript: TranscriptMessage[];
  callerData: CallerData;
  evaluated: boolean;
  evaluationId?: string;
  evaluationScore?: number;
  createdAt: number;
}

export interface TranscriptMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface CallerData {
  callId: string;
  startTime: Date;
  endTime?: Date;
  callerName?: string;
  location?: string;
  zipCode?: string;
  disasterType?: string;
  householdSize?: number;
  childrenUnder18?: number;
  adults65Plus?: number;
  hasMedicalNeeds?: boolean;
  hasPets?: boolean;
  petCount?: number;
  needs: string[];
  shelterReferred?: string;
  callOutcome?: 'resolved' | 'referred' | 'callback_needed';
  language: string;
}

// Database setup
const DB_NAME = 'rescuelens-transcripts';
const DB_VERSION = 1;
const STORE_NAME = 'transcripts';

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create transcripts store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'callId' });
        store.createIndex('by-date', 'createdAt');
        store.createIndex('by-evaluated', 'evaluated');
        store.createIndex('by-score', 'evaluationScore');
      }
    },
  });

  return dbInstance;
}

/**
 * Save a call transcript
 */
export async function saveTranscript(
  callId: string,
  transcript: TranscriptMessage[],
  callerData: CallerData
): Promise<void> {
  const db = await getDB();

  const storedTranscript: StoredTranscript = {
    callId,
    startTime: callerData.startTime,
    endTime: callerData.endTime,
    duration: callerData.endTime
      ? Math.floor((callerData.endTime.getTime() - callerData.startTime.getTime()) / 1000)
      : undefined,
    transcript,
    callerData,
    evaluated: false,
    createdAt: Date.now(),
  };

  await db.put(STORE_NAME, storedTranscript);
  console.log(`Transcript saved: ${callId}`);
}

/**
 * Get a transcript by call ID
 */
export async function getTranscript(callId: string): Promise<StoredTranscript | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, callId);
}

/**
 * Get all transcripts (most recent first)
 */
export async function getAllTranscripts(): Promise<StoredTranscript[]> {
  const db = await getDB();
  const transcripts = await db.getAllFromIndex(STORE_NAME, 'by-date');
  return transcripts.reverse(); // Most recent first
}

/**
 * Get transcripts that haven't been evaluated yet
 */
export async function getUnevaluatedTranscripts(): Promise<StoredTranscript[]> {
  const db = await getDB();
  const allTranscripts = await db.getAllFromIndex(STORE_NAME, 'by-evaluated');
  return allTranscripts.filter(t => !t.evaluated);
}

/**
 * Mark a transcript as evaluated
 */
export async function markAsEvaluated(
  callId: string,
  evaluationId: string,
  score: number
): Promise<void> {
  const db = await getDB();
  const transcript = await db.get(STORE_NAME, callId);

  if (transcript) {
    transcript.evaluated = true;
    transcript.evaluationId = evaluationId;
    transcript.evaluationScore = score;
    await db.put(STORE_NAME, transcript);
    console.log(`Transcript marked as evaluated: ${callId} (Score: ${score})`);
  }
}

/**
 * Delete a transcript
 */
export async function deleteTranscript(callId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, callId);
  console.log(`Transcript deleted: ${callId}`);
}

/**
 * Get transcript statistics
 */
export async function getTranscriptStats(): Promise<{
  total: number;
  evaluated: number;
  unevaluated: number;
  averageScore: number;
  averageDuration: number;
}> {
  const transcripts = await getAllTranscripts();

  const evaluated = transcripts.filter(t => t.evaluated);
  const scores = evaluated.map(t => t.evaluationScore || 0).filter(s => s > 0);
  const durations = transcripts.map(t => t.duration || 0).filter(d => d > 0);

  return {
    total: transcripts.length,
    evaluated: evaluated.length,
    unevaluated: transcripts.length - evaluated.length,
    averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    averageDuration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
  };
}

/**
 * Clear all transcripts (for testing)
 */
export async function clearAllTranscripts(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
  console.log('All transcripts cleared');
}

/**
 * Export all transcripts as JSON
 */
export async function exportAllTranscripts(): Promise<void> {
  const transcripts = await getAllTranscripts();

  const blob = new Blob([JSON.stringify(transcripts, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `all-transcripts-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

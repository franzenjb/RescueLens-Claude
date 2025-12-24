import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { DamageReport, AppSettings } from '../types';

const DB_NAME = 'RescueLensDB';
const DB_VERSION = 1;

interface RescueLensDB extends DBSchema {
  reports: {
    key: string;
    value: DamageReport;
    indexes: {
      'by-date': number;
      'by-status': string;
      'by-severity': string;
    };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

let dbInstance: IDBPDatabase<RescueLensDB> | null = null;

async function getDB(): Promise<IDBPDatabase<RescueLensDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<RescueLensDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Reports store
      if (!db.objectStoreNames.contains('reports')) {
        const reportStore = db.createObjectStore('reports', { keyPath: 'id' });
        reportStore.createIndex('by-date', 'createdAt');
        reportStore.createIndex('by-status', 'status');
        reportStore.createIndex('by-severity', 'analysis.overallSeverity');
      }
      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

// ============ REPORTS CRUD ============

export async function createReport(report: DamageReport): Promise<DamageReport> {
  const db = await getDB();
  const now = Date.now();
  const newReport: DamageReport = {
    ...report,
    id: report.id || `RPT_${now}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    createdAt: now,
    updatedAt: now,
  };
  await db.put('reports', newReport);
  return newReport;
}

export async function getReport(id: string): Promise<DamageReport | undefined> {
  const db = await getDB();
  return db.get('reports', id);
}

export async function getAllReports(): Promise<DamageReport[]> {
  const db = await getDB();
  const reports = await db.getAllFromIndex('reports', 'by-date');
  return reports.reverse(); // Most recent first
}

export async function updateReport(id: string, updates: Partial<DamageReport>): Promise<DamageReport | null> {
  const db = await getDB();
  const existing = await db.get('reports', id);
  if (!existing) return null;

  const updated: DamageReport = {
    ...existing,
    ...updates,
    id: existing.id, // Ensure ID doesn't change
    createdAt: existing.createdAt, // Preserve original creation time
    updatedAt: Date.now(),
  };
  await db.put('reports', updated);
  return updated;
}

export async function deleteReport(id: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.get('reports', id);
  if (!existing) return false;
  await db.delete('reports', id);
  return true;
}

export async function getReportsByStatus(status: DamageReport['status']): Promise<DamageReport[]> {
  const db = await getDB();
  return db.getAllFromIndex('reports', 'by-status', status);
}

export async function getReportCount(): Promise<number> {
  const db = await getDB();
  return db.count('reports');
}

// ============ SETTINGS ============

const SETTINGS_KEY = 'app_settings';

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const settings = await db.get('settings', SETTINGS_KEY);
  return settings || {
    autoAnalyze: true,
    theme: 'dark',
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', { ...settings, id: SETTINGS_KEY } as any);
}

// ============ EXPORT/IMPORT ============

export async function exportAllData(): Promise<{ reports: DamageReport[]; settings: AppSettings }> {
  const reports = await getAllReports();
  const settings = await getSettings();
  return { reports, settings };
}

export async function importData(data: { reports?: DamageReport[]; settings?: AppSettings }): Promise<number> {
  const db = await getDB();
  let imported = 0;

  if (data.reports) {
    for (const report of data.reports) {
      // Check if report already exists
      const existing = await db.get('reports', report.id);
      if (!existing) {
        await db.put('reports', report);
        imported++;
      }
    }
  }

  if (data.settings) {
    await saveSettings(data.settings);
  }

  return imported;
}

export async function clearAllReports(): Promise<void> {
  const db = await getDB();
  await db.clear('reports');
}

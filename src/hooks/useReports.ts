import { useState, useEffect, useCallback } from 'react';
import { DamageReport } from '../types';
import * as storage from '../services/storageService';

export function useReports() {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all reports on mount
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await storage.getAllReports();
      setReports(data);
    } catch (err) {
      setError('Failed to load reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addReport = useCallback(async (report: Omit<DamageReport, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newReport = await storage.createReport(report as DamageReport);
      setReports(prev => [newReport, ...prev]);
      return newReport;
    } catch (err) {
      setError('Failed to create report');
      throw err;
    }
  }, []);

  const updateReport = useCallback(async (id: string, updates: Partial<DamageReport>) => {
    try {
      const updated = await storage.updateReport(id, updates);
      if (updated) {
        setReports(prev => prev.map(r => r.id === id ? updated : r));
      }
      return updated;
    } catch (err) {
      setError('Failed to update report');
      throw err;
    }
  }, []);

  const deleteReport = useCallback(async (id: string) => {
    try {
      const success = await storage.deleteReport(id);
      if (success) {
        setReports(prev => prev.filter(r => r.id !== id));
      }
      return success;
    } catch (err) {
      setError('Failed to delete report');
      throw err;
    }
  }, []);

  const exportData = useCallback(async () => {
    try {
      const data = await storage.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RescueLens_Export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export data');
      throw err;
    }
  }, []);

  const importData = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const count = await storage.importData(data);
      await loadReports();
      return count;
    } catch (err) {
      setError('Failed to import data');
      throw err;
    }
  }, [loadReports]);

  return {
    reports,
    loading,
    error,
    addReport,
    updateReport,
    deleteReport,
    exportData,
    importData,
    refresh: loadReports,
  };
}

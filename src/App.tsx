import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Analyzer } from './components/Analyzer';
import { HistoryView } from './components/HistoryView';
import { Dashboard } from './components/Dashboard';
import { MapView } from './components/MapView';
import { Settings } from './components/Settings';
import { useReports } from './hooks/useReports';
import { initializeClaude } from './services/claudeService';
import { getSettings } from './services/storageService';

function App() {
  const [activeTab, setActiveTab] = useState('analyze');
  const {
    reports,
    loading,
    addReport,
    deleteReport,
    exportData,
    importData,
  } = useReports();

  // Initialize Claude with saved API key on mount
  useEffect(() => {
    const init = async () => {
      try {
        const settings = await getSettings();
        if (settings.apiKey) {
          initializeClaude(settings.apiKey);
        }
      } catch (err) {
        console.error('Failed to initialize:', err);
      }
    };
    init();
  }, []);

  const handleImport = async (file: File) => {
    try {
      const count = await importData(file);
      alert(`Successfully imported ${count} reports`);
    } catch (err) {
      alert('Failed to import file. Please check the format.');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-slate-500">Loading...</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'analyze':
        return <Analyzer onReportCreated={addReport} />;
      case 'history':
        return <HistoryView reports={reports} onDelete={deleteReport} />;
      case 'map':
        return <MapView reports={reports} />;
      case 'dashboard':
        return <Dashboard reports={reports} />;
      case 'settings':
        return <Settings onExport={exportData} reportCount={reports.length} />;
      default:
        return <Analyzer onReportCreated={addReport} />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onExport={exportData}
      onImport={handleImport}
      reportCount={reports.length}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Analyzer } from './components/Analyzer';
import { HistoryView } from './components/HistoryView';
import { Dashboard } from './components/Dashboard';
import { MapView } from './components/MapView';
import { ToolSplash, shouldShowSplash } from './components/ToolSplash';
import { AboutView } from './tools/about';
import { CrisisConnectView } from './tools/crisisconnect';
import { LidarView } from './tools/lidar';
import { ExampleReport } from './components/ExampleReport';
import { useReports } from './hooks/useReports';
import { initializeClaude } from './services/claudeService';
import { getSettings } from './services/storageService';
import { tools, getToolById } from './tools/registry';

function App() {
  const [activeTool, setActiveTool] = useState('home');
  const [activeTab, setActiveTab] = useState('analyze');
  const [showSplash, setShowSplash] = useState(false);
  const [pendingTool, setPendingTool] = useState<string | null>(null);

  const {
    reports,
    loading,
    addReport,
    deleteReport,
    exportData,
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

  const handleToolChange = (toolId: string) => {
    // Home doesn't need splash
    if (toolId === 'home') {
      setActiveTool(toolId);
      return;
    }

    // Check if we should show splash
    if (shouldShowSplash(toolId)) {
      setPendingTool(toolId);
      setShowSplash(true);
    } else {
      setActiveTool(toolId);
    }
  };

  const handleSplashContinue = () => {
    if (pendingTool) {
      setActiveTool(pendingTool);
      setPendingTool(null);
    }
    setShowSplash(false);
  };

  const renderToolContent = () => {
    if (loading && activeTool === 'rescuelens') {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-slate-500">Loading...</div>
        </div>
      );
    }

    switch (activeTool) {
      case 'home':
        return <AboutView onSelectTool={handleToolChange} />;

      case 'rescuelens':
        return renderRescueLensContent();

      case 'crisisconnect':
        return <CrisisConnectView />;

      case 'lidar':
        return <LidarView />;

      default:
        return <AboutView onSelectTool={handleToolChange} />;
    }
  };

  const renderRescueLensContent = () => {
    switch (activeTab) {
      case 'analyze':
        return <Analyzer onReportCreated={addReport} />;
      case 'history':
        return <HistoryView reports={reports} onDelete={deleteReport} />;
      case 'map':
        return <MapView reports={reports} />;
      case 'dashboard':
        return <Dashboard reports={reports} />;
      case 'example':
        return <ExampleReport />;
      default:
        return <Analyzer onReportCreated={addReport} />;
    }
  };

  // Get the current tool for splash screen
  const currentTool = pendingTool ? getToolById(pendingTool) : null;

  return (
    <>
      <Layout
        activeTool={activeTool}
        activeTab={activeTab}
        onToolChange={handleToolChange}
        onTabChange={setActiveTab}
      >
        {renderToolContent()}
      </Layout>

      {/* Splash Screen */}
      {showSplash && currentTool && (
        <ToolSplash
          tool={currentTool}
          onContinue={handleSplashContinue}
        />
      )}
    </>
  );
}

export default App;

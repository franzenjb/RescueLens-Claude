import React from 'react';
import { Camera, History, Map, BarChart3, Settings, Shield, Phone, Radar, Home } from 'lucide-react';
import { tools, homeTool } from '../tools/registry';

interface LayoutProps {
  children: React.ReactNode;
  activeTool: string;
  activeTab: string;
  onToolChange: (tool: string) => void;
  onTabChange: (tab: string) => void;
}

// RescueLens sub-tabs
const rescuelensTabs = [
  { id: 'analyze', label: 'Analyze', icon: Camera },
  { id: 'history', label: 'History', icon: History },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Tool icons mapping
const toolIcons: Record<string, React.FC<{ className?: string }>> = {
  home: Home,
  rescuelens: Camera,
  crisisconnect: Phone,
  lidar: Radar,
};

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTool,
  activeTab,
  onToolChange,
  onTabChange,
}) => {
  // Home first, then other tools
  const allTools = [homeTool, ...tools];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Header - Red Cross Branding */}
      <header className="bg-[#ce1126] text-white">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo & Title - Clickable to go Home */}
            <button
              onClick={() => onToolChange('home')}
              className="flex items-center gap-3 hover:opacity-90 transition-opacity"
            >
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#ce1126]" />
              </div>
              <div className="text-left">
                <h1 className="text-lg font-black tracking-tight">
                  Red Cross Innovation Suite
                </h1>
                <p className="text-[10px] text-white/70 font-medium tracking-widest uppercase">
                  Disaster Response Technology
                </p>
              </div>
            </button>

            {/* Contact Info */}
            <div className="text-right">
              <p className="text-xs text-white/80">For more information contact</p>
              <p className="text-sm font-semibold">
                Jeff Franzen •{' '}
                <a
                  href="mailto:Jeff.Franzen2@redcross.org"
                  className="hover:underline"
                >
                  Jeff.Franzen2@redcross.org
                </a>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tool Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {allTools.map((tool) => {
              const Icon = toolIcons[tool.id] || Home;
              const isActive = activeTool === tool.id;

              return (
                <button
                  key={tool.id}
                  onClick={() => onToolChange(tool.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
                    isActive
                      ? 'text-white border-[#ce1126] bg-slate-800/50'
                      : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-800/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tool.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Sub-Navigation for RescueLens */}
      {activeTool === 'rescuelens' && (
        <nav className="bg-slate-900/50 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1">
              {rescuelensTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-all rounded-t-lg ${
                    activeTab === id
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-500 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-slate-600">
            American Red Cross Innovation Suite | Disaster Response Technology
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

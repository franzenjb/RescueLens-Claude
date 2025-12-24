import React from 'react';
import { ArrowRight, Shield, Zap, Users } from 'lucide-react';
import { tools, ToolConfig } from '../registry';

interface AboutViewProps {
  onSelectTool: (toolId: string) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onSelectTool }) => {
  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Hero Section */}
      <div className="text-center py-12 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-full border border-red-500/20 mb-6">
          <Shield className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold text-red-400 uppercase tracking-widest">American Red Cross</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
          Innovation Suite
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Next-generation disaster response tools powered by artificial intelligence
        </p>
      </div>

      {/* Tool Cards */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 pb-12">
        <div className="grid md:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onSelect={() => onSelectTool(tool.id)} />
          ))}
        </div>

        {/* Value Props */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Faster Response</h3>
            <p className="text-sm text-slate-400">
              AI-powered tools accelerate damage assessment and resource allocation
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">FEMA Compliant</h3>
            <p className="text-sm text-slate-400">
              Built on official FEMA PDA criteria for standardized assessments
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Field Ready</h3>
            <p className="text-sm text-slate-400">
              Mobile-friendly tools designed for disaster response teams
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-xs text-slate-600 uppercase tracking-widest">
            Red Cross Disaster Response Innovation Lab
          </p>
        </div>
      </div>
    </div>
  );
};

const ToolCard: React.FC<{ tool: ToolConfig; onSelect: () => void }> = ({ tool, onSelect }) => {
  const Icon = tool.icon;

  return (
    <button
      onClick={onSelect}
      className="group bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all text-left"
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${tool.gradient} p-6`}>
        <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-black text-white">{tool.name}</h2>
        <p className="text-white/70 text-sm mt-1">{tool.shortName}</p>
      </div>

      {/* Content */}
      <div className="p-6">
        <p className="text-sm text-slate-400 mb-4">{tool.description}</p>
        <div className="flex items-center gap-2 text-red-400 text-sm font-bold group-hover:gap-3 transition-all">
          <span>Explore Tool</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
};

export default AboutView;

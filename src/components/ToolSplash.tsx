import React, { useState, useEffect } from 'react';
import { Play, ArrowRight, X } from 'lucide-react';
import { ToolConfig } from '../tools/registry';

interface ToolSplashProps {
  tool: ToolConfig;
  onContinue: () => void;
  onWatchVideo?: () => void;
}

export const ToolSplash: React.FC<ToolSplashProps> = ({ tool, onContinue, onWatchVideo }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 50);
  }, []);

  const handleContinue = () => {
    if (dontShowAgain) {
      localStorage.setItem(`splash_seen_${tool.id}`, 'true');
    }
    onContinue();
  };

  const Icon = tool.icon;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-sm transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`max-w-2xl w-full mx-4 transform transition-all duration-500 ${isVisible ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'}`}>
        {/* Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className={`bg-gradient-to-r ${tool.gradient} p-8 text-center`}>
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4">
              <Icon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">{tool.splash.title}</h1>
            <p className="text-white/80 text-lg">{tool.splash.subtitle}</p>
          </div>

          {/* Content */}
          <div className="p-8">
            <p className="text-slate-400 text-center mb-6">{tool.description}</p>

            {/* Features */}
            {tool.splash.features.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 text-center">Key Features</h3>
                <ul className="space-y-3">
                  {tool.splash.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-red-400 font-bold text-[10px]">{idx + 1}</span>
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {tool.splash.videoUrl && onWatchVideo && (
                <button
                  onClick={onWatchVideo}
                  className="flex-1 py-3 px-6 rounded-xl border border-slate-700 text-slate-300 font-bold text-sm uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Watch Intro
                </button>
              )}
              <button
                onClick={handleContinue}
                className="flex-1 py-3 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/30"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Don't show again */}
            <label className="flex items-center justify-center gap-2 mt-6 cursor-pointer group">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500 focus:ring-offset-slate-900"
              />
              <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                Don't show this again
              </span>
            </label>
          </div>
        </div>

        {/* Skip hint */}
        <p className="text-center text-slate-600 text-xs mt-4">
          Press <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-400">ESC</kbd> or click outside to skip
        </p>
      </div>

      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={handleContinue} />
    </div>
  );
};

export const shouldShowSplash = (toolId: string): boolean => {
  return localStorage.getItem(`splash_seen_${toolId}`) !== 'true';
};

export default ToolSplash;

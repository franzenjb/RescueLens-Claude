import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Loader2, AlertCircle, Maximize2, Minimize2, Phone, Presentation, Video, ChevronLeft, ChevronRight, Play, Mic, FileDown } from 'lucide-react';
import { CRISISCONNECT_URL } from '../registry';
import { crisisConnectSlides } from './slides';
import { GeminiLive } from './GeminiLive';

type ViewMode = 'live' | 'presentation' | 'video' | 'voice';

export const CrisisConnectView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('live');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalSlides = crisisConnectSlides.length;
  const slide = crisisConnectSlides[currentSlide];

  const handleLoad = () => setIsLoading(false);
  const handleError = () => { setIsLoading(false); setHasError(true); };
  const openInNewTab = () => window.open(CRISISCONNECT_URL, '_blank');

  const goToSlide = (index: number) => {
    if (index >= 0 && index < totalSlides) setCurrentSlide(index);
  };

  const nextSlide = useCallback(() => {
    if (currentSlide < totalSlides - 1) setCurrentSlide(currentSlide + 1);
  }, [currentSlide, totalSlides]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
  }, [currentSlide]);

  // Keyboard navigation for slideshow
  useEffect(() => {
    if (viewMode !== 'presentation') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextSlide(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide(); }
      else if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
      else if (e.key === 'f' || e.key === 'F') setIsFullscreen(!isFullscreen);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, isFullscreen, viewMode]);

  const containerClass = isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'h-[calc(100vh-180px)]';

  return (
    <div className={`${containerClass} flex flex-col`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-bold text-white">CrisisConnect</span>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('live')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'live' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Live AI call center demo"
            >
              <Play className="w-3.5 h-3.5" />
              Live Demo
            </button>
            <button
              onClick={() => setViewMode('presentation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'presentation' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Overview presentation slides"
            >
              <Presentation className="w-3.5 h-3.5" />
              Presentation
            </button>
            <button
              onClick={() => setViewMode('video')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'video' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Overview video"
            >
              <Video className="w-3.5 h-3.5" />
              Video
            </button>
            <button
              onClick={() => setViewMode('voice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'voice' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Interactive voice with Gemini Live"
            >
              <Mic className="w-3.5 h-3.5" />
              Gemini Live
            </button>
          </div>

          {viewMode === 'presentation' && (
            <span className="text-sm text-slate-500">{currentSlide + 1} / {totalSlides}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/crisisconnect/CrisisConnect-Technical-Documentation.pdf"
            download="CrisisConnect-Technical-Documentation.pdf"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
            title="Download full project documentation with protocols, guardrails, and technical specs (PDF)"
          >
            <FileDown className="w-4 h-4" />
            Technical Brief (PDF)
          </a>
          {viewMode === 'live' && (
            <button
              onClick={openInNewTab}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
              Full Screen
            </button>
          )}
          {viewMode === 'presentation' && (
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'live' ? (
        <LiveDemo
          isLoading={isLoading}
          hasError={hasError}
          onLoad={handleLoad}
          onError={handleError}
          openInNewTab={openInNewTab}
        />
      ) : viewMode === 'presentation' ? (
        <SlideshowView
          slide={slide}
          currentSlide={currentSlide}
          totalSlides={totalSlides}
          goToSlide={goToSlide}
          nextSlide={nextSlide}
          prevSlide={prevSlide}
        />
      ) : viewMode === 'voice' ? (
        <GeminiLive />
      ) : (
        <VideoView />
      )}
    </div>
  );
};

// Live Demo Tab - Iframe embed
const LiveDemo: React.FC<{
  isLoading: boolean;
  hasError: boolean;
  onLoad: () => void;
  onError: () => void;
  openInNewTab: () => void;
}> = ({ isLoading, hasError, onLoad, onError, openInNewTab }) => (
  <div className="flex-1 relative bg-slate-950">
    {isLoading && (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading CrisisConnect...</p>
        </div>
      </div>
    )}
    {hasError ? (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Unable to Load</h3>
          <p className="text-slate-400 mb-6">CrisisConnect couldn't be embedded due to security restrictions.</p>
          <button
            onClick={openInNewTab}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-widest transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </button>
        </div>
      </div>
    ) : (
      <iframe
        src={CRISISCONNECT_URL}
        className="w-full h-full border-0"
        onLoad={onLoad}
        onError={onError}
        allow="microphone; camera"
        title="CrisisConnect"
      />
    )}
  </div>
);

// Slideshow Tab
const SlideshowView: React.FC<{
  slide: { imageUrl: string };
  currentSlide: number;
  totalSlides: number;
  goToSlide: (idx: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
}> = ({ slide, currentSlide, totalSlides, goToSlide, nextSlide, prevSlide }) => (
  <>
    <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
      <img
        src={slide.imageUrl}
        alt={`Slide ${currentSlide + 1}`}
        className="max-h-full max-w-full object-contain"
      />
      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        disabled={currentSlide === 0}
        className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 border border-white/20 transition-all ${
          currentSlide === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/90 hover:scale-110'
        }`}
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={nextSlide}
        disabled={currentSlide === totalSlides - 1}
        className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 border border-white/20 transition-all ${
          currentSlide === totalSlides - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/90 hover:scale-110'
        }`}
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>
    </div>
    {/* Slide Indicators */}
    <div className="p-3 bg-slate-900 border-t border-slate-800">
      <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-4xl mx-auto">
        {Array.from({ length: totalSlides }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => goToSlide(idx)}
            className={`h-1.5 rounded-full transition-all ${
              idx === currentSlide ? 'w-6 bg-blue-500' : 'w-1.5 bg-slate-700 hover:bg-slate-600'
            }`}
            title={`Slide ${idx + 1}`}
          />
        ))}
      </div>
      <p className="text-center text-xs text-slate-600 mt-2">Arrow keys to navigate • F for fullscreen</p>
    </div>
  </>
);

// Video Tab
const VideoView: React.FC = () => (
  <div className="flex-1 overflow-auto bg-black flex flex-col">
    <div className="bg-slate-900 border-b border-slate-800 p-4">
      <h3 className="text-lg font-bold text-white">AI Disaster Call Center Overview</h3>
      <p className="text-sm text-slate-400 mt-1">
        See how AI-powered call center technology transforms disaster response intake and coordination.
      </p>
    </div>
    <div className="flex-1 flex items-center justify-center bg-black p-4">
      <video
        controls
        className="max-h-full max-w-full rounded-lg"
        style={{ maxHeight: 'calc(100vh - 280px)' }}
        poster="/crisisconnect/Binder1_Page_01.png"
      >
        <source src="/crisisconnect/AI_Disaster_Call_Center.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  </div>
);

export default CrisisConnectView;

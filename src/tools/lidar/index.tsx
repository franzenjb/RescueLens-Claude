import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Radar, Play, Presentation, Video, Globe2 } from 'lucide-react';
import { lidarSlides } from './slides';
import { LidarViewerTool } from '../lidar-viewer';

type ViewMode = 'slideshow' | 'overview' | 'tiktok' | '3d-globe';

export const LidarView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('slideshow');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const slide = lidarSlides[currentSlide];
  const totalSlides = lidarSlides.length;

  const goToSlide = (index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index);
    }
  };

  const nextSlide = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  }, [currentSlide, totalSlides]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  }, [currentSlide]);

  // Keyboard navigation (only in slideshow mode)
  useEffect(() => {
    if (viewMode !== 'slideshow') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFullscreen(!isFullscreen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, isFullscreen, viewMode]);

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-black'
    : 'h-[calc(100vh-180px)]';

  return (
    <div className={`${containerClass} flex flex-col`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Radar className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-bold text-white">Mission Accelerated 24/7</span>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('slideshow')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'slideshow'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="8-slide presentation on aerial LiDAR for disaster response"
            >
              <Presentation className="w-3.5 h-3.5" />
              Presentation
            </button>
            <button
              onClick={() => setViewMode('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'overview'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="AI-generated overview video of LiDAR technology"
            >
              <Video className="w-3.5 h-3.5" />
              Overview
            </button>
            <button
              onClick={() => setViewMode('tiktok')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'tiktok'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="TikTok demo of aerial LiDAR drone technology"
            >
              <Play className="w-3.5 h-3.5" />
              TikTok Demo
            </button>
            <button
              onClick={() => setViewMode('3d-globe')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === '3d-globe'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="3D Globe view with satellite imagery (Demo)"
            >
              <Globe2 className="w-3.5 h-3.5" />
              3D Globe
            </button>
          </div>

          {viewMode === 'slideshow' && (
            <span className="text-sm text-slate-500">
              {currentSlide + 1} / {totalSlides}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {viewMode === 'slideshow' && (
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
      {viewMode === 'slideshow' ? (
        <>
          {/* Slide Content - Full Image */}
          <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="max-h-full max-w-full object-contain"
            />

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 border border-white/20 transition-all ${
                currentSlide === 0
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-black/90 hover:scale-110'
              }`}
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={nextSlide}
              disabled={currentSlide === totalSlides - 1}
              className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 border border-white/20 transition-all ${
                currentSlide === totalSlides - 1
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-black/90 hover:scale-110'
              }`}
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Slide Indicators */}
          <div className="p-3 bg-slate-900 border-t border-slate-800">
            <div className="flex items-center justify-center gap-1.5">
              {lidarSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentSlide
                      ? 'w-6 bg-emerald-500'
                      : 'w-1.5 bg-slate-700 hover:bg-slate-600'
                  }`}
                  title={`Slide ${idx + 1}`}
                />
              ))}
            </div>
            <p className="text-center text-xs text-slate-600 mt-2">
              Arrow keys to navigate • F for fullscreen
            </p>
          </div>
        </>
      ) : viewMode === 'overview' ? (
        <OverviewVideo />
      ) : viewMode === 'tiktok' ? (
        <TikTokVideo />
      ) : (
        <div className="flex-1 relative">
          <LidarViewerTool />
        </div>
      )}
    </div>
  );
};

const OverviewVideo: React.FC = () => {
  return (
    <div className="flex-1 overflow-auto bg-black flex flex-col">
      <div className="bg-slate-900 border-b border-slate-800 p-4">
        <h3 className="text-lg font-bold text-white">LiDAR Technology Overview</h3>
        <p className="text-sm text-slate-400 mt-1">
          AI-generated overview showing how aerial LiDAR transforms disaster assessment with 24/7 capability.
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center bg-black p-4">
        <video
          controls
          autoPlay
          className="max-h-full max-w-full rounded-lg"
          style={{ maxHeight: 'calc(100vh - 280px)' }}
        >
          <source src="/slides/lidar-overview.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

const TikTokVideo: React.FC = () => {
  return (
    <div className="flex-1 overflow-auto bg-black flex flex-col">
      {/* Video Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-4">
        <h3 className="text-lg font-bold text-white">LiDAR Drone Technology Demo</h3>
        <p className="text-sm text-slate-400 mt-1">
          See the DJI Zenmuse L2 LiDAR sensor in action — the same technology that enables
          rapid 3D terrain mapping for disaster response, day or night.
        </p>
      </div>

      {/* TikTok Embed - Centered */}
      <div className="flex-1 flex items-center justify-center bg-black p-6">
        <div className="flex flex-col items-center">
          <iframe
            src="https://www.tiktok.com/embed/v2/7581145478738267423"
            style={{ width: '325px', height: '578px', border: 'none', borderRadius: '8px' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <a
            href="https://www.tiktok.com/@dylang_1/video/7581145478738267423"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            View on TikTok →
          </a>
        </div>
      </div>
    </div>
  );
};

export default LidarView;

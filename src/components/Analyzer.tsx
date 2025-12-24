import React, { useState, useRef } from 'react';
import { Camera, Loader2, X, CheckCircle2, AlertCircle, Upload, Sparkles, Building2, Shield, Info, ArrowRight, ChevronDown, ImageIcon, BookOpen } from 'lucide-react';
import { analyzeImage, compressImage, isClaudeInitialized } from '../services/claudeService';
import { DamageReport, DamageSeverity, Location } from '../types';
import { SAMPLE_IMAGES, SampleImage } from '../data/sampleImages';

interface AnalyzerProps {
  onReportCreated: (report: Omit<DamageReport, 'id' | 'createdAt' | 'updatedAt'>) => Promise<DamageReport>;
}

interface QueueItem {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  report?: DamageReport;
  error?: string;
}

const SEVERITY_STYLES: Record<DamageSeverity, { bg: string; text: string; border: string }> = {
  [DamageSeverity.NO_VISIBLE_DAMAGE]: { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-600' },
  [DamageSeverity.AFFECTED]: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/40' },
  [DamageSeverity.MINOR]: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/40' },
  [DamageSeverity.MAJOR]: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/40' },
  [DamageSeverity.DESTROYED]: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
};

const generateLocation = (): Location => {
  const streets = ['Gulf Blvd', 'Belcher Rd', 'Ulmerton Rd', 'Park Blvd', 'Gandy Blvd', 'Central Ave', 'MLK Jr St'];
  const cities = ['St. Petersburg', 'Clearwater', 'Largo', 'Pinellas Park', 'Tampa', 'Dunedin'];
  const city = cities[Math.floor(Math.random() * cities.length)];
  return {
    address: `${Math.floor(Math.random() * 9000) + 100} ${streets[Math.floor(Math.random() * streets.length)]}`,
    city,
    state: 'FL',
    zip: `3${Math.floor(Math.random() * 4) + 3}${Math.floor(Math.random() * 900) + 100}`,
    lat: 27.7 + Math.random() * 0.4,
    lng: -82.8 + Math.random() * 0.2,
  };
};

export const Analyzer: React.FC<AnalyzerProps> = ({ onReportCreated }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load a sample image into the queue
  const loadSampleImage = async (sample: SampleImage) => {
    setLoadingSample(sample.id);
    try {
      const response = await fetch(sample.url);
      const blob = await response.blob();
      const file = new File([blob], sample.filename, { type: blob.type });

      const newItem: QueueItem = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        file,
        preview: URL.createObjectURL(blob),
        status: 'pending',
      };
      setQueue(prev => [...prev, newItem]);
    } catch (err) {
      console.error('Failed to load sample image:', err);
    } finally {
      setLoadingSample(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: QueueItem[] = files.map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }));
    setQueue(prev => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const processQueue = async () => {
    if (!isClaudeInitialized()) {
      alert('Please set your Claude API key in Settings first.');
      return;
    }

    const pending = queue.filter(i => i.status === 'pending');
    if (pending.length === 0) return;

    setProcessing(true);

    for (const item of pending) {
      setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'analyzing' } : i));

      try {
        // Read and compress file
        const base64 = await fileToBase64(item.file);
        const compressed = await compressImage(base64, 1280);

        // Analyze with Claude
        const analysis = await analyzeImage(compressed);

        // Create report
        const location = generateLocation();
        const report = await onReportCreated({
          imageData: compressed,
          location,
          analysis,
          status: 'completed',
        });

        setQueue(prev => prev.map(i =>
          i.id === item.id ? { ...i, status: 'completed', report } : i
        ));
      } catch (err) {
        console.error('Analysis failed:', err);
        setQueue(prev => prev.map(i =>
          i.id === item.id ? {
            ...i,
            status: 'error',
            error: err instanceof Error ? err.message : 'Analysis failed'
          } : i
        ));
      }
    }

    setProcessing(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const completedItems = queue.filter(i => i.status === 'completed');
  const pendingCount = queue.filter(i => i.status === 'pending').length;

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      {/* Left Panel - Upload & Queue */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Camera className="w-4 h-4 text-red-500" />
            Field Assessment
          </h2>

          {/* How It Works */}
          <div className="bg-slate-950/50 rounded-xl p-4 mb-6 border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-red-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">How It Works</span>
            </div>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-400 font-bold text-[10px]">1</span>
                </div>
                <p>Upload damage photos from your device</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-blue-400 font-bold text-[10px]">2</span>
                </div>
                <p>Claude AI analyzes structural damage vs debris</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-emerald-400 font-bold text-[10px]">3</span>
                </div>
                <p>Review FEMA PDA classification and save report</p>
              </div>
            </div>
          </div>

          {/* Sample Images Gallery */}
          <div className="mb-6">
            <button
              onClick={() => setShowSamples(!showSamples)}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-blue-500/50 transition-all group"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-slate-300">Try FEMA Sample Images</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showSamples ? 'rotate-180' : ''}`} />
            </button>

            {showSamples && (
              <div className="mt-3 p-4 bg-slate-950/50 rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">
                  Click any image to test AI classification
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {SAMPLE_IMAGES.map(sample => (
                    <button
                      key={sample.id}
                      onClick={() => loadSampleImage(sample)}
                      disabled={loadingSample === sample.id}
                      className="relative group rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500/50 transition-all aspect-square"
                    >
                      <img
                        src={sample.url}
                        alt="Sample"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {loadingSample === sample.id ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-8 border-2 border-dashed border-slate-700 rounded-xl hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
          >
            <Upload className="w-8 h-8 text-slate-500 group-hover:text-red-500 mx-auto mb-2" />
            <span className="text-sm font-bold text-slate-400 group-hover:text-slate-300">
              Click to upload photos
            </span>
            <p className="text-[10px] text-slate-600 mt-1">JPG, PNG, WebP supported</p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Queue */}
          <div className="mt-6 space-y-2 max-h-64 overflow-y-auto">
            {queue.length === 0 ? (
              <div className="py-6 text-center border border-slate-800 rounded-lg">
                <p className="text-xs text-slate-600 uppercase tracking-widest">No photos in queue</p>
              </div>
            ) : (
              queue.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <img
                    src={item.preview}
                    alt=""
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300 truncate">{item.file.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {item.status === 'pending' && (
                        <span className="text-[10px] text-slate-500 uppercase">Waiting</span>
                      )}
                      {item.status === 'analyzing' && (
                        <span className="text-[10px] text-red-400 uppercase flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Analyzing
                        </span>
                      )}
                      {item.status === 'completed' && (
                        <span className="text-[10px] text-emerald-400 uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-[10px] text-red-400 uppercase flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Error
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromQueue(item.id)}
                    className="p-1 text-slate-500 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Process Button */}
          <button
            onClick={processQueue}
            disabled={pendingCount === 0 || processing}
            className={`w-full mt-4 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              pendingCount === 0 || processing
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30'
            }`}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Start Analysis
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Panel - Results Stream */}
      <div className="lg:col-span-3">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl min-h-[600px] flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Analysis Results</h2>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-400">Claude AI Ready</span>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-950/30">
            {completedItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <Sparkles className="w-12 h-12 text-slate-800 mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                  Upload photos to begin analysis
                </p>
              </div>
            ) : (
              completedItems.map(item => (
                <ResultCard key={item.id} item={item} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ResultCard: React.FC<{ item: QueueItem }> = ({ item }) => {
  const analysis = item.report?.analysis;
  if (!analysis) return null;

  const severity = analysis.overallSeverity;
  const styles = SEVERITY_STYLES[severity];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row">
        <div className="md:w-96 shrink-0 bg-black flex items-center justify-center">
          <img
            src={item.preview}
            alt="Damage"
            className="w-full h-64 md:h-80 object-contain"
          />
        </div>
        <div className="flex-1 p-6 space-y-4">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-black px-3 py-1 rounded-full border-2 uppercase ${styles.bg} ${styles.text} ${styles.border}`}>
              {severity.replace(/_/g, ' ')}
            </span>
            <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase">
              {analysis.homeType}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Building2 className="w-3 h-3" />
              {analysis.confidence}% Confidence
            </span>
          </div>

          {/* Summary */}
          <p className="text-lg font-bold text-white leading-snug">
            "{analysis.summary}"
          </p>

          {/* Justification */}
          <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
            <div className="flex items-start gap-2 mb-2">
              <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PDA Justification</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{analysis.pdaJustification}</p>
          </div>

          {/* Structural & Debris Assessment */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Envelope Status</p>
              <p className="text-xs text-slate-300">{analysis.structuralAssessment}</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Debris Type</p>
              <p className="text-xs text-slate-300">{analysis.debrisAssessment}</p>
            </div>
          </div>

          {/* Report ID */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-[10px] font-mono text-slate-600">{item.report?.id}</span>
            <span className="text-[10px] text-slate-600">
              {new Date(item.report?.createdAt || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analyzer;

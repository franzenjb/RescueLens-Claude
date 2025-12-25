import { Camera, Phone, Radar, Home, LucideIcon } from 'lucide-react';

export interface ToolConfig {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  splash: {
    title: string;
    subtitle: string;
    features: string[];
    videoUrl?: string;
  };
}

export const tools: ToolConfig[] = [
  {
    id: 'rescuelens',
    name: 'RescueLens',
    shortName: 'Damage Assessment',
    description: 'AI-powered structural damage assessment using FEMA PDA criteria. Upload photos and get instant classification.',
    icon: Camera,
    color: '#dc2626',
    gradient: 'from-red-600 to-red-800',
    splash: {
      title: 'RescueLens',
      subtitle: 'AI-Powered Damage Assessment',
      features: [
        'Upload disaster photos for instant analysis',
        'FEMA PDA severity classification (Affected → Destroyed)',
        'Structural vs debris differentiation',
        'PDF report generation',
        'Map visualization of assessments',
      ],
      videoUrl: undefined, // Placeholder for intro video
    },
  },
  {
    id: 'crisisconnect',
    name: 'CrisisConnect',
    shortName: 'AI Call Center',
    description: 'AI-powered crisis intake system for efficient disaster response call handling and case management.',
    icon: Phone,
    color: '#2563eb',
    gradient: 'from-blue-600 to-blue-800',
    splash: {
      title: 'CrisisConnect',
      subtitle: 'AI-Powered Crisis Intake',
      features: [
        'Intelligent call routing and triage',
        'Automated intake form processing',
        'Real-time case management',
        'Multi-language support',
        'Integration with emergency response systems',
      ],
      videoUrl: undefined,
    },
  },
  {
    id: 'lidar',
    name: 'LIDAR Assessment',
    shortName: 'Aerial Surveys',
    description: 'Post-disaster aerial assessment using LIDAR technology for rapid damage evaluation and resource planning.',
    icon: Radar,
    color: '#059669',
    gradient: 'from-emerald-600 to-emerald-800',
    splash: {
      title: 'LIDAR Assessment',
      subtitle: 'Aerial Damage Surveys',
      features: [
        'Rapid post-disaster terrain mapping',
        'Before/after comparison analysis',
        'Debris volume estimation',
        'Access route identification',
        'Resource deployment planning',
      ],
      videoUrl: undefined,
    },
  },
];

export const homeTool: ToolConfig = {
  id: 'home',
  name: 'Home',
  shortName: 'Overview',
  description: 'Disaster Response Innovation Suite Home',
  icon: Home,
  color: '#64748b',
  gradient: 'from-slate-600 to-slate-800',
  splash: {
    title: 'Disaster Response Innovation Suite',
    subtitle: 'AI-Powered Emergency Tools',
    features: [],
  },
};

export const getToolById = (id: string): ToolConfig | undefined => {
  if (id === 'home') return homeTool;
  return tools.find(t => t.id === id);
};

export const CRISISCONNECT_URL = 'https://crisisconnect-intake-920791670943.us-west1.run.app/';

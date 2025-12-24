import { Camera, Phone, Radar, Info, LucideIcon, Box } from 'lucide-react';

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
        'Integration with Red Cross systems',
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
  {
    id: 'lidar-viewer',
    name: 'LiDAR 3D Viewer',
    shortName: 'Point Cloud',
    description: 'Interactive 3D point cloud visualization showing DJI L3 LiDAR output for post-disaster structural assessment.',
    icon: Box,
    color: '#0891b2',
    gradient: 'from-cyan-600 to-cyan-800',
    splash: {
      title: 'LiDAR 3D Viewer',
      subtitle: 'DJI L3 Point Cloud Demo',
      features: [
        'Real-time 3D point cloud visualization',
        'Works in complete darkness',
        'Penetrates smoke and dust',
        'Assesses areas inaccessible by road',
        'Automated damage classification',
        '360° structural integrity view',
      ],
      videoUrl: undefined,
    },
  },
];

export const aboutTool: ToolConfig = {
  id: 'about',
  name: 'About',
  shortName: 'Overview',
  description: 'Learn about the Red Cross Innovation Suite',
  icon: Info,
  color: '#64748b',
  gradient: 'from-slate-600 to-slate-800',
  splash: {
    title: 'Red Cross Innovation Suite',
    subtitle: 'Disaster Response Technology',
    features: [],
  },
};

export const getToolById = (id: string): ToolConfig | undefined => {
  if (id === 'about') return aboutTool;
  return tools.find(t => t.id === id);
};

export const CRISISCONNECT_URL = 'https://crisisconnect-intake-920791670943.us-west1.run.app/';

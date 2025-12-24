// FEMA PDA Damage Severity Levels
export enum DamageSeverity {
  NO_VISIBLE_DAMAGE = 'NO_VISIBLE_DAMAGE',
  AFFECTED = 'AFFECTED',
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  DESTROYED = 'DESTROYED'
}

export enum DebrisType {
  VEGETATION = 'VEGETATION',
  STRUCTURAL = 'STRUCTURAL',
  VEHICLE = 'VEHICLE',
  FLOOD = 'FLOOD',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  HOUSEHOLD = 'HOUSEHOLD',
  UNKNOWN = 'UNKNOWN'
}

export enum HomeType {
  CONVENTIONAL = 'CONVENTIONAL',
  MANUFACTURED = 'MANUFACTURED',
  MULTI_FAMILY = 'MULTI_FAMILY',
  COMMERCIAL = 'COMMERCIAL',
  NONE = 'NONE'
}

export interface Detection {
  object: string;
  type: DebrisType;
  severity: DamageSeverity;
  description: string;
  confidence: number; // 0-100
}

export interface DamageAnalysis {
  overallSeverity: DamageSeverity;
  summary: string;
  structuralAssessment: string; // Envelope status
  debrisAssessment: string; // What debris is present
  pdaJustification: string; // Why this severity was chosen
  homeType: HomeType;
  detections: Detection[];
  recommendations: string[];
  confidence: number; // 0-100 overall confidence
  analysisTimestamp: number;
}

export interface ClientInfo {
  name: string;
  phone: string;
  email?: string;
  caseworker?: string;
  caseworkerEmail?: string;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface AssistanceRecord {
  status: 'pending' | 'in_place' | 'relocated' | 'completed';
  shelterName?: string;
  financialAssistance?: string;
  notes: string;
}

export interface DamageReport {
  id: string;
  createdAt: number;
  updatedAt: number;
  imageData: string; // base64 or blob URL
  thumbnailData?: string; // smaller preview
  location: Location;
  clientInfo?: ClientInfo;
  assistance?: AssistanceRecord;
  analysis?: DamageAnalysis;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  errorMessage?: string;
  tags?: string[];
  notes?: string;
}

export interface AppSettings {
  apiKey?: string;
  defaultCaseworker?: string;
  defaultCaseworkerEmail?: string;
  autoAnalyze: boolean;
  theme: 'dark' | 'light';
}

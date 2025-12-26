// FEMA PDA Damage Severity Levels (July 2025)
// Ordered by severity rank (highest to lowest)
export enum DamageSeverity {
  INACCESSIBLE = 'INACCESSIBLE',   // Rank 5: Cannot visually verify damage
  DESTROYED = 'DESTROYED',          // Rank 4: Total loss
  MAJOR = 'MAJOR',                  // Rank 3: Significant structural damage
  MINOR = 'MINOR',                  // Rank 2: Non-structural damage
  AFFECTED = 'AFFECTED',            // Rank 1: Cosmetic/minimal damage
  NO_VISIBLE_DAMAGE = 'NO_VISIBLE_DAMAGE',  // Rank 0: No damage
  UNKNOWN = 'UNKNOWN'               // Rank 0: Insufficient evidence
}

// Incident type for flood vs non-flood assessment rules
export enum IncidentType {
  FLOOD = 'FLOOD',
  NON_FLOOD = 'NON_FLOOD'
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

// Flood water line reference levels per FEMA July 2025 guidelines
export type ManufacturedWaterLevel =
  | 'below_floor_system'
  | 'in_floor_system_only'
  | 'in_living_space_below_ceiling'
  | 'at_or_above_ceiling';

export type ConventionalWaterLevel =
  | 'unfinished_basement_only'
  | 'below_outlets'
  | 'at_or_above_outlets'
  | 'at_or_above_ceiling';

export interface FloodEvidence {
  waterLineDetected: boolean;
  waterLineReference?: ManufacturedWaterLevel | ConventionalWaterLevel;
  estimatedHeightInches?: number;
  contaminationPresent?: boolean; // sewage, fuel, chemicals
  longDurationFlooding?: boolean;
  basementMechanicalDamage?: boolean;
}

export interface StructuralIndicators {
  roofDamage: 'none' | 'covering_only' | 'structural_ribbing' | 'collapsed';
  wallDamage: 'none' | 'nonstructural' | 'structural' | 'collapsed';
  foundationStatus: 'intact' | 'cracked' | 'displaced' | 'failed';
  frameCompromised: boolean; // Critical for manufactured homes
  displacedFromFoundation: boolean;
  structuralComponentsFailedCount: number;
}

export interface DamageAnalysis {
  overallSeverity: DamageSeverity;
  incidentType: IncidentType;
  summary: string;
  structuralAssessment: string; // Envelope status
  debrisAssessment: string; // What debris is present
  pdaJustification: string; // Why this severity was chosen
  homeType: HomeType;
  floodEvidence?: FloodEvidence;
  structuralIndicators?: StructuralIndicators;
  detections: Detection[];
  recommendations: string[];
  reasonCodes: string[]; // Machine-readable reason codes for training
  confidence: number; // 0-100 overall confidence
  analysisTimestamp: number;
  accessBlocked?: boolean; // For INACCESSIBLE classification
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

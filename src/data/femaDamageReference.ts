import { DamageSeverity, HomeType, IncidentType } from '../types';

/**
 * Official FEMA Preliminary Damage Assessment (PDA) Grading Rules
 * Source: FEMA Preliminary Damage Assessment Guide (July 2025)
 *
 * This rubric is designed for Individual Assistance (IA) PDAs
 * for residential structure damage assessment.
 */

// =============================================================================
// SEVERITY DEFINITIONS
// =============================================================================

export interface SeverityDefinition {
  severity: DamageSeverity;
  rank: number;
  label: string;
  meaning: string;
}

export const SEVERITY_DEFINITIONS: SeverityDefinition[] = [
  {
    severity: DamageSeverity.INACCESSIBLE,
    rank: 5,
    label: 'Inaccessible',
    meaning: 'Damage cannot be visually verified because access is blocked (e.g., floodwater, debris, roads/bridges out).',
  },
  {
    severity: DamageSeverity.DESTROYED,
    rank: 4,
    label: 'Destroyed',
    meaning: 'The residence is a total loss / repair not feasible.',
  },
  {
    severity: DamageSeverity.MAJOR,
    rank: 3,
    label: 'Major',
    meaning: 'Significant damage requiring extensive repairs; often structural impacts.',
  },
  {
    severity: DamageSeverity.MINOR,
    rank: 2,
    label: 'Minor',
    meaning: 'Non-structural damage; structural integrity not affected; repairs needed.',
  },
  {
    severity: DamageSeverity.AFFECTED,
    rank: 1,
    label: 'Affected',
    meaning: 'Cosmetic/minimal damage; essential living space & key systems not impacted.',
  },
  {
    severity: DamageSeverity.UNKNOWN,
    rank: 0,
    label: 'Unknown',
    meaning: 'Insufficient evidence to confidently grade. (Use only when required evidence is missing.)',
  },
];

// =============================================================================
// DECISION ORDER (Global Priority)
// =============================================================================

/**
 * Always apply labels in this order to prevent under-grading:
 * 1. INACCESSIBLE (if cannot visually verify)
 * 2. DESTROYED (if any destroyed criteria are met)
 * 3. MAJOR (if any major criteria are met)
 * 4. MINOR (if any minor criteria are met)
 * 5. AFFECTED (otherwise, if minimal/cosmetic)
 * 6. UNKNOWN (only if evidence is insufficient)
 */
export const DECISION_ORDER: DamageSeverity[] = [
  DamageSeverity.INACCESSIBLE,
  DamageSeverity.DESTROYED,
  DamageSeverity.MAJOR,
  DamageSeverity.MINOR,
  DamageSeverity.AFFECTED,
  DamageSeverity.UNKNOWN,
];

// =============================================================================
// MANUFACTURED HOME RULES
// =============================================================================

export interface ManufacturedHomeCriteria {
  severity: DamageSeverity;
  floodCriteria: string[];
  nonFloodCriteria: string[];
  triggers: string[];
}

export const MANUFACTURED_HOME_RULES: ManufacturedHomeCriteria[] = [
  {
    severity: DamageSeverity.AFFECTED,
    floodCriteria: [
      'Waterline is BELOW the floor system',
      'Damage is cosmetic only (e.g., skirting impacted)',
      'Non-access-impacting landscaping/retaining wall/tree damage',
    ],
    nonFloodCriteria: [
      'Cosmetic-only damage',
      'Non-access-impacting gutters/retaining wall/tree damage',
    ],
    triggers: ['cosmetic_only', 'waterline_below_floor_system'],
  },
  {
    severity: DamageSeverity.MINOR,
    floodCriteria: [
      'Waterline has reached the FLOOR SYSTEM ONLY but has NOT entered living space',
      'Bottom-board insulation or ductwork affected',
      'HVAC impacted',
      'NO structural damage and NOT displaced from foundation',
    ],
    nonFloodCriteria: [
      'Some NONSTRUCTURAL components sustained damage (windows, doors, wall coverings, bottom-board insulation, ductwork, utility hookups, HVAC)',
      'NO structural damage and NOT displaced from foundation',
    ],
    triggers: ['waterline_in_floor_system_only', 'nonstructural_damage_some'],
  },
  {
    severity: DamageSeverity.MAJOR,
    floodCriteria: [
      'Water has covered the floor system and ENTERED LIVING SPACE but is BELOW THE CEILING',
      'Residence is DISPLACED from foundation/block/piers with other structural components damaged',
    ],
    nonFloodCriteria: [
      'Majority of NONSTRUCTURAL components have significant damage',
      'Roof is SUBSTANTIALLY DAMAGED',
      'Residence is DISPLACED from foundation/block/piers and other structural components are damaged',
    ],
    triggers: ['waterline_in_living_space_below_ceiling', 'displaced_from_foundation', 'roof_substantially_damaged', 'nonstructural_damage_majority'],
  },
  {
    severity: DamageSeverity.DESTROYED,
    floodCriteria: [
      'Waterline AT OR ABOVE THE CEILING',
    ],
    nonFloodCriteria: [
      'Frame is BENT, TWISTED, or otherwise COMPROMISED',
      'Most STRUCTURAL FRAMING of roof or walls COMPROMISED, exposing the interior',
    ],
    triggers: ['waterline_at_or_above_ceiling', 'frame_compromised', 'structural_framing_compromised'],
  },
  {
    severity: DamageSeverity.INACCESSIBLE,
    floodCriteria: [
      'Damage cannot be visually verified because FLOODWATER blocks access',
    ],
    nonFloodCriteria: [
      'Damage cannot be visually verified because DEBRIS or COMPROMISED INFRASTRUCTURE blocks access',
    ],
    triggers: ['access_blocked', 'visibility_not_confirmed'],
  },
];

// =============================================================================
// CONVENTIONAL/MULTI-FAMILY HOME RULES
// =============================================================================

export interface ConventionalHomeCriteria {
  severity: DamageSeverity;
  floodCriteria: string[];
  nonFloodCriteria: string[];
  escalationConditions?: string[];
  triggers: string[];
}

export const CONVENTIONAL_HOME_RULES: ConventionalHomeCriteria[] = [
  {
    severity: DamageSeverity.AFFECTED,
    floodCriteria: [
      'Waterline in CRAWLSPACE or UNFINISHED BASEMENT only',
      'Damage to attached structures (porch/carport/garage/outbuilding)',
      'Gutters/screens/landscaping/retaining walls/downed trees NOT AFFECTING ACCESS',
      'Essential living spaces and mechanical components NOT damaged or submerged',
    ],
    nonFloodCriteria: [
      'Cosmetic damage (paint discoloration, loose siding)',
      'MINIMAL missing shingles/siding',
      'Non-access-impacting gutter/retaining wall/tree damage',
    ],
    triggers: ['waterline_unfinished_basement', 'cosmetic_only'],
  },
  {
    severity: DamageSeverity.MINOR,
    floodCriteria: [
      'Waterline is BELOW ELECTRICAL OUTLETS in the lowest floor with essential living space',
      'Disaster-related contamination to private well/septic',
    ],
    nonFloodCriteria: [
      'Nonstructural roof-component damage over essential living spaces',
      'Interior wall component damage (drywall/insulation)',
      'Nonstructural exterior damage',
      'Multiple small vertical foundation cracks',
      'Chimney damage (tilting/falling/cracking/separating)',
      'Mechanical component damage (furnace/boiler/water heater/HVAC)',
      'Well/septic contamination',
    ],
    escalationConditions: [
      'ESCALATE TO MAJOR if: Long duration flooding',
      'ESCALATE TO MAJOR if: Contaminants present (sewage, heating fuel, other chemicals)',
      'ESCALATE TO MAJOR if: Basement flooding damages key mechanical components (furnace/boiler/water heater/HVAC)',
    ],
    triggers: ['waterline_below_outlets', 'nonstructural_roof_damage', 'drywall_or_insulation_damage', 'foundation_cracks_small_multiple', 'chimney_damage', 'mechanical_damage', 'well_septic_contamination'],
  },
  {
    severity: DamageSeverity.MAJOR,
    floodCriteria: [
      'Waterline AT OR ABOVE ELECTRICAL OUTLETS in an essential living space',
    ],
    nonFloodCriteria: [
      'STRUCTURAL damage requiring extensive repairs',
      'Use observed structural indicators; if unclear, prefer UNKNOWN or review',
    ],
    triggers: ['waterline_at_or_above_outlets', 'structural_damage_extensive', 'flood_duration_long', 'water_contaminated', 'basement_mechanical_damage'],
  },
  {
    severity: DamageSeverity.DESTROYED,
    floodCriteria: [
      'Waterline AT OR HIGHER THAN THE CEILING of an above-ground essential living space',
    ],
    nonFloodCriteria: [
      'Residence is a TOTAL LOSS, or repair is not feasible',
      'FAILURE of TWO OR MORE STRUCTURAL COMPONENTS',
    ],
    triggers: ['waterline_at_or_above_ceiling', 'structural_components_failed_count_gte_2'],
  },
  {
    severity: DamageSeverity.INACCESSIBLE,
    floodCriteria: [
      'Damage cannot be visually verified because FLOODWATER blocks access',
    ],
    nonFloodCriteria: [
      'Access is blocked (debris, roads blocked, bridge out, etc.)',
    ],
    triggers: ['access_blocked', 'visibility_not_confirmed'],
  },
];

// =============================================================================
// WATER LINE REFERENCE GUIDES
// =============================================================================

export const MANUFACTURED_WATER_LINE_SEVERITY = {
  below_floor_system: DamageSeverity.AFFECTED,
  in_floor_system_only: DamageSeverity.MINOR,
  in_living_space_below_ceiling: DamageSeverity.MAJOR,
  at_or_above_ceiling: DamageSeverity.DESTROYED,
} as const;

export const CONVENTIONAL_WATER_LINE_SEVERITY = {
  unfinished_basement_only: DamageSeverity.AFFECTED,
  below_outlets: DamageSeverity.MINOR,
  at_or_above_outlets: DamageSeverity.MAJOR,
  at_or_above_ceiling: DamageSeverity.DESTROYED,
} as const;

/**
 * Reference points for estimating water line height from photos
 */
export const WATER_LINE_HEIGHT_REFERENCES = {
  electricalOutlets: { heightInches: 12, note: 'Standard outlet height: 12-18 inches from floor' },
  doorHandle: { heightInches: 36, note: 'Door handle height: approximately 36 inches' },
  windowSill: { heightInches: 30, note: 'Window sill height: approximately 30-36 inches' },
  lightSwitch: { heightInches: 48, note: 'Light switch height: approximately 48 inches' },
  electricalPanel: { heightInches: 60, note: 'Electrical panel height: approximately 60 inches' },
};

// =============================================================================
// TIE-BREAKER RULES
// =============================================================================

/**
 * When multiple labels seem plausible, use the HIGHEST severity supported by evidence:
 * - If ANY DESTROYED trigger exists → DESTROYED
 * - If ANY MAJOR trigger exists → MAJOR
 * - If ONLY nonstructural indicators exist → MINOR
 * - If COSMETIC/minimal only → AFFECTED
 * - If evidence is CONTRADICTORY or MISSING → UNKNOWN + flag for review
 */
export const TIE_BREAKER_RULES = [
  { condition: 'any_destroyed_trigger', result: DamageSeverity.DESTROYED },
  { condition: 'any_major_trigger', result: DamageSeverity.MAJOR },
  { condition: 'only_nonstructural_indicators', result: DamageSeverity.MINOR },
  { condition: 'cosmetic_minimal_only', result: DamageSeverity.AFFECTED },
  { condition: 'evidence_contradictory_or_missing', result: DamageSeverity.UNKNOWN },
];

// =============================================================================
// VALIDATION RULES
// =============================================================================

export interface ValidationRule {
  severity: DamageSeverity;
  requiredConditions: string[];
  excludedConditions: string[];
}

export const VALIDATION_RULES: ValidationRule[] = [
  {
    severity: DamageSeverity.INACCESSIBLE,
    requiredConditions: ['access_blocked = true OR visibility_confirmed = false'],
    excludedConditions: [],
  },
  {
    severity: DamageSeverity.DESTROYED,
    requiredConditions: ['At least one destroyed trigger (waterline>=ceiling, frame_compromised, structural_framing_compromised)'],
    excludedConditions: [],
  },
  {
    severity: DamageSeverity.MAJOR,
    requiredConditions: ['At least one major trigger (conventional: waterline>=outlets, manufactured: water_in_living_space_below_ceiling, displaced_from_foundation, etc.)'],
    excludedConditions: [],
  },
  {
    severity: DamageSeverity.MINOR,
    requiredConditions: ['Non-structural damage indicators'],
    excludedConditions: ['structural_displacement_indicators', 'displaced_from_foundation'],
  },
];

// =============================================================================
// HOME TYPE INFORMATION
// =============================================================================

export interface HomeTypeInfo {
  type: HomeType;
  label: string;
  description: string;
  keyFeatures: string[];
  assessmentNotes: string[];
}

export const HOME_TYPE_INFO: HomeTypeInfo[] = [
  {
    type: HomeType.CONVENTIONAL,
    label: 'Conventional (Stick-Built)',
    description: 'Traditional site-built home on permanent foundation',
    keyFeatures: [
      'Permanent foundation (slab, crawl space, or basement)',
      'Wood or steel frame construction',
      'Site-built walls, roof, and floors',
    ],
    assessmentNotes: [
      'Water line reference: below outlets = MINOR, at/above outlets = MAJOR, at/above ceiling = DESTROYED',
      'Two or more structural component failures = DESTROYED',
      'Check for contamination (sewage/fuel/chemicals) which escalates MINOR to MAJOR',
      'Basement mechanical damage (furnace/boiler/water heater) escalates to MAJOR',
    ],
  },
  {
    type: HomeType.MANUFACTURED,
    label: 'Manufactured/Mobile Home',
    description: 'Factory-built home transported to site',
    keyFeatures: [
      'Built on steel frame/chassis',
      'May be on blocks, piers, or permanent foundation',
      'Has belly board insulation underneath',
      'HUD certification plate',
    ],
    assessmentNotes: [
      'Frame bent/twisted/compromised = DESTROYED (critical indicator)',
      'Displaced from foundation with structural damage = MAJOR',
      'Water in floor system only = MINOR, water in living space = MAJOR',
      'Waterline at or above ceiling = DESTROYED',
    ],
  },
  {
    type: HomeType.MULTI_FAMILY,
    label: 'Multi-Family',
    description: 'Building with multiple dwelling units (treated as conventional for grading)',
    keyFeatures: [
      'Apartments, condos, townhomes, duplexes',
      'Multiple separate living units',
      'Shared structural elements',
    ],
    assessmentNotes: [
      'Can assess whole building OR individual units (units may differ)',
      'Apply conventional home rules for grading',
      'Each unit should be assessed separately when possible',
    ],
  },
  {
    type: HomeType.COMMERCIAL,
    label: 'Commercial',
    description: 'Non-residential building',
    keyFeatures: [
      'Business, retail, industrial use',
      'May have different construction standards',
    ],
    assessmentNotes: [
      'Use same damage criteria as residential',
      'Note business impact in assessment',
    ],
  },
];

// =============================================================================
// REASON CODES FOR TRAINING DATA
// =============================================================================

export const REASON_CODES = {
  // Access/Visibility
  access_blocked: 'Access blocked by floodwater, debris, or infrastructure',
  visibility_not_confirmed: 'Cannot visually confirm damage',

  // Destroyed triggers
  waterline_at_or_above_ceiling: 'Water line at or above ceiling height',
  frame_compromised: 'Frame bent, twisted, or compromised',
  structural_framing_compromised: 'Most structural framing of roof/walls compromised',
  structural_components_failed_count_gte_2: 'Two or more structural components failed',

  // Major triggers
  waterline_at_or_above_outlets: 'Water line at or above electrical outlets',
  waterline_in_living_space_below_ceiling: 'Water in living space below ceiling (manufactured)',
  displaced_from_foundation: 'Residence displaced from foundation/piers',
  roof_substantially_damaged: 'Roof substantially damaged',
  structural_damage_extensive: 'Extensive structural damage requiring major repairs',
  flood_duration_long: 'Long duration flooding (escalation factor)',
  water_contaminated: 'Water contaminated with sewage/fuel/chemicals (escalation factor)',
  basement_mechanical_damage: 'Basement flooding damaged mechanical components (escalation factor)',
  nonstructural_damage_majority: 'Majority of nonstructural components significantly damaged',

  // Minor triggers
  waterline_below_outlets: 'Water line below electrical outlets',
  waterline_in_floor_system_only: 'Water contacted floor system only (manufactured)',
  nonstructural_damage_some: 'Some nonstructural components damaged',
  nonstructural_roof_damage: 'Nonstructural roof component damage',
  drywall_or_insulation_damage: 'Interior wall component damage (drywall/insulation)',
  foundation_cracks_small_multiple: 'Multiple small vertical foundation cracks',
  chimney_damage: 'Chimney damage (tilting/falling/cracking)',
  mechanical_damage: 'Mechanical component damage (HVAC/water heater)',
  well_septic_contamination: 'Well or septic contamination',

  // Affected triggers
  waterline_below_floor_system: 'Water line below floor system (manufactured)',
  waterline_unfinished_basement: 'Water in crawlspace or unfinished basement only',
  cosmetic_only: 'Cosmetic/minimal damage only',
  accessory_structure_only: 'Damage to accessory structures only (not primary residence)',
};

// =============================================================================
// SOURCE ATTRIBUTION
// =============================================================================

export const FEMA_SOURCE = {
  title: 'FEMA Preliminary Damage Assessment Guide',
  date: 'July 2025',
  type: 'Individual Assistance (IA) PDAs',
  applicableTo: ['Manufactured homes', 'Conventionally built homes', 'Multi-family buildings'],
  notes: 'This rubric supports consistent, model-trainable labels with tie-breakers and quality checks.',
};

// =============================================================================
// LEGACY COMPATIBILITY - FEMA_DAMAGE_CRITERIA (updated format)
// =============================================================================

export interface DamageCriteria {
  severity: DamageSeverity;
  label: string;
  description: string;
  conventionalCriteria: string[];
  manufacturedCriteria: string[];
  waterDamageIndicators: string[];
  excludes: string[];
}

export const FEMA_DAMAGE_CRITERIA: DamageCriteria[] = [
  {
    severity: DamageSeverity.INACCESSIBLE,
    label: 'Inaccessible',
    description: 'Damage cannot be visually verified due to blocked access',
    conventionalCriteria: [
      'Access blocked by floodwater, debris, or compromised infrastructure',
      'Roads blocked or bridge out preventing visual inspection',
    ],
    manufacturedCriteria: [
      'Access blocked by floodwater, debris, or compromised infrastructure',
    ],
    waterDamageIndicators: [
      'Standing floodwater prevents access',
    ],
    excludes: [],
  },
  {
    severity: DamageSeverity.AFFECTED,
    label: 'Affected',
    description: 'Cosmetic/minimal damage; essential living space & key systems not impacted',
    conventionalCriteria: [
      'Waterline in crawlspace or unfinished basement only',
      'Damage to attached structures (porch/carport/garage/outbuilding)',
      'Gutters/screens/landscaping/retaining walls/downed trees not affecting access',
      'Cosmetic damage (paint discoloration, loose siding)',
      'Minimal missing shingles/siding',
    ],
    manufacturedCriteria: [
      'Waterline below the floor system with cosmetic damage only',
      'Skirting impacted but home on foundation',
      'Non-access-impacting landscaping/retaining wall/tree damage',
    ],
    waterDamageIndicators: [
      'Water in crawl space or unfinished basement only',
      'Water line below floor system (manufactured)',
      'No damage to essential living space',
    ],
    excludes: [
      'Damage to outbuildings only (does not affect primary residence)',
      'Trees down that have not collapsed into residence',
      'Landscaping or retaining walls only',
    ],
  },
  {
    severity: DamageSeverity.MINOR,
    label: 'Minor',
    description: 'Non-structural damage; structural integrity not affected; repairs needed',
    conventionalCriteria: [
      'Waterline below electrical outlets in lowest floor with essential living space',
      'Nonstructural roof-component damage over essential living spaces',
      'Interior wall component damage (drywall/insulation)',
      'Multiple small vertical foundation cracks',
      'Chimney damage (tilting/falling/cracking/separating)',
      'Mechanical component damage (furnace/boiler/water heater/HVAC)',
      'Well/septic contamination',
    ],
    manufacturedCriteria: [
      'Waterline reached floor system only but NOT entered living space',
      'Bottom-board insulation or ductwork affected',
      'HVAC impacted',
      'Some nonstructural components damaged (windows, doors, wall coverings)',
      'No structural damage and not displaced from foundation',
    ],
    waterDamageIndicators: [
      'Water line below electrical outlets (conventional)',
      'Water contacted floor system but not living space (manufactured)',
      'Note: ESCALATE to MAJOR if contamination, long duration, or basement mechanical damage',
    ],
    excludes: [],
  },
  {
    severity: DamageSeverity.MAJOR,
    label: 'Major',
    description: 'Significant damage requiring extensive repairs; often structural impacts',
    conventionalCriteria: [
      'Waterline at or above electrical outlets in essential living space',
      'Structural damage requiring extensive repairs',
      'Escalated from MINOR due to contamination (sewage/fuel/chemicals)',
      'Escalated from MINOR due to long duration flooding',
      'Escalated from MINOR due to basement mechanical damage',
    ],
    manufacturedCriteria: [
      'Water covered floor system and entered living space but below ceiling',
      'Majority of nonstructural components have significant damage',
      'Roof substantially damaged',
      'Displaced from foundation/block/piers with structural damage',
    ],
    waterDamageIndicators: [
      'Water line at or above electrical outlets (conventional)',
      'Water in living space but below ceiling (manufactured)',
      'Presence of contamination escalates MINOR to MAJOR',
    ],
    excludes: [],
  },
  {
    severity: DamageSeverity.DESTROYED,
    label: 'Destroyed',
    description: 'Total loss; repair not feasible',
    conventionalCriteria: [
      'Waterline at or above ceiling of above-ground essential living space',
      'Failure of two or more structural components',
      'Structure is a total loss',
    ],
    manufacturedCriteria: [
      'Waterline at or above the ceiling',
      'Frame bent, twisted, or otherwise compromised',
      'Most structural framing of roof or walls compromised, exposing interior',
    ],
    waterDamageIndicators: [
      'Water line at or above ceiling height',
      'Complete structural failure from flooding',
    ],
    excludes: [],
  },
  {
    severity: DamageSeverity.UNKNOWN,
    label: 'Unknown',
    description: 'Insufficient evidence to confidently grade',
    conventionalCriteria: [
      'Evidence is contradictory',
      'Required information is missing',
      'Cannot determine home type or incident type',
    ],
    manufacturedCriteria: [
      'Evidence is contradictory',
      'Required information is missing',
    ],
    waterDamageIndicators: [],
    excludes: [],
  },
];

// =============================================================================
// LEGACY COMPATIBILITY - WATER_LINE_GUIDE
// =============================================================================

export const WATER_LINE_GUIDE = {
  // Conventional homes
  crawlSpaceOnly: DamageSeverity.AFFECTED,
  unfinishedBasementOnly: DamageSeverity.AFFECTED,
  belowElectricalOutlets: DamageSeverity.MINOR,
  atOrAboveElectricalOutlets: DamageSeverity.MAJOR,
  atOrAboveCeiling: DamageSeverity.DESTROYED,

  // Manufactured homes
  belowFloorSystem: DamageSeverity.AFFECTED,
  inFloorSystemOnly: DamageSeverity.MINOR,
  inLivingSpaceBelowCeiling: DamageSeverity.MAJOR,
  atOrAboveCeilingManufactured: DamageSeverity.DESTROYED,

  // Escalation factors (MINOR → MAJOR)
  contaminationPresent: 'ESCALATE_TO_MAJOR',
  longDurationFlooding: 'ESCALATE_TO_MAJOR',
  basementMechanicalDamage: 'ESCALATE_TO_MAJOR',
};

import { DamageSeverity, HomeType } from '../types';

/**
 * Official FEMA Damage Assessment Criteria
 * Source: FEMA Damage Assessment Operations Manual (April 2016)
 *
 * These criteria help standardize damage classification across assessments.
 * Claude AI uses these as reference when analyzing damage photos.
 */

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
    severity: DamageSeverity.AFFECTED,
    label: 'Affected',
    description: 'Minimal damage to structure; primarily cosmetic or nonstructural',
    conventionalCriteria: [
      'Damage to soffit, gutters, or trim (nonstructural)',
      'Lost shingles with no structural damage to roof deck',
      'Damage to landscaping or downed trees not affecting structure',
      'Broken windows with no structural damage',
      'Nonstructural components of one wall damaged',
    ],
    manufacturedCriteria: [
      'A portion of roof covering (shingles/metal) has been damaged',
      'Visible water line below the floor system',
      'Nonstructural components of one wall damaged (siding, trim)',
      'Skirting damaged but home on foundation',
    ],
    waterDamageIndicators: [
      'Water line in crawl space or basement only',
      'Water line below floor system',
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
    description: 'Some structural damage; home is habitable with repairs',
    conventionalCriteria: [
      'Partial roof damage (covering damaged but structural ribbing intact)',
      'Water line below 18 inches on first floor',
      'One wall has sustained structural damage',
      'Foundation cracking without displacement',
      'Chimney damage',
    ],
    manufacturedCriteria: [
      'Roof covering damaged but structural ribbing intact',
      'Water has contacted floor system (belly board, ductwork, subflooring)',
      'Visible water line below the floor system with damage to skirting',
      'Minor foundation displacement (still on blocks/piers)',
    ],
    waterDamageIndicators: [
      'Water line below 18 inches on first floor',
      'Water contacted floor system but not living space',
      'Basement/crawl space flooded but first floor dry',
    ],
    excludes: [
      'Tarp-covered roof after minor shingle loss (still Affected)',
    ],
  },
  {
    severity: DamageSeverity.MAJOR,
    label: 'Major',
    description: 'Significant structural damage; uninhabitable without major repairs',
    conventionalCriteria: [
      'Roof covering missing AND some structural ribbing collapsed',
      'Water line 18 inches or higher on first floor',
      'Water line above electrical outlets',
      'Foundation shifted or cracked significantly',
      'Two or more walls have structural damage',
      'Multi-unit buildings: assess each unit separately',
    ],
    manufacturedCriteria: [
      'Much of roof missing but structural ribbing still intact',
      'Visible water line above the floor system',
      'Home displaced from foundation/blocks/piers with repairable damage',
      'Water has contacted belly board insulation, ductwork, and subflooring',
    ],
    waterDamageIndicators: [
      'Water line 18+ inches on first floor',
      'Water line above electrical outlets',
      'Water line on first floor when basement is completely full',
      'Standing water damage to essential living space',
    ],
    excludes: [],
  },
  {
    severity: DamageSeverity.DESTROYED,
    label: 'Destroyed',
    description: 'Total loss; structure is not economically repairable',
    conventionalCriteria: [
      'Foundation and two or more walls have failed',
      'Structure has collapsed',
      'Roof and walls compromised AND off foundation',
      'Structure is a total loss',
      'Frame is bent, twisted, or otherwise compromised',
    ],
    manufacturedCriteria: [
      'Frame is bent, twisted, or otherwise compromised',
      'Roof covering AND structural ribbing collapsed for majority of roof',
      'Missing roof AND at least two walls',
      'Home is off foundation with frame damage',
      'Structure is a total loss',
    ],
    waterDamageIndicators: [
      'Complete structural failure from flooding',
      'Storm surge has destroyed foundation and walls',
    ],
    excludes: [],
  },
];

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
      'Assess roof structure separately from covering',
      'Check foundation for cracks and displacement',
      'Water line height is key for flood damage classification',
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
      'Frame integrity is critical - bent frame = Destroyed',
      'Check if home is displaced from foundation',
      'Water damage to belly board affects classification',
      'Roof structural ribbing vs. covering distinction important',
    ],
  },
  {
    type: HomeType.MULTI_FAMILY,
    label: 'Multi-Family',
    description: 'Building with multiple dwelling units',
    keyFeatures: [
      'Apartments, condos, townhomes, duplexes',
      'Multiple separate living units',
      'Shared structural elements',
    ],
    assessmentNotes: [
      'Each unit should be assessed separately',
      'Units in same building may have different damage levels',
      'Count affected units for reporting',
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

/**
 * Quick reference for water line damage classification
 */
export const WATER_LINE_GUIDE = {
  crawlSpaceOnly: DamageSeverity.AFFECTED,
  belowFloorSystem: DamageSeverity.AFFECTED,
  contactedFloorSystem: DamageSeverity.MINOR,
  under18Inches: DamageSeverity.MINOR,
  over18Inches: DamageSeverity.MAJOR,
  aboveElectricalOutlets: DamageSeverity.MAJOR,
  firstFloorWithFullBasement: DamageSeverity.MAJOR,
};

/**
 * Source attribution
 */
export const FEMA_SOURCE = {
  title: 'FEMA Damage Assessment Operations Manual',
  date: 'April 5, 2016',
  pages: '52-54',
  url: 'https://www.fema.gov/sites/default/files/2020-07/fema_damage-assessment-operations-manual.pdf',
};

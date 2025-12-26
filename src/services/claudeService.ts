import Anthropic from '@anthropic-ai/sdk';
import { DamageAnalysis, DamageSeverity, DebrisType, HomeType, IncidentType, Detection } from '../types';

let anthropicClient: Anthropic | null = null;

// Auto-initialize from environment variable if available
const envApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
if (envApiKey) {
  anthropicClient = new Anthropic({ apiKey: envApiKey, dangerouslyAllowBrowser: true });
}

export function initializeClaude(apiKey: string): void {
  anthropicClient = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export function isClaudeInitialized(): boolean {
  return anthropicClient !== null;
}

export function getApiKeyFromEnv(): string | undefined {
  return import.meta.env.VITE_ANTHROPIC_API_KEY;
}

/**
 * FEMA Preliminary Damage Assessment (PDA) System Prompt
 * Based on FEMA Preliminary Damage Assessment Guide (July 2025)
 * For Individual Assistance (IA) residential structure damage assessment
 */
const SYSTEM_PROMPT = `You are an expert FEMA Preliminary Damage Assessment (PDA) inspector following the FEMA PDA Guide (July 2025). Your job is to provide ACCURATE, CONSISTENT damage assessments for Individual Assistance (IA).

═══════════════════════════════════════════════════════════════════════════════
SEVERITY LABELS (ordered by severity - always choose HIGHEST applicable)
═══════════════════════════════════════════════════════════════════════════════

| Label | Rank | Meaning |
|-------|------|---------|
| INACCESSIBLE | 5 | Cannot visually verify damage (access blocked by floodwater, debris, roads/bridges out) |
| DESTROYED | 4 | Total loss / repair not feasible |
| MAJOR | 3 | Significant damage requiring extensive repairs; often structural impacts |
| MINOR | 2 | Non-structural damage; structural integrity not affected; repairs needed |
| AFFECTED | 1 | Cosmetic/minimal damage; essential living space & key systems not impacted |
| UNKNOWN | 0 | Insufficient evidence to confidently grade (use only when required evidence is missing) |

═══════════════════════════════════════════════════════════════════════════════
GLOBAL DECISION ORDER (always apply in this order to prevent under-grading)
═══════════════════════════════════════════════════════════════════════════════

1. INACCESSIBLE → if cannot visually verify
2. DESTROYED → if ANY destroyed criteria are met
3. MAJOR → if ANY major criteria are met
4. MINOR → if ANY minor criteria are met
5. AFFECTED → otherwise, if minimal/cosmetic
6. UNKNOWN → only if evidence is insufficient

═══════════════════════════════════════════════════════════════════════════════
STEP 1: IDENTIFY HOME TYPE
═══════════════════════════════════════════════════════════════════════════════

🏠 MANUFACTURED/MOBILE HOME indicators:
- Built on steel frame/chassis
- May be on blocks, piers, or permanent foundation
- Has belly board insulation underneath
- Single-wide or double-wide
- HUD certification plate

🏡 CONVENTIONAL (STICK-BUILT) HOME indicators:
- Permanent foundation (slab, crawl space, or basement)
- Wood or steel frame construction
- Site-built walls, roof, and floors

🏢 MULTI-FAMILY: Apartments, condos, townhomes, duplexes (use conventional rules)

═══════════════════════════════════════════════════════════════════════════════
STEP 2: DETERMINE INCIDENT TYPE (FLOOD vs NON-FLOOD)
═══════════════════════════════════════════════════════════════════════════════

🌊 FLOOD INDICATORS:
- Water stain line / mud line on exterior walls
- Debris line (leaves, grass, sediment) at consistent height
- FEMA inspection markings
- Debris piled against structure
- Discoloration band on siding/brick

🌪️ NON-FLOOD INDICATORS:
- Wind damage, tornado, hurricane (non-surge)
- Tree/debris impact
- Fire damage
- Structural collapse without water

═══════════════════════════════════════════════════════════════════════════════
MANUFACTURED HOME GRADING RULES
═══════════════════════════════════════════════════════════════════════════════

📊 AFFECTED (manufactured):
- FLOOD: Waterline BELOW floor system + cosmetic damage only (skirting)
- NON-FLOOD: Cosmetic-only damage, non-access-impacting debris

📊 MINOR (manufactured):
- FLOOD: Waterline in FLOOR SYSTEM ONLY (not living space); bottom-board/ductwork/HVAC affected
- NON-FLOOD: Some nonstructural damage (windows, doors, wall coverings, ductwork, HVAC)
- MUST NOT be displaced from foundation or have structural damage

📊 MAJOR (manufactured):
- FLOOD: Water ENTERED LIVING SPACE but BELOW CEILING
- NON-FLOOD: Majority of nonstructural components significantly damaged; roof substantially damaged
- DISPLACED from foundation/piers WITH structural damage

📊 DESTROYED (manufactured) - ANY of these triggers:
- Waterline AT OR ABOVE CEILING
- Frame BENT, TWISTED, or COMPROMISED
- Most STRUCTURAL FRAMING of roof/walls compromised, exposing interior

═══════════════════════════════════════════════════════════════════════════════
CONVENTIONAL/MULTI-FAMILY GRADING RULES
═══════════════════════════════════════════════════════════════════════════════

📊 AFFECTED (conventional):
- FLOOD: Waterline in CRAWLSPACE or UNFINISHED BASEMENT only
- Damage to attached structures (porch/carport/garage) but essential living space OK
- Cosmetic damage, minimal missing shingles/siding

📊 MINOR (conventional):
- FLOOD: Waterline BELOW ELECTRICAL OUTLETS in lowest essential living floor
- NON-FLOOD: Nonstructural roof damage, drywall/insulation damage, small foundation cracks
- Chimney damage, mechanical damage (HVAC/water heater), well/septic contamination

⚠️ ESCALATE MINOR → MAJOR if:
- Long duration flooding
- Contaminants present (sewage, heating fuel, chemicals)
- Basement mechanical damage (furnace/boiler/water heater)

📊 MAJOR (conventional):
- FLOOD: Waterline AT OR ABOVE ELECTRICAL OUTLETS
- Structural damage requiring extensive repairs
- Escalated from MINOR due to contamination/duration/mechanical damage

📊 DESTROYED (conventional) - ANY of these triggers:
- Waterline AT OR ABOVE CEILING of above-ground essential living space
- FAILURE of TWO OR MORE STRUCTURAL COMPONENTS
- Total loss / repair not feasible

═══════════════════════════════════════════════════════════════════════════════
WATER LINE HEIGHT REFERENCES
═══════════════════════════════════════════════════════════════════════════════

Use these reference points to estimate water line height:
- Electrical outlets: 12-18 inches from floor
- Door handle: ~36 inches
- Window sill: ~30-36 inches
- Light switch: ~48 inches
- Electrical panel: ~60 inches

MANUFACTURED HOMES (water line severity):
- Below floor system → AFFECTED
- In floor system only → MINOR
- In living space, below ceiling → MAJOR
- At or above ceiling → DESTROYED

CONVENTIONAL HOMES (water line severity):
- Crawlspace/unfinished basement only → AFFECTED
- Below electrical outlets → MINOR
- At or above electrical outlets → MAJOR
- At or above ceiling → DESTROYED

═══════════════════════════════════════════════════════════════════════════════
TIE-BREAKER RULES (when multiple labels seem plausible)
═══════════════════════════════════════════════════════════════════════════════

Always use the HIGHEST severity supported by evidence:
- If ANY DESTROYED trigger exists → DESTROYED
- If ANY MAJOR trigger exists → MAJOR
- If ONLY nonstructural indicators → MINOR
- If COSMETIC/minimal only → AFFECTED
- If evidence is CONTRADICTORY or MISSING → UNKNOWN + flag for review

═══════════════════════════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════════════════════════

🏠 ONLY THE PRIMARY DWELLING COUNTS
Damage to accessory structures (screen enclosures, detached garages, sheds, fences, pool cages) does NOT affect classification. If main house is intact but accessory damaged → AFFECTED

🌳 TREE/DEBRIS ASSESSMENT
- Tree in YARD (not touching structure) → AFFECTED
- Tree LEANING on structure (not through) → MINOR
- Tree PENETRATED THROUGH structure → MAJOR

🚫 ERRORS TO AVOID:
❌ Classifying flood-damaged homes as AFFECTED (if water entered, minimum is MINOR)
❌ Seeing tree and assuming it hit house (verify breach)
❌ Using MAJOR when structure has collapsed (that's DESTROYED)
❌ Ignoring escalation factors (contamination, duration, mechanical damage)
❌ Forgetting frame damage = DESTROYED for manufactured homes

RESPONSE FORMAT: Valid JSON only.`;

const ANALYSIS_SCHEMA = `{
  "overallSeverity": "INACCESSIBLE" | "DESTROYED" | "MAJOR" | "MINOR" | "AFFECTED" | "NO_VISIBLE_DAMAGE" | "UNKNOWN",
  "incidentType": "FLOOD" | "NON_FLOOD",
  "summary": "One sentence summary starting with severity level, e.g., 'MAJOR: Water line at outlet height indicates significant flood damage'",
  "structuralAssessment": "Status of the envelope - walls, roof, foundation. Is it intact, damaged, or breached?",
  "debrisAssessment": "What debris is visible? Is it structural (from the house) or household (contents/cleanup)?",
  "pdaJustification": "Step-by-step reasoning following FEMA July 2025 decision order",
  "homeType": "CONVENTIONAL" | "MANUFACTURED" | "MULTI_FAMILY" | "COMMERCIAL" | "NONE",
  "floodEvidence": {
    "waterLineDetected": true/false,
    "waterLineReference": "below_floor_system" | "in_floor_system_only" | "in_living_space_below_ceiling" | "at_or_above_ceiling" | "unfinished_basement_only" | "below_outlets" | "at_or_above_outlets" | null,
    "estimatedHeightInches": number or null,
    "contaminationPresent": true/false,
    "longDurationFlooding": true/false,
    "basementMechanicalDamage": true/false
  },
  "structuralIndicators": {
    "roofDamage": "none" | "covering_only" | "structural_ribbing" | "collapsed",
    "wallDamage": "none" | "nonstructural" | "structural" | "collapsed",
    "foundationStatus": "intact" | "cracked" | "displaced" | "failed",
    "frameCompromised": true/false,
    "displacedFromFoundation": true/false,
    "structuralComponentsFailedCount": number
  },
  "reasonCodes": ["waterline_at_or_above_outlets", "contamination_present", ...],
  "detections": [
    {
      "object": "Name of damaged item or debris",
      "type": "VEGETATION" | "STRUCTURAL" | "VEHICLE" | "FLOOD" | "INFRASTRUCTURE" | "HOUSEHOLD" | "UNKNOWN",
      "severity": "INACCESSIBLE" | "DESTROYED" | "MAJOR" | "MINOR" | "AFFECTED" | "NO_VISIBLE_DAMAGE" | "UNKNOWN",
      "description": "Brief description of this specific damage",
      "confidence": 85
    }
  ],
  "recommendations": ["Action item 1", "Action item 2"],
  "confidence": 90,
  "accessBlocked": true/false
}`;

export async function analyzeImage(base64Image: string): Promise<DamageAnalysis> {
  if (!anthropicClient) {
    throw new Error('Claude API not initialized. Please set your API key in settings.');
  }

  // Extract base64 data if it includes the data URL prefix
  const imageData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  // Determine media type
  let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
  if (base64Image.includes('data:image/png')) mediaType = 'image/png';
  else if (base64Image.includes('data:image/gif')) mediaType = 'image/gif';
  else if (base64Image.includes('data:image/webp')) mediaType = 'image/webp';

  try {
    const response = await anthropicClient.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageData,
              },
            },
            {
              type: 'text',
              text: `Analyze this disaster damage photograph for FEMA PDA Individual Assistance (IA) assessment using the FEMA PDA Guide (July 2025).

═══════════════════════════════════════════════════════════════════════════════
MANDATORY ASSESSMENT STEPS (follow in order)
═══════════════════════════════════════════════════════════════════════════════

STEP 1: ACCESS CHECK
- Can you visually verify the damage? If NO → INACCESSIBLE

STEP 2: HOME TYPE IDENTIFICATION
- Is this MANUFACTURED (mobile home, on piers/blocks, steel frame) or CONVENTIONAL (stick-built, permanent foundation)?
- Multi-family buildings use CONVENTIONAL rules

STEP 3: INCIDENT TYPE DETERMINATION
- Look for FLOOD indicators: water stain line, mud line, debris line on walls
- If no flood evidence → NON-FLOOD incident

STEP 4: APPLY GRADING RULES (in order - stop at first match)

FOR MANUFACTURED HOMES:
- Frame bent/twisted/compromised? → DESTROYED
- Water at/above ceiling? → DESTROYED
- Structural framing of roof/walls exposed? → DESTROYED
- Water in living space (below ceiling)? → MAJOR
- Displaced from foundation with structural damage? → MAJOR
- Roof substantially damaged? → MAJOR
- Water in floor system only (not living space)? → MINOR
- Some nonstructural damage, not displaced? → MINOR
- Cosmetic only, water below floor system? → AFFECTED

FOR CONVENTIONAL HOMES:
- Two+ structural components failed? → DESTROYED
- Water at/above ceiling of essential living space? → DESTROYED
- Water at/above electrical outlets? → MAJOR
- Structural damage requiring extensive repairs? → MAJOR
- ESCALATION: Minor + contamination/long duration/basement mechanical damage? → MAJOR
- Water below outlets? → MINOR
- Nonstructural damage (roof covering, drywall, chimney, HVAC)? → MINOR
- Crawlspace/unfinished basement water only? → AFFECTED
- Cosmetic damage only? → AFFECTED

STEP 5: TIE-BREAKER
- If multiple categories apply, use HIGHEST severity
- If evidence contradictory or insufficient → UNKNOWN

═══════════════════════════════════════════════════════════════════════════════
WATER LINE REFERENCE HEIGHTS
═══════════════════════════════════════════════════════════════════════════════
- Electrical outlets: 12-18 inches
- Door handle: ~36 inches
- Window sill: ~30-36 inches
- Light switch: ~48 inches

RESPOND ONLY WITH VALID JSON matching this schema:
${ANALYSIS_SCHEMA}

In your pdaJustification, include:
1. "Home Type: [MANUFACTURED/CONVENTIONAL]"
2. "Incident Type: [FLOOD/NON-FLOOD]"
3. "Water Line Check: [not detected / below outlets / at or above outlets / at or above ceiling]"
4. "Structural Assessment: [roof, walls, foundation, frame status]"
5. "Decision Path: [which rule triggered the classification]"
6. "Reason Codes: [list applicable codes]"`,
            },
          ],
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract text content
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON response - handle various formats Claude might return
    let jsonStr = textContent.text.trim();

    // Handle markdown code blocks if present
    if (jsonStr.includes('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        jsonStr = match[1].trim();
      }
    }

    // If response doesn't start with {, try to find JSON object in the text
    if (!jsonStr.startsWith('{')) {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      } else {
        throw new Error('No valid JSON found in Claude response');
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Validate and construct the analysis object with July 2025 FEMA PDA fields
    const analysis: DamageAnalysis = {
      overallSeverity: validateSeverity(parsed.overallSeverity),
      incidentType: validateIncidentType(parsed.incidentType),
      summary: parsed.summary || 'Analysis completed',
      structuralAssessment: parsed.structuralAssessment || 'Not assessed',
      debrisAssessment: parsed.debrisAssessment || 'Not assessed',
      pdaJustification: parsed.pdaJustification || 'No justification provided',
      homeType: validateHomeType(parsed.homeType),
      floodEvidence: parsed.floodEvidence ? {
        waterLineDetected: Boolean(parsed.floodEvidence.waterLineDetected),
        waterLineReference: parsed.floodEvidence.waterLineReference || undefined,
        estimatedHeightInches: parsed.floodEvidence.estimatedHeightInches || undefined,
        contaminationPresent: Boolean(parsed.floodEvidence.contaminationPresent),
        longDurationFlooding: Boolean(parsed.floodEvidence.longDurationFlooding),
        basementMechanicalDamage: Boolean(parsed.floodEvidence.basementMechanicalDamage),
      } : undefined,
      structuralIndicators: parsed.structuralIndicators ? {
        roofDamage: parsed.structuralIndicators.roofDamage || 'none',
        wallDamage: parsed.structuralIndicators.wallDamage || 'none',
        foundationStatus: parsed.structuralIndicators.foundationStatus || 'intact',
        frameCompromised: Boolean(parsed.structuralIndicators.frameCompromised),
        displacedFromFoundation: Boolean(parsed.structuralIndicators.displacedFromFoundation),
        structuralComponentsFailedCount: parsed.structuralIndicators.structuralComponentsFailedCount || 0,
      } : undefined,
      detections: validateDetections(parsed.detections || []),
      recommendations: parsed.recommendations || [],
      reasonCodes: parsed.reasonCodes || [],
      confidence: Math.min(100, Math.max(0, parsed.confidence || 75)),
      analysisTimestamp: Date.now(),
      accessBlocked: Boolean(parsed.accessBlocked),
    };

    return analysis;
  } catch (error) {
    console.error('Claude analysis error:', error);
    throw error;
  }
}

function validateSeverity(severity: string): DamageSeverity {
  const valid = Object.values(DamageSeverity);
  if (valid.includes(severity as DamageSeverity)) {
    return severity as DamageSeverity;
  }
  return DamageSeverity.NO_VISIBLE_DAMAGE;
}

function validateHomeType(homeType: string): HomeType {
  const valid = Object.values(HomeType);
  if (valid.includes(homeType as HomeType)) {
    return homeType as HomeType;
  }
  return HomeType.CONVENTIONAL;
}

function validateIncidentType(incidentType: string): IncidentType {
  const valid = Object.values(IncidentType);
  if (valid.includes(incidentType as IncidentType)) {
    return incidentType as IncidentType;
  }
  return IncidentType.NON_FLOOD;
}

function validateDebrisType(type: string): DebrisType {
  const valid = Object.values(DebrisType);
  if (valid.includes(type as DebrisType)) {
    return type as DebrisType;
  }
  return DebrisType.UNKNOWN;
}

function validateDetections(detections: any[]): Detection[] {
  return detections.map(d => ({
    object: d.object || 'Unknown',
    type: validateDebrisType(d.type),
    severity: validateSeverity(d.severity),
    description: d.description || '',
    confidence: Math.min(100, Math.max(0, d.confidence || 75)),
  }));
}

// Utility to compress image before sending
export function compressImage(base64: string, maxWidth: number = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64;
  });
}

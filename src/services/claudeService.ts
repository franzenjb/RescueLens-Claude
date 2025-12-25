import Anthropic from '@anthropic-ai/sdk';
import { DamageAnalysis, DamageSeverity, DebrisType, HomeType, Detection } from '../types';

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

const SYSTEM_PROMPT = `You are an expert FEMA Preliminary Damage Assessment (PDA) inspector. Your job is to provide ACCURATE, CONSERVATIVE damage assessments.

⚠️⚠️⚠️ CRITICAL RULE: DEFAULT TO "AFFECTED" ⚠️⚠️⚠️
Unless you have UNDENIABLE VISUAL PROOF of structural damage, classify as AFFECTED.
AFFECTED is the correct classification for 80% of post-disaster images.

🛑 STOP AND CHECK: TREE IMAGES
If you see a fallen tree in the image, ask yourself:
1. Can I see the tree trunk/branches PHYSICALLY INSIDE the house? (through a hole in roof/wall)
2. Can I see a HOLE or BREACH in the roof/wall where the tree went through?
3. Is there RUBBLE, DEBRIS, or BROKEN STRUCTURE around the impact point?

If you answered NO to all three → The tree is in the YARD → Classify as AFFECTED
A tree lying on grass, even if NEAR a house, is YARD DEBRIS, not structural damage.

🔍 STEP 1: IDENTIFY THE STRUCTURE
First, locate and assess the PRIMARY STRUCTURE (house/building):
- Look at the ROOF: Are the lines straight? Any visible holes or missing sections?
- Look at the WALLS: Are they vertical? Any collapse or large holes?
- Look at WINDOWS/DOORS: Are they in their frames?

If the structure looks INTACT → Maximum severity is AFFECTED or MINOR

🔍 STEP 2: LOCATE THE DEBRIS (SEPARATE FROM STRUCTURE)
Now look at WHERE debris is located:
- ON THE GROUND (yard, street, driveway) → Does NOT affect structure → AFFECTED
- LEANING AGAINST structure but not through it → MINOR
- CLEARLY PENETRATED THROUGH structure (visible breach) → MAJOR

📊 SEVERITY LEVELS:

1. NO_VISIBLE_DAMAGE - Normal appearance

2. AFFECTED (Use when structure is INTACT but debris present)
   ✓ Tree/debris in YARD, structure INTACT
   ✓ Vegetation debris anywhere not on structure
   ✓ Minor cosmetic issues (shutters, gutters, landscaping)
   ✓ House visible and looking UNDAMAGED

3. MINOR - Surface/Cosmetic Damage to Structure
   - Missing shingles (but roof deck intact)
   - Broken windows, damaged siding
   - Tree touching/leaning on structure (not through it)
   - FLOOD: Water line visible INSIDE house but LESS than 36 inches (3 feet) high

4. MAJOR - Significant Structural Damage (Partial)
   - Hole in roof or wall with interior visible
   - Tree/debris penetrated through structure
   - Partial roof collapse (but some walls standing)
   - Structure damaged but still recognizable as a building
   - FLOOD: Water line visible INSIDE house MORE than 36 inches (3 feet) high

5. DESTROYED - Total Loss (Use when building form is GONE)
   ✓ Structure has COLLAPSED - no longer looks like a building
   ✓ Roof COMPLETELY gone AND most walls gone
   ✓ Only foundation/slab remains with debris pile
   ✓ Structural debris (framing, roofing) scattered across yard
   ✓ Building has lost its original form entirely

   KEY: If you see a DEBRIS FIELD of building materials where a house USED to be, that's DESTROYED.

🚫 CRITICAL ERRORS TO AVOID:
❌ Seeing a tree and assuming it hit the house (check if structure is intact)
❌ Saying "tree fell onto house" when tree is clearly in the yard
❌ Classifying yard debris as structural damage
❌ Using MAJOR when structure has completely collapsed (that's DESTROYED)
❌ Using MAJOR when you cannot see actual structural damage (that's AFFECTED)

✅ QUICK DECISION GUIDE:
- Structure looks NORMAL with debris in yard? → AFFECTED
- Structure has HOLES but is still standing? → MAJOR
- Structure has COLLAPSED into debris pile? → DESTROYED
- FLOOD water line INSIDE house < 36 inches? → MINOR
- FLOOD water line INSIDE house > 36 inches? → MAJOR

RESPONSE FORMAT: Valid JSON only.`;

const ANALYSIS_SCHEMA = `{
  "overallSeverity": "NO_VISIBLE_DAMAGE" | "AFFECTED" | "MINOR" | "MAJOR" | "DESTROYED",
  "summary": "One sentence summary starting with severity level, e.g., 'MAJOR: Tree crashed through roof creating structural breach'",
  "structuralAssessment": "Status of the envelope - walls, roof, foundation. Is it intact, damaged, or breached?",
  "debrisAssessment": "What debris is visible? Is it structural (from the house) or household (contents/cleanup)?",
  "pdaJustification": "Explain step-by-step why you chose this severity. Address: 1) Envelope status, 2) Debris type, 3) Habitability",
  "homeType": "CONVENTIONAL" | "MANUFACTURED" | "MULTI_FAMILY" | "COMMERCIAL" | "NONE",
  "detections": [
    {
      "object": "Name of damaged item or debris",
      "type": "VEGETATION" | "STRUCTURAL" | "VEHICLE" | "FLOOD" | "INFRASTRUCTURE" | "HOUSEHOLD" | "UNKNOWN",
      "severity": "NO_VISIBLE_DAMAGE" | "AFFECTED" | "MINOR" | "MAJOR" | "DESTROYED",
      "description": "Brief description of this specific damage",
      "confidence": 85
    }
  ],
  "recommendations": ["Action item 1", "Action item 2"],
  "confidence": 90
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
      model: 'claude-sonnet-4-20250514',
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
              text: `Analyze this disaster damage photograph for FEMA PDA assessment.

🛑 MANDATORY PRE-ASSESSMENT CHECKLIST:
Before choosing a severity level, you MUST answer these questions:

Q1: Is there a STRUCTURE (house/building) visible in this image?
Q2: Does the structure's ROOF have any visible HOLES or MISSING SECTIONS?
Q3: Do any WALLS show COLLAPSE, HOLES, or STRUCTURAL FAILURE?
Q4: If there is debris (tree, etc.), is it:
    (a) In the YARD/STREET (not touching structure) → AFFECTED
    (b) LEANING on structure (not through it) → MINOR
    (c) PENETRATED THROUGH structure (visible breach) → MAJOR
Q5: If there is FLOOD DAMAGE with visible water line INSIDE the house:
    (a) Water line LESS than 36 inches (3 feet) high → MINOR
    (b) Water line MORE than 36 inches (3 feet) high → MAJOR

⚠️ CRITICAL: If the house in the background looks INTACT with straight roof lines and standing walls, the maximum severity is AFFECTED or MINOR, regardless of yard debris.

⚠️ FLOOD RULE: The 36-inch threshold is critical. Look for water stains, mud lines, or debris lines on interior walls to estimate flood height.

⚠️ A fallen tree in the FRONT YARD with an intact house behind it = AFFECTED (not MAJOR!)

RESPOND ONLY WITH VALID JSON matching this schema:
${ANALYSIS_SCHEMA}

In your pdaJustification, you MUST explicitly state:
1. "Structure assessment: [intact/damaged/breached]"
2. "Debris location: [yard/street/on structure/through structure]"
3. "Roof status: [intact/damaged/breached]"
4. "Wall status: [intact/damaged/collapsed]"
5. "Flood water line: [none/below 36 inches/above 36 inches]" (if flood damage present)
6. "Why I did NOT choose a higher severity: [reason]"`,
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

    // Validate and construct the analysis object
    const analysis: DamageAnalysis = {
      overallSeverity: validateSeverity(parsed.overallSeverity),
      summary: parsed.summary || 'Analysis completed',
      structuralAssessment: parsed.structuralAssessment || 'Not assessed',
      debrisAssessment: parsed.debrisAssessment || 'Not assessed',
      pdaJustification: parsed.pdaJustification || 'No justification provided',
      homeType: validateHomeType(parsed.homeType),
      detections: validateDetections(parsed.detections || []),
      recommendations: parsed.recommendations || [],
      confidence: Math.min(100, Math.max(0, parsed.confidence || 75)),
      analysisTimestamp: Date.now(),
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

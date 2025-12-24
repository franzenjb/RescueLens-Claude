import Anthropic from '@anthropic-ai/sdk';
import { DamageAnalysis, DamageSeverity, DebrisType, HomeType, Detection } from '../types';

let anthropicClient: Anthropic | null = null;

export function initializeClaude(apiKey: string): void {
  anthropicClient = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export function isClaudeInitialized(): boolean {
  return anthropicClient !== null;
}

const SYSTEM_PROMPT = `You are an expert FEMA Preliminary Damage Assessment (PDA) inspector. Your job is to provide ACCURATE, CONSERVATIVE damage assessments.

⚠️ CRITICAL: DO NOT HALLUCINATE OR ASSUME DAMAGE ⚠️
- Only report damage you can ACTUALLY SEE in the image
- If a tree is in the YARD, it is NOT on the house
- If the roof looks INTACT, it IS intact
- When in doubt, choose the LOWER severity level

🔍 STEP 1: LOCATE THE DEBRIS/HAZARD
Before assessing damage, you MUST determine WHERE debris is located:
- Is the tree/debris IN THE YARD (on grass, driveway, street)? → AFFECTED
- Is the tree/debris LEANING ON the house but not through it? → MINOR
- Is the tree/debris PHYSICALLY THROUGH the roof/walls? → MAJOR
- Can you see daylight/sky through holes in the structure? → MAJOR

🏠 STEP 2: EXAMINE THE STRUCTURE SEPARATELY
Look at the house INDEPENDENTLY of any debris:
- Are ALL roof lines straight and intact?
- Are ALL walls standing vertical?
- Are windows/doors in their frames?
- Do you see any holes, collapse, or structural deformation?

If the structure looks intact, it probably IS intact, even if there's debris nearby.

📊 SEVERITY LEVELS (BE CONSERVATIVE):

1. NO_VISIBLE_DAMAGE - Structure and yard appear normal

2. AFFECTED (Most Common for Yard Debris)
   - Tree fallen IN YARD, NOT touching house
   - Debris piles at curb or in driveway
   - Standing water in yard only
   - House structure is COMPLETELY INTACT

3. MINOR - Cosmetic/Surface Damage
   - Missing shingles, damaged siding, broken windows
   - Tree LEANING on house or touching roof edge
   - Porch/awning damage
   - Structure is sound, home is habitable

4. MAJOR - Structural Breach (RARE - requires clear evidence)
   - Tree has PENETRATED THROUGH roof into interior
   - Visible holes in roof where you can see inside
   - Collapsed walls or roof sections
   - MUST have clear visual proof of breach

5. DESTROYED - Total Loss
   - Only foundation remains
   - Structure is flattened/collapsed

🚫 COMMON MISTAKES TO AVOID:
- Seeing a fallen tree and assuming it hit the house (CHECK LOCATION)
- Over-classifying yard debris as structural damage
- Assuming damage you cannot clearly see
- Confusing perspective (tree in foreground vs on structure)

RESPONSE FORMAT: Valid JSON only. Be precise and conservative.`;

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

BEFORE YOU RESPOND, answer these questions mentally:
1. WHERE is the debris located? (yard, street, on structure, through structure?)
2. Is the ROOF intact? (straight lines, no visible holes?)
3. Are the WALLS intact? (standing vertical, no collapse?)
4. Can you ACTUALLY SEE structural damage, or are you assuming it?

⚠️ A tree in the FRONT YARD is NOT damage to the house - that's AFFECTED.
⚠️ Only classify as MAJOR if you can SEE the breach/penetration.

RESPOND ONLY WITH VALID JSON matching this schema:
${ANALYSIS_SCHEMA}

In your pdaJustification, you MUST state:
1. Exact location of debris (yard/street/on structure/through structure)
2. Whether roof lines are intact or broken
3. Whether walls show any collapse or breach
4. Why you chose this severity over a lower one`,
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

    // Parse JSON response
    let jsonStr = textContent.text.trim();

    // Handle markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
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

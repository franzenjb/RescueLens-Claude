import Anthropic from '@anthropic-ai/sdk';
import { DamageAnalysis, DamageSeverity, DebrisType, HomeType, Detection } from '../types';

let anthropicClient: Anthropic | null = null;

export function initializeClaude(apiKey: string): void {
  anthropicClient = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export function isClaudeInitialized(): boolean {
  return anthropicClient !== null;
}

const SYSTEM_PROMPT = `You are an expert FEMA Preliminary Damage Assessment (PDA) inspector with extensive field experience. Your task is to analyze disaster damage photographs and provide accurate, consistent damage assessments.

CRITICAL RULES - THE DEBRIS PILE TRAP:
A pile of household items (furniture, drywall, appliances) at the curb or in the yard is often a sign of CLEANUP, not severe damage. If the house structure behind the pile has intact walls and roof, the damage is likely MINOR or AFFECTED, not MAJOR.

STRUCTURAL ENVELOPE ASSESSMENT (MOST IMPORTANT):
The "envelope" is the protective shell of the home - walls, roof, and foundation. Your PRIMARY task is to assess envelope integrity:
- INTACT envelope = home is habitable (AFFECTED, MINOR, or NO_VISIBLE_DAMAGE)
- BREACHED envelope = home is NOT habitable (MAJOR or DESTROYED)

DAMAGE SEVERITY HIERARCHY:

1. NO_VISIBLE_DAMAGE (Green)
   - Structure and surroundings appear pristine
   - No debris, no damage indicators visible

2. AFFECTED (Blue) - Environmental/Cleanup Phase
   - Debris piles at curb (household items being discarded)
   - Fallen trees in yard NOT touching the structure
   - Standing water in yard/street only
   - Envelope is FULLY INTACT

3. MINOR (Yellow) - Superficial Structural Damage
   - Damage to non-load-bearing elements: siding, shingles, gutters, windows, porch
   - Small roof punctures from branches (can be tarped)
   - Envelope is MOSTLY INTACT - home is safe to occupy
   - Repairs needed but structure is sound

4. MAJOR (Orange) - Structural Breach
   - The envelope is BREACHED
   - Roof trusses snapped or large section of roof missing
   - Load-bearing wall collapsed or severely damaged
   - Tree physically INSIDE the living space
   - Interior water lines > 18 inches
   - Home is NOT safe to occupy

5. DESTROYED (Red) - Total Loss
   - Foundation is all that remains
   - Structure is collapsed/flattened
   - Complete structural failure

RESPONSE FORMAT:
You must respond with a valid JSON object containing your analysis. Be precise and consistent.`;

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
              text: `Analyze this disaster damage photograph and provide a FEMA PDA assessment.

RESPOND ONLY WITH VALID JSON matching this schema:
${ANALYSIS_SCHEMA}

Remember:
- Debris at curb ≠ structural damage
- Focus on the ENVELOPE (walls, roof, foundation)
- Be conservative - don't over-classify damage
- Explain your reasoning clearly in pdaJustification`,
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

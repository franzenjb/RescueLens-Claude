/**
 * Critic Service - The "Ruthless QA Manager"
 *
 * This service analyzes voice bot call transcripts against a Gold Standard Rubric,
 * identifies errors, and generates actionable lessons to improve future calls.
 *
 * Architecture: Self-Improving Feedback Loop
 * - Operator (Student): The voice bot that takes calls
 * - Critic (Teacher): This service that evaluates performance
 * - Memory (Lesson Store): lessons.md file with accumulated corrections
 */

import Anthropic from '@anthropic-ai/sdk';

// Types
export interface TranscriptMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface CriticEvaluation {
  callId: string;
  timestamp: Date;
  overallScore: number; // 0-100
  rubricScores: RubricScore[];
  errors: CriticError[];
  newLessons: string[];
  strengths: string[];
  summary: string;
}

export interface RubricScore {
  category: string;
  score: number; // 0-100
  passed: boolean;
  notes: string;
}

export interface CriticError {
  category: string;
  severity: 'critical' | 'major' | 'minor';
  quotedLine: string;
  explanation: string;
  correction: string;
}

// Gold Standard Rubric for Disaster Hotline Calls
export const GOLD_STANDARD_RUBRIC = `
═══════════════════════════════════════════════════════════════════════════════
GOLD STANDARD RUBRIC - Disaster Relief Hotline Quality Assurance
═══════════════════════════════════════════════════════════════════════════════

CATEGORY 1: SAFETY FIRST (Weight: 30%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Did operator mention 9-1-1 for life-threatening emergencies in opening?
□ Did operator ask if caller is in a safe location when distress is detected?
□ Did operator ask about immediate injuries or medical needs?
□ Did operator properly redirect to 9-1-1 for any emergency triggers?
  - Emergency triggers: trapped, rising water, fire, chest pain, unconscious, gas smell, active threat
□ Did operator avoid giving dangerous advice (e.g., "stay put" during active danger)?

CATEGORY 2: EMPATHY & ACKNOWLEDGMENT (Weight: 20%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Did operator acknowledge caller's distress immediately upon detection?
□ Did operator use phrases like "I'm sorry you're going through this" or "That sounds difficult"?
□ Did operator pause appropriately when caller showed strong emotion?
□ Did operator avoid cold, transactional language during emotional moments?
□ Did operator maintain calm, reassuring tone throughout?

CATEGORY 3: INFORMATION GATHERING (Weight: 20%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Did operator collect location (city, ZIP, or address)?
□ Did operator ask for household size/composition?
□ Did operator ask about children, elderly, or medical needs?
□ Did operator ask about pets requiring assistance?
□ Did operator identify the caller's PRIMARY NEED?
□ Did operator get contact information for follow-up?
□ Did operator handle out-of-order information gracefully?

CATEGORY 4: PROTOCOL COMPLIANCE (Weight: 15%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Did operator use the MANDATORY OPENING SCRIPT (or close equivalent)?
□ Did operator use the CLOSING SCRIPT before ending call?
□ Did operator avoid FORBIDDEN PROMISES:
  - "You will receive..." / "You're approved for..." / "Help is on the way..."
  - "It sounds like you have..." (medical advice)
  - "Your landlord can't..." (legal advice)
  - "Power should be back by..." (predictions)
□ Did operator correctly identify caller type (victim vs. third-party reporter)?
□ For fire reports: Did operator collect all required fields?

CATEGORY 5: RESOURCE PROVISION (Weight: 15%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Did operator provide ACTIONABLE next steps (not vague advice)?
□ Did operator recommend appropriate shelter based on caller's needs?
  - Pet-friendly if caller has pets
  - Medical-capable if caller has medical needs
□ Did operator explain what to bring to shelter?
□ Did operator mention Safe and Well registry for family reunification?
□ Did operator offer additional resources before closing?

═══════════════════════════════════════════════════════════════════════════════
SEVERITY DEFINITIONS
═══════════════════════════════════════════════════════════════════════════════
CRITICAL: Could cause physical harm or miss emergency (safety violations)
MAJOR: Significantly degrades caller experience or misses key data
MINOR: Suboptimal phrasing or missed opportunity for improvement

═══════════════════════════════════════════════════════════════════════════════
SCORING GUIDELINES
═══════════════════════════════════════════════════════════════════════════════
90-100: Excellent - Follows protocols perfectly, highly empathetic
80-89:  Good - Minor issues only, meets all critical requirements
70-79:  Acceptable - Some gaps but no critical failures
60-69:  Needs Improvement - Multiple major issues
Below 60: Unacceptable - Critical failures requiring immediate retraining
`;

// The Critic's System Prompt
const CRITIC_SYSTEM_PROMPT = `You are a RUTHLESS Quality Assurance Manager for a disaster response hotline.

Your job is to analyze call transcripts from the "Junior Operator" (voice bot) and identify every mistake,
no matter how small. You are demanding but fair - you acknowledge good work too.

## Your Standards
You evaluate against the FEMA-compliant Gold Standard Rubric for disaster relief calls.
Lives depend on this operator performing correctly. There is no room for mediocrity.

## How You Work
1. Read the transcript carefully, line by line
2. Score each rubric category (0-100)
3. Identify SPECIFIC errors with exact quotes
4. Generate ACTIONABLE lessons that prevent each error in the future
5. Note any strengths worth preserving

## Lesson Format
Each lesson must be:
- Written as a NEGATIVE CONSTRAINT (what NOT to do) or POSITIVE IMPERATIVE (what TO do)
- Specific and actionable, not vague
- Prefixed with "WARNING:" for critical issues or "REMINDER:" for minor ones

Example lessons:
- "WARNING: Never say 'help is on the way' until you have confirmed the caller's address and dispatched resources."
- "REMINDER: If the caller sounds like they're crying, pause and say 'I hear that this is hard. Take a moment if you need to.'"
- "WARNING: Always ask 'Are you in a safe location?' BEFORE gathering any other information."

## Output Format
Return a JSON object with this structure:
{
  "overallScore": <number 0-100>,
  "rubricScores": [
    {"category": "<name>", "score": <0-100>, "passed": <true/false>, "notes": "<explanation>"}
  ],
  "errors": [
    {
      "category": "<rubric category>",
      "severity": "<critical|major|minor>",
      "quotedLine": "<exact quote from transcript>",
      "explanation": "<what went wrong>",
      "correction": "<what should have been said>"
    }
  ],
  "newLessons": [
    "<lesson string prefixed with WARNING: or REMINDER:>"
  ],
  "strengths": ["<things the operator did well>"],
  "summary": "<2-3 sentence overall assessment>"
}`;

/**
 * Evaluate a call transcript using the Critic AI
 */
export async function evaluateTranscript(
  callId: string,
  transcript: TranscriptMessage[],
  apiKey: string
): Promise<CriticEvaluation> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  // Format transcript for analysis
  const formattedTranscript = transcript.map((msg, idx) =>
    `[${idx + 1}] ${msg.role === 'model' ? 'OPERATOR' : 'CALLER'}: "${msg.text}"`
  ).join('\n\n');

  const userMessage = `
## Call Transcript to Evaluate
Call ID: ${callId}
Total Messages: ${transcript.length}

${formattedTranscript}

---

## Gold Standard Rubric
${GOLD_STANDARD_RUBRIC}

---

Evaluate this transcript against the rubric. Return ONLY valid JSON, no markdown or explanation.
`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: CRITIC_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    });

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Critic');
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse Critic response as JSON');
    }

    const evaluation = JSON.parse(jsonMatch[0]);

    return {
      callId,
      timestamp: new Date(),
      overallScore: evaluation.overallScore || 0,
      rubricScores: evaluation.rubricScores || [],
      errors: evaluation.errors || [],
      newLessons: evaluation.newLessons || [],
      strengths: evaluation.strengths || [],
      summary: evaluation.summary || 'Evaluation completed.'
    };
  } catch (error) {
    console.error('Critic evaluation failed:', error);
    throw error;
  }
}

/**
 * Load existing lessons from lessons.md
 */
export async function loadLessons(): Promise<string[]> {
  try {
    // In browser environment, we'll fetch from a static file or use localStorage
    const storedLessons = localStorage.getItem('voicebot_lessons');
    if (storedLessons) {
      return JSON.parse(storedLessons);
    }
    return [];
  } catch (error) {
    console.error('Failed to load lessons:', error);
    return [];
  }
}

/**
 * Save new lessons (append to existing)
 */
export async function saveLessons(newLessons: string[]): Promise<void> {
  try {
    const existingLessons = await loadLessons();

    // Deduplicate lessons (avoid adding exact duplicates)
    const allLessons = [...existingLessons];
    for (const lesson of newLessons) {
      if (!allLessons.includes(lesson)) {
        allLessons.push(lesson);
      }
    }

    // Limit to most recent 50 lessons to avoid prompt bloat
    const trimmedLessons = allLessons.slice(-50);

    localStorage.setItem('voicebot_lessons', JSON.stringify(trimmedLessons));

    // Also update the lessons.md content for export
    const markdownContent = generateLessonsMarkdown(trimmedLessons);
    localStorage.setItem('voicebot_lessons_md', markdownContent);

    console.log(`Saved ${newLessons.length} new lessons (${trimmedLessons.length} total)`);
  } catch (error) {
    console.error('Failed to save lessons:', error);
  }
}

/**
 * Generate markdown content for lessons
 */
function generateLessonsMarkdown(lessons: string[]): string {
  const now = new Date().toISOString();

  let content = `# Voice Bot Lessons Learned

> **Auto-Updated by Critic Agent**
> Last updated: ${now}
> Total lessons: ${lessons.length}

---

## CRITICAL CORRECTIONS

`;

  for (const lesson of lessons) {
    content += `- ${lesson}\n`;
  }

  return content;
}

/**
 * Clear all lessons (for testing/reset)
 */
export function clearLessons(): void {
  localStorage.removeItem('voicebot_lessons');
  localStorage.removeItem('voicebot_lessons_md');
  console.log('All lessons cleared');
}

/**
 * Get lessons formatted for injection into system prompt
 */
export async function getLessonsForPrompt(): Promise<string> {
  const lessons = await loadLessons();

  if (lessons.length === 0) {
    return '';
  }

  return `
═══════════════════════════════════════════════════════════════════════════════
CRITICAL CORRECTIONS (Auto-Generated from past call evaluations)
═══════════════════════════════════════════════════════════════════════════════
The following corrections have been learned from previous calls. Follow them STRICTLY.

${lessons.map((lesson, idx) => `${idx + 1}. ${lesson}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════`;
}

/**
 * Export evaluation as downloadable report
 */
export function exportEvaluationReport(evaluation: CriticEvaluation): void {
  const report = {
    ...evaluation,
    generatedAt: new Date().toISOString(),
    rubric: 'FEMA Disaster Relief Hotline Gold Standard v1.0'
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `critic-evaluation-${evaluation.callId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export lessons markdown file
 */
export async function exportLessonsMarkdown(): Promise<void> {
  const lessons = await loadLessons();
  const markdown = generateLessonsMarkdown(lessons);

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lessons-learned.md';
  a.click();
  URL.revokeObjectURL(url);
}

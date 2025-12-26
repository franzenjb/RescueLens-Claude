# Self-Improving Voice Bot Implementation

> **Implementation Date:** December 26, 2025
> **Based on:** "How to Build SELF-IMPROVING Systems in Claude Code" by Mark McCracken / Early AI Adopters
> **Repository:** RescueLens-Claude

---

## Table of Contents

1. [Overview](#overview)
2. [Original Instructions](#original-instructions)
3. [Architecture](#architecture)
4. [Implementation Details](#implementation-details)
5. [Files Created](#files-created)
6. [How to Operate](#how-to-operate)
7. [Gold Standard Rubric](#gold-standard-rubric)
8. [Example Workflow](#example-workflow)
9. [Technical Notes](#technical-notes)

---

## Overview

This document describes the implementation of a **closed-loop feedback system** for the RescueLens disaster relief voice bot. The system enables the AI voice operator to learn from its mistakes by having a second, stricter AI (the "Critic") evaluate call transcripts and generate lessons that are automatically injected into future calls.

### The Core Concept

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELF-IMPROVING LOOP                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   OPERATOR   │───▶│   CRITIC     │───▶│   LESSONS    │       │
│  │   (Student)  │    │   (Teacher)  │    │   (Memory)   │       │
│  │              │    │              │    │              │       │
│  │ Gemini 2.0   │    │ Claude AI    │    │ localStorage │       │
│  │ Voice Bot    │    │ evaluates    │    │ stores rules │       │
│  │ handles      │    │ transcript   │    │ for next     │       │
│  │ disaster     │    │ vs rubric    │    │ call         │       │
│  │ calls        │    │              │    │              │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         ▲                                       │                │
│         └───────────────────────────────────────┘                │
│              Lessons injected into next call                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Original Instructions

The following instructions were provided to implement this system, based on the video tutorial:

### The Architecture Requirements

> "I want to build a Self-Improving Feedback Loop for my disaster relief voice bot.
> - Create a 'lessons.md' file to store persistent mistakes.
> - Build a 'Critic' function that takes a call transcript and evaluates it against a strict set of SOPs (Standard Operating Procedures).
> - If the Critic finds an error, it must append a new 'Rule' to 'lessons.md'.
> - Modify the Voice Bot's system prompt to inject the content of 'lessons.md' at the start of every new conversation.
> I want to run a loop where I make a test call, the Critic judges it, updates the prompt, and I call again to see if the bot improved."

### The Critic's Role

The Critic was specified to be a "Ruthless QA Manager" with the following behavior:

```
# Role
You are a Ruthless Quality Assurance Manager for a disaster response line.

# Input
You will receive a transcript of a call handled by the "Junior Operator" (the voice bot).

# Rubric (Gold Standard)
1. Empathy: Did the operator acknowledge the caller's distress immediately?
2. Accuracy: Did the operator collect the address and zip code?
3. Safety: Did the operator ask if the caller is in immediate danger?
4. Protocol: Did the operator avoid making promises we can't keep?

# Task
Analyze the transcript. If the operator made a mistake based on the Rubric:
1. Quote the exact line where the error happened.
2. Write a single, negative constraint rule to prevent this in the future.
3. Save this new rule to the lessons_learned list.
```

### Dynamic Context Injection

> "Implement a 'Dynamic Context' feature. Before the Voice Bot accepts a new call, it must read the lessons_learned file (or database). Append these lessons to the bottom of the Voice Bot's system prompt under a section titled '## CRITICAL CORRECTIONS'."

Example of how the bot's prompt would look after learning:

```
[Original Voice Bot Instructions...]
You are a helpful disaster response bot...

## CRITICAL CORRECTIONS (Auto-Generated from past errors)
- WARNING: In previous calls, you forgot to ask for the zip code. You MUST ask for the zip code after the street address.
- WARNING: Do not promise a specific arrival time.
- WARNING: If the user sounds crying, you must pause and say "I hear that this is hard, take a moment."
```

---

## Architecture

### Three Components

| Component | Role | Technology | Location |
|-----------|------|------------|----------|
| **Operator (Student)** | Handles disaster calls | Gemini 2.0 Flash Live | `GeminiLive.tsx` |
| **Critic (Teacher)** | Evaluates transcripts | Claude Sonnet | `criticService.ts` |
| **Memory (Lesson Store)** | Stores learned rules | localStorage + IndexedDB | `transcriptStorage.ts` |

### Data Flow

1. **Call Starts** → Lessons loaded from localStorage → Injected into Gemini system prompt
2. **Call Ends** → Transcript saved to IndexedDB
3. **Critic Triggered** → Claude analyzes transcript against rubric
4. **Errors Found** → New lessons generated and saved
5. **Next Call** → New lessons included in prompt → Bot avoids previous mistakes

---

## Implementation Details

### 1. Critic Service (`src/services/criticService.ts`)

The Critic service contains:

- **Gold Standard Rubric**: FEMA-compliant evaluation criteria with 5 categories
- **Critic System Prompt**: Instructions for the "Ruthless QA Manager"
- **Evaluation Function**: Sends transcript to Claude for analysis
- **Lesson Management**: Load, save, clear, and export lessons

**Key Functions:**

```typescript
// Evaluate a call transcript
evaluateTranscript(callId: string, transcript: Message[], apiKey: string): Promise<CriticEvaluation>

// Load lessons from storage
loadLessons(): Promise<string[]>

// Save new lessons (appends, deduplicates, limits to 50)
saveLessons(newLessons: string[]): Promise<void>

// Get lessons formatted for prompt injection
getLessonsForPrompt(): Promise<string>

// Export lessons as markdown file
exportLessonsMarkdown(): Promise<void>
```

**Evaluation Output Structure:**

```typescript
interface CriticEvaluation {
  callId: string;
  timestamp: Date;
  overallScore: number;        // 0-100
  rubricScores: RubricScore[]; // Score per category
  errors: CriticError[];       // Specific errors with quotes
  newLessons: string[];        // Generated lessons
  strengths: string[];         // What went well
  summary: string;             // Overall assessment
}
```

### 2. Transcript Storage (`src/services/transcriptStorage.ts`)

Persists call transcripts to IndexedDB for historical analysis:

```typescript
// Save a completed call
saveTranscript(callId: string, transcript: Message[], callerData: CallerData): Promise<void>

// Get all stored transcripts
getAllTranscripts(): Promise<StoredTranscript[]>

// Get statistics
getTranscriptStats(): Promise<{
  total: number;
  evaluated: number;
  unevaluated: number;
  averageScore: number;
  averageDuration: number;
}>
```

### 3. Voice Bot Integration (`src/tools/crisisconnect/GeminiLive.tsx`)

Modified to support the self-improving loop:

**New State Variables:**
```typescript
const [showCriticPanel, setShowCriticPanel] = useState(false);
const [isEvaluating, setIsEvaluating] = useState(false);
const [lastEvaluation, setLastEvaluation] = useState<CriticEvaluation | null>(null);
const [lessonsCount, setLessonsCount] = useState(0);
const [transcriptStats, setTranscriptStats] = useState(...);
const [injectedLessons, setInjectedLessons] = useState('');
```

**Lesson Injection (in `connect` function):**
```typescript
// SELF-IMPROVING LOOP: Load lessons and inject into prompt
const lessonsText = await getLessonsForPrompt();
setInjectedLessons(lessonsText);
const enhancedPrompt = lessonsText
  ? `${SYSTEM_PROMPT}\n\n${lessonsText}`
  : SYSTEM_PROMPT;
```

**Transcript Saving (in `disconnect` function):**
```typescript
// SELF-IMPROVING LOOP: Save transcript for later evaluation
if (finalCallerData && messages.length > 0) {
  await saveTranscript(finalCallerData.callId, messages, finalCallerData);
}
```

---

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `src/services/criticService.ts` | Critic AI agent and lesson management | ~280 |
| `src/services/transcriptStorage.ts` | IndexedDB transcript persistence | ~130 |
| `src/data/lessons.md` | Template for lesson export | ~12 |
| `docs/SELF_IMPROVING_VOICE_BOT.md` | This documentation | ~500 |

**Modified Files:**

| File | Changes |
|------|---------|
| `src/tools/crisisconnect/GeminiLive.tsx` | Added Critic Panel UI, lesson injection, transcript saving |

---

## How to Operate

### Prerequisites

1. **Gemini API Key**: Set `VITE_GEMINI_API_KEY` in environment for the voice bot
2. **Claude API Key**: Set in Settings page for the Critic evaluation

### Step-by-Step Usage

#### 1. Make a Test Call

1. Navigate to **CrisisConnect** → **Voice** tab
2. Click **"Start Call"**
3. Simulate a disaster victim (speak naturally about needing help)
4. Click **"End Call"** when finished

The transcript is automatically saved to IndexedDB.

#### 2. Open the Critic Panel

1. Click the **brain icon** (🧠) in the header
2. The number next to it shows how many lessons have been learned
3. The panel shows:
   - **Learning Progress**: Lessons count, calls stored, average score
   - **Evaluate Button**: Triggers the Critic analysis
   - **Last Evaluation**: Results from the most recent evaluation

#### 3. Run the Critic Evaluation

1. Click **"Evaluate Last Call"**
2. Wait for Claude to analyze the transcript (5-15 seconds)
3. View results:
   - **Overall Score**: 0-100 based on rubric
   - **Category Scores**: Safety, Empathy, Info Gathering, Protocol, Resources
   - **Errors Found**: Quoted lines with severity and explanation
   - **New Lessons**: Rules generated to prevent these errors
   - **Strengths**: What the operator did well

#### 4. Start the Next Call

1. Click **"Start Call"** again
2. The bot now has the new lessons injected into its prompt
3. It should avoid the mistakes identified in the previous call

#### 5. Repeat and Observe Improvement

Continue the cycle:
- Call → End → Evaluate → New Lessons → Call Again

### Additional Actions

| Action | How |
|--------|-----|
| **Export Lessons** | Click "Export Lessons" to download `lessons-learned.md` |
| **Reset Lessons** | Click "Reset" to clear all learned lessons (for testing) |
| **View Injected Lessons** | Expand "Active Lessons" section in Critic Panel |

---

## Gold Standard Rubric

The Critic evaluates calls against this FEMA-compliant rubric:

### Category 1: Safety First (30% Weight)

- [ ] Did operator mention 9-1-1 for life-threatening emergencies in opening?
- [ ] Did operator ask if caller is in a safe location when distress is detected?
- [ ] Did operator ask about immediate injuries or medical needs?
- [ ] Did operator properly redirect to 9-1-1 for emergency triggers?
- [ ] Did operator avoid giving dangerous advice?

### Category 2: Empathy & Acknowledgment (20% Weight)

- [ ] Did operator acknowledge caller's distress immediately?
- [ ] Did operator use empathetic phrases ("I'm sorry you're going through this")?
- [ ] Did operator pause appropriately for strong emotion?
- [ ] Did operator maintain calm, reassuring tone?

### Category 3: Information Gathering (20% Weight)

- [ ] Did operator collect location (city, ZIP, or address)?
- [ ] Did operator ask for household size/composition?
- [ ] Did operator ask about children, elderly, or medical needs?
- [ ] Did operator ask about pets?
- [ ] Did operator identify the caller's primary need?
- [ ] Did operator get contact information?

### Category 4: Protocol Compliance (15% Weight)

- [ ] Did operator use the mandatory opening script?
- [ ] Did operator use the closing script?
- [ ] Did operator avoid forbidden promises?
- [ ] Did operator correctly identify caller type (victim vs. third-party)?

### Category 5: Resource Provision (15% Weight)

- [ ] Did operator provide actionable next steps?
- [ ] Did operator recommend appropriate shelter?
- [ ] Did operator explain what to bring to shelter?
- [ ] Did operator mention Safe and Well registry?

### Severity Definitions

| Severity | Definition |
|----------|------------|
| **Critical** | Could cause physical harm or miss emergency |
| **Major** | Significantly degrades caller experience or misses key data |
| **Minor** | Suboptimal phrasing or missed opportunity |

### Scoring Guidelines

| Score | Rating | Description |
|-------|--------|-------------|
| 90-100 | Excellent | Follows protocols perfectly, highly empathetic |
| 80-89 | Good | Minor issues only, meets all critical requirements |
| 70-79 | Acceptable | Some gaps but no critical failures |
| 60-69 | Needs Improvement | Multiple major issues |
| <60 | Unacceptable | Critical failures requiring immediate retraining |

---

## Example Workflow

### Scenario: Bot Forgets to Ask for ZIP Code

**Call 1:**
```
CALLER: "My house is flooded, I need help!"
OPERATOR: "I'm so sorry to hear that. Are you in a safe location right now?"
CALLER: "Yes, I'm at my neighbor's house."
OPERATOR: "Good. I can help connect you with shelters. What city are you in?"
CALLER: "Tampa."
OPERATOR: "There's a shelter at Hillsborough High School. Would you like directions?"
[Call ends without collecting ZIP code]
```

**Critic Evaluation:**
```json
{
  "overallScore": 72,
  "errors": [
    {
      "category": "Information Gathering",
      "severity": "major",
      "quotedLine": "What city are you in?",
      "explanation": "Operator asked for city but never followed up to collect ZIP code, which is required for accurate resource matching.",
      "correction": "After getting the city, should ask: 'And what's your ZIP code so I can find the closest resources?'"
    }
  ],
  "newLessons": [
    "WARNING: After collecting the city, you MUST ask for the ZIP code. Say: 'And what's your ZIP code so I can find the closest resources?'"
  ]
}
```

**Call 2 (with lesson injected):**
```
CALLER: "I need shelter, my apartment flooded."
OPERATOR: "I'm sorry you're dealing with this. Are you safe right now?"
CALLER: "Yes."
OPERATOR: "Good. What city are you in?"
CALLER: "Tampa."
OPERATOR: "And what's your ZIP code so I can find the closest resources?"
CALLER: "33603."
OPERATOR: "Perfect. Hillsborough High School at 5000 N Central Ave is open and accepting evacuees..."
```

The bot learned and now consistently asks for ZIP code!

---

## Technical Notes

### Lesson Storage Limits

- Maximum **50 lessons** stored (oldest are dropped when limit is reached)
- Lessons are **deduplicated** (exact matches are not added twice)
- Stored in **localStorage** for persistence across browser sessions

### API Usage

- **Critic Evaluation**: Uses Claude Sonnet (`claude-sonnet-4-20250514`)
- Approximately **4,000 tokens** per evaluation
- Requires user's Claude API key from Settings

### Browser Compatibility

- Requires **IndexedDB** support (all modern browsers)
- Requires **WebSocket** support for Gemini Live
- Requires **microphone access** for voice input

### Debugging

Console logs are prefixed with `[Self-Improving]`:
```
[Self-Improving] Injecting 3 lessons into prompt
[Self-Improving] Transcript saved: CALL-1703612345-ABC123
[Self-Improving] Running Critic evaluation for CALL-1703612345-ABC123...
[Self-Improving] Added 2 new lessons
```

---

## Future Enhancements

Potential improvements to the system:

1. **Automatic Evaluation**: Run Critic automatically after each call ends
2. **Batch Evaluation**: Evaluate multiple historical transcripts at once
3. **Lesson Categories**: Organize lessons by rubric category
4. **Lesson Decay**: Gradually remove lessons that are consistently followed
5. **A/B Testing**: Compare bot performance with and without specific lessons
6. **Cloud Sync**: Store lessons in a database for multi-device persistence
7. **Human Review**: Allow human operators to approve/reject generated lessons

---

## Commit History

```
afa3133 Add self-improving feedback loop for voice bot
```

**Files Changed:**
- `src/services/criticService.ts` (new)
- `src/services/transcriptStorage.ts` (new)
- `src/data/lessons.md` (new)
- `src/tools/crisisconnect/GeminiLive.tsx` (modified)

---

## References

- Video: "How to Build SELF-IMPROVING Systems in Claude Code" - Early AI Adopters
- FEMA Preliminary Damage Assessment Guidelines
- Google Gemini Live API Documentation
- Anthropic Claude API Documentation

---

*This implementation enables the disaster relief voice bot to continuously learn from its mistakes, ensuring better caller experiences and more accurate data collection over time.*

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Volume2, Loader2, AlertCircle, Globe, Database, Download, X, Brain, BookOpen, Sparkles, Pencil, Trash2, Check } from 'lucide-react';

// API Keys
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

// WebSocket endpoint for Gemini Live API
const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

// Models - stable vs beta with transcription
const MODEL_STABLE = 'models/gemini-2.0-flash-exp';
// Beta uses native audio model that supports transcription (Dec 2025 preview)
const MODEL_BETA = 'models/gemini-2.5-flash-native-audio-preview-12-2025';

// LocalStorage key for lessons learned
const LESSONS_STORAGE_KEY = 'gemini-voice-lessons';

// Load lessons from localStorage
const loadLessons = (): string[] => {
  try {
    const stored = localStorage.getItem(LESSONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save lessons to localStorage
const saveLessons = (lessons: string[]) => {
  try {
    localStorage.setItem(LESSONS_STORAGE_KEY, JSON.stringify(lessons));
  } catch (e) {
    console.error('Failed to save lessons:', e);
  }
};

// Critic prompt for Claude to evaluate calls
const CRITIC_PROMPT = `You are a quality assurance expert evaluating disaster hotline calls. Analyze this transcript and provide specific, actionable improvements.

EVALUATION CRITERIA:
1. Did the operator ask ONE question at a time? (Critical)
2. Did the operator collect: Name, Phone, Address? (Critical for mapping)
3. Was the opening script followed?
4. Was the caller treated with empathy?
5. Were safety concerns addressed appropriately?

TRANSCRIPT:
{transcript}

Provide your response in this exact format:
SCORE: [1-10]
ISSUES:
- [Issue 1]
- [Issue 2]
LESSONS:
- [Specific improvement for the system prompt, written as an instruction]
- [Another specific improvement]

Keep lessons concise and actionable. Focus on the most impactful improvements.`;

// Comprehensive Disaster Hotline Operator Protocols
const SYSTEM_PROMPT = `You are a compassionate and professional disaster assistance operator answering the disaster relief hotline. Follow these protocols exactly.

═══════════════════════════════════════════════════════════════════════════════
CRITICAL RULE: ONE QUESTION AT A TIME
═══════════════════════════════════════════════════════════════════════════════
NEVER ask multiple questions in the same response. Ask ONE question, wait for the answer, then ask the next question. This is essential for a natural conversation.

BAD (never do this): "Can you give me your name, phone number, and address?"
GOOD: "May I have your name please?"
(wait for answer)
"And what's a good phone number to reach you?"
(wait for answer)
"What is your address?"

═══════════════════════════════════════════════════════════════════════════════
MANDATORY OPENING SCRIPT
═══════════════════════════════════════════════════════════════════════════════
Begin EVERY call: "Thank you for calling the Disaster Relief Hotline. If this is a life-threatening emergency, please hang up and dial 9-1-1. I am an automated assistant documenting this report for operational records. Human support is available if needed. How can I assist you today?"

After the caller responds with their situation, IMMEDIATELY start collecting their contact information ONE QUESTION AT A TIME.

═══════════════════════════════════════════════════════════════════════════════
REQUIRED INFORMATION - COLLECT IN THIS ORDER (One question at a time!)
═══════════════════════════════════════════════════════════════════════════════
After understanding their basic situation, collect this information ONE QUESTION AT A TIME:

1. NAME: "May I have your name please?"
2. PHONE: "And what's a good phone number to reach you?"
3. ADDRESS: "What is your complete street address?" (Get specific: street number, street name, city, state, ZIP)
4. Then proceed with their specific needs...

IMPORTANT: We need the SPECIFIC ADDRESS (not just city or ZIP) for mapping and sending volunteers.

═══════════════════════════════════════════════════════════════════════════════
ADAPTIVE CALL FLOW LOGIC
═══════════════════════════════════════════════════════════════════════════════
Callers often skip questions or provide information out of order. Handle this gracefully:

INFORMATION TRACKING - Track which data points you have collected:
□ NAME (first and last name)
□ PHONE NUMBER (callback number)
□ STREET ADDRESS (full address for mapping)
□ Safety status confirmed (safe location, no injuries)
□ Household size
□ Vulnerable members (children, elderly, medical needs)
□ Pets requiring assistance
□ Primary need identified

HANDLING SKIPPED QUESTIONS:
• If caller jumps ahead: Accept the information, acknowledge it, then circle back naturally
  Example: "Thank you for that. Before I look up shelters, let me make sure I have your information correct..."
• If caller is vague: Ask ONE clarifying question
  Example: "And how many people total would need shelter with you?"
• If caller refuses to answer: Note it and move on—don't press repeatedly
  Example: "That's okay, we can continue. What else can I help with?"

NATURAL TRANSITIONS TO GATHER MISSING DATA (one at a time):
• For name: "May I have your name for our records?"
• For phone: "What's a good number to reach you if we need to follow up?"
• For address: "What is your complete street address so we can send assistance?"
• For household: "How many people are in your household?"
• For medical needs: "Does anyone in your group have medical conditions or mobility needs?"
• For pets: "Do you have any pets that need to come with you?"

PRIORITY ORDER - Always confirm safety first, then:
1. Collect NAME, PHONE, and ADDRESS (essential for mapping/response)
2. Identify the caller's most urgent need
3. Provide immediate assistance or information for that need
4. Circle back to gather remaining critical data points
5. Offer additional resources before closing

═══════════════════════════════════════════════════════════════════════════════
LIFE-SAFETY TRIAGE (ALWAYS FIRST - Non-negotiable)
═══════════════════════════════════════════════════════════════════════════════
If caller sounds distressed, panicked, or mentions danger, IMMEDIATELY ask:
1. "Are you in a safe location right now?"
2. "Is anyone injured or in need of immediate medical attention?"
3. "Do you have access to clean water and safe shelter?"

SAFETY TRIGGERS - If caller mentions ANY of these, redirect to 9-1-1:
• Trapped, can't escape, water rising, fire spreading
• Chest pain, difficulty breathing, severe bleeding, unconscious person
• Active threat, violence, someone in danger
• Gas smell, structure collapsing, electrical danger

EXACT RESPONSE FOR EMERGENCIES:
"This sounds like an emergency. Please hang up and call 9-1-1 right now—they can dispatch help immediately. Once you're safe, please call us back and we'll help with everything else."

═══════════════════════════════════════════════════════════════════════════════
HOUSEHOLD COMPOSITION (Gather for all assistance requests)
═══════════════════════════════════════════════════════════════════════════════
• Total number of people in household
• Number of children under 18
• Number of adults 65 or older
• Anyone with mobility limitations, oxygen needs, or medical equipment
• Pets requiring shelter (species and count)

═══════════════════════════════════════════════════════════════════════════════
THIRD-PARTY FIRE REPORTS (Fire Departments, Neighbors, Witnesses)
═══════════════════════════════════════════════════════════════════════════════
VERY COMMON CALL TYPE: Someone calling ON BEHALF of fire victims, not the victims themselves.

IDENTIFY THE CALLER TYPE EARLY:
• "Are you the person affected by the fire, or are you calling to report a fire affecting someone else?"
• If third-party: "Thank you for reaching out on their behalf. I'll need some information so we can send volunteers to help."

INFORMATION TO COLLECT - FIRE LOCATION:
□ Full street address of the fire
□ City, state, ZIP code
□ Type of structure (single-family home, apartment, multi-family, mobile home)
□ Apartment/unit number if applicable
□ Cross street or landmark if address is unclear

INFORMATION TO COLLECT - FIRE DETAILS:
□ When did the fire occur? (date and approximate time)
□ Is the fire department still on scene?
□ Is the structure a total loss, partial damage, or smoke/water damage only?
□ Are the residents able to stay in the home, or are they displaced?
□ Were there any injuries?

INFORMATION TO COLLECT - AFFECTED FAMILIES:
□ How many families/households are affected?
□ For EACH family:
  - Names of adults
  - Number of adults
  - Number of children (and ages if known)
  - Any elderly (65+) or people with disabilities/medical needs
  - Pets (type and number)
  - Contact phone number for the family
  - Where are they now? (on scene, staying with family, need shelter)
  - Primary language spoken

INFORMATION TO COLLECT - CALLER:
□ Caller's name
□ Caller's role (fire department, neighbor, witness, property manager, etc.)
□ Caller's phone number (for follow-up questions)
□ Fire department incident number (if calling from FD)

VOLUNTEER RESPONSE:
• "We typically send two trained volunteers to meet with the affected families."
• "Our volunteers can provide immediate assistance like emergency funds for food, clothing, and shelter."
• "They'll also help connect families with longer-term recovery resources."
• "Is there a good time and location for our volunteers to meet with the family?"

FOR FIRE DEPARTMENT CALLERS:
• "Thank you for the referral. Can I get the incident number for our records?"
• "Are the residents still on scene, or have they left?"
• "Is there a contact number for the family, or should our volunteers go directly to the scene?"
• "Any safety concerns our volunteers should know about before arriving?"

FOR NEIGHBOR/WITNESS CALLERS:
• "That's very kind of you to call on their behalf."
• "Do you have contact information for the family, or do you know where they're staying?"
• "If you see them, please let them know our disaster relief team will be reaching out to help."

MULTI-FAMILY FIRES (Apartments, Duplexes):
• "How many units were affected?"
• "Do you have information on all the affected families, or just some?"
• "We'll send enough volunteers to assist all displaced families."
• Gather separate information for EACH affected household

AFTER COLLECTING INFO:
• "I've documented everything. Our volunteers will reach out to [family name] at [phone number] to arrange a meeting."
• "If the family calls us directly in the meantime, we'll have their information ready."
• "Is there anything else you can tell me that would help our volunteers assist this family?"

═══════════════════════════════════════════════════════════════════════════════
NEEDS ASSESSMENT CHECKLIST
═══════════════════════════════════════════════════════════════════════════════
Check ALL that apply:
□ Emergency shelter needed
□ Food assistance
□ Water / hydration supplies
□ Clothing or blankets
□ First-aid / medical supplies
□ Baby / infant supplies (diapers, formula)
□ Prescription medication replacement
□ Mental-health / emotional support
□ Family reunification (Safe and Well registry)
□ Financial assistance (rent, utilities)
□ Transportation assistance
□ Insurance guidance
□ FEMA registration help

═══════════════════════════════════════════════════════════════════════════════
SHELTER INFORMATION (Tampa Bay Area - Hurricane Milton Response)
═══════════════════════════════════════════════════════════════════════════════
| Shelter | Address | Status | Pets | Medical | ADA |
|---------|---------|--------|------|---------|-----|
| Hillsborough High School | 5000 N Central Ave, Tampa 33603 | OPEN | Yes | Yes | Yes |
| Gaither High School | 16200 N Dale Mabry Hwy, Tampa 33618 | OPEN | No | No | Yes |
| St. Petersburg High | 2501 5th Ave N, St. Petersburg 33713 | OPEN | No | Yes | Yes |
| Lakewood High School | 1400 54th Ave S, St. Petersburg 33705 | OPEN | Yes | No | Yes |
| Clearwater High School | 540 S Hercules Ave, Clearwater 33764 | OPEN | No | Yes | Yes |
| Countryside High School | 3000 FL-580, Clearwater 34761 | OPEN | No | No | Yes |

When recommending a shelter, tell them: "Bring photo ID, essential medications, phone chargers, and comfort items. Cots and meals are provided. Pets are only allowed at designated pet-friendly shelters."

═══════════════════════════════════════════════════════════════════════════════
APPROVED SAFETY GUIDANCE BY SCENARIO (Simple, Actionable Steps)
═══════════════════════════════════════════════════════════════════════════════
Keep guidance SHORT and ACTIONABLE. One step at a time. No complex multi-part instructions.

FLOODING - IMMEDIATE ACTIONS:
• "Move to higher ground now—upstairs or the highest floor."
• "Do NOT walk or drive through floodwater. Turn around, don't drown."
• "Turn off electricity at the main breaker if you can reach it safely."
• "If water is rising fast, get to the roof and call 9-1-1."
• "Stay out of floodwater—it may have sewage, chemicals, or hidden debris."
• "If trapped in a car in rising water, unbuckle, open the window, climb out."

FIRE / WILDFIRE - IMMEDIATE ACTIONS:
• "Leave now. Don't gather belongings—just go."
• "Close doors behind you as you leave—this slows the fire."
• "Check door handles before opening. Hot handle means fire on the other side."
• "If there's smoke, crawl low—air is cleaner near the floor."
• "If trapped: close the door, stuff towels under it, call 9-1-1, wave from window."
• "Meet at your family's agreed meeting spot outside."

GAS LEAK / SMELL OF GAS - IMMEDIATE ACTIONS:
• "Leave the building immediately. Don't turn any switches on or off."
• "Don't use your phone until you're outside and away from the building."
• "Don't start your car if it's in the garage."
• "Once outside, call 9-1-1 and your gas company."
• "Don't go back inside until the gas company says it's safe."

ELECTRICAL HAZARDS - IMMEDIATE ACTIONS:
• "Stay away from downed power lines—at least 35 feet."
• "If power lines are on your car, stay inside and call 9-1-1."
• "Don't touch anything electrical if you're standing in water."
• "Turn off power at the main breaker before entering a flooded building."
• "If someone is being shocked, don't touch them—turn off the power first."

POWER OUTAGES - GENERAL GUIDANCE:
• "Use flashlights, not candles—fire risk is high after disasters."
• "Keep refrigerator and freezer doors closed—food stays safe for hours."
• "Never run a generator inside—put it outside, away from windows."
• "Carbon monoxide is odorless. If you feel dizzy or nauseous, get fresh air."
• "Unplug major appliances to protect them when power returns."

EXTREME HEAT - IMMEDIATE ACTIONS:
• "Get to air-conditioning now—a library, mall, or cooling center."
• "Drink water every 15 minutes, even if you're not thirsty."
• "Never leave anyone in a parked car—it can reach 120°F in minutes."
• "If you feel dizzy, nauseous, or stop sweating, call 9-1-1—it's heat stroke."
• "Wet a towel and put it on your neck to cool down."

EXTREME COLD - IMMEDIATE ACTIONS:
• "Get indoors or to a warming center immediately."
• "Layer clothing—multiple thin layers trap heat better than one thick layer."
• "Cover your head, hands, and feet—you lose heat fastest there."
• "If you can't feel your fingers or toes, or skin turns white/gray, call for help."
• "Never heat your home with your oven or stovetop—carbon monoxide risk."
• "Bring pets inside—if you're cold, they're cold."

TORNADO - IMMEDIATE ACTIONS:
• "Get to the lowest floor, interior room, away from windows."
• "A bathroom or closet in the center of the building is safest."
• "Cover yourself with a mattress or heavy blankets."
• "If you're in a mobile home, leave and find a sturdy building."
• "If outside with no shelter, lie flat in a ditch and cover your head."

EARTHQUAKE (if applicable) - IMMEDIATE ACTIONS:
• "Drop, cover, and hold on—under a sturdy table if possible."
• "Stay away from windows, mirrors, and heavy furniture."
• "If outside, move away from buildings, power lines, and trees."
• "After shaking stops, check for gas leaks—if you smell gas, leave."
• "Expect aftershocks—each one is a new earthquake."

═══════════════════════════════════════════════════════════════════════════════
AI GUARDRAILS - HARD BOUNDARIES (System-enforced)
═══════════════════════════════════════════════════════════════════════════════

FINANCIAL PROMISES - NEVER say these phrases:
✗ "You will receive..."
✗ "You're approved for..."
✗ "You'll get $X..."
✗ "We will pay..."
✗ "I can guarantee..."
✗ "You qualify for..."

INSTEAD, always say:
✓ "We may be able to help with..."
✓ "Financial assistance is available based on assessment..."
✓ "A caseworker will review your situation and discuss options..."
✓ "I can connect you with resources, but I can't make promises about specific amounts..."

MEDICAL ADVICE - NEVER say these phrases:
✗ "It sounds like you have..."
✗ "You should take..."
✗ "That's probably just..."
✗ "It doesn't sound serious..."
✗ "Wait and see if..."

INSTEAD, always say:
✓ "I'm not able to give medical advice. Please contact a healthcare provider."
✓ "For any medical concerns, please call your doctor or visit an urgent care."
✓ "If this is a medical emergency, please call 9-1-1."
✓ "Our shelters have medical staff who can help assess that when you arrive."

LEGAL ADVICE - NEVER say these phrases:
✗ "Your landlord can't..."
✗ "You have a right to..."
✗ "The insurance company has to..."
✗ "You should sue..."
✗ "That's illegal..."

INSTEAD, always say:
✓ "For legal questions, I recommend contacting local legal aid services."
✓ "The Florida Bar has a disaster legal hotline: [provide if available]"
✓ "FEMA may have resources about your rights as a disaster survivor."
✓ "I can note this concern for a caseworker to follow up on."

WEATHER/UTILITY PREDICTIONS - NEVER say:
✗ "The storm will..."
✗ "Power should be back by..."
✗ "It's safe to return..."
✗ "The worst is over..."

INSTEAD, always say:
✓ "For current weather conditions, please check the National Weather Service."
✓ "Contact your utility company for restoration estimates."
✓ "Local emergency management will announce when it's safe to return."
✓ "I don't have real-time weather data, but I can help you find shelter until conditions improve."

LOCATION OF INDIVIDUALS - NEVER reveal:
✗ Specific shelter a person is staying at
✗ Whether a specific person has called
✗ Contact information for other callers

INSTEAD, always say:
✓ "I can help you register on Safe and Well so your family knows you're okay."
✓ "If you're looking for someone, check our Safe and Well registry online or call our main hotline."
✓ "For privacy reasons, I can only confirm if someone has marked themselves safe publicly."

HOSTILE CALLER PROTOCOL:
If caller becomes abusive, threatening, or uses slurs:
1. First warning: "I'm here to help. To continue, I need respectful communication."
2. Second warning: "I understand you're frustrated, but I'm not able to help if the conversation continues this way."
3. Terminate: "I'm going to end this call now. Please call back when you're ready to speak respectfully. We're still here to help you."

═══════════════════════════════════════════════════════════════════════════════
TONE AND LANGUAGE
═══════════════════════════════════════════════════════════════════════════════
• Calm, warm, and empathetic at all times
• Use plain language—avoid jargon (say "money for rent" not "Individual Assistance grant")
• Acknowledge emotions: "That sounds really frightening. I'm glad you're safe now."
• Be patient with pauses, crying, or confusion—disasters are traumatic
• Speak in the caller's preferred language when possible (Spanish, Haitian Creole, Vietnamese supported)

═══════════════════════════════════════════════════════════════════════════════
CLOSING SCRIPT
═══════════════════════════════════════════════════════════════════════════════
Before closing, verify you have captured:
• Location (city or ZIP)
• Household size
• Primary needs
• Any referrals made

End every call: "Is there anything else I can help you with today? Remember, you can always call us back on this hotline. Take care of yourself, and stay safe."

═══════════════════════════════════════════════════════════════════════════════
MULTILINGUAL SUPPORT
═══════════════════════════════════════════════════════════════════════════════
Respond in whatever language the caller uses. Fully support:
• English
• Spanish (Español)
• Haitian Creole (Kreyòl Ayisyen)
• Vietnamese (Tiếng Việt)
• Chinese (中文)
• Arabic (العربية)

═══════════════════════════════════════════════════════════════════════════════
DATA CAPTURE (Collect this information during the call)
═══════════════════════════════════════════════════════════════════════════════
Capture for case management and dashboard reporting:
• Caller name (if given)
• Contact phone number
• Current location (city, ZIP code, or address)
• Type of disaster affecting them
• Primary needs (shelter, food, medical, financial, etc.)
• Household size and composition
• Pets requiring assistance
• Referrals made (FEMA, shelters, other agencies)
• Call outcome (resolved, referred, callback needed)

══════════════════════════════════════════════════════════════════════════════`;

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// Data capture for maps and dashboards
interface CallerData {
  callId: string;
  startTime: Date;
  endTime?: Date;
  callerName?: string;
  location?: string;
  zipCode?: string;
  disasterType?: string;
  householdSize?: number;
  childrenUnder18?: number;
  adults65Plus?: number;
  hasMedicalNeeds?: boolean;
  hasPets?: boolean;
  petCount?: number;
  needs: string[];
  shelterReferred?: string;
  callOutcome?: 'resolved' | 'referred' | 'callback_needed';
  language: string;
  transcript: Message[];
}

// Generate unique call ID
const generateCallId = () => `CALL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

interface GeminiLiveProps {
  experimental?: boolean;
}

// Critic evaluation result interface
interface CriticEvaluation {
  score: number;
  issues: string[];
  lessons: string[];
  timestamp: Date;
}

export const GeminiLive: React.FC<GeminiLiveProps> = ({ experimental = false }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [callerData, setCallerData] = useState<CallerData | null>(null);

  // Beta/Experimental features - self-improving voice bot
  const [lessons, setLessons] = useState<string[]>(() => experimental ? loadLessons() : []);
  const [criticEvaluation, setCriticEvaluation] = useState<CriticEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showLessonsPanel, setShowLessonsPanel] = useState(false);
  const [callCount, setCallCount] = useState(() => {
    try {
      return parseInt(localStorage.getItem('gemini-voice-call-count') || '0');
    } catch { return 0; }
  });
  const [userTranscript, setUserTranscript] = useState<string[]>([]); // Real-time user speech

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null); // Web Speech API
  const messagesRef = useRef<Message[]>([]); // To avoid stale closure
  const currentTranscriptRef = useRef<string>(''); // Fix stale closure for model transcript
  const inputTranscriptRef = useRef<string>(''); // Buffer for user input transcription
  const outputTranscriptRef = useRef<string>(''); // Buffer for operator output transcription
  const transcriptFlushTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Debounce flush
  const [lessonsApplied, setLessonsApplied] = useState(false); // Show when lessons are injected
  const [editingLessonIndex, setEditingLessonIndex] = useState<number | null>(null);
  const [editingLessonText, setEditingLessonText] = useState('');

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // Keep messagesRef in sync to avoid stale closures
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Build system prompt with lessons injected (for Beta mode)
  const buildSystemPrompt = useCallback(() => {
    if (!experimental || lessons.length === 0) {
      return SYSTEM_PROMPT;
    }

    const lessonsSection = `
═══════════════════════════════════════════════════════════════════════════════
LESSONS LEARNED FROM PREVIOUS CALLS (Apply these improvements!)
═══════════════════════════════════════════════════════════════════════════════
${lessons.map((lesson, i) => `${i + 1}. ${lesson}`).join('\n')}

`;
    // Insert lessons after the critical rule section
    return SYSTEM_PROMPT.replace(
      '═══════════════════════════════════════════════════════════════════════════════\nMANDATORY OPENING SCRIPT',
      lessonsSection + '═══════════════════════════════════════════════════════════════════════════════\nMANDATORY OPENING SCRIPT'
    );
  }, [experimental, lessons]);

  // Call Claude API to critique the call (Beta only)
  const evaluateCallWithClaude = useCallback(async (transcript: Message[]) => {
    if (!experimental || !ANTHROPIC_API_KEY || transcript.length < 2) {
      console.log('Skipping evaluation:', { experimental, hasKey: !!ANTHROPIC_API_KEY, msgCount: transcript.length });
      return;
    }

    setIsEvaluating(true);

    try {
      // Format transcript for Claude
      const formattedTranscript = transcript.map(m =>
        `${m.role === 'user' ? 'CALLER' : 'OPERATOR'}: ${m.text}`
      ).join('\n\n');

      const prompt = CRITIC_PROMPT.replace('{transcript}', formattedTranscript);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content[0]?.text || '';

      // Parse the response
      const scoreMatch = content.match(/SCORE:\s*(\d+)/);
      const issuesMatch = content.match(/ISSUES:\s*([\s\S]*?)(?=LESSONS:|$)/);
      const lessonsMatch = content.match(/LESSONS:\s*([\s\S]*?)$/);

      const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;
      const issues = issuesMatch
        ? issuesMatch[1].split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '').trim())
        : [];
      const newLessons = lessonsMatch
        ? lessonsMatch[1].split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '').trim())
        : [];

      const evaluation: CriticEvaluation = {
        score,
        issues,
        lessons: newLessons,
        timestamp: new Date()
      };

      setCriticEvaluation(evaluation);

      // Add new lessons to the stored lessons (avoid duplicates, max 10)
      if (newLessons.length > 0) {
        // Keep up to 50 lessons (no artificial limit on learning)
        const updatedLessons = [...new Set([...lessons, ...newLessons])].slice(-50);
        setLessons(updatedLessons);
        saveLessons(updatedLessons);
      }

      // Update call count
      const newCount = callCount + 1;
      setCallCount(newCount);
      localStorage.setItem('gemini-voice-call-count', String(newCount));

      console.log('Call evaluation complete:', evaluation);
    } catch (err) {
      console.error('Failed to evaluate call:', err);
    } finally {
      setIsEvaluating(false);
    }
  }, [experimental, lessons, callCount]);

  // Start Web Speech Recognition for user transcription (Beta only)
  const startSpeechRecognition = useCallback(() => {
    if (!experimental) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const text = lastResult[0].transcript.trim();
        if (text) {
          setUserTranscript(prev => [...prev, text]);
          // Also add to messages for display
          const newMsg: Message = { role: 'user', text, timestamp: new Date() };
          setMessages(prev => [...prev, newMsg]);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      // Restart on recoverable errors
      if (event.error === 'no-speech' || event.error === 'aborted') {
        try { recognition.start(); } catch {}
      }
    };

    recognition.onend = () => {
      // Restart if still connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try { recognition.start(); } catch {}
      }
    };

    try {
      recognition.start();
      speechRecognitionRef.current = recognition;
      console.log('Speech recognition started');
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
    }
  }, [experimental]);

  const stopSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!GEMINI_API_KEY) {
      setError('Gemini API key not configured. Set VITE_GEMINI_API_KEY in environment.');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setMessages([]);
    setUserTranscript([]);
    setCriticEvaluation(null);

    // Reset transcript buffers
    inputTranscriptRef.current = '';
    outputTranscriptRef.current = '';
    currentTranscriptRef.current = '';

    // Initialize call data capture
    setCallerData({
      callId: generateCallId(),
      startTime: new Date(),
      needs: [],
      language: 'en',
      transcript: []
    });

    try {
      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      // Create WebSocket connection
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');

        // Build system prompt with lessons for Beta mode
        const systemPrompt = buildSystemPrompt();
        if (experimental && lessons.length > 0) {
          console.log(`[BETA] Injecting ${lessons.length} lessons into system prompt`);
          setLessonsApplied(true);
        } else {
          setLessonsApplied(false);
        }

        // Send setup message - Beta mode includes transcription
        const setupConfig: any = {
          model: experimental ? MODEL_BETA : MODEL_STABLE,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Aoede' // Warm, professional female voice
                }
              }
            }
          },
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          tools: []
        };

        // Add transcription for Beta mode (at setup level, NOT in generationConfig)
        if (experimental) {
          setupConfig.outputAudioTranscription = {};
          setupConfig.inputAudioTranscription = {};
        }

        const setupMessage = { setup: setupConfig };
        ws.send(JSON.stringify(setupMessage));
      };

      ws.onmessage = async (event) => {
        try {
          // Handle both text and binary (Blob) messages
          let jsonStr: string;
          if (event.data instanceof Blob) {
            jsonStr = await event.data.text();
          } else {
            jsonStr = event.data;
          }
          const data = JSON.parse(jsonStr);

          // Setup complete
          if (data.setupComplete) {
            console.log('Setup complete');
            setIsConnected(true);
            setIsConnecting(false);
            await startMicrophone();
            // Beta mode: Gemini handles transcription via outputAudioTranscription/inputAudioTranscription
            // No need for Web Speech API - it causes echo issues
            console.log(experimental ? '[BETA] Using Gemini native transcription' : '[STABLE] No transcription');
          }

          // Server content (audio/text response)
          if (data.serverContent) {
            const content = data.serverContent;

            // Handle model turn (audio response)
            if (content.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) {
                if (part.inlineData?.data) {
                  // Decode base64 audio and queue for playback
                  const audioData = base64ToFloat32Array(part.inlineData.data);
                  audioQueueRef.current.push(audioData);
                  setIsModelSpeaking(true);
                  playAudioQueue();
                }
                if (part.text) {
                  // Use ref to avoid stale closure - accumulate full response
                  currentTranscriptRef.current += part.text;
                  setCurrentTranscript(currentTranscriptRef.current);
                }
              }
            }

            // Turn complete - use ref to get full accumulated transcript
            if (content.turnComplete) {
              setIsModelSpeaking(false);
              const fullTranscript = currentTranscriptRef.current;
              if (fullTranscript && fullTranscript.trim()) {
                setMessages(prev => [...prev, {
                  role: 'model',
                  text: fullTranscript,
                  timestamp: new Date()
                }]);
              }
              // Reset both ref and state
              currentTranscriptRef.current = '';
              setCurrentTranscript('');
            }
          }

          // Transcription of user input (from Gemini's inputAudioTranscription)
          // Buffer partial results and flush after a pause
          if (data.serverContent?.inputTranscription?.text) {
            const text = data.serverContent.inputTranscription.text;
            if (text.trim()) {
              inputTranscriptRef.current += text;
              // Clear any pending flush and set a new one
              if (transcriptFlushTimeoutRef.current) {
                clearTimeout(transcriptFlushTimeoutRef.current);
              }
              // Flush after 800ms of silence (user stopped speaking)
              transcriptFlushTimeoutRef.current = setTimeout(() => {
                const fullText = inputTranscriptRef.current.trim();
                if (fullText) {
                  setMessages(prev => [...prev, {
                    role: 'user',
                    text: fullText,
                    timestamp: new Date()
                  }]);
                  inputTranscriptRef.current = '';
                }
              }, 800);
            }
          }

          // Transcription of operator output (from Gemini's outputAudioTranscription)
          // Buffer partial results - flush when turn completes
          if (data.serverContent?.outputTranscription?.text) {
            const text = data.serverContent.outputTranscription.text;
            if (text.trim()) {
              outputTranscriptRef.current += text;
            }
          }

          // When operator turn completes, flush the buffered output transcription
          if (data.serverContent?.turnComplete && outputTranscriptRef.current.trim()) {
            const fullText = outputTranscriptRef.current.trim();
            setMessages(prev => [...prev, {
              role: 'model',
              text: fullText,
              timestamp: new Date()
            }]);
            outputTranscriptRef.current = '';
          }

        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error. Please try again.');
        setIsConnecting(false);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        // If model not found error and we're on beta, show helpful message
        if (event.reason?.includes('not found') && experimental) {
          setError(`Beta model not available. The transcription-enabled model may not be accessible with your API key. Try "Gemini Voice 1" tab instead.`);
        }
        setIsConnected(false);
        setIsConnecting(false);
        stopMicrophone();
      };

    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setIsConnecting(false);
    }
  }, [currentTranscript]);

  const disconnect = useCallback(() => {
    stopMicrophone();
    stopSpeechRecognition();

    // Clear transcript flush timeout
    if (transcriptFlushTimeoutRef.current) {
      clearTimeout(transcriptFlushTimeoutRef.current);
      transcriptFlushTimeoutRef.current = null;
    }

    // Flush any remaining buffered transcripts before disconnect
    if (inputTranscriptRef.current.trim()) {
      setMessages(prev => [...prev, {
        role: 'user',
        text: inputTranscriptRef.current.trim(),
        timestamp: new Date()
      }]);
    }
    if (outputTranscriptRef.current.trim()) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: outputTranscriptRef.current.trim(),
        timestamp: new Date()
      }]);
    }
    inputTranscriptRef.current = '';
    outputTranscriptRef.current = '';

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Capture transcript before clearing state (use ref to avoid stale closure)
    const finalTranscript = [...messagesRef.current];

    // Finalize call data
    setCallerData(prev => prev ? {
      ...prev,
      endTime: new Date(),
      transcript: finalTranscript
    } : null);

    setIsConnected(false);
    setIsMicActive(false);
    setIsModelSpeaking(false);
    audioQueueRef.current = [];

    // Beta mode: Evaluate call with Claude after disconnect
    if (experimental && finalTranscript.length >= 2) {
      console.log('[BETA] Triggering call evaluation with', finalTranscript.length, 'messages');
      evaluateCallWithClaude(finalTranscript);
    }
  }, [experimental, evaluateCallWithClaude, stopSpeechRecognition]);

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      mediaStreamRef.current = stream;

      // Create audio context for input (16kHz)
      const inputContext = new AudioContext({ sampleRate: 16000 });
      const source = inputContext.createMediaStreamSource(stream);

      // Create script processor to capture audio
      const processor = inputContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = float32ToPcm16(inputData);
        const base64Audio = arrayBufferToBase64(pcmData.buffer);

        // Send realtime audio input
        const message = {
          realtimeInput: {
            mediaChunks: [{
              mimeType: 'audio/pcm;rate=16000',
              data: base64Audio
            }]
          }
        };

        wsRef.current.send(JSON.stringify(message));
      };

      source.connect(processor);
      processor.connect(inputContext.destination);

      setIsMicActive(true);

    } catch (err) {
      console.error('Microphone error:', err);
      setError('Could not access microphone. Please allow microphone access.');
    }
  };

  const stopMicrophone = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsMicActive(false);
  };

  const playAudioQueue = async () => {
    if (isPlayingRef.current || !audioContextRef.current) return;
    isPlayingRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift();
      if (!audioData || !audioContextRef.current) break;

      const buffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
      buffer.copyToChannel(new Float32Array(audioData), 0);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    }

    isPlayingRef.current = false;
    if (audioQueueRef.current.length === 0) {
      setIsModelSpeaking(false);
    }
  };

  // Utility functions
  const float32ToPcm16 = (float32: Float32Array): Int16Array => {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm16;
  };

  const arrayBufferToBase64 = (buffer: ArrayBufferLike): string => {
    const bytes = new Uint8Array(buffer as ArrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const base64ToFloat32Array = (base64: string): Float32Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }
    return float32;
  };

  // Export call data as JSON for dashboard integration
  const exportCallData = () => {
    if (!callerData) return;

    const dataWithTranscript = {
      ...callerData,
      transcript: messages,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(dataWithTranscript, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-data-${callerData.callId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate call duration
  const getCallDuration = () => {
    if (!callerData?.startTime) return '0:00';
    const end = callerData.endTime || new Date();
    const seconds = Math.floor((end.getTime() - callerData.startTime.getTime()) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900 to-red-800 p-4 border-b border-red-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl flex items-center gap-2">
                {experimental ? 'Gemini Voice Beta' : 'Gemini Voice 1'}
                {experimental && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-500 text-white rounded-full">
                    BETA
                  </span>
                )}
              </h2>
              <p className="text-red-200 text-sm flex items-center gap-2">
                <Globe className="w-3 h-3" />
                {experimental ? 'Self-Improving Voice Bot' : 'Multilingual Disaster Assistance'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Beta: Lessons Panel Button */}
            {experimental && (
              <button
                onClick={() => setShowLessonsPanel(!showLessonsPanel)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                  showLessonsPanel ? 'bg-purple-500/30 text-purple-300' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                title="View lessons learned"
              >
                <Brain className="w-4 h-4" />
                <span className="text-sm font-medium">Lessons ({lessons.length})</span>
              </button>
            )}
            {/* Data Panel Button */}
            {callerData && (
              <button
                onClick={() => setShowDataPanel(!showDataPanel)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                  showDataPanel ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                title="View call data"
              >
                <Database className="w-4 h-4" />
                <span className="text-sm font-medium">Data</span>
              </button>
            )}
            {/* Beta: Call count indicator */}
            {experimental && callCount > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-900/30 rounded-full">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-purple-300">{callCount} calls</span>
              </div>
            )}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
              isConnected ? 'bg-green-500/20 text-green-400' :
              isConnecting ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400 animate-pulse' :
                isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-slate-500'
              }`} />
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isConnected && !isConnecting ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            {error ? (
              <div className="text-center max-w-md">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
                <p className="text-slate-400 mb-6">{error}</p>
                {!GEMINI_API_KEY && (
                  <div className="bg-slate-800 rounded-lg p-4 text-left text-sm">
                    <p className="text-slate-300 mb-2">To enable Gemini Live:</p>
                    <ol className="text-slate-400 space-y-1 list-decimal list-inside">
                      <li>Get an API key from <a href="https://aistudio.google.com/apikey" target="_blank" className="text-blue-400 hover:underline">Google AI Studio</a></li>
                      <li>Set <code className="bg-slate-700 px-1 rounded">VITE_GEMINI_API_KEY</code> in Vercel</li>
                      <li>Redeploy the application</li>
                    </ol>
                  </div>
                )}
                <button
                  onClick={() => setError(null)}
                  className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="text-center max-w-lg">
                <div className="relative mb-8">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center mx-auto ring-4 ring-red-600/30">
                    <Phone className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    POWERED BY GEMINI
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Disaster Relief Hotline</h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Connect with an AI-powered disaster assistance operator. Ask about shelters, evacuations,
                  disaster assistance, or speak in your preferred language.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {['English', 'Español', 'Kreyòl', 'Tiếng Việt', '中文', 'العربية'].map(lang => (
                    <span key={lang} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-sm text-slate-300">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Conversation View */
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isConnecting && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">Connecting to Gemini Live...</p>
                  <p className="text-slate-500 text-sm mt-1">Initializing voice channel</p>
                </div>
              </div>
            )}

            {/* Lessons Applied Banner */}
            {lessonsApplied && experimental && (
              <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-3 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">
                  <strong>{lessons.length} lessons</strong> from previous calls applied to this session
                </span>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'model' ? 'justify-start' : 'justify-end'}`}>
                {/* Operator avatar - LEFT side, BLUE */}
                {msg.role === 'model' && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                )}
                {/* Message bubble - Operator BLUE, Caller GREEN */}
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === 'model'
                    ? 'bg-blue-900/50 border border-blue-700/50 text-white rounded-tl-none'
                    : 'bg-emerald-900/50 border border-emerald-700/50 text-white rounded-tr-none'
                }`}>
                  <div className={`text-xs mb-1 ${msg.role === 'model' ? 'text-blue-400' : 'text-emerald-400'}`}>
                    {msg.role === 'model' ? '🎧 Operator' : '🎤 You'}
                  </div>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
                {/* Caller avatar - RIGHT side, GREEN */}
                {msg.role === 'user' && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center flex-shrink-0">
                    <Mic className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Live indicators */}
            {isConnected && (
              <div className="flex items-center gap-3 text-sm">
                {isModelSpeaking && (
                  <div className="flex items-center gap-2 text-red-400">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    <span>Speaking...</span>
                  </div>
                )}
                {isMicActive && !isModelSpeaking && (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>Listening...</span>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-slate-900 border-t border-slate-800">
        <div className="flex justify-center">
          {!isConnected ? (
            <button
              onClick={connect}
              disabled={isConnecting}
              className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg transition-all ${
                isConnecting
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-900/50 hover:scale-105'
              }`}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="w-6 h-6" />
                  Start Call
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={() => isMicActive ? stopMicrophone() : startMicrophone()}
                className={`p-4 rounded-full transition-all ${
                  isMicActive
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
                title={isMicActive ? 'Mute' : 'Unmute'}
              >
                {isMicActive ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>
              <button
                onClick={disconnect}
                className="flex items-center gap-3 px-8 py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg shadow-lg shadow-red-900/50 hover:scale-105 transition-all"
              >
                <PhoneOff className="w-6 h-6" />
                End Call
              </button>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-slate-500 mt-4">
          Demo only • Not for emergency use • Powered by Google Gemini 2.0
        </p>
      </div>

      {/* Data Panel Overlay */}
      {showDataPanel && callerData && (
        <div className="absolute inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDataPanel(false)}
          />
          {/* Panel */}
          <div className="w-96 bg-slate-900 border-l border-slate-700 overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                Call Data Capture
              </h3>
              <button
                onClick={() => setShowDataPanel(false)}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Call Info */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-400 mb-2">Call Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Call ID:</span>
                    <span className="text-white font-mono text-xs">{callerData.callId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Start Time:</span>
                    <span className="text-white">{callerData.startTime.toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Duration:</span>
                    <span className="text-white">{getCallDuration()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className={`font-medium ${isConnected ? 'text-green-400' : 'text-orange-400'}`}>
                      {isConnected ? 'Active' : callerData.endTime ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transcript Stats */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-400 mb-2">Transcript</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Messages:</span>
                    <span className="text-white">{messages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Caller Messages:</span>
                    <span className="text-white">{messages.filter(m => m.role === 'user').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Operator Responses:</span>
                    <span className="text-white">{messages.filter(m => m.role === 'model').length}</span>
                  </div>
                </div>
              </div>

              {/* Export Section */}
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-300 mb-2">Dashboard Export</h4>
                <p className="text-xs text-blue-400/70 mb-3">
                  Export call data as JSON for integration with maps and dashboards.
                </p>
                <button
                  onClick={exportCallData}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download JSON
                </button>
              </div>

              {/* Data Fields Info */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-400 mb-2">Captured Fields</h4>
                <p className="text-xs text-slate-500 mb-3">
                  The following data is captured for each call:
                </p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {[
                    'Call ID', 'Timestamps', 'Duration', 'Language',
                    'Transcript', 'Caller Name', 'Location', 'ZIP Code',
                    'Disaster Type', 'Household Size', 'Medical Needs', 'Pets',
                    'Needs List', 'Shelter Referred', 'Call Outcome'
                  ].map(field => (
                    <div key={field} className="flex items-center gap-1.5 text-slate-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {field}
                    </div>
                  ))}
                </div>
              </div>

              {/* Integration Note */}
              <div className="text-xs text-slate-600 text-center pt-2">
                Data can be sent to ArcGIS, Google Maps, or custom dashboards
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Beta: Lessons Panel Overlay */}
      {showLessonsPanel && experimental && (
        <div className="absolute inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLessonsPanel(false)}
          />
          <div className="w-96 bg-slate-900 border-l border-purple-700/50 overflow-y-auto">
            <div className="sticky top-0 bg-purple-900/50 p-4 border-b border-purple-700/50 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Self-Improving Voice Bot
              </h3>
              <button
                onClick={() => setShowLessonsPanel(false)}
                className="p-1 hover:bg-purple-800/50 rounded"
              >
                <X className="w-5 h-5 text-purple-300" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Stats */}
              <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-700/30">
                <h4 className="text-sm font-medium text-purple-300 mb-3">Learning Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{callCount}</div>
                    <div className="text-xs text-purple-400">Total Calls</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{lessons.length}</div>
                    <div className="text-xs text-purple-400">Lessons Learned</div>
                  </div>
                </div>
              </div>

              {/* Last Evaluation */}
              {criticEvaluation && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    Last Call Evaluation
                  </h4>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`text-3xl font-bold ${
                      criticEvaluation.score >= 8 ? 'text-green-400' :
                      criticEvaluation.score >= 5 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {criticEvaluation.score}/10
                    </div>
                    <div className="text-xs text-slate-500">
                      {criticEvaluation.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  {criticEvaluation.issues.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-red-400 mb-1">Issues Found:</div>
                      <ul className="text-xs text-slate-400 space-y-1">
                        {criticEvaluation.issues.map((issue, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-red-500">•</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {criticEvaluation.lessons.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-green-400 mb-1">New Lessons:</div>
                      <ul className="text-xs text-slate-400 space-y-1">
                        {criticEvaluation.lessons.map((lesson, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-green-500">+</span>
                            {lesson}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* All Lessons */}
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    Stored Lessons ({lessons.length})
                  </h4>
                  <button
                    onClick={() => {
                      const newLesson = window.prompt('Enter a new lesson for the voice bot:');
                      if (newLesson?.trim()) {
                        const updated = [...lessons, newLesson.trim()];
                        setLessons(updated);
                        saveLessons(updated);
                      }
                    }}
                    className="text-xs px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded flex items-center gap-1"
                    title="Manually add a lesson"
                  >
                    + Add
                  </button>
                </div>
                {lessons.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    No lessons yet. Complete a call to get feedback!
                  </p>
                ) : (
                  <ul className="text-xs text-slate-300 space-y-2 max-h-64 overflow-y-auto">
                    {lessons.map((lesson, i) => (
                      <li key={i} className="group flex gap-2 items-start p-2 rounded hover:bg-slate-700/50 transition-colors min-w-0">
                        <span className="text-purple-400 font-bold shrink-0">{i + 1}.</span>
                        {editingLessonIndex === i ? (
                          <div className="flex-1 flex flex-col gap-2">
                            <textarea
                              value={editingLessonText}
                              onChange={(e) => setEditingLessonText(e.target.value)}
                              className="w-full p-2 bg-slate-900 border border-purple-500 rounded text-white text-xs resize-none"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const updated = [...lessons];
                                  updated[i] = editingLessonText.trim();
                                  setLessons(updated);
                                  saveLessons(updated);
                                  setEditingLessonIndex(null);
                                }}
                                className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                              >
                                <Check className="w-3 h-3" /> Save
                              </button>
                              <button
                                onClick={() => setEditingLessonIndex(null)}
                                className="flex items-center gap-1 px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 break-words overflow-hidden">{lesson}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => {
                                  setEditingLessonIndex(i);
                                  setEditingLessonText(lesson);
                                }}
                                className="p-1 hover:bg-purple-600/50 rounded"
                                title="Edit lesson"
                              >
                                <Pencil className="w-3 h-3 text-purple-400" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete lesson #${i + 1}?\n\n"${lesson.substring(0, 50)}..."`)) {
                                    const updated = lessons.filter((_, idx) => idx !== i);
                                    setLessons(updated);
                                    saveLessons(updated);
                                  }
                                }}
                                className="p-1 hover:bg-red-600/50 rounded"
                                title="Delete lesson"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* How it works */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <h4 className="text-xs font-medium text-slate-500 mb-2">How Self-Improvement Works</h4>
                <ol className="text-xs text-slate-500 space-y-1.5">
                  <li className="flex gap-2">
                    <span className="text-purple-400">1.</span>
                    You make a call with the voice bot
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">2.</span>
                    After call ends, Claude evaluates the transcript
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">3.</span>
                    New lessons are extracted and saved
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400">4.</span>
                    Next call gets the improved prompt with lessons
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Beta: Evaluation in progress indicator */}
      {isEvaluating && experimental && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-purple-900/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg border border-purple-700/50">
          <Loader2 className="w-4 h-4 text-purple-300 animate-spin" />
          <span className="text-sm text-purple-200">Claude is evaluating your call...</span>
        </div>
      )}
    </div>
  );
};

export default GeminiLive;

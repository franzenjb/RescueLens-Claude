import { jsPDF } from 'jspdf';
import fs from 'fs';

const doc = new jsPDF();
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 20;
const contentWidth = pageWidth - (margin * 2);
let yPos = margin;

// Helper function for text wrapping
const addWrappedText = (text, x, y, maxWidth, lineHeight = 5) => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + (lines.length * lineHeight);
};

// Check if we need a new page
const checkNewPage = (neededHeight) => {
  if (yPos + neededHeight > pageHeight - 30) {
    doc.addPage();
    yPos = margin;
    return true;
  }
  return false;
};

// ========== HEADER ==========
doc.setFillColor(59, 130, 246); // Blue
doc.rect(0, 0, pageWidth, 35, 'F');

doc.setTextColor(255, 255, 255);
doc.setFontSize(18);
doc.setFont('helvetica', 'bold');
doc.text('RescueLens AI', margin, 15);

doc.setFontSize(12);
doc.setFont('helvetica', 'normal');
doc.text('Disaster Damage Assessment Methodology Recommendations', margin, 24);

doc.setFontSize(9);
doc.text('December 2024', pageWidth - margin - 30, 15);

yPos = 45;

// ========== INTRO ==========
doc.setTextColor(0, 0, 0);
doc.setFontSize(11);
doc.setFont('helvetica', 'bold');
doc.text('METHODOLOGY ANALYSIS: FEMA PDA Image Assessment', margin, yPos);
yPos += 10;

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
const intro = "This document outlines recommended approaches for improving the accuracy and consistency of AI-powered disaster damage assessment that matches images to FEMA Preliminary Damage Assessment (PDA) standards.";
yPos = addWrappedText(intro, margin, yPos, contentWidth, 5);
yPos += 10;

// ========== CURRENT APPROACH ==========
doc.setFillColor(59, 130, 246);
doc.rect(margin, yPos, contentWidth, 8, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
doc.text('CURRENT APPROACH ASSESSMENT', margin + 5, yPos + 6);
yPos += 14;

doc.setTextColor(0, 0, 0);
doc.setFont('helvetica', 'bold');
doc.setFontSize(9);
doc.text('What You Are Doing:', margin, yPos);
yPos += 5;

doc.setFont('helvetica', 'normal');
const currentApproach = "Zero-shot LLM vision (Claude Opus) + detailed FEMA prompting + structured JSON output";
yPos = addWrappedText(currentApproach, margin, yPos, contentWidth, 5);
yPos += 8;

doc.setFont('helvetica', 'bold');
doc.text('Strengths:', margin, yPos);
yPos += 5;
doc.setFont('helvetica', 'normal');
const strengths = [
  "Flexible - handles novel damage types without retraining",
  "Explainable - produces detailed justifications for each classification",
  "No training data required to get started",
  "Easy to update rules (just edit the system prompt)"
];
strengths.forEach(s => {
  doc.text('\u2022 ' + s, margin + 3, yPos);
  yPos += 5;
});
yPos += 3;

doc.setFont('helvetica', 'bold');
doc.text('Weaknesses:', margin, yPos);
yPos += 5;
doc.setFont('helvetica', 'normal');
const weaknesses = [
  "Inconsistent across similar images (no memory between assessments)",
  "Can miss subtle visual cues (water stains, hairline cracks)",
  "Expensive at scale (~$0.15+ per image with Opus)",
  "Does not learn from corrections"
];
weaknesses.forEach(w => {
  doc.text('\u2022 ' + w, margin + 3, yPos);
  yPos += 5;
});
yPos += 10;

// ========== RECOMMENDATIONS ==========
checkNewPage(20);
doc.setFillColor(59, 130, 246);
doc.rect(margin, yPos, contentWidth, 8, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
doc.text('RECOMMENDED METHODOLOGIES (Ranked by ROI)', margin + 5, yPos + 6);
yPos += 14;

// Method 1
doc.setTextColor(0, 0, 0);
doc.setFillColor(34, 197, 94); // Green
doc.rect(margin, yPos, 8, 8, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
doc.text('1', margin + 3, yPos + 6);

doc.setTextColor(0, 0, 0);
doc.text('FEW-SHOT LEARNING WITH REFERENCE IMAGES', margin + 12, yPos + 6);
doc.setTextColor(34, 197, 94);
doc.setFontSize(8);
doc.text('BEST ROI', margin + contentWidth - 20, yPos + 6);
yPos += 12;

doc.setTextColor(0, 0, 0);
doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
const method1Desc = "Add 2-3 labeled example images PER severity level to your prompt. This dramatically improves consistency by giving the model calibration points.";
yPos = addWrappedText(method1Desc, margin, yPos, contentWidth, 5);
yPos += 3;

doc.setFont('helvetica', 'italic');
doc.text('Example prompt addition:', margin, yPos);
yPos += 5;
doc.setFont('helvetica', 'normal');
doc.setTextColor(100, 100, 100);
doc.text('"Here\'s an example of MAJOR damage: [image] - water line at outlet height"', margin + 5, yPos);
yPos += 5;
doc.text('"Here\'s an example of MINOR damage: [image] - water below outlets"', margin + 5, yPos);
yPos += 8;

doc.setTextColor(0, 0, 0);
doc.setFont('helvetica', 'bold');
doc.text('Why it works: ', margin, yPos);
doc.setFont('helvetica', 'normal');
doc.text('LLMs are great pattern matchers but need anchors. Reference images give calibration.', margin + 25, yPos);
yPos += 6;
doc.setFont('helvetica', 'bold');
doc.text('Effort: ', margin, yPos);
doc.setFont('helvetica', 'normal');
doc.text('Low (collect 15-20 good reference images)', margin + 15, yPos);
yPos += 5;
doc.setFont('helvetica', 'bold');
doc.text('Impact: ', margin, yPos);
doc.setFont('helvetica', 'normal');
doc.text('High (30-50% consistency improvement)', margin + 17, yPos);
yPos += 12;

// Method 2
checkNewPage(50);
doc.setFillColor(59, 130, 246); // Blue
doc.rect(margin, yPos, 8, 8, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
doc.text('2', margin + 3, yPos + 6);

doc.setTextColor(0, 0, 0);
doc.text('HYBRID: LLM + CUSTOM CLASSIFIER', margin + 12, yPos + 6);
yPos += 12;

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
const method2Desc = "Train a lightweight CNN to detect specific features (water line height, structural breach, home type), then feed those detections TO Claude as structured input.";
yPos = addWrappedText(method2Desc, margin, yPos, contentWidth, 5);
yPos += 5;

doc.setFont('helvetica', 'italic');
doc.text('Example workflow:', margin, yPos);
yPos += 5;
doc.setFont('helvetica', 'normal');
doc.setTextColor(100, 100, 100);
doc.text('1. CNN detects: "Water line at 24 inches"', margin + 5, yPos);
yPos += 5;
doc.text('2. Feed to Claude: "Classify this conventional home with water at 24 inches"', margin + 5, yPos);
yPos += 8;

doc.setTextColor(0, 0, 0);
doc.setFont('helvetica', 'bold');
doc.text('Why it works: ', margin, yPos);
doc.setFont('helvetica', 'normal');
doc.text('CNNs excel at repetitive visual tasks. LLMs excel at reasoning. Combine both.', margin + 25, yPos);
yPos += 6;
doc.setFont('helvetica', 'bold');
doc.text('Effort: ', margin, yPos);
doc.setFont('helvetica', 'normal');
doc.text('Medium (need ~500+ labeled images per class)', margin + 15, yPos);
yPos += 5;
doc.setFont('helvetica', 'bold');
doc.text('Impact: ', margin, yPos);
doc.setFont('helvetica', 'normal');
doc.text('Very High', margin + 17, yPos);
yPos += 12;

// Method 3
checkNewPage(45);
doc.setFillColor(249, 115, 22); // Orange
doc.rect(margin, yPos, 8, 8, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
doc.text('3', margin + 3, yPos + 6);

doc.setTextColor(0, 0, 0);
doc.text('HUMAN-IN-THE-LOOP + PROMPT REFINEMENT', margin + 12, yPos + 6);
yPos += 12;

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
const method3Desc = "Track where the model fails and WHY. Common failure patterns include: overestimates damage from debris, misses water stains, confuses accessory structures with primary dwelling.";
yPos = addWrappedText(method3Desc, margin, yPos, contentWidth, 5);
yPos += 5;

doc.setFont('helvetica', 'italic');
doc.text('Then add explicit rules for each failure mode:', margin, yPos);
yPos += 5;
doc.setFont('helvetica', 'normal');
doc.setTextColor(100, 100, 100);
doc.text('"CRITICAL: Tree in yard does not equal tree through roof. Verify penetration."', margin + 5, yPos);
yPos += 8;

doc.setTextColor(0, 0, 0);
doc.setFont('helvetica', 'bold');
doc.text('Why it works: ', margin, yPos);
doc.setFont('helvetica', 'normal');
doc.text('Your FEMA rules are good. The issue is usually edge cases not covered.', margin + 25, yPos);
yPos += 6;
doc.setFont('helvetica', 'bold');
doc.text('Effort: ', margin, yPos);
doc.setFont('helvetica', 'normal');
doc.text('Low (logging + prompt iteration)', margin + 15, yPos);
yPos += 5;
doc.setFont('helvetica', 'bold');
doc.text('Impact: ', margin, yPos);
doc.setFont('helvetica', 'normal');
doc.text('Medium-High', margin + 17, yPos);
yPos += 12;

// Method 4
checkNewPage(45);
doc.setFillColor(168, 85, 247); // Purple
doc.rect(margin, yPos, 8, 8, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
doc.text('4', margin + 3, yPos + 6);

doc.setTextColor(0, 0, 0);
doc.text('FINE-TUNED VISION MODEL (Future)', margin + 12, yPos + 6);
yPos += 12;

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
const method4Desc = "If you accumulate 5,000+ labeled images, fine-tune a vision model like GPT-4V (OpenAI), Qwen-VL (open source), or Florence-2 (Microsoft).";
yPos = addWrappedText(method4Desc, margin, yPos, contentWidth, 5);
yPos += 5;

doc.setFont('helvetica', 'bold');
doc.text('Why it works: ', margin, yPos);
doc.setFont('helvetica', 'normal');
doc.text('Domain-specific training beats general prompting for specialized tasks.', margin + 25, yPos);
yPos += 6;
doc.setFont('helvetica', 'bold');
doc.text('Effort: ', margin, yPos);
doc.setFont('helvetica', 'normal');
doc.text('High (dataset collection, training infrastructure)', margin + 15, yPos);
yPos += 5;
doc.setFont('helvetica', 'bold');
doc.text('Impact: ', margin, yPos);
doc.setFont('helvetica', 'normal');
doc.text('Highest (but requires scale)', margin + 17, yPos);
yPos += 15;

// ========== ACTION PLAN ==========
checkNewPage(60);
doc.setFillColor(34, 197, 94); // Green
doc.rect(margin, yPos, contentWidth, 8, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
doc.text('RECOMMENDED ACTION PLAN', margin + 5, yPos + 6);
yPos += 14;

doc.setTextColor(0, 0, 0);
doc.setFontSize(9);

const actions = [
  { phase: 'IMMEDIATELY', action: 'Add 2-3 reference images per severity level to the prompt (few-shot learning)' },
  { phase: 'SHORT-TERM', action: 'Log assessment failures and add explicit error-correction rules to the prompt' },
  { phase: 'MEDIUM-TERM', action: 'Build a water-line height detector (CNN) to feed measurements to Claude' },
  { phase: 'LONG-TERM', action: 'Collect a labeled dataset of 5,000+ images for fine-tuning' }
];

actions.forEach((item, i) => {
  doc.setFont('helvetica', 'bold');
  doc.text(`${i + 1}. ${item.phase}:`, margin, yPos);
  doc.setFont('helvetica', 'normal');
  yPos = addWrappedText(item.action, margin + 5, yPos + 5, contentWidth - 5, 5);
  yPos += 5;
});

yPos += 10;

// ========== SUMMARY TABLE ==========
checkNewPage(50);
doc.setFillColor(245, 245, 245);
doc.rect(margin, yPos, contentWidth, 8, 'F');
doc.setTextColor(0, 0, 0);
doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
doc.text('COMPARISON SUMMARY', margin + 5, yPos + 6);
yPos += 12;

// Table header
doc.setFontSize(8);
doc.setFont('helvetica', 'bold');
doc.text('Method', margin, yPos);
doc.text('Effort', margin + 70, yPos);
doc.text('Impact', margin + 100, yPos);
doc.text('Data Needed', margin + 130, yPos);
yPos += 5;
doc.setDrawColor(200, 200, 200);
doc.line(margin, yPos, margin + contentWidth, yPos);
yPos += 4;

// Table rows
doc.setFont('helvetica', 'normal');
const tableRows = [
  ['Few-Shot Reference Images', 'Low', 'High', '15-20 images'],
  ['Hybrid LLM + CNN', 'Medium', 'Very High', '500+ per class'],
  ['Human-in-the-Loop', 'Low', 'Medium-High', 'Failure logs'],
  ['Fine-Tuned Model', 'High', 'Highest', '5,000+ images']
];

tableRows.forEach(row => {
  doc.text(row[0], margin, yPos);
  doc.text(row[1], margin + 70, yPos);
  doc.text(row[2], margin + 100, yPos);
  doc.text(row[3], margin + 130, yPos);
  yPos += 5;
});

// ========== FOOTER ==========
const footerY = pageHeight - 15;
doc.setDrawColor(59, 130, 246);
doc.setLineWidth(0.5);
doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

doc.setTextColor(100, 100, 100);
doc.setFontSize(7);
doc.text('RescueLens AI | FEMA PDA Assessment Methodology', margin, footerY);
doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, footerY + 4);

// Save the PDF
const pdfBuffer = doc.output('arraybuffer');
fs.writeFileSync('RescueLens_Methodology_Recommendations.pdf', Buffer.from(pdfBuffer));
console.log('PDF generated: RescueLens_Methodology_Recommendations.pdf');

import jsPDF from 'jspdf';
import { DamageReport, DamageSeverity } from '../types';

const SEVERITY_COLORS: Record<DamageSeverity, [number, number, number]> = {
  [DamageSeverity.INACCESSIBLE]: [168, 85, 247],
  [DamageSeverity.DESTROYED]: [220, 38, 38],
  [DamageSeverity.MAJOR]: [249, 115, 22],
  [DamageSeverity.MINOR]: [234, 179, 8],
  [DamageSeverity.AFFECTED]: [59, 130, 246],
  [DamageSeverity.NO_VISIBLE_DAMAGE]: [100, 116, 139],
  [DamageSeverity.UNKNOWN]: [107, 114, 128],
};

const SEVERITY_OUTCOMES: Record<DamageSeverity, string> = {
  [DamageSeverity.INACCESSIBLE]: 'Assessment pending - property inaccessible, requires follow-up visit',
  [DamageSeverity.DESTROYED]: 'Full disaster relief - total loss, long-term housing assistance',
  [DamageSeverity.MAJOR]: 'Relocation assistance - structure uninhabitable pending major repairs',
  [DamageSeverity.MINOR]: 'Emergency repair assistance - temporary tarping/boarding',
  [DamageSeverity.AFFECTED]: 'Clean-up assistance provided - structure habitable',
  [DamageSeverity.NO_VISIBLE_DAMAGE]: 'No assistance required - property verified safe',
  [DamageSeverity.UNKNOWN]: 'Assessment incomplete - insufficient evidence, requires manual review',
};

function generateNarrative(report: DamageReport): string {
  const severity = report.analysis?.overallSeverity || DamageSeverity.NO_VISIBLE_DAMAGE;
  const clientName = report.clientInfo?.name || 'The resident';
  const address = `${report.location.address}, ${report.location.city || ''} ${report.location.state || ''}`.trim();
  const homeType = report.analysis?.homeType?.toLowerCase() || 'residential';

  const narratives: Record<DamageSeverity, string> = {
    [DamageSeverity.INACCESSIBLE]: `${clientName} reported damage to their ${homeType} residence at ${address}. Field assessment could not be completed as the property was inaccessible due to blocked roads, standing floodwater, debris obstruction, or compromised infrastructure. A follow-up assessment has been scheduled once access is restored. ${clientName} was provided with emergency contact information and advised to document any visible damage from a safe distance.`,

    [DamageSeverity.DESTROYED]: `${clientName}'s ${homeType} residence at ${address} was destroyed in the disaster event. Field assessment confirmed total structural loss - the building envelope has catastrophically failed with complete roof collapse and/or wall failure. The property is not recoverable and has been red-tagged. ${clientName} and all household members have been evacuated and provided emergency shelter placement. Full disaster relief services have been activated including emergency financial assistance, housing assistance, and mental health support referrals. Long-term recovery case management has been initiated.`,

    [DamageSeverity.MAJOR]: `${clientName}'s ${homeType} residence at ${address} sustained major structural damage. Assessment confirmed significant breach of the building envelope with damage to load-bearing components. The structure has been deemed uninhabitable pending major repairs. ${clientName} and household members have been relocated to emergency shelter at the designated facility. Financial assistance for immediate needs has been provided. Case has been escalated to long-term recovery team for ongoing support. Structural engineering assessment has been requested.`,

    [DamageSeverity.MINOR]: `${clientName} reported damage to their ${homeType} residence at ${address} following severe weather. Assessment revealed minor structural damage including damage to exterior surfaces (siding, shingles, or windows). The building envelope has minor breaches but remains largely intact. The home is habitable with temporary repairs. Emergency tarping/boarding was coordinated to prevent further weather infiltration. ${clientName} was provided with contractor referrals and information about disaster assistance programs. Follow-up scheduled in 72 hours.`,

    [DamageSeverity.AFFECTED]: `${clientName} contacted disaster services following storm damage at ${address}. Field assessment revealed the ${homeType} structure remains structurally sound with the building envelope fully intact. However, significant debris was observed in the yard/driveway area requiring cleanup assistance. ${clientName} confirmed the interior of the home was not compromised. A Clean-Up Kit was provided along with information about debris removal services. The family is able to safely remain in the home during cleanup operations.`,

    [DamageSeverity.NO_VISIBLE_DAMAGE]: `${clientName} reported concerns following the recent storm event affecting ${address}. Upon field assessment, the ${homeType} structure showed no visible damage. All structural components including roof, walls, and foundation appear intact. The property perimeter was inspected and found to be clear of hazardous debris. ${clientName} was provided with disaster preparedness materials and contact information for future assistance if needed.`,

    [DamageSeverity.UNKNOWN]: `${clientName} reported damage to their ${homeType} residence at ${address}. Field assessment was attempted but insufficient evidence was available to make a definitive damage classification. The case has been flagged for manual review by a senior assessor. ${clientName} was advised to gather additional documentation including photographs and receipts for any emergency repairs. A follow-up assessment has been scheduled.`,
  };

  return narratives[severity];
}

function generateCaseworkerNotes(report: DamageReport): string {
  const severity = report.analysis?.overallSeverity || DamageSeverity.NO_VISIBLE_DAMAGE;
  const detections = report.analysis?.detections || [];

  let notes = `Field Assessment Verification:\n`;
  notes += `• Primary damage indicator: ${detections[0]?.object || 'None identified'}\n`;
  notes += `• Debris classification: ${detections[0]?.type || 'N/A'}\n`;
  notes += `• Structural envelope: ${report.analysis?.structuralAssessment || 'Not assessed'}\n`;
  notes += `• AI confidence level: ${report.analysis?.confidence || 0}%\n\n`;

  notes += `Recommendations:\n`;
  (report.analysis?.recommendations || []).forEach((rec, i) => {
    notes += `${i + 1}. ${rec}\n`;
  });

  return notes;
}

export async function exportCaseReport(report: DamageReport): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Helper function for text wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5): number => {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * lineHeight);
  };

  // ========== HEADER ==========
  // Red banner
  doc.setFillColor(237, 27, 46); // Brand red
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('AMERICAN RED CROSS', margin, 15);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Disaster Damage Assessment Report', margin, 24);

  // Report ID
  doc.setFontSize(9);
  doc.text(`Case ID: ${report.id}`, pageWidth - margin - 50, 15);
  doc.text(`Date: ${new Date(report.createdAt).toLocaleDateString()}`, pageWidth - margin - 50, 22);

  yPos = 45;

  // ========== SEVERITY BADGE ==========
  const severity = report.analysis?.overallSeverity || DamageSeverity.NO_VISIBLE_DAMAGE;
  const severityColor = SEVERITY_COLORS[severity];

  doc.setFillColor(severityColor[0], severityColor[1], severityColor[2]);
  doc.roundedRect(margin, yPos, 50, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(severity.replace(/_/g, ' '), margin + 25, yPos + 7, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Confidence: ${report.analysis?.confidence || 0}%`, margin + 55, yPos + 7);

  yPos += 20;

  // ========== CLIENT & CASEWORKER INFO ==========
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, contentWidth, 30, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT INFORMATION', margin + 5, yPos + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Name: ${report.clientInfo?.name || 'Not recorded'}`, margin + 5, yPos + 16);
  doc.text(`Phone: ${report.clientInfo?.phone || 'Not recorded'}`, margin + 5, yPos + 22);
  doc.text(`Address: ${report.location.address}, ${report.location.city || ''} ${report.location.state || ''} ${report.location.zip || ''}`, margin + 5, yPos + 28);

  doc.setFont('helvetica', 'bold');
  doc.text('CASEWORKER', margin + contentWidth/2 + 5, yPos + 8);

  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${report.clientInfo?.caseworker || 'Field Team'}`, margin + contentWidth/2 + 5, yPos + 16);
  doc.text(`Email: ${report.clientInfo?.caseworkerEmail || 'disaster.services@example.org'}`, margin + contentWidth/2 + 5, yPos + 22);
  doc.text(`Assessment Date: ${new Date(report.createdAt).toLocaleString()}`, margin + contentWidth/2 + 5, yPos + 28);

  yPos += 38;

  // ========== IMAGE ==========
  if (report.imageData) {
    try {
      // Get actual image dimensions to preserve aspect ratio
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = report.imageData!;
      });

      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;
      const aspectRatio = originalWidth / originalHeight;

      // Max dimensions for the image in the PDF
      const maxImgWidth = 80;
      const maxImgHeight = 70;

      // Calculate dimensions preserving aspect ratio
      let imgWidth: number;
      let imgHeight: number;

      if (aspectRatio > maxImgWidth / maxImgHeight) {
        // Image is wider - constrain by width
        imgWidth = maxImgWidth;
        imgHeight = maxImgWidth / aspectRatio;
      } else {
        // Image is taller - constrain by height
        imgHeight = maxImgHeight;
        imgWidth = maxImgHeight * aspectRatio;
      }

      // Use PNG format for better quality (JPEG can introduce artifacts)
      doc.addImage(report.imageData, 'PNG', margin, yPos, imgWidth, imgHeight);

      // Summary box next to image (use the larger height for consistent layout)
      const boxHeight = Math.max(imgHeight, 50);
      doc.setFillColor(250, 250, 250);
      doc.rect(margin + imgWidth + 5, yPos, contentWidth - imgWidth - 5, boxHeight, 'F');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(severityColor[0], severityColor[1], severityColor[2]);
      doc.text('ASSESSMENT SUMMARY', margin + imgWidth + 10, yPos + 8);

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const summaryText = report.analysis?.summary || 'No summary available';
      addWrappedText(summaryText, margin + imgWidth + 10, yPos + 16, contentWidth - imgWidth - 20, 4);

      yPos += boxHeight + 8;
    } catch (e) {
      console.error('Failed to add image to PDF:', e);
      yPos += 10;
    }
  }

  // ========== NARRATIVE ==========
  doc.setFillColor(237, 27, 46);
  doc.rect(margin, yPos, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CASE NARRATIVE', margin + 5, yPos + 6);
  yPos += 12;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const narrative = generateNarrative(report);
  yPos = addWrappedText(narrative, margin, yPos, contentWidth, 5);
  yPos += 8;

  // ========== OUTCOME ==========
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, contentWidth, 15, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('OUTCOME:', margin + 5, yPos + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(SEVERITY_OUTCOMES[severity], margin + 35, yPos + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('STATUS:', margin + 5, yPos + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(report.assistance?.status || 'Case Open', margin + 35, yPos + 12);

  yPos += 22;

  // ========== TECHNICAL DETAILS ==========
  if (yPos < 200) {
    doc.setFillColor(237, 27, 46);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CASEWORKER NOTES', margin + 5, yPos + 6);
    yPos += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const notes = generateCaseworkerNotes(report);
    yPos = addWrappedText(notes, margin, yPos, contentWidth, 4);
  }

  // ========== FOOTER ==========
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(237, 27, 46);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.text('Disaster Services | Confidential Client Record', margin, footerY);
  doc.text(`Generated: ${new Date().toLocaleString()} | RescueLens AI Assessment Tool`, margin, footerY + 4);
  doc.text(`Page 1 of 1`, pageWidth - margin - 20, footerY);

  // Save the PDF with proper filename
  const filename = `ARC_Case_${report.id}_${new Date().toISOString().split('T')[0]}.pdf`;

  // Use blob approach for better browser compatibility with filenames
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate a complete case with sample client data
export function generateSampleClientInfo(): {
  name: string;
  phone: string;
  caseworker: string;
  caseworkerEmail: string;
} {
  const firstNames = ['Sarah', 'Michael', 'Jennifer', 'Robert', 'Maria', 'James', 'Linda', 'William', 'Patricia', 'David'];
  const lastNames = ['Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson'];
  const caseworkers = [
    { name: 'Jeff Franzen', email: 'jeff.franzen@example.org' },
    { name: 'Maria Garcia', email: 'maria.garcia@example.org' },
    { name: 'Steve Thompson', email: 'steve.thompson@example.org' },
    { name: 'Diana Chen', email: 'diana.chen@example.org' },
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const cw = caseworkers[Math.floor(Math.random() * caseworkers.length)];

  return {
    name: `${firstName} ${lastName}`,
    phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
    caseworker: cw.name,
    caseworkerEmail: cw.email,
  };
}

import { useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { TenderWithRequirements } from '@/types/tender';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { format } from 'date-fns';
import tippFocusLogo from '@/assets/tipp-focus-logo.png';

interface TenderPdfReportProps {
  tender: TenderWithRequirements;
}

export function TenderPdfReport({ tender }: TenderPdfReportProps) {
  const generatePdf = useCallback(async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Load and add logo
    try {
      const img = new Image();
      img.src = tippFocusLogo;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      doc.addImage(img, 'PNG', margin, y, 40, 20);
      y += 30;
    } catch {
      // Continue without logo if it fails to load
      y += 10;
    }

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Tender Report', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Generated on ${format(new Date(), 'PPP p')}`, margin, y);
    doc.setTextColor(0);
    y += 15;

    // Helper function for section headers
    const addSectionHeader = (title: string) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 5, pageWidth - margin * 2, 10, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 2, y + 2);
      y += 12;
    };

    // Helper function for field rows
    const addField = (label: string, value: string | null | undefined) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', margin, y);
      doc.setFont('helvetica', 'normal');
      const displayValue = value || 'N/A';
      const maxWidth = pageWidth - margin * 2 - 60;
      const lines = doc.splitTextToSize(displayValue, maxWidth);
      doc.text(lines, margin + 60, y);
      y += Math.max(7, lines.length * 5);
    };

    // Basic Information Section
    addSectionHeader('Basic Information');
    addField('Tender Reference', tender.tender_reference);
    addField('Title', tender.title);
    addField('Client Name', tender.client_name);
    addField('Status', tender.status.charAt(0).toUpperCase() + tender.status.slice(1));
    addField('Submission Deadline', format(new Date(tender.submission_deadline), 'PPP p'));
    addField('Estimated Value', tender.estimated_value 
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tender.estimated_value)
      : null);
    y += 5;

    // Assignment Section
    addSectionHeader('Assignment');
    addField('Assigned Lead', tender.assigned_lead_name);
    addField('Lead Email', tender.assigned_lead_email);
    y += 5;

    // New Fields Section
    addSectionHeader('Briefing & Project Details');
    addField('Briefing Date', tender.briefing_date ? format(new Date(tender.briefing_date), 'PPP') : null);
    addField('Briefing Attended', tender.briefing_attended ? 'Yes' : 'No');
    addField('Duration (Months)', tender.duration_months?.toString());
    addField('Budget', tender.budget 
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tender.budget)
      : null);
    addField('Rating', tender.rating);
    y += 5;

    // Outcome Section
    addSectionHeader('Outcome');
    const outcomeStatusLabels = {
      completed: 'Completed',
      in_progress: 'In Progress',
      not_started: 'Not Started',
    };
    addField('Outcome Status', outcomeStatusLabels[tender.outcome_status]);
    addField('Submitted', tender.submitted ? 'Yes' : 'No');
    addField('Successful', tender.successful === null ? 'Pending' : tender.successful ? 'Yes' : 'No');
    if (tender.non_submission_reason) {
      addField('Reason for Non-Submission', tender.non_submission_reason);
    }
    y += 5;

    // Requirements Checklist Section
    if (tender.tender_requirements) {
      addSectionHeader('Requirements Checklist');
      const req = tender.tender_requirements;
      
      const statusLabels = {
        not_required: 'Not Required',
        requested: 'Requested',
        finalised: 'Finalised',
        outstanding: 'Outstanding',
        compiled: 'Compiled',
        not_started: 'Not Started',
        in_progress: 'In Progress',
      };

      addField('Quote', req.quote_required 
        ? statusLabels[req.quote_status]
        : 'Not Required');
      addField('Reference Letters', req.reference_letters_required 
        ? statusLabels[req.reference_letters_status]
        : 'Not Required');
      addField('Accreditation', req.accreditation_required 
        ? statusLabels[req.accreditation_status]
        : 'Not Required');
      addField('CVs', req.cvs_required 
        ? statusLabels[req.cvs_status]
        : 'Not Required');
      addField('Technical Response', statusLabels[req.technical_response_status]);
      addField('Pricing Finalised', req.pricing_finalised ? 'Yes' : 'No');
    }

    // Timestamps
    y += 10;
    addSectionHeader('Record Information');
    addField('Created At', format(new Date(tender.created_at), 'PPP p'));
    addField('Last Updated', format(new Date(tender.updated_at), 'PPP p'));

    // Save the PDF
    doc.save(`Tender-${tender.tender_reference}.pdf`);
  }, [tender]);

  return (
    <Button variant="outline" size="sm" onClick={generatePdf}>
      <FileDown className="mr-2 h-4 w-4" />
      Generate PDF
    </Button>
  );
}

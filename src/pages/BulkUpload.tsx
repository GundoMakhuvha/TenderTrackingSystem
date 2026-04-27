import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBulkCreateTenders } from '@/hooks/useTenders';
import { TenderFormData, TenderStatus, OutcomeStatus } from '@/types/tender';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function BulkUpload() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkCreate = useBulkCreateTenders();
  
  const [parsedData, setParsedData] = useState<TenderFormData[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const parseCSV = (content: string): { rows: TenderFormData[]; errors: string[] } => {
    const lines = content.trim().split('\n');
    const errors: string[] = [];
    const rows: TenderFormData[] = [];

    if (lines.length < 2) {
      errors.push('File must have at least a header row and one data row');
      return { rows: [], errors };
    }

    // Expected headers (case-insensitive)
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    const requiredHeaders = [
      'tender_reference',
      'title', 
      'client_name',
      'submission_deadline',
      'assigned_lead_name',
      'assigned_lead_email',
    ];

    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
      return { rows: [], errors };
    }

    const getIndex = (header: string) => headers.indexOf(header);

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Basic CSV parsing (handles quoted values)
      const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];

      const tenderRef = values[getIndex('tender_reference')] || '';
      
      if (!tenderRef) {
        errors.push(`Row ${i + 1}: Missing tender reference`);
        continue;
      }

      const deadline = values[getIndex('submission_deadline')] || '';
      let parsedDeadline: string;
      try {
        const date = new Date(deadline);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }
        parsedDeadline = date.toISOString();
      } catch {
        errors.push(`Row ${i + 1} (${tenderRef}): Invalid deadline format`);
        continue;
      }

      const statusValue = (values[getIndex('status')] || 'drafting').toLowerCase() as TenderStatus;
      if (!['drafting', 'review', 'submitted'].includes(statusValue)) {
        errors.push(`Row ${i + 1} (${tenderRef}): Invalid status (must be drafting, review, or submitted)`);
        continue;
      }

      const parseBoolean = (val: string | undefined): boolean => {
        if (!val) return false;
        return ['yes', 'true', '1', 'y'].includes(val.toLowerCase());
      };

      const parseBooleanNullable = (val: string | undefined): boolean | null => {
        if (!val || val.toLowerCase() === 'pending' || val.toLowerCase() === 'n/a') return null;
        return ['yes', 'true', '1', 'y'].includes(val.toLowerCase());
      };

      const outcomeStatusValue = (values[getIndex('outcome_status')] || 'not_started').toLowerCase().replace(' ', '_') as OutcomeStatus;
      const validOutcomeStatuses = ['completed', 'in_progress', 'not_started'];
      const finalOutcomeStatus: OutcomeStatus = validOutcomeStatuses.includes(outcomeStatusValue) ? outcomeStatusValue : 'not_started';

      // Parse briefing date
      let briefingDate: string | null = null;
      const briefingDateValue = values[getIndex('briefing_date')];
      if (briefingDateValue) {
        try {
          const date = new Date(briefingDateValue);
          if (!isNaN(date.getTime())) {
            briefingDate = date.toISOString().split('T')[0];
          }
        } catch {
          // Invalid date, keep as null
        }
      }

      // Parse department
      const deptValue = values[getIndex('department')];
      let department: 'Resourcing' | 'Consulting' | 'Technology' | null = null;
      if (deptValue === 'Resourcing' || deptValue === 'Consulting' || deptValue === 'Technology') {
        department = deptValue;
      }

      const row: TenderFormData = {
        tender_reference: tenderRef,
        title: values[getIndex('title')] || '',
        client_name: values[getIndex('client_name')] || '',
        submission_deadline: parsedDeadline,
        assigned_lead_name: values[getIndex('assigned_lead_name')] || '',
        assigned_lead_email: values[getIndex('assigned_lead_email')] || '',
        status: statusValue,
        estimated_value: values[getIndex('estimated_value')] ? Number(values[getIndex('estimated_value')]) : null,
        quote_required: parseBoolean(values[getIndex('quote_required')]),
        reference_letters_required: parseBoolean(values[getIndex('reference_letters_required')]),
        accreditation_required: parseBoolean(values[getIndex('accreditation_required')]),
        cvs_required: parseBoolean(values[getIndex('cvs_required')]),
        // New fields
        briefing_date: briefingDate,
        briefing_time: values[getIndex('briefing_time')] || null,
        briefing_attended: parseBoolean(values[getIndex('briefing_attended')]),
        briefing_compulsory: parseBoolean(values[getIndex('briefing_compulsory')]),
        duration_months: values[getIndex('duration_months')] ? Number(values[getIndex('duration_months')]) : null,
        budget: values[getIndex('budget')] ? Number(values[getIndex('budget')]) : null,
        rating: values[getIndex('rating')] || null,
        outcome_status: finalOutcomeStatus,
        submitted: parseBoolean(values[getIndex('submitted')]),
        successful: parseBooleanNullable(values[getIndex('successful')]),
        non_submission_reason: values[getIndex('non_submission_reason')] || null,
        // Additional fields
        department: department,
        category: values[getIndex('category')] || null,
        assignment: values[getIndex('assignment')] || null,
        submission_type: values[getIndex('submission_type')] || null,
        internal_completion_date: values[getIndex('internal_completion_date')] || null,
      };

      // Validate required fields
      if (!row.title) {
        errors.push(`Row ${i + 1} (${tenderRef}): Missing title`);
        continue;
      }
      if (!row.client_name) {
        errors.push(`Row ${i + 1} (${tenderRef}): Missing client name`);
        continue;
      }
      if (!row.assigned_lead_name) {
        errors.push(`Row ${i + 1} (${tenderRef}): Missing assigned lead name`);
        continue;
      }
      if (!row.assigned_lead_email) {
        errors.push(`Row ${i + 1} (${tenderRef}): Missing assigned lead email`);
        continue;
      }

      rows.push(row);
    }

    return { rows, errors };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const { rows, errors } = parseCSV(content);
      setParsedData(rows);
      setParseErrors(errors);
      setUploadResult(null);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No data to upload',
        description: 'Please select a valid CSV file with tender data.',
      });
      return;
    }

    try {
      const result = await bulkCreate.mutateAsync(parsedData);
      setUploadResult(result);
      
      if (result.failed === 0) {
        toast({
          title: 'Upload complete',
          description: `Successfully created ${result.success} tender(s).`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload completed with errors',
          description: `Created ${result.success}, failed ${result.failed}.`,
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'An error occurred during upload.',
      });
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'tender_reference',
      'title',
      'client_name',
      'submission_deadline',
      'assigned_lead_name',
      'assigned_lead_email',
      'status',
      'estimated_value',
      'quote_required',
      'reference_letters_required',
      'accreditation_required',
      'cvs_required',
      'briefing_date',
      'briefing_attended',
      'duration_months',
      'budget',
      'rating',
      'outcome_status',
      'submitted',
      'successful',
      'non_submission_reason',
    ];
    
    const exampleRow = [
      'TND-2025-001',
      'IT Support Services',
      'Acme Corporation',
      '2025-03-15T17:00:00',
      'John Smith',
      'john.smith@company.com',
      'drafting',
      '50000',
      'yes',
      'no',
      'yes',
      'yes',
      '2025-02-01',
      'yes',
      '12',
      '100000',
      'A',
      'in_progress',
      'no',
      'pending',
      '',
    ];

    const csv = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tender_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tenders">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Bulk Upload</h1>
          <p className="text-muted-foreground mt-1">
            Upload multiple tenders from a CSV file
          </p>
        </div>
      </div>

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle>Download Template</CardTitle>
          <CardDescription>
            Use our CSV template to ensure your data is formatted correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV Template
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Select a CSV file with tender data. The file must include headers matching the template.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div 
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Click to select a CSV file or drag and drop
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Parsing Errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  {parseErrors.slice(0, 10).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {parseErrors.length > 10 && (
                    <li>...and {parseErrors.length - 10} more errors</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Parsed Data Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Ready to Upload</AlertTitle>
                <AlertDescription>
                  {parsedData.length} tender(s) parsed successfully and ready for upload.
                </AlertDescription>
              </Alert>

              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Reference</th>
                      <th className="text-left p-2">Title</th>
                      <th className="text-left p-2">Client</th>
                      <th className="text-left p-2">Lead</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-mono text-xs">{row.tender_reference}</td>
                        <td className="p-2">{row.title}</td>
                        <td className="p-2">{row.client_name}</td>
                        <td className="p-2">{row.assigned_lead_name}</td>
                      </tr>
                    ))}
                    {parsedData.length > 10 && (
                      <tr className="border-t">
                        <td colSpan={4} className="p-2 text-center text-muted-foreground">
                          ...and {parsedData.length - 10} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <Button onClick={handleUpload} disabled={bulkCreate.isPending} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                {bulkCreate.isPending ? 'Uploading...' : `Upload ${parsedData.length} Tender(s)`}
              </Button>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <Alert variant={uploadResult.failed > 0 ? 'destructive' : 'default'}>
              {uploadResult.failed > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <AlertTitle>Upload Complete</AlertTitle>
              <AlertDescription>
                <p>Successfully created: {uploadResult.success}</p>
                <p>Failed: {uploadResult.failed}</p>
                {uploadResult.errors.length > 0 && (
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    {uploadResult.errors.slice(0, 5).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Required columns:</strong> tender_reference, title, client_name, submission_deadline, assigned_lead_name, assigned_lead_email</p>
          <p><strong>Optional columns:</strong> status, estimated_value, quote_required, reference_letters_required, accreditation_required, cvs_required, briefing_date, briefing_attended, duration_months, budget, rating, outcome_status, submitted, successful, non_submission_reason</p>
          <p><strong>Date format:</strong> ISO 8601 format (e.g., 2025-03-15T17:00:00) or any parseable date string</p>
          <p><strong>Boolean values:</strong> Use "yes", "true", "1", or "y" for true; anything else is false. Use "pending" or leave empty for nullable success field.</p>
          <p><strong>Outcome status:</strong> Use "not_started", "in_progress", or "completed"</p>
          <p><strong>Duplicate handling:</strong> Tenders with duplicate references will be rejected</p>
        </CardContent>
      </Card>
    </div>
  );
}

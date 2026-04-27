import { useState, useRef } from 'react';
import { useAttachments, useUploadAttachment, useDeleteAttachment, useDownloadAttachment, useViewAttachment } from '@/hooks/useAttachments';
import { TenderAttachment } from '@/types/tender';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2, Download, Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface AttachmentUploadProps {
  tenderId: string;
  requirementType: TenderAttachment['requirement_type'];
  label: string;
  disabled?: boolean;
}

export function AttachmentUpload({ tenderId, requirementType, label, disabled }: AttachmentUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const { data: allAttachments } = useAttachments(tenderId);
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();
  const downloadAttachment = useDownloadAttachment();
  const viewAttachment = useViewAttachment();

  const attachments = allAttachments?.filter(a => a.requirement_type === requirementType) ?? [];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await uploadAttachment.mutateAsync({
          tenderId,
          requirementType,
          file,
        });
        succeeded++;
      } catch (error: any) {
        failed++;
        toast({
          variant: 'destructive',
          title: `Upload failed: ${file.name}`,
          description: error.message || 'Failed to upload file',
        });
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    if (succeeded > 0) {
      toast({
        title: succeeded === 1 ? 'File uploaded' : 'Files uploaded',
        description: `${succeeded} file${succeeded === 1 ? '' : 's'} uploaded successfully${failed > 0 ? `, ${failed} failed` : ''}.`,
      });
    }

    setTimeout(() => {
      setIsUploading(false);
      setUploadProgress(0);
    }, 500);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (attachment: TenderAttachment) => {
    try {
      await deleteAttachment.mutateAsync({ attachment });
      toast({
        title: 'File deleted',
        description: 'The attachment has been removed.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error.message || 'Failed to delete file',
      });
    }
  };

  const handleDownload = async (attachment: TenderAttachment) => {
    try {
      const blob = await downloadAttachment.mutateAsync(attachment.file_path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: error.message || 'Failed to download file',
      });
    }
  };

  const handleView = async (attachment: TenderAttachment) => {
    try {
      const signedUrl = await viewAttachment.mutateAsync(attachment.file_path);
      window.open(signedUrl, '_blank');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'View failed',
        description: error.message || 'Failed to view file',
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label} Attachments</span>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isUploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-3 w-3" />
                Upload
              </>
            )}
          </Button>
        </div>
      </div>

      {isUploading && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{uploadProgress}%</p>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)} • {format(new Date(attachment.created_at), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleView(attachment)}
                  title="View"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDownload(attachment)}
                  title="Download"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(attachment)}
                  disabled={disabled}
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

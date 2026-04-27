import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TenderAttachment } from '@/types/tender';

export function useAttachments(tenderId: string | undefined) {
  return useQuery({
    queryKey: ['attachments', tenderId],
    queryFn: async () => {
      if (!tenderId) return [];
      
      const { data, error } = await supabase
        .from('tender_attachments')
        .select('*')
        .eq('tender_id', tenderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as TenderAttachment[]) ?? [];
    },
    enabled: !!tenderId,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenderId,
      requirementType,
      file,
    }: {
      tenderId: string;
      requirementType: TenderAttachment['requirement_type'];
      file: File;
    }) => {
      // Upload file to storage
      const filePath = `${tenderId}/${requirementType}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tender-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create attachment record
      const { data, error } = await supabase
        .from('tender_attachments')
        .insert({
          tender_id: tenderId,
          requirement_type: requirementType,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', variables.tenderId] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attachment }: { attachment: TenderAttachment }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('tender-attachments')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete record
      const { error } = await supabase
        .from('tender_attachments')
        .delete()
        .eq('id', attachment.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', variables.attachment.tender_id] });
    },
  });
}

export function useDownloadAttachment() {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const { data, error } = await supabase.storage
        .from('tender-attachments')
        .download(filePath);

      if (error) throw error;
      return data;
    },
  });
}

export function useViewAttachment() {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const { data, error } = await supabase.storage
        .from('tender-attachments')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    },
  });
}

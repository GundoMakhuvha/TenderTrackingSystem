import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamMember {
  id: string;
  tender_id: string;
  user_id: string;
  created_at: string;
  profile?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

export function useTeamMembers(tenderId: string | undefined) {
  return useQuery({
    queryKey: ['team_members', tenderId],
    queryFn: async () => {
      if (!tenderId) return [];
      
      // Fetch team members
      const { data: members, error } = await supabase
        .from('tender_team_members')
        .select('*')
        .eq('tender_id', tenderId);

      if (error) throw error;
      if (!members || members.length === 0) return [];

      // Fetch profiles for these members
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Merge profiles into members
      return members.map(m => ({
        ...m,
        profile: profiles?.find(p => p.id === m.user_id) ?? undefined,
      })) as TeamMember[];
    },
    enabled: !!tenderId,
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenderId, userId }: { tenderId: string; userId: string }) => {
      const { error } = await supabase
        .from('tender_team_members')
        .insert({ tender_id: tenderId, user_id: userId });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team_members', variables.tenderId] });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tenderId }: { id: string; tenderId: string }) => {
      const { error } = await supabase
        .from('tender_team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return tenderId;
    },
    onSuccess: (tenderId) => {
      queryClient.invalidateQueries({ queryKey: ['team_members', tenderId] });
    },
  });
}

import { useState } from 'react';
import { useTeamMembers, useAddTeamMember, useRemoveTeamMember } from '@/hooks/useTeamMembers';
import { useProfiles } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, X, UserPlus, Mail } from 'lucide-react';

interface TeamMembersSectionProps {
  tenderId: string;
  canManage: boolean;
}

export function TeamMembersSection({ tenderId, canManage }: TeamMembersSectionProps) {
  const { toast } = useToast();
  const { data: teamMembers = [], isLoading } = useTeamMembers(tenderId);
  const { data: profiles = [] } = useProfiles();
  const addMember = useAddTeamMember();
  const removeMember = useRemoveTeamMember();
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const MAX_TEAM_MEMBERS = 10;

  const existingUserIds = teamMembers.map(m => m.user_id);
  const availableProfiles = profiles.filter(p => !existingUserIds.includes(p.id));

  const handleAdd = async () => {
    if (!selectedUserId) return;
    if (teamMembers.length >= MAX_TEAM_MEMBERS) {
      toast({
        variant: 'destructive',
        title: 'Limit reached',
        description: `Maximum ${MAX_TEAM_MEMBERS} team members allowed.`,
      });
      return;
    }

    try {
      await addMember.mutateAsync({ tenderId, userId: selectedUserId });
      setSelectedUserId('');
      toast({ title: 'Team member added' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add team member',
      });
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeMember.mutateAsync({ id, tenderId });
      toast({ title: 'Team member removed' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to remove team member',
      });
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading team...</div>;
  }

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          Team Members ({teamMembers.length}/{MAX_TEAM_MEMBERS})
        </p>
      </div>

      {teamMembers.map((member) => {
        const profile = member.profile;
        return (
          <div key={member.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{profile?.full_name || profile?.email || 'Unknown'}</p>
                {profile?.email && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {profile.email}
                  </div>
                )}
              </div>
            </div>
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleRemove(member.id)}
                disabled={removeMember.isPending}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      })}

      {canManage && teamMembers.length < MAX_TEAM_MEMBERS && (
        <div className="flex items-center gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a team member..." />
            </SelectTrigger>
            <SelectContent>
              {availableProfiles.filter(p => p.id).map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email || profile.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!selectedUserId || addMember.isPending}
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {teamMembers.length === 0 && !canManage && (
        <p className="text-sm text-muted-foreground">No team members assigned</p>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useProfiles } from '@/hooks/useProfiles';
import { useUpdateTender } from '@/hooks/useTenders';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

interface ReassignLeadDialogProps {
  tenderId: string;
  currentLeadName: string;
  currentLeadEmail: string;
}

export function ReassignLeadDialog({ tenderId, currentLeadName, currentLeadEmail }: ReassignLeadDialogProps) {
  const { toast } = useToast();
  const { data: profiles, isLoading: loadingProfiles } = useProfiles();
  const updateTender = useUpdateTender();
  
  const [open, setOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [useManual, setUseManual] = useState(false);

  const handleReassign = async () => {
    let newName = manualName;
    let newEmail = manualEmail;

    if (!useManual && selectedProfileId) {
      const profile = profiles?.find(p => p.id === selectedProfileId);
      if (profile) {
        newName = profile.full_name || profile.email;
        newEmail = profile.email;
      }
    }

    if (!newName || !newEmail) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please provide both name and email for the new lead.',
      });
      return;
    }

    try {
      await updateTender.mutateAsync({
        id: tenderId,
        updates: {
          assigned_lead_name: newName,
          assigned_lead_email: newEmail,
        },
      });
      toast({
        title: 'Lead reassigned',
        description: `Tender has been reassigned to ${newName}.`,
      });
      setOpen(false);
      setSelectedProfileId('');
      setManualName('');
      setManualEmail('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to reassign lead',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Reassign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign Tender Lead</DialogTitle>
          <DialogDescription>
            Current lead: {currentLeadName} ({currentLeadEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!useManual && (
            <div className="space-y-2">
              <Label>Select from existing users</Label>
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingProfiles ? 'Loading...' : 'Select a user'} />
                </SelectTrigger>
                <SelectContent>
                  {profiles?.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email} ({profile.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUseManual(!useManual)}
            >
              {useManual ? 'Select from users' : 'Enter manually'}
            </Button>
          </div>

          {useManual && (
            <>
              <div className="space-y-2">
                <Label htmlFor="manual-name">Name</Label>
                <Input
                  id="manual-name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Enter name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-email">Email</Label>
                <Input
                  id="manual-email"
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="Enter email"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleReassign}
            disabled={updateTender.isPending || (!useManual && !selectedProfileId) || (useManual && (!manualName || !manualEmail))}
          >
            {updateTender.isPending ? 'Reassigning...' : 'Reassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

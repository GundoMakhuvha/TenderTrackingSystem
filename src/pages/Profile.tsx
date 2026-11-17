import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { startOfDay } from 'date-fns';
import { CalendarPlus, KeyRound, Monitor, Moon, Save, Sun } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTenders } from '@/hooks/useTenders';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { collectEvents, downloadIcs } from '@/lib/calendar';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  bids_team: 'Bids Team',
  assigned_user: 'Team Member',
};

const CLOSED = new Set(['submitted', 'completed', 'cancelled', 'rejected']);

export default function Profile() {
  const { user, profile, roles, refreshProfile } = useAuth();
  const { data: tenders } = useTenders();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);

  // Profile can arrive after first render; fill the field once it does.
  useEffect(() => {
    if (profile?.full_name) setFullName((cur) => cur || profile.full_name || '');
  }, [profile?.full_name]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const email = profile?.email?.toLowerCase();
  const myTenders = (tenders ?? []).filter(
    (t) => email && t.assigned_lead_email?.toLowerCase() === email && !CLOSED.has(t.status),
  );
  const myUpcoming = collectEvents(myTenders, { from: startOfDay(new Date()) });

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() || null }).eq('id', user.id);
    setSaving(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Could not save', description: error.message });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
    await refreshProfile();
    toast({ title: 'Profile updated' });
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ variant: 'destructive', title: 'Password too short', description: 'Use at least 8 characters.' });
      return;
    }
    if (password !== confirm) {
      toast({ variant: 'destructive', title: "Passwords don't match" });
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password });
    setChangingPw(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Could not change password', description: error.message });
      return;
    }
    setPassword('');
    setConfirm('');
    toast({ title: 'Password changed' });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-1">Your account details and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Signed in as {profile?.email}
            <span className="ml-2 inline-flex gap-1 align-middle">
              {(roles.length ? roles : ['assigned_user']).map((r) => (
                <Badge key={r} variant="secondary">{ROLE_LABELS[r] ?? r}</Badge>
              ))}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving || fullName === (profile?.full_name ?? '')}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            My dates in Outlook
          </CardTitle>
          <CardDescription>
            {myUpcoming.length > 0
              ? `You lead ${myTenders.length} open tender${myTenders.length === 1 ? '' : 's'} with ${myUpcoming.length} upcoming date${myUpcoming.length === 1 ? '' : 's'}.`
              : 'You have no upcoming dates on tenders you lead.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            disabled={myUpcoming.length === 0}
            onClick={() => {
              downloadIcs(myUpcoming, 'my-tender-dates', 'My Tender Dates');
              toast({ title: `${myUpcoming.length} dates downloaded`, description: 'Open the .ics file to add them to Outlook.' });
            }}
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            Add all my dates to Outlook (.ics)
          </Button>
          <Button variant="outline" asChild>
            <Link to="/calendar">Open Key Dates</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            type="single"
            value={theme ?? 'system'}
            onValueChange={(v) => v && setTheme(v)}
            className="justify-start"
          >
            <ToggleGroupItem value="light" aria-label="Light"><Sun className="mr-2 h-4 w-4" />Light</ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="Dark"><Moon className="mr-2 h-4 w-4" />Dark</ToggleGroupItem>
            <ToggleGroupItem value="system" aria-label="System"><Monitor className="mr-2 h-4 w-4" />System</ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new_password">New password</Label>
              <Input id="new_password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <Input id="confirm_password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="outline" disabled={changingPw || !password}>
                {changingPw ? 'Updating…' : 'Update password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

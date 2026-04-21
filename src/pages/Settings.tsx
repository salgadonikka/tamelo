import { useTheme } from 'next-themes';
import { ArrowLeft, Sun, Moon, Monitor, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { DataExportImport } from '@/components/DataExportImport';

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Clean, bright interface' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes at night' },
  { value: 'system', label: 'Adaptive', icon: Monitor, description: 'Matches your device settings' },
];

const archiveOptions = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
  { value: '0', label: 'Never' },
];

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [autoArchiveDays, setAutoArchiveDays] = useState<string>('30');

  useEffect(() => {
    if (profile) {
      setAutoArchiveDays(String(profile.autoArchiveDays ?? 30));
    }
  }, [profile]);

  const handleAutoArchiveChange = async (value: string) => {
    setAutoArchiveDays(value);
    if (!user) return;
    try {
      await api.put('/api/UserProfiles/me', {
        email: profile?.email ?? null,
        displayName: profile?.displayName ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        autoArchiveDays: parseInt(value),
      });
      toast.success('Auto-archive setting saved');
    } catch {
      toast.error('Failed to update setting');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-lg font-semibold text-foreground">Settings</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Theme</CardTitle>
            <CardDescription>Choose how the app looks and feels.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={theme || 'system'} onValueChange={setTheme} className="grid gap-3">
              {themeOptions.map((opt) => (
                <Label
                  key={opt.value}
                  htmlFor={`theme-${opt.value}`}
                  className={`flex items-center gap-4 rounded-xl border-2 p-4 cursor-pointer transition-colors ${
                    theme === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <RadioGroupItem value={opt.value} id={`theme-${opt.value}`} className="sr-only" />
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <opt.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{opt.label}</p>
                    <p className="text-sm text-muted-foreground">{opt.description}</p>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Auto-Archive Tasks
            </CardTitle>
            <CardDescription>
              Automatically archive tasks after a period of inactivity. Tasks with no markers in the selected timeframe will be archived.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={autoArchiveDays} onValueChange={handleAutoArchiveChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {archiveOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <DataExportImport />
      </main>
    </div>
  );
};

export default Settings;

import { useState, useEffect, useRef } from 'react';
import { FileArchive, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

interface ProjectItem {
  id: string;
  name: string;
  color?: string;
}

interface ImportTaskRow {
  title: string;
  description?: string;
  project?: string;
  status: string;
  targetDate?: string;
  archived: boolean;
}

interface ImportResult {
  imported: number;
  rejected: number;
}

// Minimal CSV parser that handles quoted fields (commas, newlines, escaped quotes)
function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, ''); // strip BOM
  const rows = splitCsvRows(clean);
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows
    .slice(1)
    .filter(cols => cols.some(c => c.trim() !== ''))
    .map(cols => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h.trim()] = (cols[i] ?? '').trim(); });
      return obj;
    });
}

function splitCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (ch === '"') {
      i++;
      while (i < text.length) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; }
          else { i++; break; }
        } else { field += text[i]; i++; }
      }
    } else if (ch === ',') {
      current.push(field); field = ''; i++;
    } else if (ch === '\r' && text[i + 1] === '\n') {
      current.push(field); field = ''; rows.push(current); current = []; i += 2;
    } else if (ch === '\n') {
      current.push(field); field = ''; rows.push(current); current = []; i++;
    } else { field += ch; i++; }
  }

  if (field || current.length > 0) {
    current.push(field);
    if (current.some(f => f !== '')) rows.push(current);
  }

  return rows;
}

function csvRowToImportRow(row: Record<string, string>): ImportTaskRow {
  return {
    title: row['Task Title'] ?? '',
    description: row['Description'] || undefined,
    project: row['Project'] || undefined,
    status: (row['Status'] ?? 'unplanned').toLowerCase(),
    targetDate: row['Target Date'] || undefined,
    archived: /^(yes|true|1)$/i.test(row['Archived'] ?? ''),
  };
}

export function DataExportImport() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Export state
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [includeUnassigned, setIncludeUnassigned] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Import state
  const [unknownProjectAction, setUnknownProjectAction] = useState<'create' | 'reject'>('create');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<{ id: number; name: string; color?: string }[]>('/api/Projects')
      .then(data => {
        const items = data.map(p => ({ id: String(p.id), name: p.name, color: p.color ?? undefined }));
        setProjects(items);
        setSelectedProjectIds(new Set(items.map(p => p.id)));
      })
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoadingProjects(false));
  }, []);

  const allSelected = selectedProjectIds.size === projects.length && includeUnassigned;
  const noneSelected = selectedProjectIds.size === 0 && !includeUnassigned;

  function selectAll() {
    setSelectedProjectIds(new Set(projects.map(p => p.id)));
    setIncludeUnassigned(true);
  }

  function deselectAll() {
    setSelectedProjectIds(new Set());
    setIncludeUnassigned(false);
  }

  function toggleProject(id: string) {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ includeArchived: String(includeArchived) });

      if (!allSelected) {
        if (selectedProjectIds.size > 0) {
          params.set('projectIds', [...selectedProjectIds].join(','));
        }
        params.set('includeUnassigned', String(includeUnassigned));
      }

      const { supabase } = await import('@/integrations/supabase/client');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

      const res = await fetch(`${apiBase}/api/Tasks/export?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error(`${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Export downloaded successfully');
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setImportResult(null);
    }
  }

  async function handleImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const rawRows = parseCsv(text);
      const rows: ImportTaskRow[] = rawRows
        .map(csvRowToImportRow)
        .filter(r => r.title.trim() !== '');

      if (rows.length === 0) {
        toast.error('No valid rows found in the CSV file.');
        return;
      }

      const result = await api.post<ImportResult>('/api/Tasks/import', {
        rows,
        unknownProjectAction,
      });

      setImportResult(result);

      if (result.imported > 0) {
        toast.success(`${result.imported} task${result.imported !== 1 ? 's' : ''} imported successfully`);
      } else {
        toast.warning(`No tasks were imported. ${result.rejected} rows were rejected.`);
      }
    } catch {
      toast.error('Import failed. Please check the file format and try again.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSelectedFileName(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <FileArchive className="w-5 h-5" />
          Export &amp; Import
        </CardTitle>
        <CardDescription>
          Export your tasks to CSV or import tasks from a CSV file.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="export">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="export" className="flex-1">Export</TabsTrigger>
            <TabsTrigger value="import" className="flex-1">Import</TabsTrigger>
          </TabsList>

          {/* ── Export tab ── */}
          <TabsContent value="export" className="space-y-4 mt-0">
            {loadingProjects ? (
              <p className="text-sm text-muted-foreground">Loading projects…</p>
            ) : (
              <>
                <div className="space-y-3">
                  <p className="text-sm font-medium">Select projects to export:</p>

                  {/* Select All / Deselect All */}
                  <div className="flex items-center gap-3 text-sm">
                    <button
                      onClick={selectAll}
                      className="text-primary hover:underline disabled:opacity-50"
                      disabled={allSelected}
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAll}
                      className="text-primary hover:underline disabled:opacity-50"
                      disabled={noneSelected}
                    >
                      Deselect All
                    </button>
                  </div>

                  {/* Project list */}
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {projects.map(project => (
                      <label
                        key={project.id}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <Checkbox
                          checked={selectedProjectIds.has(project.id)}
                          onCheckedChange={() => toggleProject(project.id)}
                        />
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: project.color ?? 'hsl(0,0%,70%)' }}
                        />
                        <span className="text-sm">{project.name}</span>
                      </label>
                    ))}

                    {/* Unassigned tasks row */}
                    <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors">
                      <Checkbox
                        checked={includeUnassigned}
                        onCheckedChange={v => setIncludeUnassigned(Boolean(v))}
                      />
                      <span className="w-3 h-3 rounded-full shrink-0 border border-border bg-background" />
                      <span className="text-sm text-muted-foreground italic">No Project</span>
                    </label>
                  </div>
                </div>

                {/* Include archived */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    id="export-archived"
                    checked={includeArchived}
                    onCheckedChange={v => setIncludeArchived(Boolean(v))}
                  />
                  <span className="text-sm">Include archived tasks</span>
                </label>

                <Button
                  onClick={handleExport}
                  disabled={noneSelected || exporting}
                  className="w-full"
                >
                  {exporting ? 'Exporting…' : 'Export to CSV'}
                </Button>
              </>
            )}
          </TabsContent>

          {/* ── Import tab ── */}
          <TabsContent value="import" className="space-y-4 mt-0">
            <div className="space-y-1">
              <p className="text-sm font-medium">Upload a CSV file:</p>
              <p className="text-xs text-muted-foreground">
                Expected columns: Task Title, Description, Project, Status, Target Date, Archived
              </p>
            </div>

            {/* File picker */}
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="default"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedFileName ?? 'No file chosen'}
              </span>
            </div>

            {/* Unknown project action */}
            <div className="space-y-2">
              <p className="text-sm">If a project in the file doesn&apos;t exist:</p>
              <RadioGroup
                value={unknownProjectAction}
                onValueChange={v => setUnknownProjectAction(v as 'create' | 'reject')}
                className="gap-1.5"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="create" id="import-create" />
                  <Label htmlFor="import-create" className="cursor-pointer text-sm font-normal">
                    Create the project automatically
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="reject" id="import-reject" />
                  <Label htmlFor="import-reject" className="cursor-pointer text-sm font-normal">
                    Reject those records
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Import result */}
            {importResult && (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm space-y-0.5">
                <p className="font-medium">Import complete</p>
                <p className="text-muted-foreground">
                  {importResult.imported} task{importResult.imported !== 1 ? 's' : ''} imported
                  {importResult.rejected > 0 && (
                    <>, {importResult.rejected} rejected (duplicates or unknown projects)</>
                  )}
                </p>
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={!selectedFileName || importing}
              variant={selectedFileName ? 'default' : 'secondary'}
              className="w-full"
            >
              <FileUp className="w-4 h-4 mr-2" />
              {importing ? 'Importing…' : 'Import from CSV'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

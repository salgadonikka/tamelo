import { ArrowLeft, BookOpen, GraduationCap, Bug, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const Help = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');

  const handleSubmitIssue = () => {
    if (!issueTitle.trim()) return;
    toast({ title: 'Issue reported', description: 'Thank you for your feedback!' });
    setIssueTitle('');
    setIssueDesc('');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-lg font-semibold text-foreground">Help</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {/* How to use */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">How to Use the Planner</CardTitle>
                <CardDescription>Get started in minutes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="tasks">
                <AccordionTrigger>Creating &amp; Managing Tasks</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>Use the input field at the bottom of the task list to add a new task. Type your task name and press Enter.</p>
                  <p>Click on any task row to open its detail panel, where you can add notes, assign it to a project, or archive/delete it.</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="markers">
                <AccordionTrigger>Day Markers</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>Each task has circles for each day of the week. Click a circle to cycle through states:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Empty</strong> — No activity planned</li>
                    <li><strong>Planned</strong> — You intend to work on it</li>
                    <li><strong>Started</strong> — Work is in progress</li>
                    <li><strong>Completed</strong> — Done for the day</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="projects">
                <AccordionTrigger>Projects &amp; Filtering</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>Create projects in the right panel to organise your tasks. Click a project tile to filter the grid to only show tasks belonging to that project.</p>
                  <p>Click "All Tasks" to reset the filter and see everything.</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="weeks">
                <AccordionTrigger>Week Navigation</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>Use the arrow buttons above the day columns to navigate between weeks. The "Today" button jumps you back to the current week.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Tutorial mode */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="font-display">Tutorial Mode</CardTitle>
                <CardDescription>Interactive walkthrough</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Tutorial mode will guide you step-by-step through the main features of the planner with interactive highlights and tooltips.
            </p>
            <Button variant="outline" disabled>
              <GraduationCap className="w-4 h-4 mr-2" />
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        {/* Report issues */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Bug className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="font-display">Report an Issue</CardTitle>
                <CardDescription>Let us know if something isn't right</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Brief title of the issue"
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
            />
            <Textarea
              placeholder="Describe what happened…"
              value={issueDesc}
              onChange={(e) => setIssueDesc(e.target.value)}
              rows={4}
            />
            <Button onClick={handleSubmitIssue} disabled={!issueTitle.trim()}>
              Submit Report
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Info className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <CardTitle className="font-display">About</CardTitle>
                <CardDescription>The Procrastinator's List</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm space-y-2">
            <p>
              <strong className="text-foreground">The Procrastinator's List</strong> is a low-pressure weekly planner designed for people who struggle with rigid to-do apps. Instead of deadlines and guilt, it uses gentle day markers to track your intentions and celebrate small wins.
            </p>
            <p>Version 1.0.0</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Help;

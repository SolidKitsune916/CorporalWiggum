import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { PRDQuestion, PRDQuestionCategory, PRDQuestionRound } from '@/types';
import {
  MessageSquare,
  Send,
  MoreHorizontal,
  CheckCircle2,
  CircleDashed,
  Code,
  Users,
  Layers,
  Maximize2,
  Puzzle,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';

interface PRDQuestionListProps {
  questions: PRDQuestion[];
  roundNumber: number;
  previousRounds: PRDQuestionRound[];
  isGenerating: boolean;
  onSubmit: (answers: Array<{ questionId: string; answer?: string; skipped: boolean }>) => void;
  onRequestMore: () => void;
  onGeneratePRD: () => void;
}

const categoryConfig: Record<PRDQuestionCategory, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  technical: { icon: Code, label: 'Technical', color: 'text-blue-500' },
  users: { icon: Users, label: 'Users', color: 'text-green-500' },
  features: { icon: Layers, label: 'Features', color: 'text-purple-500' },
  scope: { icon: Maximize2, label: 'Scope', color: 'text-amber-500' },
  integration: { icon: Puzzle, label: 'Integration', color: 'text-cyan-500' },
  other: { icon: HelpCircle, label: 'General', color: 'text-gray-500' },
};

export function PRDQuestionList({
  questions,
  roundNumber,
  previousRounds,
  isGenerating,
  onSubmit,
  onRequestMore,
  onGeneratePRD,
}: PRDQuestionListProps) {
  // State is reset via key prop in parent component (IterativePRDGenerator)
  // when roundNumber changes, causing this component to remount with fresh state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    const formattedAnswers = questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id]?.trim() || undefined,
      skipped: !answers[q.id]?.trim(),
    }));
    onSubmit(formattedAnswers);
    setSubmitted(true);
  };

  const answeredCount = Object.values(answers).filter((a) => a?.trim()).length;
  const totalQuestions = questions.length;

  // Group questions by category
  const questionsByCategory = questions.reduce((acc, q) => {
    const cat = q.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(q);
    return acc;
  }, {} as Record<PRDQuestionCategory, PRDQuestion[]>);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Round {roundNumber} Questions</CardTitle>
          </div>
          <Badge variant={submitted ? 'secondary' : 'default'}>
            {submitted ? 'Submitted' : `${answeredCount}/${totalQuestions} answered`}
          </Badge>
        </div>
        <CardDescription>
          Answer these questions to help generate a comprehensive PRD. Answering is optional.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Previous rounds accordion (if any) */}
        {previousRounds.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="previous" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-2 hover:no-underline">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>{previousRounds.length} previous round{previousRounds.length !== 1 ? 's' : ''}</span>
                  <Badge variant="outline" className="ml-2">
                    {previousRounds.reduce((sum, r) => sum + r.questions.filter(q => q.answer).length, 0)} answers
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 max-h-48 overflow-y-auto">
                  {previousRounds.map((round) => (
                    <div key={round.roundNumber} className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Round {round.roundNumber}
                      </div>
                      {round.questions.filter(q => q.answer).map((q) => (
                        <div key={q.id} className="text-xs space-y-1 bg-muted/50 rounded p-2">
                          <div className="font-medium">{q.text}</div>
                          <div className="text-muted-foreground">{q.answer}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Current questions */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {Object.entries(questionsByCategory).map(([category, categoryQuestions]) => {
              const config = categoryConfig[category as PRDQuestionCategory];
              const Icon = config.icon;
              
              return (
                <div key={category} className="space-y-3">
                  <div className={`flex items-center gap-2 text-sm font-medium ${config.color}`}>
                    <Icon className="w-4 h-4" />
                    {config.label}
                    <Badge variant="outline" className="ml-auto text-xs">
                      {categoryQuestions.length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 pl-6">
                    {categoryQuestions.map((question) => (
                      <div key={question.id} className="space-y-2">
                        <div className="flex items-start gap-2">
                          {answers[question.id]?.trim() ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <CircleDashed className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          )}
                          <span className="text-sm">{question.text}</span>
                        </div>
                        <Textarea
                          placeholder="Type your answer here (optional)..."
                          value={answers[question.id] || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleAnswerChange(question.id, e.target.value)}
                          disabled={submitted}
                          className="min-h-[80px] text-sm resize-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Action buttons */}
        <div className="flex gap-2 pt-4 border-t">
          {!submitted ? (
            <Button
              onClick={handleSubmit}
              disabled={isGenerating}
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Answers
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onRequestMore}
                disabled={isGenerating}
                className="flex-1"
              >
                <MoreHorizontal className="w-4 h-4 mr-2" />
                Ask More Questions
              </Button>
              <Button
                onClick={onGeneratePRD}
                disabled={isGenerating}
                className="flex-1"
              >
                Generate PRD
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

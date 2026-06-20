import React, { useState } from 'react';
import { HelpCircle, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { useUserProfile } from '../contexts/AuthContext';
import { submitQuestion } from '../lib/database/questions';
import { notifyManagerContestQuestionAction } from '../app/pytania-konkursu/actions';
import { toast } from 'sonner';

interface AskQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  companyName: string;
}

export const AskQuestionModal: React.FC<AskQuestionModalProps> = ({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  companyName
}) => {
  const { user, supabase } = useUserProfile();
  const [question, setQuestion] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!question.trim()) {
      toast.error('Proszę wpisać pytanie');
      return;
    }

    if (!user || !user.id) {
      toast.error('Musisz być zalogowany aby zadać pytanie');
      return;
    }

    if (!supabase) {
      toast.error('Błąd połączenia z bazą danych');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitQuestion(
        supabase,
        jobId,
        user.id,
        question.trim()
      );

      if (!result.success) {
        toast.error('Wystąpił błąd podczas wysyłania pytania', {
          description: result.error?.message || 'Spróbuj ponownie później.'
        });
        return;
      }

      if (result.notifyManagerContestQuestion) {
        void notifyManagerContestQuestionAction(result.notifyManagerContestQuestion);
      }
      
      toast.success('Pytanie zostało wysłane!', {
        description: 'Organizator otrzyma powiadomienie o Twoim pytaniu.'
      });

      setQuestion('');
      onClose();
    } catch (error) {
      toast.error('Wystąpił błąd podczas wysyłania pytania');
      console.error('Error submitting question:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setQuestion('');
    onClose();
  };

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Zadaj pytanie
            </DialogTitle>
            <DialogDescription>
              Musisz być zalogowany aby zadać pytanie dotyczące tego ogłoszenia.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Zamknij
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Zadaj pytanie
          </DialogTitle>
          <DialogDescription>
            Zadaj pytanie dotyczące ogłoszenia: <strong>{jobTitle}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="question">Twoje pytanie</Label>
            <Textarea
              id="question"
              placeholder="Wpisz swoje pytanie dotyczące tego ogłoszenia..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Pytanie zostanie wysłane do organizatora: <strong>{companyName}</strong>
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Anuluj
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!question.trim() || isSubmitting}
            className="min-w-[100px]"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Wysyłanie...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Wyślij
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
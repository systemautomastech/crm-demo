import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import InputError from '@/components/ui/input-error';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { toast } from 'sonner';
import { useFormFields } from '@/hooks/useFormFields';
import { useState } from 'react';


interface FAQ {
  id: number;
  title: string;
  description: string;
}

interface EditFAQProps {
  faq: FAQ;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function Edit({ faq, onSuccess, onCancel }: EditFAQProps) {
  const { t } = useTranslation();
  
  const { data, setData, put, processing, errors } = useForm({
    title: faq.title,
    description: faq.description
  });

  // AI hooks for FAQ fields
  const questionAI = useFormFields('aiField', data, setData, errors, 'edit', 'title', 'Question', 'supportticket', 'faq');
  const [answerEditorKey, setAnswerEditorKey] = useState(0);
  const answerAI = useFormFields('aiField', data, (field, value) => {
    setData(field, value);
    setAnswerEditorKey(prev => prev + 1);
  }, errors, 'edit', 'description', 'Answer', 'supportticket', 'faq');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    put(route('support-ticket-faq.update', faq.id), {
      onSuccess: () => {
        onSuccess();
      }
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{t('Edit FAQ')}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label htmlFor="title">{t('Question')}</Label>
            <Input
              id="title"
              value={data.title}
              onChange={(e) => setData('title', e.target.value)}
              placeholder={t('Enter FAQ question')}
              required
            />
            <InputError message={errors.title} />
          </div>
          {questionAI.map(field => <div key={field.id}>{field.component}</div>)}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="description" required>{t('Answer')}</Label>
            <div className="flex gap-2">
              {answerAI.map(field => <div key={field.id}>{field.component}</div>)}
            </div>
          </div>
          <RichTextEditor
            key={`answer-editor-${answerEditorKey}`}
            content={data.description}
            onChange={(value) => setData('description', value)}
            placeholder={t('Enter FAQ answer')}
          />
          <InputError message={errors.description} />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel ? onCancel : onSuccess}>
            {t('Cancel')}
          </Button>
          <Button type="submit" disabled={processing}>
            {processing ? t('Updating...') : t('Update')}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
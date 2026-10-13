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

interface CreateFAQProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function Create({ onSuccess, onCancel }: CreateFAQProps) {
  const { t } = useTranslation();

  const { data, setData, post, processing, errors } = useForm({
    title: '',
    description: ''
  });

  // AI hooks for FAQ fields
  const questionAI = useFormFields('aiField', data, setData, errors, 'create', 'title', 'Question', 'supportticket', 'faq');
  const [answerEditorKey, setAnswerEditorKey] = useState(0);
  const answerAI = useFormFields('aiField', data, (field, value) => {
    setData(field, value);
    setAnswerEditorKey(prev => prev + 1);
  }, errors, 'create', 'description', 'Answer', 'supportticket', 'faq');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('support-ticket-faq.store'), {
      onSuccess: () => {
        onSuccess();
      }
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{t('Create FAQ')}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label htmlFor="title">{t('Title')}</Label>
            <Input
              id="title"
              value={data.title}
              onChange={(e) => setData('title', e.target.value)}
              placeholder={t('Enter FAQ Title')}
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
            {processing ? t('Creating...') : t('Create')}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import InputError from '@/components/ui/input-error';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { toast } from 'sonner';
import { useFormFields } from '@/hooks/useFormFields';
import { useState } from 'react';


interface Knowledge {
  id: number;
  title: string;
  description: string;
  category?: {
    id: number;
    title: string;
  };
  category_id?: number;
}

interface Category {
  id: number;
  title: string;
}

interface EditKnowledgeProps {
  knowledge: Knowledge;
  categories: Category[];
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function Edit({ knowledge, categories, onSuccess, onCancel }: EditKnowledgeProps) {
  const { t } = useTranslation();
  
  const { data, setData, put, processing, errors } = useForm({
    title: knowledge.title,
    description: knowledge.description,
    category_id: knowledge.category?.id?.toString() || knowledge.category_id?.toString() || ''
  });

  // AI hooks for knowledge base fields
  const titleAI = useFormFields('aiField', data, setData, errors, 'edit', 'title', 'Title', 'supportticket', 'knowledge');
  const [descriptionEditorKey, setDescriptionEditorKey] = useState(0);
  const descriptionAI = useFormFields('aiField', data, (field, value) => {
    setData(field, value);
    setDescriptionEditorKey(prev => prev + 1);
  }, errors, 'edit', 'description', 'Description', 'supportticket', 'knowledge');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    put(route('support-ticket-knowledge.update', knowledge.id), {
      onSuccess: () => onSuccess()
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{t('Edit Knowledge Base')}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label htmlFor="title">{t('Title')}</Label>
            <Input
              id="title"
              value={data.title}
              onChange={(e) => setData('title', e.target.value)}
              placeholder={t('Enter knowledge base title')}
              required
            />
            <InputError message={errors.title} />
          </div>
          {titleAI.map(field => <div key={field.id}>{field.component}</div>)}
        </div>

        <div>
          <Label htmlFor="category_id" required>{t('Category')}</Label>
          <Select value={data.category_id} onValueChange={(value) => setData('category_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder={t('Select Category')} />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(categories) && categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <InputError message={errors.category_id} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="description" required>{t('Description')}</Label>
            <div className="flex gap-2">
              {descriptionAI.map(field => <div key={field.id}>{field.component}</div>)}
            </div>
          </div>
          <RichTextEditor
            key={`description-editor-${descriptionEditorKey}`}
            content={data.description}
            onChange={(value) => setData('description', value)}
            placeholder={t('Enter knowledge base description')}
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
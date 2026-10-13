import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { SlugInputComponent } from '@/components/ui/slug-input';
import { Switch } from '@/components/ui/switch';
import InputError from '@/components/ui/input-error';
import { CreateCustomPageProps } from './types';
import { useFormFields } from '@/hooks/useFormFields';
import { useState } from 'react';

export default function Create({ onSuccess }: CreateCustomPageProps) {
    const { t } = useTranslation();

    const { data, setData, post, processing, errors } = useForm({
        title: '',
        slug: '',
        description: '',
        contents: '',
        enable_page_footer: 'off'
    });

    // AI hooks for custom page fields
    const titleAI = useFormFields('aiField', data, setData, errors, 'create', 'title', 'Page Title', 'supportticket', 'custom_page');
    const [contentEditorKey, setContentEditorKey] = useState(0);
    const contentAI = useFormFields('aiField', data, (field, value) => {
        setData(field, value);
        setContentEditorKey(prev => prev + 1);
    }, errors, 'create', 'contents', 'Page Content', 'supportticket', 'custom_page');

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('support-ticket.system-setup.custom-pages.store'), {
            onSuccess: () => {
                onSuccess();
            }
        });
    };

    return (
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{t('Create Custom Page')}</DialogTitle>
                <DialogDescription>
                    {t('Create a new custom page')}
                </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={submit} className="space-y-4">
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <Label htmlFor="title">{t('Title')}</Label>
                        <Input
                            id="title"
                            type="text"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            placeholder={t('Enter page title')}
                            required
                        />
                        <InputError message={errors.title} />
                    </div>
                    {titleAI.map(field => <div key={field.id}>{field.component}</div>)}
                </div>

                <SlugInputComponent
                    id="slug"
                    label={t('URL Slug')}
                    value={data.slug}
                    onChange={(value) => setData('slug', value)}
                    placeholder={t('URL-friendly name (e.g., about-us, privacy-policy)')}
                    error={errors.slug}
                    sourceValue={data.title}
                    required
                />

                <div>
                    <Label htmlFor="description">{t('Description')}</Label>
                    <Textarea
                        id="description"
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        placeholder={t('Enter page description')}
                        rows={3}
                    />
                    <InputError message={errors.description} />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="contents" required>{t('Contents')}</Label>
                        <div className="flex gap-2">
                            {contentAI.map(field => <div key={field.id}>{field.component}</div>)}
                        </div>
                    </div>
                    <RichTextEditor
                        key={`content-editor-${contentEditorKey}`}
                        content={data.contents}
                        onChange={(content) => setData('contents', content)}
                        placeholder={t('Enter page contents')}
                        className="[&_.ProseMirror]:min-h-[300px]"
                        required
                    />
                    <InputError message={errors.contents} />
                </div>

                <div className="flex items-center space-x-2">
                    <Switch
                        id="enable_page_footer"
                        checked={data.enable_page_footer === 'on'}
                        onCheckedChange={(checked) => setData('enable_page_footer', checked ? 'on' : 'off')}
                    />
                    <Label htmlFor="enable_page_footer">{t('Enable Page Footer')}</Label>
                    <InputError message={errors.enable_page_footer} />
                </div>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => onSuccess()}>
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
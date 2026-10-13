import React from 'react';
import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InputError from '@/components/ui/input-error';
import { useFormFields } from '@/hooks/useFormFields';

interface CreateProps {
    onSuccess: () => void;
}

export default function Create({ onSuccess }: CreateProps) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        color: '#000000'
    });

    // AI hook for category name
    const nameAI = useFormFields('aiField', data, setData, errors, 'create', 'name', 'Category Name', 'supportticket', 'category');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('support-ticket.system-setup.ticket-category.store'), {
            onSuccess: () => onSuccess()
        });
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('Create Category')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <Label htmlFor="name">{t('Name')}</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder={t('Enter category name')}
                            required
                        />
                        <InputError message={errors.name} />
                    </div>
                    {nameAI.map(field => <div key={field.id}>{field.component}</div>)}
                </div>
                <div>
                    <Label htmlFor="color">{t('Color')}</Label>
                    <Input
                        id="color"
                        type="color"
                        value={data.color}
                        onChange={(e) => setData('color', e.target.value)}
                    />
                    <InputError message={errors.color} />
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
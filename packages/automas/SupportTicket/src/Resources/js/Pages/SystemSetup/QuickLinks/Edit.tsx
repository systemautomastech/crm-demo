import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconPicker } from '@/components/ui/icon-picker';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InputError from '@/components/ui/input-error';


interface QuickLink {
    id: number;
    title: string;
    icon: string;
    link: string;
}

interface EditModalProps {
    quickLink: QuickLink;
    onSuccess: () => void;
}

export default function EditModal({ quickLink, onSuccess }: EditModalProps) {
    const { t } = useTranslation();

    const { data, setData, put, processing, errors } = useForm({
        title: quickLink.title,
        icon: quickLink.icon,
        link: quickLink.link
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('support-ticket.system-setup.quick-links.update', quickLink.id), {
            onSuccess: () => {
                onSuccess();
            }
        });
    };

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{t('Edit Quick Link')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="title">{t('Title')}</Label>
                    <Input
                        id="title"
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                        placeholder={t('Enter title')}
                        required
                    />
                    <InputError message={errors.title} />
                </div>

                <div>
                    <Label required>{t('Icon')}</Label>
                    <IconPicker
                        value={data.icon}
                        onChange={(value) => setData('icon', value)}
                        placeholder={t('Select an icon')}
                    />
                    <InputError message={errors.icon} />
                </div>

                <div>
                    <Label htmlFor="link">{t('Link')}</Label>
                    <Input
                        id="link"
                        value={data.link}
                        onChange={(e) => setData('link', e.target.value)}
                        placeholder={t('Enter link URL')}
                        required
                    />
                    <InputError message={errors.link} />
                </div>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onSuccess}>
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
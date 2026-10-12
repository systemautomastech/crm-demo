import React, { useState, useEffect } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import MediaLibraryModal from '@/components/MediaLibraryModal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Upload, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getImagePath } from '@/utils/helpers';

interface LogoTemplatesProps {
    settings?: Record<string, any> | null;
}

export default function LogoTemplates({ settings }: LogoTemplatesProps) {
    const { t } = useTranslation();
    const pageProps = usePage().props;

    const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
    const [isBgModalOpen, setIsBgModalOpen] = useState(false);

    const { data, setData, post, processing } = useForm<{
        settings: {
            logo_image: string;
            show_logo: boolean;
            header_logo_align: 'left' | 'center' | 'right';
            background_image: string;
        }
    }>({
        settings: {
            logo_image: settings?.logo_image ?? '',
            show_logo: settings?.show_logo !== undefined ? Boolean(settings.show_logo === '1' || settings.show_logo === true || settings.show_logo === 1 || settings.show_logo === 'true') : true,
            header_logo_align: (settings?.header_logo_align as any) || 'right',
            background_image: settings?.background_image ?? '',
        }
    });

    useEffect(() => {
        if (settings) {
            setData('settings', {
                logo_image: settings.logo_image ?? '',
                show_logo: settings.show_logo !== undefined ? Boolean(settings.show_logo === '1' || settings.show_logo === true || settings.show_logo === 1 || settings.show_logo === 'true') : true,
                header_logo_align: (settings.header_logo_align as any) || 'right',
                background_image: settings.background_image ?? '',
            });
        }
    }, [settings]);

    const cleanFileName = (url: string | string[]) => {
        const selected = Array.isArray(url) ? url[0] : url;
        if (!selected) return '';
        if (selected.includes('/')) {
            const parts = selected.split('/');
            return parts[parts.length - 1];
        }
        return selected;
    };


    const handleSelectLogo = (url: string | string[]) => {
        setData('settings', { ...data.settings, logo_image: cleanFileName(url) });
        setIsLogoModalOpen(false);
    };

    const handleSelectBg = (url: string | string[]) => {
        setData('settings', { ...data.settings, background_image: cleanFileName(url) });
        setIsBgModalOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        post(route('proposal-setup.update'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Settings saved successfully.'));
            },
            onError: (errs) => {
                const firstErr = errs && Object.values(errs)[0];
                if (firstErr) {
                    toast.error(firstErr);
                } else {
                    toast.error(t('Failed to save Settings.'));
                }
            },
        });
    };

    const isShowLogo = Boolean(data.settings.show_logo);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">{t('Logo & Template')}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Header Logo */}
                <div className="space-y-3">
                    <Label>{t('Header Logo')}</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center gap-3 min-h-[160px] bg-muted/10">
                        {data.settings.logo_image ? (
                            <div className="relative group w-full flex justify-center p-2">
                                <img
                                    src={getImagePath(data.settings.logo_image, pageProps)}
                                    alt="Header Logo"
                                    className="max-h-28 object-contain rounded"
                                    onError={(e) => {
                                        const target = e.currentTarget;
                                        if (!target.src.includes('/storage/media/')) {
                                            target.src = `/storage/media/${data.settings.logo_image.split('/').pop()}`;
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-0 right-0 h-7 w-7"
                                    onClick={() => setData('settings', { ...data.settings, logo_image: '' })}
                                    title={t('Remove Logo')}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">{t('PNG, JPG or SVG up to 2MB')}</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsLogoModalOpen(true)}
                                >
                                    {t('Select Header Logo')}
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Show Logo in Template Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                        <div className="space-y-0.5">
                            <Label htmlFor="show-logo-toggle" className="text-sm font-medium cursor-pointer">
                                {t('Show Logo in Template')}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                {t('Enable or disable displaying the logo on the template')}
                            </p>
                        </div>
                        <Switch
                            id="show-logo-toggle"
                            checked={isShowLogo}
                            onCheckedChange={(checked) => setData('settings', { ...data.settings, show_logo: checked })}
                        />
                    </div>

                    {/* Header Logo Alignment */}
                    <div className="p-3 rounded-lg bg-muted/30 border space-y-2">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-medium">
                                {t('Header Logo Alignment')}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                {t('Choose alignment for the logo in template pages (Left, Middle, or Right)')}
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-1">
                            <Button
                                type="button"
                                variant={data.settings.header_logo_align === 'left' ? 'default' : 'outline'}
                                size="sm"
                                className="w-full text-xs font-medium"
                                onClick={() => setData('settings', { ...data.settings, header_logo_align: 'left' })}
                            >
                                {t('Left')}
                            </Button>
                            <Button
                                type="button"
                                variant={data.settings.header_logo_align === 'center' ? 'default' : 'outline'}
                                size="sm"
                                className="w-full text-xs font-medium"
                                onClick={() => setData('settings', { ...data.settings, header_logo_align: 'center' })}
                            >
                                {t('Middle')}
                            </Button>
                            <Button
                                type="button"
                                variant={data.settings.header_logo_align === 'right' ? 'default' : 'outline'}
                                size="sm"
                                className="w-full text-xs font-medium"
                                onClick={() => setData('settings', { ...data.settings, header_logo_align: 'right' })}
                            >
                                {t('Right')}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* PDF Background Image */}
                <div className="space-y-3">
                    <Label>{t('Template Background Image')}</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center gap-3 min-h-[160px] bg-muted/10">
                        {data.settings.background_image ? (
                            <div className="relative group w-full flex justify-center p-2">
                                <img
                                    src={getImagePath(data.settings.background_image, pageProps)}
                                    alt="Background Image"
                                    className="max-h-28 object-contain rounded"
                                    onError={(e) => {
                                        const target = e.currentTarget;
                                        if (!target.src.includes('/storage/media/')) {
                                            target.src = `/storage/media/${data.settings.background_image.split('/').pop()}`;
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-0 right-0 h-7 w-7"
                                    onClick={() => setData('settings', { ...data.settings, background_image: '' })}
                                    title={t('Remove Background Image')}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">{t('PNG, JPG or WEBP up to 2MB')}</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsBgModalOpen(true)}
                                >
                                    {t('Select Background Image')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" size="sm" isLoading={processing} className="gap-2">
                    {!processing && <Save className="h-4 w-4" />}
                    {t('Save Changes')}
                </Button>
            </div>

            {/* Media Library Modals */}
            <MediaLibraryModal
                isOpen={isLogoModalOpen}
                onClose={() => setIsLogoModalOpen(false)}
                onSelect={handleSelectLogo}
            />

            <MediaLibraryModal
                isOpen={isBgModalOpen}
                onClose={() => setIsBgModalOpen(false)}
                onSelect={handleSelectBg}
            />
        </form>
    );
}

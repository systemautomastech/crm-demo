import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface GeneralSettingsProps {
    settings?: Record<string, any> | null;
}

export default function GeneralSettings({ settings }: GeneralSettingsProps) {
    const { t } = useTranslation();

    const presetColors = ['#E9591C', '#2563EB', '#059669', '#7C3AED', '#DC2626', '#111827'];

    const { data, setData, post, processing, errors } = useForm({
        settings: {
            proposal_prefix: settings?.proposal_prefix ?? 'PROP-',
            proposal_starting_number: settings?.proposal_starting_number?.toString() ?? '1001',
            default_validity_days: settings?.default_validity_days?.toString() ?? '30',
            template_color: settings?.template_color ?? '#E9591C',
        }
    });

    useEffect(() => {
        if (settings) {
            setData('settings', {
                proposal_prefix: settings.proposal_prefix ?? 'PROP-',
                proposal_starting_number: settings.proposal_starting_number?.toString() ?? '1001',
                default_validity_days: settings.default_validity_days?.toString() ?? '30',
                template_color: settings.template_color ?? '#E9591C',
            });
        }
    }, [settings]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('proposal-setup.update'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('General settings saved successfully.'));
            },
            onError: (errs) => {
                const firstErr = errs && Object.values(errs)[0];
                if (firstErr) {
                    toast.error(firstErr);
                } else {
                    toast.error(t('Failed to save general settings.'));
                }
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <h3 className="text-lg font-medium">{t('General Settings')}</h3>
            </div>

            <div className="flex flex-wrap items-start gap-4">
                <div className="space-y-1.5 w-64">
                    <Label className="text-xs">{t('Proposal Prefix & Number')}</Label>
                    <div className="flex items-center rounded-md border border-input bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
                        <div className="w-24 border-r">
                            <Input
                                id="proposal_prefix"
                                value={data.settings.proposal_prefix}
                                onChange={(e) => setData('settings', { ...data.settings, proposal_prefix: e.target.value })}
                                placeholder="PROP-"
                                className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 h-9 text-xs px-2"
                            />
                        </div>
                        <div className="flex-1">
                            <Input
                                id="proposal_starting_number"
                                type="number"
                                value={data.settings.proposal_starting_number}
                                onChange={(e) => setData('settings', { ...data.settings, proposal_starting_number: e.target.value })}
                                placeholder="1001"
                                className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 h-9 text-xs px-2"
                            />
                        </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-0.5">
                        {t('Preview: {{prefix}}{{number}}', { prefix: data.settings.proposal_prefix, number: data.settings.proposal_starting_number })}
                    </p>
                </div>

                <div className="space-y-1.5 w-44">
                    <Label htmlFor="default_validity_days" className="text-xs">{t('Default Validity Period (Days)')}</Label>
                    <Input
                        id="default_validity_days"
                        type="number"
                        value={data.settings.default_validity_days}
                        onChange={(e) => setData('settings', { ...data.settings, default_validity_days: e.target.value })}
                        className="h-9 text-xs w-28"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="template_color" className="text-xs">{t('Template Color')}</Label>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            id="template_color_picker"
                            value={data.settings.template_color || '#E9591C'}
                            onChange={(e) => setData('settings', { ...data.settings, template_color: e.target.value })}
                            className="h-9 w-9 shrink-0 rounded cursor-pointer border border-input p-0.5 bg-background"
                        />
                        <Input
                            id="template_color"
                            type="text"
                            value={data.settings.template_color || '#E9591C'}
                            onChange={(e) => setData('settings', { ...data.settings, template_color: e.target.value })}
                            placeholder="#E9591C"
                            className="w-24 h-9 font-mono text-xs uppercase"
                        />
                        <div className="flex items-center gap-1">
                            {presetColors.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setData('settings', { ...data.settings, template_color: color })}
                                    className={`h-6 w-6 rounded-full border transition-all ${data.settings.template_color?.toLowerCase() === color.toLowerCase() ? 'ring-2 ring-primary ring-offset-1 scale-110' : 'hover:scale-105'}`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
                <Button type="submit" size="sm" isLoading={processing} className="gap-2">
                    {!processing && <Save className="h-4 w-4" />}
                    {t('Save Changes')}
                </Button>
            </div>
        </form>
    );
}
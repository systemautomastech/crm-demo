import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "@inertiajs/react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import InputError from '@/components/ui/input-error';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { CreateDealStageProps, DealStageFormData } from './types';

export default function Create({ onSuccess, pipelines, defaultPipelineId }: CreateDealStageProps) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm<DealStageFormData>({
        name: '',
        order: '',
        pipeline_id: defaultPipelineId?.toString() || '',
        win_loss_type: 'standard',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('lead.deal-stages.store'), {
            onSuccess: () => {
                onSuccess();
            }
        });
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('Create Deal Stage')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <Label htmlFor="name">{t('Name')}</Label>
                    <Input
                        id="name"
                        type="text"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder={t('Enter Name')}
                        required
                    />
                    <InputError message={errors.name} />
                </div>                            
                
                <div>
                    <Label htmlFor="pipeline_id">{t('Pipeline')}</Label>
                    <Select value={data.pipeline_id?.toString() || ''} onValueChange={(value) => setData('pipeline_id', value)}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('Select Pipeline')} />
                        </SelectTrigger>
                        <SelectContent>
                            {pipelines.map((item: any) => (
                                <SelectItem key={item.id} value={item.id.toString()}>
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.pipeline_id} />
                </div>

                <div>
                    <Label htmlFor="win_loss_type">{t('Stage Win/Loss Type')}</Label>
                    <Select
                        value={data.win_loss_type || 'standard'}
                        onValueChange={(value: 'standard' | 'won' | 'lost') => setData('win_loss_type', value)}
                    >
                        <SelectTrigger id="win_loss_type">
                            <SelectValue placeholder={t('Select Win/Loss Status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="standard">{t('Standard Stage')}</SelectItem>
                            <SelectItem value="won">{t('Won Stage')}</SelectItem>
                            <SelectItem value="lost">{t('Lost Stage')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('Each pipeline can have at most one Won and one Lost stage.')}
                    </p>
                    <InputError message={errors.win_loss_type} />
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
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "@inertiajs/react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import InputError from '@/components/ui/input-error';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { PhoneInputComponent } from '@/components/ui/phone-input';
import { MultiSelectEnhanced } from '@/components/ui/multi-select-enhanced';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateDealProps, CreateDealFormData } from './types';
import { usePage } from '@inertiajs/react';
import { useFormFields } from '@/hooks/useFormFields';

export default function Create({ onSuccess }: CreateDealProps) {
    const { users, organizationTypes } = usePage<any>().props;
    const orgTypes = Array.isArray(organizationTypes) ? organizationTypes : [];
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm<any>({
        name: '',
        price: '0',
        organization_type: '',
        phone: '',
        clients: [],
    });

    const dealNameAI = useFormFields('aiField', data, setData, errors, 'create', 'name', 'Deal Name', 'lead', 'deal');
    const customFields = useFormFields('getCustomFields', { ...data, module: 'Lead', sub_module: 'Deal' }, setData, errors, 'create', t);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('lead.deals.store'), {
            onSuccess: () => {
                onSuccess();
            }
        });
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('Create Deal')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <Label htmlFor="name">{t('Deal Name')}</Label>
                        <Input
                            id="name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder={t('Enter Deal Name')}
                            required
                        />
                        <InputError message={errors.name} />
                    </div>
                    {dealNameAI.map(field => <div key={field.id}>{field.component}</div>)}
                </div>

                <div>
                    <CurrencyInput
                        label={t('Price')}
                        value={data.price}
                        onChange={(value) => setData('price', value)}
                        error={errors.price}
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="organization_type" required>{t('Organization Type')}</Label>
                    <Select value={data.organization_type} onValueChange={(value) => setData('organization_type', value)}>
                        <SelectTrigger id="organization_type">
                            <SelectValue placeholder={t('Select Organization Type')} />
                        </SelectTrigger>
                        <SelectContent searchable>
                            {orgTypes.map((item: any) => (
                                <SelectItem key={item.id ?? item.name ?? item} value={item.name ?? item}>
                                    {item.name ?? item}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.organization_type} />
                </div>

                <div>
                    <PhoneInputComponent
                        label={t('Phone No')}
                        value={data.phone}
                        onChange={(value) => setData('phone', value || '')}
                        error={errors.phone}
                    />
                </div>

                <div>
                    <Label htmlFor="client_id" required>{t('Clients')}</Label>
                    <MultiSelectEnhanced
                        options={users?.map((user: any) => ({
                            value: user.id.toString(),
                            label: user.name
                        })) || []}
                        value={Array.isArray(data.clients) ? data.clients : []}
                        onValueChange={(value) => setData('clients', value)}
                        placeholder={t('Select Clients')}
                        searchable={true}
                    />
                    <InputError message={errors.clients} />
                </div>

                {customFields.length > 0 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
                            {customFields.map((field) => (
                                <div key={field.id}>
                                    {field.component}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onSuccess}>
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

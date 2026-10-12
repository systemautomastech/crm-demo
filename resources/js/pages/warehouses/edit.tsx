import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "@inertiajs/react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import InputError from "@/components/ui/input-error";
import { PhoneInputComponent } from "@/components/ui/phone-input";
import { Switch } from "@/components/ui/switch";
import { useFormFields } from '@/hooks/useFormFields';
import { EditWarehouseProps, EditWarehouseFormData } from './types';

export default function Edit({ warehouse, onSuccess }: EditWarehouseProps) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm<EditWarehouseFormData>(warehouse);

    // Hook for dynamic package fields
    const formFields = useFormFields('warehouse', data, setData, errors, 'edit');
    const customFields = useFormFields('getCustomFields', { ...data, module: 'General', sub_module: 'Warehouse', id: warehouse.id }, setData, errors, 'edit', t);

    // AI hook for warehouse name field
    const nameAI = useFormFields('aiField', data, setData, errors, 'edit', 'name', 'Warehouse Name', 'general', 'warehouses');

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('warehouses.update', warehouse.id), {
            onSuccess: () => {
                onSuccess();
            }
        });
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('Edit Warehouse')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <Label htmlFor="edit_name">{t('Name')}</Label>
                        <Input
                            id="edit_name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder={t('Enter warehouse name')}
                            required
                        />
                        <InputError message={errors.name} />
                    </div>
                    {nameAI.map(field => <div key={field.id}>{field.component}</div>)}
                </div>
                <div>
                    <Label htmlFor="edit_address">{t('Address')}</Label>
                    <Input
                        id="edit_address"
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                        placeholder={t('Enter full address')}
                        required
                    />
                    <InputError message={errors.address} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="edit_city">{t('City')}</Label>
                        <Input
                            id="edit_city"
                            value={data.city}
                            onChange={(e) => setData('city', e.target.value)}
                            placeholder={t('Enter city')}
                            required
                        />
                        <InputError message={errors.city} />
                    </div>
                    <div>
                        <Label htmlFor="edit_zip_code">{t('Zip Code')}</Label>
                        <Input
                            id="edit_zip_code"
                            value={data.zip_code}
                            onChange={(e) => setData('zip_code', e.target.value)}
                            placeholder={t('Enter zip code')}
                            required
                        />
                        <InputError message={errors.zip_code} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="edit_phone">{t('Phone')}</Label>
                        <PhoneInputComponent
                            value={data.phone || ''}
                            onChange={(value) => setData('phone', value)}
                            placeholder={t('Enter phone number')}
                        />
                        <InputError message={errors.phone} />
                    </div>
                    <div>
                        <Label htmlFor="edit_email">{t('Email')}</Label>
                        <Input
                            id="edit_email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder={t('Enter email address')}
                        />
                        <InputError message={errors.email} />
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch
                        id="edit_is_active"
                        checked={data.is_active || false}
                        onCheckedChange={(checked) => setData('is_active', !!checked)}
                    />
                    <Label htmlFor="edit_is_active" className="cursor-pointer">{t('Is Active')}</Label>
                    <InputError message={errors.is_active} />
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
                {formFields.map((field) => (
                    <div key={field.id}>{field.component}</div>
                ))}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onSuccess}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" isLoading={processing}>
                        {processing ? t('Updating') : t('Update')}
                    </Button>
                </div>
            </form>
        </DialogContent>
    );
}

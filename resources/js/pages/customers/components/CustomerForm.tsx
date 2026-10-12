import React from 'react';
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "@inertiajs/react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import InputError from "@/components/ui/input-error";
import { PhoneInputComponent } from "@/components/ui/phone-input";
import { Building2 } from 'lucide-react';

interface Address {
    name: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
}

interface Props {
    type?: string;
    mode: 'create' | 'edit';
    data?: any;
    roles?: Record<string, string>;
    onSuccess: () => void;
}

export default function CustomerForm({ mode, data: initialData, onSuccess }: Props) {
    const { t } = useTranslation();
    const isEdit = mode === 'edit';

    // Initial billing address resolution
    const initialBilling: Address = {
        name: initialData?.billing_address?.name || initialData?.customer_name || initialData?.company_name || '',
        address_line_1: initialData?.billing_address?.address_line_1 || initialData?.billing_address?.address || '',
        address_line_2: initialData?.billing_address?.address_line_2 || '',
        city: initialData?.billing_address?.city || '',
        state: initialData?.billing_address?.state || '',
        country: initialData?.billing_address?.country || '',
        zip_code: initialData?.billing_address?.zip_code || '',
    };

    // Initial shipping address resolution
    const initialShipping: Address = {
        name: initialData?.shipping_address?.name || initialData?.customer_name || initialData?.company_name || '',
        address_line_1: initialData?.shipping_address?.address_line_1 || initialData?.shipping_address?.address || '',
        address_line_2: initialData?.shipping_address?.address_line_2 || '',
        city: initialData?.shipping_address?.city || '',
        state: initialData?.shipping_address?.state || '',
        country: initialData?.shipping_address?.country || '',
        zip_code: initialData?.shipping_address?.zip_code || '',
    };

    const { data, setData, post, put, processing, errors } = useForm({
        customer_name: initialData?.customer_name || initialData?.company_name || initialData?.name || '',
        customer_email: initialData?.customer_email || initialData?.email || initialData?.contact_person_email || '',
        customer_phone: initialData?.customer_phone || initialData?.mobile_no || initialData?.contact_person_mobile || '',
        contact_person_name: initialData?.contact_person_name || '',
        contact_person_email: initialData?.contact_person_email || '',
        contact_person_mobile: initialData?.contact_person_mobile || '',
        tax_number: initialData?.tax_number || '',
        payment_terms: initialData?.payment_terms || '',
        billing_address: initialBilling,
        same_as_billing: initialData ? Boolean(initialData.same_as_billing) : true,
        shipping_address: initialShipping,
        other_informations: initialData?.other_informations || '',
        notes: initialData?.notes || '',
        is_active: initialData ? Boolean(initialData.is_active !== false && initialData.is_active !== 0) : true,
    });

    const errs = errors as Record<string, string>;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit && initialData?.id) {
            put(route('customers.update', initialData.id), {
                onSuccess: () => {
                    onSuccess();
                }
            });
        } else {
            post(route('customers.store'), {
                onSuccess: () => {
                    onSuccess();
                }
            });
        }
    };

    const title = isEdit ? t('Edit Customer') : t('Create Customer');

    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span>{title}</span>
                </DialogTitle>
            </DialogHeader>

            <form onSubmit={submit} className="space-y-4 pt-2">
                {/* Basic Information */}
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="customer_name" required>
                            {t('Customer / Company Name')}
                        </Label>
                        <Input
                            id="customer_name"
                            value={data.customer_name}
                            onChange={(e) => {
                                const val = e.target.value;
                                setData(prev => ({
                                    ...prev,
                                    customer_name: val,
                                    billing_address: {
                                        ...prev.billing_address,
                                        name: prev.billing_address.name || val
                                    },
                                    shipping_address: {
                                        ...prev.shipping_address,
                                        name: prev.same_as_billing ? (prev.billing_address.name || val) : prev.shipping_address.name
                                    }
                                }));
                            }}
                            placeholder={t('Enter customer or company name')}
                            required
                        />
                        <InputError message={errors.customer_name} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="customer_email" required>{t('Customer Email')}</Label>
                            <Input
                                id="customer_email"
                                type="email"
                                value={data.customer_email}
                                onChange={(e) => setData('customer_email', e.target.value)}
                                placeholder={t('Enter customer email')}
                                required
                            />
                            <InputError message={errors.customer_email} />
                        </div>

                        <div>
                            <PhoneInputComponent
                                id="customer_phone"
                                label={t('Customer Phone')}
                                value={data.customer_phone}
                                onChange={(value) => setData('customer_phone', value)}
                                placeholder="+1234567890"
                                error={errors.customer_phone}
                                required
                            />
                        </div>
                    </div>

                    {/* Contact Person Information */}
                    <div className="border-t pt-4 space-y-4">
                        <h3 className="text-base font-semibold text-foreground">
                            {t('Contact Person Details')}
                        </h3>

                        <div>
                            <Label htmlFor="contact_person_name">{t('Contact Person Name')}</Label>
                            <Input
                                id="contact_person_name"
                                value={data.contact_person_name}
                                onChange={(e) => setData('contact_person_name', e.target.value)}
                                placeholder={t('Enter contact person name')}
                            />
                            <InputError message={errors.contact_person_name} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="contact_person_email">{t('Contact Person Email')}</Label>
                                <Input
                                    id="contact_person_email"
                                    type="email"
                                    value={data.contact_person_email}
                                    onChange={(e) => setData('contact_person_email', e.target.value)}
                                    placeholder={t('Enter contact person email')}
                                />
                                <InputError message={errors.contact_person_email} />
                            </div>

                            <div>
                                <PhoneInputComponent
                                    label={t('Contact Person Mobile')}
                                    value={data.contact_person_mobile}
                                    onChange={(value) => setData('contact_person_mobile', value)}
                                    placeholder="+1234567890"
                                    error={errors.contact_person_mobile}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tax & Payment Terms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                        <div>
                            <Label htmlFor="tax_number">{t('Tax Number')}</Label>
                            <Input
                                id="tax_number"
                                value={data.tax_number}
                                onChange={(e) => setData('tax_number', e.target.value)}
                                placeholder={t('Enter tax number')}
                            />
                            <InputError message={errors.tax_number} />
                        </div>

                        <div>
                            <Label htmlFor="payment_terms">{t('Payment Terms')}</Label>
                            <Input
                                id="payment_terms"
                                value={data.payment_terms}
                                onChange={(e) => setData('payment_terms', e.target.value)}
                                placeholder={t('e.g., Net 30, Due on Receipt')}
                            />
                            <InputError message={errors.payment_terms} />
                        </div>
                    </div>
                </div>

                {/* Billing Address Section */}
                <div className="space-y-4 border-t pt-4">
                    <h3 className="text-base font-semibold text-foreground">
                        {t('Billing Address')}
                    </h3>

                    <div>
                        <Label htmlFor="billing_name">{t('Billing Name')}</Label>
                        <Input
                            id="billing_name"
                            value={data.billing_address.name}
                            onChange={(e) => {
                                const name = e.target.value;
                                setData(prev => ({
                                    ...prev,
                                    billing_address: { ...prev.billing_address, name },
                                    shipping_address: prev.same_as_billing ? { ...prev.shipping_address, name } : prev.shipping_address
                                }));
                            }}
                            placeholder={t('Enter billing name')}
                        />
                        <InputError message={errs['billing_address.name']} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="billing_address_1">{t('Address Line 1')}</Label>
                            <Input
                                id="billing_address_1"
                                value={data.billing_address.address_line_1}
                                onChange={(e) => {
                                    const address_line_1 = e.target.value;
                                    setData(prev => ({
                                        ...prev,
                                        billing_address: { ...prev.billing_address, address_line_1 },
                                        shipping_address: prev.same_as_billing ? { ...prev.shipping_address, address_line_1 } : prev.shipping_address
                                    }));
                                }}
                                placeholder={t('Enter street address')}
                            />
                            <InputError message={errs['billing_address.address_line_1']} />
                        </div>

                        <div>
                            <Label htmlFor="billing_address_2">{t('Address Line 2')}</Label>
                            <Input
                                id="billing_address_2"
                                value={data.billing_address.address_line_2}
                                onChange={(e) => {
                                    const address_line_2 = e.target.value;
                                    setData(prev => ({
                                        ...prev,
                                        billing_address: { ...prev.billing_address, address_line_2 },
                                        shipping_address: prev.same_as_billing ? { ...prev.shipping_address, address_line_2 } : prev.shipping_address
                                    }));
                                }}
                                placeholder={t('Apartment, suite, unit, etc. (optional)')}
                            />
                            <InputError message={errs['billing_address.address_line_2']} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="billing_city" required>{t('City')}</Label>
                            <Input
                                id="billing_city"
                                value={data.billing_address.city}
                                onChange={(e) => {
                                    const city = e.target.value;
                                    setData(prev => ({
                                        ...prev,
                                        billing_address: { ...prev.billing_address, city },
                                        shipping_address: prev.same_as_billing ? { ...prev.shipping_address, city } : prev.shipping_address
                                    }));
                                }}
                                placeholder={t('Enter city')}
                                required
                            />
                            <InputError message={errs['billing_address.city']} />
                        </div>

                        <div>
                            <Label htmlFor="billing_state" required>{t('State / Province')}</Label>
                            <Input
                                id="billing_state"
                                value={data.billing_address.state}
                                onChange={(e) => {
                                    const state = e.target.value;
                                    setData(prev => ({
                                        ...prev,
                                        billing_address: { ...prev.billing_address, state },
                                        shipping_address: prev.same_as_billing ? { ...prev.shipping_address, state } : prev.shipping_address
                                    }));
                                }}
                                placeholder={t('Enter state / province')}
                                required
                            />
                            <InputError message={errs['billing_address.state']} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="billing_country" required>{t('Country')}</Label>
                            <Input
                                id="billing_country"
                                value={data.billing_address.country}
                                onChange={(e) => {
                                    const country = e.target.value;
                                    setData(prev => ({
                                        ...prev,
                                        billing_address: { ...prev.billing_address, country },
                                        shipping_address: prev.same_as_billing ? { ...prev.shipping_address, country } : prev.shipping_address
                                    }));
                                }}
                                placeholder={t('Enter country')}
                                required
                            />
                            <InputError message={errs['billing_address.country']} />
                        </div>

                        <div>
                            <Label htmlFor="billing_zip" required>{t('Zip / Postal Code')}</Label>
                            <Input
                                id="billing_zip"
                                value={data.billing_address.zip_code}
                                onChange={(e) => {
                                    const zip_code = e.target.value;
                                    setData(prev => ({
                                        ...prev,
                                        billing_address: { ...prev.billing_address, zip_code },
                                        shipping_address: prev.same_as_billing ? { ...prev.shipping_address, zip_code } : prev.shipping_address
                                    }));
                                }}
                                placeholder={t('Enter zip / postal code')}
                                required
                            />
                            <InputError message={errs['billing_address.zip_code']} />
                        </div>
                    </div>
                </div>

                {/* Same as Billing Checkbox */}
                <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                        id="same_as_billing"
                        checked={data.same_as_billing}
                        onCheckedChange={(checked) => {
                            const isChecked = !!checked;
                            setData(prev => ({
                                ...prev,
                                same_as_billing: isChecked,
                                shipping_address: isChecked ? { ...prev.billing_address } : prev.shipping_address
                            }));
                        }}
                    />
                    <Label htmlFor="same_as_billing" className="cursor-pointer font-normal">
                        {t('Shipping address same as billing')}
                    </Label>
                </div>

                {/* Shipping Address Section (if not same as billing) */}
                {!data.same_as_billing && (
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="text-base font-semibold text-foreground">
                            {t('Shipping Address')}
                        </h3>

                        <div>
                            <Label htmlFor="shipping_name">{t('Shipping Name')}</Label>
                            <Input
                                id="shipping_name"
                                value={data.shipping_address.name}
                                onChange={(e) => setData('shipping_address', { ...data.shipping_address, name: e.target.value })}
                                placeholder={t('Enter shipping name')}
                            />
                            <InputError message={errs['shipping_address.name']} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="shipping_address_1">{t('Address Line 1')}</Label>
                                <Input
                                    id="shipping_address_1"
                                    value={data.shipping_address.address_line_1}
                                    onChange={(e) => setData('shipping_address', { ...data.shipping_address, address_line_1: e.target.value })}
                                    placeholder={t('Enter street address')}
                                />
                                <InputError message={errs['shipping_address.address_line_1']} />
                            </div>

                            <div>
                                <Label htmlFor="shipping_address_2">{t('Address Line 2')}</Label>
                                <Input
                                    id="shipping_address_2"
                                    value={data.shipping_address.address_line_2}
                                    onChange={(e) => setData('shipping_address', { ...data.shipping_address, address_line_2: e.target.value })}
                                    placeholder={t('Apartment, suite, unit, etc. (optional)')}
                                />
                                <InputError message={errs['shipping_address.address_line_2']} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="shipping_city" required>{t('City')}</Label>
                                <Input
                                    id="shipping_city"
                                    value={data.shipping_address.city}
                                    onChange={(e) => setData('shipping_address', { ...data.shipping_address, city: e.target.value })}
                                    placeholder={t('Enter city')}
                                    required
                                />
                                <InputError message={errs['shipping_address.city']} />
                            </div>

                            <div>
                                <Label htmlFor="shipping_state" required>{t('State / Province')}</Label>
                                <Input
                                    id="shipping_state"
                                    value={data.shipping_address.state}
                                    onChange={(e) => setData('shipping_address', { ...data.shipping_address, state: e.target.value })}
                                    placeholder={t('Enter state / province')}
                                    required
                                />
                                <InputError message={errs['shipping_address.state']} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="shipping_country" required>{t('Country')}</Label>
                                <Input
                                    id="shipping_country"
                                    value={data.shipping_address.country}
                                    onChange={(e) => setData('shipping_address', { ...data.shipping_address, country: e.target.value })}
                                    placeholder={t('Enter country')}
                                    required
                                />
                                <InputError message={errs['shipping_address.country']} />
                            </div>

                            <div>
                                <Label htmlFor="shipping_zip" required>{t('Zip / Postal Code')}</Label>
                                <Input
                                    id="shipping_zip"
                                    value={data.shipping_address.zip_code}
                                    onChange={(e) => setData('shipping_address', { ...data.shipping_address, zip_code: e.target.value })}
                                    placeholder={t('Enter zip / postal code')}
                                    required
                                />
                                <InputError message={errs['shipping_address.zip_code']} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Other Information & Notes */}
                <div className="border-t pt-4 space-y-4">
                    <div>
                        <Label htmlFor="other_informations">{t('Other Information')}</Label>
                        <Textarea
                            id="other_informations"
                            value={data.other_informations}
                            onChange={(e) => setData('other_informations', e.target.value)}
                            placeholder={t('Enter any other relevant details...')}
                            rows={3}
                        />
                        <InputError message={errors.other_informations} />
                    </div>

                    <div>
                        <Label htmlFor="notes">{t('Notes')}</Label>
                        <Textarea
                            id="notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            placeholder={t('Enter any notes or special instructions...')}
                            rows={3}
                        />
                        <InputError message={errors.notes} />
                    </div>

                    {/* Customer Status */}
                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                            id="is_active"
                            checked={data.is_active}
                            onCheckedChange={(checked) => setData('is_active', !!checked)}
                        />
                        <Label htmlFor="is_active" className="cursor-pointer font-normal">
                            {t('Active')}
                        </Label>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onSuccess}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" isLoading={processing}>
                        {processing ? (isEdit ? t('Updating') : t('Creating')) : (isEdit ? t('Update') : t('Create'))}
                    </Button>
                </div>
            </form>
        </DialogContent>
    );
}

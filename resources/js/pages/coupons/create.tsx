import { useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import { CurrencyInput } from '@/components/ui/currency-input';
import InputError from '@/components/ui/input-error';
import { CreateCouponProps, CreateCouponFormData } from './types';

export default function Create({ onSuccess }: CreateCouponProps) {
    const { t } = useTranslation();
    const { props } = usePage();
    const currencySymbol = (props as any)?.companyAllSetting?.currencySymbol || '$';

    const { data, setData, post, processing, errors } = useForm<CreateCouponFormData>({
        name: '',
        description: '',
        code: '',
        discount: 0,
        limit: undefined,
        type: 'percentage',
        minimum_spend: undefined,
        maximum_spend: undefined,
        limit_per_user: undefined,
        expiry_date: '',
        included_module: [],
        excluded_module: [],
        status: true
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('coupons.store'), {
            onSuccess: () => {
                onSuccess();
            }
        });
    };

    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{t('Create Coupon')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="name">{t('Name')}</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder={t('Enter coupon name')}
                            required
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div>
                        <Label htmlFor="code">{t('Code')}</Label>
                        <div className="flex gap-2">
                            <Input
                                id="code"
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                placeholder={t('Enter coupon code')}
                                required
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setData('code', 'COUP-' + Date.now())}
                                disabled={processing}
                            >
                                {t('Generate')}
                            </Button>
                        </div>
                        <InputError message={errors.code} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="type">{t('Type')}</Label>
                        <Select value={data.type} onValueChange={(value: 'percentage' | 'flat' | 'fixed') => setData('type', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Select type')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="percentage">{t('Percentage')}</SelectItem>
                                <SelectItem value="flat">{t('Flat Amount')}</SelectItem>
                                <SelectItem value="fixed">{t('Fixed Price')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <InputError message={errors.type} />
                    </div>

                    <div>
                        <Label htmlFor="discount">
                            {t('Discount')} {data.type === 'percentage' ? '(%)' : `(${currencySymbol})`}
                        </Label>
                        <Input
                            id="discount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.discount}
                            onChange={(e) => setData('discount', parseFloat(e.target.value) || 0)}
                            placeholder={t('Enter discount value')}
                        />
                        <InputError message={errors.discount} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="limit">{t('Usage Limit')}</Label>
                        <Input
                            id="limit"
                            type="number"
                            min="1"
                            value={data.limit || ''}
                            onChange={(e) => setData('limit', e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder={t('Enter Usage Limit')}
                        />
                        <InputError message={errors.limit} />
                    </div>

                    <div>
                        <Label htmlFor="limit_per_user">{t('Limit Per User')}</Label>
                        <Input
                            id="limit_per_user"
                            type="number"
                            min="1"
                            value={data.limit_per_user || ''}
                            onChange={(e) => setData('limit_per_user', e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder={t('Enter Limit Per User')}
                        />
                        <InputError message={errors.limit_per_user} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <CurrencyInput
                            label={t('Minimum Spend')}
                            value={(data.minimum_spend || '').toString()}
                            onChange={(value) => setData('minimum_spend', value ? parseFloat(value) : undefined)}
                            error={errors.minimum_spend}
                            placeholder={t('Enter minimum spend')}
                        />
                    </div>

                    <div>
                        <CurrencyInput
                            label={t('Maximum Spend')}
                            value={(data.maximum_spend || '').toString()}
                            onChange={(value) => setData('maximum_spend', value ? parseFloat(value) : undefined)}
                            error={errors.maximum_spend}
                            placeholder={t('Enter maximum spend')}
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="description">{t('Description')}</Label>
                    <Textarea
                        id="description"
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        placeholder={t('Enter description')}
                        rows={3}
                    />
                    <InputError message={errors.description} />
                </div>

                <div>
                    <Label htmlFor="expiry_date">{t('Expiry Date')}</Label>
                    <DatePicker
                        value={data.expiry_date}
                        onChange={(value) => setData('expiry_date', value)}
                    />
                    <InputError message={errors.expiry_date} />
                </div>

                <div className="flex items-center space-x-2">
                    <Switch
                        id="status"
                        checked={data.status}
                        onCheckedChange={(checked) => setData('status', checked)}
                    />
                    <Label htmlFor="status">{t('Active')}</Label>
                </div>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onSuccess}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" isLoading={processing}>
                        {processing ? t('Creating') : t('Create')}
                    </Button>
                </div>
            </form>
        </DialogContent>
    );
}

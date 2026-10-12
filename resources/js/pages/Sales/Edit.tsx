import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Head, useForm, usePage, router, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { useFormFields } from '@/hooks/useFormFields';
import { SalesInvoice, SalesInvoiceItem, Customer } from './types';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import InvoiceItemsTable from './components/InvoiceItemsTable';
import { useTaxCalculator, calculateLineItemAmounts } from './components/TaxCalculator';
import { formatCurrency } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputError } from '@/components/ui/input-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Package, User, UserPlus, Users, X } from 'lucide-react';
import RichTextEditor from '@/components/ui/rich-text-editor';

interface EditProps {
    invoice: SalesInvoice;
    customers: Customer[];
    products: Array<{ id: number; name: string; sku: string; sale_price: number; unit: string; unit_name?: string; type: string; taxes: Array<{ id: number; tax_name: string; rate: number }> }>;
    warehouses: Array<{ id: number; name: string; address: string }>;
    [key: string]: any;
}

export default function Edit() {
    const { t } = useTranslation();
    const { invoice, customers, products, warehouses } = usePage<EditProps>().props;
    const initialMergedProducts = useMemo(() => {
        const baseList = Array.isArray(products) ? [...products] : [];
        (invoice?.items || []).forEach(item => {
            const prod = item.product;
            if (prod && !baseList.some(p => p.id === prod.id)) {
                baseList.push(prod as any);
            }
        });
        return baseList;
    }, [products, invoice?.items]);

    const [availableProducts, setAvailableProducts] = useState<any[]>(initialMergedProducts);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const isInitialMount = useRef(true);

    const fetchWarehouseProducts = async (warehouseId: string) => {
        if (!warehouseId) {
            setAvailableProducts(initialMergedProducts);
            return;
        }

        try {
            setIsRefreshing(true);
            const response = await fetch(route('sales-invoices.warehouse.products') + `?warehouse_id=${warehouseId}`);
            if (!response.ok) throw new Error('Failed to fetch products');
            const data = await response.json();
            const fetched = Array.isArray(data) ? [...data] : [];
            // Preserve existing invoice item products so they never vanish
            (invoice.items || []).forEach(item => {
                const prod = item.product;
                if (prod && !fetched.some(p => p.id === prod.id)) {
                    fetched.push(prod as any);
                }
            });
            setAvailableProducts(fetched);
        } catch (error) {
            console.error('Error fetching warehouse products:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        if (data.warehouse_id) {
            fetchWarehouseProducts(data.warehouse_id);
        } else {
            setIsRefreshing(true);
            router.reload({
                only: ['products'],
                onFinish: () => setIsRefreshing(false)
            });
        }
    };

    useFlashMessages();

    const isInitiallyNew = !invoice.customer_id && Boolean(invoice.customer_name);

    const { data, setData, put, processing, errors } = useForm({
        ...invoice,
        customer_mode: (isInitiallyNew ? 'new' : 'existing') as 'existing' | 'new',
        customer_id: invoice.customer_id ? invoice.customer_id.toString() : '',
        customer_name: invoice.customer_name || '',
        customer_email: invoice.customer_email || '',
        customer_phone: invoice.customer_phone || '',
        customer_address: invoice.customer_address || '',
        warehouse_id: invoice.warehouse_id ? invoice.warehouse_id.toString() : '',
        payment_terms: invoice.payment_terms || '',
        notes: invoice.notes || '',
        items: (invoice.items || []).map(item => {
            const effDiscType = item.discount_type || 'percentage';
            const calculations = calculateLineItemAmounts(
                item.quantity,
                item.unit_price,
                item.discount_percentage,
                item.tax_percentage,
                effDiscType,
                item.discount_amount
            );
            return {
                ...item,
                product_type: item.product?.type || item.product_type || 'product',
                description: item.description || '',
                taxes: item.taxes || [],
                discount_type: effDiscType,
                discount_percentage: calculations.discountPercentage,
                discount_amount: calculations.discountAmount,
                tax_amount: calculations.taxAmount,
                total_amount: calculations.totalAmount
            };
        }) as SalesInvoiceItem[]
    });

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (data.warehouse_id) {
            fetchWarehouseProducts(data.warehouse_id);
        } else {
            setAvailableProducts(initialMergedProducts);
        }
    }, [data.warehouse_id]);

    const selectedCustomer = useMemo(() => {
        if (!data.customer_id) return null;
        return customers.find(c => c.id.toString() === data.customer_id.toString());
    }, [data.customer_id, customers]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('sales-invoices.update', invoice.id));
    };

    const totals = useTaxCalculator(data.items);

    // Recurring fields hook
    const recurringFields = useFormFields('salesInvoiceEditFields', data, setData, errors, 'edit', invoice);

    // Commission plan fields hook
    const commissionFields = useFormFields('commissionPlanBtn', data, setData, errors, 'edit');

    // Sage fields hook
    const sageFields = useFormFields('salesInvoiceFields', data, setData, errors, 'edit', t);

    // Custom fields hook
    const customFields = useFormFields('getCustomFields', { ...data, module: 'General', sub_module: 'Sales Invoice', id: invoice.id }, setData, errors, 'edit', t);

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('Invoice'), url: route('sales-invoices.index') },
                { label: t('Edit Invoice') }
            ]}
            pageTitle={t('Edit Invoice')}
        >
            <Head title={t('Edit Invoice')} />

            <div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <CalendarDays className="h-5 w-5" />
                                {t('Invoice Details')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <Label htmlFor="customer_id" required className="text-xs">
                                            {t('Customer')}
                                        </Label>
                                        <Link
                                            href={route('account.customers.index')}
                                            className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1 focus:outline-none"
                                        >
                                            <UserPlus className="h-3 w-3" />
                                            {t('New Customer')}
                                        </Link>
                                    </div>

                                    <Select value={data.customer_id} onValueChange={(value) => setData('customer_id', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select Customer')} />
                                        </SelectTrigger>
                                        <SelectContent searchable>
                                            {Array.isArray(customers) && customers.map((customer: any) => customer && customer.id !== undefined && customer.id !== null ? (
                                                <SelectItem key={customer.id} value={String(customer.id)}>
                                                    {customer.customer_name || 'Customer'} - {customer.customer_email || '-'}
                                                </SelectItem>
                                            ) : null)}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.customer_id} />

                                    {/* Selected Customer Card directly below customer select */}
                                    {selectedCustomer && (
                                        <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-slate-50/80 dark:bg-slate-900/40 text-xs space-y-1">
                                            <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <div className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                                                        <User className="w-2.5 h-2.5" />
                                                    </div>
                                                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">
                                                        {selectedCustomer.customer_name}
                                                    </span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-4 px-1 text-[10px] font-medium gap-0.5 shrink-0"
                                                    onClick={() => setData('customer_id', '')}
                                                >
                                                    <X className="w-2.5 h-2.5" />
                                                    {t('Clear')}
                                                </Button>
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 truncate">
                                                <div className="truncate">{selectedCustomer.customer_email || '-'}</div>
                                                {selectedCustomer.customer_phone && <div className="truncate">{selectedCustomer.customer_phone}</div>}
                                                {selectedCustomer.billing_address?.address && <div className="truncate text-muted-foreground">{selectedCustomer.billing_address.address}</div>}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="invoice_date" required>
                                        {t('Invoice Date')}
                                    </Label>
                                    <DatePicker
                                        id="invoice_date"
                                        value={data.invoice_date}
                                        onChange={(value) => setData('invoice_date', value)}
                                        required
                                    />
                                    <InputError message={errors.invoice_date} />
                                </div>

                                <div>
                                    <Label htmlFor="due_date" required>
                                        {t('Due Date')}
                                    </Label>
                                    <DatePicker
                                        id="due_date"
                                        value={data.due_date}
                                        onChange={(value) => setData('due_date', value)}
                                        required
                                    />
                                    <InputError message={errors.due_date} />
                                </div>

                                <div>
                                    <Label htmlFor="warehouse_id">
                                        {t('Warehouse')}
                                    </Label>
                                    <Select
                                        value={data.warehouse_id}
                                        onValueChange={(value) => {
                                            setData((prev) => ({
                                                ...prev,
                                                warehouse_id: value,
                                                items: prev.items.map((item) => ({
                                                    ...item,
                                                    product_id: 0,
                                                    unit_price: 0,
                                                    description: '',
                                                    tax_percentage: 0,
                                                    taxes: [],
                                                    tax_amount: 0,
                                                    discount_amount: 0,
                                                    total_amount: 0,
                                                }))
                                            }));
                                            fetchWarehouseProducts(value);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select Warehouse')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map((warehouse) => (
                                                <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                                    {warehouse.name} - {warehouse.address}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.warehouse_id} />
                                </div>
                            </div>



                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <Label htmlFor="payment_terms">
                                        {t('Terms & Conditions')}
                                    </Label>
                                    <div className="mt-1">
                                        <RichTextEditor
                                            content={data.payment_terms}
                                            onChange={(value) => setData('payment_terms', value)}
                                            placeholder={t('Enter terms & conditions...')}
                                            minimal={true}
                                        />
                                    </div>
                                    <InputError message={errors.payment_terms} />
                                </div>

                                <div>
                                    <Label htmlFor="notes">
                                        {t('Notes')}
                                    </Label>
                                    <Textarea
                                        id="notes"
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        rows={2}
                                        placeholder={t('Additional notes...')}
                                        className="h-32"
                                    />
                                    <InputError message={errors.notes} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recurring Sales Invoice */}
                    {recurringFields.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t('Recurring Settings')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {recurringFields.map((field) => (
                                        <div key={field.id}>{field.component}</div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Commission Plan Fields */}
                    {commissionFields.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t('Commission Settings')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {commissionFields.map((field) => (
                                        <div key={field.id}>{field.component}</div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Sage Fields */}
                    {sageFields.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t('Accounting Settings')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {sageFields.map((field) => (
                                        <div key={field.id}>{field.component}</div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Custom Fields */}
                    {customFields.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t('Custom Fields')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {customFields.map((field) => (
                                        <div key={field.id}>{field.component}</div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Invoice Items Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Package className="h-5 w-5" />
                                {t('Invoice Items')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <InvoiceItemsTable
                                items={data.items}
                                onChange={(items) => setData('items', items)}
                                errors={errors}
                                products={availableProducts}
                                showAddButton={true}
                                onRefresh={handleRefresh}
                                isRefreshing={isRefreshing}
                                warehouseId={data.warehouse_id}
                            />

                            {/* Invoice Summary */}
                            <div className="mt-4 flex justify-end">
                                <div className="w-full sm:w-80 bg-muted/30 rounded-lg p-4">
                                    <h3 className="font-semibold mb-3">{t('Invoice Summary')}</h3>
                                    <div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{t('Subtotal')}</span>
                                            <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{t('Discount')}</span>
                                            <span className="font-medium text-red-600">-{formatCurrency(totals.discountAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{t('Tax')}</span>
                                            <span className="font-medium">{formatCurrency(totals.taxAmount)}</span>
                                        </div>
                                        <Separator className="my-2" />
                                        <div className="flex justify-between">
                                            <span className="font-semibold">{t('Total')}</span>
                                            <span className="font-bold text-lg">{formatCurrency(totals.total)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.visit(route('sales-invoices.index'))}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" isLoading={processing}>
                            {processing ? t('Saving') : t('Update Invoice')}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}

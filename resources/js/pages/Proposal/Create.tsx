import React, { useState, useEffect, useMemo } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { useFormFields } from '@/hooks/useFormFields';
import { ProposalItem } from '@/pages/Proposal/types';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputError } from '@/components/ui/input-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, FileText, User, Users, UserPlus, X, Eye } from 'lucide-react';
import PreviewModal from './components/Preview/PreviewModal';
import { Badge } from '@/components/ui/badge';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { DatePicker } from '@/components/ui/date-picker';
import { Switch } from '@/components/ui/switch';
import ItemsTable from './components/ItemsTable';
import PageOrder from './components/PageOrder';
import { replaceUserShortcodes } from './utils/proposalShortcodes';

interface Page {
    id: number;
    title: string;
    content: string;
    page_type?: string;
    background_image?: string;
    sort_order: number;
}

interface Props {
    customers: Array<{ id: number; name: string; email: string;[key: string]: any }>;
    warehouses: Array<{ id: number; name: string; address: string }>;
    pages?: Page[];
    proposalSetting?: any;
    subjects?: Array<{ id: number; name: string }>;
    [key: string]: any;
}

// Helpers to identify active item / detail sections
const isOtcItem = (i: ProposalItem) =>
    (i.section === 'otc' || i.section === 'general' || !i.section) &&
    (Number(i.product_id) > 0 || (typeof i.product_description === 'string' && i.product_description.trim() !== '') || (typeof i.description === 'string' && i.description.trim() !== ''));

const isMrcItem = (i: ProposalItem) =>
    i.section === 'mrc' &&
    (Number(i.product_id) > 0 || (typeof i.product_description === 'string' && i.product_description.trim() !== '') || (typeof i.description === 'string' && i.description.trim() !== ''));

const isOtherDetails = (content?: string) =>
    Boolean(content && content.trim() !== '' && content !== '<p></p>');

export default function Create() {
    const { t } = useTranslation();
    const pageProps = usePage<Props>().props;
    const { customers, warehouses, pages = [], proposalSetting, subjects = [] } = pageProps;
    const authUser = (pageProps as any)?.auth?.user;
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Helper to build active sections strictly following pages order rule
    const buildSectionsFromPages = (itemsList: ProposalItem[], otherDetailsContent: string) => {
        const hasOtc = itemsList.some(isOtcItem);
        const hasMrc = itemsList.some(isMrcItem);
        const hasOther = isOtherDetails(otherDetailsContent);

        if (!pages || pages.length === 0) return [];

        // Filter proposal pages: include general/cover/content always, include otc only if hasOtc, include mrc only if hasMrc
        const activePages = pages.filter((p) => {
            if (p.page_type === 'otc') return hasOtc;
            if (p.page_type === 'mrc') return hasMrc;
            if (p.page_type === 'other-details') return hasOther;
            return true;
        });

        // Sort active proposal pages strictly by their configured sort_order
        activePages.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));

        let res = activePages.map((p, idx) => ({
            id: `sec-${p.page_type || 'page'}-${p.id || idx}`,
            page_id: p.id,
            title: p.title || (p.page_type === 'otc' ? 'One-Time Charges (OTC)' : p.page_type === 'mrc' ? 'Monthly Recurring Charges (MRC)' : p.page_type === 'other-details' ? 'Other Details' : `Page ${idx + 1}`),
            content: p.page_type === 'otc' ? '[OTC_CHARGES_TABLE]' : (p.page_type === 'mrc' ? '[MRC_CHARGES_TABLE]' : (p.page_type === 'other-details' ? '[OTHER_DETAILS_CONTENT]' : (replaceUserShortcodes(p.content, authUser) || ''))),
            page_type: p.page_type || 'general',
            background_image: p.background_image || '',
            order: idx + 1,
            isExpanded: false,
        }));

        // If other-details is present in form but not in pages, append it
        if (hasOther && !res.some((s) => s.page_type === 'other-details')) {
            res.push({
                id: `sec-other-details-custom`,
                page_id: undefined as any,
                title: 'Other Details',
                content: '[OTHER_DETAILS_CONTENT]',
                page_type: 'other-details',
                background_image: '',
                order: res.length + 1,
                isExpanded: false,
            });
        }

        return res;
    };

    // Initialize proposal sections from proposal pages
    const [sections, setSections] = useState<Array<{ id: string; title: string; content: string; page_type?: string; background_image?: string; order: number; isExpanded: boolean; page_id?: number }>>(() => {
        return buildSectionsFromPages([], '');
    });

    useFlashMessages();
    const { data, setData, post, processing, errors, transform } = useForm({
        subject: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        customer_mode: 'existing' as 'existing' | 'new',
        customer_id: '',
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        customer_address: '',
        warehouse_id: '',
        type: 'product' as 'product' | 'service',
        is_tax_enabled: true,
        is_prepaid: false,
        otc_discount_type: 'percentage' as 'percentage' | 'fixed',
        otc_discount_value: 0,
        mrc_discount_type: 'percentage' as 'percentage' | 'fixed',
        mrc_discount_value: 0,
        payment_terms: '',
        notes: '',
        items: [] as ProposalItem[],
        other_details: '',
    });

    const customFields = useFormFields('getCustomFields', { ...data, module: 'General', sub_module: 'Proposal' }, setData, errors, 'create', t);

    // Auto-sync OTC, MRC, and Other Details into Page Order list strictly following pages order rules
    useEffect(() => {
        setSections((prev) => {
            const hasOtc = data.items.some(isOtcItem);
            const hasMrc = data.items.some(isMrcItem);
            const hasOther = isOtherDetails(data.other_details);

            const currentHasOtc = prev.some((s) => s.page_type === 'otc');
            const currentHasMrc = prev.some((s) => s.page_type === 'mrc');
            const currentHasOther = prev.some((s) => s.page_type === 'other-details');

            // If visibility states did not change, keep current state (preserve manual edits/drag-drop)
            if (hasOtc === currentHasOtc && hasMrc === currentHasMrc && hasOther === currentHasOther) {
                return prev;
            }

            // Otherwise, rebuild according to pages sort_order
            const defaultOtc = pages?.find((p) => p.page_type === 'otc');
            const defaultMrc = pages?.find((p) => p.page_type === 'mrc');
            const defaultOther = pages?.find((p) => p.page_type === 'other-details');

            let nextSections = [...prev];

            // 1. Remove sections if items/content no longer exist
            if (!hasOtc && currentHasOtc) {
                nextSections = nextSections.filter((s) => s.page_type !== 'otc');
            }
            if (!hasMrc && currentHasMrc) {
                nextSections = nextSections.filter((s) => s.page_type !== 'mrc');
            }
            if (!hasOther && currentHasOther) {
                nextSections = nextSections.filter((s) => s.page_type !== 'other-details');
            }

            // 2. Add OTC if items exist and not present
            if (hasOtc && !currentHasOtc) {
                nextSections.push({
                    id: `sec-otc-${defaultOtc?.id || 'dynamic'}`,
                    page_id: defaultOtc?.id,
                    title: defaultOtc?.title || 'One-Time Charges (OTC)',
                    content: '[OTC_CHARGES_TABLE]',
                    page_type: 'otc',
                    background_image: defaultOtc?.background_image || '',
                    order: defaultOtc?.sort_order !== undefined ? Number(defaultOtc.sort_order) : 99,
                    isExpanded: false,
                });
            }

            // 3. Add MRC if items exist and not present
            if (hasMrc && !currentHasMrc) {
                nextSections.push({
                    id: `sec-mrc-${defaultMrc?.id || 'dynamic'}`,
                    page_id: defaultMrc?.id,
                    title: defaultMrc?.title || 'Monthly Recurring Charges (MRC)',
                    content: '[MRC_CHARGES_TABLE]',
                    page_type: 'mrc',
                    background_image: defaultMrc?.background_image || '',
                    order: defaultMrc?.sort_order !== undefined ? Number(defaultMrc.sort_order) : 100,
                    isExpanded: false,
                });
            }

            // 4. Add Other Details if present
            if (hasOther && !currentHasOther) {
                nextSections.push({
                    id: `sec-other-details-${defaultOther?.id || 'dynamic'}`,
                    page_id: defaultOther?.id,
                    title: defaultOther?.title || 'Other Details',
                    content: '[OTHER_DETAILS_CONTENT]',
                    page_type: 'other-details',
                    background_image: defaultOther?.background_image || '',
                    order: defaultOther?.sort_order !== undefined ? Number(defaultOther.sort_order) : 101,
                    isExpanded: false,
                });
            }

            // 5. Strictly sort all sections based on their configured sort_order
            const getDefOrder = (sec: any) => {
                const def = pages?.find((dp) =>
                    (sec.page_id && dp.id === sec.page_id) ||
                    (sec.page_type && ['otc', 'mrc', 'other-details'].includes(sec.page_type) && dp.page_type === sec.page_type) ||
                    (dp.title && sec.title && dp.title.trim().toLowerCase() === sec.title.trim().toLowerCase())
                );
                return def?.sort_order !== undefined ? Number(def.sort_order) : 1000 + (Number(sec.order) || 0);
            };

            nextSections.sort((a, b) => getDefOrder(a) - getDefOrder(b));
            return nextSections.map((s, idx) => ({ ...s, order: idx + 1 }));
        });
    }, [data.items, data.other_details, pages]);

    // Fetch warehouse products
    const [isRefreshingProducts, setIsRefreshingProducts] = useState(false);
    const fetchWarehouseProducts = async (warehouseId: string) => {
        if (!warehouseId) {
            setAvailableProducts([]);
            return;
        }

        try {
            setIsRefreshingProducts(true);
            setAvailableProducts([]);
            const response = await fetch(route('sales-proposals.warehouse.products') + `?warehouse_id=${warehouseId}`);
            if (!response.ok) throw new Error('Failed to fetch products');
            const data = await response.json();
            setAvailableProducts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching warehouse products:', error);
            setAvailableProducts([]);
        } finally {
            setIsRefreshingProducts(false);
        }
    };

    const fetchServiceProducts = async () => {
        try {
            setIsRefreshingProducts(true);
            const response = await fetch(route('sales-proposals.services'));
            if (!response.ok) throw new Error('Failed to fetch services');
            const data = await response.json();
            setAvailableProducts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching service products:', error);
            setAvailableProducts([]);
        } finally {
            setIsRefreshingProducts(false);
        }
    };

    const refreshProducts = () => {
        if (data.warehouse_id) {
            fetchWarehouseProducts(data.warehouse_id);
        } else if (data.type === 'service') {
            fetchServiceProducts();
        }
    };

    useEffect(() => {
        if (data.warehouse_id) {
            fetchWarehouseProducts(data.warehouse_id);
        }
    }, [data.warehouse_id]);

    const handleWarehouseChange = (value: string) => {
        setData((prev) => ({
            ...prev,
            warehouse_id: value,
            items: prev.items.map((item) => ({
                ...item,
                product_id: 0,
                unit_price: 0,
                total_amount: 0,
            })),
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        transform((formData) => ({
            ...formData,
            type: formData.type || 'product',
            items: formData.items.map((item) => ({
                ...item,
                product_type: item.product_type || formData.type || 'product',
            })),
            proposal_content: sections.map((item, index) => ({
                title: replaceUserShortcodes(item.title, authUser),
                content: replaceUserShortcodes(
                    item.page_type === 'other-details' ? (data.other_details || item.content || '') : item.content,
                    authUser
                ),
                page_type: item.page_type || 'content',
                background_image: item.background_image || '',
                sort_order: index + 1,
            })),
        }));

        post(route('sales-proposals.store'));
    };

    const totals = useMemo(() => {
        const otcItems = data.items.filter(isOtcItem);
        const mrcItems = data.items.filter(i => i.section === 'mrc');

        const otcSubtotal = otcItems.reduce((acc, i) => acc + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
        const mrcSubtotal = mrcItems.reduce((acc, i) => acc + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);

        const otcItemsDiscSum = otcItems.reduce((acc, i) => acc + (Number(i.discount_amount) || 0), 0);
        const mrcItemsDiscSum = mrcItems.reduce((acc, i) => acc + (Number(i.discount_amount) || 0), 0);

        let otcDiscount = otcItemsDiscSum;
        if (otcItemsDiscSum === 0 && (Number(data.otc_discount_value) || 0) > 0) {
            if (data.otc_discount_type === 'percentage') {
                otcDiscount = (otcSubtotal * Math.min(Math.max(Number(data.otc_discount_value) || 0, 0), 100)) / 100;
            } else {
                otcDiscount = Math.min(Math.max(Number(data.otc_discount_value) || 0, 0), otcSubtotal);
            }
        }

        let mrcDiscount = mrcItemsDiscSum;
        if (mrcItemsDiscSum === 0 && (Number(data.mrc_discount_value) || 0) > 0) {
            if (data.mrc_discount_type === 'percentage') {
                mrcDiscount = (mrcSubtotal * Math.min(Math.max(Number(data.mrc_discount_value) || 0, 0), 100)) / 100;
            } else {
                mrcDiscount = Math.min(Math.max(Number(data.mrc_discount_value) || 0, 0), mrcSubtotal);
            }
        }

        const otcTax = otcItems.reduce((acc, i) => acc + (Number(i.tax_amount) || 0), 0);
        const mrcTax = mrcItems.reduce((acc, i) => acc + (Number(i.tax_amount) || 0), 0);

        const subtotal = otcSubtotal + mrcSubtotal;
        const discountAmount = otcDiscount + mrcDiscount;
        const taxAmount = otcTax + mrcTax;
        const total = Math.max(0, subtotal - discountAmount + taxAmount);

        return {
            subtotal,
            discountAmount,
            taxAmount,
            total,
            otcSubtotal,
            otcDiscount,
            otcTax,
            otcTotal: Math.max(0, otcSubtotal - otcDiscount + otcTax),
            mrcSubtotal,
            mrcDiscount,
            mrcTax,
            mrcTotal: Math.max(0, mrcSubtotal - mrcDiscount + mrcTax),
        };
    }, [data.items, data.otc_discount_type, data.otc_discount_value, data.mrc_discount_type, data.mrc_discount_value]);

    const selectedCustomer = useMemo(() => {
        if (data.customer_mode === 'new') {
            if (!data.customer_name && !data.customer_email) return null;
            return {
                id: 0,
                name: data.customer_name,
                email: data.customer_email,
                mobile_no: data.customer_phone,
                phone: data.customer_phone,
                address: data.customer_address,
            };
        }
        if (!data.customer_id || !Array.isArray(customers)) return null;
        return customers.find((c: any) => c && c.id !== undefined && c.id !== null && String(c.id) === String(data.customer_id)) || null;
    }, [data.customer_mode, data.customer_id, data.customer_name, data.customer_email, data.customer_phone, data.customer_address, customers]);

    const isFormValid = useMemo(() => {
        if (!data.subject) return false;
        if (!data.invoice_date) return false;
        if (!data.due_date) return false;
        if (!data.warehouse_id) return false;
        if (data.customer_mode === 'existing' && !data.customer_id) return false;
        if (data.customer_mode === 'new' && (!data.customer_name || !data.customer_email || !data.customer_phone)) return false;
        if (data.items.length === 0) return false;
        return true;
    }, [data.subject, data.invoice_date, data.due_date, data.warehouse_id, data.customer_mode, data.customer_id, data.customer_name, data.customer_email, data.customer_phone, data.items]);

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('Sales Proposal'), url: route('sales-proposals.index') },
                { label: t('Create') }
            ]}
            pageTitle={t('Create Proposal')}
        >
            <Head title={t('Create Proposal')} />

            <div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <CalendarDays className="h-5 w-5" />
                                {t('Proposal Details')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* Row 1: Proposal Number & Subject */}
                            <div className="flex flex-col md:flex-row gap-4 border-b pb-4 items-start">
                                <div className="w-full md:w-64 shrink-0">
                                    <Label htmlFor="proposal_number">{t('Proposal Number')}</Label>
                                    <Input
                                        id="proposal_number"
                                        value={`${proposalSetting?.proposal_prefix || 'PROP-'}${proposalSetting?.proposal_starting_number || '1001'}-${data.invoice_date || new Date().toISOString().split('T')[0]}`}
                                        readOnly
                                        className="bg-muted cursor-not-allowed font-mono text-xs"
                                    />
                                </div>

                                <div className="w-full flex-1">
                                    <Label htmlFor="subject" required className="mb-1.5">
                                        {t('Subject')}
                                    </Label>

                                    <Select
                                        value={data.subject}
                                        onValueChange={(value) => setData('subject', value)}
                                    >
                                        <SelectTrigger id="subject" className="w-full">
                                            <SelectValue placeholder={t('Select Proposal Subject')} />
                                        </SelectTrigger>
                                        <SelectContent searchable>
                                            {subjects.map((subj) => (
                                                <SelectItem key={subj.id} value={subj.name}>
                                                    {subj.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.subject} />
                                </div>
                            </div>

                            {/* Row 2: Customer, Proposal Date, Due Date, Warehouse */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <Label htmlFor="customer_id" required className="mb-0">
                                            {t('Customer')}
                                        </Label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextMode = data.customer_mode === 'new' ? 'existing' : 'new';
                                                setData('customer_mode', nextMode);
                                            }}
                                            className="text-[11px] font-semibold text-primary flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                            {data.customer_mode === 'new' ? (
                                                <>
                                                    <Users className="h-3 w-3" />
                                                    {t('Select Existing')}
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="h-3 w-3" />
                                                    {t('New Customer')}
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {data.customer_mode === 'existing' ? (
                                        <>
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
                                                        {selectedCustomer.customer_phone && (
                                                            <div className="truncate">{selectedCustomer.customer_phone}</div>
                                                        )}
                                                        {selectedCustomer.billing_address?.address && (
                                                            <div className="text-slate-600 dark:text-slate-300 truncate" title={selectedCustomer.billing_address.address}>
                                                                {selectedCustomer.billing_address.address}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="h-10 px-3 py-1 rounded-md border border-dashed border-primary/50 bg-primary/5 text-primary text-xs font-medium flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                <UserPlus className="h-3.5 w-3.5" />
                                                {data.customer_name || t('New Customer Mode')}
                                            </span>
                                            <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                                {t('New')}
                                            </Badge>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="invoice_date" required>
                                        {t('Proposal Date')}
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
                                    <Label htmlFor="warehouse_id" required>
                                        {t('Warehouse')}
                                    </Label>
                                    <Select value={data.warehouse_id} onValueChange={handleWarehouseChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select Warehouse')} />
                                        </SelectTrigger>
                                        <SelectContent searchable>
                                            {warehouses?.map((warehouse) => (
                                                <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                                    {warehouse.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.warehouse_id} />
                                </div>
                            </div>

                            {/* New Customer Form Row when New Mode is Active */}
                            {data.customer_mode === 'new' && (
                                <div className="p-3 rounded-md border border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.04] space-y-2.5 animate-in fade-in-50 duration-200">
                                    <div className="flex items-center justify-between pb-1 border-b border-primary/10">
                                        <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                            <UserPlus className="h-3.5 w-3.5" />
                                            {t('New Customer Details')}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                        {/* Name */}
                                        <div className="space-y-1">
                                            <Label htmlFor="customer_name" required className="text-xs">
                                                {t('Customer Name')}
                                            </Label>
                                            <Input
                                                id="customer_name"
                                                value={data.customer_name}
                                                onChange={(e) => setData('customer_name', e.target.value)}
                                                placeholder={t('Name')}
                                                className="h-8 text-xs"
                                                required
                                            />
                                            <InputError message={errors.customer_name} />
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-1">
                                            <Label htmlFor="customer_email" required className="text-xs">
                                                {t('Email')}
                                            </Label>
                                            <Input
                                                id="customer_email"
                                                type="email"
                                                value={data.customer_email}
                                                onChange={(e) => setData('customer_email', e.target.value)}
                                                placeholder="email@example.com"
                                                className="h-8 text-xs"
                                                required
                                            />
                                            <InputError message={errors.customer_email} />
                                        </div>

                                        {/* Phone */}
                                        <div className="space-y-1">
                                            <Label htmlFor="customer_phone" required className="text-xs">
                                                {t('Phone')}
                                            </Label>
                                            <Input
                                                id="customer_phone"
                                                value={data.customer_phone}
                                                onChange={(e) => setData('customer_phone', e.target.value)}
                                                placeholder={t('Phone')}
                                                className="h-8 text-xs"
                                                required
                                            />
                                            <InputError message={errors.customer_phone} />
                                        </div>

                                        {/* Address */}
                                        <div className="space-y-1">
                                            <Label htmlFor="customer_address" required className="text-xs">
                                                {t('Address')}
                                            </Label>
                                            <Input
                                                id="customer_address"
                                                value={data.customer_address}
                                                onChange={(e) => setData('customer_address', e.target.value)}
                                                placeholder={t('Address')}
                                                className="h-8 text-xs"
                                                required
                                            />
                                            <InputError message={errors.customer_address} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 1. One-Time Charge (OTC) Card */}
                    <Card id="otc-section" className="transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                <FileText className="h-5 w-5" />
                                {t('One-Time Charges (OTC)')}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="enable-tax-toggle" className="text-xs cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                                    {t('Enable VAT/Tax')}
                                </Label>
                                <Switch
                                    id="enable-tax-toggle"
                                    size="sm"
                                    checked={data.is_tax_enabled}
                                    onCheckedChange={(checked) => {
                                        setData('is_tax_enabled', checked);
                                        const updatedItems = data.items.map(item => {
                                            const qty = Number(item.quantity) || 0;
                                            const price = Number(item.unit_price) || 0;
                                            const disc = Number(item.discount_percentage) || 0;
                                            const lineTotal = qty * price;
                                            const discountAmount = (lineTotal * disc) / 100;
                                            const discountedTotal = lineTotal - discountAmount;

                                            if (!checked) {
                                                return {
                                                    ...item,
                                                    tax_percentage: 0,
                                                    tax_amount: 0,
                                                    total_amount: discountedTotal,
                                                    taxes: []
                                                };
                                            } else {
                                                const product = availableProducts.find(p => String(p.id) === String(item.product_id));
                                                const prodTaxes = product?.taxes || [];
                                                const totalTaxRate = prodTaxes.reduce((sum: number, tax: any) => sum + (Number(tax.rate) || 0), 0);
                                                const taxes = prodTaxes.map((tax: any) => ({
                                                    tax_name: tax.tax_name,
                                                    tax_rate: tax.rate
                                                }));
                                                const taxRate = totalTaxRate > 0 ? totalTaxRate : (Number(item.tax_percentage) || 0);
                                                const taxAmount = (discountedTotal * taxRate) / 100;

                                                return {
                                                    ...item,
                                                    tax_percentage: taxRate,
                                                    tax_amount: taxAmount,
                                                    total_amount: discountedTotal + taxAmount,
                                                    taxes: taxes.length > 0 ? taxes : (item.taxes || [])
                                                };
                                            }
                                        });
                                        setData('items', updatedItems);
                                    }}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ItemsTable
                                items={data.items.filter(i => i.section === 'otc' || i.section === 'general' || !i.section)}
                                products={availableProducts}
                                warehouseId={data.warehouse_id}
                                onChange={(updatedOtcItems: ProposalItem[]) => {
                                    const formattedOtc = updatedOtcItems.map(i => ({ ...i, section: 'otc' }));
                                    const mrcItems = data.items.filter(i => i.section === 'mrc');
                                    setData('items', [...formattedOtc, ...mrcItems]);
                                }}
                                invoiceType={data.type as 'product' | 'service'}
                                errors={errors}
                                onRefresh={refreshProducts}
                                isRefreshing={isRefreshingProducts}
                                isTaxEnabled={data.is_tax_enabled}
                                defaultSection="otc"
                                discountType={data.otc_discount_type}
                                discountValue={data.otc_discount_value}
                                onDiscountTypeChange={(val: 'percentage' | 'fixed') => setData('otc_discount_type', val)}
                                onDiscountValueChange={(val: number) => setData('otc_discount_value', val)}
                            />
                        </CardContent>
                    </Card>

                    {/* 2. Monthly Recurring Charge (MRC) Card */}
                    <Card id="mrc-section" className="transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                <FileText className="h-5 w-5" />
                                {t('Monthly Recurring Charges (MRC)')}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="prepaid-toggle" className="text-xs cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                                    {t('Prepaid')}
                                </Label>
                                <Switch
                                    id="prepaid-toggle"
                                    size="sm"
                                    checked={data.is_prepaid}
                                    onCheckedChange={(checked) => setData('is_prepaid', checked)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ItemsTable
                                items={data.items.filter(i => i.section === 'mrc')}
                                products={availableProducts}
                                warehouseId={data.warehouse_id}
                                onChange={(updatedMrcItems: ProposalItem[]) => {
                                    const formattedMrc = updatedMrcItems.map(i => ({ ...i, section: 'mrc' }));
                                    const otcItems = data.items.filter(i => i.section === 'otc' || i.section === 'general' || !i.section);
                                    setData('items', [...otcItems, ...formattedMrc]);
                                }}
                                invoiceType={data.type as 'product' | 'service'}
                                errors={errors}
                                onRefresh={refreshProducts}
                                isRefreshing={isRefreshingProducts}
                                isTaxEnabled={data.is_tax_enabled}
                                defaultSection="mrc"
                                discountType={data.mrc_discount_type}
                                discountValue={data.mrc_discount_value}
                                onDiscountTypeChange={(val: 'percentage' | 'fixed') => setData('mrc_discount_type', val)}
                                onDiscountValueChange={(val: number) => setData('mrc_discount_value', val)}
                            />
                        </CardContent>
                    </Card>

                    {/* Other Details Card */}
                    <Card id="other-details-section">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileText className="h-5 w-5" />
                                {t('Other Details')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <RichTextEditor
                                content={data.other_details || ''}
                                onChange={(val) => setData('other_details', val)}
                                placeholder={t('Enter other details...')}
                            />
                        </CardContent>
                    </Card>

                    {/* Page Order Section */}
                    <PageOrder
                        sections={sections as any}
                        setSections={setSections as any}
                        pages={pages}
                        proposalSetting={proposalSetting}
                    />

                    {/* Additional Notes Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t('Notes')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div>
                                <Textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder={t('Enter additional notes...')}
                                    rows={4}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Custom Fields */}
                    {Array.isArray(customFields) && customFields.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t('Custom Fields')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {customFields.map((field: any) => (
                                    <div key={field.id}>{field.component}</div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.history.back()}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsPreviewOpen(true)}
                            className="flex items-center gap-1.5"
                        >
                            <Eye className="h-4 w-4" />
                            {t('Preview')}
                        </Button>
                        <Button type="submit" disabled={processing || !isFormValid}>
                            {processing ? t('Creating...') : t('Create Proposal')}
                        </Button>
                    </div>
                </form>
            </div>

            <PreviewModal
                open={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                formData={data as any}
                sections={sections as any}
                customers={customers}
                warehouses={warehouses}
                availableProducts={availableProducts}
                proposalSetting={proposalSetting}
                totals={totals}
                other_details={data.other_details}
                showPrintButton={false}
            />
        </AuthenticatedLayout>
    );
}

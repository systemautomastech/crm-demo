import React, { useState, useEffect, useMemo } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { useFormFields } from '@/hooks/useFormFields';
import { ProposalItem, Proposal } from '@/pages/Proposal/types';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import ItemsTable from './components/ItemsTable';
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
import PageOrder from './components/PageOrder';

interface Page {
    id: number;
    title: string;
    content: string;
    page_type?: string;
    background_image?: string;
    sort_order: number;
}

interface EditProps {
    proposal: Proposal;
    customers: Array<{ id: number; name: string; email: string }>;
    warehouses: Array<{ id: number; name: string; address: string }>;
    products?: any[];
    pages?: Page[];
    proposalSetting?: any;
    subjects?: Array<{ id: number; name: string }>;
    [key: string]: any;
}

export default function Edit() {
    const { t } = useTranslation();
    const { proposal, customers, warehouses, products = [], pages = [], proposalSetting, subjects = [] } = usePage<EditProps>().props;
    const [availableProducts, setAvailableProducts] = useState<any[]>(Array.isArray(products) ? products : []);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const [subjectList, setSubjectList] = useState<Array<{ id: number; name: string }>>(() => {
        const initialList = [...subjects];
        if (proposal.subject && !initialList.some((s) => s.name === proposal.subject)) {
            initialList.unshift({ id: -1, name: proposal.subject });
        }
        return initialList;
    });

    useEffect(() => {
        if (subjects) {
            const nextList = [...subjects];
            if (proposal.subject && !nextList.some((s) => s.name === proposal.subject)) {
                nextList.unshift({ id: -1, name: proposal.subject });
            }
            setSubjectList(nextList);
        }
    }, [subjects, proposal.subject]);

    const [sections, setSections] = useState<Array<{ id: string; title: string; content: string; page_type?: string; background_image?: string; order: number; isExpanded: boolean; page_id?: number }>>(() => {
        const contentsRel = (proposal as any).contents;
        let parsed: any[] = [];
        if (Array.isArray(contentsRel) && contentsRel.length > 0) {
            parsed = contentsRel.map((c: any) => {
                let dec: any = null;
                const rawVal = c.content || c.proposal_content;
                if (rawVal) {
                    try {
                        dec = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
                    } catch (e) { }
                }

                if (dec && typeof dec === 'object' && !Array.isArray(dec)) {
                    return {
                        title: dec.title || c.title || '',
                        content: dec.content ?? '',
                        page_type: dec.page_type || c.page_type || 'general',
                        background_image: dec.background_image || c.background_image || '',
                        order: typeof c.order !== 'undefined' ? Number(c.order) : (typeof dec.order !== 'undefined' ? Number(dec.order) : 1),
                        page_id: dec.page_id || c.page_id,
                    };
                }

                return {
                    title: c.title || '',
                    content: typeof rawVal === 'string' && rawVal.trim().startsWith('{') ? '' : (rawVal || ''),
                    page_type: c.page_type || 'general',
                    background_image: c.background_image || '',
                    order: typeof c.order !== 'undefined' ? Number(c.order) : 1,
                    page_id: c.page_id,
                };
            });
        } else {
            const rawContent = (proposal as any).proposal_content || (proposal as any).others;
            if (typeof rawContent === 'string') {
                try {
                    parsed = JSON.parse(rawContent);
                } catch (e) {
                    parsed = [];
                }
            } else if (Array.isArray(rawContent)) {
                parsed = rawContent;
            }
        }

        if (parsed.length === 0 && pages && pages.length > 0) {
            parsed = pages
                .map((p: any, idx) => ({
                    page_id: p.id,
                    title: p.title,
                    content: p.content || '',
                    page_type: p.page_type || 'general',
                    background_image: p.background_image || '',
                    order: Number(p.sort_order) || idx + 1,
                }));
        }
        parsed.sort((a: any, b: any) => {
            const orderA = typeof a.order === 'number' ? a.order : (parseInt(a.order, 10) || 0);
            const orderB = typeof b.order === 'number' ? b.order : (parseInt(b.order, 10) || 0);
            return orderA - orderB;
        });

        return parsed.map((item: any, idx: number) => ({
            id: `sec-${idx}-${Date.now()}`,
            page_id: item.page_id,
            title: item.title || (item.page_type === 'otc' ? 'One-Time Charges (OTC)' : item.page_type === 'mrc' ? 'Monthly Recurring Charges (MRC)' : item.page_type === 'other-details' ? 'Other Details' : `Page ${idx + 1}`),
            content: item.content || '',
            page_type: item.page_type || 'general',
            background_image: item.background_image || '',
            order: typeof item.order === 'number' ? item.order : (parseInt(item.order, 10) || (idx + 1)),
            isExpanded: false,
        }));
    });

    useFlashMessages();
    const { data, setData, put, processing, errors, transform } = useForm({
        proposal_id: proposal.id ? proposal.id.toString() : '',
        reference: proposal.reference || '',
        subject: proposal.subject || '',
        invoice_date: proposal.proposal_date || new Date().toISOString().split('T')[0],
        due_date: proposal.due_date || '',
        customer_id: proposal.customer_id ? proposal.customer_id.toString() : '',
        customer_mode: !proposal.customer_id && (proposal.customer_name || proposal.customer_email) ? 'new' : 'existing',
        customer_name: proposal.customer_name || '',
        customer_email: proposal.customer_email || '',
        customer_phone: proposal.customer_phone || '',
        customer_type: (proposal.customer_type || 'Individual') as 'Individual' | 'Company',
        customer_address: proposal.customer_address || '',
        warehouse_id: proposal.warehouse_id ? proposal.warehouse_id.toString() : '',
        type: proposal.type || 'product',
        is_tax_enabled: proposal.is_tax_enabled !== undefined ? Boolean(proposal.is_tax_enabled) : true,
        is_prepaid: proposal.is_prepaid !== undefined ? Boolean(proposal.is_prepaid) : false,
        otc_discount_type: (proposal.otc_discount_type || 'percentage') as 'percentage' | 'fixed',
        otc_discount_value: proposal.otc_discount_value || 0,
        mrc_discount_type: (proposal.mrc_discount_type || 'percentage') as 'percentage' | 'fixed',
        mrc_discount_value: proposal.mrc_discount_value || 0,
        payment_terms: proposal.payment_terms || '',
        notes: proposal.notes || '',
        items: (proposal.items && proposal.items.length > 0) ? proposal.items.map(item => ({
            ...item,
            description: item.description || item.product_description || (item.product as any)?.description || '',
            product_description: item.product_description || item.description || (item.product as any)?.description || '',
            section: item.section || 'general',
            product_type: item.product_type || (item as any).item_type || (item.product as any)?.type || proposal.type || 'product',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            discount_type: item.discount_type || (item.section === 'mrc' ? proposal.mrc_discount_type : proposal.otc_discount_type) || 'percentage',
            discount_percentage: item.discount_percentage || 0,
            discount_amount: item.discount_amount || 0,
            tax_percentage: item.tax_percentage || 0,
            tax_amount: item.tax_amount || 0,
            total_amount: item.total_amount || 0,
        })) : [] as ProposalItem[],
        proposal_content: [],
        other_details: proposal.other_details || (sections.find(s => s.page_type === 'other-details')?.content !== '[OTHER_DETAILS_CONTENT]' ? (sections.find(s => s.page_type === 'other-details')?.content || '') : ''),
    });

    const [hasManuallyReordered, setHasManuallyReordered] = useState(false);
    useEffect(() => {
        const hasOtc = data.items.some(
            (i) => (i.section === 'otc' || i.section === 'general' || !i.section) && (Number(i.product_id) > 0 || (typeof i.product_description === 'string' && i.product_description.trim() !== '') || (typeof i.description === 'string' && i.description.trim() !== ''))
        );
        const hasMrc = data.items.some(
            (i) => i.section === 'mrc' && (Number(i.product_id) > 0 || (typeof i.product_description === 'string' && i.product_description.trim() !== '') || (typeof i.description === 'string' && i.description.trim() !== ''))
        );
        const hasOther = Boolean(data.other_details && data.other_details.trim() !== '' && data.other_details !== '<p></p>');

        setSections((prev) => {
            const currentHasOtc = prev.some((s) => s.page_type === 'otc');
            const currentHasMrc = prev.some((s) => s.page_type === 'mrc');
            const currentHasOther = prev.some((s) => s.page_type === 'other-details');

            if (hasOtc === currentHasOtc && hasMrc === currentHasMrc && hasOther === currentHasOther) {
                return prev;
            }

            const defaultOtc = pages?.find((p) => p.page_type === 'otc');
            const defaultMrc = pages?.find((p) => p.page_type === 'mrc');
            const defaultOther = pages?.find((p) => p.page_type === 'other-details');

            let nextSections = [...prev];
            if (!hasOtc && currentHasOtc) {
                nextSections = nextSections.filter((s) => s.page_type !== 'otc');
            }
            if (!hasMrc && currentHasMrc) {
                nextSections = nextSections.filter((s) => s.page_type !== 'mrc');
            }
            if (!hasOther && currentHasOther) {
                nextSections = nextSections.filter((s) => s.page_type !== 'other-details');
            }

            const getDefOrder = (sec: any) => {
                const def = pages?.find((dp) =>
                    (sec.page_id && dp.id === sec.page_id) ||
                    (sec.page_type && ['otc', 'mrc', 'other-details'].includes(sec.page_type) && dp.page_type === sec.page_type) ||
                    (dp.title && sec.title && dp.title.trim().toLowerCase() === sec.title.trim().toLowerCase())
                );
                return def?.sort_order !== undefined ? Number(def.sort_order) : 1000 + (Number(sec.order) || 0);
            };

            const insertSection = (newSec: any) => {
                if (!hasManuallyReordered) {
                    nextSections.push(newSec);
                } else {
                    const newDefOrder = getDefOrder(newSec);
                    let insertIndex = nextSections.findIndex((s) => getDefOrder(s) > newDefOrder);
                    if (insertIndex === -1) {
                        nextSections.push(newSec);
                    } else {
                        nextSections.splice(insertIndex, 0, newSec);
                    }
                }
            };
            if (hasOtc && !currentHasOtc) {
                insertSection({
                    id: `sec-otc-${defaultOtc?.id || 'dynamic'}`,
                    page_id: defaultOtc?.id,
                    title: defaultOtc?.title || 'One-Time Charges (OTC)',
                    content: '[OTC_CHARGES_TABLE]',
                    page_type: 'otc',
                    background_image: defaultOtc?.background_image || '',
                    order: defaultOtc?.sort_order !== undefined ? Number(defaultOtc.sort_order) : 100,
                    isExpanded: false,
                });
            }
            if (hasMrc && !currentHasMrc) {
                insertSection({
                    id: `sec-mrc-${defaultMrc?.id || 'dynamic'}`,
                    page_id: defaultMrc?.id,
                    title: defaultMrc?.title || 'Monthly Recurring Charges (MRC)',
                    content: '[MRC_CHARGES_TABLE]',
                    page_type: 'mrc',
                    background_image: defaultMrc?.background_image || '',
                    order: defaultMrc?.sort_order !== undefined ? Number(defaultMrc.sort_order) : 101,
                    isExpanded: false,
                });
            }
            if (hasOther && !currentHasOther) {
                insertSection({
                    id: `sec-other-details-${defaultOther?.id || 'dynamic'}`,
                    page_id: defaultOther?.id,
                    title: defaultOther?.title || 'Other Details',
                    content: '[OTHER_DETAILS_CONTENT]',
                    page_type: 'other-details',
                    background_image: defaultOther?.background_image || '',
                    order: defaultOther?.sort_order !== undefined ? Number(defaultOther.sort_order) : 102,
                    isExpanded: false,
                });
            }

            if (!hasManuallyReordered) {
                nextSections.sort((a, b) => getDefOrder(a) - getDefOrder(b));
            }

            return nextSections.map((s, idx) => ({ ...s, order: idx + 1 }));
        });
    }, [data.items, data.other_details, pages, hasManuallyReordered]);

    const selectedCustomer: any = customers?.find((c: any) => String(c.id) === String(data.customer_id));
    const customFields = useFormFields('getCustomFields', { ...data, module: 'General', sub_module: 'Proposal', id: proposal.id }, setData, errors, 'edit', t);
    const [isRefreshingProducts, setIsRefreshingProducts] = useState(false);

    const loadProducts = async (warehouseId: string, clear = false, minDelay = 0) => {
        const startTime = Date.now();
        setIsRefreshingProducts(true);
        if (clear) setAvailableProducts([]);

        try {
            const url = route('sales-proposals.warehouse.products') + (warehouseId ? `?warehouse_id=${warehouseId}` : '');
            const response = await fetch(url);
            const warehouseProducts = await response.json();
            setAvailableProducts(Array.isArray(warehouseProducts) ? warehouseProducts : []);
        } catch (error) {
            console.error('Failed to fetch warehouse products:', error);
            if (clear) setAvailableProducts([]);
        } finally {
            const delay = minDelay - (Date.now() - startTime);
            delay > 0 ? setTimeout(() => setIsRefreshingProducts(false), delay) : setIsRefreshingProducts(false);
        }
    };

    const refreshProducts = () => loadProducts(data.warehouse_id, false, 500);

    const handleWarehouseChange = (warehouseId: string) => {
        setData('warehouse_id', warehouseId);
        loadProducts(warehouseId, true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        transform((formData) => ({
            ...formData,
            items: formData.items.map((item) => ({
                ...item,
                product_type: item.product_type || 'product',
            })),
            proposal_content: sections.map((item, index) => {
                const rawVal = item.page_type === 'other-details' ? (data.other_details || item.content || '') : (item.content || '');
                return {
                    title: item.title,
                    content: rawVal,
                    page_type: item.page_type || 'content',
                    background_image: item.background_image || '',
                    order: index + 1,
                };
            }),
        }));

        put(route('sales-proposals.update', proposal.id));
    };

    const totals = useMemo(() => {
        const getItems = (section: string) => data.items.filter(i => section === 'otc'
            ? i.section === 'otc' || i.section === 'general' || !i.section
            : i.section === section);
        const getAmount = (items: ProposalItem[], field: 'discount_amount' | 'tax_amount') =>
            items.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
        const getSubtotal = (items: ProposalItem[]) =>
            items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0);
        const getDiscount = (items: ProposalItem[], subtotal: number, type: 'percentage' | 'fixed', value: number) => {
            const itemDiscount = getAmount(items, 'discount_amount');
            if (itemDiscount !== 0 || value <= 0) return itemDiscount;
            return type === 'percentage'
                ? (subtotal * Math.min(Math.max(value, 0), 100)) / 100
                : Math.min(Math.max(value, 0), subtotal);
        };

        const otcItems = getItems('otc');
        const mrcItems = getItems('mrc');
        const otcSubtotal = getSubtotal(otcItems);
        const mrcSubtotal = getSubtotal(mrcItems);
        const otcDiscount = getDiscount(otcItems, otcSubtotal, data.otc_discount_type, Number(data.otc_discount_value) || 0);
        const mrcDiscount = getDiscount(mrcItems, mrcSubtotal, data.mrc_discount_type, Number(data.mrc_discount_value) || 0);
        const otcTax = getAmount(otcItems, 'tax_amount');
        const mrcTax = getAmount(mrcItems, 'tax_amount');
        const subtotal = otcSubtotal + mrcSubtotal;
        const discountAmount = otcDiscount + mrcDiscount;
        const taxAmount = otcTax + mrcTax;
        const total = Math.max(0, subtotal - discountAmount + taxAmount);

        return {
            subtotal, discountAmount, taxAmount, total,
            otcSubtotal, otcDiscount, otcTax,
            otcTotal: Math.max(0, otcSubtotal - otcDiscount + otcTax),
            mrcSubtotal, mrcDiscount, mrcTax,
            mrcTotal: Math.max(0, mrcSubtotal - mrcDiscount + mrcTax),
        };
    }, [data.items, data.otc_discount_type, data.otc_discount_value, data.mrc_discount_type, data.mrc_discount_value]);

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('Sales Proposal'), url: route('sales-proposals.index') },
                { label: t('Edit') }
            ]}
            pageTitle={t('Edit Sales Proposal')}
        >
            <Head title={t('Edit Sales Proposal')} />

            <div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <CalendarDays className="h-5 w-5" />
                                {t('Proposal Details')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col md:flex-row gap-4 border-b pb-4 items-start">
                                <div className="w-full md:w-64 shrink-0">
                                    <Label htmlFor="proposal_number">{t('Proposal Number')}</Label>
                                    <Input
                                        id="proposal_number"
                                        value={proposal.proposal_number || `PROP-${proposal.id}`}
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
                                            {subjectList.map((subj) => (
                                                <SelectItem key={subj.id} value={subj.name}>
                                                    {subj.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.subject} />
                                </div>
                            </div>

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
                                            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                            {data.customer_mode === 'new' ? (
                                                <>
                                                    <Users className="h-3 w-3" />
                                                    {t('Select Existing')}
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="h-3 w-3" />
                                                    {t('+ New Customer')}
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
                                        <div className="h-9 px-3 py-1 rounded-md border border-dashed border-primary/50 bg-primary/5 text-primary text-xs font-medium flex items-center justify-between">
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

                            {data.customer_mode === 'new' && (
                                <div className="p-3 rounded-md border border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.04] space-y-2.5 animate-in fade-in-50 duration-200 mt-4">
                                    <div className="flex items-center justify-between pb-1 border-b border-primary/10">
                                        <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                            <UserPlus className="h-3.5 w-3.5" />
                                            {t('New Customer Details')}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
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

                    <Card id="otc-section" className="transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                <FileText className="h-5 w-5" />
                                {t('One-Time Charges (OTC)')}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="enable-tax-toggle-edit" className="text-xs cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                                    {t('Enable VAT/Tax')}
                                </Label>
                                <Switch
                                    id="enable-tax-toggle-edit"
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

                    <Card id="mrc-section" className="transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                <FileText className="h-5 w-5" />
                                {t('Monthly Recurring Charges (MRC)')}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="prepaid-toggle-edit" className="text-xs cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                                    {t('Prepaid')}
                                </Label>
                                <Switch
                                    id="prepaid-toggle-edit"
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
                                    const otcItems = data.items.filter(i => i.section !== 'mrc');
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

                    <PageOrder
                        sections={sections as any}
                        setSections={setSections as any}
                        pages={pages}
                        proposalSetting={proposalSetting}
                        onManualReorder={() => setHasManuallyReordered(true)}
                    />

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
                                    placeholder={t('Enter any additional notes or terms...')}
                                    rows={4}
                                />
                                <InputError message={errors.notes} />
                            </div>
                        </CardContent>
                    </Card>

                    {customFields && customFields.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t('Custom Fields')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {customFields.map((field) => (
                                        <div key={field.id} className="space-y-2">
                                            <Label htmlFor={field.id}>{(field as any).name || (field as any).label || 'Custom Field'}</Label>
                                            {field.component}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                            {data.items.length} {t('items added')}
                        </div>
                        <div className="flex gap-3">
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
                            <Button
                                type="submit"
                                disabled={processing || data.items.length === 0}
                            >
                                {processing ? t('Updating...') : t('Update Proposal')}
                            </Button>
                        </div>
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

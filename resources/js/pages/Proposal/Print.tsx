import React, { useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import PreviewModal from './components/Preview/PreviewModal';
import { ProposalPreviewSection } from './types';

/* ==========================================================================
   TYPES
========================================================================== */

interface Page {
    id: number;
    title: string;
    content: string;
    page_type?: string;
    background_image?: string;
    sort_order: number;
}

interface PrintProps {
    proposal: any;
    customers?: Array<{
        id: number;
        name: string;
        email: string;
        address?: string;
        mobile_no?: string;
        phone?: string;
    }>;
    warehouses?: Array<{
        id: number;
        name: string;
        address?: string;
    }>;
    pages?: Page[];
    proposalSetting?: any;
    [key: string]: any;
}

export default function Print() {
    const { t } = useTranslation();
    const {
        proposal, customers = [], warehouses = [], pages = [], proposalSetting,
    } = usePage<PrintProps>().props;

    const sections = useMemo<ProposalPreviewSection[]>(() => {
        let resultPages: any[] = [];

        /* 1. Proposal Contents Relation */
        if (Array.isArray(proposal?.contents) && proposal.contents.length > 0) {
            resultPages = proposal.contents.map((item: any, index: number) => {
                const rawContent = item.content || item.proposal_content || '';
                let parsed: any = null;

                if (rawContent) {
                    try {
                        parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
                    } catch {
                        parsed = null;
                    }
                }

                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return {
                        id: String(item.id || `content-${index}`),
                        title: parsed.title || item.title || '',
                        content: parsed.content ?? '',
                        page_type: parsed.page_type || item.page_type || 'general',
                        background_image: parsed.background_image || item.background_image || '',
                        order: parsed.order ?? item.order ?? index + 1,
                    };
                }

                return {
                    id: String(item.id || `content-${index}`),
                    title: item.title || '',
                    content: typeof rawContent === 'string' && rawContent.trim().startsWith('{') ? '' : (rawContent || ''),
                    page_type: item.page_type || 'general',
                    background_image: item.background_image || '',
                    order: item.order ?? index + 1,
                };
            });
        }

        /* 2. Old Proposal Content Format */
        if (resultPages.length === 0) {
            const rawContent = proposal?.proposal_content || proposal?.others;

            if (typeof rawContent === 'string') {
                try {
                    const parsed = JSON.parse(rawContent);
                    if (Array.isArray(parsed)) {
                        resultPages = parsed;
                    }
                } catch {
                    resultPages = [];
                }
            } else if (Array.isArray(rawContent)) {
                resultPages = rawContent;
            }
        }

        /* 3. Proposal Pages Fallback */
        if (resultPages.length === 0 && Array.isArray(pages) && pages.length > 0) {
            resultPages = pages.map((page, index) => ({
                id: String(page.id),
                title: page.title,
                content: page.content || '',
                page_type: page.page_type || 'general',
                background_image: page.background_image || '',
                order: Number(page.sort_order) || index + 1,
            }));
        }

        /* Sort Pages */
        resultPages.sort((a: any, b: any) => Number(a.order || 0) - Number(b.order || 0));

        /* Normalize Final Data */
        return resultPages.map((item: any, index: number): ProposalPreviewSection => {
            const pageType = item.page_type || 'general';
            return {
                id: String(item.id || `section-${index}`),
                title: item.title || getDefaultSectionTitle(pageType, index, t),
                content: item.content || '',
                page_type: pageType,
                background_image: item.background_image || '',
                order: Number(item.order) || index + 1,
            };
        });
    }, [proposal, pages, t]);

    /* ==========================================================================
       CUSTOMER
    ========================================================================== */

    const formattedCustomers = useMemo(() => {
        if (proposal?.customer) {
            const customer = proposal.customer;

            return [
                {
                    id: customer.id,
                    name: customer.customer_name || proposal.customer_name || '',
                    email: customer.customer_email || proposal.customer_email || '',
                    mobile_no: customer.customer_phone || proposal.customer_phone || '',
                    phone: customer.customer_phone || proposal.customer_phone || '',
                    address: customer.billing_address?.address || proposal.customer_address || '',
                },
            ];
        }

        return customers;
    }, [proposal, customers]);

    /* ==========================================================================
       TOTALS
    ========================================================================== */

    const totals = useMemo(() => {
        const items = proposal?.items || [];

        const otcItems = items.filter((item: any) => item.section === 'otc' || item.section === 'general' || !item.section);
        const mrcItems = items.filter((item: any) => item.section === 'mrc');

        const calculateSubtotal = (list: any[]) => {
            return list.reduce((total: number, item: any) => {
                const quantity = Number(item.quantity || 1);
                const price = Number(item.unit_price || 0);
                return total + quantity * price;
            }, 0);
        };

        const otcSubtotal = calculateSubtotal(otcItems);
        const mrcSubtotal = calculateSubtotal(mrcItems);

        const calculateDiscount = (subtotal: number, type: string, value: any) => {
            const discountValue = Math.max(Number(value) || 0, 0);
            if (type === 'percentage') {
                return (subtotal * Math.min(discountValue, 100)) / 100;
            }
            return Math.min(discountValue, subtotal);
        };

        const otcDiscount = calculateDiscount(otcSubtotal, proposal?.otc_discount_type, proposal?.otc_discount_value);
        const mrcDiscount = calculateDiscount(mrcSubtotal, proposal?.mrc_discount_type, proposal?.mrc_discount_value);

        const calculateTax = (list: any[]) => {
            return list.reduce((total: number, item: any) => total + Number(item.tax_amount || 0), 0);
        };

        const otcTax = calculateTax(otcItems);
        const mrcTax = calculateTax(mrcItems);

        const calculatedSubtotal = otcSubtotal + mrcSubtotal;
        const calculatedDiscount = otcDiscount + mrcDiscount;
        const calculatedTax = otcTax + mrcTax;

        const subtotal = Number(proposal?.subtotal) || calculatedSubtotal;
        const discountAmount = Number(proposal?.discount_amount) || calculatedDiscount;
        const taxAmount = Number(proposal?.tax_amount) || calculatedTax;
        const calculatedTotal = Math.max(0, subtotal - discountAmount + taxAmount);
        const total = Number(proposal?.total_amount) || calculatedTotal;

        return {
            subtotal,
            discount_amount: discountAmount,
            discountAmount,
            tax_amount: taxAmount,
            taxAmount,
            total_amount: total,
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
    }, [proposal]);

    /* ==========================================================================
       FORM DATA
    ========================================================================== */

    const formData = useMemo(() => {
        return {
            ...proposal,
            id: proposal?.id,
            proposal_id: proposal?.id,
            proposal_number: proposal?.proposal_number || '',
            subject: proposal?.subject || '',
            invoice_date: proposal?.proposal_date || proposal?.invoice_date || '',
            due_date: proposal?.due_date || '',
            customer_id: proposal?.customer_id ?? proposal?.customer?.id,
            warehouse_id: proposal?.warehouse_id,
            payment_terms: proposal?.payment_terms || '',
            notes: proposal?.notes || '',
            other_details: proposal?.other_details || '',
            otc_discount_type: proposal?.otc_discount_type,
            otc_discount_value: proposal?.otc_discount_value,
            mrc_discount_type: proposal?.mrc_discount_type,
            mrc_discount_value: proposal?.mrc_discount_value,

            items: (proposal?.items || []).map((item: any) => {
                const quantity = Number(item.quantity || 1);
                const unitPrice = Number(item.unit_price || 0);

                return {
                    id: item.id,
                    product_id: item.product_id,
                    product_name: item.product?.name || item.product_name || item.name || '',
                    name: item.name || item.product_name || item.product?.name || '',
                    description: item.description || item.product_description || item.product?.description || '',
                    product_description: item.product_description || item.description || item.product?.description || '',
                    quantity,
                    unit_price: unitPrice,
                    discount_amount: Number(item.discount_amount || 0),
                    tax_amount: Number(item.tax_amount || 0),
                    total_amount: item.total_amount !== undefined ? Number(item.total_amount) : quantity * unitPrice,
                    section: item.section || 'otc',
                    product: item.product,
                    unit: item.unit,
                    unit_name: item.unit_name,
                };
            }),
        };
    }, [proposal]);

    /* ==========================================================================
       RENDER
    ========================================================================== */

    return (
        <>
            <Head
                title={(() => {
                    const subject = proposal?.subject || '';
                    const customerName = proposal?.customer?.customer_name || proposal?.customer_name || formattedCustomers[0]?.name || '';
                    const parts = [subject, customerName].filter(Boolean);
                    if (parts.length > 0) return parts.join('_');
                    return proposal?.proposal_number || t('Sales Proposal');
                })()}
            />

            <PreviewModal
                inline
                autoPrint
                hideHeaderBar
                title={(() => {
                    const subject = proposal?.subject || '';
                    const customerName = proposal?.customer?.customer_name || proposal?.customer_name || formattedCustomers[0]?.name || '';
                    const parts = [subject, customerName].filter(Boolean);
                    if (parts.length > 0) return parts.join('_');
                    return proposal?.proposal_number || '';
                })()}
                formData={formData}
                sections={sections}
                customers={formattedCustomers}
                warehouses={warehouses}
                totals={totals}
                proposalSetting={proposalSetting}
                other_details={proposal?.other_details}
            />
        </>
    );
}

/* ==========================================================================
   HELPERS
========================================================================== */

function getDefaultSectionTitle(pageType: string, index: number, t: (key: string) => string): string {
    switch (pageType) {
        case 'otc':
            return t('One-Time Charges (OTC)');
        case 'mrc':
            return t('Monthly Recurring Charges (MRC)');
        case 'other-details':
            return t('Other Details');
        default:
            return `${t('Page')} ${index + 1}`;
    }
}
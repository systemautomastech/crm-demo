import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { ShoppingCart, CheckCircle, User, UserPlus, Users, UserCheck, Plus, Minus, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputError } from '@/components/ui/input-error';
import { PhoneInputComponent } from '@/components/ui/phone-input';
import { MultiSelectEnhanced } from '@/components/ui/multi-select-enhanced';
import { formatCurrency } from '@/utils/helpers';

interface Address {
    name: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
}

interface Customer {
    id: number;
    name?: string;
    customer_name?: string;
    email?: string;
    customer_email?: string;
    customer_phone?: string;
    phone?: string;
    address?: string;
    customer_address?: string;
    billing_address?: any;
    shipping_address?: any;
}

export interface SalesOrderItemData {
    id?: number;
    product_id: number;
    name: string;
    sku?: string;
    description?: string;
    product_type?: string;
    quantity: number;
    available_stock?: number | null;
    unit_price: number;
    discount_type?: string;
    discount_percentage?: number;
    discount_amount?: number;
    tax_percentage?: number;
    tax_amount?: number;
    total_amount?: number;
    taxes?: Array<{
        id?: number;
        tax_name?: string;
        tax_rate?: number;
    }>;
}

interface SalesProposal {
    id: number;
    proposal_number: string;
    subject?: string | null;
    customer_id?: number | null;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    customer_address?: string | null;
    customer?: Customer | null;
    total_amount: number;
    sales_order_id?: number | null;
    status: string;
    items?: Array<{
        id: number;
        product_id: number;
        description?: string;
        product_description?: string;
        product_type?: string;
        quantity: number;
        unit_price: number;
        discount_type?: string;
        discount_percentage?: number;
        discount_amount?: number;
        tax_percentage?: number;
        tax_amount?: number;
        total_amount?: number;
        product?: {
            id: number;
            name: string;
            sku?: string;
            description?: string;
            type?: string;
            warehouseStocks?: Array<{ id: number; warehouse_id?: number; quantity: number }>;
        };
        taxes?: Array<{
            id?: number;
            tax_name?: string;
            tax_rate?: number;
        }>;
    }>;
}

interface SalesOrderModalProps {
    proposal: SalesProposal;
    customers?: Customer[];
    users?: Array<{ id: number; name: string }>;
    userGroups?: Array<{ id: number; name: string }>;
    buttonClassName?: string;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function SalesOrderModal({
    proposal,
    customers = [],
    users = [],
    userGroups = [],
    buttonClassName,
    trigger,
    open: externalOpen,
    onOpenChange: externalOnOpenChange
}: SalesOrderModalProps) {
    const { t } = useTranslation();
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
    const setIsOpen = externalOnOpenChange || setInternalOpen;

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const existingCustomerId = proposal?.customer_id || proposal?.customer?.id;

    const availableCustomers = useMemo(() => {
        return (customers || []).map(c => ({
            id: c.id,
            name: c.customer_name || '',
            email: c.customer_email || ''
        }));
    }, [customers]);

    const initialCustName = proposal?.customer?.customer_name || proposal?.customer_name || '';
    const initialCustAddress = proposal?.customer?.billing_address?.address || proposal?.customer_address || '';

    const initialValidCustomerId = (customers || []).some(c => String(c.id) === String(existingCustomerId)) ? String(existingCustomerId) : '';

    const mapProposalItems = (items?: SalesProposal['items']): SalesOrderItemData[] => {
        if (!items || !items.length) return [];
        return items.map((item) => {
            const pType = item.product_type || item.product?.type || 'product';
            const isService = pType === 'service';

            const stocks = item.product?.warehouseStocks || [];
            const totalStock = stocks.length > 0
                ? stocks.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
                : 0;

            return {
                id: item.id,
                product_id: item.product_id,
                name: item.product?.name || item.description || item.product_description || `${t('Product')} #${item.product_id}`,
                sku: item.product?.sku,
                description: item.description || item.product_description,
                product_type: pType,
                available_stock: isService ? null : totalStock,
                quantity: item.quantity ?? 1,
                unit_price: item.unit_price ?? 0,
                discount_type: item.discount_type || 'percentage',
                discount_percentage: item.discount_percentage ?? 0,
                discount_amount: item.discount_amount ?? 0,
                tax_percentage: item.tax_percentage ?? 0,
                tax_amount: item.tax_amount ?? 0,
                total_amount: item.total_amount ?? 0,
                taxes: item.taxes || [],
            };
        });
    };

    const [formData, setFormData] = useState({
        order_name: proposal?.proposal_number ? `${t('Order for')} ${proposal.proposal_number}` : '',
        customer_check: initialValidCustomerId ? 'exist' : (proposal?.customer_name ? 'new' : 'exist'),
        customer_id: initialValidCustomerId,
        customer_name: initialCustName,
        customer_email: proposal?.customer?.customer_email || proposal?.customer_email || '',
        customer_phone: proposal?.customer?.customer_phone || proposal?.customer_phone || '',
        tax_number: '',
        payment_terms: '',
        billing_address: {
            name: initialCustName,
            address_line_1: initialCustAddress,
            address_line_2: '',
            city: '',
            state: '',
            country: '',
            zip_code: '',
        } as Address,
        same_as_billing: true,
        shipping_address: {
            name: initialCustName,
            address_line_1: initialCustAddress,
            address_line_2: '',
            city: '',
            state: '',
            country: '',
            zip_code: '',
        } as Address,
        notes: '',
        assignment_check: 'none',
        assigned_user_id: '',
        assigned_user_ids: [] as string[],
        assigned_group_id: '',
        items: mapProposalItems(proposal?.items),
    });

    useEffect(() => {
        if (isOpen && proposal) {
            const extId = proposal.customer_id || proposal.customer?.id;
            const validCustomerId = (customers || []).some(c => String(c.id) === String(extId)) ? String(extId) : '';
            const custName = proposal.customer?.customer_name || proposal.customer_name || '';
            const custAddr = proposal.customer?.billing_address?.address || proposal.customer_address || '';

            setFormData({
                order_name: proposal.proposal_number ? `${t('Order for')} ${proposal.proposal_number}` : '',
                customer_check: validCustomerId ? 'exist' : (proposal.customer_name ? 'new' : 'exist'),
                customer_id: validCustomerId,
                customer_name: custName,
                customer_email: proposal.customer?.customer_email || proposal.customer_email || '',
                customer_phone: proposal.customer?.customer_phone || proposal.customer_phone || '',
                tax_number: '',
                payment_terms: '',
                billing_address: {
                    name: custName,
                    address_line_1: custAddr,
                    address_line_2: '',
                    city: '',
                    state: '',
                    country: '',
                    zip_code: '',
                },
                same_as_billing: true,
                shipping_address: {
                    name: custName,
                    address_line_1: custAddr,
                    address_line_2: '',
                    city: '',
                    state: '',
                    country: '',
                    zip_code: '',
                },
                notes: '',
                assignment_check: 'none',
                assigned_user_id: '',
                assigned_user_ids: [],
                assigned_group_id: '',
                items: mapProposalItems(proposal.items),
            });
            setErrors({});
        }
    }, [isOpen, proposal, t]);

    const handleQuantityChange = (index: number, newQty: number) => {
        const qty = Math.max(1, newQty);
        setFormData(prev => {
            const updatedItems = [...prev.items];
            const currentItem = updatedItems[index];
            if (!currentItem) return prev;
            updatedItems[index] = {
                ...currentItem,
                quantity: qty,
            };
            return {
                ...prev,
                items: updatedItems,
            };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        const payload: Record<string, any> = {
            order_name: formData.order_name,
            customer_type: formData.customer_check === 'exist' ? 'existing' : (formData.customer_check === 'new' ? 'new' : 'existing'),
        };

        if (formData.customer_check === 'exist') {
            payload.customer_id = formData.customer_id;
        } else if (formData.customer_check === 'new') {
            payload.customer_name = formData.customer_name;
            payload.customer_email = formData.customer_email;
            payload.customer_phone = formData.customer_phone;
            payload.tax_number = formData.tax_number;
            payload.payment_terms = formData.payment_terms;

            // Billing fields
            payload.billing_name = formData.billing_address.name;
            payload.billing_address_line_1 = formData.billing_address.address_line_1;
            payload.billing_address_line_2 = formData.billing_address.address_line_2;
            payload.billing_city = formData.billing_address.city;
            payload.billing_state = formData.billing_address.state;
            payload.billing_country = formData.billing_address.country;
            payload.billing_zip_code = formData.billing_address.zip_code;

            // Shipping fields
            payload.same_as_billing = formData.same_as_billing;
            if (formData.same_as_billing) {
                payload.shipping_name = formData.billing_address.name;
                payload.shipping_address_line_1 = formData.billing_address.address_line_1;
                payload.shipping_address_line_2 = formData.billing_address.address_line_2;
                payload.shipping_city = formData.billing_address.city;
                payload.shipping_state = formData.billing_address.state;
                payload.shipping_country = formData.billing_address.country;
                payload.shipping_zip_code = formData.billing_address.zip_code;
            } else {
                payload.shipping_name = formData.shipping_address.name;
                payload.shipping_address_line_1 = formData.shipping_address.address_line_1;
                payload.shipping_address_line_2 = formData.shipping_address.address_line_2;
                payload.shipping_city = formData.shipping_address.city;
                payload.shipping_state = formData.shipping_address.state;
                payload.shipping_country = formData.shipping_address.country;
                payload.shipping_zip_code = formData.shipping_address.zip_code;
            }

            payload.notes = formData.notes;
        }

        if (formData.assignment_check === 'user') {
            if (formData.assigned_user_ids && formData.assigned_user_ids.length > 0) {
                payload.assigned_user_ids = formData.assigned_user_ids;
            } else if (formData.assigned_user_id) {
                payload.assigned_user_id = formData.assigned_user_id;
            }
        } else if (formData.assignment_check === 'group' && formData.assigned_group_id) {
            payload.assigned_group_id = formData.assigned_group_id;
        }

        if (formData.items && formData.items.length > 0) {
            payload.items = formData.items.map(item => ({
                product_id: item.product_id,
                product_type: item.product_type || 'product',
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_type: item.discount_type || 'percentage',
                discount_percentage: item.discount_percentage || 0,
                discount_amount: item.discount_amount || 0,
                tax_percentage: item.tax_percentage || 0,
                tax_amount: item.tax_amount || 0,
                total_amount: item.total_amount || 0,
                description: item.description,
                taxes: item.taxes || [],
            }));
        }

        router.post(route('sales-proposals.convert-to-sales-order', proposal.id), payload, {
            onSuccess: () => {
                setIsOpen(false);
                setErrors({});
                setProcessing(false);
            },
            onError: (errs) => {
                setErrors(errs);
                setProcessing(false);
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger && (
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
            )}

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto transition-[height,max-height] duration-300 ease-in-out">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                        {t('Convert Proposal to Sales Order')}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Order Name */}
                    <div>
                        <Label htmlFor="order_name">{t('Sales Order Name')}</Label>
                        <Input
                            id="order_name"
                            value={formData.order_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, order_name: e.target.value }))}
                            placeholder={t('Enter order name')}
                        />
                        <InputError message={errors.order_name} />
                    </div>

                    {/* Products / Items List Section */}
                    {formData.items && formData.items.length > 0 && (
                        <div className="rounded-lg border border-border bg-card overflow-hidden">
                            <div className="flex items-center justify-between px-3.5 py-2 bg-muted/40 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-primary" />
                                    <span className="font-medium text-xs text-foreground">
                                        {t('Product/Items')}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {formData.items.length} {formData.items.length === 1 ? t('item') : t('items')}
                                </span>
                            </div>

                            <div className="divide-y divide-border max-h-56 overflow-y-auto">
                                {formData.items.map((item, idx) => (
                                    <div
                                        key={item.id ?? idx}
                                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-foreground truncate">
                                                {item.name}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                                                {item.sku && (
                                                    <>
                                                        <span className="font-mono text-[11px] text-muted-foreground">
                                                            {item.sku}
                                                        </span>
                                                        <span>•</span>
                                                    </>
                                                )}
                                                <span>{formatCurrency(item.unit_price)}</span>

                                                {item.available_stock !== null && item.available_stock !== undefined ? (
                                                    <>
                                                        <span>•</span>
                                                        <span
                                                            className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                                                                item.available_stock <= 0
                                                                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                                                                    : item.available_stock < item.quantity
                                                                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                                                                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                            }`}
                                                        >
                                                            {t('Stock')}: {item.available_stock}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                                                            {t('Service')}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            {/* Quantity Controller */}
                                            <div className="inline-flex items-center h-8 rounded-md border border-input bg-background shadow-xs">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                                    onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </button>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value, 10);
                                                        handleQuantityChange(idx, isNaN(val) ? 1 : val);
                                                    }}
                                                    className="w-10 h-7 border-0 bg-transparent text-center text-xs font-semibold text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                                    onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </button>
                                            </div>

                                            {/* Price Total */}
                                            <div className="w-24 text-right">
                                                <span className="text-xs font-semibold text-foreground">
                                                    {formatCurrency(item.quantity * item.unit_price)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Customer Selection Section */}
                    <div className="space-y-1.5 pt-1">
                        <Label>{t('Customer Options')}</Label>
                        <div className="relative flex p-1 bg-muted/60 rounded-lg border border-border/50 w-full overflow-hidden">
                            {/* Sliding active pill background */}
                            <div
                                className="absolute top-1 bottom-1 rounded-md bg-background shadow-xs transition-transform duration-200 ease-out pointer-events-none"
                                style={{
                                    width: 'calc((100% - 8px) / 2)',
                                    transform: formData.customer_check === 'exist' ? 'translateX(0%)' : 'translateX(100%)',
                                }}
                            />
                            <button
                                type="button"
                                className={`relative z-10 flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-1.5 ${
                                    formData.customer_check === 'exist'
                                        ? 'text-foreground font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                onClick={() => setFormData(prev => ({ ...prev, customer_check: 'exist' }))}
                            >
                                <User className="w-3.5 h-3.5" />
                                {t('Existing Customer')}
                            </button>
                            <button
                                type="button"
                                className={`relative z-10 flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-1.5 ${
                                    formData.customer_check === 'new'
                                        ? 'text-foreground font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                onClick={() => setFormData(prev => ({ ...prev, customer_check: 'new' }))}
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                {t('New Customer')}
                            </button>
                        </div>
                    </div>

                    <div
                        key={formData.customer_check}
                        className="transition-all duration-300 ease-out animate-in fade-in-0 slide-in-from-top-2 fill-mode-both"
                    >
                        {formData.customer_check === 'exist' ? (
                            <div className="space-y-2">
                                <Label htmlFor="customer_id">{t('Select Customer')}</Label>
                                <Select
                                    value={formData.customer_id}
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, customer_id: val }))}
                                >
                                    <SelectTrigger id="customer_id">
                                        <SelectValue placeholder={t('Select Customer')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {availableCustomers?.map((client) => (
                                            <SelectItem key={client.id} value={String(client.id)}>
                                                {client.name} {client.email ? `(${client.email})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.customer_id} />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="customer_name" required>{t('Customer / Company Name')}</Label>
                                    <Input
                                        id="customer_name"
                                        value={formData.customer_name}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFormData(prev => ({
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
                                        placeholder={t('Enter Name')}
                                        required
                                    />
                                    <InputError message={errors.customer_name} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="customer_email" required>{t('Email Address')}</Label>
                                        <Input
                                            id="customer_email"
                                            type="email"
                                            value={formData.customer_email}
                                            onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                                            placeholder={t('Enter Email')}
                                            required
                                        />
                                        <InputError message={errors.customer_email} />
                                    </div>

                                    <div>
                                        <PhoneInputComponent
                                            label={t('Phone Number')}
                                            value={formData.customer_phone}
                                            onChange={(value) => setFormData(prev => ({ ...prev, customer_phone: value }))}
                                            placeholder="+1234567890"
                                            error={errors.customer_phone}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="customer_tax_number">{t('Tax Number')}</Label>
                                        <Input
                                            id="customer_tax_number"
                                            value={formData.tax_number}
                                            onChange={(e) => setFormData(prev => ({ ...prev, tax_number: e.target.value }))}
                                            placeholder={t('Enter tax number')}
                                        />
                                        <InputError message={errors.tax_number} />
                                    </div>

                                    <div>
                                        <Label htmlFor="customer_payment_terms">{t('Payment Terms')}</Label>
                                        <Input
                                            id="customer_payment_terms"
                                            value={formData.payment_terms}
                                            onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                                            placeholder={t('e.g., Net 30, Due on Receipt')}
                                        />
                                        <InputError message={errors.payment_terms} />
                                    </div>
                                </div>

                                {/* Billing Address Section */}
                                <div className="space-y-4 border-t pt-4">
                                    <h3 className="font-medium text-sm text-foreground">
                                        {t('Billing Address')}
                                    </h3>

                                    <div>
                                        <Label htmlFor="billing_name">{t('Billing Name')}</Label>
                                        <Input
                                            id="billing_name"
                                            value={formData.billing_address.name}
                                            onChange={(e) => {
                                                const name = e.target.value;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    billing_address: { ...prev.billing_address, name },
                                                    shipping_address: prev.same_as_billing ? { ...prev.shipping_address, name } : prev.shipping_address
                                                }));
                                            }}
                                            placeholder={t('Enter billing name')}
                                        />
                                        <InputError message={errors['billing_name'] || errors['billing_address.name']} />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="billing_address_1">{t('Address Line 1')}</Label>
                                            <Input
                                                id="billing_address_1"
                                                value={formData.billing_address.address_line_1}
                                                onChange={(e) => {
                                                    const address_line_1 = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        billing_address: { ...prev.billing_address, address_line_1 },
                                                        shipping_address: prev.same_as_billing ? { ...prev.shipping_address, address_line_1 } : prev.shipping_address
                                                    }));
                                                }}
                                                placeholder={t('Enter street address')}
                                            />
                                            <InputError message={errors['billing_address_line_1'] || errors['billing_address.address_line_1']} />
                                        </div>

                                        <div>
                                            <Label htmlFor="billing_address_2">{t('Address Line 2')}</Label>
                                            <Input
                                                id="billing_address_2"
                                                value={formData.billing_address.address_line_2}
                                                onChange={(e) => {
                                                    const address_line_2 = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        billing_address: { ...prev.billing_address, address_line_2 },
                                                        shipping_address: prev.same_as_billing ? { ...prev.shipping_address, address_line_2 } : prev.shipping_address
                                                    }));
                                                }}
                                                placeholder={t('Apartment, suite, unit, etc. (optional)')}
                                            />
                                            <InputError message={errors['billing_address_line_2'] || errors['billing_address.address_line_2']} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="billing_city" required>{t('City')}</Label>
                                            <Input
                                                id="billing_city"
                                                value={formData.billing_address.city}
                                                onChange={(e) => {
                                                    const city = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        billing_address: { ...prev.billing_address, city },
                                                        shipping_address: prev.same_as_billing ? { ...prev.shipping_address, city } : prev.shipping_address
                                                    }));
                                                }}
                                                placeholder={t('Enter city')}
                                                required={formData.customer_check === 'new'}
                                            />
                                            <InputError message={errors['billing_city'] || errors['billing_address.city']} />
                                        </div>

                                        <div>
                                            <Label htmlFor="billing_state" required>{t('State / Province')}</Label>
                                            <Input
                                                id="billing_state"
                                                value={formData.billing_address.state}
                                                onChange={(e) => {
                                                    const state = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        billing_address: { ...prev.billing_address, state },
                                                        shipping_address: prev.same_as_billing ? { ...prev.shipping_address, state } : prev.shipping_address
                                                    }));
                                                }}
                                                placeholder={t('Enter state / province')}
                                                required={formData.customer_check === 'new'}
                                            />
                                            <InputError message={errors['billing_state'] || errors['billing_address.state']} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="billing_country" required>{t('Country')}</Label>
                                            <Input
                                                id="billing_country"
                                                value={formData.billing_address.country}
                                                onChange={(e) => {
                                                    const country = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        billing_address: { ...prev.billing_address, country },
                                                        shipping_address: prev.same_as_billing ? { ...prev.shipping_address, country } : prev.shipping_address
                                                    }));
                                                }}
                                                placeholder={t('Enter country')}
                                                required={formData.customer_check === 'new'}
                                            />
                                            <InputError message={errors['billing_country'] || errors['billing_address.country']} />
                                        </div>

                                        <div>
                                            <Label htmlFor="billing_zip" required>{t('Zip / Postal Code')}</Label>
                                            <Input
                                                id="billing_zip"
                                                value={formData.billing_address.zip_code}
                                                onChange={(e) => {
                                                    const zip_code = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        billing_address: { ...prev.billing_address, zip_code },
                                                        shipping_address: prev.same_as_billing ? { ...prev.shipping_address, zip_code } : prev.shipping_address
                                                    }));
                                                }}
                                                placeholder={t('Enter zip / postal code')}
                                                required={formData.customer_check === 'new'}
                                            />
                                            <InputError message={errors['billing_zip_code'] || errors['billing_address.zip_code']} />
                                        </div>
                                    </div>
                                </div>

                                {/* Shipping Address Section */}
                                <div className="space-y-4 border-t pt-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="same_as_billing"
                                            checked={formData.same_as_billing}
                                            onCheckedChange={(checked) => {
                                                const isChecked = checked as boolean;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    same_as_billing: isChecked,
                                                    shipping_address: isChecked ? { ...prev.billing_address } : prev.shipping_address
                                                }));
                                            }}
                                        />
                                        <Label htmlFor="same_as_billing" className="text-sm font-medium">
                                            {t('Shipping address same as billing')}
                                        </Label>
                                    </div>
                                </div>

                                {!formData.same_as_billing && (
                                    <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-300 ease-out fill-mode-both">
                                        <h3 className="font-medium text-sm text-foreground">
                                            {t('Shipping Address')}
                                        </h3>

                                        <div>
                                            <Label htmlFor="shipping_name">{t('Shipping Name')}</Label>
                                            <Input
                                                id="shipping_name"
                                                value={formData.shipping_address.name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, shipping_address: { ...prev.shipping_address, name: e.target.value } }))}
                                                placeholder={t('Enter shipping name')}
                                            />
                                            <InputError message={errors['shipping_name'] || errors['shipping_address.name']} />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="shipping_address_1">{t('Address Line 1')}</Label>
                                                <Input
                                                    id="shipping_address_1"
                                                    value={formData.shipping_address.address_line_1}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, shipping_address: { ...prev.shipping_address, address_line_1: e.target.value } }))}
                                                    placeholder={t('Enter street address')}
                                                />
                                                <InputError message={errors['shipping_address_line_1'] || errors['shipping_address.address_line_1']} />
                                            </div>

                                            <div>
                                                <Label htmlFor="shipping_address_2">{t('Address Line 2')}</Label>
                                                <Input
                                                    id="shipping_address_2"
                                                    value={formData.shipping_address.address_line_2}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, shipping_address: { ...prev.shipping_address, address_line_2: e.target.value } }))}
                                                    placeholder={t('Apartment, suite, unit, etc. (optional)')}
                                                />
                                                <InputError message={errors['shipping_address_line_2'] || errors['shipping_address.address_line_2']} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="shipping_city" required>{t('City')}</Label>
                                                <Input
                                                    id="shipping_city"
                                                    value={formData.shipping_address.city}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, shipping_address: { ...prev.shipping_address, city: e.target.value } }))}
                                                    placeholder={t('Enter city')}
                                                    required={!formData.same_as_billing}
                                                />
                                                <InputError message={errors['shipping_city'] || errors['shipping_address.city']} />
                                            </div>

                                            <div>
                                                <Label htmlFor="shipping_state" required>{t('State / Province')}</Label>
                                                <Input
                                                    id="shipping_state"
                                                    value={formData.shipping_address.state}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, shipping_address: { ...prev.shipping_address, state: e.target.value } }))}
                                                    placeholder={t('Enter state / province')}
                                                    required={!formData.same_as_billing}
                                                />
                                                <InputError message={errors['shipping_state'] || errors['shipping_address.state']} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="shipping_country" required>{t('Country')}</Label>
                                                <Input
                                                    id="shipping_country"
                                                    value={formData.shipping_address.country}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, shipping_address: { ...prev.shipping_address, country: e.target.value } }))}
                                                    placeholder={t('Enter country')}
                                                    required={!formData.same_as_billing}
                                                />
                                                <InputError message={errors['shipping_country'] || errors['shipping_address.country']} />
                                            </div>

                                            <div>
                                                <Label htmlFor="shipping_zip" required>{t('Zip / Postal Code')}</Label>
                                                <Input
                                                    id="shipping_zip"
                                                    value={formData.shipping_address.zip_code}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, shipping_address: { ...prev.shipping_address, zip_code: e.target.value } }))}
                                                    placeholder={t('Enter zip / postal code')}
                                                    required={!formData.same_as_billing}
                                                />
                                                <InputError message={errors['shipping_zip_code'] || errors['shipping_address.zip_code']} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                <div className="border-t pt-4">
                                    <Label htmlFor="customer_notes">{t('Notes')}</Label>
                                    <Textarea
                                        id="customer_notes"
                                        value={formData.notes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder={t('Enter any notes or special instructions...')}
                                        rows={3}
                                    />
                                    <InputError message={errors.notes} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Assignment Options Section */}
                    <div className="space-y-1.5 pt-2 border-t">
                        <Label>{t('Order Assignment')}</Label>
                        <div className="relative flex p-1 bg-muted/60 rounded-lg border border-border/50 w-full overflow-hidden">
                            {/* Sliding active pill background for 3 tabs */}
                            <div
                                className="absolute top-1 bottom-1 rounded-md bg-background shadow-xs transition-transform duration-200 ease-out pointer-events-none"
                                style={{
                                    width: 'calc((100% - 8px) / 3)',
                                    transform:
                                        formData.assignment_check === 'none'
                                            ? 'translateX(0%)'
                                            : formData.assignment_check === 'group'
                                            ? 'translateX(100%)'
                                            : 'translateX(200%)',
                                }}
                            />
                            <button
                                type="button"
                                className={`relative z-10 flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-1.5 ${
                                    formData.assignment_check === 'none'
                                        ? 'text-foreground font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                onClick={() => setFormData(prev => ({ ...prev, assignment_check: 'none', assigned_group_id: '', assigned_user_ids: [], assigned_user_id: '' }))}
                            >
                                <UserCheck className="w-3.5 h-3.5" />
                                {t('Unassigned')}
                            </button>
                            <button
                                type="button"
                                className={`relative z-10 flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-1.5 ${
                                    formData.assignment_check === 'group'
                                        ? 'text-foreground font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                onClick={() => setFormData(prev => ({ ...prev, assignment_check: 'group', assigned_user_ids: [], assigned_user_id: '' }))}
                            >
                                <Users className="w-3.5 h-3.5" />
                                {t('User Group')}
                            </button>
                            <button
                                type="button"
                                className={`relative z-10 flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-1.5 ${
                                    formData.assignment_check === 'user'
                                        ? 'text-foreground font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                onClick={() => setFormData(prev => ({ ...prev, assignment_check: 'user', assigned_group_id: '' }))}
                            >
                                <User className="w-3.5 h-3.5" />
                                {t('User')}
                            </button>
                        </div>
                    </div>

                    <div
                        key={formData.assignment_check}
                        className="grid grid-cols-2 gap-4 transition-all duration-300 ease-out animate-in fade-in-0 slide-in-from-top-2 fill-mode-both"
                    >
                        {formData.assignment_check === 'group' && (
                            <div className="col-span-2">
                                <Label htmlFor="assigned_group_id">{t('User Group')}</Label>
                                <Select
                                    value={formData.assigned_group_id}
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, assigned_group_id: val }))}
                                >
                                    <SelectTrigger id="assigned_group_id">
                                        <SelectValue placeholder={t('Select User Group')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {userGroups?.map((group) => (
                                            <SelectItem key={group.id} value={String(group.id)}>
                                                {group.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {formData.assignment_check === 'user' && (
                            <div className="col-span-2 space-y-2">
                                <Label>{t('Assigned User(s)')}</Label>
                                <MultiSelectEnhanced
                                    options={users?.map((u) => ({ value: String(u.id), label: u.name })) || []}
                                    value={formData.assigned_user_ids}
                                    onValueChange={(selectedValues) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            assigned_user_ids: selectedValues,
                                            assigned_user_id: selectedValues[0] || '',
                                        }));
                                    }}
                                    placeholder={t('Select user(s)...')}
                                    searchable={true}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={processing}>
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" isLoading={processing}>
                            {processing ? t('Converting') : t('Convert')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, RefreshCw, AlertCircle, User, Mail, Phone, MapPin, Building2, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import axios from 'axios';

export interface ConvertModalItem {
    id?: number;
    product_id: number;
    product_name?: string;
    product_sku?: string;
    product_type: string;
    description?: string;
    quantity: number;
    unit_price: number;
    discount_type: 'percentage' | 'fixed';
    discount_percentage: number;
    discount_amount: number;
    tax_percentage: number;
    tax_amount: number;
    total_amount: number;
    taxes?: Array<{ id?: number; tax_name: string; tax_rate: number }>;
}

interface InvoiceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    proposal: any | null;
}

export default function InvoiceModal({ open, onOpenChange, proposal }: InvoiceModalProps) {
    const { t } = useTranslation();
    const [warehouseProducts, setWarehouseProducts] = useState<any[]>([]);
    const [fullProposal, setFullProposal] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [items, setItems] = useState<ConvertModalItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tableDiscountType, setTableDiscountType] = useState<'percentage' | 'fixed'>('percentage');

    useEffect(() => {
        if (open && proposal) {
            loadProposalDetails(proposal);
        } else {
            setItems([]);
            setFullProposal(null);
        }
    }, [open, proposal?.id]);

    const loadProposalDetails = async (proposalObj: any) => {
        setIsLoading(true);
        try {
            const url = route('sales-proposals.convert-details', proposalObj.id);
            const res = await axios.get(url);
            const fetchedProposal = res.data?.proposal || proposalObj;
            const fetchedProducts = Array.isArray(res.data?.products) ? res.data.products : [];

            setFullProposal(fetchedProposal);
            setWarehouseProducts(fetchedProducts);
            populateItems(fetchedProposal.items || []);
        } catch (err) {
            console.error('Failed to load convert details:', err);
            setFullProposal(proposalObj);
            populateItems(proposalObj.items || []);
        } finally {
            setIsLoading(false);
        }
    };

    const populateItems = (proposalItems: any[]) => {
        const loadedItems: ConvertModalItem[] = [];

        proposalItems.forEach((item: any) => {
            const pType = (item.product_type || item.product?.type || 'product').toLowerCase();
            const qty = Number(item.quantity) || 1;
            const price = Number(item.unit_price) || 0;
            const dType = (item.discount_type as 'percentage' | 'fixed') || 'percentage';
            const dPct = Number(item.discount_percentage) || 0;
            const dAmt = Number(item.discount_amount) || 0;
            const tPct = Number(item.tax_percentage) || 0;
            const tAmt = Number(item.tax_amount) || 0;
            const tot = Number(item.total_amount) || (qty * price - dAmt + tAmt);

            loadedItems.push({
                id: item.id,
                product_id: item.product_id,
                product_name: item.product?.name || '',
                product_sku: item.product?.sku || '',
                product_type: pType,
                description: item.description || '',
                quantity: qty,
                unit_price: price,
                discount_type: dType,
                discount_percentage: dPct,
                discount_amount: dAmt,
                tax_percentage: tPct,
                tax_amount: tAmt,
                total_amount: tot,
                taxes: item.taxes || [],
            });
        });

        setItems(loadedItems);
    };

    const recalculateLine = (item: ConvertModalItem): ConvertModalItem => {
        const qty = Math.max(1, Number(item.quantity) || 1);
        const price = Math.max(0, Number(item.unit_price) || 0);
        const lineTotal = qty * price;

        let dAmt = 0;
        let dPct = 0;
        if (item.discount_type === 'fixed') {
            dAmt = Math.min(lineTotal, Math.max(0, Number(item.discount_amount) || 0));
            dPct = lineTotal > 0 ? (dAmt / lineTotal) * 100 : 0;
        } else {
            dPct = Math.min(100, Math.max(0, Number(item.discount_percentage) || 0));
            dAmt = (lineTotal * dPct) / 100;
        }

        const afterDisc = Math.max(0, lineTotal - dAmt);
        const tPct = Math.max(0, Number(item.tax_percentage) || 0);
        const tAmt = (afterDisc * tPct) / 100;
        const total = afterDisc + tAmt;

        return {
            ...item,
            quantity: qty,
            unit_price: price,
            discount_amount: Math.round(dAmt * 100) / 100,
            discount_percentage: Number(dPct.toFixed(4)),
            tax_amount: Math.round(tAmt * 100) / 100,
            total_amount: Math.round(total * 100) / 100,
        };
    };

    const handleUpdateItem = (index: number, field: keyof ConvertModalItem, value: any) => {
        setItems(prev => {
            const next = [...prev];
            const target = { ...next[index], [field]: value };
            next[index] = recalculateLine(target);
            return next;
        });
    };

    const handleProductChange = (index: number, productIdStr: string) => {
        const pId = Number(productIdStr);
        const selectedProd = warehouseProducts.find(p => p.id === pId);

        setItems(prev => {
            const next = [...prev];
            const current = next[index];

            const taxRate = selectedProd?.taxes?.reduce((sum: number, t: any) => sum + Number(t.rate || 0), 0) || 0;
            const taxes = selectedProd?.taxes?.map((t: any) => ({
                id: t.id,
                tax_name: t.tax_name,
                tax_rate: Number(t.rate || 0)
            })) || [];

            const updated: ConvertModalItem = {
                ...current,
                product_id: pId,
                product_name: selectedProd?.name || '',
                product_sku: selectedProd?.sku || '',
                product_type: selectedProd?.type || 'product',
                unit_price: Number(selectedProd?.sale_price) || 0,
                tax_percentage: taxRate,
                taxes: taxes,
                description: selectedProd?.description || current.description || '',
            };

            next[index] = recalculateLine(updated);
            return next;
        });
    };

    const handleAddItem = () => {
        const firstProd = warehouseProducts[0];
        const newItem: ConvertModalItem = {
            product_id: firstProd?.id || 0,
            product_name: firstProd?.name || '',
            product_sku: firstProd?.sku || '',
            product_type: firstProd?.type || 'product',
            description: firstProd?.description || '',
            quantity: 1,
            unit_price: Number(firstProd?.sale_price) || 0,
            discount_type: tableDiscountType,
            discount_percentage: 0,
            discount_amount: 0,
            tax_percentage: firstProd?.taxes?.reduce((sum: number, t: any) => sum + Number(t.rate || 0), 0) || 0,
            tax_amount: 0,
            total_amount: Number(firstProd?.sale_price) || 0,
            taxes: firstProd?.taxes || []
        };
        setItems(prev => [...prev, recalculateLine(newItem)]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const getProductStock = (productId: number, itemType?: string): number | undefined => {
        const prod = warehouseProducts.find(p => Number(p.id) === Number(productId));
        const resolvedType = (itemType || prod?.type || 'product').toLowerCase();
        if (resolvedType === 'service') return undefined;
        if (!prod || prod.stock_quantity === undefined || prod.stock_quantity === null) return 0;
        return Number(prod.stock_quantity) || 0;
    };

    const { stockErrors, hasStockError, grandTotals } = useMemo(() => {
        const errs: Record<number, string> = {};
        let subtotal = 0;
        let discount = 0;
        let tax = 0;
        let total = 0;

        items.forEach((item, index) => {
            const lineTotal = item.quantity * item.unit_price;
            subtotal += lineTotal;
            discount += item.discount_amount;
            tax += item.tax_amount;
            total += item.total_amount;

            if (!item.product_id || item.product_id <= 0) {
                errs[index] = t('Select product');
                return;
            }

            const stock = getProductStock(item.product_id, item.product_type);
            if (stock !== undefined) {
                if (stock <= 0) {
                    errs[index] = t('Out of stock');
                } else if (item.quantity > stock) {
                    errs[index] = t('Max available: {{stock}}', { stock });
                }
            }
        });

        return {
            stockErrors: errs,
            hasStockError: Object.keys(errs).length > 0,
            grandTotals: { subtotal, discount, tax, total }
        };
    }, [items, warehouseProducts, t]);

    const handleConfirm = () => {
        const targetProposal = fullProposal || proposal;
        if (!targetProposal || items.length === 0 || hasStockError || isSubmitting) return;

        setIsSubmitting(true);
        router.post(
            route('sales-proposals.convert-to-invoice', targetProposal.id),
            {
                warehouse_id: targetProposal.warehouse_id,
                items: items.map(item => ({
                    product_id: item.product_id,
                    product_type: item.product_type || 'product',
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    discount_type: item.discount_type,
                    discount_percentage: item.discount_percentage,
                    discount_amount: item.discount_amount,
                    tax_percentage: item.tax_percentage,
                    tax_amount: item.tax_amount,
                    total_amount: item.total_amount,
                    taxes: item.taxes || []
                }))
            },
            {
                onFinish: () => {
                    setIsSubmitting(false);
                    onOpenChange(false);
                },
                onError: () => {
                    setIsSubmitting(false);
                }
            }
        );
    };

    const activeProposal = fullProposal || proposal;
    const availableProducts = warehouseProducts;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-full p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle className="text-base font-semibold">
                        {t('Convert Proposal to Sales Order')}
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    {/* Customer & Proposal Summary Card */}
                    <div className="bg-muted/40 border border-border rounded-md p-3.5 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {t('Customer Information')}
                                </div>
                                <div className="font-medium text-foreground flex items-center gap-1.5 text-sm">
                                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span>{activeProposal?.customer?.customer_name || activeProposal?.customer_name || '-'}</span>
                                </div>
                                {(activeProposal?.customer?.customer_email || activeProposal?.customer_email) && (
                                    <div className="text-muted-foreground flex items-center gap-1.5">
                                        <Mail className="h-3 w-3 shrink-0" />
                                        <span>{activeProposal?.customer?.customer_email || activeProposal?.customer_email}</span>
                                    </div>
                                )}
                                {(activeProposal?.customer?.customer_phone || activeProposal?.customer_phone) && (
                                    <div className="text-muted-foreground flex items-center gap-1.5">
                                        <Phone className="h-3 w-3 shrink-0" />
                                        <span>{activeProposal?.customer?.customer_phone || activeProposal?.customer_phone}</span>
                                    </div>
                                )}
                                {(activeProposal?.customer?.address || activeProposal?.customer_address) && (
                                    <div className="text-muted-foreground flex items-center gap-1.5">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        <span>{activeProposal?.customer?.address || activeProposal?.customer_address}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1 md:text-right md:border-l md:border-border md:pl-3">
                                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {t('Proposal Reference')}
                                </div>
                                <div className="font-medium text-foreground">
                                    #{activeProposal?.proposal_number}
                                </div>
                                {activeProposal?.warehouse?.name && (
                                    <div className="text-muted-foreground flex items-center md:justify-end gap-1.5">
                                        <Building2 className="h-3 w-3 shrink-0" />
                                        <span>{t('Warehouse')}: {activeProposal.warehouse.name}</span>
                                    </div>
                                )}
                                {activeProposal?.due_date && (
                                    <div className="text-muted-foreground">
                                        {t('Due Date')}: {new Date(activeProposal.due_date).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Items Table styled exactly like our app tables with horizontal scroll */}
                    <div className="border border-border rounded-md overflow-hidden">
                        {isLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                <span>{t('Loading proposal items and warehouse stock...')}</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <table className="w-full min-w-[720px] divide-y divide-border text-sm">
                                    <thead className="bg-muted/40">
                                        <tr>
                                            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground min-w-[220px]">
                                                {t('Product')} <span className="text-red-500">*</span>
                                            </th>
                                            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground min-w-[130px] w-[130px]">
                                                {t('Qty')} <span className="text-red-500">*</span>
                                            </th>
                                            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground min-w-[120px] w-[120px]">
                                                {t('Unit Price')} <span className="text-red-500">*</span>
                                            </th>
                                            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground min-w-[130px] w-[130px]">
                                                <div className="flex items-center gap-1">
                                                    <span>{t('Discount')}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const nextType = tableDiscountType === 'percentage' ? 'fixed' : 'percentage';
                                                            setTableDiscountType(nextType);
                                                            setItems(prev => prev.map(item => recalculateLine({ ...item, discount_type: nextType })));
                                                        }}
                                                        className="text-[10px] text-primary hover:underline font-normal"
                                                    >
                                                        ({tableDiscountType === 'percentage' ? '%' : '$'})
                                                    </button>
                                                </div>
                                            </th>
                                            <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground min-w-[110px] w-[110px]">
                                                {t('Total')}
                                            </th>
                                            <th className="px-2 py-2.5 text-center w-[48px]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-card">
                                    {items.map((item, index) => {
                                        const stock = getProductStock(item.product_id, item.product_type);
                                        const error = stockErrors[index];
                                        const isExceeding = stock !== undefined && (stock <= 0 || item.quantity > stock);

                                        return (
                                            <tr key={index} className="align-top">
                                                <td className="px-3 py-3">
                                                    <Select
                                                        value={item.product_id ? String(item.product_id) : ''}
                                                        onValueChange={(val) => handleProductChange(index, val)}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs w-full">
                                                            <SelectValue placeholder={t('Select Product')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableProducts.map(p => (
                                                                <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                                                                    {p.name} {p.sku ? `(${p.sku})` : ''}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {error && (
                                                        <p className="text-[11px] text-destructive mt-1 font-medium flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3 inline shrink-0" />
                                                            {error}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="px-3 py-3">
                                                    <div className="space-y-1">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            max={stock !== undefined ? stock : 999999}
                                                            value={item.quantity}
                                                            onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                                                            className={`h-8 text-xs ${isExceeding ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                                        />
                                                        {stock !== undefined ? (
                                                            <div className="text-[10px] text-muted-foreground">
                                                                {t('Stock')}: <span className={stock > 0 ? 'text-emerald-600 font-medium' : 'text-destructive font-medium'}>{stock}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-muted-foreground">
                                                                <span className="text-blue-600 font-medium">{t('Service Type')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-3 py-3">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        value={item.unit_price}
                                                        onChange={(e) => handleUpdateItem(index, 'unit_price', e.target.value)}
                                                        className="h-8 text-xs"
                                                    />
                                                </td>

                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={item.discount_type === 'percentage' ? '100' : undefined}
                                                            value={item.discount_type === 'percentage' ? item.discount_percentage : item.discount_amount}
                                                            onChange={(e) => {
                                                                const field = item.discount_type === 'percentage' ? 'discount_percentage' : 'discount_amount';
                                                                handleUpdateItem(index, field, e.target.value);
                                                            }}
                                                            className="h-8 text-xs"
                                                        />
                                                        <span className="text-xs text-muted-foreground shrink-0 w-3">
                                                            {item.discount_type === 'percentage' ? '%' : ''}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="px-3 py-3 text-right font-medium text-xs pt-4">
                                                    {formatCurrency(item.total_amount)}
                                                </td>

                                                <td className="px-2 py-3 text-center pt-3">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">
                                                {t('No product items in this proposal. Click "Add Item" to add products.')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </div>

                    {/* Bottom row: Add button and Totals summary */}
                    <div className="flex justify-between items-start pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddItem}
                            className="h-8 text-xs gap-1"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            {t('Add Item')}
                        </Button>

                        <div className="w-56 space-y-1.5 text-xs text-right">
                            <div className="flex justify-between text-muted-foreground">
                                <span>{t('Subtotal')}:</span>
                                <span className="font-medium text-foreground">{formatCurrency(grandTotals.subtotal)}</span>
                            </div>
                            {grandTotals.discount > 0 && (
                                <div className="flex justify-between text-destructive">
                                    <span>{t('Discount')}:</span>
                                    <span>-{formatCurrency(grandTotals.discount)}</span>
                                </div>
                            )}
                            {grandTotals.tax > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>{t('Tax')}:</span>
                                    <span className="font-medium text-foreground">{formatCurrency(grandTotals.tax)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-semibold text-sm pt-1 border-t text-foreground">
                                <span>{t('Total')}:</span>
                                <span>{formatCurrency(grandTotals.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-3 border-t bg-muted/20">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleConfirm}
                        isLoading={isSubmitting}
                        disabled={isSubmitting || items.length === 0 || hasStockError || isLoading}
                    >
                        {isSubmitting ? t('Converting') : t('Convert to Sales Order')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

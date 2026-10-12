import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertTriangle, CheckCircle2, Package, Warehouse as WarehouseIcon, Plus, Minus } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { SalesOrder, SalesOrderItem } from '../types';

interface ConvertToInvoiceFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    salesOrder: SalesOrder;
    orderItems: SalesOrderItem[];
    onConfirm: (items?: Array<{ id: number; quantity: number }>) => void;
    processing?: boolean;
}

export default function ConvertToInvoiceForm({
    open,
    onOpenChange,
    salesOrder,
    orderItems,
    onConfirm,
    processing = false,
}: ConvertToInvoiceFormProps) {
    const { t } = useTranslation();

    // Editable item quantities state
    const [itemsState, setItemsState] = useState<Array<SalesOrderItem & { isService: boolean; stock: number; currentQty: number; maxAllowedQty: number }>>([]);

    useEffect(() => {
        if (open && orderItems) {
            const mapped = orderItems.map((item) => {
                const isService = item.is_service ?? (item.product as any)?.type === 'service';
                const stock = Number(item.stock_quantity ?? 0);
                const orderQty = Math.max(1, Number(item.quantity) || 1);
                
                // If service: unlimited max; if physical product: can never exceed available stock!
                const maxAllowedQty = isService ? orderQty : Math.max(0, stock);
                
                // If orderQty > stock, initial currentQty can be orderQty (so user sees shortage) or adjusted.
                const currentQty = orderQty;

                return {
                    ...item,
                    isService,
                    stock,
                    currentQty,
                    maxAllowedQty,
                };
            });
            setItemsState(mapped);
        }
    }, [open, orderItems]);

    // Handle Quantity Change:
    // Can decrease down to 1
    // Can only increase up to available stock for physical products (service has no stock limit)
    const handleQtyChange = (index: number, newQty: number) => {
        setItemsState((prev) => {
            const next = [...prev];
            const item = next[index];
            if (!item) return prev;

            const minVal = 1;
            // Physical products cannot exceed available stock!
            const maxVal = item.isService ? 999999 : item.stock;

            let sanitized = Math.max(minVal, isNaN(newQty) ? minVal : newQty);
            if (!item.isService && sanitized > maxVal) {
                sanitized = maxVal > 0 ? maxVal : 1;
            }

            next[index] = {
                ...item,
                currentQty: sanitized,
            };
            return next;
        });
    };

    // Calculate whether any physical item has currentQty > available stock
    const hasOutOfStockItems = itemsState.some((item) => !item.isService && item.currentQty > item.stock);

    const handleFormSubmit = () => {
        const payloadItems = itemsState.map((it) => ({
            id: it.id,
            quantity: it.currentQty,
        }));
        onConfirm(payloadItems);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-semibold">
                                {t('Convert to Sales Invoice')}
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t('Review ordered items and current warehouse stock before generating the invoice')}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {/* Order summary pill */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border text-xs">
                        <div>
                            <span className="text-muted-foreground">{t('Order')}: </span>
                            <span className="font-semibold text-foreground">
                                {salesOrder.order_number ? `#${salesOrder.order_number}` : `#${salesOrder.id}`}
                            </span>
                        </div>
                        {salesOrder.warehouse?.name && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <WarehouseIcon className="w-3.5 h-3.5" />
                                <span>{salesOrder.warehouse.name}</span>
                            </div>
                        )}
                        <div>
                            <span className="text-muted-foreground">{t('Total Amount')}: </span>
                            <span className="font-bold text-foreground">
                                {formatCurrency(Number(salesOrder.total_amount || salesOrder.amount || 0))}
                            </span>
                        </div>
                    </div>

                    {/* Stock Warning Banner if any item is out of stock */}
                    {hasOutOfStockItems && (
                        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 flex items-start gap-2.5 text-rose-800 dark:text-rose-300">
                            <AlertTriangle className="w-4 h-4 mt-0.5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <div className="text-xs space-y-0.5">
                                <p className="font-semibold">
                                    {t('Insufficient Stock Detected')}
                                </p>
                                <p className="text-rose-700/90 dark:text-rose-400/90">
                                    {t('One or more products do not have enough stock in the warehouse. You cannot convert this order to an invoice until stock is replenished.')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Products / Items List (Styled after automas-crm with quantity stepper) */}
                    {itemsState && itemsState.length > 0 && (
                        <div className="rounded-lg border border-border bg-card overflow-hidden">
                            <div className="flex items-center justify-between px-3.5 py-2 bg-muted/40 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-primary" />
                                    <span className="font-medium text-xs text-foreground">
                                        {t('Product/Items')}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {itemsState.length} {itemsState.length === 1 ? t('item') : t('items')}
                                </span>
                            </div>

                            <div className="divide-y divide-border max-h-64 overflow-y-auto">
                                {itemsState.map((item, idx) => {
                                    const productName = item.product_name || item.product?.name || item.description || `${t('Product')} #${idx + 1}`;
                                    const unitPrice = Number(item.unit_price || item.price || 0);
                                    const lineTotal = item.currentQty * unitPrice;
                                    const canIncrease = item.isService || item.currentQty < item.stock;

                                    return (
                                        <div
                                            key={item.id ?? idx}
                                            className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-foreground truncate">
                                                    {productName}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                                                    {item.product?.sku && (
                                                        <>
                                                            <span className="font-mono text-[11px] text-muted-foreground">
                                                                {item.product.sku}
                                                            </span>
                                                            <span>•</span>
                                                        </>
                                                    )}
                                                    <span>{formatCurrency(unitPrice)}</span>

                                                    {!item.isService ? (
                                                        <>
                                                            <span>•</span>
                                                            <span
                                                                className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                                                                    item.stock <= 0
                                                                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                                                                        : item.currentQty > item.stock
                                                                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-semibold'
                                                                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                                }`}
                                                            >
                                                                {t('Available Stock')}: {item.stock} {item.unit || ''}
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
                                                {/* Quantity Stepper Controller (Stock limited) */}
                                                <div className="inline-flex items-center h-8 rounded-md border border-input bg-background shadow-xs">
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                                        onClick={() => handleQtyChange(idx, item.currentQty - 1)}
                                                        disabled={item.currentQty <= 1}
                                                        title={t('Decrease')}
                                                    >
                                                        <Minus className="h-3.5 w-3.5" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={item.isService ? undefined : item.stock}
                                                        value={item.currentQty}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10);
                                                            handleQtyChange(idx, isNaN(val) ? 1 : val);
                                                        }}
                                                        className="w-12 h-7 border-0 bg-transparent text-center text-xs font-semibold text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                                        onClick={() => handleQtyChange(idx, item.currentQty + 1)}
                                                        disabled={!canIncrease}
                                                        title={!canIncrease ? t('Cannot exceed available stock') : t('Increase')}
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>

                                                {/* Line Total */}
                                                <div className="w-24 text-right">
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {formatCurrency(lineTotal)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-3 border-t bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between sm:justify-between">
                    <p className="text-[11px] text-muted-foreground">
                        {hasOutOfStockItems
                            ? t('Please decrease quantity to match available stock before converting.')
                            : t('All items are in stock and ready to convert.')}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={processing}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                            onClick={handleFormSubmit}
                            disabled={processing || hasOutOfStockItems}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            {processing ? t('Converting...') : t('Convert to Invoice')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

import { useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Package, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { SalesOrder, SalesOrderItem } from './types';

interface DeliverProps {
    salesOrder: SalesOrder;
    items: Array<SalesOrderItem & {
        remaining_quantity: number;
        delivered_quantity: number;
    }>;
}

export default function Deliver({ salesOrder, items }: DeliverProps) {
    const { t } = useTranslation();
    useFlashMessages();

    const initialItems = items.map(item => ({
        sales_order_item_id: item.id!,
        quantity: item.remaining_quantity,
        notes: '',
        max: item.remaining_quantity,
        product_id: item.product_id,
        product_name: item.product_name || item.product?.name,
        product_sku: item.product?.sku,
        unit: item.unit,
        description: item.description,
        ordered: item.quantity,
        delivered: item.delivered_quantity,
    }));

    const [deliveryItems, setDeliveryItems] = useState(initialItems);

    const { data, setData, post, processing, errors, transform } = useForm({
        delivery_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: initialItems.map(i => ({
            sales_order_item_id: i.sales_order_item_id,
            quantity: i.quantity,
            notes: i.notes,
        })),
    });

    const updateItemQuantity = (index: number, qty: number) => {
        const clamped = Math.min(Math.max(0, qty), deliveryItems[index].max);
        const updated = [...deliveryItems];
        updated[index] = { ...updated[index], quantity: clamped };
        setDeliveryItems(updated);
        setData('items', updated.map(i => ({
            sales_order_item_id: i.sales_order_item_id,
            quantity: i.quantity,
            notes: i.notes,
        })));
    };

    const updateItemNotes = (index: number, notes: string) => {
        const updated = [...deliveryItems];
        updated[index] = { ...updated[index], notes };
        setDeliveryItems(updated);
        setData('items', updated.map(i => ({
            sales_order_item_id: i.sales_order_item_id,
            quantity: i.quantity,
            notes: i.notes,
        })));
    };

    const handleFillAllMax = () => {
        const updated = deliveryItems.map(i => ({ ...i, quantity: i.max }));
        setDeliveryItems(updated);
        setData('items', updated.map(i => ({
            sales_order_item_id: i.sales_order_item_id,
            quantity: i.quantity,
            notes: i.notes,
        })));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validItems = deliveryItems
            .filter(i => i.quantity > 0)
            .map(i => ({
                sales_order_item_id: i.sales_order_item_id,
                quantity: i.quantity,
                notes: i.notes,
            }));

        if (validItems.length === 0) return;

        transform((formData) => ({
            ...formData,
            items: validItems,
        }));
        post(route('salesorder.orders.deliveries.store', salesOrder.id));
    };

    const totalDelivering = deliveryItems.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <AuthenticatedLayout>
            <Head title={t('Create Delivery — :num', { num: salesOrder.order_number })} />

            <div className="max-w-full mx-auto space-y-6">
                {/* Header & Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                                <Truck className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                    {t('Create Delivery Challan')}
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span>{t('Sales Order')}: <strong className="text-slate-700 dark:text-slate-300 font-semibold">#{salesOrder.order_number}</strong></span>
                                    {salesOrder.customer && (
                                        <>
                                            <span>&bull;</span>
                                            <span>{t('Customer')}: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{salesOrder.customer.customer_name}</strong></span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.history.back()}
                            className="gap-1.5"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t('Back')}
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Delivery Details */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">{t('Delivery Information')}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="delivery_date" className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                    {t('Delivery Date')}
                                </Label>
                                <Input
                                    id="delivery_date"
                                    type="date"
                                    value={data.delivery_date}
                                    onChange={e => setData('delivery_date', e.target.value)}
                                    className="mt-1.5"
                                    required
                                />
                                {errors.delivery_date && <p className="text-xs text-red-500 mt-1">{errors.delivery_date}</p>}
                            </div>
                            <div>
                                <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                    {t('Delivery Notes')}
                                </Label>
                                <Input
                                    id="notes"
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    placeholder={t('Optional notes e.g. driver details, vehicle info...')}
                                    className="mt-1.5"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Items */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                <Package className="h-4 w-4 text-slate-500" />
                                <span>{t('Items to Deliver')}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal">
                                    {deliveryItems.length} {deliveryItems.length === 1 ? t('item') : t('items')}
                                </span>
                            </CardTitle>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleFillAllMax}
                                className="text-xs text-primary hover:text-primary/90 h-8 gap-1"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {t('Fill Max Quantities')}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-md border border-slate-100 dark:border-slate-800">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 text-xs font-semibold">
                                            <th className="px-4 py-3 text-left">{t('Product')}</th>
                                            <th className="px-3 py-3 text-center w-20">{t('Ordered')}</th>
                                            <th className="px-3 py-3 text-center w-24">{t('Delivered')}</th>
                                            <th className="px-3 py-3 text-center w-24">{t('Remaining')}</th>
                                            <th className="px-4 py-3 text-center w-36">{t('Deliver Now')}</th>
                                            <th className="px-4 py-3 text-left w-56">{t('Item Notes')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {deliveryItems.map((item, index) => {
                                            const productName = item.product_name || (item.product_id ? `${t('Product')} #${item.product_id}` : `Product #${index + 1}`);

                                            return (
                                                <tr key={item.sales_order_item_id} className="align-top hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                                    <td className="px-4 py-3.5 min-w-[240px]">
                                                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                            <span>{productName}</span>
                                                            {item.product_sku && (
                                                                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                                    {item.product_sku}
                                                                </span>
                                                            )}
                                                            {item.unit && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                                    {item.unit}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {item.description && (
                                                            <div
                                                                className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 space-y-1 [&_p]:my-0.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold [&_strong]:text-slate-700 dark:[&_strong]:text-slate-300"
                                                                dangerouslySetInnerHTML={{ __html: item.description }}
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3.5 text-center font-medium text-slate-700 dark:text-slate-300">
                                                        {item.ordered}
                                                    </td>
                                                    <td className="px-3 py-3.5 text-center">
                                                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                                                            {item.delivered}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3.5 text-center">
                                                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                                                            {item.max}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center">
                                                        <div className="flex items-center gap-1.5 justify-center">
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                max={item.max}
                                                                value={item.quantity}
                                                                onChange={e => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                                                                className="w-20 text-center font-semibold h-9"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => updateItemQuantity(index, item.max)}
                                                                className="h-9 px-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                                                                title={t('Set Max')}
                                                            >
                                                                {t('Max')}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <Input
                                                            value={item.notes}
                                                            onChange={e => updateItemNotes(index, e.target.value)}
                                                            placeholder={t('Item notes...')}
                                                            className="w-full h-9 text-xs"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary alert */}
                            {totalDelivering === 0 && (
                                <div className="mt-4 flex items-center gap-2 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <p className="text-sm font-medium">{t('Please enter at least one item quantity to deliver before submitting.')}</p>
                                </div>
                            )}

                            {errors.items && (
                                <p className="text-sm text-red-500 mt-2">{errors.items}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.history.back()}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing || totalDelivering === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2 px-6"
                        >
                            <Truck className="h-4 w-4" />
                            {processing ? t('Creating Delivery...') : t('Create Delivery Challan')}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}

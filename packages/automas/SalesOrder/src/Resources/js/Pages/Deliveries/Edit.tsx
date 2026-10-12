import { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Truck, ArrowLeft, Save, AlertCircle, PackageCheck } from "lucide-react";

interface DeliveryItemData {
    sales_order_item_id: number;
    product_name: string;
    product_sku?: string;
    unit?: string;
    ordered_quantity: number;
    previously_delivered: number;
    remaining_quantity: number;
    quantity: number;
    notes?: string;
}

interface DeliveryEditProps {
    delivery: {
        id: number;
        sales_order_id: number;
        delivery_number: string;
        delivery_date: string;
        notes?: string;
        status: string;
        sales_order?: any;
        items?: any[];
    };
    items?: any[];
}

export default function DeliveryEdit({ delivery, items = [] }: DeliveryEditProps) {
    const { t } = useTranslation();
    useFlashMessages();

    const order = delivery.sales_order || {};
    const customer = order.customer || {};

    // Initial item states mapped from delivery items and order items
    const initialItems: DeliveryItemData[] = (delivery.items || []).map((item) => {
        const orderItem = item.sales_order_item || {};
        const orderedQty = orderItem.quantity || item.quantity;
        const prevDelivered = 0; // Handled dynamically in backend validation
        const remaining = orderedQty;

        return {
            sales_order_item_id: item.sales_order_item_id,
            product_name: orderItem.product?.name || orderItem.product_name || `Product #${item.product_id}`,
            product_sku: orderItem.product?.sku,
            unit: orderItem.unit,
            ordered_quantity: orderedQty,
            previously_delivered: prevDelivered,
            remaining_quantity: remaining,
            quantity: item.quantity,
            notes: item.notes || '',
        };
    });

    const { data, setData, put, processing, errors } = useForm({
        delivery_date: delivery.delivery_date || '',
        status: delivery.status || 'created',
        notes: delivery.notes || '',
        items: initialItems,
    });

    const handleItemQuantityChange = (index: number, newQty: number) => {
        const updated = [...data.items];
        updated[index].quantity = Math.max(0, newQty);
        setData('items', updated);
    };

    const handleItemNotesChange = (index: number, newNotes: string) => {
        const updated = [...data.items];
        updated[index].notes = newNotes;
        setData('items', updated);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('salesorder.deliveries.update', delivery.id));
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('Sales Orders'), url: route('salesorder.orders.index') },
                { label: order.order_number || `#${order.id}`, url: route('salesorder.orders.show', order.id) },
                { label: delivery.delivery_number, url: route('salesorder.deliveries.show', delivery.id) },
                { label: t('Edit') }
            ]}
        >
            <Head title={t('Edit Delivery Challan — :num', { num: delivery.delivery_number })} />

            <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto">
                {/* ─── Header & Actions ─── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Truck className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    {t('Edit Delivery Challan')} {delivery.delivery_number}
                                </h1>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t('Modify dispatch date, status, notes, and item quantities before final delivery.')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('salesorder.deliveries.show', delivery.id)}>
                                <ArrowLeft className="h-4 w-4 mr-1.5" />
                                {t('Cancel')}
                            </Link>
                        </Button>
                        <Button size="sm" type="submit" disabled={processing} className="bg-primary hover:bg-primary/90">
                            <Save className="h-4 w-4 mr-1.5" />
                            {t('Save Changes')}
                        </Button>
                    </div>
                </div>

                {/* ─── Delivery Main Information Card ─── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-bold">{t('Delivery Information')}</CardTitle>
                        <CardDescription>{t('Sales Order Reference:')} {order.order_number} ({customer.customer_name || t('Customer')})</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="delivery_date" className="text-xs font-bold">{t('Delivery / Dispatch Date')} *</Label>
                                <Input
                                    id="delivery_date"
                                    type="date"
                                    value={data.delivery_date}
                                    onChange={(e) => setData('delivery_date', e.target.value)}
                                    required
                                />
                                {errors.delivery_date && <p className="text-xs text-rose-500">{errors.delivery_date}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status" className="text-xs font-bold">{t('Delivery Status')}</Label>
                                <Select value={data.status} onValueChange={(val) => setData('status', val)}>
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder={t('Select Status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="created">{t('Created')}</SelectItem>
                                        <SelectItem value="ongoing">{t('Ongoing')}</SelectItem>
                                        <SelectItem value="postponed">{t('Postponed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.status && <p className="text-xs text-rose-500">{errors.status}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes" className="text-xs font-bold">{t('Delivery Notes / Remarks')}</Label>
                            <Textarea
                                id="notes"
                                rows={3}
                                placeholder={t('Add delivery instructions, driver details, or tracking notes...')}
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                            />
                            {errors.notes && <p className="text-xs text-rose-500">{errors.notes}</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* ─── Dispatched Items Card ─── */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <PackageCheck className="h-5 w-5 text-emerald-600" />
                                {t('Dispatched Items Quantities')}
                            </CardTitle>
                            <CardDescription>{t('Adjust item quantities included in this challan')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                                    <tr>
                                        <th className="py-3 px-4">#</th>
                                        <th className="py-3 px-4">{t('Product Name')}</th>
                                        <th className="py-3 px-4 text-center">{t('Unit')}</th>
                                        <th className="py-3 px-4 text-right">{t('Ordered Qty')}</th>
                                        <th className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 w-36">{t('Dispatched Qty')} *</th>
                                        <th className="py-3 px-4">{t('Item Notes')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground">{idx + 1}</td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-foreground">{item.product_name}</div>
                                                {item.product_sku && (
                                                    <span className="text-[10px] font-mono text-muted-foreground uppercase">{item.product_sku}</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center text-xs text-muted-foreground">
                                                {item.unit || '-'}
                                            </td>
                                            <td className="py-3.5 px-4 text-right text-xs font-semibold text-muted-foreground">
                                                {item.ordered_quantity}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    min="0.01"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemQuantityChange(idx, parseFloat(e.target.value) || 0)}
                                                    className="w-28 text-right font-bold text-emerald-600 dark:text-emerald-400"
                                                    required
                                                />
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <Input
                                                    type="text"
                                                    placeholder={t('Item notes / batch #...')}
                                                    value={item.notes}
                                                    onChange={(e) => handleItemNotesChange(idx, e.target.value)}
                                                    className="text-xs"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" asChild>
                        <Link href={route('salesorder.deliveries.show', delivery.id)}>
                            {t('Cancel')}
                        </Link>
                    </Button>
                    <Button type="submit" disabled={processing} className="bg-primary hover:bg-primary/90">
                        <Save className="h-4 w-4 mr-1.5" />
                        {t('Save & Update Challan')}
                    </Button>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}

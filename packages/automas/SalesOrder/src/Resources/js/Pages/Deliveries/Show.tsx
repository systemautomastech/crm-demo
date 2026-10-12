import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { formatDate } from '@/utils/helpers';
import {
    Truck,
    Printer,
    FileText,
    Ban,
    ArrowLeft,
    Building,
    Calendar,
    CheckCircle2,
    Edit,
    MapPin,
    PackageCheck,
    ShieldAlert,
    Clock,
    ArrowRight,
} from "lucide-react";

interface SalesOrderDelivery {
    id: number;
    sales_order_id: number;
    delivery_number: string;
    delivery_date: string;
    notes?: string;
    status: string;
    created_at: string;
    updated_at: string;
    sales_order?: any;
    items?: any[];
    creator?: { id: number; name: string };
}

interface DeliveryShowProps {
    delivery: SalesOrderDelivery;
    settings?: Record<string, any>;
    canEdit?: boolean;
    canCancel?: boolean;
    canUpdateStatus?: boolean;
    canRelease?: boolean;
    canPrint?: boolean;
}

export default function DeliveryShow({
    delivery,
    settings,
    canEdit,
    canCancel,
    canUpdateStatus,
    canRelease,
    canPrint,
}: DeliveryShowProps) {
    const { t } = useTranslation();
    useFlashMessages();

    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const order = delivery.sales_order || {};
    const customer = order.customer || {};

    const formatAddress = (addr: any): string => {
        if (!addr) return '-';
        if (typeof addr === 'string') {
            const trimmed = addr.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (typeof parsed === 'object' && parsed !== null) {
                        return formatAddress(parsed);
                    }
                } catch {
                    return addr;
                }
            }
            return addr;
        }
        if (typeof addr === 'object') {
            const parts = [
                addr.address || addr.address_line_1,
                addr.address_line_2,
                addr.city,
                addr.state,
                addr.zip_code || addr.postal_code,
                addr.country
            ].filter(Boolean);
            if (parts.length > 0) {
                return parts.join(', ');
            }
            return addr.name || '-';
        }
        return String(addr);
    };

    const isCancelled = delivery.status === 'cancelled';
    const isDelivered = delivery.status === 'delivered';
    const isFinal = isCancelled || isDelivered;

    const handleCancel = () => {
        router.post(route('salesorder.deliveries.cancel', delivery.id), {}, {
            onSuccess: () => setCancelDialogOpen(false)
        });
    };

    const handleStatusUpdate = (newStatus: string) => {
        router.post(route('salesorder.deliveries.update-status', delivery.id), { status: newStatus });
    };

    const renderStatusBadge = (st: string) => {
        switch (st) {
            case 'created':
                return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 font-semibold">{t('Created')}</Badge>;
            case 'ongoing':
                return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 font-semibold">{t('Ongoing')}</Badge>;
            case 'postponed':
                return <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 font-semibold">{t('Postponed')}</Badge>;
            case 'delivered':
                return <Badge className="bg-emerald-600 text-white font-semibold">{t('Delivered')}</Badge>;
            case 'cancelled':
                return <Badge variant="destructive" className="font-semibold">{t('Cancelled')}</Badge>;
            default:
                return <Badge variant="outline">{st}</Badge>;
        }
    };

    // Determine the single "next step" primary action based on status
    const getNextAction = () => {
        if (isFinal || !canUpdateStatus) return null;
        if (delivery.status === 'created' || delivery.status === 'postponed') {
            return { label: t('Mark Ongoing'), status: 'ongoing', className: 'bg-indigo-600 hover:bg-indigo-700 text-white', icon: <ArrowRight className="h-3.5 w-3.5" /> };
        }
        if (delivery.status === 'ongoing') {
            return { label: t('Mark Delivered'), status: 'delivered', className: 'bg-emerald-600 hover:bg-emerald-700 text-white', icon: <CheckCircle2 className="h-3.5 w-3.5" /> };
        }
        return null;
    };

    const nextAction = getNextAction();

    // Determine secondary status action (postpone) — only when ongoing
    const canPostpone = !isFinal && canUpdateStatus && delivery.status === 'ongoing';

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('Sales Orders'), url: route('salesorder.orders.index') },
                { label: order.order_number || `#${order.id}`, url: route('salesorder.orders.show', order.id) },
                { label: t('Delivery Challans'), url: route('salesorder.deliveries.index') },
                { label: delivery.delivery_number || t('Delivery') }
            ]}
        >
            <Head title={t('Delivery Challan — :num', { num: delivery.delivery_number })} />

            <div className="space-y-6">
                {/* ─── Header Card ─── */}
                <Card className="shadow-sm">
                    {/* Top: title + status */}
                    <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isCancelled ? 'bg-red-500/10 text-red-600' : isDelivered ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'}`}>
                                <Truck className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-base font-bold text-foreground">{delivery.delivery_number}</h1>
                                    {renderStatusBadge(delivery.status)}
                                    <Badge variant="outline" className="text-[10px]">
                                        SO: {order.order_number}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(delivery.delivery_date)}
                                    {delivery.creator?.name && (
                                        <span className="text-muted-foreground/60 ml-1">· {delivery.creator.name}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground" asChild>
                                <Link href={route('salesorder.orders.show', order.id)}>
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    {t('Back')}
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Bottom: action bar */}
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Utility actions */}
                            {canPrint !== false && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1.5"
                                    onClick={() => window.open(route('salesorder.deliveries.challan', delivery.id), '_blank')}
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                    {t('Print Challan')}
                                </Button>
                            )}

                            {!isFinal && canEdit !== false && (
                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
                                    <Link href={route('salesorder.deliveries.edit', delivery.id)}>
                                        <Edit className="h-3.5 w-3.5" />
                                        {t('Edit')}
                                    </Link>
                                </Button>
                            )}

                            {/* Secondary: postpone (only when ongoing) */}
                            {canPostpone && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                    onClick={() => handleStatusUpdate('postponed')}
                                >
                                    <Clock className="h-3.5 w-3.5" />
                                    {t('Postpone')}
                                </Button>
                            )}

                            {/* Danger: cancel */}
                            {!isFinal && canCancel !== false && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                                    onClick={() => setCancelDialogOpen(true)}
                                >
                                    <Ban className="h-3.5 w-3.5" />
                                    {t('Cancel')}
                                </Button>
                            )}

                            {/* Primary CTA: contextual next step */}
                            {nextAction && (
                                <Button
                                    size="sm"
                                    className={`h-8 text-xs gap-1.5 ml-auto ${nextAction.className}`}
                                    onClick={() => handleStatusUpdate(nextAction.status)}
                                >
                                    {nextAction.icon}
                                    {nextAction.label}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ─── Status Alert Banners ─── */}
                {isDelivered && (
                    <Card className="border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20">
                        <CardContent className="flex items-center gap-3 p-4">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                                {t('This challan is fully delivered. Stock and order details have been updated.')}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {isCancelled && (
                    <Card className="border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20">
                        <CardContent className="flex items-center gap-3 p-4">
                            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
                            <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
                                {t('This delivery challan has been cancelled. Item quantities have been restored back to the sales order balance.')}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* ─── Summary Info Grid ─── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Dispatch Info */}
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Truck className="h-4 w-4 text-primary" />
                                {t('Dispatch Information')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('Challan Number')}:</span>
                                <span className="font-bold font-mono">{delivery.delivery_number}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('Dispatch Date')}:</span>
                                <span className="font-semibold">{formatDate(delivery.delivery_date)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('Dispatched By')}:</span>
                                <span>{delivery.creator?.name || t('System')}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('Status')}:</span>
                                <span>{renderStatusBadge(delivery.status)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sales Order Info */}
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                {t('Sales Order Info')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('Order Number')}:</span>
                                <Link
                                    href={route('salesorder.orders.show', order.id)}
                                    className="font-bold text-primary hover:underline"
                                >
                                    {order.order_number}
                                </Link>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('Order Date')}:</span>
                                <span>{formatDate(order.order_date)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('Order Status')}:</span>
                                <Badge variant="outline" className="capitalize text-[10px]">{order.status}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('Fulfillment')}:</span>
                                <Badge variant="secondary" className="capitalize text-[10px]">{order.delivery_status}</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customer & Shipping */}
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Building className="h-4 w-4 text-primary" />
                                {t('Customer & Shipping')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-xs">
                            <div className="flex justify-between items-start">
                                <span className="text-muted-foreground">{t('Customer')}:</span>
                                <span className="font-bold text-right">{customer.customer_name || customer.name || '-'}</span>
                            </div>
                            {(customer.customer_email || customer.email) && (
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">{t('Email')}:</span>
                                    <span className="truncate max-w-[160px]">{customer.customer_email || customer.email}</span>
                                </div>
                            )}
                            {(customer.customer_phone || customer.mobile_no) && (
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">{t('Phone')}:</span>
                                    <span>{customer.customer_phone || customer.mobile_no}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-start pt-1 border-t">
                                <span className="text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-primary" />
                                    {t('Ship To')}:
                                </span>
                                <span className="text-right max-w-[160px] font-medium text-[11px] leading-snug">
                                    {formatAddress(order.shipping_address || order.billing_address)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ─── Dispatched Items Table ─── */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                        <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <PackageCheck className="h-5 w-5 text-emerald-600" />
                                {t('Dispatched Items')}
                            </CardTitle>
                            <CardDescription className="mt-0.5">{t('Items included in this delivery challan')}</CardDescription>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs shrink-0">
                            {delivery.items?.length || 0} {t('item(s)')}
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                                    <tr>
                                        <th className="py-3 px-4">#</th>
                                        <th className="py-3 px-4">{t('Product')}</th>
                                        <th className="py-3 px-4 text-center">{t('Unit')}</th>
                                        <th className="py-3 px-4 text-right">{t('Ordered')}</th>
                                        <th className="py-3 px-4 text-right">{t('Dispatched')}</th>
                                        <th className="py-3 px-4">{t('Notes')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {delivery.items && delivery.items.length > 0 ? (
                                        delivery.items.map((item: any, idx: number) => {
                                            const orderItem = item.sales_order_item || {};
                                            const productName = orderItem.product?.name || orderItem.product_name || orderItem.name || (item.product_id ? `Product #${item.product_id}` : `Item #${idx + 1}`);
                                            const productSku = orderItem.product?.sku;

                                            return (
                                                <tr key={item.id || idx} className="hover:bg-muted/20 transition-colors">
                                                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-semibold text-foreground flex items-center gap-2">
                                                            <span>{productName}</span>
                                                            {productSku && (
                                                                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                                    {productSku}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {orderItem.description && (
                                                            <div
                                                                className="text-xs text-muted-foreground mt-0.5"
                                                                dangerouslySetInnerHTML={{ __html: orderItem.description }}
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-center text-xs text-muted-foreground">
                                                        {orderItem.unit || '-'}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                                                        {orderItem.quantity ?? '-'}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="py-3 px-4 text-xs text-muted-foreground">
                                                        {item.notes || '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-10 text-center text-muted-foreground text-sm">
                                                {t('No items recorded in this delivery.')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* ─── Delivery Notes ─── */}
                {delivery.notes && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">{t('Delivery Notes')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{delivery.notes}</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            <ConfirmationDialog
                open={cancelDialogOpen}
                onOpenChange={setCancelDialogOpen}
                title={t('Cancel Delivery')}
                message={t('Are you sure you want to cancel delivery :num? This will restore the dispatched quantities back to the order balance and update order delivery status.', { num: delivery.delivery_number })}
                confirmText={t('Yes, Cancel Delivery')}
                cancelText={t('Keep Delivery')}
                onConfirm={handleCancel}
                variant="destructive"
            />
        </AuthenticatedLayout>
    );
}


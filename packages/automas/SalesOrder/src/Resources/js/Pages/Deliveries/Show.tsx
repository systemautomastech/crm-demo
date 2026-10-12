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
    User,
    Calendar,
    CheckCircle2,
    Edit,
    MapPin,
    Clock,
    PackageCheck,
    Package,
    ShieldAlert,
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
    const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
    const order = delivery.sales_order || null;
    const customer = order?.customer || {};

    const isCancelled = delivery.status === 'cancelled';
    const isDelivered = delivery.status === 'delivered';
    const isFinal = isCancelled || isDelivered;

    const handleCancel = () => {
        router.post(route('salesorder.deliveries.cancel', delivery.id), {}, {
            onSuccess: () => setCancelDialogOpen(false)
        });
    };

    const handleConfirmRelease = () => {
        if (!order?.id) return;
        router.post(route('salesorder.orders.release', order.id), {}, {
            onSuccess: () => setReleaseDialogOpen(false)
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
                return <Badge className="bg-emerald-600 text-white font-semibold">{t('Delivered (Final Acceptance)')}</Badge>;
            case 'cancelled':
                return <Badge variant="destructive" className="font-semibold">{t('Cancelled (Final Rejection)')}</Badge>;
            default:
                return <Badge variant="outline">{st}</Badge>;
        }
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('Sales Orders'), url: route('salesorder.orders.index') },
                ...(order?.id ? [{ label: order.order_number || `#${order.id}`, url: route('salesorder.orders.show', order.id) }] : []),
                { label: t('Delivery Challans'), url: route('salesorder.deliveries.index') },
                { label: delivery.delivery_number || t('Delivery') }
            ]}
        >
            <Head title={t('Delivery Challan — :num', { num: delivery.delivery_number })} />

            <div className="space-y-6">
                {/* ─── Header & Primary Action Bar ─── */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-start sm:items-center gap-4">
                        <div className={`p-3.5 rounded-xl shrink-0 ${isCancelled ? 'bg-red-500/10 text-red-600 dark:text-red-400' : isDelivered ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                            <Truck className="h-8 w-8" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    {delivery.delivery_number}
                                </h1>
                                {renderStatusBadge(delivery.status)}
                                {order?.order_number && (
                                    <Badge variant="outline" className="text-xs">
                                        {t('SO Ref:')} {order.order_number}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <span>
                                    {t('Dispatched on')} <strong className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(delivery.delivery_date)}</strong> {t('by')} <strong className="font-semibold text-slate-700 dark:text-slate-300">{delivery.creator?.name || t('System')}</strong>
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
                        {order?.id ? (
                            <Button
                                variant="outline"
                                size="sm"
                                asChild
                            >
                                <Link href={route('salesorder.orders.show', order.id)}>
                                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                                    {t('Back to Order')}
                                </Link>
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                asChild
                            >
                                <Link href={route('salesorder.deliveries.index')}>
                                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                                    {t('Back to Deliveries')}
                                </Link>
                            </Button>
                        )}

                        {!isFinal && canEdit !== false && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                asChild
                            >
                                <Link href={route('salesorder.deliveries.edit', delivery.id)}>
                                    <Edit className="h-4 w-4 mr-1.5" />
                                    {t('Edit Challan')}
                                </Link>
                            </Button>
                        )}

                        {!isFinal && canUpdateStatus !== false && (
                            <>
                                {delivery.status !== 'ongoing' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                                        onClick={() => handleStatusUpdate('ongoing')}
                                    >
                                        {t('Mark Ongoing')}
                                    </Button>
                                )}
                                {delivery.status !== 'postponed' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                        onClick={() => handleStatusUpdate('postponed')}
                                    >
                                        {t('Mark Postponed')}
                                    </Button>
                                )}
                                {delivery.status !== 'delivered' && (
                                    <Button
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                        onClick={() => handleStatusUpdate('delivered')}
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                        {t('Mark Delivered (Final)')}
                                    </Button>
                                )}
                            </>
                        )}

                        {canPrint !== false && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(route('salesorder.deliveries.challan', delivery.id), '_blank')}
                            >
                                <Printer className="h-4 w-4 mr-1.5" />
                                {t('Print Challan')}
                            </Button>
                        )}

                        {!isFinal && canCancel !== false && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setCancelDialogOpen(true)}
                            >
                                <Ban className="h-4 w-4 mr-1.5" />
                                {t('Cancel Delivery')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* ─── Delivery Status Alert Bar (if Cancelled or Delivered) ─── */}
                {isDelivered && (
                    <Card className="border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20">
                        <CardContent className="flex items-center gap-3 p-4">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                                {t('This delivery challan has been marked as fully delivered. Stock balances and order fulfillment records have been finalized.')}
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

                {/* ─── Summary Information Grid ─── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Dispatch Information */}
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Truck className="h-4 w-4 text-primary" />
                                {t('Dispatch Information')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('Challan Number')}:</span>
                                <span className="font-bold text-foreground">{delivery.delivery_number}</span>
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
                                <span className="text-muted-foreground">{t('Current Status')}:</span>
                                <span>{renderStatusBadge(delivery.status)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sales Order Info */}
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                {t('Sales Order Info')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('Order Number')}:</span>
                                {order?.id ? (
                                    <Link
                                        href={route('salesorder.orders.show', order.id)}
                                        className="font-bold text-primary hover:underline"
                                    >
                                        {order.order_number}
                                    </Link>
                                ) : (
                                    <span className="font-semibold text-muted-foreground">-</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('Order Date')}:</span>
                                <span>{order?.order_date ? formatDate(order.order_date) : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('Commercial Status')}:</span>
                                <Badge variant="outline" className="capitalize text-[10px]">{order?.status || '-'}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('Order Fulfillment')}:</span>
                                <Badge variant="secondary" className="capitalize text-[10px]">{order?.delivery_status || '-'}</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customer & Shipping */}
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Building className="h-4 w-4 text-primary" />
                                {t('Customer & Shipping')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-xs">
                            <div className="flex justify-between items-start">
                                <span className="text-muted-foreground">{t('Customer')}:</span>
                                <span className="font-bold text-right">{customer.customer_name || customer.name || '-'}</span>
                            </div>
                            {customer.customer_email && (
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">{t('Email')}:</span>
                                    <span>{customer.customer_email}</span>
                                </div>
                            )}
                            {customer.customer_phone && (
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">{t('Phone')}:</span>
                                    <span>{customer.customer_phone}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-start pt-1 border-t">
                                <span className="text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                    {t('Shipping Address')}:
                                </span>
                                <span className="text-right max-w-[180px] font-medium text-[11px] leading-snug">
                                    {order?.shipping_address || order?.billing_address || '-'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ─── Dispatched Items Table ─── */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <PackageCheck className="h-5 w-5 text-emerald-600" />
                                {t('Dispatched Items Breakdown')}
                            </CardTitle>
                            <CardDescription>{t('Items included in this delivery challan dispatch')}</CardDescription>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">
                            {delivery.items?.length || 0} {t('Items Dispatched')}
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                                    <tr>
                                        <th className="py-3 px-4">#</th>
                                        <th className="py-3 px-4">{t('Product / Item Name')}</th>
                                        <th className="py-3 px-4 text-center">{t('Unit')}</th>
                                        <th className="py-3 px-4 text-right">{t('Ordered Qty')}</th>
                                        <th className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{t('Dispatched Qty')}</th>
                                        <th className="py-3 px-4">{t('Notes / Serial Numbers')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {delivery.items && delivery.items.length > 0 ? (
                                        delivery.items.map((item: any, idx: number) => {
                                            const orderItem = item.sales_order_item || {};
                                            const productName = orderItem.product?.name || orderItem.product_name || orderItem.name || (item.product_id ? `${t('Product')} #${item.product_id}` : `Item #${idx + 1}`);
                                            const productSku = orderItem.product?.sku;

                                            return (
                                                <tr key={item.id || idx} className="hover:bg-muted/20 transition-colors">
                                                    <td className="py-3.5 px-4 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="font-bold text-foreground flex items-center gap-2">
                                                            <span>{productName}</span>
                                                            {productSku && (
                                                                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                                    {productSku}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {orderItem.description && (
                                                            <div
                                                                className="text-xs text-muted-foreground mt-1 space-y-0.5"
                                                                dangerouslySetInnerHTML={{ __html: orderItem.description }}
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center text-xs text-muted-foreground">
                                                        {orderItem.unit || '-'}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right text-xs font-semibold text-muted-foreground">
                                                        {orderItem.quantity ?? '-'}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-base font-mono">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                                                        {item.notes || '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-muted-foreground">
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
                            <CardTitle className="text-sm font-bold">{t('Delivery Notes / Remarks')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{delivery.notes}</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Cancel Confirmation Dialog */}
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

            {/* Release Confirmation Dialog */}
            <ConfirmationDialog
                open={releaseDialogOpen}
                onOpenChange={setReleaseDialogOpen}
                title={t('Release Sales Order')}
                message={t('Are you sure you want to release this order? Releasing will return the order to the group queue for other members to acquire.')}
                confirmText={t('Yes, Release Order')}
                cancelText={t('Keep Acquired')}
                onConfirm={handleConfirmRelease}
            />
        </AuthenticatedLayout>
    );
}

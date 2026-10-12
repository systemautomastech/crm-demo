import { useState } from 'react';
import { Head, usePage, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate, formatCurrency } from '@/utils/helpers';
import { FileText, Users, UserCheck, User, Lock, RotateCcw, ArrowRight, Truck, AlertCircle, Printer, Edit, CheckCircle, Package, MapPin, Calendar } from 'lucide-react';
import { useFormFields } from '@/hooks/useFormFields';
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MultiSelectEnhanced } from '@/components/ui/multi-select-enhanced';
import ConvertToInvoiceForm from './components/ConvertToInvoiceForm';

interface ShowSalesOrderProps {
    salesOrder: any;
    orderItems?: any[];
    quotation?: any;
    auth: any;
    userGroups?: Array<{ id: number; name: string; users_count: number }>;
    users?: Array<{ id: number; name: string; email?: string }>;
    deliveries?: any[];
    canConfirm?: boolean;
    canCancel?: boolean;
    canDeliver?: boolean;
    canAssignGroup?: boolean;
    canAcquire?: boolean;
    canRelease?: boolean;
    canReassign?: boolean;
    canEdit?: boolean;
    canConvertToInvoice?: boolean;
}

// ─── Assignment Status Badge ──────────────────────────────────────────────────

function AssignmentBadge({ status }: { status: string }) {
    const { t } = useTranslation();
    if (status === 'acquired') {
        return <Badge className="bg-green-100 text-green-800 border-green-200"><Lock className="w-3 h-3 mr-1" />{t('Acquired')}</Badge>;
    }
    if (status === 'group_assigned') {
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Users className="w-3 h-3 mr-1" />{t('Group Assigned')}</Badge>;
    }
    return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />{t('Unassigned')}</Badge>;
}

// ─── Challan Status Helper ────────────────────────────────────────────────────

function getChallanStatusClass(status?: string) {
    const s = (status || '').toLowerCase();
    if (s === 'delivered') {
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-700';
    }
    if (s === 'ongoing' || s === 'in_transit' || s === 'dispatched') {
        return 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/60 dark:text-sky-300 dark:border-sky-700';
    }
    if (s === 'postponed' || s === 'cancelled') {
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/60 dark:text-rose-300 dark:border-rose-700';
    }
    // Default (created / pending / draft)
    return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-700';
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Show() {
    const { t } = useTranslation();
    const {
        salesOrder,
        orderItems = [],
        quotation,
        auth,
        userGroups = [],
        users = [],
        deliveries = [],
        canConfirm,
        canCancel,
        canDeliver,
        canAssignGroup,
        canAcquire,
        canRelease,
        canReassign,
        canEdit,
        canConvertToInvoice,
    } = usePage<ShowSalesOrderProps>().props;

    const [assignGroupDialog, setAssignGroupDialog] = useState(false);
    const [reassignDialog, setReassignDialog] = useState(false);
    const [cancelOrderDialogOpen, setCancelOrderDialogOpen] = useState(false);
    const [releaseOrderDialogOpen, setReleaseOrderDialogOpen] = useState(false);
    const [convertDialogOpen, setConvertDialogOpen] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [reassignType, setReassignType] = useState<'group' | 'user'>('group');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    // Custom fields hook
    const customFields = useFormFields('getCustomFields', { ...salesOrder, module: 'Sales', sub_module: 'Sales Orders', id: salesOrder.id }, () => { }, {}, 'view', t);

    useFlashMessages();

    const handleAssignGroup = () => {
        if (!selectedGroupId) return;
        router.post(route('salesorder.orders.assign-group', salesOrder.id), { assigned_group_id: parseInt(selectedGroupId) }, {
            onSuccess: () => { setAssignGroupDialog(false); setSelectedGroupId(''); }
        });
    };

    const handleReassign = () => {
        if (reassignType === 'group' && !selectedGroupId) return;
        if (reassignType === 'user' && selectedUserIds.length === 0) return;

        router.post(route('salesorder.orders.reassign', salesOrder.id), {
            assignment_check: reassignType,
            assigned_group_id: reassignType === 'group' ? parseInt(selectedGroupId) : null,
            assigned_user_ids: reassignType === 'user' ? selectedUserIds : [],
        }, {
            onSuccess: () => {
                setReassignDialog(false);
                setSelectedGroupId('');
                setSelectedUserIds([]);
            }
        });
    };

    const handleAcquire = () => {
        router.post(route('salesorder.orders.acquire', salesOrder.id));
    };

    const handleConfirmRelease = () => {
        router.post(route('salesorder.orders.release', salesOrder.id), {}, {
            onSuccess: () => setReleaseOrderDialogOpen(false),
        });
    };

    const [convertingProcessing, setConvertingProcessing] = useState(false);

    const handleConvertInvoice = (customItems?: Array<{ id: number; quantity: number }>) => {
        setConvertingProcessing(true);
        const payload: Record<string, any> = {};
        if (customItems && customItems.length > 0) {
            payload.items = customItems;
        }
        router.post(route('salesorder.orders.convert', salesOrder.id), payload, {
            onSuccess: () => {
                setConvertingProcessing(false);
                setConvertDialogOpen(false);
            },
            onError: () => {
                setConvertingProcessing(false);
                setConvertDialogOpen(false);
            },
            onFinish: () => {
                setConvertingProcessing(false);
            }
        });
    };

    const totalOrdered = orderItems?.reduce((total: number, item: any) => total + (Number(item.quantity) || 0), 0) || 0;
    const totalDelivered = orderItems?.reduce((total: number, item: any) => total + (Number(item.delivered_quantity) || 0), 0) || 0;
    const deliveryPercentage = totalOrdered > 0 ? Math.min(100, Math.round((totalDelivered / totalOrdered) * 100)) : 0;

    const handleConfirm = () => {
        router.post(route('salesorder.orders.confirm', salesOrder.id));
    };

    const handleConfirmCancelOrder = () => {
        router.post(route('salesorder.orders.cancel', salesOrder.id), {}, {
            onSuccess: () => setCancelOrderDialogOpen(false),
        });
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('Sales Orders'), url: route('salesorder.orders.index') },
                { label: salesOrder.order_number || t('Details') }
            ]}
            pageTitle={t('Order Details')}
        >
            <Head title={t('Sales Order — :num', { num: salesOrder.order_number })} />

            <div className="space-y-6">
                {salesOrder.status === 'confirmed' && (() => {
                    const isGroupFlow = !!salesOrder.assigned_group || salesOrder.assignment_status === 'group_assigned';
                    const isAcquired = salesOrder.assignment_status === 'acquired';
                    const isDelivered = salesOrder.delivery_status === 'delivered';

                    const steps: Array<{
                        key: string;
                        label: string;
                        icon: any;
                        done: boolean;
                        doneClass: string;
                        subtext?: string;
                        time?: string;
                    }> = [
                            {
                                key: 'confirmed',
                                label: t('Confirmed'),
                                icon: CheckCircle,
                                done: true,
                                doneClass: 'bg-green-600 text-white border-green-600',
                                time: formatDate(salesOrder.confirmed_at || salesOrder.order_date),
                            },
                        ];

                    if (isGroupFlow) {
                        steps.push({
                            key: 'group_assigned',
                            label: t('Group Assigned'),
                            icon: Users,
                            done: ['group_assigned', 'acquired'].includes(salesOrder.assignment_status),
                            doneClass: 'bg-blue-600 text-white border-blue-600',
                            subtext: salesOrder.assigned_group?.name,
                        });
                    }

                    steps.push({
                        key: 'acquired',
                        label: t('Assigned'),
                        icon: Lock,
                        done: isAcquired,
                        doneClass: 'bg-indigo-600 text-white border-indigo-600',
                        subtext: isAcquired ? (salesOrder.acquired_by_user?.name || t('Acquired')) : undefined,
                        time: isAcquired && salesOrder.acquired_at ? formatDate(salesOrder.acquired_at) : undefined,
                    });

                    // Challan Issued Step
                    const hasDeliveries = deliveries.length > 0;
                    const latestDelivery = hasDeliveries ? deliveries[deliveries.length - 1] : null;
                    const challanSubtext = hasDeliveries
                        ? (deliveries.length === 1
                            ? (latestDelivery?.delivery_number ? `#${latestDelivery.delivery_number}` : t('Issued'))
                            : t(':count Challans', { count: deliveries.length }))
                        : undefined;
                    const challanTime = latestDelivery?.delivery_date ? formatDate(latestDelivery.delivery_date) : undefined;

                    steps.push({
                        key: 'challan_issued',
                        label: t('Challan Issued'),
                        icon: Truck,
                        done: hasDeliveries,
                        doneClass: 'bg-blue-600 text-white border-blue-600',
                        subtext: challanSubtext,
                        time: challanTime,
                    });

                    // Delivered Step (clean: only date and delivered by user if available)
                    const deliveredChallans = deliveries.filter((d: any) => d.status === 'delivered');
                    const lastDeliveredChallan = deliveredChallans.length > 0 ? deliveredChallans[deliveredChallans.length - 1] : null;

                    const deliveredUser = salesOrder.delivered_by_user?.name
                        || salesOrder.delivered_by
                        || lastDeliveredChallan?.creator?.name;

                    const deliveredDate = salesOrder.delivered_at
                        || lastDeliveredChallan?.delivery_date;

                    steps.push({
                        key: 'delivered',
                        label: t('Delivered'),
                        icon: Package,
                        done: isDelivered,
                        doneClass: 'bg-emerald-600 text-white border-emerald-600',
                        subtext: isDelivered && deliveredUser ? deliveredUser : undefined,
                        time: isDelivered && deliveredDate ? formatDate(deliveredDate) : undefined,
                    });

                    const currentStepIndex = steps.reduce((acc, s, i) => s.done ? i : acc, 0);

                    return (
                        <Card className="shadow-sm">
                            {/* Header */}
                            <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        <Truck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-foreground">{t('Sales Order Workflow')}</h3>
                                        <p className="text-xs text-muted-foreground">{t('Track assignment and fulfilment progress')}</p>
                                    </div>
                                </div>
                                <AssignmentBadge status={salesOrder.assignment_status || 'unassigned'} />
                            </div>

                            <CardContent className="p-4 space-y-4">
                                {/* ── Workflow Timeline ── */}
                                <div className="relative px-2 py-1">
                                    <div className="relative flex justify-between items-start">
                                        {/* Background connecting track: centered at top-[18px] through w-9 icons */}
                                        <div className="absolute top-[18px] left-6 right-6 h-[2px] bg-muted dark:bg-slate-800 -z-0" />
                                        <div
                                            className="absolute top-[18px] left-6 h-[2px] bg-gradient-to-r from-green-500 via-blue-500 to-indigo-500 transition-all duration-500 -z-0"
                                            style={{
                                                width: currentStepIndex === 0
                                                    ? '0%'
                                                    : `calc(${((currentStepIndex / (steps.length - 1)) * 100).toFixed(2)}% - ${((currentStepIndex / (steps.length - 1)) * 48).toFixed(0)}px)`
                                            }}
                                        />

                                        {steps.map((step) => {
                                            const Icon = step.icon;
                                            return (
                                                <div key={step.key} className="flex flex-col items-center z-10 max-w-[160px] text-center">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm mb-1.5 ${step.done
                                                        ? step.doneClass
                                                        : 'bg-background border-muted text-muted-foreground'
                                                        }`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <span className={`text-xs font-semibold tracking-tight leading-tight ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                        {step.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* ── 4 Stage Details Cards ── */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                                    {/* Card 1: Confirmed */}
                                    <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                                {t('Confirmed')}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800">
                                                {t('Done')}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                {salesOrder.order_number ? `#${salesOrder.order_number}` : '-'}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-muted-foreground/60" />
                                                {formatDate(salesOrder.confirmed_at || salesOrder.order_date)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card 2: Assignment */}
                                    <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                                                {t('Assigned')}
                                            </span>
                                            <span
                                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${isAcquired
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800'
                                                    : salesOrder.assignment_status === 'group_assigned'
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                                                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                                    }`}
                                            >
                                                {isAcquired ? t('Acquired') : (salesOrder.assignment_status === 'group_assigned' ? t('Group') : t('Pending'))}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                {isAcquired
                                                    ? (salesOrder.acquired_by_user?.name || t('Acquired'))
                                                    : (salesOrder.assigned_group?.name || t('Unassigned'))}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                {isAcquired && salesOrder.acquired_at ? (
                                                    <>
                                                        <Calendar className="w-3 h-3 text-muted-foreground/60" />
                                                        {formatDate(salesOrder.acquired_at)}
                                                    </>
                                                ) : (
                                                    <span>{salesOrder.assignment_status === 'group_assigned' ? t('Awaiting pick up') : t('Not assigned yet')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card 3: Challan Issued */}
                                    <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                <Truck className="w-3.5 h-3.5 text-blue-600" />
                                                {t('Challan Issued')}
                                            </span>
                                            <span
                                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${hasDeliveries
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                                    }`}
                                            >
                                                {hasDeliveries ? `${deliveries.length} ${t('Challan')}` : t('Pending')}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                                                {hasDeliveries && latestDelivery ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => router.visit(route('salesorder.deliveries.show', latestDelivery.id))}
                                                        className="text-primary hover:underline hover:text-primary/80 font-bold transition-colors cursor-pointer text-left"
                                                        title={t('View Delivery Challan')}
                                                    >
                                                        {deliveries.length === 1
                                                             ? (latestDelivery.delivery_number ? `#${latestDelivery.delivery_number}` : t('Challan Created'))
                                                             : (latestDelivery.delivery_number ? `#${latestDelivery.delivery_number} (+${deliveries.length - 1})` : t(':count Challans', { count: deliveries.length }))}
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-500">{t('No Challan yet')}</span>
                                                )}
                                                {hasDeliveries && latestDelivery?.status && (
                                                    <span
                                                        className={`text-[10px] px-1.5 py-0.5 leading-none uppercase tracking-wide font-semibold border rounded ${getChallanStatusClass(latestDelivery.status)}`}
                                                    >
                                                        {latestDelivery.status}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                {challanTime ? (
                                                    <>
                                                        <Calendar className="w-3 h-3 text-muted-foreground/60" />
                                                        {challanTime}
                                                    </>
                                                ) : (
                                                    <span>{t('Waiting for creation')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card 4: Delivered */}
                                    <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                <Package className="w-3.5 h-3.5 text-emerald-600" />
                                                {t('Delivered')}
                                            </span>
                                            <span
                                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${isDelivered
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                                    }`}
                                            >
                                                {isDelivered ? t('Completed') : t('Pending')}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                {isDelivered
                                                    ? (deliveredUser || t('Delivered'))
                                                    : t('Pending Delivery')}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                {isDelivered && deliveredDate ? (
                                                    <>
                                                        <Calendar className="w-3 h-3 text-muted-foreground/60" />
                                                        {formatDate(deliveredDate)}
                                                    </>
                                                ) : (
                                                    <span>{t('Awaiting completion')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Action Buttons ── */}
                                {(canAssignGroup || canAcquire || canRelease || canReassign || canDeliver || canConfirm || canCancel
                                    || auth.user?.permissions?.includes('edit-sales-orders')) && (
                                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                                            {/* ── Utility ── */}
                                            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
                                                onClick={() => window.open(route('salesorder.orders.print', salesOrder.id), '_blank')}>
                                                <Printer className="w-3.5 h-3.5" />
                                                {t('Print')}
                                            </Button>

                                            {canEdit && (
                                                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
                                                    onClick={() => router.visit(route('salesorder.orders.edit', salesOrder.id))}>
                                                    <Edit className="w-3.5 h-3.5" />
                                                    {t('Edit')}
                                                </Button>
                                            )}

                                            {/* ── Workflow ── */}
                                            {canAssignGroup && salesOrder.assignment_status === 'unassigned' && (
                                                <Button size="sm" className="gap-1.5 h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                                                    onClick={() => { setSelectedGroupId(''); setSelectedUserIds([]); setReassignDialog(true); }}>
                                                    <Users className="w-3.5 h-3.5" />
                                                    {t('Assign Order')}
                                                </Button>
                                            )}

                                            {canAcquire && (
                                                <Button size="sm" className="gap-1.5 h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={handleAcquire}>
                                                    <Lock className="w-3.5 h-3.5" />
                                                    {t('Acquire')}
                                                </Button>
                                            )}

                                            {canRelease && (
                                                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950"
                                                    onClick={() => setReleaseOrderDialogOpen(true)}>
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    {t('Release')}
                                                </Button>
                                            )}

                                            {canReassign && salesOrder.assignment_status !== 'unassigned' && (
                                                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                                                    onClick={() => { setSelectedGroupId(''); setSelectedUserIds([]); setReassignDialog(true); }}>
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                    {t('Reassign')}
                                                </Button>
                                            )}

                                            {/* ── Primary CTAs (pushed right) ── */}
                                            <div className="flex flex-wrap items-center gap-2 ml-auto">
                                                {canConfirm && (
                                                    <Button size="sm" className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        onClick={handleConfirm}>
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        {t('Confirm Order')}
                                                    </Button>
                                                )}

                                                {canCancel && (
                                                    <Button size="sm" variant="destructive" className="gap-1.5 h-8 text-xs"
                                                        onClick={() => setCancelOrderDialogOpen(true)}>
                                                        {t('Cancel Order')}
                                                    </Button>
                                                )}

                                                {canDeliver && (
                                                    <Button size="sm" className="gap-1.5 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                                        onClick={() => router.visit(route('salesorder.orders.deliveries.create', salesOrder.id))}>
                                                        <Truck className="w-3.5 h-3.5" />
                                                        {t('Create Delivery')}
                                                    </Button>
                                                )}

                                                {canConvertToInvoice && (
                                                    <Button size="sm" className="gap-1.5 h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                                                        onClick={() => setConvertDialogOpen(true)}>
                                                        <FileText className="w-3.5 h-3.5" />
                                                        {t('Convert to Invoice')}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </CardContent>
                        </Card>
                    );
                })()}



                {/* ─── Customer & Addresses Details ─────────────────────────────────────────── */}
                <Card>
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span>{t('Customer & Address Details')}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                            {/* Customer Info */}
                            <div className="space-y-2">
                                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {t('Customer Info')}
                                </h4>
                                <div className="space-y-1">
                                    <div className="font-bold text-slate-900 dark:text-slate-100 text-base">
                                        {salesOrder.customer?.customer_name || salesOrder.customer_name || '-'}
                                    </div>
                                    {(salesOrder.customer?.customer_email || salesOrder.customer_email) && (
                                        <div className="text-slate-600 dark:text-slate-400 text-xs">
                                            {salesOrder.customer?.customer_email || salesOrder.customer_email}
                                        </div>
                                    )}
                                    {(salesOrder.customer?.customer_phone || salesOrder.customer_phone) && (
                                        <div className="text-slate-600 dark:text-slate-400 text-xs">
                                            {salesOrder.customer?.customer_phone || salesOrder.customer_phone}
                                        </div>
                                    )}
                                    {salesOrder.warehouse?.name && (
                                        <div className="mt-2 text-xs text-slate-500">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{t('Warehouse')}: </span>
                                            {salesOrder.warehouse.name}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Billing Address */}
                            <div className="space-y-2">
                                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {t('Billing Address')}
                                </h4>
                                <div className="text-slate-700 dark:text-slate-300 text-xs space-y-1 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                    {(() => {
                                        const b = typeof salesOrder.billing_address === 'object' && salesOrder.billing_address !== null
                                            ? salesOrder.billing_address
                                            : { billing_address: salesOrder.billing_address };
                                        const addr = b.billing_address || b.address || b.address_line_1;
                                        const cityState = [b.billing_city || b.city, b.billing_state || b.state].filter(Boolean).join(', ');
                                        const countryZip = [b.billing_country || b.country, b.billing_postal_code || b.zip_code].filter(Boolean).join(' ');

                                        if (!addr && !cityState && !countryZip) {
                                            return <p className="text-slate-400 italic">{t('No billing address provided')}</p>;
                                        }

                                        return (
                                            <>
                                                {addr && <p className="font-medium text-slate-900 dark:text-slate-100">{addr}</p>}
                                                {cityState && <p>{cityState}</p>}
                                                {countryZip && <p>{countryZip}</p>}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Shipping Address */}
                            <div className="space-y-2">
                                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {t('Shipping Address')}
                                </h4>
                                <div className="text-slate-700 dark:text-slate-300 text-xs space-y-1 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                    {(() => {
                                        const s = typeof salesOrder.shipping_address === 'object' && salesOrder.shipping_address !== null
                                            ? salesOrder.shipping_address
                                            : { shipping_address: salesOrder.shipping_address };
                                        const addr = s.shipping_address || s.address || s.address_line_1;
                                        const cityState = [s.shipping_city || s.city, s.shipping_state || s.state].filter(Boolean).join(', ');
                                        const countryZip = [s.shipping_country || s.country, s.shipping_postal_code || s.zip_code].filter(Boolean).join(' ');

                                        if (!addr && !cityState && !countryZip) {
                                            return <p className="text-slate-400 italic">{t('Same as billing address')}</p>;
                                        }

                                        return (
                                            <>
                                                {addr && <p className="font-medium text-slate-900 dark:text-slate-100">{addr}</p>}
                                                {cityState && <p>{cityState}</p>}
                                                {countryZip && <p>{countryZip}</p>}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ─── Order Items ────────────────────────────────────────────────── */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <span>{t('Order Items')}</span>
                            {orderItems?.length > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal">
                                    {orderItems.length} {orderItems.length === 1 ? t('item') : t('items')}
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {orderItems?.length > 0 ? (
                            <div>
                                <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                                <th className="px-4 py-3.5 text-left min-w-[200px]">{t('Product')}</th>
                                                <th className="px-4 py-3.5 text-left min-w-[220px]">{t('Description')}</th>
                                                <th className="px-3 py-3.5 text-right w-16">{t('Qty')}</th>
                                                <th className="px-3 py-3.5 text-right w-20">{t('Delivered')}</th>
                                                <th className="px-3 py-3.5 text-right w-20">{t('Remaining')}</th>
                                                <th className="px-4 py-3.5 text-right w-28">{t('Unit Price')}</th>
                                                <th className="px-4 py-3.5 text-right w-28">{t('Discount')}</th>
                                                <th className="px-4 py-3.5 text-right w-36">{t('VAT / Tax')}</th>
                                                <th className="px-4 py-3.5 text-right w-32">{t('Total')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
                                            {orderItems.map((item, index) => {
                                                const productName = item.product_name || item.product?.name || item.name || (item.product_id ? `${t('Product')} #${item.product_id}` : `${t('Product')} #${item.id}`);
                                                const productSku = item.product?.sku;
                                                const remaining = item.remaining_quantity ?? item.quantity;
                                                const delivered = item.delivered_quantity ?? 0;
                                                const discountAmt = Number(item.discount_amount) || 0;
                                                const discountPct = Number(item.discount_percentage) || 0;
                                                const taxAmt = Number(item.tax_amount) || 0;
                                                const itemTaxes = item.taxes || [];

                                                return (
                                                    <tr key={index} className="align-top hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                                                        <td className="px-4 py-3.5 min-w-[200px]">
                                                            <div className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                                                                {productName}
                                                            </div>
                                                            {productSku && (
                                                                <div className="mt-1">
                                                                    <span className="inline-flex items-center text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                                                        {productSku}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-left text-xs min-w-[220px]">
                                                            {item.description ? (
                                                                <div
                                                                    className="text-slate-600 dark:text-slate-300 text-left space-y-0.5 [&_p]:my-0.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold [&_strong]:text-slate-800 dark:[&_strong]:text-slate-200"
                                                                    dangerouslySetInnerHTML={{ __html: item.description }}
                                                                />
                                                            ) : (
                                                                <span className="text-slate-400 dark:text-slate-600 italic text-xs">&mdash;</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-3.5 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                            {item.quantity}
                                                            {item.unit && <span className="text-xs text-slate-400 font-normal ml-0.5">{item.unit}</span>}
                                                        </td>
                                                        <td className="px-3 py-3.5 text-right">
                                                            <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                                                {delivered}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3.5 text-right">
                                                            <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${remaining > 0
                                                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                                }`}>
                                                                {remaining}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                            {formatCurrency(item.unit_price || item.price)}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                            {discountAmt > 0 ? (
                                                                <div>
                                                                    <span className="text-red-600 font-semibold">-{formatCurrency(discountAmt)}</span>
                                                                    {discountPct > 0 && (
                                                                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                                                            ({discountPct.toFixed(2)}%)
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : discountPct > 0 ? (
                                                                <span className="text-red-600 font-medium">{discountPct.toFixed(2)}%</span>
                                                            ) : (
                                                                <span className="text-slate-400 dark:text-slate-600">&mdash;</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                                                            {itemTaxes.length > 0 ? (
                                                                <div className="flex flex-col items-end gap-1">
                                                                    {itemTaxes.map((t: any, ti: number) => (
                                                                        <Badge key={ti} variant="secondary" className="text-[10px] px-1.5 py-0.5 font-normal whitespace-nowrap">
                                                                            {t.tax_name || t.name} ({Number(t.tax_rate ?? t.rate ?? 0).toFixed(2)}%)
                                                                        </Badge>
                                                                    ))}
                                                                    {taxAmt > 0 && (
                                                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                                                            {formatCurrency(taxAmt)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : taxAmt > 0 ? (
                                                                <span>{formatCurrency(taxAmt)}</span>
                                                            ) : (
                                                                <span className="text-slate-400 dark:text-slate-600">&mdash;</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                                            {formatCurrency(item.total_amount)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {(() => {
                                    const calculatedSubtotal = orderItems.reduce((acc, item) => acc + ((Number(item.quantity) || 0) * (Number(item.unit_price || item.price) || 0)), 0);
                                    const calculatedDiscount = orderItems.reduce((acc, item) => acc + (Number(item.discount_amount) || 0), 0);
                                    const calculatedTax = orderItems.reduce((acc, item) => acc + (Number(item.tax_amount) || 0), 0);
                                    const calculatedTotal = orderItems.reduce((acc, item) => acc + (Number(item.total_amount) || 0), 0);

                                    const displaySubtotal = salesOrder.subtotal != null && Number(salesOrder.subtotal) > 0 ? Number(salesOrder.subtotal) : calculatedSubtotal;
                                    const displayDiscount = (salesOrder.discount_amount != null && Number(salesOrder.discount_amount) > 0)
                                        ? Number(salesOrder.discount_amount)
                                        : (salesOrder.discount_total != null && Number(salesOrder.discount_total) > 0 ? Number(salesOrder.discount_total) : calculatedDiscount);
                                    const displayTax = (salesOrder.tax_amount != null && Number(salesOrder.tax_amount) > 0)
                                        ? Number(salesOrder.tax_amount)
                                        : (salesOrder.tax_total != null && Number(salesOrder.tax_total) > 0 ? Number(salesOrder.tax_total) : calculatedTax);
                                    const displayTotal = salesOrder.total_amount != null && Number(salesOrder.total_amount) > 0 ? Number(salesOrder.total_amount) : (salesOrder.grand_total != null && Number(salesOrder.grand_total) > 0 ? Number(salesOrder.grand_total) : calculatedTotal);

                                    return (
                                        <div className="mt-5 flex justify-end">
                                            <div className="w-full sm:w-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-4 space-y-2 text-sm shadow-sm">
                                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                                    <span>{t('Subtotal')}</span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(displaySubtotal)}</span>
                                                </div>
                                                {displayDiscount > 0 && (
                                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                                        <span>{t('Discount')}</span>
                                                        <span className="font-medium text-red-600">-{formatCurrency(displayDiscount)}</span>
                                                    </div>
                                                )}
                                                {displayTax > 0 && (
                                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                                        <span>{t('VAT / Tax')}</span>
                                                        <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(displayTax)}</span>
                                                    </div>
                                                )}
                                                <div className="border-t border-slate-200 dark:border-slate-800 pt-2.5 flex justify-between font-bold text-base text-slate-900 dark:text-slate-100">
                                                    <span>{t('Total')}</span>
                                                    <span className="text-primary">{formatCurrency(displayTotal)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <p>{t('No items added to this order yet.')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ─── Deliveries ─────────────────────────────────────────────────── */}
                {deliveries.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Truck className="w-4 h-4" />
                                {t('Deliveries')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {deliveries.map((delivery: any) => (
                                    <div key={delivery.id} className="flex items-center justify-between p-3 rounded-lg border">
                                        <div>
                                            <div className="font-medium text-sm">{delivery.delivery_number}</div>
                                            <div className="text-xs text-muted-foreground">{formatDate(delivery.delivery_date)} &bull; {delivery.creator?.name}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${delivery.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {delivery.status}
                                            </span>
                                            <Button size="sm" variant="ghost" onClick={() => router.visit(route('salesorder.deliveries.show', delivery.id))}>
                                                {t('View')}
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => window.open(route('salesorder.deliveries.challan', delivery.id), '_blank')}>
                                                <Printer className="h-3.5 w-3.5 mr-1" />
                                                {t('Challan')}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* ─── Assign Group Dialog ─────────────────────────────────────────── */}
            <Dialog open={assignGroupDialog} onOpenChange={setAssignGroupDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Assign Group to Sales Order')}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <Label>{t('Select a User Group')}</Label>
                        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Choose a group...')} />
                            </SelectTrigger>
                            <SelectContent>
                                {userGroups.map((g) => (
                                    <SelectItem key={g.id} value={String(g.id)}>
                                        {g.name} ({g.users_count} {t('members')})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">{t('All active members of this group will be able to acquire and process this order.')}</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignGroupDialog(false)}>{t('Cancel')}</Button>
                        <Button disabled={!selectedGroupId} onClick={handleAssignGroup}>{t('Assign Group')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Assign / Reassign Dialog ─────────────────────────────────────────── */}
            <Dialog open={reassignDialog} onOpenChange={setReassignDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            {salesOrder.assignment_status === 'unassigned' ? t('Assign Sales Order') : t('Reassign Sales Order')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 space-y-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {salesOrder.assignment_status === 'unassigned'
                                ? t('Assign this sales order to a user group or specific user(s) to process.')
                                : t('Reassigning will release the order from the current acquirer and reassign it to a group or specific user(s).')}
                        </p>

                        <div className="space-y-2">
                            <Label className="font-semibold text-sm">{t('Assignment Option')}</Label>
                            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-full">
                                <button
                                    type="button"
                                    className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${reassignType === 'group'
                                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm font-semibold'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                        }`}
                                    onClick={() => { setReassignType('group'); setSelectedGroupId(''); setSelectedUserIds([]); }}
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    {t('User Group')}
                                </button>
                                <button
                                    type="button"
                                    className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${reassignType === 'user'
                                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm font-semibold'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                        }`}
                                    onClick={() => { setReassignType('user'); setSelectedGroupId(''); setSelectedUserIds([]); }}
                                >
                                    <User className="w-3.5 h-3.5" />
                                    {t('Specific User(s)')}
                                </button>
                            </div>
                        </div>

                        {reassignType === 'group' ? (
                            <div className="space-y-2">
                                <Label htmlFor="reassign_group_select">{t('Select User Group')}</Label>
                                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                                    <SelectTrigger id="reassign_group_select">
                                        <SelectValue placeholder={t('Choose a group...')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {userGroups.map((g) => (
                                            <SelectItem key={g.id} value={String(g.id)}>
                                                {g.name} ({g.users_count} {t('members')})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>{t('Select User(s)')}</Label>
                                <MultiSelectEnhanced
                                    options={users?.map((u: any) => ({ value: String(u.id), label: `${u.name}${u.email ? ` (${u.email})` : ''}` })) || []}
                                    value={selectedUserIds}
                                    onValueChange={(selectedValues) => setSelectedUserIds(selectedValues)}
                                    placeholder={t('Select user(s)...')}
                                    searchable={true}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setReassignDialog(false)}>{t('Cancel')}</Button>
                        <Button
                            disabled={reassignType === 'group' ? !selectedGroupId : selectedUserIds.length === 0}
                            onClick={handleReassign}
                        >
                            {salesOrder.assignment_status === 'unassigned' ? t('Assign Order') : t('Reassign Order')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Cancel Order Confirmation Dialog ───────────────────────────── */}
            <ConfirmationDialog
                open={cancelOrderDialogOpen}
                onOpenChange={setCancelOrderDialogOpen}
                title={t('Cancel Sales Order')}
                message={t('Are you sure you want to cancel sales order :num? This will update the order status to cancelled.', { num: salesOrder.order_number || `#${salesOrder.id}` })}
                confirmText={t('Yes, Cancel Order')}
                cancelText={t('Keep Order')}
                onConfirm={handleConfirmCancelOrder}
                variant="destructive"
            />

            {/* ─── Release Order Confirmation Dialog ──────────────────────────── */}
            <ConfirmationDialog
                open={releaseOrderDialogOpen}
                onOpenChange={setReleaseOrderDialogOpen}
                title={t('Release Sales Order')}
                message={t('Are you sure you want to release this order? Releasing will return the order to the group queue for other members to acquire.')}
                confirmText={t('Yes, Release Order')}
                cancelText={t('Keep Acquired')}
                onConfirm={handleConfirmRelease}
            />

            {/* ─── Convert to Invoice Products & Stock Modal ─────────────────── */}
            <ConvertToInvoiceForm
                open={convertDialogOpen}
                onOpenChange={setConvertDialogOpen}
                salesOrder={salesOrder}
                orderItems={orderItems || []}
                onConfirm={handleConvertInvoice}
                processing={convertingProcessing}
            />
        </AuthenticatedLayout>
    );
}

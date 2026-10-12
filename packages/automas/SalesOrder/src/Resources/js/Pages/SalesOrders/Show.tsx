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
import { FileText, Users, UserCheck, User, Lock, RotateCcw, ArrowRight, Truck, AlertCircle, Printer, Edit, CheckCircle, Package, MapPin } from 'lucide-react';
import { useFormFields } from '@/hooks/useFormFields';
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MultiSelectEnhanced } from '@/components/ui/multi-select-enhanced';

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
    const [isConverting, setIsConverting] = useState(false);
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

    const handleConvertInvoice = () => {
        router.post(route('salesorder.orders.convert', salesOrder.id), {}, {
            onStart: () => setIsConverting(true),
            onSuccess: () => {
                setIsConverting(false);
                setConvertDialogOpen(false);
            },
            onError: () => {
                setIsConverting(false);
            },
            onFinish: () => {
                setIsConverting(false);
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
                    const steps = [
                        {
                            key: 'confirmed',
                            label: t('Confirmed'),
                            icon: CheckCircle,
                            done: true,
                            active: !['group_assigned', 'acquired'].includes(salesOrder.assignment_status) && salesOrder.delivery_status !== 'delivered',
                        },
                        {
                            key: 'group_assigned',
                            label: t('Group Assigned'),
                            icon: Users,
                            done: ['group_assigned', 'acquired'].includes(salesOrder.assignment_status),
                            active: salesOrder.assignment_status === 'group_assigned',
                        },
                        {
                            key: 'acquired',
                            label: t('Acquired'),
                            icon: Lock,
                            done: salesOrder.assignment_status === 'acquired',
                            active: salesOrder.assignment_status === 'acquired' && salesOrder.delivery_status !== 'delivered',
                        },
                        {
                            key: 'delivered',
                            label: t('Delivered'),
                            icon: Package,
                            done: salesOrder.delivery_status === 'delivered',
                            active: salesOrder.delivery_status === 'delivered',
                        },
                    ];
                    const currentStepIndex = steps.reduce((acc, s, i) => s.done ? i : acc, 0);

                    return (
                        <Card className="border-0 shadow-md bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
                            {/* Header */}
                            <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900">
                                        <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('Assignment & Delivery Workflow')}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('Track assignment and fulfilment progress')}</p>
                                    </div>
                                </div>
                                <AssignmentBadge status={salesOrder.assignment_status || 'unassigned'} />
                            </div>

                            <CardContent className="p-5 space-y-5">
                                {/* ── Workflow Timeline ── */}
                                <div className="relative">
                                    {/* Connecting line */}
                                    <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 dark:bg-slate-700" />
                                    <div
                                        className="absolute top-4 left-4 h-0.5 bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                                        style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                                    />
                                    <div className="relative flex justify-between">
                                        {steps.map((step, i) => {
                                            const Icon = step.icon;
                                            return (
                                                <div key={step.key} className="flex flex-col items-center gap-1.5" style={{ width: `${100 / steps.length}%` }}>
                                                    <div className={`z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${step.done
                                                        ? 'bg-gradient-to-br from-blue-500 to-green-500 border-transparent text-white shadow-md'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400'
                                                        } ${step.active && !step.done ? 'ring-2 ring-blue-300 ring-offset-1' : ''}`}>
                                                        <Icon className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className={`text-xs font-medium text-center leading-tight ${step.done ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                                                        {step.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* ── Info Grid ── */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {salesOrder.assigned_group && (
                                        <div className="flex items-center gap-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 shadow-sm">
                                            <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/50 shrink-0">
                                                <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{t('Assigned Group')}</p>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{salesOrder.assigned_group.name}</p>
                                            </div>
                                        </div>
                                    )}
                                    {salesOrder.assignment_status === 'acquired' && salesOrder.acquired_by_user && (
                                        <div className="flex items-center gap-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 shadow-sm">
                                            <div className="p-1.5 rounded-md bg-green-50 dark:bg-green-900/50 shrink-0">
                                                <UserCheck className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{t('Acquired By')}</p>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{salesOrder.acquired_by_user.name}</p>
                                            </div>
                                        </div>
                                    )}
                                    {salesOrder.acquired_at && (
                                        <div className="flex items-center gap-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 shadow-sm">
                                            <div className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-900/50 shrink-0">
                                                <CheckCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{t('Acquired At')}</p>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatDate(salesOrder.acquired_at)}</p>
                                            </div>
                                        </div>
                                    )}
                                    {/* Delivery Progress */}
                                    {totalOrdered > 0 && (
                                        <div className="flex items-center gap-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 shadow-sm sm:col-span-3">
                                            <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-900/50 shrink-0">
                                                <Package className="w-3.5 h-3.5 text-orange-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('Delivery Progress')}</p>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                        {totalDelivered} / {totalOrdered} ({deliveryPercentage}%)
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${deliveryPercentage === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`}
                                                        style={{ width: `${deliveryPercentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
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

            {/* ─── Convert to Invoice Confirmation Dialog ────────────────────── */}
            <ConfirmationDialog
                open={convertDialogOpen}
                onOpenChange={setConvertDialogOpen}
                title={t('Convert to Sales Invoice')}
                message={t('Are you sure you want to convert sales order :num to a sales invoice?', { num: salesOrder.order_number || `#${salesOrder.id}` })}
                confirmText={isConverting ? t('Converting...') : t('Yes, Convert')}
                cancelText={t('Cancel')}
                onConfirm={handleConvertInvoice}
                isLoading={isConverting}
            />
        </AuthenticatedLayout>
    );
}

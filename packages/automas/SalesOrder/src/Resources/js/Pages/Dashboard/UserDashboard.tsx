import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import DashboardDateFilter from '@/Components/dashboard-date-filter';
import {
    ShoppingCart,
    Truck,
    PackageCheck,
    Clock,
    Calendar as CalendarIcon,
    AlertTriangle,
    ShieldCheck,
    ArrowUpRight,
    TrendingUp,
    Sparkles,
    BarChart3,
    Trophy,
    CheckCircle2,
    Briefcase,
    FileText,
    Layers,
    Warehouse as WarehouseIcon,
    UserCheck,
    Plus,
    Eye,
    Printer,
    ChevronRight,
    ExternalLink,
    Percent,
} from 'lucide-react';
import CustomEventCalendar, { CalendarEventItem } from '@/components/custom-event-calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface UserDashboardProps {
    permissionScope?: {
        canManageAny: boolean;
        canManageOwn: boolean;
        scope: string;
        scopeLabel: string;
    };
    stats?: {
        totalOrders?: number;
        totalOrdersValue?: number;
        activeOrders?: number;
        activeOrdersValue?: number;
        fulfilledRevenue?: number;
        fulfilledCount?: number;
        todayDeliveries?: number;
        monthlyDeliveries?: number;
        completedDeliveries?: number;
        ongoingDeliveries?: number;
        overdueOrders?: number;

        todayOrders?: number;
        todayOrdersValue?: number;
        todayFulfillmentRate?: number;

        yesterdayOrders?: number;
        yesterdayOrdersValue?: number;
        yesterdayFulfillmentRate?: number;

        thisMonthOrders?: number;
        thisMonthOrdersValue?: number;
        thisMonthFulfillmentRate?: number;

        prevMonthOrders?: number;
        prevMonthOrdersValue?: number;
        prevMonthFulfillmentRate?: number;
    };
    needsAttention?: {
        overdueOrders?: number;
        overdueList?: Array<{
            id: number;
            order_number: string;
            customer_name: string;
            expected_delivery_date: string;
            days_overdue: number;
            total_amount: number;
            delivery_status: string;
            warehouse_name: string;
        }>;
        pendingDispatch?: number;
        pendingDispatchList?: Array<{
            id: number;
            order_number: string;
            customer_name: string;
            order_date: string;
            expected_delivery_date: string | null;
            total_amount: number;
            warehouse_name: string;
        }>;
        availablePool?: number;
        availablePoolList?: Array<{
            id: number;
            order_number: string;
            customer_name: string;
            group_name: string;
            order_date: string;
            total_amount: number;
        }>;
        uninvoicedOrders?: number;
        uninvoicedList?: Array<{
            id: number;
            order_number: string;
            customer_name: string;
            total_amount: number;
            delivered_at: string;
        }>;
    };
    statusBreakdown?: {
        draft: number;
        confirmed: number;
        cancelled: number;
    };
    deliveryBreakdown?: {
        pending: number;
        partial: number;
        delivered: number;
    };
    recentOrders?: Array<{
        id: number;
        order_number: string;
        customer_name: string;
        warehouse_name: string;
        order_date: string;
        expected_delivery_date: string | null;
        status: string;
        delivery_status: string;
        is_invoiced: boolean;
        total_amount: number;
    }>;
    recentDeliveries?: Array<{
        id: number;
        challan_number: string;
        sales_order_id: number;
        sales_order_number: string;
        customer_name: string;
        delivery_date: string;
        status: string;
        driver_or_creator: string;
    }>;
    calendarEvents?: CalendarEventItem[];
}

export default function SalesOrderUserDashboard({
    permissionScope,
    stats,
    needsAttention,
    statusBreakdown,
    deliveryBreakdown,
    recentOrders = [],
    recentDeliveries = [],
    calendarEvents = [],
}: UserDashboardProps) {
    const { t } = useTranslation();

    const [activeAttentionTab, setActiveAttentionTab] = useState<'overdue' | 'pendingDispatch' | 'pool' | 'uninvoiced'>('overdue');
    const [calendarFilter, setCalendarFilter] = useState<'all' | 'expected' | 'challan'>('all');

    // Currency Formatter
    const formatCompactBDT = (val: number) => {
        if (!val || val === 0) return 'BDT 0';
        if (val >= 10000000) return `BDT ${(val / 10000000).toFixed(1)}Cr`;
        if (val >= 100000) return `BDT ${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `BDT ${(val / 1000).toFixed(0)}K`;
        return `BDT ${Number(val).toLocaleString()}`;
    };

    const formatMoney = (val: number) => {
        return `BDT ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Date Subtitles for Velocity Cards
    const dateSubtitles = useMemo(() => {
        const today = new Date();
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const todayStr = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
        const yestStr = `${monthNames[yest.getMonth()]} ${yest.getDate()}, ${yest.getFullYear()}`;

        const thisMonthStart = `1 ${monthNames[today.getMonth()]}`;
        const thisMonthEnd = `${today.getDate()} ${monthNames[today.getMonth()]}, ${today.getFullYear()}`;
        const thisMonthRange = `${thisMonthStart} – ${thisMonthEnd}`;

        const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
        const prevMonthRange = `1 ${monthNames[prevMonthDate.getMonth()]} – ${lastDayOfPrevMonth} ${monthNames[prevMonthDate.getMonth()]}, ${prevMonthDate.getFullYear()}`;

        return { todayStr, yestStr, thisMonthRange, prevMonthRange };
    }, []);

    // Calendar Filtering
    const filteredCalendarEvents = useMemo(() => {
        if (calendarFilter === 'all') return calendarEvents;
        if (calendarFilter === 'expected') {
            return calendarEvents.filter(e => e.type === 'Expected Delivery');
        }
        if (calendarFilter === 'challan') {
            return calendarEvents.filter(e => e.type === 'Delivery Challan');
        }
        return calendarEvents;
    }, [calendarEvents, calendarFilter]);

    // Badges helpers
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">{t('Confirmed')}</Badge>;
            case 'cancelled':
                return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-bold text-[10px]">{t('Cancelled')}</Badge>;
            case 'draft':
            default:
                return <Badge variant="outline" className="text-slate-500 font-semibold text-[10px]">{t('Draft')}</Badge>;
        }
    };

    const getDeliveryBadge = (status: string) => {
        switch (status) {
            case 'delivered':
                return <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/20 font-bold text-[10px]">{t('Delivered')}</Badge>;
            case 'partial':
                return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold text-[10px]">{t('Partial')}</Badge>;
            case 'pending':
            default:
                return <Badge variant="outline" className="text-slate-500 border-dashed text-[10px]">{t('Pending')}</Badge>;
        }
    };

    const getChallanStatusBadge = (status: string) => {
        switch (status) {
            case 'delivered':
                return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none font-bold text-[10px]">{t('Delivered')}</Badge>;
            case 'ongoing':
                return <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-none font-bold text-[10px]">{t('Ongoing')}</Badge>;
            case 'postponed':
                return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-none font-bold text-[10px]">{t('Postponed')}</Badge>;
            default:
                return <Badge variant="outline" className="text-slate-500 text-[10px]">{t('Created')}</Badge>;
        }
    };

    return (
        <AuthenticatedLayout breadcrumbs={[{ label: t('My Sales Order Dashboard') }]}>
            <Head title={t('My Sales Order Dashboard')} />

            <div className="space-y-6 pb-8">
                {/* ── Header Title & Scope Indicator ────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {t('My Sales Order Dashboard')}
                            </h1>
                            {permissionScope?.scopeLabel && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                    <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                    {permissionScope.scopeLabel}
                                </span>
                            )}
                        </div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            {t('Personal sales order booking, fulfillment tracking, overdue dispatches, and schedule.')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                        <DashboardDateFilter />
                        <Button variant="outline" size="sm" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold" asChild>
                            <Link href={route('salesorder.deliveries.index')}>
                                <Truck className="mr-1.5 h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                {t('Delivery Challans')}
                            </Link>
                        </Button>
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-600/30" asChild>
                            <Link href={route('salesorder.orders.create')}>
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                {t('Create Order')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* ── 1. MERGED PERSONAL SALES COCKPIT & PERFORMANCE VELOCITY ─────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    {/* LEFT COCKPIT: My Order Pipeline & Operational Health (lg:col-span-4) */}
                    <div className="lg:col-span-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 backdrop-blur-xl rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
                        {/* Glow ambient effects */}
                        <div className="absolute -top-12 -left-12 w-44 h-44 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-12 -right-12 w-44 h-44 bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 space-y-4">
                            {/* Header: Title + Assigned Total Orders */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
                                        <Briefcase className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                            {t('My Order Pipeline')}
                                        </h2>
                                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                            {t('Active bookings & fulfillment')}
                                        </span>
                                    </div>
                                </div>

                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                    <ShoppingCart className="w-3 h-3 text-indigo-500" />
                                    <span>{(stats?.totalOrders ?? 0).toLocaleString()} {t('orders')}</span>
                                </div>
                            </div>

                            {/* 2 Primary Financial Cards (Active Pipeline Value & Fulfilled Revenue) */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Active Orders & Value */}
                                <div className="bg-teal-500/5 dark:bg-teal-500/10 border border-teal-200/80 dark:border-teal-500/20 rounded-2xl p-3.5 relative overflow-hidden flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                                            {t('Active Orders')}
                                        </span>
                                        <div className="w-6 h-6 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                                            <ShoppingCart className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                                            {formatCompactBDT(stats?.activeOrdersValue ?? 0)}
                                        </div>
                                        <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1 mt-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                            {stats?.activeOrders ?? 0} {t('in progress')}
                                        </span>
                                    </div>
                                </div>

                                {/* Fulfilled Revenue */}
                                <div className="bg-purple-500/5 dark:bg-purple-500/10 border border-purple-200/80 dark:border-purple-500/20 rounded-2xl p-3.5 relative overflow-hidden flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                                            {t('Fulfilled')}
                                        </span>
                                        <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                            <PackageCheck className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                                            {formatCompactBDT(stats?.fulfilledRevenue ?? 0)}
                                        </div>
                                        <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                            {stats?.fulfilledCount ?? 0} {t('delivered mth')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Activity & Execution Strip (Deliveries, Ongoing, Overdue) */}
                        <div className="relative z-10 pt-4 mt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                <span>{t('Dispatch & Execution')}</span>
                                <span>{t('This Month')}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {/* Deliveries Completed */}
                                <div className="bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-900/40 rounded-xl p-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1 text-sky-600 dark:text-sky-400 mb-0.5">
                                        <Truck className="w-3 h-3" />
                                        <span className="text-[10px] font-bold">{t('Dispatched')}</span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                                        {stats?.todayDeliveries ?? 0}
                                    </div>
                                    <span className="text-[9px] text-slate-400 block truncate font-medium">
                                        {stats?.monthlyDeliveries ?? 0} {t('total')}
                                    </span>
                                </div>

                                {/* Completed Challans */}
                                <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl p-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-0.5">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span className="text-[10px] font-bold">{t('Delivered')}</span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                                        {stats?.completedDeliveries ?? 0}
                                    </div>
                                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium block truncate">
                                        {stats?.ongoingDeliveries ?? 0} {t('ongoing')}
                                    </span>
                                </div>

                                {/* Overdue Alert Action */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const el = document.getElementById('so-needs-attention-section');
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                        setActiveAttentionTab('overdue');
                                    }}
                                    className="bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 rounded-xl p-2.5 text-center hover:bg-rose-100/80 dark:hover:bg-rose-900/60 transition-all cursor-pointer group/btn"
                                    title={t('Jump to Overdue Deliveries')}
                                >
                                    <div className="flex items-center justify-center gap-1 text-rose-600 dark:text-rose-400 mb-0.5">
                                        <AlertTriangle className="w-3 h-3 animate-pulse" />
                                        <span className="text-[10px] font-bold">{t('Overdue')}</span>
                                    </div>
                                    <div className="text-sm font-black text-rose-600 dark:text-rose-400">
                                        {stats?.overdueOrders ?? 0}
                                    </div>
                                    <span className="text-[9px] text-rose-600 dark:text-rose-400 font-bold block truncate underline underline-offset-2">
                                        {t('Action')} →
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT VELOCITY DECK: 4 Period Cards (lg:col-span-8) */}
                    <div className="lg:col-span-8 flex flex-col justify-between">
                        {/* Header Bar */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                        {t('Sales Order Velocity')}
                                    </h3>
                                    <p className="text-[11px] font-medium text-slate-400">
                                        {t('Orders booked, monetary values and fulfillment across comparative periods')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                                    <ShoppingCart className="w-3 h-3" />
                                    {t('Orders')}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200/60 dark:border-emerald-800/60">
                                    <Percent className="w-3 h-3" />
                                    {t('Fulfillment')}
                                </span>
                            </div>
                        </div>

                        {/* 4 Performance Period Cards in 2x2 Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
                            {[
                                {
                                    label: t("Today"),
                                    dateSub: dateSubtitles.todayStr,
                                    orders: stats?.todayOrders ?? 0,
                                    value: stats?.todayOrdersValue ?? 0,
                                    rate: stats?.todayFulfillmentRate ?? 0,
                                    icon: <Sparkles className="w-4 h-4" />,
                                    cardBg: 'bg-[#f4f7ff] dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40',
                                    iconBg: 'bg-blue-100/80 dark:bg-blue-900/60 text-blue-500 dark:text-blue-400',
                                    numColor: 'text-blue-600 dark:text-blue-400',
                                    rateColor: 'text-blue-600 dark:text-blue-400',
                                    waveColor: '#3b82f6',
                                    gradId: 'soWaveTodayGrad',
                                },
                                {
                                    label: t("Yesterday"),
                                    dateSub: dateSubtitles.yestStr,
                                    orders: stats?.yesterdayOrders ?? 0,
                                    value: stats?.yesterdayOrdersValue ?? 0,
                                    rate: stats?.yesterdayFulfillmentRate ?? 0,
                                    icon: <Clock className="w-4 h-4" />,
                                    cardBg: 'bg-[#f0fbf5] dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40',
                                    iconBg: 'bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-500 dark:text-emerald-400',
                                    numColor: 'text-emerald-500 dark:text-emerald-400',
                                    rateColor: 'text-emerald-500 dark:text-emerald-400',
                                    waveColor: '#10b981',
                                    gradId: 'soWaveYesterdayGrad',
                                },
                                {
                                    label: t("This Month"),
                                    dateSub: dateSubtitles.thisMonthRange,
                                    orders: stats?.thisMonthOrders ?? 0,
                                    value: stats?.thisMonthOrdersValue ?? 0,
                                    rate: stats?.thisMonthFulfillmentRate ?? 0,
                                    icon: <BarChart3 className="w-4 h-4" />,
                                    cardBg: 'bg-[#fffbf0] dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40',
                                    iconBg: 'bg-amber-100/80 dark:bg-amber-900/60 text-amber-500 dark:text-amber-400',
                                    numColor: 'text-amber-500 dark:text-amber-400',
                                    rateColor: 'text-amber-500 dark:text-amber-400',
                                    waveColor: '#f59e0b',
                                    gradId: 'soWaveThisMonthGrad',
                                },
                                {
                                    label: t("Previous Month"),
                                    dateSub: dateSubtitles.prevMonthRange,
                                    orders: stats?.prevMonthOrders ?? 0,
                                    value: stats?.prevMonthOrdersValue ?? 0,
                                    rate: stats?.prevMonthFulfillmentRate ?? 0,
                                    icon: <Trophy className="w-4 h-4" />,
                                    cardBg: 'bg-[#fff5f6] dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40',
                                    iconBg: 'bg-rose-100/80 dark:bg-rose-900/60 text-rose-500 dark:text-rose-400',
                                    numColor: 'text-rose-500 dark:text-rose-400',
                                    rateColor: 'text-rose-500 dark:text-rose-400',
                                    waveColor: '#f43f5e',
                                    gradId: 'soWavePrevMonthGrad',
                                },
                            ].map((item, idx) => (
                                <div key={idx} className={`relative ${item.cardBg} rounded-2xl p-4 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden min-h-[140px]`}>
                                    {/* Header: Title, Subtitle Date & Soft Icon Badge */}
                                    <div className="flex items-start justify-between z-10">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                                {item.label}
                                            </h4>
                                            <p className="text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">
                                                {item.dateSub}
                                            </p>
                                        </div>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg}`}>
                                            {item.icon}
                                        </div>
                                    </div>

                                    {/* Center Metric: Orders Count / Monetary Value */}
                                    <div className="my-2 z-10">
                                        <div className="flex items-baseline gap-2">
                                            <div>
                                                <span className={`text-xl font-black leading-none ${item.numColor}`}>
                                                    {item.orders.toLocaleString()}
                                                </span>
                                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-1">
                                                    {t('Orders')}
                                                </span>
                                            </div>
                                            <span className="text-base font-light text-slate-300 dark:text-slate-600 leading-none">
                                                /
                                            </span>
                                            <div>
                                                <span className="text-sm font-black leading-none text-slate-700 dark:text-slate-200">
                                                    {formatCompactBDT(item.value)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Row: Fulfillment Rate & Sparkline Wave Graph with Dot */}
                                    <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/40 flex items-end justify-between z-10">
                                        <div>
                                            <div className={`text-sm font-black ${item.rateColor}`}>
                                                {item.rate}%
                                            </div>
                                            <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500">
                                                {t('Fulfillment Rate')}
                                            </p>
                                        </div>
                                        <div className="w-[100px] h-[30px] pb-0.5">
                                            <svg viewBox="0 0 150 40" className="w-full h-full overflow-visible">
                                                <defs>
                                                    <linearGradient id={item.gradId} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor={item.waveColor} stopOpacity="0.35" />
                                                        <stop offset="100%" stopColor={item.waveColor} stopOpacity="0.0" />
                                                    </linearGradient>
                                                </defs>
                                                <path d="M 0 30 Q 30 35, 50 20 T 100 25 T 150 8 L 150 40 L 0 40 Z" fill={`url(#${item.gradId})`} />
                                                <path d="M 0 30 Q 30 35, 50 20 T 100 25 T 150 8" fill="none" stroke={item.waveColor} strokeWidth="2.5" strokeLinecap="round" />
                                                <circle cx="150" cy="8" r="3.5" fill={item.waveColor} />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── 2. Middle Section: Needs Attention Action Center & Breakdowns ───── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Needs Attention Action Center (Col 8) */}
                    <div id="so-needs-attention-section" className="lg:col-span-8 bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 backdrop-blur-xl rounded-3xl p-5 shadow-sm hover:shadow-md transition-all">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-amber-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-500/20">
                                    <AlertTriangle className="w-4 h-4 animate-bounce" style={{ animationDuration: '2s' }} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                        {t('Needs Attention')}
                                    </h3>
                                    <p className="text-[11px] font-semibold text-slate-400">
                                        {t('Actionable items requiring priority delivery, dispatch or billing')}
                                    </p>
                                </div>
                            </div>

                            {/* Segmented Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                <button
                                    onClick={() => setActiveAttentionTab('overdue')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activeAttentionTab === 'overdue'
                                            ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                >
                                    <span>{t('Overdue')}</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                                        {needsAttention?.overdueOrders ?? 0}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveAttentionTab('pendingDispatch')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activeAttentionTab === 'pendingDispatch'
                                            ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                >
                                    <span>{t('Pending Dispatch')}</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                                        {needsAttention?.pendingDispatch ?? 0}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveAttentionTab('pool')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activeAttentionTab === 'pool'
                                            ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                >
                                    <span>{t('Group Pool')}</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                                        {needsAttention?.availablePool ?? 0}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveAttentionTab('uninvoiced')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activeAttentionTab === 'uninvoiced'
                                            ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                >
                                    <span>{t('Un-invoiced')}</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                                        {needsAttention?.uninvoicedOrders ?? 0}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Attention Lists Content */}
                        <div className="pt-4 min-h-[220px]">
                            {/* 1. Overdue Deliveries */}
                            {activeAttentionTab === 'overdue' && (
                                <div className="space-y-2.5">
                                    {(needsAttention?.overdueList || []).length === 0 ? (
                                        <div className="text-center py-10">
                                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('All Caught Up!')}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{t('No overdue deliveries in your portfolio.')}</p>
                                        </div>
                                    ) : (
                                        needsAttention?.overdueList?.map((so) => (
                                            <div
                                                key={so.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 gap-3 hover:border-rose-300 transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                                                        !
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Link
                                                                href={route('salesorder.orders.show', so.id)}
                                                                className="text-xs font-black text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                                                            >
                                                                #{so.order_number}
                                                                <ArrowUpRight className="w-3 h-3" />
                                                            </Link>
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                                {so.customer_name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                            <span>{t('Due')}: {so.expected_delivery_date}</span>
                                                            <span>·</span>
                                                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                                                                {so.days_overdue} {t('days overdue')}
                                                            </span>
                                                            <span>·</span>
                                                            <span>{so.warehouse_name}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                                                    <span className="text-xs font-black text-slate-900 dark:text-white">
                                                        {formatMoney(so.total_amount)}
                                                    </span>
                                                    <Button size="sm" variant="outline" className="h-7 text-xs border-rose-300 text-rose-700 dark:text-rose-300 bg-white dark:bg-slate-900 hover:bg-rose-50 font-bold" asChild>
                                                        <Link href={route('salesorder.orders.deliveries.create', so.id)}>
                                                            <Truck className="w-3 h-3 mr-1 text-rose-500" />
                                                            {t('Dispatch')}
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* 2. Pending Dispatch */}
                            {activeAttentionTab === 'pendingDispatch' && (
                                <div className="space-y-2.5">
                                    {(needsAttention?.pendingDispatchList || []).length === 0 ? (
                                        <div className="text-center py-10">
                                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('No Pending Dispatches')}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{t('All confirmed orders have active delivery challans.')}</p>
                                        </div>
                                    ) : (
                                        needsAttention?.pendingDispatchList?.map((so) => (
                                            <div
                                                key={so.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/70 dark:border-sky-900/40 gap-3 hover:border-sky-300 transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                                        <Truck className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Link
                                                                href={route('salesorder.orders.show', so.id)}
                                                                className="text-xs font-black text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                                                            >
                                                                #{so.order_number}
                                                                <ArrowUpRight className="w-3 h-3" />
                                                            </Link>
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                                {so.customer_name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                            <span>{t('Booked')}: {so.order_date}</span>
                                                            <span>·</span>
                                                            <span>{so.warehouse_name}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                                                    <span className="text-xs font-black text-slate-900 dark:text-white">
                                                        {formatMoney(so.total_amount)}
                                                    </span>
                                                    <Button size="sm" className="h-7 text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold" asChild>
                                                        <Link href={route('salesorder.orders.deliveries.create', so.id)}>
                                                            <Plus className="w-3 h-3 mr-1" />
                                                            {t('Create Challan')}
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* 3. Available Group Pool */}
                            {activeAttentionTab === 'pool' && (
                                <div className="space-y-2.5">
                                    {(needsAttention?.availablePoolList || []).length === 0 ? (
                                        <div className="text-center py-10">
                                            <CheckCircle2 className="w-10 h-10 text-purple-500 mx-auto mb-2 opacity-80" />
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('No Pool Orders')}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{t('No unassigned orders waiting in your group pool.')}</p>
                                        </div>
                                    ) : (
                                        needsAttention?.availablePoolList?.map((so) => (
                                            <div
                                                key={so.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-900/40 gap-3 hover:border-purple-300 transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                                        <UserCheck className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Link
                                                                href={route('salesorder.orders.show', so.id)}
                                                                className="text-xs font-black text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                                                            >
                                                                #{so.order_number}
                                                                <ArrowUpRight className="w-3 h-3" />
                                                            </Link>
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                                {so.customer_name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                            <span className="font-semibold text-purple-700 dark:text-purple-300">{so.group_name}</span>
                                                            <span>·</span>
                                                            <span>{so.order_date}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                                                    <span className="text-xs font-black text-slate-900 dark:text-white">
                                                        {formatMoney(so.total_amount)}
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold"
                                                        onClick={() => router.post(route('salesorder.orders.acquire', so.id))}
                                                    >
                                                        <UserCheck className="w-3 h-3 mr-1" />
                                                        {t('Acquire')}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* 4. Delivered But Un-Invoiced */}
                            {activeAttentionTab === 'uninvoiced' && (
                                <div className="space-y-2.5">
                                    {(needsAttention?.uninvoicedList || []).length === 0 ? (
                                        <div className="text-center py-10">
                                            <CheckCircle2 className="w-10 h-10 text-amber-500 mx-auto mb-2 opacity-80" />
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('All Deliveries Invoiced')}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{t('No pending invoices for delivered orders.')}</p>
                                        </div>
                                    ) : (
                                        needsAttention?.uninvoicedList?.map((so) => (
                                            <div
                                                key={so.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 gap-3 hover:border-amber-300 transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Link
                                                                href={route('salesorder.orders.show', so.id)}
                                                                className="text-xs font-black text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                                                            >
                                                                #{so.order_number}
                                                                <ArrowUpRight className="w-3 h-3" />
                                                            </Link>
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                                {so.customer_name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                            <span>{t('Delivered')}: {so.delivered_at}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                                                    <span className="text-xs font-black text-slate-900 dark:text-white">
                                                        {formatMoney(so.total_amount)}
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                                        onClick={() => router.post(route('salesorder.orders.convert', so.id))}
                                                    >
                                                        <FileText className="w-3 h-3 mr-1" />
                                                        {t('Generate Invoice')}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Order Pipeline Breakdown Gauge (Col 4) */}
                    <div className="lg:col-span-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 backdrop-blur-xl rounded-3xl p-5 shadow-sm hover:shadow-md transition-all space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                <Layers className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                {t('Fulfillment Status')}
                            </h3>
                        </div>

                        {/* Delivery Progress Bar */}
                        <div className="space-y-3 pt-1">
                            <div>
                                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                                    <span className="text-slate-600 dark:text-slate-400">{t('Delivery Completion')}</span>
                                    <span className="font-bold text-teal-600 dark:text-teal-400">
                                        {deliveryBreakdown?.delivered ?? 0} / {(stats?.totalOrders ?? 0)}
                                    </span>
                                </div>
                                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                                    <div
                                        className="bg-teal-500 h-full transition-all"
                                        style={{ width: `${(stats?.totalOrders ?? 0) > 0 ? ((deliveryBreakdown?.delivered ?? 0) / (stats?.totalOrders ?? 1)) * 100 : 0}%` }}
                                        title={t('Delivered')}
                                    />
                                    <div
                                        className="bg-amber-500 h-full transition-all"
                                        style={{ width: `${(stats?.totalOrders ?? 0) > 0 ? ((deliveryBreakdown?.partial ?? 0) / (stats?.totalOrders ?? 1)) * 100 : 0}%` }}
                                        title={t('Partially Delivered')}
                                    />
                                    <div
                                        className="bg-slate-300 dark:bg-slate-700 h-full transition-all"
                                        style={{ width: `${(stats?.totalOrders ?? 0) > 0 ? ((deliveryBreakdown?.pending ?? 0) / (stats?.totalOrders ?? 1)) * 100 : 0}%` }}
                                        title={t('Pending')}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                                    <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                                        {deliveryBreakdown?.delivered ?? 0} {t('Delivered')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                        {deliveryBreakdown?.partial ?? 0} {t('Partial')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                                        {deliveryBreakdown?.pending ?? 0} {t('Pending')}
                                    </span>
                                </div>
                            </div>

                            {/* Commercial Status */}
                            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800">
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                                    {t('Commercial State')}
                                </span>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                                        <span className="text-[10px] text-slate-400 font-bold block">{t('Draft')}</span>
                                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{statusBreakdown?.draft ?? 0}</span>
                                    </div>
                                    <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">{t('Confirmed')}</span>
                                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{statusBreakdown?.confirmed ?? 0}</span>
                                    </div>
                                    <div className="p-2 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
                                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">{t('Cancelled')}</span>
                                        <span className="text-sm font-black text-rose-600 dark:text-rose-400">{statusBreakdown?.cancelled ?? 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 3. Recent Activity: Orders & Delivery Challans ──────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Sales Orders */}
                    <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 backdrop-blur-xl rounded-3xl p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    <ShoppingCart className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                        {t('My Recent Orders')}
                                    </h3>
                                    <p className="text-[11px] font-medium text-slate-400">
                                        {t('Latest bookings in your assigned portfolio')}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-indigo-600 dark:text-indigo-400" asChild>
                                <Link href={route('salesorder.orders.index')}>
                                    {t('View All')} →
                                </Link>
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-200/80 dark:border-slate-800">
                                        <TableHead className="text-[11px] font-bold text-slate-500">{t('Order #')}</TableHead>
                                        <TableHead className="text-[11px] font-bold text-slate-500">{t('Customer')}</TableHead>
                                        <TableHead className="text-[11px] font-bold text-slate-500">{t('Date')}</TableHead>
                                        <TableHead className="text-[11px] font-bold text-slate-500">{t('Status')}</TableHead>
                                        <TableHead className="text-[11px] font-bold text-slate-500 text-right">{t('Amount')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentOrders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-6 text-xs text-slate-400">
                                                {t('No sales orders found.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recentOrders.map((so) => (
                                            <TableRow key={so.id} className="border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                                <TableCell className="font-bold text-xs">
                                                    <Link href={route('salesorder.orders.show', so.id)} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                                        #{so.order_number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                                                    {so.customer_name}
                                                </TableCell>
                                                <TableCell className="text-[11px] text-slate-400">
                                                    {so.order_date}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        {getStatusBadge(so.status)}
                                                        {getDeliveryBadge(so.delivery_status)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-black text-slate-900 dark:text-white text-right">
                                                    {formatMoney(so.total_amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Recent Delivery Challans */}
                    <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 backdrop-blur-xl rounded-3xl p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                    <Truck className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                        {t('Recent Delivery Challans')}
                                    </h3>
                                    <p className="text-[11px] font-medium text-slate-400">
                                        {t('Dispatches and transit status')}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-teal-600 dark:text-teal-400" asChild>
                                <Link href={route('salesorder.deliveries.index')}>
                                    {t('View All')} →
                                </Link>
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-200/80 dark:border-slate-800">
                                        <TableHead className="text-[11px] font-bold text-slate-500">{t('Challan #')}</TableHead>
                                        <TableHead className="text-[11px] font-bold text-slate-500">{t('Order #')}</TableHead>
                                        <TableHead className="text-[11px] font-bold text-slate-500">{t('Customer')}</TableHead>
                                        <TableHead className="text-[11px] font-bold text-slate-500">{t('Date')}</TableHead>
                                        <TableHead className="text-[11px] font-bold text-slate-500 text-right">{t('Status')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentDeliveries.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-6 text-xs text-slate-400">
                                                {t('No delivery challans recorded.')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recentDeliveries.map((dc) => (
                                            <TableRow key={dc.id} className="border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                                <TableCell className="font-bold text-xs">
                                                    <Link href={route('salesorder.deliveries.show', dc.id)} className="text-teal-600 dark:text-teal-400 hover:underline">
                                                        #{dc.challan_number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                    <Link href={route('salesorder.orders.show', dc.sales_order_id)} className="hover:underline">
                                                        #{dc.sales_order_number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                                                    {dc.customer_name}
                                                </TableCell>
                                                <TableCell className="text-[11px] text-slate-400">
                                                    {dc.delivery_date}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {getChallanStatusBadge(dc.status)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                {/* ── 4. Interactive Schedules & Deliveries Calendar ─────────────────── */}
                <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 backdrop-blur-xl rounded-3xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-4 border-b border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                    {t('Order & Delivery Calendar')}
                                </h3>
                                <p className="text-xs font-medium text-slate-400">
                                    {t('Scheduled delivery dates, challan dispatches, and deadlines')}
                                </p>
                            </div>
                        </div>

                        {/* Segmented Filter Switch */}
                        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 self-start sm:self-auto border border-slate-200/80 dark:border-slate-700">
                            <button
                                onClick={() => setCalendarFilter('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${calendarFilter === 'all'
                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                            >
                                {t('All Events')} ({calendarEvents.length})
                            </button>
                            <button
                                onClick={() => setCalendarFilter('expected')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${calendarFilter === 'expected'
                                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                {t('Expected Deliveries')}
                            </button>
                            <button
                                onClick={() => setCalendarFilter('challan')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${calendarFilter === 'challan'
                                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                {t('Delivery Challans')}
                            </button>
                        </div>
                    </div>

                    <div className="pt-2">
                        <CustomEventCalendar events={filteredCalendarEvents} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

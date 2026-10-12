import React, { useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    ShoppingCart,
    Truck,
    Clock,
    Calendar as CalendarIcon,
    Plus,
    TrendingUp,
    PackageCheck,
    Eye,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import AuthenticatedLayout from '@/layouts/authenticated-layout';
import DashboardDateFilter from '@/Components/dashboard-date-filter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CustomEventCalendar, { CalendarEventItem } from '@/components/custom-event-calendar';

interface StatItem {
    count: number;
    value: number;
}

interface StatSummary {
    total_so: StatItem;
    this_month: StatItem;
    pending: StatItem;
    partially_delivered: StatItem;
}

interface ChallanChartItem {
    date: string;
    full_date: string;
    total: number;
    delivered: number;
}

interface SalesOrderRow {
    id: number;
    order_number: string;
    customer_name: string;
    warehouse_name: string;
    order_date: string | null;
    expected_delivery_date: string | null;
    status: string;
    delivery_status: string;
    total_amount: number;
}

interface DeliveryChallanRow {
    id: number;
    delivery_number: string;
    sales_order_id: number;
    sales_order_number: string;
    customer_name: string;
    delivery_date: string | null;
    status: string;
}

interface CompanyDashboardProps {
    stats: StatSummary;
    challanChartData: ChallanChartItem[];
    last5SO: SalesOrderRow[];
    last5DC: DeliveryChallanRow[];
    calendarEvents: CalendarEventItem[];
}

export default function SalesOrderCompanyDashboard({
    stats,
    challanChartData = [],
    last5SO = [],
    last5DC = [],
    calendarEvents = [],
}: CompanyDashboardProps) {
    const { t } = useTranslation();

    const formatMoney = (val: number) => {
        return `BDT ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getDeliveryStatusBadge = (status: string) => {
        switch (status) {
            case 'delivered':
                return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">{t('Delivered')}</Badge>;
            case 'partial':
            case 'partially_delivered':
                return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold text-[10px]">{t('Partially Delivered')}</Badge>;
            case 'pending':
            default:
                return <Badge variant="outline" className="text-slate-500 text-[10px] font-semibold">{t('Pending')}</Badge>;
        }
    };

    return (
        <AuthenticatedLayout breadcrumbs={[{ label: t('Sales Orders') }]}>
            <Head title={t('Sales Order Company Dashboard')} />

            <div className="space-y-6 pb-8">
                {/* Header Title Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            {t('Sales Order Dashboard')}
                        </h1>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            {t('Company-wide overview of sales orders, delivery challans, dispatches, and fulfillment analytics.')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <DashboardDateFilter />
                        <Button variant="outline" size="sm" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold" asChild>
                            <Link href={route('salesorder.deliveries.index')}>
                                <Truck className="mr-1.5 h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                {t('Delivery Challans')}
                            </Link>
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs" asChild>
                            <Link href={route('salesorder.orders.create')}>
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                {t('Create Order')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* ── 1. Summary Cards (4 Metrics with Soft Gradients) ────── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Card 1: Total Sales Orders */}
                    <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-100/90 dark:border-blue-900/50 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block leading-tight">{t('Total Sales Orders')}</span>
                            <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">{stats?.total_so?.count || 0}</span>
                            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block mt-0.5">
                                {formatMoney(stats?.total_so?.value || 0)}
                            </span>
                        </div>
                    </div>

                    {/* Card 2: This Month Orders */}
                    <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/60 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-100/90 dark:border-emerald-900/50 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block leading-tight">{t('This Month Orders')}</span>
                            <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">{stats?.this_month?.count || 0}</span>
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                {formatMoney(stats?.this_month?.value || 0)}
                            </span>
                        </div>
                    </div>

                    {/* Card 3: Pending Orders */}
                    <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-100/90 dark:border-amber-900/50 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block leading-tight">{t('Pending Orders')}</span>
                            <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">{stats?.pending?.count || 0}</span>
                            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block mt-0.5">
                                {formatMoney(stats?.pending?.value || 0)}
                            </span>
                        </div>
                    </div>

                    {/* Card 4: Partially Delivered */}
                    <div className="bg-gradient-to-br from-purple-50/80 to-fuchsia-50/60 dark:from-purple-950/40 dark:to-fuchsia-950/30 border border-purple-100/90 dark:border-purple-900/50 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <PackageCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block leading-tight">{t('Partially Delivered')}</span>
                            <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">{stats?.partially_delivered?.count || 0}</span>
                            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 block mt-0.5">
                                {formatMoney(stats?.partially_delivered?.value || 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── 2. Delivery Challan Analytics Chart ────────────────────────── */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('Delivery Challan Analytics')}</h3>
                            <p className="text-xs font-semibold text-slate-400">{t('Daily trend of created and completed delivery challans')}</p>
                        </div>
                        <Badge variant="outline" className="text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800">
                            {t('Last 15 Days')}
                        </Badge>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={challanChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="totalChallans" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="deliveredChallans" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        borderRadius: '8px',
                                        border: '1px solid #334155',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                    }}
                                />
                                <Area type="monotone" dataKey="total" name={t('Challans Created')} stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#totalChallans)" />
                                <Area type="monotone" dataKey="delivered" name={t('Delivered')} stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#deliveredChallans)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── 3 & 4. Recent Sales Orders & Recent Delivery Challans Tables ────── */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Recent Sales Orders */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm flex flex-col h-[380px]">
                        <div className="flex flex-row items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('Recent Sales Orders')}</h3>
                                <p className="text-xs font-semibold text-slate-400">{t('Most recent sales orders')}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700 font-bold" asChild>
                                <Link href={route('salesorder.orders.index')}>
                                    {t('View All')}
                                </Link>
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1">
                            {last5SO.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b border-slate-100 dark:border-slate-800">
                                            <TableHead className="text-[11px] font-bold text-slate-400 uppercase">{t('SO Number')}</TableHead>
                                            <TableHead className="text-[11px] font-bold text-slate-400 uppercase">{t('Customer')}</TableHead>
                                            <TableHead className="text-[11px] font-bold text-slate-400 uppercase">{t('Status')}</TableHead>
                                            <TableHead className="text-[11px] font-bold text-slate-400 uppercase text-right">{t('Amount')}</TableHead>
                                            <TableHead className="text-[11px] font-bold text-slate-400 uppercase text-right">{t('Action')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {last5SO.map((so) => (
                                            <TableRow key={so.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 border-b border-slate-50 dark:border-slate-800">
                                                <TableCell className="font-bold text-xs">
                                                    <Link href={route('salesorder.orders.show', so.id)} className="text-blue-600 hover:underline">
                                                        {so.order_number}
                                                    </Link>
                                                    <span className="block text-[10px] font-normal text-slate-400 mt-0.5">{so.order_date}</span>
                                                </TableCell>
                                                <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">{so.customer_name}</TableCell>
                                                <TableCell>{getDeliveryStatusBadge(so.delivery_status)}</TableCell>
                                                <TableCell className="text-right text-xs font-extrabold text-slate-900 dark:text-white">
                                                    {formatMoney(so.total_amount)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-blue-600" asChild>
                                                        <Link href={route('salesorder.orders.show', so.id)}>
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex h-40 items-center justify-center text-xs text-slate-400 font-semibold">
                                    {t('No sales orders created yet.')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Delivery Challans */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm flex flex-col h-[380px]">
                        <div className="flex flex-row items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('Recent Delivery Challans')}</h3>
                                <p className="text-xs font-semibold text-slate-400">{t('Most recent delivery dispatches')}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700 font-bold" asChild>
                                <Link href={route('salesorder.deliveries.index')}>
                                    {t('View All')}
                                </Link>
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1">
                            {last5DC.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b border-slate-100 dark:border-slate-800">
                                            <TableHead className="text-[11px] font-bold text-slate-400 uppercase">{t('Challan No.')}</TableHead>
                                            <TableHead className="text-[11px] font-bold text-slate-400 uppercase">{t('SO Ref')}</TableHead>
                                            <TableHead className="text-[11px] font-bold text-slate-400 uppercase">{t('Customer')}</TableHead>
                                            <TableHead className="text-[11px] font-bold text-slate-400 uppercase">{t('Status')}</TableHead>
                                            <TableHead className="text-[11px] font-bold text-slate-400 uppercase text-right">{t('Action')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {last5DC.map((dc) => (
                                            <TableRow key={dc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 border-b border-slate-50 dark:border-slate-800">
                                                <TableCell className="font-bold text-xs">
                                                    <Link href={route('salesorder.deliveries.show', dc.id)} className="text-blue-600 hover:underline">
                                                        {dc.delivery_number}
                                                    </Link>
                                                    <span className="block text-[10px] font-normal text-slate-400 mt-0.5">{dc.delivery_date}</span>
                                                </TableCell>
                                                <TableCell className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">{dc.sales_order_number}</TableCell>
                                                <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">{dc.customer_name}</TableCell>
                                                <TableCell>{getDeliveryStatusBadge(dc.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-blue-600" asChild>
                                                        <Link href={route('salesorder.deliveries.show', dc.id)}>
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex h-40 items-center justify-center text-xs text-slate-400 font-semibold">
                                    {t('No delivery challans issued yet.')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── 5. Delivery Calendar ────────────────────────────────────────── */}
                <CustomEventCalendar
                    title={t('Delivery Schedule Calendar')}
                    description={t('Track expected delivery dates and actual challan events')}
                    headerIcon={<CalendarIcon className="h-5 w-5 text-blue-600" />}
                    events={calendarEvents}
                    selectedDateTitlePrefix={t('Deliveries on')}
                    eventsSummaryText={t('scheduled or actual delivery events')}
                    emptyText={t('No delivery events scheduled on this date.')}
                />
            </div>
        </AuthenticatedLayout>
    );
}

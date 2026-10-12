import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import DashboardDateFilter from "@/Components/dashboard-date-filter";
import {
    Users,
    Handshake,
    BarChart3,
    Trophy,
    Phone,
    Calendar,
    CheckCircle2,
    Clock,
    Target,
    TrendingUp,
    Sparkles,
    AlertTriangle,
    Activity,
    ShieldCheck,
    Layers,
    ListTodo,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    ArrowUpRight,
    Briefcase,
    Building2,
    Trophy,
    Sparkles,
} from 'lucide-react';
import CustomEventCalendar, { CalendarEventItem } from '@/components/custom-event-calendar';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency, formatCompactCurrency } from '@/utils/helpers';

interface UserDashboardProps {
    message?: string;
    stats?: {
        todayLeads?: number;
        yesterdayLeads?: number;
        thisMonthLeads?: number;
        prevMonthLeads?: number;
        avgDailyLeads?: number;
        monthlyLeads?: number;
        totalLeads?: number;

        todayDeals?: number;
        yesterdayDeals?: number;
        thisMonthDeals?: number;
        prevMonthDeals?: number;

        convertedDeals?: number;
        activeDeals?: number;
        openDealValue?: number;
        wonDeals?: number;
        wonDealAmount?: number;
        wonDealsThisMonth?: number;
        lostDeals?: number;
        totalAmount?: number;

        todayCalls?: number;
        yesterdayCalls?: number;
        monthlyCalls?: number;
        totalCalls?: number;

        completedTasks?: number;
        pendingTasks?: number;
        followupsToday?: number;
        followupLeadsToday?: number;
        followupDealsToday?: number;
        overdueTasks?: number;
        overdueLeadTasks?: number;
    };
    needsAttention?: {
        followupLeadsToday?: number;
        overdueLeadTasks?: number;
        overdueDealTasks?: number;
        followupDealsToday?: number;
        uncontactedLeads?: number;
        unassignedLeads?: number;
        inactiveDeals?: number;
    };
    permissionScope?: {
        canManageAnyLeads?: boolean;
        canManageAnyDeals?: boolean;
        scopeLabel?: string;
    };
    recentDeals?: any[];
    recentLeads?: any[];
    calendarEvents?: CalendarEventItem[];
    followupEvents?: CalendarEventItem[];
    organizationTypeConversion?: any[];
}



export default function UserDashboard({
    stats,
    needsAttention,
    permissionScope,
    recentDeals = [],
    recentLeads = [],
    calendarEvents = [],
    followupEvents = [],
    organizationTypeConversion = [],
}: UserDashboardProps) {
    const { t } = useTranslation();

    const [activeCalendarTab, setActiveCalendarTab] = useState<'followups' | 'tasks'>('followups');
    const [showAllOrgTypes, setShowAllOrgTypes] = useState<boolean>(false);

    // Dynamic date subtitles for performance cards
    const dateSubtitles = useMemo(() => {
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        const yestStr = yest.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const thisMonthStartStr = thisMonthStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const thisMonthEndStr = thisMonthEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const thisMonthRange = `${thisMonthStartStr} – ${thisMonthEndStr}`;

        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const prevMonthStartStr = prevMonthStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const prevMonthEndStr = prevMonthEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const prevMonthRange = `${prevMonthStartStr} – ${prevMonthEndStr}`;

        return { todayStr, yestStr, thisMonthRange, prevMonthRange };
    }, []);

    const effectiveFollowupEvents = followupEvents || [];
    const effectiveTaskEvents = calendarEvents || [];
    const effectiveRecentDeals = recentDeals || [];
    const effectiveRecentLeads = recentLeads || [];

    const totalTasksCount = (stats?.completedTasks || 0) + (stats?.pendingTasks || 0);
    const completionRate = totalTasksCount > 0 ? Math.round(((stats?.completedTasks || 0) / totalTasksCount) * 100) : 0;

    const formatDateYMD = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getDashboardDateParams = () => {
        if (typeof window === 'undefined') return {};
        const params = new URLSearchParams(window.location.search);
        const startDate = params.get('start_date');
        const endDate = params.get('end_date');
        const result: Record<string, string> = {};
        if (startDate) result.created_from = startDate;
        if (endDate) result.created_to = endDate;
        return result;
    };

    const handleNavigateLeads = (count: number, extraParams: Record<string, string> = {}) => {
        if (count <= 0) return;
        const dateParams = getDashboardDateParams();
        router.get(route('lead.leads.index'), { ...dateParams, ...extraParams });
    };

    const handleNavigateDeals = (count: number, extraParams: Record<string, string> = {}) => {
        if (count <= 0) return;
        const dateParams = getDashboardDateParams();
        router.get(route('lead.deals.index'), { ...dateParams, ...extraParams });
    };

    const dateRanges = useMemo(() => {
        const now = new Date();
        const todayStr = formatDateYMD(now);

        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        const yestStr = formatDateYMD(yest);

        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const thisMonthStartStr = formatDateYMD(thisMonthStart);
        const thisMonthEndStr = formatDateYMD(thisMonthEnd);

        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const prevMonthStartStr = formatDateYMD(prevMonthStart);
        const prevMonthEndStr = formatDateYMD(prevMonthEnd);

        return {
            today: { startDate: todayStr, endDate: todayStr },
            yesterday: { startDate: yestStr, endDate: yestStr },
            thisMonth: { startDate: thisMonthStartStr, endDate: thisMonthEndStr },
            prevMonth: { startDate: prevMonthStartStr, endDate: prevMonthEndStr },
        };
    }, []);

    const followupToday = needsAttention?.followupLeadsToday ?? stats?.followupLeadsToday ?? 0;
    const overdueFollowups = needsAttention?.overdueLeadTasks ?? stats?.overdueLeadTasks ?? 0;
    const overdueDealTasks = needsAttention?.overdueDealTasks ?? stats?.overdueDealTasks ?? 0;
    const uncontacted = needsAttention?.uncontactedLeads ?? 0;
    const unassigned = needsAttention?.unassignedLeads ?? 0;
    const inactive = needsAttention?.inactiveDeals ?? 0;

    return (
        <AuthenticatedLayout
            breadcrumbs={[{ label: t('My CRM Dashboard') }]}
        >
            <Head title={t('My CRM Dashboard')} />

            <div className="space-y-6 pb-8">
                {/* Header Title & Scope Indicator */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {t('My CRM Dashboard')}
                            </h1>
                            {permissionScope?.scopeLabel && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                    <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                    {permissionScope.scopeLabel}
                                </span>
                            )}
                        </div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            {t('Performance overview, upcoming follow-ups, and scheduled tasks.')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <DashboardDateFilter />
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 1. MERGED PERSONAL SALES COCKPIT & PERFORMANCE VELOCITY                   */}
                {/* Combines My Sales Pipeline & Activity with Comparative Velocity Matrix     */}
                {/* ========================================================================= */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    {/* LEFT COCKPIT: My Sales Pipeline & Operational Health (lg:col-span-4) */}
                    <div className="lg:col-span-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 backdrop-blur-xl rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
                        {/* Glow ambient effects */}
                        <div className="absolute -top-12 -left-12 w-44 h-44 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-12 -right-12 w-44 h-44 bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 space-y-4">
                            {/* Header: Title + Assigned Total Leads */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
                                        <Briefcase className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                            {t('My Sales Pipeline')}
                                        </h2>
                                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                            {t('Active deals & book of business')}
                                        </span>
                                    </div>
                                </div>

                                <div
                                    onClick={() => handleNavigateLeads(stats?.totalLeads ?? 0)}
                                    title={(stats?.totalLeads ?? 0) > 0 ? String(t('Click to view leads')) : String(t('No leads'))}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-all ${
                                        (stats?.totalLeads ?? 0) > 0 ? 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-300' : 'cursor-not-allowed opacity-80'
                                    }`}
                                >
                                    <Users className="w-3 h-3 text-indigo-500" />
                                    <span>{(stats?.totalLeads ?? 0).toLocaleString()} {t('leads')}</span>
                                </div>
                            </div>

                            {/* 2 Primary Financial Cards (Active Pipeline Value & Closed Won Revenue) */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Active Deals & Value */}
                                <div
                                    onClick={() => handleNavigateDeals(stats?.activeDeals ?? 0, { status: 'active' })}
                                    title={(stats?.activeDeals ?? 0) > 0 ? String(t('Click to view active deals')) : String(t('No active deals'))}
                                    className={`bg-teal-500/5 dark:bg-teal-500/10 border border-teal-200/80 dark:border-teal-500/20 rounded-2xl p-3.5 relative overflow-hidden flex flex-col justify-between transition-all ${
                                        (stats?.activeDeals ?? 0) > 0 ? 'cursor-pointer hover:border-teal-400 hover:shadow-sm' : 'cursor-not-allowed opacity-80'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                                            {t('Active Pipeline')}
                                        </span>
                                        <div className="w-6 h-6 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                                            <Handshake className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                                            {formatCompactCurrency(stats?.openDealValue ?? 0)}
                                        </div>
                                        <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1 mt-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                            {stats?.activeDeals ?? 0} {t('active deals')}
                                        </span>
                                    </div>
                                </div>

                                {/* Won Deals & Revenue */}
                                <div
                                    onClick={() => handleNavigateDeals((stats?.wonDealsThisMonth ?? stats?.wonDeals ?? 0), { status: 'Won' })}
                                    title={(stats?.wonDealsThisMonth ?? stats?.wonDeals ?? 0) > 0 ? String(t('Click to view won deals')) : String(t('No won deals'))}
                                    className={`bg-purple-50/5 dark:bg-purple-500/10 border border-purple-200/80 dark:border-purple-500/20 rounded-2xl p-3.5 relative overflow-hidden flex flex-col justify-between transition-all ${
                                        (stats?.wonDealsThisMonth ?? stats?.wonDeals ?? 0) > 0 ? 'cursor-pointer hover:border-purple-400 hover:shadow-sm' : 'cursor-not-allowed opacity-80'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                                            {t('Closed Won')}
                                        </span>
                                        <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                            <BarChart3 className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                                            {formatCompactCurrency(stats?.wonDealAmount ?? 0)}
                                        </div>
                                        <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                            {stats?.wonDealsThisMonth ?? stats?.wonDeals ?? 0} {t('won deals')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Activity & Execution Strip (Calls, Tasks, Overdue) */}
                        <div className="relative z-10 pt-4 mt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                <span>{t('Activity & Execution')}</span>
                                <span>{t('This Month')}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {/* Calls */}
                                <div className="bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-900/40 rounded-xl p-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1 text-sky-600 dark:text-sky-400 mb-0.5">
                                        <Phone className="w-3 h-3" />
                                        <span className="text-[10px] font-bold">{t('Calls')}</span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                                        {stats?.todayCalls ?? 0}
                                    </div>
                                    <span className="text-[9px] text-slate-400 block truncate font-medium">
                                        {stats?.monthlyCalls ?? 0} {t('total')}
                                    </span>
                                </div>

                                {/* Tasks */}
                                <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl p-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-0.5">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span className="text-[10px] font-bold">{t('Tasks')}</span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                                        {stats?.completedTasks ?? 0}
                                    </div>
                                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium block truncate">
                                        {stats?.pendingTasks ?? 0} {t('due')}
                                    </span>
                                </div>

                                {/* Overdue Alert Action */}
                                <button
                                    type="button"
                                    onClick={() => handleNavigateLeads(stats?.overdueTasks ?? overdueFollowups, { filter: 'overdue_followup' })}
                                    disabled={(stats?.overdueTasks ?? overdueFollowups) <= 0}
                                    title={(stats?.overdueTasks ?? overdueFollowups) > 0 ? String(t('Click to view overdue follow-ups')) : String(t('No overdue follow-ups'))}
                                    className={`bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 rounded-xl p-2.5 text-center transition-all ${
                                        (stats?.overdueTasks ?? overdueFollowups) > 0 ? 'cursor-pointer hover:bg-rose-100/80 dark:hover:bg-rose-900/60' : 'cursor-not-allowed opacity-80'
                                    }`}
                                >
                                    <div className="flex items-center justify-center gap-1 text-rose-600 dark:text-rose-400 mb-0.5">
                                        <AlertTriangle className="w-3 h-3 animate-pulse" />
                                        <span className="text-[10px] font-bold">{t('Overdue')}</span>
                                    </div>
                                    <div className="text-sm font-black text-rose-600 dark:text-rose-400">
                                        {stats?.overdueTasks ?? overdueFollowups}
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
                                    <Activity className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                        {t('Lead & Deal Velocity')}
                                    </h3>
                                    <p className="text-[11px] font-medium text-slate-400">
                                        {t('Performance & conversion rates across comparative periods')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                                    <Sparkles className="w-3 h-3" />
                                    {t('Leads')}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200/60 dark:border-emerald-800/60">
                                    <TrendingUp className="w-3 h-3" />
                                    {t('Deals')}
                                </span>
                            </div>
                        </div>

                        {/* 4 Performance Period Cards in 2x2 Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
                            {[
                                {
                                    label: t("Today"),
                                    dateSub: dateSubtitles.todayStr,
                                    startDate: dateRanges.today.startDate,
                                    endDate: dateRanges.today.endDate,
                                    leads: stats?.todayLeads ?? 0,
                                    deals: stats?.todayDeals ?? 0,
                                    icon: <Sparkles className="w-4 h-4" />,
                                    cardBg: 'bg-[#f4f7ff] dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40',
                                    iconBg: 'bg-blue-100/80 dark:bg-blue-900/60 text-blue-500 dark:text-blue-400',
                                    numColor: 'text-blue-600 dark:text-blue-400',
                                    rateColor: 'text-blue-600 dark:text-blue-400',
                                    waveColor: '#3b82f6',
                                    gradId: 'userWaveTodayGrad',
                                },
                                {
                                    label: t("Yesterday"),
                                    dateSub: dateSubtitles.yestStr,
                                    startDate: dateRanges.yesterday.startDate,
                                    endDate: dateRanges.yesterday.endDate,
                                    leads: stats?.yesterdayLeads ?? 0,
                                    deals: stats?.yesterdayDeals ?? 0,
                                    icon: <Clock className="w-4 h-4" />,
                                    cardBg: 'bg-[#f0fbf5] dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40',
                                    iconBg: 'bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-500 dark:text-emerald-400',
                                    numColor: 'text-emerald-500 dark:text-emerald-400',
                                    rateColor: 'text-emerald-500 dark:text-emerald-400',
                                    waveColor: '#10b981',
                                    gradId: 'userWaveYesterdayGrad',
                                },
                                {
                                    label: t("This Month"),
                                    dateSub: dateSubtitles.thisMonthRange,
                                    startDate: dateRanges.thisMonth.startDate,
                                    endDate: dateRanges.thisMonth.endDate,
                                    leads: stats?.thisMonthLeads ?? stats?.monthlyLeads ?? 0,
                                    deals: stats?.thisMonthDeals ?? 0,
                                    icon: <BarChart3 className="w-4 h-4" />,
                                    cardBg: 'bg-[#fffbf0] dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40',
                                    iconBg: 'bg-amber-100/80 dark:bg-amber-900/60 text-amber-500 dark:text-amber-400',
                                    numColor: 'text-amber-500 dark:text-amber-400',
                                    rateColor: 'text-amber-500 dark:text-amber-400',
                                    waveColor: '#f59e0b',
                                    gradId: 'userWaveThisMonthGrad',
                                },
                                {
                                    label: t("Previous Month"),
                                    dateSub: dateSubtitles.prevMonthRange,
                                    startDate: dateRanges.prevMonth.startDate,
                                    endDate: dateRanges.prevMonth.endDate,
                                    leads: stats?.prevMonthLeads ?? 0,
                                    deals: stats?.prevMonthDeals ?? 0,
                                    icon: <Trophy className="w-4 h-4" />,
                                    cardBg: 'bg-[#fff5f6] dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40',
                                    iconBg: 'bg-rose-100/80 dark:bg-rose-900/60 text-rose-500 dark:text-rose-400',
                                    numColor: 'text-rose-500 dark:text-rose-400',
                                    rateColor: 'text-rose-500 dark:text-rose-400',
                                    waveColor: '#f43f5e',
                                    gradId: 'userWavePrevMonthGrad',
                                },
                            ].map((item, idx) => {
                                const convRate = item.leads > 0 ? `${((item.deals / item.leads) * 100).toFixed(1)}%` : '0.0%';
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            if (item.leads > 0) {
                                                handleNavigateLeads(item.leads, { created_from: item.startDate, created_to: item.endDate });
                                            } else if (item.deals > 0) {
                                                handleNavigateDeals(item.deals, { created_from: item.startDate, created_to: item.endDate });
                                            }
                                        }}
                                        className={`relative ${item.cardBg} rounded-2xl p-4 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden min-h-[140px] ${
                                            (item.leads > 0 || item.deals > 0) ? 'cursor-pointer hover:scale-[1.01]' : 'cursor-not-allowed opacity-80'
                                        }`}
                                    >
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

                                        {/* Center Metric: Leads / Deals Count */}
                                        <div className="my-2 z-10">
                                            <div className="flex items-baseline gap-2">
                                                <div
                                                    onClick={(e) => {
                                                        if (item.leads > 0) {
                                                            e.stopPropagation();
                                                            handleNavigateLeads(item.leads, { created_from: item.startDate, created_to: item.endDate });
                                                        }
                                                    }}
                                                    className={`flex items-baseline gap-1 ${item.leads > 0 ? 'cursor-pointer group/lead' : 'cursor-not-allowed'}`}
                                                    title={item.leads > 0 ? String(t('Click to view leads for {{period}}', { period: item.label })) : String(t('No leads'))}
                                                >
                                                    <span className={`text-xl font-black leading-none ${item.numColor} ${item.leads > 0 ? 'group-hover/lead:underline' : ''}`}>
                                                        {item.leads.toLocaleString()}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-1">
                                                        {t('Leads')}
                                                    </span>
                                                </div>
                                                <span className="text-base font-light text-slate-300 dark:text-slate-600 leading-none">
                                                    /
                                                </span>
                                                <div
                                                    onClick={(e) => {
                                                        if (item.deals > 0) {
                                                            e.stopPropagation();
                                                            handleNavigateDeals(item.deals, { created_from: item.startDate, created_to: item.endDate });
                                                        }
                                                    }}
                                                    className={`flex items-baseline gap-1 ${item.deals > 0 ? 'cursor-pointer group/deal' : 'cursor-not-allowed'}`}
                                                    title={item.deals > 0 ? String(t('Click to view deals for {{period}}', { period: item.label })) : String(t('No deals'))}
                                                >
                                                    <span className={`text-xl font-black leading-none text-slate-700 dark:text-slate-200 ${item.deals > 0 ? 'group-hover/deal:underline' : ''}`}>
                                                        {item.deals.toLocaleString()}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-1">
                                                        {t('Deals')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Row: Conversion Rate & Sparkline Wave Graph with Dot */}
                                        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/40 flex items-end justify-between z-10">
                                            <div>
                                                <div className={`text-sm font-black ${item.rateColor}`}>
                                                    {convRate}
                                                </div>
                                                <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500">
                                                    {t('Conversion Rate')}
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
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 2. Middle Section: Needs Attention Box & Recent Portfolios */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Needs Attention Box (Col 4) */}
                    <div id="needs-attention-section" className="lg:col-span-4 bg-gradient-to-br from-blue-50/90 via-sky-50/50 to-indigo-50/40 dark:from-blue-950/50 dark:via-sky-950/40 dark:to-slate-900/90 border border-blue-200/80 dark:border-blue-900/60 backdrop-blur-md rounded-2xl p-6 shadow-md hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden ring-1 ring-blue-400/30 dark:ring-blue-500/20">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/15 rounded-full blur-2xl pointer-events-none animate-pulse" />
                        <div>
                            <style>{`
                                @keyframes waveFloatUser {
                                    0%, 100% { transform: translateY(0px); }
                                    50% { transform: translateY(-3px); }
                                }
                            `}</style>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
                                    <AlertTriangle className="h-5 w-5 text-white animate-bounce" style={{ animationDuration: '2s' }} />
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600 border-2 border-white dark:border-slate-900"></span>
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-base font-black tracking-tight flex items-center gap-0.5">
                                        {t('Needs Attention').split('').map((char, index) => (
                                            <span
                                                key={index}
                                                className="inline-block bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 dark:from-blue-400 dark:via-sky-300 dark:to-indigo-400 bg-clip-text text-transparent font-black text-lg"
                                                style={{
                                                    animation: 'waveFloatUser 1.8s ease-in-out infinite',
                                                    animationDelay: `${index * 0.08}s`,
                                                    whiteSpace: char === ' ' ? 'pre' : 'normal',
                                                }}
                                            >
                                                {char}
                                            </span>
                                        ))}
                                    </h3>
                                    <p className="text-[11px] font-bold text-slate-400">{t('Items requiring immediate action')}</p>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                {/* Lead Follow-up Today */}
                                <div
                                    onClick={() => handleNavigateLeads(followupToday, { filter: 'followup_today' })}
                                    title={followupToday > 0 ? String(t('Click to view today lead follow-ups')) : String(t('No lead follow-ups today'))}
                                    className={`flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-indigo-100 dark:border-indigo-900/40 backdrop-blur-sm shadow-2xs transition-all ${
                                        followupToday > 0 ? 'cursor-pointer hover:bg-indigo-50/80 dark:hover:bg-indigo-900/40 hover:border-indigo-300' : 'cursor-not-allowed opacity-80'
                                    }`}
                                >
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('Lead follow-up today')}</span>
                                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 px-2 py-0.5 rounded-lg">
                                        {followupToday}
                                    </span>
                                </div>

                                {/* Overdue Lead Follow-up */}
                                <div
                                    onClick={() => handleNavigateLeads(overdueFollowups, { filter: 'overdue_followup' })}
                                    title={overdueFollowups > 0 ? String(t('Click to view overdue lead follow-ups')) : String(t('No overdue lead follow-ups'))}
                                    className={`flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-rose-100 dark:border-rose-900/40 backdrop-blur-sm shadow-2xs transition-all ${
                                        overdueFollowups > 0 ? 'cursor-pointer hover:bg-rose-50/80 dark:hover:bg-rose-900/40 hover:border-rose-300' : 'cursor-not-allowed opacity-80'
                                    }`}
                                >
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('Overdue lead follow-up')}</span>
                                    <span className={`text-sm font-black px-2 py-0.5 rounded-lg border ${overdueFollowups > 0
                                        ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60'
                                        : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                        }`}>
                                        {overdueFollowups}
                                    </span>
                                </div>

                                {/* Overdue Deal Follow-up */}
                                <div
                                    onClick={() => handleNavigateDeals(overdueDealTasks, { filter: 'overdue_followup' })}
                                    title={overdueDealTasks > 0 ? String(t('Click to view overdue deal follow-ups')) : String(t('No overdue deal follow-ups'))}
                                    className={`flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-rose-100 dark:border-rose-900/40 backdrop-blur-sm shadow-2xs transition-all ${
                                        overdueDealTasks > 0 ? 'cursor-pointer hover:bg-rose-50/80 dark:hover:bg-rose-900/40 hover:border-rose-300' : 'cursor-not-allowed opacity-80'
                                    }`}
                                >
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('Overdue deal follow-up')}</span>
                                    <span className={`text-sm font-black px-2 py-0.5 rounded-lg border ${overdueDealTasks > 0
                                        ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60'
                                        : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                        }`}>
                                        {overdueDealTasks}
                                    </span>
                                </div>

                                {/* Uncontacted leads */}
                                <div
                                    onClick={() => handleNavigateLeads(uncontacted, { filter: 'uncontacted' })}
                                    title={uncontacted > 0 ? String(t('Click to view uncontacted leads')) : String(t('No uncontacted leads'))}
                                    className={`flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-amber-100 dark:border-amber-900/40 backdrop-blur-sm shadow-2xs transition-all ${
                                        uncontacted > 0 ? 'cursor-pointer hover:bg-amber-50/80 dark:hover:bg-amber-900/40 hover:border-amber-300' : 'cursor-not-allowed opacity-80'
                                    }`}
                                >
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('Uncontacted leads')}</span>
                                    <span className="text-sm font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 px-2 py-0.5 rounded-lg">
                                        {uncontacted}
                                    </span>
                                </div>

                                {/* Unassigned leads */}
                                <div
                                    onClick={() => handleNavigateLeads(unassigned, { filter: 'unassigned' })}
                                    title={unassigned > 0 ? String(t('Click to view unassigned leads')) : String(t('No unassigned leads'))}
                                    className={`flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-amber-100 dark:border-amber-900/40 backdrop-blur-sm shadow-2xs transition-all ${
                                        unassigned > 0 ? 'cursor-pointer hover:bg-amber-50/80 dark:hover:bg-amber-900/40 hover:border-amber-300' : 'cursor-not-allowed opacity-80'
                                    }`}
                                >
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('Unassigned leads')}</span>
                                    <span className="text-sm font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 px-2 py-0.5 rounded-lg">
                                        {unassigned}
                                    </span>
                                </div>

                                {/* Inactive / Stale deals */}
                                <div
                                    onClick={() => handleNavigateDeals(inactive, { filter: 'inactive' })}
                                    title={inactive > 0 ? String(t('Click to view inactive deals')) : String(t('No inactive deals'))}
                                    className={`flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-amber-100 dark:border-amber-900/40 backdrop-blur-sm shadow-2xs transition-all ${
                                        inactive > 0 ? 'cursor-pointer hover:bg-amber-50/80 dark:hover:bg-amber-900/40 hover:border-amber-300' : 'cursor-not-allowed opacity-80'
                                    }`}
                                >
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('Inactive deals (14+ days)')}</span>
                                    <span className="text-sm font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 px-2 py-0.5 rounded-lg">
                                        {inactive}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Assigned Deals (Col 4) */}
                    <div className="lg:col-span-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <Handshake className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                        {t('Recent Deals')}
                                    </h3>
                                    <p className="text-[11px] font-semibold text-slate-400">{t('Latest deals in your active scope')}</p>
                                </div>
                                <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 px-2 py-0.5 rounded-full">
                                    {effectiveRecentDeals.length}
                                </span>
                            </div>

                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                                {effectiveRecentDeals.length > 0 ? (
                                    effectiveRecentDeals.map((deal, idx) => (
                                        <div key={deal.id || idx} className="flex items-center justify-between pt-2 first:pt-0">
                                            <div className="min-w-0 pr-2">
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{deal.name}</p>
                                                <span className="text-[10px] text-slate-400 font-medium">{deal.stage?.name || t('Active')}</span>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs font-extrabold text-slate-900 dark:text-white">{formatCompactCurrency(deal.price || 0)}</p>
                                                <p className="text-[10px] text-slate-400">{formatDate(deal.created_at)}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-slate-400 text-center py-6">{t('No deals found')}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recent Assigned Leads (Col 4) */}
                    <div className="lg:col-span-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        {t('Recent Leads')}
                                    </h3>
                                    <p className="text-[11px] font-semibold text-slate-400">{t('Latest leads for follow-up')}</p>
                                </div>
                                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 rounded-full">
                                    {effectiveRecentLeads.length}
                                </span>
                            </div>

                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                                {effectiveRecentLeads.length > 0 ? (
                                    effectiveRecentLeads.map((lead, idx) => (
                                        <div key={lead.id || idx} className="flex items-center justify-between pt-2 first:pt-0">
                                            <div className="min-w-0 pr-2">
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{lead.name}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{lead.subject || t('Lead Inquiry')}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="inline-block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                                                    {lead.stage?.name || t('Assigned')}
                                                </span>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(lead.created_at)}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-slate-400 text-center py-6">{t('No leads found')}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Calendars Section with Segmented Tab Switch */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                    {t('CRM Calendar & Schedules')}
                                </h3>
                                <p className="text-xs font-semibold text-slate-400">
                                    {t('Switch between your scheduled customer follow-ups and assigned CRM tasks')}
                                </p>
                            </div>
                        </div>

                        {/* Segmented Switch */}
                        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setActiveCalendarTab('followups')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeCalendarTab === 'followups'
                                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                                    }`}
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{t('Follow-up Calendar')}</span>
                                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-extrabold">
                                    {effectiveFollowupEvents.length}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveCalendarTab('tasks')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeCalendarTab === 'tasks'
                                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                                    }`}
                            >
                                <ListTodo className="w-3.5 h-3.5" />
                                <span>{t('Tasks Calendar')}</span>
                                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 font-extrabold">
                                    {effectiveTaskEvents.length}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Active Calendar View */}
                    {activeCalendarTab === 'followups' ? (
                        <CustomEventCalendar
                            title={t('Scheduled Follow-ups Calendar')}
                            description={t('Follow-up dates and scheduled interactions for your leads & deals')}
                            headerIcon={<Calendar className="h-5 w-5 text-blue-600" />}
                            events={effectiveFollowupEvents}
                            dotColor="bg-blue-500"
                            selectedDateTitlePrefix={t('Follow-ups on')}
                            eventsSummaryText={t('scheduled follow-ups')}
                            emptyText={t('No follow-up events scheduled on this date.')}
                        />
                    ) : (
                        <CustomEventCalendar
                            title={t('Assigned Tasks Calendar')}
                            description={t('Assigned lead and deal task schedules and due dates')}
                            headerIcon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                            events={effectiveTaskEvents}
                            dotColor="bg-emerald-500"
                            selectedDateTitlePrefix={t('Tasks on')}
                            eventsSummaryText={t('tasks scheduled or due')}
                            emptyText={t('No task events scheduled on this date.')}
                        />
                    )}
                </div>

                {/* Organization Type Conversion Box (Positioned at the very end) */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all duration-300 mt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    {t('Top Conversion by Organization Type')}
                                </h3>
                            </div>
                            <p className="text-xs font-semibold text-slate-400 mt-1">
                                {t('Leads to deal conversion rates by organization category')}
                            </p>
                        </div>
                        {organizationTypeConversion && organizationTypeConversion.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 self-start sm:self-auto">
                                <Sparkles className="w-3.5 h-3.5" />
                                {organizationTypeConversion.length} {t('Types Analyzed')}
                            </span>
                        )}
                    </div>

                    {organizationTypeConversion && organizationTypeConversion.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {(showAllOrgTypes ? organizationTypeConversion : organizationTypeConversion.slice(0, 3)).map((item: any, idx: number) => {
                                    const isTop = idx === 0 && item.converted_deals > 0;
                                    return (
                                        <div
                                            key={idx}
                                            className={`relative rounded-xl p-4 border transition-all duration-200 flex flex-col justify-between ${
                                                isTop
                                                    ? 'bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-white dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 border-indigo-200 dark:border-indigo-800/70 shadow-sm ring-1 ring-indigo-500/20'
                                                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                        >
                                            {isTop && (
                                                <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-500 to-indigo-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                                                    <Trophy className="w-3 h-3" />
                                                    {t('Top Performing')}
                                                </div>
                                            )}

                                            <div>
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                        {item.name}
                                                    </span>
                                                    <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                                                        item.conversion_rate >= 50
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                            : item.conversion_rate >= 20
                                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {item.conversion_rate}%
                                                    </span>
                                                </div>

                                                {/* Metrics Row */}
                                                <div className="grid grid-cols-3 gap-2 my-3 text-center">
                                                    <div className="bg-white dark:bg-slate-900/80 rounded-lg p-2 border border-slate-100 dark:border-slate-800">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{t('Leads')}</p>
                                                        <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{item.total_leads}</p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-900/80 rounded-lg p-2 border border-slate-100 dark:border-slate-800">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{t('Deals')}</p>
                                                        <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{item.converted_deals}</p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-900/80 rounded-lg p-2 border border-slate-100 dark:border-slate-800">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{t('Won')}</p>
                                                        <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{item.won_deals}</p>
                                                    </div>
                                                </div>

                                                {/* Conversion Rate Bar */}
                                                <div className="space-y-1">
                                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                                                            style={{ width: `${Math.min(100, Math.max(0, item.conversion_rate))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs">
                                                <span className="text-slate-400 font-semibold">{t('Total Deal Value')}</span>
                                                <span className="font-extrabold text-slate-900 dark:text-white">
                                                    {formatCurrency(item.total_value)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {organizationTypeConversion.length > 3 && (
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                                    <button
                                        type="button"
                                        onClick={() => setShowAllOrgTypes(!showAllOrgTypes)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-all shadow-2xs"
                                    >
                                        {showAllOrgTypes ? (
                                            <>
                                                <ChevronUp className="w-4 h-4" />
                                                {t('View Less')}
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="w-4 h-4" />
                                                {t('View More')} ({organizationTypeConversion.length - 3} {t('more')})
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="py-8 text-center text-xs font-semibold text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                            {t('No organization type conversion data recorded yet.')}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

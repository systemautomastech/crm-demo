import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import DashboardDateFilter from "@/Components/dashboard-date-filter";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getImagePath, formatCurrency, formatCompactCurrency } from '@/utils/helpers';
import {
    Users,
    Handshake,
    BarChart3,
    Target,
    Phone,
    AlertCircle,
    AlertTriangle,
    BarChart2,
    PieChart as PieChartIcon,
    TrendingUp,
    List,
    Calendar,
    Clock,
    Sparkles,
    Activity,
    Package,
    BadgeDollarSign,
    Tag,
    Trophy,
    Tv,
    Headphones,
    Armchair,
    Shirt,
    Utensils,
    Code,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Loader2,
    Building2,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface MetricStats {
    totalLeads?: number;
    monthLeads?: number;
    todayLeads?: number;
    yesterdayLeads?: number;
    thisMonthLeads?: number;
    prevMonthLeads?: number;
    avgDailyLeads?: number;
    activeDeals?: number;
    openDealValue?: number;
    wonDealAmount?: number;
    wonDealsThisMonth?: number;
    todayDeals?: number;
    yesterdayDeals?: number;
    thisMonthDeals?: number;
    prevMonthDeals?: number;
    callsToday?: number;
    connectedCallsToday?: number;
    missedCallsToday?: number;
    followupsToday?: number;
    followupLeadsToday?: number;
    followupDealsToday?: number;
    overdueTasks?: number;
}

interface LeadOverviewItem {
    id?: number | string;
    name: string;
    count: number;
}

interface DealPipelineItem {
    id?: number | string;
    name: string;
    deals: number;
    amount: number;
}

interface DailyLeadTrendItem {
    date: string;
    leads: number;
}

interface TeamMember {
    id?: number | string;
    name: string;
    avatar?: string;
    connectedCalls?: number;
    wonDeals: number;
    wonAmount: number;
    overdue?: number;
}

interface TopProduct {
    id?: number | string;
    name: string;
    wonValue: number;
    wonDeals?: number;
}

interface SalesPerformanceItem {
    month: string;
    value: number;
}

interface LeadSourceItem {
    name: string;
    count: number;
    color: string;
}

interface WinRateStats {
    winRate: number;
    wonCount: number;
    lostCount: number;
}

interface NeedsAttentionStats {
    uncontactedLeads?: number;
    unassignedLeads?: number;
    inactiveDeals?: number;
    followupLeadsToday?: number;
    overdueLeadTasks?: number;
    overdueDealTasks?: number;
    followupDealsToday?: number;
}

interface CategorySellerItem {
    userId: number | string;
    userName: string;
    userAvatar?: string;
    categoryId: number | string;
    categoryName: string;
    categoryColor?: string;
    productName: string;
    dealsCount: number;
    totalAmount: number;
}

interface ProductCategoryOption {
    id: number | string;
    name: string;
    color?: string;
}

interface SellerUserOption {
    id: number | string;
    name: string;
    avatar?: string;
}

interface LeaderboardSummary {
    totalProductsSold: number;
    totalSalesValue: number;
    activeSellersCount: number;
    productCategoriesCount: number;
}

interface LeaderboardSellerRow {
    id: number | string;
    rank: number;
    badgeColor: string;
    avatar: string;
    avatarColor: string;
    name: string;
    values: Record<string, number>;
    amounts: Record<string, number>;
    totalAmount: number;
    totalUnits: number;
}

interface LeaderboardCategoryLeader {
    category: string;
    leader: string;
    units: string;
    amount: number;
}

interface CategoryLeaderboardData {
    categories: string[];
    sellers: LeaderboardSellerRow[];
    leaders: LeaderboardCategoryLeader[];
    summary: LeaderboardSummary;
}

export interface OrganizationTypeConversionItem {
    name: string;
    total_leads: number;
    converted_deals: number;
    won_deals: number;
    conversion_rate: number;
    total_value: number;
}

interface CompanyDashboardProps {
    stats?: MetricStats;
    leadOverview?: LeadOverviewItem[];
    dealPipeline?: DealPipelineItem[];
    dailyLeadTrend?: DailyLeadTrendItem[];
    teamPerformance?: TeamMember[];
    topProducts?: TopProduct[];
    categorySellers?: CategorySellerItem[];
    categoryLeaderboard?: CategoryLeaderboardData;
    productCategories?: ProductCategoryOption[];
    sellerUsers?: SellerUserOption[];
    salesPerformance?: SalesPerformanceItem[];
    leadSources?: LeadSourceItem[];
    winRateStats?: WinRateStats;
    needsAttention?: NeedsAttentionStats;
    organizationTypeConversion?: OrganizationTypeConversionItem[];
    message?: string;
}

const CHART_COLORS = ['#6366f1', '#14b8a6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#10b981'];

export default function CompanyDashboard({
    stats,
    leadOverview = [],
    dealPipeline = [],
    dailyLeadTrend = [],
    teamPerformance = [],
    topProducts = [],
    categorySellers = [],
    categoryLeaderboard,
    productCategories = [],
    sellerUsers = [],
    salesPerformance = [],
    leadSources = [],
    winRateStats,
    needsAttention,
    organizationTypeConversion = [],
}: CompanyDashboardProps) {
    const { t } = useTranslation();
    const pageProps = usePage().props;

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

    const [leadChartType, setLeadChartType] = useState<'bar' | 'pie' | 'graph' | 'list'>('pie');
    const [dealChartType, setDealChartType] = useState<'bar' | 'pie' | 'graph' | 'list'>('pie');
    const [topPerformerChartType, setTopPerformerChartType] = useState<'bar' | 'pie' | 'graph' | 'list'>('bar');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedSeller, setSelectedSeller] = useState<string>('all');
    const [visibleSellerCount, setVisibleSellerCount] = useState<number>(10);
    const [showAllOrgTypes, setShowAllOrgTypes] = useState<boolean>(false);

    const [lazyLeaderboardData, setLazyLeaderboardData] = useState<CategoryLeaderboardData | null>(null);
    const [isLeaderboardLoading, setIsLeaderboardLoading] = useState<boolean>(false);
    const [leaderboardLoaded, setLeaderboardLoaded] = useState<boolean>(false);
    const leaderboardSectionRef = useRef<HTMLDivElement>(null);

    const searchParams = useMemo(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''), []);
    const initialStartDate = searchParams.get('start_date') || '';
    const initialEndDate = searchParams.get('end_date') || '';
    const periodParam = searchParams.get('period') || 'this_month';
    const [leaderboardDateRange, setLeaderboardDateRange] = useState<string>(
        initialStartDate && initialEndDate ? `${initialStartDate} - ${initialEndDate}` : ''
    );

    const fetchLeaderboardData = useCallback((startDateVal?: string, endDateVal?: string) => {
        setIsLeaderboardLoading(true);
        const params: Record<string, string> = {
            period: periodParam,
        };
        if (startDateVal && endDateVal) {
            params.period = 'custom';
            params.start_date = startDateVal;
            params.end_date = endDateVal;
        } else if (initialStartDate && initialEndDate) {
            params.period = 'custom';
            params.start_date = initialStartDate;
            params.end_date = initialEndDate;
        }

        axios.get('/crm/dashboard/category-leaderboard-data', { params })
            .then(res => {
                if (res.data && res.data.categoryLeaderboard) {
                    setLazyLeaderboardData(res.data.categoryLeaderboard);
                }
            })
            .catch(err => {
                console.error('Failed to load category leaderboard data:', err);
            })
            .finally(() => {
                setIsLeaderboardLoading(false);
                setLeaderboardLoaded(true);
            });
    }, [periodParam, initialStartDate, initialEndDate]);

    useEffect(() => {
        if (leaderboardLoaded) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry && entry.isIntersecting && !leaderboardLoaded && !isLeaderboardLoading) {
                    fetchLeaderboardData();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (leaderboardSectionRef.current) {
            observer.observe(leaderboardSectionRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, [leaderboardLoaded, isLeaderboardLoading, fetchLeaderboardData]);

    const filteredCategorySellers = useMemo(() => {
        return (categorySellers || []).filter(item => {
            const matchesCat = selectedCategory === 'all' || String(item.categoryId) === String(selectedCategory);
            const matchesUser = selectedSeller === 'all' || String(item.userId) === String(selectedSeller);
            return matchesCat && matchesUser;
        });
    }, [categorySellers, selectedCategory, selectedSeller]);

    const matrixData = useMemo(() => {
        const activeLeaderboard = lazyLeaderboardData || categoryLeaderboard;
        if (activeLeaderboard && activeLeaderboard.sellers && activeLeaderboard.sellers.length > 0) {
            return {
                categories: activeLeaderboard.categories && activeLeaderboard.categories.length > 0
                    ? activeLeaderboard.categories
                    : ['General'],
                sellers: activeLeaderboard.sellers,
                summary: activeLeaderboard.summary || {
                    totalProductsSold: 0,
                    totalSalesValue: 0,
                    activeSellersCount: 0,
                    productCategoriesCount: 0,
                },
                leaders: activeLeaderboard.leaders || [],
                isRealData: true,
            };
        }

        const realCategories = (productCategories || []).map(c => c.name).filter(Boolean);
        const categories = realCategories.length > 0 ? realCategories : (activeLeaderboard?.categories || []);

        const realSellers = (sellerUsers || []).map((usr, idx) => {
            const nameParts = (usr.name || '').split(' ');
            let initials = '';
            nameParts.forEach(np => {
                if (np) initials += np[0].toUpperCase();
            });
            const avatar = initials.substring(0, 2) || 'U';

            const values: Record<string, number> = {};
            const amounts: Record<string, number> = {};
            categories.forEach(cat => {
                values[cat] = 0;
                amounts[cat] = 0;
            });

            return {
                id: usr.id || idx + 1,
                rank: idx + 1,
                badgeColor: idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-slate-300 text-slate-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                avatar,
                avatarImage: usr.avatar,
                avatarColor: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300',
                name: usr.name,
                values,
                amounts,
                totalAmount: 0,
                totalUnits: 0,
            };
        });

        return {
            categories,
            sellers: realSellers,
            summary: activeLeaderboard?.summary || {
                totalProductsSold: 0,
                totalSalesValue: 0,
                activeSellersCount: (sellerUsers || []).length,
                productCategoriesCount: categories.length,
            },
            leaders: activeLeaderboard?.leaders || [],
            isRealData: true,
        };
    }, [lazyLeaderboardData, categoryLeaderboard, productCategories, sellerUsers]);

    const categoryOptions = useMemo(() => {
        const list: { id: string; name: string }[] = [{ id: 'all', name: String(t('All Categories')) }];
        const added = new Set<string>(['all']);

        (productCategories || []).forEach(cat => {
            if (cat.name && !added.has(cat.name)) {
                added.add(cat.name);
                list.push({ id: cat.name, name: cat.name });
            }
        });

        if (matrixData?.categories) {
            matrixData.categories.forEach(catName => {
                if (catName && !added.has(catName)) {
                    added.add(catName);
                    list.push({ id: catName, name: catName });
                }
            });
        }

        return list;
    }, [productCategories, matrixData.categories, t]);

    const sellerOptions = useMemo(() => {
        const list: { id: string; name: string }[] = [{ id: 'all', name: String(t('All Sellers')) }];
        const added = new Set<string>(['all']);

        (sellerUsers || []).forEach(usr => {
            if (usr.name && !added.has(usr.name)) {
                added.add(usr.name);
                list.push({ id: usr.name, name: usr.name });
            }
        });

        if (matrixData?.sellers) {
            matrixData.sellers.forEach(s => {
                if (s.name && !added.has(s.name)) {
                    added.add(s.name);
                    list.push({ id: s.name, name: s.name });
                }
            });
        }

        return list;
    }, [sellerUsers, matrixData.sellers, t]);

    const filteredMatrixData = useMemo(() => {
        const activeCategories = matrixData.categories.filter(cat =>
            selectedCategory === 'all' || cat === selectedCategory || cat.toLowerCase() === selectedCategory.toLowerCase()
        );

        const activeSellers = matrixData.sellers.filter(s =>
            selectedSeller === 'all' || s.name === selectedSeller || String(s.id) === String(selectedSeller) || s.name.toLowerCase() === selectedSeller.toLowerCase()
        );

        let totalProductsSold = 0;
        let totalSalesValue = 0;
        const activeSellersSet = new Set<string | number>();

        activeSellers.forEach(s => {
            activeCategories.forEach(cat => {
                const units = s.values ? (s.values[cat] || 0) : 0;
                const amt = s.amounts ? (s.amounts[cat] || 0) : 0;
                totalProductsSold += units;
                totalSalesValue += amt;
                if (units > 0 || amt > 0) {
                    activeSellersSet.add(s.id || s.name);
                }
            });
        });

        const summary = {
            totalProductsSold: (selectedCategory === 'all' && selectedSeller === 'all') ? matrixData.summary.totalProductsSold : totalProductsSold,
            totalSalesValue: (selectedCategory === 'all' && selectedSeller === 'all') ? matrixData.summary.totalSalesValue : totalSalesValue,
            activeSellersCount: selectedSeller !== 'all' ? activeSellers.length : (selectedCategory === 'all' ? matrixData.summary.activeSellersCount : activeSellersSet.size),
            productCategoriesCount: selectedCategory !== 'all' ? activeCategories.length : matrixData.summary.productCategoriesCount,
        };

        const activeLeaders = (matrixData.leaders || []).filter(item => {
            const matchCat = selectedCategory === 'all' || item.category === selectedCategory || item.category.toLowerCase() === selectedCategory.toLowerCase();
            const matchSeller = selectedSeller === 'all' || item.leader === selectedSeller || item.leader.toLowerCase() === selectedSeller.toLowerCase();
            return matchCat && matchSeller;
        });

        return {
            categories: activeCategories.length > 0 ? activeCategories : matrixData.categories,
            sellers: activeSellers,
            summary: summary,
            leaders: activeLeaders,
        };
    }, [matrixData, selectedCategory, selectedSeller]);

    const getCategoryIconInfo = (categoryName: string) => {
        const lower = categoryName.toLowerCase();
        if (lower.includes('electr') || lower.includes('tech') || lower.includes('tv') || lower.includes('device')) {
            return { icon: Tv, iconBg: 'bg-blue-50 dark:bg-blue-950/60', iconColor: 'text-blue-500', statColor: 'text-blue-600 dark:text-blue-400' };
        }
        if (lower.includes('access') || lower.includes('headphone') || lower.includes('gadget')) {
            return { icon: Headphones, iconBg: 'bg-purple-50 dark:bg-purple-950/60', iconColor: 'text-purple-500', statColor: 'text-emerald-600 dark:text-emerald-400' };
        }
        if (lower.includes('furnit') || lower.includes('home') || lower.includes('desk') || lower.includes('chair')) {
            return { icon: Armchair, iconBg: 'bg-rose-50 dark:bg-rose-950/60', iconColor: 'text-rose-500', statColor: 'text-orange-600 dark:text-orange-400' };
        }
        if (lower.includes('fash') || lower.includes('cloth') || lower.includes('wear') || lower.includes('apparel')) {
            return { icon: Shirt, iconBg: 'bg-amber-50 dark:bg-amber-950/60', iconColor: 'text-amber-500', statColor: 'text-pink-600 dark:text-pink-400' };
        }
        if (lower.includes('food') || lower.includes('drink') || lower.includes('snack') || lower.includes('restaur')) {
            return { icon: Utensils, iconBg: 'bg-yellow-50 dark:bg-yellow-950/60', iconColor: 'text-yellow-600', statColor: 'text-rose-600 dark:text-rose-400' };
        }
        if (lower.includes('soft') || lower.includes('code') || lower.includes('app') || lower.includes('service')) {
            return { icon: Code, iconBg: 'bg-indigo-50 dark:bg-indigo-950/60', iconColor: 'text-indigo-500', statColor: 'text-purple-600 dark:text-purple-400' };
        }
        return { icon: Tag, iconBg: 'bg-teal-50 dark:bg-teal-950/60', iconColor: 'text-teal-500', statColor: 'text-teal-600 dark:text-teal-400' };
    };

    const salesChartData = salesPerformance || [];
    const sourcesData = leadSources || [];
    const totalSourcesLeads = sourcesData.reduce((acc, curr) => acc + curr.count, 0);

    const leadsData = [...leadOverview].sort((a, b) => b.count - a.count);
    const dealsData = [...dealPipeline].sort((a, b) => b.amount - a.amount);
    const leadTrendData = dailyLeadTrend || [];

    const totalLeadsOverview = leadsData.reduce((acc, curr) => acc + curr.count, 0);
    const totalDealsPipeline = dealsData.reduce((acc, curr) => acc + curr.amount, 0);

    const teamData = teamPerformance.slice(0, 5);
    const totalTeamWonAmount = teamData.reduce((acc, curr) => acc + curr.wonAmount, 0);
    const productsData = topProducts.slice(0, 5);

    const maxLeadCount = Math.max(...leadsData.map(item => item.count), 1);
    const maxDealAmount = Math.max(...dealsData.map(item => item.amount), 1);
    const maxTeamAmount = Math.max(...teamData.map(item => item.wonAmount), 1);
    const maxProductValue = Math.max(...productsData.map(item => item.wonValue), 1);

    const winRate = winRateStats?.winRate ?? 0;
    const wonCount = winRateStats?.wonCount ?? 0;
    const lostCount = winRateStats?.lostCount ?? 0;

    const uncontacted = needsAttention?.uncontactedLeads ?? 0;
    const unassigned = needsAttention?.unassignedLeads ?? 0;
    const inactive = needsAttention?.inactiveDeals ?? 0;
    const followupToday = needsAttention?.followupLeadsToday ?? stats?.followupLeadsToday ?? 0;
    const overdueFollowups = needsAttention?.overdueLeadTasks ?? stats?.overdueLeadTasks ?? 0;
    const overdueDealTasks = needsAttention?.overdueDealTasks ?? stats?.overdueDealTasks ?? 0;

    return (
        <AuthenticatedLayout
            breadcrumbs={[{ label: t('CRM') }]}
        >
            <Head title={t('CRM Overview')} />
            <div className="space-y-6 pb-8 rounded-2xl">
                {/* Header Title Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{t('CRM Overview')}</h1>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            {t('Leads, Deals and Contact overview for all users.')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <DashboardDateFilter />
                    </div>
                </div>

                {/* 1. Top Row: 6 PBX Glassy KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {/* Card 1: Total Leads */}
                    <div
                        onClick={() => handleNavigateLeads(stats?.totalLeads ?? 0)}
                        title={(stats?.totalLeads ?? 0) > 0 ? String(t('Click to view leads')) : String(t('No leads available'))}
                        className={`bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/50 backdrop-blur-md rounded-2xl p-4 shadow-sm transition-all duration-300 flex items-center gap-3 ${
                            (stats?.totalLeads ?? 0) > 0 ? 'cursor-pointer hover:border-indigo-400 hover:shadow-md hover:scale-[1.01]' : 'cursor-not-allowed opacity-80'
                        }`}
                    >
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-200/60 text-indigo-600 dark:bg-indigo-500/20 dark:border-indigo-800/60 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block leading-tight">{t('Total Leads')}</span>
                            <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">
                                {(stats?.totalLeads ?? 0).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Active Deals */}
                    <div
                        onClick={() => handleNavigateDeals(stats?.activeDeals ?? 0, { status: 'active' })}
                        title={(stats?.activeDeals ?? 0) > 0 ? String(t('Click to view active deals')) : String(t('No active deals available'))}
                        className={`bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-900/50 backdrop-blur-md rounded-2xl p-4 shadow-sm transition-all duration-300 flex items-center gap-3 ${
                            (stats?.activeDeals ?? 0) > 0 ? 'cursor-pointer hover:border-teal-400 hover:shadow-md hover:scale-[1.01]' : 'cursor-not-allowed opacity-80'
                        }`}
                    >
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-200/60 text-teal-600 dark:bg-teal-500/20 dark:border-teal-800/60 dark:text-teal-400 flex items-center justify-center shrink-0">
                            <Handshake className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block leading-tight">{t('Active Deals')}</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xl font-bold text-slate-900 dark:text-white">{stats?.activeDeals ?? 0}</span>
                            </div>
                            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 block">
                                {formatCompactCurrency(stats?.openDealValue ?? 0, pageProps)} {t('Active value')}
                            </span>
                        </div>
                    </div>

                    {/* Card 3: Won Deal Value */}
                    <div
                        onClick={() => handleNavigateDeals((stats?.wonDealsThisMonth || (stats?.wonDealAmount ?? 0) > 0 ? 1 : 0), { status: 'Won' })}
                        title={(stats?.wonDealsThisMonth || (stats?.wonDealAmount ?? 0) > 0) ? String(t('Click to view won deals')) : String(t('No won deals available'))}
                        className={`bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-900/50 backdrop-blur-md rounded-2xl p-4 shadow-sm transition-all duration-300 flex items-center gap-3 ${
                            (stats?.wonDealsThisMonth || (stats?.wonDealAmount ?? 0) > 0) ? 'cursor-pointer hover:border-purple-400 hover:shadow-md hover:scale-[1.01]' : 'cursor-not-allowed opacity-80'
                        }`}
                    >
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-200/60 text-purple-600 dark:bg-purple-500/20 dark:border-purple-800/60 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block leading-tight">{t('Won Deal Value')}</span>
                            <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">
                                {formatCompactCurrency(stats?.wonDealAmount ?? 0, pageProps)}
                            </span>
                            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 block">
                                {stats?.wonDealsThisMonth ?? 0} {t('won deals')}
                            </span>
                        </div>
                    </div>

                    {/* Card 4: Win Rate */}
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 backdrop-blur-md rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-200/60 text-emerald-600 dark:bg-emerald-500/20 dark:border-emerald-800/60 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Target className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block leading-tight">{t('Win Rate')}</span>
                            <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">{winRate}%</span>
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                                {wonCount} {t('won')} {t('of')} {winRateStats?.totalDeals ?? (wonCount + lostCount)} {t('deals')}
                            </span>
                        </div>
                    </div>

                    {/* Card 5: Calls */}
                    <div className="bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/70 dark:border-sky-900/50 backdrop-blur-md rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-200/60 text-sky-600 dark:bg-sky-500/20 dark:border-sky-800/60 dark:text-sky-400 flex items-center justify-center shrink-0">
                            <Phone className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block leading-tight">{t('Calls')}</span>
                            <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">{stats?.callsToday ?? 0}</span>
                            <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 block">
                                {stats?.connectedCallsToday ?? 0} {t('connected')} · {stats?.missedCallsToday ?? 0} {t('missed')}
                            </span>
                        </div>
                    </div>

                    {/* Card 6: Overdue Follow-ups */}
                    <div
                        onClick={() => handleNavigateLeads(stats?.overdueTasks ?? 0, { filter: 'overdue_followup' })}
                        title={(stats?.overdueTasks ?? 0) > 0 ? String(t('Click to view overdue follow-ups')) : String(t('No overdue follow-ups'))}
                        className={`bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 backdrop-blur-md rounded-2xl p-4 shadow-sm transition-all duration-300 flex items-center gap-3 relative overflow-hidden ${
                            (stats?.overdueTasks ?? 0) > 0 ? 'cursor-pointer hover:border-rose-400 hover:shadow-md hover:scale-[1.01]' : 'cursor-not-allowed opacity-80'
                        }`}
                    >
                        <div className="relative w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-200/60 text-rose-600 dark:bg-rose-500/20 dark:border-rose-800/60 dark:text-rose-400 flex items-center justify-center shrink-0 font-black">
                            <span className="animate-pulse text-lg">!</span>
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                            </span>
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block leading-tight">{t('Overdue Follow-ups')}</span>
                            <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">{stats?.overdueTasks ?? 0}</span>
                            <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 animate-pulse block">
                                {t('Needs attention')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Merged Lead & Deal Performance Cards (Matching Telemetry Card Aesthetics) */}
                <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-2">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{t('Lead & Deal Performance')}</h3>
                                <p className="text-xs font-semibold text-slate-400">{t('Leads, Deals and Conversion rates for Today, Yesterday & Monthly periods')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                                <Sparkles className="w-3 h-3" />
                                {t('Leads')}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200/60 dark:border-emerald-800/60">
                                <TrendingUp className="w-3 h-3" />
                                {t('Deals')}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                label: t("Today"),
                                dateSub: dateSubtitles.todayStr,
                                startDate: dateRanges.today.startDate,
                                endDate: dateRanges.today.endDate,
                                leads: stats?.todayLeads ?? 0,
                                deals: stats?.todayDeals ?? 0,
                                icon: <Sparkles className="w-5 h-5" />,
                                cardBg: 'bg-[#f4f7ff] dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40',
                                iconBg: 'bg-blue-100/80 dark:bg-blue-900/60 text-blue-500 dark:text-blue-400',
                                numColor: 'text-blue-600 dark:text-blue-400',
                                rateColor: 'text-blue-600 dark:text-blue-400',
                                waveColor: '#3b82f6',
                                gradId: 'waveTodayGrad',
                            },
                            {
                                label: t("Yesterday"),
                                dateSub: dateSubtitles.yestStr,
                                startDate: dateRanges.yesterday.startDate,
                                endDate: dateRanges.yesterday.endDate,
                                leads: stats?.yesterdayLeads ?? 0,
                                deals: stats?.yesterdayDeals ?? 0,
                                icon: <Clock className="w-5 h-5" />,
                                cardBg: 'bg-[#f0fbf5] dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40',
                                iconBg: 'bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-500 dark:text-emerald-400',
                                numColor: 'text-emerald-500 dark:text-emerald-400',
                                rateColor: 'text-emerald-500 dark:text-emerald-400',
                                waveColor: '#10b981',
                                gradId: 'waveYesterdayGrad',
                            },
                            {
                                label: t("This Month"),
                                dateSub: dateSubtitles.thisMonthRange,
                                startDate: dateRanges.thisMonth.startDate,
                                endDate: dateRanges.thisMonth.endDate,
                                leads: stats?.thisMonthLeads ?? stats?.monthLeads ?? 0,
                                deals: stats?.thisMonthDeals ?? 0,
                                icon: <BarChart3 className="w-5 h-5" />,
                                cardBg: 'bg-[#fffbf0] dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40',
                                iconBg: 'bg-amber-100/80 dark:bg-amber-900/60 text-amber-500 dark:text-amber-400',
                                numColor: 'text-amber-500 dark:text-amber-400',
                                rateColor: 'text-amber-500 dark:text-amber-400',
                                waveColor: '#f59e0b',
                                gradId: 'waveThisMonthGrad',
                            },
                            {
                                label: t("Previous Month"),
                                dateSub: dateSubtitles.prevMonthRange,
                                startDate: dateRanges.prevMonth.startDate,
                                endDate: dateRanges.prevMonth.endDate,
                                leads: stats?.prevMonthLeads ?? 0,
                                deals: stats?.prevMonthDeals ?? 0,
                                icon: <Trophy className="w-5 h-5" />,
                                cardBg: 'bg-[#fff5f6] dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40',
                                iconBg: 'bg-rose-100/80 dark:bg-rose-900/60 text-rose-500 dark:text-rose-400',
                                numColor: 'text-rose-500 dark:text-rose-400',
                                rateColor: 'text-rose-500 dark:text-rose-400',
                                waveColor: '#f43f5e',
                                gradId: 'wavePrevMonthGrad',
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
                                    className={`relative ${item.cardBg} rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden min-h-[165px] ${
                                        (item.leads > 0 || item.deals > 0) ? 'cursor-pointer hover:scale-[1.01]' : 'cursor-not-allowed opacity-80'
                                    }`}
                                >
                                    {/* Header: Title, Subtitle Date & Soft Icon Badge */}
                                    <div className="flex items-start justify-between z-10">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                                {item.label}
                                            </h4>
                                            <p className="text-xs font-normal text-slate-400 dark:text-slate-500 mt-0.5">
                                                {item.dateSub}
                                            </p>
                                        </div>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}>
                                            {item.icon}
                                        </div>
                                    </div>

                                    {/* Center Metric: Leads / Deals Count */}
                                    <div className="mt-4 mb-2 z-10">
                                        <div className="flex items-start gap-3">
                                            <div
                                                onClick={(e) => {
                                                    if (item.leads > 0) {
                                                        e.stopPropagation();
                                                        handleNavigateLeads(item.leads, { created_from: item.startDate, created_to: item.endDate });
                                                    }
                                                }}
                                                className={`flex flex-col ${item.leads > 0 ? 'cursor-pointer group/lead' : 'cursor-not-allowed'}`}
                                                title={item.leads > 0 ? String(t('Click to view leads for {{period}}', { period: item.label })) : String(t('No leads'))}
                                            >
                                                <div className={`text-2xl font-bold leading-none ${item.numColor} ${item.leads > 0 ? 'group-hover/lead:underline' : ''}`}>
                                                    {item.leads.toLocaleString()}
                                                </div>
                                                <p className="text-xs font-normal text-slate-400 dark:text-slate-500 mt-1">
                                                    {t('Leads')}
                                                </p>
                                            </div>
                                            <span className="text-2xl font-light text-slate-300 dark:text-slate-600 leading-none mt-0.5">
                                                /
                                            </span>
                                            <div
                                                onClick={(e) => {
                                                    if (item.deals > 0) {
                                                        e.stopPropagation();
                                                        handleNavigateDeals(item.deals, { created_from: item.startDate, created_to: item.endDate });
                                                    }
                                                }}
                                                className={`flex flex-col ${item.deals > 0 ? 'cursor-pointer group/deal' : 'cursor-not-allowed'}`}
                                                title={item.deals > 0 ? String(t('Click to view deals for {{period}}', { period: item.label })) : String(t('No deals'))}
                                            >
                                                <div className={`text-2xl font-bold leading-none text-slate-700 dark:text-slate-200 ${item.deals > 0 ? 'group-hover/deal:underline' : ''}`}>
                                                    {item.deals.toLocaleString()}
                                                </div>
                                                <p className="text-xs font-normal text-slate-400 dark:text-slate-500 mt-1">
                                                    {t('Deals')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Row: Conversion Rate & Sparkline Wave Graph with Dot */}
                                    <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/40 flex items-end justify-between z-10">
                                        <div>
                                            <div className={`text-lg font-bold ${item.rateColor}`}>
                                                {convRate}
                                            </div>
                                            <p className="text-xs font-normal text-slate-400 dark:text-slate-500 mt-0.5">
                                                {t('Conversion Rate')}
                                            </p>
                                        </div>
                                        <div className="w-[110px] h-[34px] pb-0.5">
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

                {/* 2. Second Row: Sales Performance, Lead Sources & Needs Attention Box */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sales Performance Area Chart (Col 5) */}
                    <div className="lg:col-span-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('Sales Performance')}</h3>
                            <p className="text-xs font-semibold text-slate-400 mb-4">{t('Monthly won deal value')}</p>

                            <div className="h-[230px] w-full">
                                {salesChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                            <YAxis 
                                                tick={{ fontSize: 11, fill: '#94a3b8' }} 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tickFormatter={(v) => {
                                                    if (!v) return '0';
                                                    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                                                    if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
                                                    return `${v}`;
                                                }} 
                                            />
                                            <RechartsTooltip
                                                formatter={(val: any) => [formatCurrency(Number(val), pageProps), t('Won Value')]}
                                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                            />
                                            <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={1} fill="url(#salesGradient)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-400">
                                        {t('No sales data available')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Lead Sources Donut Chart (Col 4) */}
                    <div className="lg:col-span-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('Lead Sources')}</h3>
                            <p className="text-xs font-semibold text-slate-400 mb-4">{t('Total leads by source')}</p>

                            {sourcesData.length > 0 ? (
                                <div className="grid grid-cols-1 items-center gap-4">
                                    {/* Donut Pie */}
                                    <div className="relative h-[160px] flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={sourcesData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={45}
                                                    outerRadius={68}
                                                    paddingAngle={3}
                                                    dataKey="count"
                                                    labelLine={false}
                                                    label={({ percent }) => (percent && percent >= 0.05 ? `${(percent * 100).toFixed(0)}%` : '')}
                                                >
                                                    {sourcesData.map((entry, idx) => (
                                                        <Cell key={`source-cell-${idx}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip formatter={(val: any) => [val, t('Leads')]} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-base font-bold text-slate-900 dark:text-white leading-none">
                                                {totalSourcesLeads.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-400 mt-0.5">{t('leads')}</span>
                                        </div>
                                    </div>

                                    {/* Legend Table */}
                                    <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                                        {sourcesData.map((item, idx) => {
                                            const pct = totalSourcesLeads > 0 ? ((item.count / totalSourcesLeads) * 100).toFixed(1) : '0';
                                            return (
                                                <div key={idx} className="flex items-center justify-between text-xs font-semibold p-1.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 backdrop-blur-sm">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                                        <span className="text-slate-700 dark:text-slate-300 truncate">{t(item.name)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="text-slate-900 dark:text-white font-extrabold">{item.count}</span>
                                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-700/80 px-1.5 py-0.5 rounded-full">{pct}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[200px] flex items-center justify-center text-xs font-semibold text-slate-400">
                                    {t('No lead sources recorded')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Needs Attention Box (Col 3) */}
                    <div className="lg:col-span-3 bg-gradient-to-br from-blue-50/90 via-sky-50/50 to-indigo-50/40 dark:from-blue-950/50 dark:via-sky-950/40 dark:to-slate-900/90 border border-blue-200/80 dark:border-blue-900/60 backdrop-blur-md rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative overflow-hidden ring-1 ring-blue-400/30 dark:ring-blue-500/20">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/15 rounded-full blur-2xl pointer-events-none animate-pulse" />
                        <div>
                            <style>{`
                                @keyframes waveFloat {
                                    0%, 100% { transform: translateY(0px); }
                                    50% { transform: translateY(-4px); }
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
                                                    animation: 'waveFloat 1.8s ease-in-out infinite',
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
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Third Row: Glassy Dynamic Lead Overview & Deal Pipeline */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Dynamic Lead Overview Card */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col min-h-[340px]">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('Lead Overview')}</h3>
                                <p className="text-xs font-semibold text-slate-400">{t('Leads by pipeline')}</p>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                                <button
                                    onClick={() => setLeadChartType('bar')}
                                    title={t('Bar Chart')}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${leadChartType === 'bar' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                                >
                                    <BarChart2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setLeadChartType('pie')}
                                    title={t('Pie Chart')}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${leadChartType === 'pie' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                                >
                                    <PieChartIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setLeadChartType('graph')}
                                    title={t('Area Graph')}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${leadChartType === 'graph' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                                >
                                    <TrendingUp className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setLeadChartType('list')}
                                    title={t('List View')}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${leadChartType === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 w-full min-h-[220px]">
                            {leadsData.length > 0 ? (
                                <>
                                    {leadChartType === 'bar' && (
                                        <div className="h-[230px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={leadsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                                    <Bar dataKey="count" name={t('Leads')} fill="#6366f1" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {leadChartType === 'pie' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 h-[230px]">
                                            <div className="h-[210px] w-full relative flex items-center justify-center">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={leadsData}
                                                            dataKey="count"
                                                            nameKey="name"
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={40}
                                                            outerRadius={75}
                                                            paddingAngle={3}
                                                            labelLine={false}
                                                            label={({ percent }) => (percent && percent >= 0.05 ? `${(percent * 100).toFixed(0)}%` : '')}
                                                        >
                                                            {leadsData.map((_, idx) => (
                                                                <Cell key={`lead-cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {/* Identifiers Legend Table */}
                                            <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                                                {leadsData.map((item, idx) => {
                                                    const pct = totalLeadsOverview > 0 ? ((item.count / totalLeadsOverview) * 100).toFixed(1) : '0';
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between text-xs font-semibold p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 backdrop-blur-sm">
                                                            <div className="flex items-center gap-2 truncate">
                                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                                                                <span className="text-slate-700 dark:text-slate-300 truncate">{t(item.name)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-slate-900 dark:text-white font-extrabold">{item.count}</span>
                                                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/50 dark:border-indigo-800/50 px-1.5 py-0.5 rounded-full">{pct}%</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {leadChartType === 'graph' && (
                                        <div className="h-[230px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={leadsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="leadAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                                    <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={1.5} fillOpacity={1} fill="url(#leadAreaGrad)" name={t('Leads')} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {leadChartType === 'list' && (
                                        <div className="overflow-y-auto space-y-4 pr-1 max-h-[220px]">
                                            {leadsData.map((item, idx) => {
                                                const percentage = Math.min(Math.round((item.count / maxLeadCount) * 100), 100);
                                                return (
                                                    <div key={item.id || idx} className="space-y-1">
                                                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                                            <span>{t(item.name)}</span>
                                                            <span className="text-slate-900 dark:text-white font-extrabold">{item.count}</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                            <div
                                                                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-400">
                                    {t('No lead pipeline data available')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dynamic Deal Pipeline Card */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col min-h-[340px]">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('Deal Pipeline')}</h3>
                                <p className="text-xs font-semibold text-slate-400">{t('Open deal value by pipeline')}</p>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                                <button
                                    onClick={() => setDealChartType('bar')}
                                    title={t('Bar Chart')}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${dealChartType === 'bar' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                                >
                                    <BarChart2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setDealChartType('pie')}
                                    title={t('Pie Chart')}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${dealChartType === 'pie' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                                >
                                    <PieChartIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setDealChartType('graph')}
                                    title={t('Area Graph')}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${dealChartType === 'graph' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                                >
                                    <TrendingUp className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setDealChartType('list')}
                                    title={t('List View')}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${dealChartType === 'list' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 w-full min-h-[220px]">
                            {dealsData.length > 0 ? (
                                <>
                                    {dealChartType === 'bar' && (
                                        <div className="h-[230px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={dealsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                                                    <RechartsTooltip formatter={(val: any) => [formatCompactCurrency(Number(val), pageProps), t('Open Value')]} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                                    <Bar dataKey="amount" name={t('Amount')} fill="#14b8a6" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {dealChartType === 'pie' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 h-[230px]">
                                            <div className="h-[210px] w-full relative flex items-center justify-center">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={dealsData}
                                                            dataKey="amount"
                                                            nameKey="name"
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={40}
                                                            outerRadius={75}
                                                            paddingAngle={3}
                                                            labelLine={false}
                                                            label={({ percent }) => (percent && percent >= 0.05 ? `${(percent * 100).toFixed(0)}%` : '')}
                                                        >
                                                            {dealsData.map((_, idx) => (
                                                                <Cell key={`deal-cell-${idx}`} fill={CHART_COLORS[(idx + 1) % CHART_COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <RechartsTooltip formatter={(val: any) => [formatCompactCurrency(Number(val), pageProps), t('Open Value')]} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {/* Identifiers Legend Table */}
                                            <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                                                {dealsData.map((item, idx) => {
                                                    const pct = totalDealsPipeline > 0 ? ((item.amount / totalDealsPipeline) * 100).toFixed(1) : '0';
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between text-xs font-semibold p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 backdrop-blur-sm">
                                                            <div className="flex items-center gap-2 truncate">
                                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[(idx + 1) % CHART_COLORS.length] }} />
                                                                <span className="text-slate-700 dark:text-slate-300 truncate">{t(item.name)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-slate-900 dark:text-white font-extrabold">{formatCompactCurrency(item.amount, pageProps)}</span>
                                                                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 border border-teal-200/50 dark:border-teal-800/50 px-1.5 py-0.5 rounded-full">{pct}%</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {dealChartType === 'graph' && (
                                        <div className="h-[230px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={dealsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="dealAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                                                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                                                    <RechartsTooltip formatter={(val: any) => [formatCompactCurrency(Number(val), pageProps), t('Open Value')]} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                                    <Area type="monotone" dataKey="amount" stroke="#14b8a6" strokeWidth={1.5} fillOpacity={1} fill="url(#dealAreaGrad)" name={t('Amount')} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {dealChartType === 'list' && (
                                        <div className="overflow-y-auto space-y-4 pr-1 max-h-[220px]">
                                            {dealsData.map((item, idx) => {
                                                const percentage = Math.min(Math.round((item.amount / maxDealAmount) * 100), 100);
                                                return (
                                                    <div key={item.id || idx} className="space-y-1">
                                                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                                            <span>{t(item.name)}</span>
                                                            <span className="text-slate-900 dark:text-white font-extrabold">
                                                                {formatCompactCurrency(item.amount, pageProps)} · {item.deals} {t('deals')}
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                            <div
                                                                className="bg-teal-500 h-full rounded-full transition-all duration-500"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-400">
                                    {t('No deal pipeline data available')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Fourth Row: Top Performers & Top Products (Glassy Styling) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Performers (Dynamic View Switcher - Matching Lead Overview Design) */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col min-h-[340px]">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('Top Performers')}</h3>
                                <p className="text-xs font-semibold text-slate-400">{t('Won deals and value this month')}</p>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                                <button
                                    onClick={() => setTopPerformerChartType('bar')}
                                    title={t('Bar Chart')}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${topPerformerChartType === 'bar' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                                >
                                    <BarChart2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setTopPerformerChartType('pie')}
                                    title={t('Pie Chart')}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${topPerformerChartType === 'pie' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                                >
                                    <PieChartIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setTopPerformerChartType('graph')}
                                    title={t('Area Graph')}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${topPerformerChartType === 'graph' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                                >
                                    <TrendingUp className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setTopPerformerChartType('list')}
                                    title={t('List View')}
                                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${topPerformerChartType === 'list' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 w-full min-h-[220px]">
                            {teamData.length > 0 ? (
                                <>
                                    {topPerformerChartType === 'bar' && (
                                        <div className="h-[230px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={teamData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                                                    <RechartsTooltip formatter={(val: any) => [formatCompactCurrency(Number(val), pageProps), t('Won Value')]} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                                    <Bar dataKey="wonAmount" name={t('Won Amount')} fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {topPerformerChartType === 'pie' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 h-[230px]">
                                            <div className="h-[210px] w-full relative flex items-center justify-center">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={teamData}
                                                            dataKey="wonAmount"
                                                            nameKey="name"
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={40}
                                                            outerRadius={75}
                                                            paddingAngle={3}
                                                            labelLine={false}
                                                            label={({ percent }) => (percent && percent >= 0.05 ? `${(percent * 100).toFixed(0)}%` : '')}
                                                        >
                                                            {teamData.map((_, idx) => (
                                                                <Cell key={`performer-cell-${idx}`} fill={CHART_COLORS[(idx + 2) % CHART_COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <RechartsTooltip formatter={(val: any) => [formatCompactCurrency(Number(val), pageProps), t('Won Value')]} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {/* Identifiers Legend Table */}
                                            <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                                                {teamData.map((item, idx) => {
                                                    const pct = totalTeamWonAmount > 0 ? ((item.wonAmount / totalTeamWonAmount) * 100).toFixed(1) : '0';
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between text-xs font-semibold p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 backdrop-blur-sm">
                                                            <div className="flex items-center gap-2 truncate">
                                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[(idx + 2) % CHART_COLORS.length] }} />
                                                                <span className="text-slate-700 dark:text-slate-300 truncate">{item.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-slate-900 dark:text-white font-extrabold">{formatCompactCurrency(item.wonAmount, pageProps)}</span>
                                                                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 border border-violet-200/50 dark:border-violet-800/50 px-1.5 py-0.5 rounded-full">{pct}%</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {topPerformerChartType === 'graph' && (
                                        <div className="h-[230px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={teamData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="performerAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                                                    <RechartsTooltip formatter={(val: any) => [formatCompactCurrency(Number(val), pageProps), t('Won Value')]} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                                    <Area type="monotone" dataKey="wonAmount" stroke="#8b5cf6" strokeWidth={1.5} fillOpacity={1} fill="url(#performerAreaGrad)" name={t('Won Amount')} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {topPerformerChartType === 'list' && (
                                        <div className="overflow-y-auto space-y-4 pr-1 max-h-[220px]">
                                            {teamData.map((member, idx) => {
                                                const rank = idx + 1;
                                                let badgeBg = 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
                                                if (rank === 1) badgeBg = 'bg-amber-400 text-white';
                                                else if (rank === 2) badgeBg = 'bg-slate-300 text-slate-700';
                                                else if (rank === 3) badgeBg = 'bg-amber-600 text-white';

                                                const percentage = Math.min(Math.round((member.wonAmount / maxTeamAmount) * 100), 100);

                                                return (
                                                    <div key={member.id || idx} className="space-y-1">
                                                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${badgeBg}`}>
                                                                    {rank}
                                                                </span>
                                                                <span>{member.name}</span>
                                                            </div>
                                                            <span className="text-slate-900 dark:text-white font-extrabold">
                                                                {formatCompactCurrency(member.wonAmount, pageProps)} · {member.wonDeals} {t('deals')}
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                            <div
                                                                className="bg-violet-500 h-full rounded-full transition-all duration-500"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-400">
                                    {t('No team performance records')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Products */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col min-h-[340px]">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('Top Products')}</h3>
                        <p className="text-xs font-semibold text-slate-400 mb-4">{t('Won deal value this month')}</p>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[220px]">
                            {productsData.length > 0 ? (
                                productsData.map((item, idx) => {
                                    const rank = idx + 1;
                                    let badgeBg = 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
                                    if (rank === 1) badgeBg = 'bg-amber-400 text-white';
                                    else if (rank === 2) badgeBg = 'bg-slate-300 text-slate-700';
                                    else if (rank === 3) badgeBg = 'bg-amber-600 text-white';

                                    const percentage = Math.min(Math.round((item.wonValue / maxProductValue) * 100), 100);

                                    return (
                                        <div key={item.id || idx} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                                <div className="flex items-center gap-2 min-w-0 pr-1">
                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${badgeBg}`}>
                                                        {rank}
                                                    </span>
                                                    <span className="truncate">{item.name}</span>
                                                </div>
                                                <span className="text-slate-900 dark:text-white font-extrabold shrink-0">
                                                    {formatCompactCurrency(item.wonValue, pageProps)}{item.wonDeals ? ` · ${item.wonDeals} ${t('deals')}` : ''}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-400">
                                    {t('No product performance records')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 5. Fifth Row: Top Sellers in Product Category (Lazy Loaded) */}
                <div ref={leaderboardSectionRef} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all duration-300 relative min-h-[320px]">
                    {isLeaderboardLoading && (
                        <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs z-10 flex flex-col items-center justify-center rounded-3xl gap-2">
                            <Loader2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-spin" />
                            <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">{t('Loading category leaderboard...')}</span>
                        </div>
                    )}

                    {/* Header & Controls */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t('Top Sellers in Product Category')}</h2>
                            <p className="text-xs font-semibold text-slate-400 mt-0.5">{t('Which category item was sold by whom')}</p>
                        </div>

                        {/* Filters & Date Picker */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Category Filter */}
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 font-bold text-xs">{t('Category')}:</span>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="h-9 min-w-[160px] bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-xs font-bold rounded-xl focus:ring-0">
                                        <SelectValue placeholder={t('All Categories')} />
                                    </SelectTrigger>
                                    <SelectContent searchable searchPlaceholder={t('Search Category...')} className="text-xs">
                                        {categoryOptions.map((opt) => (
                                            <SelectItem key={opt.id} value={opt.id} className="text-xs font-medium">
                                                {opt.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Seller Filter */}
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 font-bold text-xs">{t('Seller')}:</span>
                                <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                                    <SelectTrigger className="h-9 min-w-[160px] bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-xs font-bold rounded-xl focus:ring-0">
                                        <SelectValue placeholder={t('All Sellers')} />
                                    </SelectTrigger>
                                    <SelectContent searchable searchPlaceholder={t('Search Seller...')} className="text-xs">
                                        {sellerOptions.map((opt) => (
                                            <SelectItem key={opt.id} value={opt.id} className="text-xs font-medium">
                                                {opt.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Date Range Picker */}
                            <div className="flex items-center">
                                <DateRangePicker
                                    value={leaderboardDateRange}
                                    onChange={(val) => {
                                        setLeaderboardDateRange(val);
                                        if (val && val.includes(' - ')) {
                                            const [start, end] = val.split(' - ');
                                            fetchLeaderboardData(start, end);
                                        }
                                    }}
                                    placeholder={t('Select Date Range')}
                                    className="h-9 min-w-[210px] bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-xs font-bold rounded-xl"
                                />
                            </div>
                        </div>
                    </div>



                    {/* Heatmap Matrix Table (Left ~75%) & Category Leaders (Right ~25%) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Heatmap Matrix Table */}
                        <div className="lg:col-span-8 overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                            {filteredMatrixData.sellers.length > 0 ? (
                                <>
                                    <table className="w-full text-left border-collapse min-w-[650px]">
                                        <thead>
                                            <tr className="border-b border-slate-200/60 dark:border-slate-800 text-[11px] font-bold text-slate-400">
                                                <th className="py-3.5 px-3 text-center w-10">#</th>
                                                <th className="py-3.5 px-3 text-center">{t('Seller')}</th>
                                                {filteredMatrixData.categories.map((cat) => (
                                                    <th key={cat} className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                                                        {t(cat)}
                                                    </th>
                                                ))}
                                                <th className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">{t('Total')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                                            {filteredMatrixData.sellers.slice(0, visibleSellerCount).map((sellerRow) => {
                                                const visibleCats = filteredMatrixData.categories;
                                                const valuesArr = visibleCats.map(cat => sellerRow.values ? (sellerRow.values[cat] || 0) : 0);
                                                const maxValInRow = Math.max(...valuesArr, 0);

                                                return (
                                                    <tr key={sellerRow.rank || sellerRow.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                        {/* Rank Badge */}
                                                        <td className="py-3.5 px-3 text-center">
                                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs mx-auto ${sellerRow.badgeColor}`}>
                                                                {sellerRow.rank}
                                                            </span>
                                                        </td>

                                                        {/* Seller Avatar with Tooltip (No text name) */}
                                                        <td className="py-3.5 px-3 text-center">
                                                            <TooltipProvider>
                                                                <Tooltip delayDuration={0}>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="h-8 w-8 rounded-full border-2 border-background overflow-hidden ring-1 ring-border/50 shrink-0 mx-auto cursor-pointer transition-transform hover:scale-110">
                                                                            {(sellerRow.avatarImage || (sellerRow.avatar && (sellerRow.avatar.includes('.') || sellerRow.avatar.includes('/')))) ? (
                                                                                <img
                                                                                    src={getImagePath(sellerRow.avatarImage || sellerRow.avatar)}
                                                                                    alt={sellerRow.name || ''}
                                                                                    className="h-full w-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                <div className="h-full w-full bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                                                    {sellerRow.name?.charAt(0).toUpperCase() || sellerRow.avatar || '?'}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>{sellerRow.name}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </td>

                                                        {/* Category Matrix Heatmap Cells */}
                                                        {visibleCats.map((catName) => {
                                                            const cellVal = sellerRow.values ? (sellerRow.values[catName] || 0) : 0;
                                                            const cellAmount = sellerRow.amounts ? (sellerRow.amounts[catName] || 0) : 0;
                                                            const isPeak = cellVal === maxValInRow && cellVal > 0;
                                                            const ratio = maxValInRow > 0 ? cellVal / maxValInRow : 0;

                                                            let bgStyle = '';
                                                            if (isPeak) {
                                                                bgStyle = 'bg-[#2563eb] text-white font-black shadow-2xs';
                                                            } else if (ratio >= 0.7) {
                                                                bgStyle = 'bg-blue-200/90 text-slate-900 font-bold dark:bg-blue-900/40 dark:text-blue-200';
                                                            } else if (ratio >= 0.4) {
                                                                bgStyle = 'bg-blue-100/80 text-slate-800 font-semibold dark:bg-blue-950/40 dark:text-blue-300';
                                                            } else if (ratio > 0) {
                                                                bgStyle = 'bg-blue-50/70 text-slate-700 font-medium dark:bg-slate-800/60 dark:text-slate-300';
                                                            } else {
                                                                bgStyle = 'bg-slate-50/40 text-slate-400 dark:bg-slate-900/30';
                                                                                            }

                                                             return (
                                                                <td key={catName} className="p-1 text-center" title={cellAmount ? `Amount: ${formatCompactCurrency(cellAmount, pageProps)}` : ''}>
                                                                    <div className={`w-full py-2.5 px-2 rounded-lg text-center transition-all ${bgStyle}`}>
                                                                        {cellVal}
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}

                                                        {/* Row Total */}
                                                        <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white text-xs">
                                                            {sellerRow.totalAmount ? formatCompactCurrency(sellerRow.totalAmount, pageProps) : (sellerRow.totalUnits || 0)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {filteredMatrixData.sellers.length > visibleSellerCount && (
                                        <div className="py-3 text-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                                            <button
                                                type="button"
                                                onClick={() => setVisibleSellerCount(prev => prev + 10)}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all shadow-2xs"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                                {t('View More Sellers')} ({filteredMatrixData.sellers.length - visibleSellerCount} {t('remaining')})
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="py-12 text-center text-xs font-semibold text-slate-400">
                                    {t('No won deal category sales records found')}
                                </div>
                            )}
                        </div>

                        {/* Category Leaders Widget */}
                        <div className="lg:col-span-4 bg-slate-50/40 dark:bg-slate-800/30 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80">
                            {/* Widget Header */}
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/50 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('Category Leaders')}</h3>
                                </div>
                                <button className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                                    {t('View All')}
                                </button>
                            </div>

                            {/* Leaders List */}
                            <div className="space-y-3.5">
                                {filteredMatrixData.leaders.length > 0 ? (
                                    filteredMatrixData.leaders.map((item, idx) => {
                                        const iconInfo = getCategoryIconInfo(item.category);
                                        const IconComp = iconInfo.icon;
                                        return (
                                            <div key={idx} className="flex items-center justify-between text-xs font-semibold gap-2 group cursor-pointer hover:bg-white dark:hover:bg-slate-800/80 p-1.5 rounded-xl transition-all">
                                                {/* Left: Icon + Category Name */}
                                                <div className="flex items-center gap-2.5 w-32 shrink-0">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconInfo.iconBg}`}>
                                                        <IconComp className={`w-3.5 h-3.5 ${iconInfo.iconColor}`} />
                                                    </div>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{t(item.category)}</span>
                                                </div>

                                                {/* Middle: Leader Name */}
                                                <span className="text-slate-400 dark:text-slate-500 text-[11px] font-semibold truncate text-left flex-1">
                                                    {item.leader}
                                                </span>

                                                {/* Right: Units Sold Stat + Chevron */}
                                                <div className={`flex items-center gap-1 font-bold shrink-0 ${iconInfo.statColor}`}>
                                                    <span>{item.units}</span>
                                                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-8 text-center text-xs font-semibold text-slate-400">
                                        {t('No category leaders yet')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Organization Type Conversion Box (Positioned at the very end) */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all duration-300">
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
                                {(showAllOrgTypes ? organizationTypeConversion : organizationTypeConversion.slice(0, 3)).map((item, idx) => {
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
                                                    {formatCurrency(item.total_value, pageProps)}
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

import React, { useState } from 'react';
import { getImagePath } from '@/utils/helpers';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import DashboardDateFilter from "@/Components/dashboard-date-filter";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TicketIcon,
  FolderIcon,
  CheckCircleIcon,
  Copy,
  Clock,
  TrendingUp,
  Users,
  Calendar,
  Eye,
  Plus,
  LifeBuoy,
  MessageSquare,
  ArrowUpRight,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Trophy,
  Star,
  UserCheck,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { toast } from 'sonner';
import { formatDateTime } from '@/utils/helpers';

interface CategoryDataItem {
  id: number | string;
  name: string;
  value: number;
  color: string;
}

interface TopPerformerItem {
  id: number | string;
  name: string;
  email?: string;
  avatar?: string;
  type?: string;
  assignedTickets: number;
  resolvedTickets: number;
  repliesCount: number;
  score?: number;
  resolutionRate: number;
}

interface DashboardProps {
  supportUrl?: string;
  stats: {
    totalTickets: number;
    categories: number;
    openTickets: number;
    closedTickets: number;
    todayTickets: number;
    avgResponseTime: number;
    resolutionRate: number;
  };
  monthlyData: Record<string, number>;
  recentTickets: Array<{
    id: number;
    ticket_id: string;
    name: string;
    email: string;
    subject: string;
    status: string;
    category: string;
    created_at: string;
  }>;
  statusData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  categoryData?: CategoryDataItem[];
  topPerformers?: TopPerformerItem[];
  slug?: string;
}

export default function Index({
  supportUrl,
  stats,
  monthlyData,
  recentTickets,
  statusData,
  categoryData = [],
  topPerformers = [],
}: DashboardProps) {
  const { t } = useTranslation();
  const [catChartType, setCatChartType] = useState<'bar' | 'pie' | 'graph'>('bar');

  const monthlyChartData = Object.entries(monthlyData || {}).map(([month, value]) => ({
    month,
    tickets: value
  }));

  const copyToClipboard = async () => {
    if (supportUrl) {
      try {
        await navigator.clipboard.writeText(supportUrl);
        toast.success(t('Link copied to clipboard!'));
      } catch (error) {
        toast.error(t('Failed to copy link'));
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('open') || s.includes('new') || s.includes('pending')) {
      return <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200/60 hover:bg-amber-100">{t(status)}</Badge>;
    }
    if (s.includes('progress')) {
      return <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200/60 hover:bg-blue-100">{t(status)}</Badge>;
    }
    if (s.includes('closed') || s.includes('resolved')) {
      return <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200/60 hover:bg-emerald-100">{t(status)}</Badge>;
    }
    return <Badge variant="outline">{t(status)}</Badge>;
  };

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { label: t('Support Tickets Dashboard') }
      ]}
    >
      <Head title={t('Support Tickets Dashboard')} />

      <div className="space-y-6">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{t('Support Overview')}</h1>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <DashboardDateFilter />
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Total Tickets */}
          <Card
            className="rounded-2xl border border-indigo-100/80 dark:border-indigo-900/30 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group bg-indigo-50/50 dark:bg-indigo-950/20"
            onClick={() => router.get(route('support-tickets.index'))}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-indigo-100/80 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                  <TicketIcon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3" /> 100%
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('Total Tickets')}</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {stats?.totalTickets ?? 0}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('All time inquiries')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Open Tickets */}
          <Card
            className="rounded-2xl border border-amber-100/80 dark:border-amber-900/30 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group bg-amber-50/50 dark:bg-amber-950/20"
            onClick={() => router.get(route('support-tickets.index'))}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-amber-100/80 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                  {t('Pending')}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('Open Tickets')}</p>
                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {stats?.openTickets ?? 0}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('Awaiting action')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Closed Tickets */}
          <Card
            className="rounded-2xl border border-emerald-100/80 dark:border-emerald-900/30 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group bg-emerald-50/50 dark:bg-emerald-950/20"
            onClick={() => router.get(route('support-tickets.index'))}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-emerald-100/80 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircleIcon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  {stats?.resolutionRate ?? 0}% {t('Resolved')}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('Closed Tickets')}</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {stats?.closedTickets ?? 0}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('Successfully resolved')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Today's Tickets */}
          <Card className="rounded-2xl border border-purple-100/80 dark:border-purple-900/30 shadow-sm hover:shadow-md transition-all duration-300 group bg-purple-50/50 dark:bg-purple-950/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-purple-100/80 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-100/80 dark:bg-purple-950/50 px-2 py-0.5 rounded-full">
                  {t('Today')}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("Today's Tickets")}</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {stats?.todayTickets ?? 0}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('Created today')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Avg Response Time */}
          <Card className="rounded-2xl border border-cyan-100/80 dark:border-cyan-900/30 shadow-sm hover:shadow-md transition-all duration-300 group bg-cyan-50/50 dark:bg-cyan-950/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-cyan-100/80 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-100/80 dark:bg-cyan-950/50 px-2 py-0.5 rounded-full">
                  SLA Target
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('Avg Response')}</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {stats?.avgResponseTime ?? 0}h
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('Average response time')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card
            className="rounded-2xl border border-rose-100/80 dark:border-rose-900/30 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group bg-rose-50/50 dark:bg-rose-950/20"
            onClick={() => router.get(route('support-ticket.system-setup.support-team.index'))}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-rose-100/80 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400 group-hover:scale-110 transition-transform duration-300">
                  <FolderIcon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-950/50 px-2 py-0.5 rounded-full">
                  {t('Active')}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('Categories')}</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {stats?.categories ?? 0}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('Support desks')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support Portal Banner */}
        <Card className="rounded-2xl border-0 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl overflow-hidden relative">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <CardContent className="p-6 md:p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-medium backdrop-blur-sm border border-white/10">
                  <LifeBuoy className="h-3.5 w-3.5" />
                  {t('Customer Self-Service Support Portal')}
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  {t('Manage & Resolve Customer Inquiries Seamlessly')}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {t('Share your public support portal link with clients to track issues, view history, and automate support dispatching.')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {supportUrl && (
                  <Button
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-sm font-medium transition-all"
                    onClick={copyToClipboard}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {t('Copy Support Link')}
                  </Button>
                )}
                <Button
                  className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 rounded-xl px-4 py-2 text-sm font-medium transition-all"
                  onClick={() => router.get(route('support-tickets.create'))}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('Create Ticket')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Row 1: Volume Trends & Status Breakdown */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Ticket Trends Chart */}
          <Card className="xl:col-span-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    {t('Ticket Volume Trends')}
                  </CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t('Monthly support requests submitted across all categories')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyChartData}>
                    <defs>
                      <linearGradient id="supportTicketGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '12px',
                        color: '#fff',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="tickets"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#supportTicketGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="xl:col-span-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 flex flex-col justify-between">
            <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                {t('Status Breakdown')}
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('Current status of all logged tickets')}
              </p>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center">
              <div className="h-64">
                {statusData && statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#1e293b',
                          borderRadius: '12px',
                          color: '#fff'
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-sm font-medium">{t('No status data available')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2: Category Wise (Bar, Pie, Graph Switcher) & Top Performers (Top 3 Users) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Support Category Wise Card */}
          <Card className="xl:col-span-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 flex flex-col justify-between">
            <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FolderIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    {t('Support Category Wise')}
                  </CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t('Ticket distribution across support categories')}
                  </p>
                </div>

                {/* View Switcher Controls (Bar, Pie, Graph) */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
                  <Button
                    size="sm"
                    variant={catChartType === 'bar' ? 'default' : 'ghost'}
                    className={`h-8 px-2.5 text-xs font-semibold rounded-lg transition-all ${catChartType === 'bar'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    onClick={() => setCatChartType('bar')}
                  >
                    <BarChart3 className="h-3.5 w-3.5 mr-1" />
                    {t('Bar')}
                  </Button>
                  <Button
                    size="sm"
                    variant={catChartType === 'pie' ? 'default' : 'ghost'}
                    className={`h-8 px-2.5 text-xs font-semibold rounded-lg transition-all ${catChartType === 'pie'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    onClick={() => setCatChartType('pie')}
                  >
                    <PieChartIcon className="h-3.5 w-3.5 mr-1" />
                    {t('Pie')}
                  </Button>
                  <Button
                    size="sm"
                    variant={catChartType === 'graph' ? 'default' : 'ghost'}
                    className={`h-8 px-2.5 text-xs font-semibold rounded-lg transition-all ${catChartType === 'graph'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    onClick={() => setCatChartType('graph')}
                  >
                    <LineChartIcon className="h-3.5 w-3.5 mr-1" />
                    {t('Graph')}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="h-72 w-full">
                {categoryData && categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {catChartType === 'bar' ? (
                      <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#1e293b',
                            borderRadius: '12px',
                            color: '#fff',
                          }}
                          formatter={(val: any) => [val, t('Tickets')]}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {categoryData.map((entry, idx) => (
                            <Cell key={`cat-cell-${idx}`} fill={entry.color || '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : catChartType === 'pie' ? (
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {categoryData.map((entry, idx) => (
                            <Cell key={`pie-cat-${idx}`} fill={entry.color || '#6366f1'} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#1e293b',
                            borderRadius: '12px',
                            color: '#fff',
                          }}
                          formatter={(val: any) => [val, t('Tickets')]}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    ) : (
                      <AreaChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="catGraphGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#1e293b',
                            borderRadius: '12px',
                            color: '#fff',
                          }}
                          formatter={(val: any) => [val, t('Tickets')]}
                        />
                        <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#catGraphGrad)" />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <FolderIcon className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-sm font-medium">{t('No category data available')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Performers Card (Top 3 Users) */}
          <Card className="xl:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 flex flex-col justify-between">
            <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                {t('Top Support Performers')}
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('Top 3 team members handling customer support')}
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-around">
              {topPerformers && topPerformers.length > 0 ? (
                <div className="space-y-4">
                  {topPerformers.slice(0, 3).map((performer, idx) => {
                    const rank = idx + 1;
                    let rankColor = 'bg-amber-400 text-amber-950 border-amber-300';
                    let borderGlow = 'border-amber-200/80 bg-amber-50/30';
                    if (rank === 2) {
                      rankColor = 'bg-slate-300 text-slate-900 border-slate-200';
                      borderGlow = 'border-slate-200/80 bg-slate-50/40';
                    } else if (rank === 3) {
                      rankColor = 'bg-amber-700 text-white border-amber-600';
                      borderGlow = 'border-orange-200/80 bg-orange-50/30';
                    }

                    return (
                      <div
                        key={performer.id || idx}
                        className={`p-3.5 rounded-2xl border ${borderGlow} flex items-center justify-between gap-3 transition-all hover:scale-[1.01]`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Rank Badge */}
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs border shadow-xs shrink-0 ${rankColor}`}>
                            #{rank}
                          </div>

                          {/* Avatar / Initials */}
                          <div className="h-10 w-10 rounded-full border-2 border-white dark:border-slate-700 overflow-hidden ring-1 ring-border/50 shrink-0">
                            {performer.avatar ? (
                              <img
                                src={getImagePath(performer.avatar)}
                                alt={performer.name || ''}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm">
                                {performer.name ? performer.name.substring(0, 2).toUpperCase() : 'US'}
                              </div>
                            )}
                          </div>

                          {/* User details */}
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              {performer.name}
                              {rank === 1 && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {performer.type || t('Support Staff')}
                            </p>
                          </div>
                        </div>

                        {/* Stats pill */}
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                            {performer.resolvedTickets} {t('resolved')}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">
                            {performer.assignedTickets} {t('assigned')} · {performer.resolutionRate}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <UserCheck className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-sm font-medium">{t('No support performance data')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Tickets Table/List */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  {t('Recent Support Tickets')}
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('Latest customer inquiries and requests')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => router.get(route('support-tickets.index'))}
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                {t('View All')}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {recentTickets && recentTickets.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => router.get(route('support-tickets.show', ticket.id))}
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 text-sm border border-indigo-100 dark:border-indigo-900/50">
                        {ticket.name ? ticket.name.substring(0, 2).toUpperCase() : 'TK'}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-xs font-mono text-slate-500 dark:text-slate-400">
                            #{ticket.ticket_id}
                          </span>
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 hover:text-indigo-600 transition-colors">
                            {ticket.subject}
                          </h4>
                          {getStatusBadge(ticket.status)}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>{t('By')}: <strong className="font-medium text-slate-700 dark:text-slate-300">{ticket.name}</strong></span>
                          <span>•</span>
                          <span>{ticket.email}</span>
                          <span>•</span>
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            {ticket.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {formatDateTime(ticket.created_at)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 rounded-lg"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <TicketIcon className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-medium">{t('No recent tickets found')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}

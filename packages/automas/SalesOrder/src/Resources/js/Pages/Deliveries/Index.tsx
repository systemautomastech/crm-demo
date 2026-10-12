import { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { formatDate } from '@/utils/helpers';
import { Eye, Printer, Ban, FileText, Edit, RefreshCw, Truck } from "lucide-react";
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from "@/components/ui/search-input";
import { FilterButton } from "@/components/ui/filter-button";
import { PerPageSelector } from "@/components/ui/per-page-selector";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import NoRecordsFound from "@/components/no-records-found";

interface DeliveryItem {
    id: number;
    delivery_number: string;
    delivery_date: string;
    status: string;
    notes?: string;
    created_at: string;
    sales_order?: {
        id: number;
        order_number: string;
        name: string;
        customer?: { id: number; name: string };
    };
    creator?: { id: number; name: string };
    items?: any[];
}

interface DeliveryIndexProps {
    deliveries: {
        data: DeliveryItem[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
        from: number;
        to: number;
    };
    filters?: {
        search?: string;
        status?: string;
        date_from?: string;
        date_to?: string;
        sort?: string;
        direction?: string;
        per_page?: string;
    };
}

export default function DeliveryIndex({ deliveries, filters: propsFilters = {} }: DeliveryIndexProps) {
    const { t } = useTranslation();
    useFlashMessages();

    const [filters, setFilters] = useState(() => {
        const fromDate = propsFilters.date_from;
        const toDate = propsFilters.date_to;
        return {
            search: propsFilters.search || '',
            status: propsFilters.status || '',
            date_range: (fromDate && toDate) ? `${fromDate} - ${toDate}` : '',
        };
    });

    const [showFilters, setShowFilters] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<DeliveryItem | null>(null);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

    const activeFiltersCount = useMemo(() => {
        return [filters.status, filters.date_range].filter(Boolean).length;
    }, [filters.status, filters.date_range]);

    const handleFilter = () => {
        const queryParams: Record<string, any> = {};

        if (filters.search && filters.search.trim()) {
            queryParams.search = filters.search.trim();
        }

        if (filters.status && filters.status !== 'all') {
            queryParams.status = filters.status;
        }

        if (filters.date_range && filters.date_range.includes(' - ')) {
            const [fromDate, toDate] = filters.date_range.split(' - ');
            if (fromDate && fromDate.trim()) queryParams.date_from = fromDate.trim();
            if (toDate && toDate.trim()) queryParams.date_to = toDate.trim();
        }

        if (propsFilters.per_page) {
            queryParams.per_page = propsFilters.per_page;
        }

        router.get(route('salesorder.deliveries.index'), queryParams, {
            preserveState: false,
            replace: true,
        });
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            status: '',
            date_range: '',
        });
        router.get(route('salesorder.deliveries.index'), {}, {
            preserveState: false,
            replace: true,
        });
    };

    const handleCancel = () => {
        if (!selectedDelivery) return;
        router.post(route('salesorder.deliveries.cancel', selectedDelivery.id), {}, {
            onSuccess: () => {
                setCancelDialogOpen(false);
                setSelectedDelivery(null);
            }
        });
    };

    const renderStatusBadge = (st: string) => {
        switch (st) {
            case 'created':
                return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-none font-medium">{t('Created')}</Badge>;
            case 'ongoing':
                return <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-none font-medium">{t('Ongoing')}</Badge>;
            case 'postponed':
                return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-none font-medium">{t('Postponed')}</Badge>;
            case 'delivered':
                return <Badge className="bg-emerald-600 text-white border-none font-medium">{t('Delivered')}</Badge>;
            case 'cancelled':
                return <Badge variant="destructive" className="font-medium">{t('Cancelled')}</Badge>;
            default:
                return <Badge variant="outline">{st}</Badge>;
        }
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('Sales Orders'), url: route('salesorder.orders.index') },
                { label: t('Delivery Challans') }
            ]}
            pageTitle={t('Delivery Challans')}
        >
            <Head title={t('Delivery Challans')} />

            <div className="space-y-6">
                <Card className="shadow-xs border border-slate-200 dark:border-slate-800">
                    {/* ─── Control Bar: Search, Filters, PerPage ─── */}
                    <CardContent className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="w-full sm:flex-1 sm:max-w-md">
                                <SearchInput
                                    value={filters.search}
                                    onChange={(val) => setFilters({ ...filters, search: val })}
                                    onSearch={handleFilter}
                                    placeholder={t('Search delivery #, order #, or customer...')}
                                />
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <PerPageSelector
                                    routeName="salesorder.deliveries.index"
                                    filters={propsFilters}
                                />
                                <div className="relative">
                                    <FilterButton
                                        showFilters={showFilters}
                                        onToggle={() => setShowFilters(!showFilters)}
                                    />
                                    {activeFiltersCount > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium pointer-events-none">
                                            {activeFiltersCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    {/* ─── Expandable Dynamic Filters ─── */}
                    {showFilters && (
                        <CardContent className="p-6 bg-blue-50/30 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:grid-cols-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('Status')}
                                    </label>
                                    <Select
                                        value={filters.status || 'all'}
                                        onValueChange={(val) => setFilters({ ...filters, status: val === 'all' ? '' : val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Filter by status')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Statuses')}</SelectItem>
                                            <SelectItem value="created">{t('Created')}</SelectItem>
                                            <SelectItem value="ongoing">{t('Ongoing')}</SelectItem>
                                            <SelectItem value="postponed">{t('Postponed')}</SelectItem>
                                            <SelectItem value="delivered">{t('Delivered')}</SelectItem>
                                            <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('Date Range')}
                                    </label>
                                    <DateRangePicker
                                        value={filters.date_range}
                                        onChange={(val) => setFilters({ ...filters, date_range: val })}
                                        placeholder={t('Select date range')}
                                    />
                                </div>

                                <div className="flex items-end gap-2">
                                    <Button onClick={handleFilter} size="sm">
                                        {t('Apply')}
                                    </Button>
                                    <Button variant="outline" onClick={clearFilters} size="sm">
                                        {t('Clear')}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>

                {/* ─── Table ─── */}
                <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
                    <CardContent className="p-0">
                        {deliveries.data.length === 0 ? (
                            <NoRecordsFound
                                icon={Truck}
                                title={t('No Delivery Challans Found')}
                                description={t('There are no delivery challans matching your criteria.')}
                                hasFilters={activeFiltersCount > 0}
                                onClearFilters={clearFilters}
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold uppercase text-xs tracking-wider border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="p-4">{t('Delivery #')}</th>
                                            <th className="p-4">{t('Order #')}</th>
                                            <th className="p-4">{t('Customer')}</th>
                                            <th className="p-4">{t('Delivery Date')}</th>
                                            <th className="p-4">{t('Items')}</th>
                                            <th className="p-4">{t('Status')}</th>
                                            <th className="p-4 text-right">{t('Actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
                                        {deliveries.data.map((delivery) => {
                                            const isCancelled = delivery.status === 'cancelled';
                                            const isDelivered = delivery.status === 'delivered';
                                            const isFinal = isCancelled || isDelivered;
                                            const order = delivery.sales_order;

                                            const handleRowStatusChange = (newStatus: string) => {
                                                router.post(route('salesorder.deliveries.update-status', delivery.id), { status: newStatus }, {
                                                    preserveScroll: true,
                                                });
                                            };

                                            return (
                                                <tr key={delivery.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                                                    <td className="p-4 font-semibold text-primary">
                                                        <Link href={route('salesorder.deliveries.show', delivery.id)} className="hover:underline">
                                                            {delivery.delivery_number}
                                                        </Link>
                                                    </td>
                                                    <td className="p-4">
                                                        {order ? (
                                                            <Link
                                                                href={route('salesorder.orders.show', order.id)}
                                                                className="font-medium text-slate-800 dark:text-slate-200 hover:underline"
                                                            >
                                                                {order.order_number}
                                                            </Link>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        {order?.customer?.customer_name || <span className="text-muted-foreground">—</span>}
                                                    </td>
                                                    <td className="p-4 text-slate-700 dark:text-slate-300">
                                                        {formatDate(delivery.delivery_date)}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {delivery.items?.length || 0} {t('items')}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        {!isFinal ? (
                                                            <Select value={delivery.status} onValueChange={handleRowStatusChange}>
                                                                <SelectTrigger className="h-8 text-xs w-32 border-none shadow-none p-0 bg-transparent">
                                                                    {renderStatusBadge(delivery.status)}
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="created">{t('Created')}</SelectItem>
                                                                    <SelectItem value="ongoing">{t('Ongoing')}</SelectItem>
                                                                    <SelectItem value="postponed">{t('Postponed')}</SelectItem>
                                                                    <SelectItem value="delivered">{t('Delivered')}</SelectItem>
                                                                    <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            renderStatusBadge(delivery.status)
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Link href={route('salesorder.deliveries.show', delivery.id)}>
                                                                <Button size="sm" variant="ghost" title={t('View Details')} className="h-8 w-8 p-0">
                                                                    <Eye className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                                                </Button>
                                                            </Link>
                                                            {!isFinal && (
                                                                <Link href={route('salesorder.deliveries.edit', delivery.id)}>
                                                                    <Button size="sm" variant="ghost" title={t('Edit Delivery')} className="h-8 w-8 p-0">
                                                                        <Edit className="h-4 w-4 text-blue-600" />
                                                                    </Button>
                                                                </Link>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                title={t('Print Challan')}
                                                                className="h-8 w-8 p-0"
                                                                onClick={() => window.open(route('salesorder.deliveries.challan', delivery.id), '_blank')}
                                                            >
                                                                <Printer className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                                            </Button>
                                                            {!isFinal && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                                                    title={t('Cancel Delivery')}
                                                                    onClick={() => {
                                                                        setSelectedDelivery(delivery);
                                                                        setCancelDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Ban className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ─── Pagination ─── */}
                {deliveries.total > 0 && (
                    <Pagination
                        data={deliveries}
                        routeName="salesorder.deliveries.index"
                        filters={propsFilters}
                    />
                )}

                {/* ─── Cancel Confirmation Dialog ─── */}
                <ConfirmationDialog
                    open={cancelDialogOpen}
                    onOpenChange={setCancelDialogOpen}
                    title={t('Cancel Delivery Challan')}
                    message={t('Are you sure you want to cancel delivery ":num"? The delivered item quantities will be restored to the sales order.', { num: selectedDelivery?.delivery_number })}
                    onConfirm={handleCancel}
                    confirmText={t('Yes, Cancel Delivery')}
                    cancelText={t('No, Keep Delivery')}
                    variant="destructive"
                />
            </div>
        </AuthenticatedLayout>
    );
}

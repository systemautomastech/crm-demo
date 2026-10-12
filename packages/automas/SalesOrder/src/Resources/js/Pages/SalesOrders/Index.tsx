import { useState, useMemo } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { useDeleteHandler } from '@/hooks/useDeleteHandler';
import { formatDate, formatCurrency, getImagePath } from '@/utils/helpers';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
    Plus, Edit, Trash2, Copy, FileText, Eye, ShoppingCart, RotateCcw,
    Truck, Users, CheckCircle2, Clock, Printer, Lock
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SearchInput } from "@/components/ui/search-input";
import { ListGridToggle } from "@/components/ui/list-grid-toggle";
import { PerPageSelector } from "@/components/ui/per-page-selector";
import { FilterButton } from "@/components/ui/filter-button";
import { DataTable } from "@/components/ui/data-table";
import NoRecordsFound from "@/components/no-records-found";
import { Pagination } from "@/components/ui/pagination";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { SalesOrdersIndexProps, SalesOrder } from './types';

// Utility function for calculating sales order amount
const calculateSalesOrderAmount = (order: SalesOrder): number => {
    return parseFloat(order.amount?.toString() || order.total_amount?.toString() || '0');
};

interface SalesOrderFilters {
    name: string;
    status: string;
    delivery_status: string;
    assignment_status: string;
    customer_id: string;
    assigned_group_id: string;
    assigned_user_id: string;
    date_range: string;
    my_acquired?: string;
    available_to_me?: string;
    [key: string]: any;
}

export default function Index() {
    const { t } = useTranslation();
    const { salesOrders, auth, customers, users, userGroups } = usePage<SalesOrdersIndexProps>().props;
    const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);

    const [activeTab, setActiveTab] = useState<'all' | 'available' | 'my'>(
        urlParams.get('available_to_me') ? 'available' :
            urlParams.get('my_acquired') ? 'my' : 'all'
    );

    const [filters, setFilters] = useState<SalesOrderFilters>({
        name: urlParams.get('name') || '',
        status: urlParams.get('status') || '',
        delivery_status: urlParams.get('delivery_status') || '',
        assignment_status: urlParams.get('assignment_status') || '',
        customer_id: urlParams.get('customer_id') || '',
        assigned_group_id: urlParams.get('assigned_group_id') || '',
        assigned_user_id: urlParams.get('assigned_user_id') || '',
        date_range: (() => {
            const fromDate = urlParams.get('date_from');
            const toDate = urlParams.get('date_to');
            return (fromDate && toDate) ? `${fromDate} - ${toDate}` : '';
        })(),
    });

    const [perPage] = useState(urlParams.get('per_page') || '10');
    const [sortField, setSortField] = useState(urlParams.get('sort') || '');
    const [sortDirection, setSortDirection] = useState(urlParams.get('direction') || 'asc');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>(urlParams.get('view') as 'list' | 'grid' || 'list');
    const [showFilters, setShowFilters] = useState(false);
    const [duplicateState, setDuplicateState] = useState({ isOpen: false, orderId: null as number | null });
    const [convertState, setConvertState] = useState({ isOpen: false, salesOrder: null as SalesOrder | null });

    useFlashMessages();

    const { deleteState, openDeleteDialog, closeDeleteDialog, confirmDelete } = useDeleteHandler({
        routeName: 'salesorder.orders.destroy',
        defaultMessage: t('Are you sure you want to delete this sales order?')
    });

    const handleFilter = (customParams = {}) => {
        const filterParams: Record<string, any> = { ...filters, ...customParams };

        if (filterParams.date_range) {
            const [fromDate, toDate] = filterParams.date_range.split(' - ');
            filterParams.date_from = fromDate;
            filterParams.date_to = toDate;
        } else {
            delete filterParams.date_from;
            delete filterParams.date_to;
        }
        delete filterParams.date_range;

        // Clean out empty strings
        Object.keys(filterParams).forEach(k => {
            if (filterParams[k] === '' || filterParams[k] === null || filterParams[k] === undefined) {
                delete filterParams[k];
            }
        });

        router.get(route('salesorder.orders.index'), {
            ...filterParams,
            per_page: perPage,
            sort: sortField,
            direction: sortDirection,
            view: viewMode
        }, {
            preserveState: true,
            replace: true
        });
    };

    const handleTabChange = (tab: 'all' | 'available' | 'my') => {
        setActiveTab(tab);
        const newParams: Record<string, any> = {};
        if (tab === 'available') {
            newParams.available_to_me = '1';
            delete filters.my_acquired;
        } else if (tab === 'my') {
            newParams.my_acquired = '1';
            delete filters.available_to_me;
        } else {
            delete filters.available_to_me;
            delete filters.my_acquired;
        }
        handleFilter(newParams);
    };

    const handleSort = (field: string) => {
        const direction = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortField(field);
        setSortDirection(direction);
        router.get(route('salesorder.orders.index'), {
            ...filters,
            per_page: perPage,
            sort: field,
            direction,
            view: viewMode
        }, {
            preserveState: true,
            replace: true
        });
    };

    const clearFilters = () => {
        setFilters({
            name: '',
            status: '',
            delivery_status: '',
            assignment_status: '',
            customer_id: '',
            assigned_group_id: '',
            assigned_user_id: '',
            date_range: ''
        });
        setActiveTab('all');
        router.get(route('salesorder.orders.index'), { per_page: perPage, view: viewMode });
    };

    const openDuplicateDialog = (orderId: number) => {
        setDuplicateState({ isOpen: true, orderId });
    };

    const closeDuplicateDialog = () => {
        setDuplicateState({ isOpen: false, orderId: null });
    };

    const confirmDuplicate = () => {
        if (duplicateState.orderId) {
            router.post(route('salesorder.orders.duplicate', duplicateState.orderId));
            closeDuplicateDialog();
        }
    };

    const openConvertDialog = (salesOrder: SalesOrder) => {
        setConvertState({ isOpen: true, salesOrder });
    };

    const closeConvertDialog = () => {
        setConvertState({ isOpen: false, salesOrder: null });
    };

    const confirmConvert = () => {
        if (convertState.salesOrder) {
            router.post(route('salesorder.orders.convert', convertState.salesOrder.id));
            closeConvertDialog();
        }
    };

    const renderStatusBadge = (status?: string) => {
        const s = (status || 'draft').toLowerCase();
        if (s === 'confirmed') {
            return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none font-medium">{t('Confirmed')}</Badge>;
        }
        if (s === 'cancelled') {
            return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-200 border-none font-medium">{t('Cancelled')}</Badge>;
        }
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none font-medium">{t('Draft')}</Badge>;
    };

    const renderDeliveryBadge = (deliveryStatus?: string) => {
        const ds = (deliveryStatus || 'pending').toLowerCase();
        if (ds === 'delivered') {
            return (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('Delivered')}
                </Badge>
            );
        }
        if (ds === 'partial') {
            return (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-medium inline-flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    {t('Partial')}
                </Badge>
            );
        }
        return (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-medium inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t('Pending')}
            </Badge>
        );
    };

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const renderAssignmentBadge = (order: SalesOrder) => {
        if (order.assignment_status === 'acquired' && order.acquired_by_user) {
            const user = order.acquired_by_user;
            return (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <div className="inline-flex items-center gap-2 cursor-pointer group">
                            <Avatar className="h-8 w-8 border border-emerald-200 dark:border-emerald-800 shadow-xs ring-2 ring-emerald-500/20 shrink-0">
                                {user.avatar ? (
                                    <AvatarImage src={getImagePath(user.avatar)} alt={user.name} className="object-cover" />
                                ) : null}
                                <AvatarFallback className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
                                    {getInitials(user.name)}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="font-medium text-xs">
                        <p>{user.name}</p>
                    </TooltipContent>
                </Tooltip>
            );
        }

        if (order.assignment_status === 'group_assigned' && order.assigned_group) {
            return (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50 font-medium inline-flex items-center gap-1.5 py-1 px-2.5 whitespace-nowrap">
                            <Users className="h-3.5 w-3.5" />
                            <span>{order.assigned_group.name}</span>
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                        <p>{t('Group')}: <strong>{order.assigned_group.name}</strong></p>
                    </TooltipContent>
                </Tooltip>
            );
        }

        if (order.assigned_users && order.assigned_users.length > 0) {
            return (
                <div className="flex items-center -space-x-2">
                    {order.assigned_users.map((u) => (
                        <Tooltip key={u.id} delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Avatar className="h-7 w-7 border-2 border-white dark:border-slate-900 ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                                    {u.avatar ? (
                                        <AvatarImage src={getImagePath(u.avatar)} alt={u.name} className="object-cover" />
                                    ) : null}
                                    <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[10px]">
                                        {getInitials(u.name)}
                                    </AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                                <p>{u.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            );
        }

        return <span className="text-xs text-slate-400 dark:text-slate-600 italic">{t('Unassigned')}</span>;
    };

    const tableColumns = [
        {
            key: 'order_number',
            header: t('Order Number'),
            sortable: true,
            render: (value: string, order: SalesOrder) =>
                auth.user?.permissions?.includes('view-sales-orders') ? (
                    <span
                        className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                        onClick={() => router.get(route('salesorder.orders.show', order.id))}
                    >
                        #{order.order_number || value || order.id}
                    </span>
                ) : (
                    <span className="font-semibold">#{order.order_number || value || order.id}</span>
                )
        },
        {
            key: 'name',
            header: t('Order Name'),
            sortable: true
        },
        {
            key: 'customer',
            header: t('Customer'),
            sortable: false,
            render: (_: any, item: SalesOrder) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{item.customer?.customer_name || item.customer_name || '-'}</span>
                    {(item.customer?.customer_email || item.customer_email) && <span className="text-xs text-muted-foreground">{item.customer?.customer_email || item.customer_email}</span>}
                </div>
            )
        },
        {
            key: 'order_date',
            header: t('Order Date'),
            sortable: true,
            render: (value: string) => formatDate(value)
        },
        {
            key: 'amount',
            header: t('Total Amount'),
            sortable: true,
            render: (value: any, order: SalesOrder) => {
                const calculatedAmount = calculateSalesOrderAmount(order);
                return <span className="font-semibold">{formatCurrency(calculatedAmount)}</span>;
            }
        },
        {
            key: 'status',
            header: t('Status'),
            sortable: true,
            render: (value: string) => renderStatusBadge(value)
        },
        {
            key: 'delivery_status',
            header: t('Delivery'),
            sortable: true,
            render: (value: string, order: SalesOrder) => renderDeliveryBadge(order.delivery_status || value)
        },
        {
            key: 'assignment_status',
            header: t('Assignment'),
            sortable: false,
            render: (_: any, order: SalesOrder) => renderAssignmentBadge(order)
        },
        ...(auth.user?.permissions?.some((p: string) => ['view-sales-orders', 'edit-sales-orders', 'delete-sales-orders', 'convert-sales-orders', 'create-sales-orders', 'print-sales-orders'].includes(p)) ? [{
            key: 'actions',
            header: t('Actions'),
            render: (_: any, item: SalesOrder) => (
                <div className="flex gap-1 items-center">
                    {auth.user?.permissions?.includes('create-sales-orders') && (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => openDuplicateDialog(item.id)} className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700">
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('Duplicate')}</p></TooltipContent>
                        </Tooltip>
                    )}

                    {auth.user?.permissions?.includes('print-sales-orders') && (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(route('salesorder.orders.print', item.id), '_blank')}
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                >
                                    <Printer className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('Print')}</p></TooltipContent>
                        </Tooltip>
                    )}

                    {item.can_acquire && (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.post(route('salesorder.orders.acquire', item.id))}
                                    className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700"
                                >
                                    <Lock className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('Acquire Order')}</p></TooltipContent>
                        </Tooltip>
                    )}


                    {item.can_deliver && (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.visit(route('salesorder.orders.deliveries.create', item.id))}
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                >
                                    <Truck className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('Create Delivery Challan')}</p></TooltipContent>
                        </Tooltip>
                    )}

                    {auth.user?.permissions?.includes('view-sales-orders') && (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => router.get(route('salesorder.orders.show', item.id))} className="h-8 w-8 p-0 text-green-600 hover:text-green-700">
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('View')}</p></TooltipContent>
                        </Tooltip>
                    )}

                    {auth.user?.permissions?.includes('convert-sales-orders') && !item.is_invoiced && item.status === 'confirmed' && (item.delivery_status === 'pending' || item.delivery_status === 'delivered') ? (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => openConvertDialog(item)} className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700">
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('Convert To Sales Invoice')}</p></TooltipContent>
                        </Tooltip>
                    ) : item.is_invoiced ? (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => router.get(route('sales-invoices.show', item.invoice_id))} className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700">
                                    <FileText className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('Invoice Details')}</p></TooltipContent>
                        </Tooltip>
                    ) : null}

                    {auth.user?.permissions?.includes('edit-sales-orders') && item.status !== 'cancelled' && !item.is_invoiced && item.delivery_status === 'pending' && (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => router.get(route('salesorder.orders.edit', item.id))} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700">
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('Edit')}</p></TooltipContent>
                        </Tooltip>
                    )}
                    {auth.user?.permissions?.includes('delete-sales-orders') && item.delivery_status === 'pending' && (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteDialog(item.id)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('Delete')}</p></TooltipContent>
                        </Tooltip>
                    )}
                </div>
            )
        }] : [])
    ];

    const activeFiltersCount = [
        filters.status,
        filters.delivery_status,
        filters.assignment_status,
        filters.customer_id,
        filters.assigned_group_id,
        filters.assigned_user_id,
        filters.date_range
    ].filter(Boolean).length;

    return (
        <TooltipProvider>
            <AuthenticatedLayout
                breadcrumbs={[
                    { label: t('Sales'), url: route('salesorder.orders.index') },
                    { label: t('Sales Orders') }
                ]}
                pageTitle={t('Manage Sales Orders')}
                pageActions={
                    <div className="flex gap-2">
                        {auth.user?.permissions?.includes('create-sales-orders') && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button size="sm" onClick={() => router.get(route('salesorder.orders.create'))}>
                                        <Plus className="h-4 w-4 mr-1.5" />
                                        {t('Create Order')}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{t('Create Sales Order')}</p></TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                }
            >
                <Head title={t('Sales Orders')} />

                {/* Quick Filter Tabs */}
                <div className="flex items-center gap-2 mb-4 border-b pb-2">
                    <Button
                        variant={activeTab === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('all')}
                        className="rounded-md text-xs"
                    >
                        {t('All Orders')}
                    </Button>
                    <Button
                        variant={activeTab === 'available' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('available')}
                        className="rounded-md text-xs flex items-center gap-1.5"
                    >
                        <Users className="h-3.5 w-3.5" />
                        {t('Available to Claim')}
                    </Button>
                    <Button
                        variant={activeTab === 'my' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('my')}
                        className="rounded-md text-xs flex items-center gap-1.5"
                    >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('My Acquired')}
                    </Button>
                </div>

                <Card className="shadow-sm">
                    <CardContent className="p-6 border-b bg-gray-50/50">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 max-w-md">
                                <SearchInput
                                    value={filters.name}
                                    onChange={(value) => setFilters({ ...filters, name: value })}
                                    onSearch={() => handleFilter()}
                                    placeholder={t('Search order number or name...')}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <ListGridToggle
                                    currentView={viewMode}
                                    routeName="salesorder.orders.index"
                                    filters={{ ...filters, per_page: perPage }}
                                />
                                <PerPageSelector
                                    routeName="salesorder.orders.index"
                                    filters={{ ...filters, view: viewMode }}
                                />
                                <div className="relative">
                                    <FilterButton
                                        showFilters={showFilters}
                                        onToggle={() => setShowFilters(!showFilters)}
                                    />
                                    {activeFiltersCount > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                                            {activeFiltersCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    {showFilters && (
                        <CardContent className="p-6 bg-blue-50/30 border-b">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:grid-cols-4">
                                {customers && customers.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('Customer')}</label>
                                        <Select
                                            value={filters.customer_id || 'all'}
                                            onValueChange={(value) => setFilters({ ...filters, customer_id: value === 'all' ? '' : value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('All Customers')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Customers')}</SelectItem>
                                                {customers.map((c) => (
                                                    <SelectItem key={c.id} value={c.id.toString()}>
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Order Status')}</label>
                                    <Select
                                        value={filters.status || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All Status')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Status')}</SelectItem>
                                            <SelectItem value="draft">{t('Draft')}</SelectItem>
                                            <SelectItem value="confirmed">{t('Confirmed')}</SelectItem>
                                            <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Delivery Status')}</label>
                                    <Select
                                        value={filters.delivery_status || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, delivery_status: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All Delivery Status')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Delivery Status')}</SelectItem>
                                            <SelectItem value="pending">{t('Pending')}</SelectItem>
                                            <SelectItem value="partial">{t('Partial')}</SelectItem>
                                            <SelectItem value="delivered">{t('Delivered')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Assignment Status')}</label>
                                    <Select
                                        value={filters.assignment_status || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, assignment_status: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All Assignment Status')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Assignment Status')}</SelectItem>
                                            <SelectItem value="unassigned">{t('Unassigned')}</SelectItem>
                                            <SelectItem value="group_assigned">{t('Group Assigned')}</SelectItem>
                                            <SelectItem value="acquired">{t('Acquired')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {userGroups && userGroups.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('User Group')}</label>
                                        <Select
                                            value={filters.assigned_group_id || 'all'}
                                            onValueChange={(value) => setFilters({ ...filters, assigned_group_id: value === 'all' ? '' : value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('All Groups')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Groups')}</SelectItem>
                                                {userGroups.map((g) => (
                                                    <SelectItem key={g.id} value={g.id.toString()}>
                                                        {g.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {users && users.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('Assigned User')}</label>
                                        <Select
                                            value={filters.assigned_user_id || 'all'}
                                            onValueChange={(value) => setFilters({ ...filters, assigned_user_id: value === 'all' ? '' : value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('All Users')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Users')}</SelectItem>
                                                {users.map((user) => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>
                                                        {user.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Date Range')}</label>
                                    <DateRangePicker
                                        value={filters.date_range}
                                        onChange={(value) => setFilters({ ...filters, date_range: value })}
                                        placeholder={t('Select date range')}
                                    />
                                </div>

                                <div className="flex items-end gap-2">
                                    <Button onClick={() => handleFilter()} size="sm">{t('Apply')}</Button>
                                    <Button variant="outline" onClick={clearFilters} size="sm">{t('Clear')}</Button>
                                </div>
                            </div>
                        </CardContent>
                    )}

                    <CardContent className="p-0">
                        {viewMode === 'list' ? (
                            <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 max-h-[70vh] rounded-none w-full">
                                <div className="min-w-[900px]">
                                    <DataTable
                                        data={salesOrders?.data || []}
                                        columns={tableColumns}
                                        onSort={handleSort}
                                        sortKey={sortField}
                                        sortDirection={sortDirection as 'asc' | 'desc'}
                                        className="rounded-none"
                                        emptyState={
                                            <NoRecordsFound
                                                icon={ShoppingCart}
                                                title={t('No sales orders found')}
                                                description={t('Get started by creating your first sales order.')}
                                                hasFilters={!!(filters.name || filters.status || filters.delivery_status || filters.assignment_status || filters.customer_id || filters.assigned_group_id || filters.assigned_user_id || filters.date_range)}
                                                onClearFilters={clearFilters}
                                                createPermission="create-sales-orders"
                                                onCreateClick={() => router.get(route('salesorder.orders.create'))}
                                                createButtonText={t('Create Sales Order')}
                                                className="h-auto"
                                            />
                                        }
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-auto max-h-[70vh] p-6">
                                {salesOrders?.data?.length > 0 ? (
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                                        {salesOrders.data.map((order) => (
                                            <Card key={order.id} className="p-0 hover:shadow-lg transition-all duration-200 relative overflow-hidden flex flex-col h-full min-w-0">
                                                {/* Header */}
                                                <div className="p-4 bg-gradient-to-r from-gray-50 to-transparent border-b flex-shrink-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-primary/10 rounded-lg">
                                                            <ShoppingCart className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-semibold text-sm text-gray-900 truncate">
                                                                {auth.user?.permissions?.includes('view-sales-orders') ? (
                                                                    <span
                                                                        className="text-blue-600 hover:text-blue-700 cursor-pointer"
                                                                        onClick={() => router.get(route('salesorder.orders.show', order.id))}
                                                                    >
                                                                        #{order.order_number || order.id}
                                                                    </span>
                                                                ) : (
                                                                    `#${order.order_number || order.id}`
                                                                )}
                                                            </h3>
                                                            <p className="text-xs font-medium text-gray-600 truncate">{order.name}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Body */}
                                                <div className="p-4 flex-1 min-h-0 space-y-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="text-xs min-w-0">
                                                            <p className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wide">{t('Amount')}</p>
                                                            <p className="font-semibold text-sm text-gray-900">{formatCurrency(calculateSalesOrderAmount(order))}</p>
                                                        </div>
                                                        <div className="text-xs min-w-0">
                                                            <p className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wide">{t('Customer')}</p>
                                                            <p className="font-medium text-xs text-gray-800 truncate">{order.customer?.customer_name || order.customer_name || '-'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="text-xs min-w-0">
                                                            <p className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wide">{t('Order Date')}</p>
                                                            <p className="font-medium text-xs text-gray-800">{formatDate(order.order_date)}</p>
                                                        </div>
                                                        <div className="text-xs min-w-0">
                                                            <p className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wide">{t('Delivery')}</p>
                                                            <div>{renderDeliveryBadge(order.delivery_status)}</div>
                                                        </div>
                                                    </div>

                                                    <div className="border-t pt-2 mt-2">
                                                        <p className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wide">{t('Assignment')}</p>
                                                        <div>{renderAssignmentBadge(order)}</div>
                                                    </div>
                                                </div>

                                                {/* Footer */}
                                                <div className="flex justify-between items-center p-3 border-t bg-gray-50/50 flex-shrink-0 mt-auto">
                                                    <div>
                                                        {renderStatusBadge(order.status)}
                                                    </div>

                                                    {auth.user?.permissions?.some((p: string) => ['view-sales-orders', 'edit-sales-orders', 'delete-sales-orders', 'convert-sales-orders', 'create-sales-orders', 'print-sales-orders'].includes(p)) && (
                                                        <div className="flex gap-1">
                                                            {auth.user?.permissions?.includes('create-sales-orders') && (
                                                                <Tooltip delayDuration={0}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="sm" onClick={() => openDuplicateDialog(order.id)} className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700">
                                                                            <Copy className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{t('Duplicate')}</p></TooltipContent>
                                                                </Tooltip>
                                                            )}

                                                            {auth.user?.permissions?.includes('convert-sales-orders') && !order.is_invoiced && order.status === 'confirmed' && (order.delivery_status === 'pending' || order.delivery_status === 'delivered') ? (
                                                                <Tooltip delayDuration={0}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="sm" onClick={() => openConvertDialog(order)} className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700">
                                                                            <RotateCcw className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{t('Convert To Sales Invoice')}</p></TooltipContent>
                                                                </Tooltip>
                                                            ) : order.is_invoiced ? (
                                                                <Tooltip delayDuration={0}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="sm" onClick={() => router.get(route('sales-invoices.show', order.invoice_id))} className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700">
                                                                            <FileText className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{t('Invoice Details')}</p></TooltipContent>
                                                                </Tooltip>
                                                            ) : null}


                                                            {auth.user?.permissions?.includes('view-sales-orders') && (
                                                                <Tooltip delayDuration={0}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="sm" onClick={() => router.get(route('salesorder.orders.show', order.id))} className="h-8 w-8 p-0 text-green-600 hover:text-green-700">
                                                                            <Eye className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{t('View')}</p></TooltipContent>
                                                                </Tooltip>
                                                            )}

                                                            {auth.user?.permissions?.includes('print-sales-orders') && (
                                                                <Tooltip delayDuration={0}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => window.open(route('salesorder.orders.print', order.id), '_blank')}
                                                                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                                                        >
                                                                            <Printer className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{t('Print')}</p></TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {auth.user?.permissions?.includes('edit-sales-orders') && order.status !== 'cancelled' && !order.is_invoiced && order.delivery_status === 'pending' && (
                                                                <Tooltip delayDuration={0}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="sm" onClick={() => router.get(route('salesorder.orders.edit', order.id))} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700">
                                                                            <Edit className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{t('Edit')}</p></TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {auth.user?.permissions?.includes('delete-sales-orders') && order.delivery_status === 'pending' && (
                                                                <Tooltip delayDuration={0}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => openDeleteDialog(order.id)}
                                                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{t('Delete')}</p></TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <NoRecordsFound
                                        icon={ShoppingCart}
                                        title={t('No sales orders found')}
                                        description={t('Get started by creating your first sales order.')}
                                        hasFilters={!!(filters.name || filters.status || filters.delivery_status || filters.assignment_status || filters.customer_id || filters.assigned_group_id || filters.assigned_user_id || filters.date_range)}
                                        onClearFilters={clearFilters}
                                        createPermission="create-sales-orders"
                                        onCreateClick={() => router.get(route('salesorder.orders.create'))}
                                        createButtonText={t('Create Sales Order')}
                                        className="h-auto"
                                    />
                                )}
                            </div>
                        )}
                    </CardContent>

                    <CardContent className="px-4 py-2 border-t bg-gray-50/30">
                        <Pagination
                            data={salesOrders}
                            routeName="salesorder.orders.index"
                            filters={{ ...filters, per_page: perPage, view: viewMode }}
                        />
                    </CardContent>
                </Card>

                <ConfirmationDialog
                    open={deleteState.isOpen}
                    onOpenChange={closeDeleteDialog}
                    title={t('Delete Sales Order')}
                    message={deleteState.message}
                    confirmText={t('Delete')}
                    onConfirm={confirmDelete}
                    variant="destructive"
                />

                <ConfirmationDialog
                    open={duplicateState.isOpen}
                    onOpenChange={closeDuplicateDialog}
                    title={t('Duplicate Sales Order')}
                    message={t('Are you sure you want to duplicate this sales order?')}
                    confirmText={t('Yes')}
                    onConfirm={confirmDuplicate}
                />

                <ConfirmationDialog
                    open={convertState.isOpen}
                    onOpenChange={closeConvertDialog}
                    title={t('Convert to Sales Invoice')}
                    message={t('Are you sure you want to convert this sales order to an sales invoice?')}
                    confirmText={t('Convert')}
                    onConfirm={confirmConvert}
                />
            </AuthenticatedLayout>
        </TooltipProvider>
    );
}
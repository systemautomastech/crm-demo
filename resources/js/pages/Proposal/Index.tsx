import { useState, useMemo } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { differenceInDays } from 'date-fns';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { useDeleteHandler } from '@/hooks/useDeleteHandler';
import { formatDate, formatCurrency, getImagePath } from '@/utils/helpers';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
    Plus, FileText, Eye, Trash2, RefreshCw, Edit as EditIcon, Download, Printer, Send, Check, X, Receipt,
    List, Columns3, FilePlus2, CheckCircle2, XCircle, AlertTriangle, Package, CreditCard, CalendarDays, Lightbulb, Clock, Link as LinkIcon
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTable } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { PerPageSelector } from "@/components/ui/per-page-selector";
import { FilterButton } from '@/components/ui/filter-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import NoRecordsFound from '@/components/no-records-found';
import { Pagination } from "@/components/ui/pagination";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from 'sonner';
import axios from 'axios';
import { usePageButtons } from '@/hooks/usePageButtons';
import { cn } from '@/lib/utils';
import SalesOrderModal from './components/SalesOrderModal';

interface SalesProposal {
    id: number;
    proposal_number: string;
    subject?: string | null;
    proposal_date: string;
    due_date: string;
    customer?: { id: number; name?: string; customer_name?: string; email?: string; customer_email?: string; avatar?: string | null } | null;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    customer_address?: string | null;
    author?: { id: number; name: string; email: string } | null;
    creator_id?: number | null;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    payment_terms?: string | null;
    items?: Array<{
        id: number;
        product_id: number;
        description?: string;
        product_description?: string;
        quantity: number;
        unit_price: number;
        discount_percentage: number;
        discount_amount: number;
        tax_percentage: number;
        tax_amount: number;
        total_amount: number;
        product?: {
            id: number;
            name: string;
            sku?: string;
            description?: string;
            type?: string;
            warehouseStocks?: Array<{ id: number; warehouse_id: number; quantity: number }>;
        };
        taxes?: Array<{
            id: number;
            tax_name: string;
            tax_rate: number;
        }>;
    }>;
    status: string;
    display_status: string;
    converted_to_sales_order?: boolean;
    sales_order_id?: number;
    converted_to_invoice: boolean;
    invoice_id?: number;
    created_at: string;
    updated_at: string;
}

interface ProposalFilters {
    search: string;
    status: string;
    customer_id: string;
    date_range: string;
    date_from?: string;
    date_to?: string;
}

interface ProposalStats {
    total_count: number;
    total_value: number;
    overdue_count: number;
    draft_count: number;
    draft_value: number;
    sent_count: number;
    sent_value: number;
    accepted_count: number;
    accepted_value: number;
    accepted_active_count: number;
    rejected_count: number;
    rejected_value: number;
}

const STATUS_COLUMNS = [
    { key: 'draft', label: 'Draft', chip: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
    { key: 'sent', label: 'Sent', chip: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
    { key: 'accepted', label: 'Accepted', chip: 'bg-green-100 text-green-700', dot: 'bg-green-400' },
    { key: 'rejected', label: 'Rejected', chip: 'bg-red-100 text-red-700', dot: 'bg-red-400' },
] as const;

export default function Index() {
    const { t } = useTranslation();
    const { proposals, auth, customers, users, userGroups, stats, boardData } = usePage<{
        proposals: { data: SalesProposal[];[key: string]: any };
        auth: { user: { permissions: string[] } };
        customers: { id: number; name: string; email: string }[];
        users?: { id: number; name: string; email?: string }[];
        userGroups?: { id: number; name: string }[];
        stats: ProposalStats;
        boardData: Record<string, SalesProposal[]> | null;
    }>().props;

    const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);

    const [filters, setFilters] = useState<ProposalFilters>({
        search: urlParams.get('search') || '',
        status: urlParams.get('status') || '',
        customer_id: urlParams.get('customer_id') || '',
        date_range: (() => {
            const fromDate = urlParams.get('date_from');
            const toDate = urlParams.get('date_to');
            return (fromDate && toDate) ? `${fromDate} - ${toDate}` : '';
        })()
    });

    const [perPage] = useState(urlParams.get('per_page') || '10');
    const [sortField, setSortField] = useState(urlParams.get('sort') || '');
    const [sortDirection, setSortDirection] = useState(urlParams.get('direction') || 'desc');

    const [viewMode, setViewMode] = useState<'board' | 'list'>(urlParams.get('view') as 'board' | 'list' || 'list');
    const [showFilters, setShowFilters] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useFlashMessages();
    const googleDriveButtons = usePageButtons('googleDriveBtn', { module: 'Proposal', settingKey: 'GoogleDrive Proposal' });
    const oneDriveButtons = usePageButtons('oneDriveBtn', { module: 'Proposal', settingKey: 'OneDrive Proposal' });
    const dropboxBtn = usePageButtons('dropboxBtn', { module: 'Proposal', settingKey: 'Dropbox Proposal' });
    const boxBtn = usePageButtons('boxBtn', { module: 'Proposal', settingKey: 'Box Proposal' });
    const { deleteState, openDeleteDialog, closeDeleteDialog, confirmDelete } = useDeleteHandler({
        routeName: 'sales-proposals.destroy',
        defaultMessage: 'Are you sure you want to delete this sales proposal?'
    });
    const [convertProposal, setConvertProposal] = useState<SalesProposal | null>(null);

    const [acceptState, setAcceptState] = useState<{ isOpen: boolean; proposalId: number | null; isLoading: boolean }>({
        isOpen: false,
        proposalId: null,
        isLoading: false,
    });

    const [rejectState, setRejectState] = useState<{ isOpen: boolean; proposalId: number | null; isLoading: boolean }>({
        isOpen: false,
        proposalId: null,
        isLoading: false,
    });

    const handleAcceptProposal = (id: number) => {
        setAcceptState({ isOpen: true, proposalId: id, isLoading: false });
    };

    const confirmAccept = () => {
        if (!acceptState.proposalId) return;
        setAcceptState(prev => ({ ...prev, isLoading: true }));
        router.post(route('sales-proposals.accept', acceptState.proposalId), {}, {
            preserveScroll: true,
            onFinish: () => setAcceptState({ isOpen: false, proposalId: null, isLoading: false }),
        });
    };

    const handleRejectProposal = (id: number) => {
        setRejectState({ isOpen: true, proposalId: id, isLoading: false });
    };

    const confirmReject = () => {
        if (!rejectState.proposalId) return;
        setRejectState(prev => ({ ...prev, isLoading: true }));
        router.post(route('sales-proposals.reject', rejectState.proposalId), {}, {
            preserveScroll: true,
            onFinish: () => setRejectState({ isOpen: false, proposalId: null, isLoading: false }),
        });
    };

    const getProposalStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'draft': return 'bg-gray-100 text-gray-700';
            case 'sent': return 'bg-blue-100 text-blue-700';
            case 'accepted': return 'bg-green-100 text-green-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            case 'expired': return 'bg-orange-100 text-orange-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const navigate = (params: Record<string, any>) => {
        router.get(route('sales-proposals.index'), params, {
            preserveState: false,
            replace: true
        });
    };

    const handleFilter = () => {
        const filterParams: Record<string, any> = { ...filters };

        if (filters.date_range) {
            const [fromDate, toDate] = filters.date_range.split(' - ');
            filterParams.date_from = fromDate;
            filterParams.date_to = toDate;
        }
        delete filterParams.date_range;

        navigate({ ...filterParams, per_page: perPage, sort: sortField, direction: sortDirection, view: viewMode });
    };

    const handleSort = (field: string) => {
        const direction = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortField(field);
        setSortDirection(direction);
        navigate({ ...filters, per_page: perPage, sort: field, direction, view: viewMode });
    };

    const clearFilters = () => {
        setFilters({ search: '', status: '', customer_id: '', date_range: '' });
        navigate({ per_page: perPage, view: viewMode });
    };

    const handleViewChange = (view: 'board' | 'list') => {
        setViewMode(view);
        if (view === 'board') {
            setFilters({ search: '', status: '', customer_id: '', date_range: '' });
            setShowFilters(false);
            navigate({ view: 'board' });
        } else {
            navigate({ ...filters, per_page: perPage, view: 'list' });
        }
    };

    const filterByStatus = (status: string) => {
        setFilters({ ...filters, status });
        setViewMode('list');
        navigate({ ...filters, status, per_page: perPage, view: 'list' });
    };

    const showAllProposals = () => {
        setFilters({ search: '', status: '', customer_id: '', date_range: '' });
        setViewMode('list');
        navigate({ per_page: perPage, view: 'list' });
    };

    const canSeeActions = auth.user?.permissions?.some((p: string) => ['print-sales-proposals', 'sent-sales-proposals', 'accept-sales-proposals', 'reject-sales-proposals', 'convert-sales-proposals', 'view-sales-proposals', 'edit-sales-proposals', 'delete-sales-proposals'].includes(p));

    const renderActions = (item: SalesProposal & { public_print_url?: string }) => (
        <TooltipProvider>
            {item.public_print_url && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                navigator.clipboard.writeText(item.public_print_url!);
                                toast.success(t('Public print link copied to clipboard'));
                            }}
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700"
                        >
                            <LinkIcon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('Copy Public Link')}</p></TooltipContent>
                </Tooltip>
            )}

            {auth.user?.permissions?.includes('print-sales-proposals') && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(route('sales-proposals.print', item.id) + '?print=1', '_blank')}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                        >
                            <Printer className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('Print/Download')}</p></TooltipContent>
                </Tooltip>
            )}


            {auth.user?.permissions?.includes('sent-sales-proposals') && item.status === 'draft' && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => router.post(route('sales-proposals.sent', item.id))} className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700">
                            <Send className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('Send Proposal')}</p></TooltipContent>
                </Tooltip>
            )}

            {auth.user?.permissions?.includes('sent-sales-proposals') && item.status === 'sent' && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => router.post(route('sales-proposals.sent', item.id))} className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700">
                            <Send className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('Resend Proposal')}</p></TooltipContent>
                </Tooltip>
            )}

            {auth.user?.permissions?.includes('accept-sales-proposals') && item.status === 'sent' && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => handleAcceptProposal(item.id)} className="h-8 w-8 p-0 text-green-600 hover:text-green-700">
                            <Check className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('Accept Proposal')}</p></TooltipContent>
                </Tooltip>
            )}

            {auth.user?.permissions?.includes('reject-sales-proposals') && item.status === 'sent' && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => handleRejectProposal(item.id)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                            <X className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('Reject Proposal')}</p></TooltipContent>
                </Tooltip>
            )}

            {auth.user?.permissions?.includes('convert-sales-proposals') && item.status === 'accepted' && !item.converted_to_sales_order && !item.converted_to_invoice && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConvertProposal(item)}
                            className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('Convert to Sales Order')}</p></TooltipContent>
                </Tooltip>
            )}

            {item.converted_to_sales_order && item.sales_order_id && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.get(route('salesorder.orders.show', item.sales_order_id))}
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700"
                        >
                            <Package className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('View Sales Order')}</p></TooltipContent>
                </Tooltip>
            )}

            {item.converted_to_invoice && item.invoice_id && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.get(route('sales-invoices.show', item.invoice_id))}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                        >
                            <FileText className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('View Invoice')}</p></TooltipContent>
                </Tooltip>
            )}

            {auth.user?.permissions?.includes('view-sales-proposals') && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => router.get(route('sales-proposals.show', item.id))} className="h-8 w-8 p-0 text-green-600 hover:text-green-700">
                            <Eye className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('View')}</p></TooltipContent>
                </Tooltip>
            )}

            {item.status !== 'accepted' && auth.user?.permissions?.includes('edit-sales-proposals') && !item.converted_to_invoice && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => router.visit(route('sales-proposals.edit', item.id))} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700">
                            <EditIcon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('Edit')}</p></TooltipContent>
                </Tooltip>
            )}

            {item.status === 'draft' && auth.user?.permissions?.includes('delete-sales-proposals') && !item.converted_to_invoice && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(item.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('Delete')}</p></TooltipContent>
                </Tooltip>
            )}
        </TooltipProvider>
    );

    const tableColumns = [
        {
            key: 'serial',
            header: t('#'),
            sortable: false,
            className: 'w-12 text-center text-muted-foreground whitespace-nowrap',
            render: (_: any, __: SalesProposal, index: number) => {
                const currentPage = proposals?.current_page || 1;
                const perPageNum = Number(proposals?.per_page) || 10;
                return (currentPage - 1) * perPageNum + index + 1;
            }
        },
        {
            key: 'proposal_number',
            header: t('Proposal Number'),
            sortable: true,
            className: 'whitespace-nowrap',
            render: (value: string, proposal: SalesProposal) =>
                auth.user?.permissions?.includes('view-sales-proposals') ? (
                    <span
                        className="text-primary hover:underline font-medium text-xs cursor-pointer inline-block"
                        onClick={() => router.get(route('sales-proposals.show', proposal.id))}
                    >
                        {value}
                    </span>
                ) : (
                    <span className="font-medium text-xs">{value}</span>
                )
        },
        {
            key: 'customer.customer_name',
            header: t('Customer'),
            sortable: true,
            className: 'min-w-[180px]',
            render: (_: any, item: SalesProposal) => {
                const name = item.customer?.customer_name || item.customer_name || '-';
                const email = item.customer?.customer_email || item.customer_email || '';

                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{name}</span>
                        {email && (
                            <span className="text-xs text-muted-foreground">{email}</span>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'subject',
            header: t('Subject'),
            sortable: true,
            className: 'min-w-[220px]',
            render: (value: string) => (
                <span className="text-slate-800 dark:text-slate-200" title={value || '-'}>
                    {value || '-'}
                </span>
            )
        },
        {
            key: 'due_date',
            header: t('Due Date'),
            sortable: true,
            className: 'whitespace-nowrap',
            render: (value: string, proposal: SalesProposal) => {
                const isOverdue = proposal.display_status === 'overdue';
                return (
                    <div>
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {formatDate(value)}
                        </span>
                        {isOverdue && (
                            <div className="text-xs text-red-600 font-medium mt-0.5">
                                {t('Overdue')}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'total_amount',
            header: t('Total Amount'),
            sortable: true,
            className: 'whitespace-nowrap',
            render: (value: number) => (
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: 'created_by',
            header: t('Created By'),
            className: 'min-w-[150px]',
            render: (_: any, proposal: SalesProposal) => {
                const author = proposal.author;
                const assignedUsers = author ? [author] : [];

                if (assignedUsers.length === 0) {
                    return (
                        <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground">
                            -
                        </div>
                    );
                }

                return (
                    <div className="flex items-center -space-x-2">
                        <TooltipProvider>
                            {assignedUsers.slice(0, 3).map((user: any, index: number) => (
                                <Tooltip key={user.id || index} delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <div className="h-8 w-8 rounded-full border-2 border-background overflow-hidden ring-1 ring-border/50 shrink-0">
                                            {user.avatar ? (
                                                <img
                                                    src={getImagePath(user.avatar)}
                                                    alt={user.name || ''}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-full w-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                                    {user.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                            )}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{user.name}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                            {assignedUsers.length > 3 && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground ring-1 ring-border/50 shrink-0">
                                            +{assignedUsers.length - 3}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div className="space-y-1">
                                            {assignedUsers.slice(3).map((user: any, index: number) => (
                                                <p key={user.id || index}>{user.name}</p>
                                            ))}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </TooltipProvider>
                    </div>
                );
            }
        },
        {
            key: 'status',
            header: t('Status'),
            sortable: true,
            className: 'whitespace-nowrap',
            render: (value: string) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getProposalStatusColor(value)}`}>
                    {value?.charAt(0).toUpperCase() + value?.slice(1)}
                </span>
            )
        },
        ...(canSeeActions ? [{
            key: 'actions',
            header: t('Actions'),
            className: 'whitespace-nowrap text-right',
            render: (_: any, item: SalesProposal) => (
                <div className="flex gap-1 justify-end">{renderActions(item)}</div>
            )
        }] : [])
    ];

    const statCards = [
        { key: '', label: t('Total Proposals'), value: stats?.total_count ?? 0, sub: formatCurrency(stats?.total_value ?? 0), icon: FileText, iconClass: 'text-primary bg-primary/10' },
        { key: 'draft', label: t('Draft'), value: stats?.draft_count ?? 0, sub: formatCurrency(stats?.draft_value ?? 0), icon: FilePlus2, iconClass: 'text-gray-600 bg-gray-100' },
        { key: 'sent', label: t('Sent'), value: stats?.sent_count ?? 0, sub: formatCurrency(stats?.sent_value ?? 0), icon: Send, iconClass: 'text-blue-600 bg-blue-100' },
        { key: 'accepted', label: t('Accepted'), value: stats?.accepted_count ?? 0, sub: formatCurrency(stats?.accepted_value ?? 0), icon: CheckCircle2, iconClass: 'text-green-600 bg-green-100' },
        { key: 'rejected', label: t('Rejected'), value: stats?.rejected_count ?? 0, sub: formatCurrency(stats?.rejected_value ?? 0), icon: XCircle, iconClass: 'text-red-600 bg-red-100' },
        { key: 'expired', label: t('Overdue'), value: stats?.overdue_count ?? 0, sub: t('Past due date'), icon: AlertTriangle, iconClass: 'text-orange-600 bg-orange-100' },
    ];

    const hasActiveFilters = !!(filters.search || filters.status || filters.customer_id || filters.date_range);

    return (
        <TooltipProvider>
            {isDownloading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <div className="flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <p className="text-lg font-semibold text-gray-700">{t('Generating PDF...')}</p>
                        </div>
                    </div>
                </div>
            )}

            <AuthenticatedLayout
                breadcrumbs={[
                    { label: t('Sales Proposals') }
                ]}
                pageTitle={t('Manage Proposal')}
                pageActions={
                    <div className="flex gap-2">
                        {googleDriveButtons.map((button) => (
                            <div key={button.id}>{button.component}</div>
                        ))}
                        {oneDriveButtons.map((button) => (
                            <div key={button.id}>{button.component}</div>
                        ))}
                        {dropboxBtn.map((button) => (
                            <div key={button.id}>{button.component}</div>
                        ))}
                        {boxBtn.map((button) => (
                            <div key={button.id}>{button.component}</div>
                        ))}
                        {auth.user?.permissions?.includes('create-sales-proposals') && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button size="sm" onClick={() => router.visit(route('sales-proposals.create'))}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{t('Create')}</p></TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                }
            >
                <Head title="Sales Proposals" />

                {isDownloading && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
                        <div className="bg-white p-6 rounded-lg shadow-lg">
                            <div className="flex items-center space-x-3">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                <p className="text-lg font-semibold text-gray-700">{t('Generating PDF...')}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                    {statCards.map((card) => {
                        const Icon = card.icon;
                        const isActive = card.key !== '' && filters.status === card.key;
                        return (
                            <button
                                key={card.label}
                                type="button"
                                onClick={() => card.key ? filterByStatus(card.key) : showAllProposals()}
                                className={cn(
                                    'group text-left rounded-lg border bg-white p-3 transition-shadow hover:shadow-md',
                                    isActive ? 'border-primary ring-1 ring-primary' : 'border-gray-200'
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={cn(
                                        'relative h-8 w-8 rounded-md flex items-center justify-center transition-transform duration-200 group-hover:scale-110',
                                        card.iconClass
                                    )}>
                                        {card.key === 'expired' && card.value > 0 && (
                                            <span className="absolute inset-0 rounded-md bg-orange-400/40 animate-ping" />
                                        )}
                                        <Icon className={cn('h-4 w-4 relative', card.key === 'expired' && card.value > 0 && 'animate-pulse')} />
                                    </span>
                                    <span className="text-xl font-bold text-gray-900">{card.value}</span>
                                </div>
                                <p className="text-xs font-medium text-gray-600 mt-2">{card.label}</p>
                                <p className="text-xs text-gray-400 truncate">{card.sub}</p>
                            </button>
                        );
                    })}
                </div>

                <Card className="shadow-sm">
                    <CardContent className="p-6 border-b bg-gray-50/50">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 max-w-md">
                                <SearchInput
                                    value={filters.search}
                                    onChange={(value) => setFilters({ ...filters, search: value })}
                                    onSearch={handleFilter}
                                    placeholder={t('Search proposals...')}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-row items-center border rounded-md">
                                    <Button
                                        variant={viewMode === 'board' ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => handleViewChange('board')}
                                        className="rounded-r-none"
                                    >
                                        <Columns3 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => handleViewChange('list')}
                                        className="rounded-l-none"
                                    >
                                        <List className="h-4 w-4" />
                                    </Button>
                                </div>
                                {viewMode === 'list' && (
                                    <>
                                        <PerPageSelector
                                            routeName="sales-proposals.index"
                                            filters={{ ...filters, view: viewMode }}
                                        />
                                        <div className="relative">
                                            <FilterButton
                                                showFilters={showFilters}
                                                onToggle={() => setShowFilters(!showFilters)}
                                            />
                                            {(() => {
                                                const activeFilters = [filters.customer_id, filters.date_range, filters.status].filter(Boolean).length;
                                                return activeFilters > 0 ? (
                                                    <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                        {activeFilters}
                                                    </span>
                                                ) : null;
                                            })()}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>

                    {viewMode === 'list' && showFilters && (
                        <CardContent className="p-6 bg-blue-50/30 border-b">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:grid-cols-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Customer')}</label>
                                    <Select value={filters.customer_id} onValueChange={(value) => setFilters({ ...filters, customer_id: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All Customers')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers?.map((customer: any) => (
                                                <SelectItem key={customer.id} value={customer.id.toString()}>
                                                    {customer.customer_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Date Range')}</label>
                                    <DateRangePicker
                                        value={filters.date_range}
                                        onChange={(value) => setFilters({ ...filters, date_range: value })}
                                        placeholder={t('Select date range')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Status')}</label>
                                    <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('All Status')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">{t('Draft')}</SelectItem>
                                            <SelectItem value="sent">{t('Sent')}</SelectItem>
                                            <SelectItem value="accepted">{t('Accepted')}</SelectItem>
                                            <SelectItem value="rejected">{t('Rejected')}</SelectItem>
                                            <SelectItem value="expired">{t('Expired')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-end gap-2">
                                    <Button onClick={handleFilter} size="sm">{t('Apply')}</Button>
                                    <Button variant="outline" onClick={clearFilters} size="sm">{t('Clear')}</Button>
                                </div>
                            </div>
                        </CardContent>
                    )}

                    <CardContent className="p-0">
                        {viewMode === 'list' ? (
                            <div className="overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent max-h-[70vh] rounded-none w-full">
                                <DataTable
                                    data={proposals?.data || []}
                                    columns={tableColumns}
                                    onSort={handleSort}
                                    sortKey={sortField}
                                    sortDirection={sortDirection as 'asc' | 'desc'}
                                    className="rounded-none w-full min-w-full [&>div]:border-0 [&>div]:rounded-none"
                                    emptyState={
                                        <NoRecordsFound
                                            icon={FileText}
                                            title="No sales proposals found"
                                            description="Get started by creating your first sales proposal."
                                            hasFilters={hasActiveFilters}
                                            onClearFilters={clearFilters}
                                            createPermission="create-sales-proposals"
                                            onCreateClick={() => router.visit(route('sales-proposals.create'))}
                                            createButtonText="Create Proposal"
                                            className="h-auto"
                                        />
                                    }
                                />
                            </div>
                        ) : (
                            <div className="p-4">
                                {(stats?.total_count ?? 0) > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {STATUS_COLUMNS.map((column) => {
                                            const items = boardData?.[column.key] || [];
                                            const statKey = column.key === 'accepted' ? 'accepted_active_count' : `${column.key}_count`;
                                            const totalForColumn = (stats as any)?.[statKey] ?? items.length;
                                            const hasMore = totalForColumn > items.length;
                                            return (
                                                <div key={column.key} className="bg-gray-50/60 border border-gray-200 rounded-lg">
                                                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn('h-2 w-2 rounded-full', column.dot)} />
                                                            <h3 className="text-sm font-semibold text-gray-800">{t(column.label)}</h3>
                                                            <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', column.chip)}>
                                                                {totalForColumn}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => filterByStatus(column.key)}
                                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                        >
                                                            {t('View all')}
                                                        </button>
                                                    </div>
                                                    {hasMore && (
                                                        <p className="text-xs text-gray-400 px-3 pt-2">
                                                            {t('Showing latest')} {items.length} {t('of')} {totalForColumn}
                                                        </p>
                                                    )}
                                                    <div className="space-y-2 p-2 min-h-[100px] max-h-[calc(100vh-380px)] overflow-y-auto">
                                                        {items.map((proposal) => {
                                                            const custName = proposal.customer?.customer_name || proposal.customer_name || '?';
                                                            const initial = custName.charAt(0).toUpperCase();
                                                            return (
                                                                <Card key={proposal.id} className="border border-gray-200 rounded-lg bg-white hover:shadow-md hover:border-gray-300 transition-all">
                                                                    <div className="p-3">
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            {auth.user?.permissions?.includes('view-sales-proposals') ? (
                                                                                <h4 className="font-semibold text-sm text-blue-600 hover:text-blue-700 cursor-pointer truncate" onClick={() => router.get(route('sales-proposals.show', proposal.id))}>
                                                                                    {proposal.proposal_number}
                                                                                </h4>
                                                                            ) : (
                                                                                <h4 className="font-semibold text-sm text-gray-900 truncate">{proposal.proposal_number}</h4>
                                                                            )}
                                                                            <span className="text-sm font-bold text-gray-900 shrink-0">{formatCurrency(proposal.total_amount)}</span>
                                                                        </div>

                                                                        <div className="flex items-center gap-1.5 mt-2.5">
                                                                            <Avatar className="h-5 w-5 shrink-0">
                                                                                {proposal.customer?.avatar && (
                                                                                    <AvatarImage src={getImagePath(proposal.customer.avatar)} alt={custName} />
                                                                                )}
                                                                                <AvatarFallback className="bg-gray-100 text-gray-600 text-[10px] font-semibold">
                                                                                    {initial}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <span className="text-xs text-gray-600 truncate" title={proposal.customer?.customer_email || proposal.customer?.email || proposal.customer_email || ''}>{custName}</span>
                                                                        </div>

                                                                        <div className="flex items-center gap-3 flex-wrap mt-2 text-[11px] text-gray-500">
                                                                            <span className="flex items-center gap-1">
                                                                                <CalendarDays className="h-3 w-3" /> {formatDate(proposal.proposal_date)}
                                                                            </span>
                                                                            {!!proposal.items?.length && (
                                                                                <span className="flex items-center gap-1">
                                                                                    <Package className="h-3 w-3" /> {proposal.items.length} {proposal.items.length === 1 ? t('item') : t('items')}
                                                                                </span>
                                                                            )}
                                                                            {proposal.payment_terms && (
                                                                                <span className="flex items-center gap-1 truncate">
                                                                                    <CreditCard className="h-3 w-3" /> {proposal.payment_terms}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex items-center justify-between mt-2">
                                                                            <span className="text-xs text-gray-400">{t('Due')} {formatDate(proposal.due_date)}</span>
                                                                            <div className="flex items-center gap-1">
                                                                                {
                                                                                    proposal.display_status === 'overdue' && (
                                                                                        <span className="flex items-center gap-1 text-[10px] font-medium text-red-600">
                                                                                            <AlertTriangle className="h-3 w-3" /> {t('Overdue')}
                                                                                        </span>
                                                                                    )}
                                                                                {proposal.converted_to_sales_order && (
                                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                                                                        {t('Ordered')}
                                                                                    </span>
                                                                                )}
                                                                                {proposal.converted_to_invoice && (
                                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                                                                                        {t('Invoiced')}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {proposal.status === 'draft' && (() => {
                                                                            const daysSinceCreated = differenceInDays(new Date(), new Date(proposal.created_at));
                                                                            if (daysSinceCreated < 3) return null;
                                                                            return (
                                                                                <div className="flex items-center justify-between gap-2 mt-2.5 px-2 py-1.5 rounded-md bg-amber-50 border border-amber-200">
                                                                                    <span className="flex items-center gap-1 text-[11px] text-amber-700">
                                                                                        <Lightbulb className="h-3 w-3 shrink-0" />
                                                                                        {t('Draft for')} {daysSinceCreated}{t('d')}
                                                                                    </span>
                                                                                    {auth.user?.permissions?.includes('sent-sales-proposals') && (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => router.post(route('sales-proposals.sent', proposal.id))}
                                                                                            className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline shrink-0"
                                                                                        >
                                                                                            {t('Send now')}
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })()}

                                                                        {proposal.status === 'accepted' && !proposal.converted_to_sales_order && !proposal.converted_to_invoice && auth.user?.permissions?.includes('convert-sales-proposals') && (
                                                                            <div className="flex items-center justify-between gap-2 mt-2.5 px-2 py-1.5 rounded-md bg-emerald-50 border border-emerald-200">
                                                                                <span className="flex items-center gap-1 text-[11px] text-emerald-800">
                                                                                    <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                                                                                    {t('Accepted')}
                                                                                </span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setConvertProposal(proposal)}
                                                                                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline shrink-0"
                                                                                >
                                                                                    {t('Convert to Sales Order')}
                                                                                </button>
                                                                            </div>
                                                                        )}

                                                                        {canSeeActions && (
                                                                            <div className="flex items-center justify-end gap-0.5 mt-2.5 pt-2.5 border-t border-gray-100">
                                                                                {renderActions(proposal)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </Card>
                                                            );
                                                        })}

                                                        {items.length === 0 && (
                                                            <div className="text-center py-8 text-gray-400 border border-dashed rounded-lg">
                                                                <p className="text-xs">{t('No proposals')}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <NoRecordsFound
                                        icon={FileText}
                                        title={t('No proposals found')}
                                        description={t('No proposals matched your current filter criteria.')}
                                        hasFilters={hasActiveFilters}
                                        onClearFilters={clearFilters}
                                        createPermission="create-sales-proposals"
                                        onCreateClick={() => router.visit(route('sales-proposals.create'))}
                                        createButtonText="Create Proposal"
                                    />
                                )}
                            </div>
                        )}
                    </CardContent>

                    {viewMode === 'list' && (
                        <CardContent className="px-4 py-2 border-t bg-gray-50/30">
                            <Pagination
                                data={{ ...proposals, ...proposals.meta }}
                                routeName="sales-proposals.index"
                                filters={{ ...filters, per_page: perPage, view: viewMode }}
                            />
                        </CardContent>
                    )}
                </Card>

                <ConfirmationDialog
                    open={deleteState.isOpen}
                    onOpenChange={closeDeleteDialog}
                    title={t('Delete Proposal')}
                    message={deleteState.message}
                    confirmText={t('Delete')}
                    onConfirm={confirmDelete}
                    isLoading={deleteState.isLoading}
                    variant="destructive"
                />

                <ConfirmationDialog
                    open={acceptState.isOpen}
                    onOpenChange={(open) => setAcceptState(prev => ({ ...prev, isOpen: open }))}
                    title={t('Accept Proposal')}
                    message={t('Are you sure you want to accept this proposal?')}
                    confirmText={t('Accept')}
                    onConfirm={confirmAccept}
                    isLoading={acceptState.isLoading}
                    variant="default"
                />

                <ConfirmationDialog
                    open={rejectState.isOpen}
                    onOpenChange={(open) => setRejectState(prev => ({ ...prev, isOpen: open }))}
                    title={t('Reject Proposal')}
                    message={t('Are you sure you want to reject this proposal?')}
                    confirmText={t('Reject')}
                    onConfirm={confirmReject}
                    isLoading={rejectState.isLoading}
                    variant="destructive"
                />

                {convertProposal && (
                    <SalesOrderModal
                        open={!!convertProposal}
                        onOpenChange={(open) => {
                            if (!open) setConvertProposal(null);
                        }}
                        proposal={convertProposal}
                        customers={customers}
                        users={users}
                        userGroups={userGroups}
                    />
                )}

            </AuthenticatedLayout>
        </TooltipProvider>
    );
}

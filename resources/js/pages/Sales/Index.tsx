import { useState, useMemo, useRef } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { useDeleteHandler } from '@/hooks/useDeleteHandler';
import { usePageButtons } from '@/hooks/usePageButtons';
import { useFormFields } from '@/hooks/useFormFields';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PerPageSelector } from '@/components/ui/per-page-selector';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
    Plus, Edit as EditIcon, Trash2, Eye, FileText, Receipt, Download, Printer,
    Wallet, AlertTriangle, TrendingUp, FileClock, Users, X, Link2, Check
} from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FilterButton } from '@/components/ui/filter-button';
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { formatCurrency, formatDate, getImagePath } from '@/utils/helpers';
import { getStatusBadgeClasses } from './utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import NoRecordsFound from '@/components/no-records-found';
import { SalesInvoice, SalesFilters } from './types';
import { cn } from '@/lib/utils';

interface InvoiceStats {
    total_count: number;
    total_value: number;
    outstanding_count: number;
    outstanding_value: number;
    collected_value: number;
    overdue_count: number;
    overdue_value: number;
    draft_count: number;
    draft_value: number;
    posted_count: number;
    posted_value: number;
    partial_count: number;
    partial_value: number;
    paid_count: number;
    paid_value: number;
}

interface CustomerSummary {
    customer: { id: number; name?: string; customer_name?: string; email?: string; customer_email?: string; avatar?: string | null } | null;
    invoice_count: number;
    outstanding: number;
    oldest_overdue_days: number | null;
}

interface SalesIndexProps {
    invoices: {
        data: SalesInvoice[];
        links: any[];
        meta: any;
    };
    customers: Array<{ id: number; customer_name?: string; name?: string; email?: string; customer_email?: string }>;
    warehouses: Array<{ id: number; name: string; address: string }>;
    auth: any;
    stats: InvoiceStats;
    customerSummaries: CustomerSummary[];
    [key: string]: any;
}

function CustomerOutstandingCard({
    summary,
    canViewInvoices,
    onFilterByCustomer,
}: {
    summary: CustomerSummary;
    canViewInvoices: boolean;
    onFilterByCustomer: (customerId: number) => void;
}) {
    const { t } = useTranslation();
    const custName = summary.customer?.customer_name || '?';
    const initial = custName.charAt(0).toUpperCase();
    const isOverdue = summary.oldest_overdue_days !== null;
    const critical = isOverdue && summary.oldest_overdue_days! > 30;
    const badgeClass = critical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';

    return (
        <div className={cn(
            'rounded-lg border bg-white p-3.5 transition-shadow hover:shadow-md flex flex-col h-full',
            critical ? 'border-red-200' : 'border-gray-200'
        )}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                        {summary.customer?.avatar && (
                            <AvatarImage src={getImagePath(summary.customer.avatar)} alt={custName} />
                        )}
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-semibold">
                            {initial}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <button
                            type="button"
                            onClick={() => summary.customer && onFilterByCustomer(summary.customer.id)}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate text-left block"
                        >
                            {custName}
                        </button>
                        <p className="text-xs text-gray-400">{summary.invoice_count} {summary.invoice_count === 1 ? t('invoice') : t('invoices')}</p>
                    </div>
                </div>
                {isOverdue ? (
                    <span className={cn('shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full', badgeClass)}>
                        {summary.oldest_overdue_days}{t('d')}
                    </span>
                ) : (
                    <span className="shrink-0 text-[11px] text-gray-400">{t('not due')}</span>
                )}
            </div>

            <p className="text-xl font-bold text-gray-900 mt-3">{formatCurrency(summary.outstanding)}</p>

            <div className="mt-auto pt-3">
                {canViewInvoices && summary.customer && (
                    <Button
                        size="sm"
                        variant="outline"
                        className={cn('w-full', isOverdue ? 'text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700' : '')}
                        onClick={() => onFilterByCustomer(summary.customer!.id)}
                    >
                        {isOverdue ? t('Chase payment') : t('View invoices')}
                    </Button>
                )}
            </div>
        </div>
    );
}

export default function Index() {
    const { t } = useTranslation();
    const { invoices, customers, warehouses, auth, stats, customerSummaries } = usePage<SalesIndexProps>().props;
    const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
    const tableRef = useRef<HTMLDivElement>(null);

    const [filters, setFilters] = useState<SalesFilters>({
        search: urlParams.get('search') || '',
        customer_id: urlParams.get('customer_id') || '',
        warehouse_id: urlParams.get('warehouse_id') || '',
        status: urlParams.get('status') || '',
        date_range: urlParams.get('date_range') || ''
    });

    const [perPage] = useState(urlParams.get('per_page') || '10');
    const [sortField, setSortField] = useState(urlParams.get('sort') || '');
    const [sortDirection, setSortDirection] = useState(urlParams.get('direction') || 'desc');
    const [showFilters, setShowFilters] = useState(false);
    const [showAllCustomers, setShowAllCustomers] = useState(false);
    const [postTargetId, setPostTargetId] = useState<number | null>(null);
    const [isPosting, setIsPosting] = useState<boolean>(false);
    const postCancelBtnRef = useRef<HTMLButtonElement>(null);

    useFlashMessages();

    const salesAlerts = useFormFields('salesInvoiceAlert', {}, () => { }, {});

    // Component for invoice action buttons
    const InvoiceActionButtons = ({ invoice }: { invoice: SalesInvoice }) => {
        const eInvoiceButtons = usePageButtons('invoiceActionButtons', { invoice_id: invoice.id, auth });
        return (
            <>
                {eInvoiceButtons.map((button) => (
                    <div key={button.id}>{button.component}</div>
                ))}
            </>
        );
    };

    // Component for signature buttons
    const SignatureButtons = ({ invoice }: { invoice: SalesInvoice }) => {
        const signatureButtons = usePageButtons('signatureBtn', { invoice });

        return (
            <>
                {signatureButtons.map((button) => (
                    <div key={button.id}>{button.component}</div>
                ))}
            </>
        );
    };

    // Component for purchase invoice action buttons
    const SalesInvoiceActionButtons = ({ invoice }: { invoice: SalesInvoice }) => {
        const xeroSyncInvoiceBtn = usePageButtons('xeroSyncInvoiceBtn', { invoice_id: invoice.id, auth, status: invoice.status });

        return (
            <>
                {xeroSyncInvoiceBtn.map((button) => (
                    <div key={button.id}>{button.component}</div>
                ))}
            </>
        );
    };

    const pageButtons = usePageButtons('salesBtn', 'Sales data');
    const spreadsheetButtons = usePageButtons('spreadsheetBtn', { module: 'Sales Invoice' });
    const googleDriveButtons = usePageButtons('googleDriveBtn', { module: 'Sales Invoice', settingKey: 'GoogleDrive Sales Invoice' });
    const oneDriveButtons = usePageButtons('oneDriveBtn', { module: 'Sales Invoice', settingKey: 'OneDrive Sales Invoice' });
    const dropboxBtn = usePageButtons('dropboxBtn', { module: 'Sales Invoice', settingKey: 'Dropbox Sales Invoice' });
    const boxBtn = usePageButtons('boxBtn', { module: 'Sales Invoice', settingKey: 'Box Sales Invoice' });

    const { deleteState, openDeleteDialog, closeDeleteDialog, confirmDelete } = useDeleteHandler({
        routeName: 'sales-invoices.destroy',
        defaultMessage: t('Are you sure you want to delete this invoice?')
    });

    const navigate = (params: Record<string, any>) => {
        router.get(route('sales-invoices.index'), params, {
            preserveState: false,
            replace: true
        });
    };

    const handleFilter = () => {
        navigate({ ...filters, per_page: perPage, sort: sortField, direction: sortDirection });
    };

    const handleSort = (field: string) => {
        const direction = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortField(field);
        setSortDirection(direction);
        navigate({ ...filters, per_page: perPage, sort: field, direction });
    };

    const clearFilters = () => {
        setFilters({ search: '', customer_id: '', warehouse_id: '', status: '', date_range: '' });
        navigate({ per_page: perPage });
    };

    const filterByStatus = (status: string) => {
        setFilters({ ...filters, status });
        navigate({ ...filters, status, per_page: perPage });
        tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const filterByCustomer = (customerId: number) => {
        const customerIdStr = customerId.toString();
        setFilters({ ...filters, customer_id: customerIdStr });
        navigate({ ...filters, customer_id: customerIdStr, per_page: perPage });
        tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const clearCustomerFilter = () => {
        setFilters({ ...filters, customer_id: '' });
        navigate({ ...filters, customer_id: '', per_page: perPage });
    };

    const [copiedId, setCopiedId] = useState<number | null>(null);

    const handleCopyLink = (invoice: SalesInvoice) => {
        const url = invoice.public_url;
        if (!url) {
            toast.error(t('Invoice link not available'));
            return;
        }

        const copySuccess = () => {
            setCopiedId(invoice.id);
            toast.success(t('Invoice link copied to clipboard'));
            setTimeout(() => setCopiedId(null), 2000);
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url)
                .then(copySuccess)
                .catch(() => fallbackCopy(url));
        } else {
            fallbackCopy(url);
        }

        function fallbackCopy(text: string) {
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    copySuccess();
                } else {
                    toast.error(t('Failed to copy link'));
                }
            } catch (err) {
                toast.error(t('Failed to copy link'));
            }
        }
    };

    const canSeeActions = auth.user?.permissions?.some((p: string) => ['view-sales-invoices', 'edit-sales-invoices', 'delete-sales-invoices', 'post-sales-invoices', 'print-sales-invoices'].includes(p));

    const renderActions = (invoice: SalesInvoice) => (
        <TooltipProvider>
            <SignatureButtons invoice={invoice} />
            {auth.user?.permissions?.includes('print-sales-invoices') && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(route('sales-invoices.print', invoice.id), '_blank')}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                        >
                            <Printer className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('Print/Download')}</p></TooltipContent>
                </Tooltip>
            )}
            {invoice.public_url && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyLink(invoice)}
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                        >
                            {copiedId === invoice.id ? (
                                <Check className="h-4 w-4 text-green-600" />
                            ) : (
                                <Link2 className="h-4 w-4" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{copiedId === invoice.id ? t('Copied!') : t('Copy Link')}</p></TooltipContent>
                </Tooltip>
            )}
            <InvoiceActionButtons invoice={invoice} />
            <SalesInvoiceActionButtons invoice={invoice} />
            {auth.user?.permissions?.includes('view-sales-invoices') && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => router.get(route('sales-invoices.show', invoice.id))} className="h-8 w-8 p-0 text-green-600 hover:text-green-700">
                            <Eye className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('View')}</p></TooltipContent>
                </Tooltip>
            )}
            {invoice.status === 'draft' && (
                <>
                    {auth.user?.permissions?.includes('post-sales-invoices') && (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setPostTargetId(invoice.id)} className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700">
                                    <FileText className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('Post invoice to finalize and create journal entries')}</p></TooltipContent>
                        </Tooltip>
                    )}
                    {auth.user?.permissions?.includes('edit-sales-invoices') && (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => router.visit(route('sales-invoices.edit', invoice.id))} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700">
                                    <EditIcon className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('Edit')}</p></TooltipContent>
                        </Tooltip>
                    )}
                    {auth.user?.permissions?.includes('delete-sales-invoices') && (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(invoice.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('Delete')}</p></TooltipContent>
                        </Tooltip>
                    )}
                </>
            )}
        </TooltipProvider>
    );

    const tableColumns = [
        {
            key: 'invoice_number',
            header: t('Invoice Number'),
            sortable: true,
            render: (value: string, invoice: SalesInvoice) =>
                auth.user?.permissions?.includes('view-sales-invoices') ? (
                    <span className="text-blue-600 hover:text-blue-700 cursor-pointer" onClick={() => router.get(route('sales-invoices.show', invoice.id))}>{value}</span>
                ) : (
                    value
                )
        },
        {
            key: 'customer',
            header: t('Customer'),
            render: (value: any, invoice: SalesInvoice) => invoice.customer?.customer_name || invoice.customer_name || '-'
        },
        {
            key: 'invoice_date',
            header: t('Invoice Date'),
            sortable: true,
            render: (value: string) => formatDate(value)
        },
        {
            key: 'due_date',
            header: t('Due Date'),
            sortable: true,
            render: (value: string, invoice: SalesInvoice) => {
                const isOverdue = invoice.display_status === 'overdue';
                return (
                    <div>
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {formatDate(value)}
                        </span>
                        {isOverdue && (
                            <div className="text-xs text-red-600 font-medium mt-1">
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
            render: (value: number) => formatCurrency(value)
        },
        {
            key: 'balance_amount',
            header: t('Balance'),
            sortable: true,
            render: (value: number) => formatCurrency(value)
        },
        {
            key: 'status',
            header: t('Status'),
            sortable: true,
            render: (value: string) => (
                <span className={getStatusBadgeClasses(value)}>
                    {t(value.charAt(0).toUpperCase() + value.slice(1))}
                </span>
            )
        },
        ...(canSeeActions ? [{
            key: 'actions',
            header: t('Actions'),
            render: (_: any, invoice: SalesInvoice) => (
                <div className="flex gap-1">{renderActions(invoice)}</div>
            )
        }] : [])
    ];

    // Invoices are a financial document, so the headline number is money (not a count).
    const financeCards = [
        { key: 'outstanding', label: t('Outstanding'), value: stats?.outstanding_value ?? 0, count: stats?.outstanding_count ?? 0, icon: Wallet, iconClass: 'text-blue-600 bg-blue-100' },
        { key: 'overdue', label: t('Overdue'), value: stats?.overdue_value ?? 0, count: stats?.overdue_count ?? 0, icon: AlertTriangle, iconClass: 'text-red-600 bg-red-100' },
        { key: 'paid', label: t('Collected'), value: stats?.collected_value ?? 0, count: stats?.paid_count ?? 0, countLabel: t('paid in full'), icon: TrendingUp, iconClass: 'text-green-600 bg-green-100' },
        { key: 'draft', label: t('Drafted'), value: stats?.draft_value ?? 0, count: stats?.draft_count ?? 0, countLabel: t('not yet sent'), icon: FileClock, iconClass: 'text-gray-600 bg-gray-100' },
    ];

    const hasActiveFilters = !!(filters.search || filters.customer_id || filters.warehouse_id || filters.status || filters.date_range);

    return (
        <TooltipProvider>
            <AuthenticatedLayout
                breadcrumbs={[{ label: t('Invoices') }]}
                pageTitle={t('Manage Invoices')}
                pageActions={
                    <div className="flex flex-wrap gap-2">
                        <TooltipProvider>
                            {pageButtons.map((button) => (
                                <div key={button.id}>{button.component}</div>
                            ))}
                            {spreadsheetButtons.map((button) => (
                                <div key={button.id}>{button.component}</div>
                            ))}
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
                            {auth.user?.permissions?.includes('create-sales-invoices') && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button size="sm" onClick={() => router.visit(route('sales-invoices.create'))}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('Create')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </TooltipProvider>
                    </div>
                }
            >
                <Head title={t('Invoices')} />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {financeCards.map((card) => {
                        const Icon = card.icon;
                        const isActive = filters.status === card.key;
                        return (
                            <button
                                key={card.label}
                                type="button"
                                onClick={() => filterByStatus(card.key)}
                                className={cn(
                                    'group text-left rounded-lg border bg-white p-4 transition-shadow hover:shadow-md',
                                    isActive ? 'border-primary ring-1 ring-primary' : 'border-gray-200'
                                )}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500">{card.label}</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(card.value)}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {card.count} {card.countLabel || t('invoices')}
                                        </p>
                                    </div>
                                    <span className={cn(
                                        'relative h-9 w-9 rounded-md flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shrink-0',
                                        card.iconClass
                                    )}>
                                        {card.key === 'overdue' && card.count > 0 && (
                                            <span className="absolute inset-0 rounded-md bg-red-400/40 animate-ping" />
                                        )}
                                        <Icon className={cn('h-4 w-4 relative', card.key === 'overdue' && card.count > 0 && 'animate-pulse')} />
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {auth.user?.permissions?.includes('manage-any-sales-invoices') && customerSummaries.length > 0 && (() => {
                    const visibleSummaries = showAllCustomers ? customerSummaries : customerSummaries.slice(0, 8);
                    const canViewInvoices = !!auth.user?.permissions?.includes('view-sales-invoices');
                    return (
                        <Card className="shadow-sm mb-4">
                            <CardContent className="p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Users className="h-4 w-4 text-gray-500" />
                                        <h3 className="text-sm font-semibold text-gray-800">{t('Outstanding by Customer')}</h3>
                                        <span className="text-xs text-gray-400">{t('ranked by most overdue, then balance')}</span>
                                    </div>
                                    {filters.customer_id && (() => {
                                        const activeCustomer = customers.find((c) => c.id.toString() === filters.customer_id);
                                        return (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 pl-2.5 pr-1.5 py-1 rounded-full shrink-0">
                                                {t('Filtered')}: {activeCustomer?.customer_name || filters.customer_id}
                                                <button
                                                    type="button"
                                                    onClick={clearCustomerFilter}
                                                    className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-blue-100"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        );
                                    })()}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                                    {visibleSummaries.map((summary) => (
                                        <CustomerOutstandingCard
                                            key={summary.customer?.id ?? Math.random()}
                                            summary={summary}
                                            canViewInvoices={canViewInvoices}
                                            onFilterByCustomer={filterByCustomer}
                                        />
                                    ))}
                                </div>

                                {customerSummaries.length > 8 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAllCustomers(!showAllCustomers)}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-2"
                                    >
                                        {showAllCustomers ? t('Show less') : `${t('Show all')} (${customerSummaries.length})`}
                                    </button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })()}

                <Card className="shadow-sm" ref={tableRef}>
                    <CardContent className="p-6 border-b bg-gray-50/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="w-full sm:flex-1 sm:max-w-md">
                                <SearchInput
                                    value={filters.search || ''}
                                    onChange={(value) => setFilters({ ...filters, search: value })}
                                    onSearch={handleFilter}
                                    placeholder={t('Search invoices...')}
                                />
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <PerPageSelector
                                    routeName="sales-invoices.index"
                                    filters={filters}
                                />
                                <div className="relative">
                                    <FilterButton
                                        showFilters={showFilters}
                                        onToggle={() => setShowFilters(!showFilters)}
                                    />
                                    {(() => {
                                        const activeFilters = [filters.customer_id, filters.warehouse_id, filters.status, filters.date_range].filter(Boolean).length;
                                        return activeFilters > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                                                {activeFilters}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    {showFilters && (
                        <CardContent className="p-6 bg-blue-50/30 border-b">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                {auth.user?.permissions?.includes('manage-users') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('Customer')}</label>
                                        <Select value={filters.customer_id} onValueChange={(value) => setFilters({ ...filters, customer_id: value })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Filter by customer')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {customers.map((customer) => (
                                                    <SelectItem key={customer.id} value={customer.id.toString()}>
                                                        {customer.customer_name || ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {auth.user?.permissions?.includes('manage-warehouses') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('Warehouse')}</label>
                                        <Select value={filters.warehouse_id} onValueChange={(value) => setFilters({ ...filters, warehouse_id: value })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Filter by warehouse')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {warehouses.map((warehouse) => (
                                                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                                        {warehouse.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Status')}</label>
                                    <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Filter by status')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">{t('Draft')}</SelectItem>
                                            <SelectItem value="posted">{t('Posted')}</SelectItem>
                                            <SelectItem value="partial">{t('Partial')}</SelectItem>
                                            <SelectItem value="paid">{t('Paid')}</SelectItem>
                                            <SelectItem value="overdue">{t('Overdue')}</SelectItem>
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
                                <div className="flex items-end gap-2">
                                    <Button onClick={handleFilter} size="sm">{t('Apply')}</Button>
                                    <Button variant="outline" onClick={clearFilters} size="sm">{t('Clear')}</Button>
                                </div>
                            </div>
                        </CardContent>
                    )}

                    <CardContent className="p-0">
                        <div className="overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 max-h-[70vh] rounded-none w-full">
                            <div className="min-w-[800px]">
                                <DataTable
                                    data={invoices.data}
                                    columns={tableColumns}
                                    onSort={handleSort}
                                    sortKey={sortField}
                                    sortDirection={sortDirection as 'asc' | 'desc'}
                                    className="rounded-none"
                                    emptyState={
                                        <NoRecordsFound
                                            icon={Receipt}
                                            title={t('No invoices found')}
                                            description={t('Get started by creating your first invoice.')}
                                            hasFilters={hasActiveFilters}
                                            onClearFilters={clearFilters}
                                            createPermission="create-sales-invoices"
                                            onCreateClick={() => router.visit(route('sales-invoices.create'))}
                                            createButtonText={t('Create Invoice')}
                                            className="h-auto"
                                        />
                                    }
                                />
                            </div>
                        </div>
                    </CardContent>

                    <CardContent className="px-4 py-2 border-t bg-gray-50/30">
                        <Pagination
                            data={{ ...invoices, ...invoices.meta }}
                            routeName="sales-invoices.index"
                            filters={{ ...filters, per_page: perPage }}
                        />
                    </CardContent>
                </Card>

                <ConfirmationDialog
                    open={deleteState.isOpen}
                    onOpenChange={closeDeleteDialog}
                    title={t('Delete Invoice')}
                    message={deleteState.message}
                    confirmText={t('Delete')}
                    onConfirm={confirmDelete}
                    isLoading={deleteState.isLoading}
                    variant="destructive"
                />

                <AlertDialog open={postTargetId !== null} onOpenChange={(open) => {
                    if (isPosting) return;
                    if (!open) setPostTargetId(null);
                }}>
                    <AlertDialogContent onOpenAutoFocus={(e) => {
                        e.preventDefault();
                        postCancelBtnRef.current?.focus();
                    }}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('Confirm Post Invoice')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('Are you sure you want to post this invoice? Once confirmed, it cannot be edited.')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel ref={postCancelBtnRef} disabled={isPosting} autoFocus onClick={() => setPostTargetId(null)}>
                                {t('Cancel')}
                            </AlertDialogCancel>
                            <Button
                                variant="destructive"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                isLoading={isPosting}
                                onClick={() => {
                                    if (postTargetId) {
                                        setIsPosting(true);
                                        router.post(route('sales-invoices.post', postTargetId), {}, {
                                            onSuccess: () => setPostTargetId(null),
                                            onFinish: () => setIsPosting(false)
                                        });
                                    }
                                }}
                            >
                                {t('Confirm')}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {salesAlerts.map((alert) => (
                    <div key={alert.id}>{alert.component}</div>
                ))}
            </AuthenticatedLayout>
        </TooltipProvider>
    );
}

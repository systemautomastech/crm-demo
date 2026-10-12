import { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { useDeleteHandler } from '@/hooks/useDeleteHandler';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import NoRecordsFound from '@/components/no-records-found';
import { Plus, Edit as EditIcon, Trash2, Eye, Building2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import CustomerForm from './components/CustomerForm';
import ViewCustomer from './components/ViewCustomer';

interface CustomersProps {
    customers?: any;
    auth: {
        user: {
            permissions: string[];
        };
    };
    [key: string]: any;
}

export default function Customers() {
    const { t } = useTranslation();
    const props = usePage<CustomersProps>().props;
    const {
        customers,
    } = props;

    useFlashMessages();

    // Customer modal states
    const [userModal, setUserModal] = useState<{
        isOpen: boolean;
        mode: 'create' | 'edit' | 'view' | '';
        data: any;
    }>({ isOpen: false, mode: '', data: null });

    // Delete handler for Customers
    const deleteCustomer = useDeleteHandler({
        routeName: 'customers.destroy',
        defaultMessage: t('Are you sure you want to delete this customer?')
    });

    // Search and filter handling
    const urlParams = new URLSearchParams(window.location.search);
    const [search, setSearch] = useState(urlParams.get('search') || '');

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            route('customers.index'),
            { search: value },
            { preserveState: true, replace: true }
        );
    };

    // Customer Columns
    const customerColumns = [
        {
            key: 'customer_code',
            header: t('Code'),
            render: (_: any, row: any) => (
                <span className="font-semibold text-primary">{row.customer_code}</span>
            )
        },
        {
            key: 'customer_name',
            header: t('Customer Name'),
            render: (_: any, row: any) => (
                <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground">{row.customer_name || row.company_name || row.name}</span>
                </div>
            )
        },
        {
            key: 'customer_email',
            header: t('Email'),
            render: (_: any, row: any) => row.customer_email || row.contact_person_email || row.email || '-'
        },
        {
            key: 'customer_phone',
            header: t('Phone'),
            render: (_: any, row: any) => row.customer_phone || row.contact_person_mobile || row.mobile_no || '-'
        },
        {
            key: 'contact_person_name',
            header: t('Contact Person'),
            render: (_: any, row: any) => row.contact_person_name || '-'
        },
        {
            key: 'is_active',
            header: t('Status'),
            render: (_: any, row: any) => {
                const isActive = row.is_active !== false && row.is_active !== 0;
                return (
                    <Badge className={isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none' : 'bg-slate-100 text-slate-600 hover:bg-slate-100 border-none'}>
                        {isActive ? t('Active') : t('Inactive')}
                    </Badge>
                );
            }
        },
        {
            key: 'actions',
            header: t('Actions'),
            render: (_: any, row: any) => (
                <div className="flex items-center gap-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setUserModal({ isOpen: true, mode: 'view', data: row })}
                                >
                                    <Eye className="h-4 w-4 text-slate-500" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('View')}</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setUserModal({ isOpen: true, mode: 'edit', data: row })}
                                >
                                    <EditIcon className="h-4 w-4 text-blue-600" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('Edit')}</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    onClick={() => deleteCustomer.openDeleteDialog(row.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('Delete')}</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )
        }
    ];

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('User Management'), url: route('users.index') },
                { label: t('Customers') },
            ]}
            pageTitle={t('Customers')}
            pageActions={
                <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => setUserModal({ isOpen: true, mode: 'create', data: null })}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('Create Customer')}
                    </Button>
                </div>
            }
        >
            <Head title={t('Customers')} />

            <div className="space-y-4">
                <Card className="shadow-sm">
                    <CardContent className="p-6 border-b bg-gray-50/50">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 max-w-md">
                                <SearchInput
                                    value={search}
                                    onChange={(val) => handleSearch(val)}
                                    onSearch={() => handleSearch(search)}
                                    placeholder={t('Search customers...')}
                                    data-test-id="customer-search-input"
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardContent className="p-0">
                        <DataTable
                            data={customers?.data || []}
                            columns={customerColumns}
                            emptyState={
                                <NoRecordsFound
                                    icon={Building2}
                                    title={t('No customers found')}
                                    description={t('Get started by adding your first customer.')}
                                    onCreateClick={() => setUserModal({ isOpen: true, mode: 'create', data: null })}
                                    createButtonText={t('Create Customer')}
                                />
                            }
                        />
                    </CardContent>
                    <CardContent className="border-t bg-muted/20 px-4 py-2">
                        <Pagination
                            data={customers}
                            routeName="customers.index"
                        />
                    </CardContent>
                </Card>
            </div>

            {/* ── CREATE / EDIT MODAL ──────────────────────── */}
            <Dialog
                open={userModal.isOpen && (userModal.mode === 'create' || userModal.mode === 'edit')}
                onOpenChange={(open) => !open && setUserModal({ isOpen: false, mode: '', data: null })}
            >
                {userModal.isOpen && (userModal.mode === 'create' || userModal.mode === 'edit') && (
                    <CustomerForm
                        mode={userModal.mode}
                        data={userModal.data}
                        onSuccess={() => setUserModal({ isOpen: false, mode: '', data: null })}
                    />
                )}
            </Dialog>

            {/* ── VIEW MODAL ──────────────────────── */}
            <Dialog
                open={userModal.isOpen && userModal.mode === 'view'}
                onOpenChange={(open) => !open && setUserModal({ isOpen: false, mode: '', data: null })}
            >
                {userModal.isOpen && userModal.mode === 'view' && (
                    <ViewCustomer
                        data={userModal.data}
                    />
                )}
            </Dialog>

            {/* CONFIRMATION DIALOG */}
            <ConfirmationDialog
                open={deleteCustomer.deleteState.isOpen}
                onOpenChange={deleteCustomer.closeDeleteDialog}
                title={t('Delete Customer')}
                message={deleteCustomer.deleteState.message}
                confirmText={t('Delete')}
                onConfirm={deleteCustomer.confirmDelete}
                isLoading={deleteCustomer.deleteState.isLoading}
                variant="destructive"
            />
        </AuthenticatedLayout>
    );
}

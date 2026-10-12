import { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { useDeleteHandler } from '@/hooks/useDeleteHandler';
import { usePageButtons } from '@/hooks/usePageButtons';
import { Input } from '@/components/ui/input';
import { PerPageSelector } from '@/components/ui/per-page-selector';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Edit, Trash2, Shield, Copy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { ListGridToggle } from '@/components/ui/list-grid-toggle';
import NoRecordsFound from '@/components/no-records-found';
import { RolesIndexProps, RoleFilters, Role } from './types';
import { getImagePath } from '@/utils/helpers';

export default function Index() {
    const { roles, auth } = usePage<RolesIndexProps>().props;
    const { t } = useTranslation();
    const urlParams = new URLSearchParams(window.location.search);

    const [filters, setFilters] = useState<RoleFilters>({
        name: urlParams.get('name') || ''
    });

    const [perPage] = useState(urlParams.get('per_page') || '10');
    const [sortField, setSortField] = useState(urlParams.get('sort') || '');
    const [sortDirection, setSortDirection] = useState(urlParams.get('direction') || 'asc');

    const [viewMode, setViewMode] = useState<'list' | 'grid'>(urlParams.get('view') as 'list' | 'grid' || 'list');

    useFlashMessages();

    // Add hook here
    const pageButtons = usePageButtons('roleBtn','Test data');

    const { deleteState, openDeleteDialog, closeDeleteDialog, confirmDelete } = useDeleteHandler({
        routeName: 'roles.destroy',
        defaultMessage: t('Are you sure you want to delete this role?')
    });

    const [duplicateState, setDuplicateState] = useState<{ isOpen: boolean; roleId: number | null; isLoading: boolean }>({
        isOpen: false,
        roleId: null,
        isLoading: false
    });

    const openDuplicateDialog = (roleId: number) => {
        setDuplicateState({ isOpen: true, roleId, isLoading: false });
    };

    const closeDuplicateDialog = () => {
        setDuplicateState({ isOpen: false, roleId: null, isLoading: false });
    };

    const confirmDuplicate = () => {
        if (duplicateState.roleId) {
            setDuplicateState(prev => ({ ...prev, isLoading: true }));
            router.post(route('roles.duplicate', duplicateState.roleId), {}, {
                onSuccess: () => {
                    closeDuplicateDialog();
                },
                onFinish: () => {
                    setDuplicateState(prev => ({ ...prev, isLoading: false }));
                }
            });
        }
    };

    const handleFilter = () => {
        router.get(route('roles.index'), {...filters, per_page: perPage, sort: sortField, direction: sortDirection, view: viewMode}, {
            preserveState: true,
            replace: true
        });
    };

    const handleSort = (field: string) => {
        const direction = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortField(field);
        setSortDirection(direction);
        router.get(route('roles.index'), {...filters, per_page: perPage, sort: field, direction, view: viewMode}, {
            preserveState: true,
            replace: true
        });
    };

    const clearFilters = () => {
        setFilters({ name: '' });
        router.get(route('roles.index'), {per_page: perPage, view: viewMode});
    };



    const tableColumns = [
        {
            key: 'name',
            header: t('Name'),
            sortable: true
        },
        {
            key: 'label',
            header: t('Label'),
            sortable: true
        },
        {
            key: 'permissions_count',
            header: t('Permissions'),
            render: (_: any, role: Role) => (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {role.permissions_count || 0}
                </span>
            )
        },
        {
            key: 'users',
            header: t('Users'),
            render: (_: any, role: Role) => (
                <div className="flex flex-wrap gap-1">
                    {role.users?.slice(0, 5).map((user: any) => (
                        <span key={user.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {user.name}
                        </span>
                    ))}
                    {role.users && role.users.length === 0 && (
                        <span className="text-muted-foreground text-sm">{t('No users')}</span>
                    )}
                </div>
            )
        },
        ...(auth.user?.permissions?.some((p: string) => ['create-roles', 'edit-roles', 'delete-roles'].includes(p)) ? [{
            key: 'actions',
            header: t('Actions'),
            render: (_: any, role: Role) => (
                <div className="flex gap-1">
                    <TooltipProvider>
                        {auth.user?.permissions?.includes('create-roles') && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openDuplicateDialog(role.id)}
                                        className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('Duplicate')}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {auth.user?.permissions?.includes('edit-roles') && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => router.visit(route('roles.edit', role.id))} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('Edit')}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {auth.user?.permissions?.includes('delete-roles') && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openDeleteDialog(role.id)}
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('Delete')}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </TooltipProvider>
                </div>
            )
        }] : [])
    ];

    return (
        <AuthenticatedLayout
            breadcrumbs={[{label: t('Roles')}]}
            pageTitle={t('Manage Roles')}
            pageActions={
                <div className="flex gap-2">
                    <TooltipProvider>
                        {auth.user?.permissions?.includes('create-roles') && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button size="sm" onClick={() => router.visit(route('roles.create'))}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('Create')}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {pageButtons.map((button) => (
                            <div key={button.id}>{button.component}</div>
                        ))}
                    </TooltipProvider>
                </div>
            }
        >
            <Head title={t('Roles')} />

            {/* Main Content Card */}
            <Card className="shadow-sm">
                {/* Search & Controls Header */}
                <CardContent className="p-6 border-b bg-gray-50/50">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 max-w-md">
                            <SearchInput
                                value={filters.name}
                                onChange={(value) => setFilters({...filters, name: value})}
                                onSearch={handleFilter}
                                placeholder={t('Search name...')}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <ListGridToggle
                                currentView={viewMode}
                                routeName="roles.index"
                                filters={{...filters, per_page: perPage}}
                            />
                            <PerPageSelector
                                routeName="roles.index"
                                filters={{...filters, view: viewMode}}
                            />
                        </div>
                    </div>
                </CardContent>

                {/* Table Content */}
                <CardContent className="p-0">
                    {viewMode === 'list' ? (
                        <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 max-h-[70vh] rounded-none w-full">
                            <div className="min-w-[800px]">
                            <DataTable
                                data={roles.data}
                                columns={tableColumns}
                                onSort={handleSort}
                                sortKey={sortField}
                                sortDirection={sortDirection as 'asc' | 'desc'}
                                className="rounded-none"
                                emptyState={
                                    <NoRecordsFound
                                        icon={Shield}
                                        title={t('No roles found')}
                                        description={t('Get started by creating your first role.')}
                                        hasFilters={!!filters.name}
                                        onClearFilters={clearFilters}
                                        createPermission="create-roles"
                                        onCreateClick={() => router.visit(route('roles.create'))}
                                        createButtonText={t('Create Role')}
                                        className="h-auto"
                                    />
                                }
                            />
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[70vh] p-6">
                            {roles.data.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {roles.data.map((role) => (
                                        <Card key={role.id} className="border border-gray-200">
                                            <div className="p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-primary/10 rounded-lg">
                                                            <Shield className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-base text-gray-900">{role.label}</h3>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <TooltipProvider>
                                                            {auth.user?.permissions?.includes('create-roles') && (
                                                                <Tooltip delayDuration={300}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => openDuplicateDialog(role.id)}
                                                                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-600 hover:bg-transparent"
                                                                        >
                                                                            <Copy className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>{t('Duplicate')}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {auth.user?.permissions?.includes('edit-roles') && (
                                                                <Tooltip delayDuration={300}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="sm" onClick={() => router.visit(route('roles.edit', role.id))} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-600 hover:bg-transparent">
                                                                            <Edit className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>{t('Edit')}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {auth.user?.permissions?.includes('delete-roles') && (
                                                                <Tooltip delayDuration={300}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => openDeleteDialog(role.id)}
                                                                            className="h-8 w-8 p-0 text-red-600  hover:text-red-600 hover:bg-transparent"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>{t('Delete')}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </TooltipProvider>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-medium text-gray-600">{t('Permissions')}</span>
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                            {role.permissions_count || 0}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <p className="text-xs font-medium text-gray-600 mb-2">{t('Users')}</p>
                                                        <div className="flex items-center gap-1">
                                                            {role.users && role.users.length > 0 ? (
                                                                <div className="flex -space-x-1">
                                                                     {role.users.filter((user: any) => Boolean(user)).slice(0, 4).map((user: any) => (
                                                                        <TooltipProvider key={user.id}>
                                                                            <Tooltip delayDuration={0}>
                                                                                <TooltipTrigger>
                                                                                    <div className="h-8 w-8 rounded-full border-2 border-background overflow-hidden">
                                                                                        <img
                                                                                            src={user?.avatar ? getImagePath(user.avatar) : getImagePath('avatar.png')}
                                                                                            alt={user?.name || 'User'}
                                                                                            className="h-full w-full object-cover"
                                                                                        />
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p>{user?.name || 'User'}</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    ))}
                                                                    {role.users.length > 4 && (
                                                                        <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-background flex items-center justify-center">
                                                                            <span className="text-xs text-gray-600">+{role.users.length - 4}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-gray-500">{t('No users')}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <NoRecordsFound
                                    icon={Shield}
                                    title={t('No roles found')}
                                    description={t('Get started by creating your first role.')}
                                    hasFilters={!!filters.name}
                                    onClearFilters={clearFilters}
                                    createPermission="create-roles"
                                    onCreateClick={() => router.visit(route('roles.create'))}
                                    createButtonText={t('Create Role')}
                                />
                            )}
                        </div>
                    )}
                </CardContent>

                {/* Pagination Footer */}
                <CardContent className="px-4 py-2 border-t bg-gray-50/30">
                    <Pagination
                        data={roles as any}
                        routeName="roles.index"
                        filters={{...filters, per_page: perPage, view: viewMode}}
                    />
                </CardContent>
            </Card>

            <ConfirmationDialog
                open={deleteState.isOpen}
                onOpenChange={closeDeleteDialog}
                title={t('Delete Role')}
                message={deleteState.message}
                confirmText={t('Delete')}
                onConfirm={confirmDelete}
                isLoading={deleteState.isLoading}
                variant="destructive"
            />

            <ConfirmationDialog
                open={duplicateState.isOpen}
                onOpenChange={closeDuplicateDialog}
                title={t('Duplicate Role')}
                message={t('Are you sure you want to duplicate this role?')}
                confirmText={t('Duplicate')}
                isLoading={duplicateState.isLoading}
                onConfirm={confirmDuplicate}
            />
        </AuthenticatedLayout>
    );
}

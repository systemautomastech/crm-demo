import { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { useDeleteHandler } from '@/hooks/useDeleteHandler';
import { usePageButtons } from '@/hooks/usePageButtons';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PerPageSelector } from '@/components/ui/per-page-selector';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { InputError } from "@/components/ui/input-error";
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Edit, Trash2, Key, Users as UsersIcon, User as UserIcon, UserCheck, History, Lock, Building2, Crown, Package, Check, Users, HardDrive, Layers, ChevronLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { getImagePath, formatAdminCurrency, getPackageFavicon, getPackageAlias } from '@/utils/helpers';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FilterButton } from '@/components/ui/filter-button';
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { ListGridToggle } from '@/components/ui/list-grid-toggle';
import Create from './create';
import EditUser from './edit';
import ChangePassword from './change-password';
import NoRecordsFound from '@/components/no-records-found';
import { User, UsersIndexProps, UserFilters, UserModalState } from './types';

export default function Index() {
    const { t } = useTranslation();
    const { users, roles, plans, activeModules = [], auth } = usePage<UsersIndexProps>().props;
    const urlParams = new URLSearchParams(window.location.search);

    const [filters, setFilters] = useState<UserFilters>({
        name: urlParams.get('name') || '',
        email: urlParams.get('email') || '',
        role: urlParams.get('role') || '',
        is_enable_login: urlParams.get('is_enable_login') || ''
    });

    const [perPage] = useState(urlParams.get('per_page') || '10');
    const [sortField, setSortField] = useState(urlParams.get('sort') || '');
    const [sortDirection, setSortDirection] = useState(urlParams.get('direction') || 'asc');

    const [viewMode, setViewMode] = useState<'list' | 'grid'>(urlParams.get('view') as 'list' | 'grid' || 'grid');
    const [modalState, setModalState] = useState<UserModalState>({
        isOpen: false,
        mode: '',
        data: null
    });
    const [upgradeForm, setUpgradeForm] = useState({
        plan_id: '',
        duration: 'Month'
    });
    const [assigningPlanId, setAssigningPlanId] = useState<number | string | null>(null);
    const [upgradeView, setUpgradeView] = useState<'plans' | 'custom'>('plans');
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [customCounters, setCustomCounters] = useState<{
        user_counter: number | '';
        storage_limit: number | '';
    }>({
        user_counter: 5,
        storage_limit: 1
    });
    const [customErrors, setCustomErrors] = useState<{
        user_counter?: string;
        storage_limit?: string;
    }>({});

    const validateCustomCounters = () => {
        const errors: { user_counter?: string; storage_limit?: string } = {};
        if (customCounters.user_counter === '' || customCounters.user_counter === null || customCounters.user_counter === undefined) {
            errors.user_counter = t('Max Users is required.');
        }
        if (customCounters.storage_limit === '' || customCounters.storage_limit === null || customCounters.storage_limit === undefined) {
            errors.storage_limit = t('Storage Limit is required.');
        }
        setCustomErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const [showFilters, setShowFilters] = useState(false);

    useFlashMessages();

    // Add hook here
    const pageButtons = usePageButtons('userBtn', 'Test data');

    const { deleteState, openDeleteDialog, closeDeleteDialog, confirmDelete } = useDeleteHandler({
        routeName: 'users.destroy',
        defaultMessage: t('Are you sure you want to delete this user? All associated data will also be deleted, but financial data will be preserved.')
    });

    const handleFilter = () => {
        router.get(route('users.index'), { ...filters, per_page: perPage, sort: sortField, direction: sortDirection, view: viewMode }, {
            preserveState: true,
            replace: true
        });
    };

    const handleSort = (field: string) => {
        const direction = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortField(field);
        setSortDirection(direction);
        router.get(route('users.index'), { ...filters, per_page: perPage, sort: field, direction, view: viewMode }, {
            preserveState: true,
            replace: true
        });
    };

    const clearFilters = () => {
        setFilters({ name: '', email: '', role: '', is_enable_login: '' });
        router.get(route('users.index'), { per_page: perPage, view: viewMode });
    };

    const openModal = (mode: 'add' | 'edit' | 'change-password' | 'upgrade-plan', data: User | null = null) => {
        setModalState({
            isOpen: true,
            mode,
            data
        });
        if (mode === 'upgrade-plan') {
            const freePlan = plans.find(p => p.free_plan);
            setUpgradeForm({
                plan_id: freePlan ? String(freePlan.id) : '',
                duration: 'Month'
            });
            setUpgradeView('plans');
            setSelectedModules([]);
        }
    };

    const closeModal = () => {
        setModalState({
            isOpen: false,
            mode: '',
            data: null
        });
    };

    const tableColumns = [
        {
            key: 'avatar',
            header: t('Avatar'),
            render: (value: string) => (
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border flex items-center justify-center">
                    {value ? (
                        <img
                            src={getImagePath(value)}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <UserIcon className="w-5 h-5 text-gray-400" />
                    )}
                </div>
            )
        },
        {
            key: 'name',
            header: t('Name'),
            sortable: true
        },
        {
            key: 'email',
            header: t('Email'),
            sortable: true
        },
        {
            key: 'mobile_no',
            header: t('Mobile No')
        },
        {
            key: 'type',
            header: t('Role'),
            sortable: true,
            render: (value: string) => (
                <span className="capitalize px-2 py-1 bg-gray-100 rounded-full text-sm">
                    {value}
                </span>
            )
        },
        {
            key: 'is_enable_login',
            header: t('Login Status'),
            sortable: true,
            render: (value: boolean) => (
                <span className={`px-2 py-1 rounded-full text-sm ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {value ? t('Enabled') : t('Disabled')}
                </span>
            )
        },
        ...(auth.user?.permissions?.some((p: string) => ['change-password-users', 'edit-users', 'delete-users'].includes(p)) ? [{
            key: 'actions',
            header: t('Actions'),
            render: (_: any, user: User) => (
                <div className="flex gap-1">
                    {user.is_disable === 1 ? (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <div className="h-8 w-8 p-0 flex items-center justify-center text-gray-400">
                                    <Lock className="h-4 w-4" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('User is disabled')}</p>
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <TooltipProvider>
                            {auth.user?.permissions?.includes('impersonate-users') && user.id !== auth.user?.id && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => router.post(route('users.impersonate', user.id))}
                                            className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700"
                                        >
                                            <UserCheck className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('Login As User')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {auth.user?.permissions?.includes('view-admin-hub') && user.type === 'company' && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => router.get(route('users.admin-hub', user.id))}
                                            className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700"
                                        >
                                            <Building2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('Admin Hub')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {auth.user?.permissions?.includes('view-upgrade-plan') && auth.user?.type === 'superadmin' && user.type === 'company' && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openModal('upgrade-plan', user)}
                                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                                        >
                                            <Crown className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('Upgrade Plan')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {auth.user?.permissions?.includes('change-password-users') && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={() => openModal('change-password', user)} className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700">
                                            <Key className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('Change Password')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {auth.user?.permissions?.includes('edit-users') && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={() => openModal('edit', user)} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('Edit')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {auth.user?.permissions?.includes('delete-users') && (
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openDeleteDialog(user.id)}
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
                    )}
                </div>
            )
        }] : [])
    ];

    return (
        <AuthenticatedLayout
            breadcrumbs={[{ label: t('Users') }]}
            pageTitle={t('Manage Users')}
            pageActions={
                <div className="flex gap-2">
                    <TooltipProvider>
                        {auth.user?.permissions?.includes('view-login-history') && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={() => router.get(route('users.login-history'))}>
                                        <History className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('User Login History')}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {auth.user?.permissions?.includes('create-users') && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button size="sm" onClick={() => openModal('add')}>
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
            <Head title={t('Users')} />

            {/* Main Content Card */}
            <Card className="shadow-sm">
                {/* Search & Controls Header */}
                <CardContent className="p-6 border-b bg-gray-50/50">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 max-w-md">
                            <SearchInput
                                value={filters.name}
                                onChange={(value) => setFilters({ ...filters, name: value })}
                                onSearch={handleFilter}
                                placeholder={t('Search users...')}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <ListGridToggle
                                currentView={viewMode}
                                routeName="users.index"
                                filters={{ ...filters, per_page: perPage }}
                            />
                            <PerPageSelector
                                routeName="users.index"
                                filters={{ ...filters, view: viewMode }}
                            />
                            <div className="relative">
                                <FilterButton
                                    showFilters={showFilters}
                                    onToggle={() => setShowFilters(!showFilters)}
                                />
                                {(() => {
                                    const activeFilters = [filters.email, filters.role, filters.is_enable_login].filter(Boolean).length;
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

                {/* Advanced Filters */}
                {showFilters && (
                    <CardContent className="p-6 bg-blue-50/30 border-b">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Email')}</label>
                                <Input
                                    placeholder={t('Filter by email')}
                                    value={filters.email}
                                    onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                                />
                            </div>
                            {auth.user?.permissions?.includes('manage-roles') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Role')}</label>
                                    <Select value={filters.role} onValueChange={(value) => setFilters({ ...filters, role: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Filter by role')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(roles).map(([name, label]) => (
                                                <SelectItem key={name} value={name}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Login Status')}</label>
                                <Select value={filters.is_enable_login} onValueChange={(value) => setFilters({ ...filters, is_enable_login: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Filter by login status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">{t('Enabled')}</SelectItem>
                                        <SelectItem value="0">{t('Disabled')}</SelectItem>
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

                {/* Table Content */}
                <CardContent className="p-0">
                    {viewMode === 'list' ? (
                        <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 max-h-[70vh] rounded-none w-full">
                            <div className="min-w-[800px]">
                                <DataTable
                                    data={users.data}
                                    columns={tableColumns}
                                    onSort={handleSort}
                                    sortKey={sortField}
                                    sortDirection={sortDirection as 'asc' | 'desc'}
                                    className="rounded-none"
                                    emptyState={
                                        <NoRecordsFound
                                            icon={UsersIcon}
                                            title={t('No users found')}
                                            description={t('Get started by creating your first user.')}
                                            hasFilters={!!(filters.name || filters.email || filters.role || filters.is_enable_login)}
                                            onClearFilters={clearFilters}
                                            createPermission="create-users"
                                            onCreateClick={() => openModal('add')}
                                            createButtonText={t('Create User')}
                                            className="h-auto"
                                        />
                                    }
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[70vh] p-6">
                            {users.data.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                                    {users.data.map((user) => (
                                        <Card key={user.id} className="group relative overflow-hidden border border-gray-200 hover:border-primary/40 hover:shadow-xl transition-all duration-300">
                                            {/* Status Badge - Top Right Corner */}
                                            <div className="absolute top-3 right-3 z-10">
                                                <span className={`px-2 py-1 rounded-full text-sm ${user.is_enable_login ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {user.is_enable_login ? t('Enabled') : t('Disabled')}
                                                </span>
                                            </div>

                                            <div className="p-5">
                                                {/* Avatar Section - Centered */}
                                                <div className="flex flex-col items-center mb-4">
                                                    <div className="relative mb-3">
                                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-2 border-primary/30 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                            {user.avatar ? (
                                                                <img src={getImagePath(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                                                                    <UserIcon className="w-7 h-7 text-primary" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${user.is_online ? 'bg-green-500' : 'bg-gray-400'
                                                            }`} />
                                                    </div>

                                                    {/* Name */}
                                                    <h3 className="font-bold text-base text-gray-900 text-center mb-1.5 line-clamp-1 px-2" title={user.name}>
                                                        {user.name}
                                                    </h3>

                                                    {/* Role Badge */}
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 capitalize">
                                                        {user.type}
                                                    </span>
                                                </div>

                                                {/* Contact Info */}
                                                <div className="space-y-2 mb-4 bg-gray-50 rounded-lg p-3">
                                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                                        <svg className="w-4 h-4 flex-shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="truncate font-medium" title={user.email}>{user.email}</span>
                                                    </div>
                                                    {user.mobile_no && (
                                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                                            <svg className="w-4 h-4 flex-shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                            </svg>
                                                            <span className="font-medium">{user.mobile_no}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center justify-center gap-1.5 pt-3 border-t border-gray-200">
                                                    {user.is_disable === 1 ? (
                                                        <TooltipProvider>
                                                            <Tooltip delayDuration={0}>
                                                                <TooltipTrigger asChild>
                                                                    <div className="h-9 w-9 flex items-center justify-center text-gray-400 bg-gray-100 rounded-lg">
                                                                        <Lock className="h-4 w-4" />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>{t('User is disabled')}</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    ) : (
                                                        <TooltipProvider>
                                                            {auth.user?.permissions?.includes('impersonate-users') && user.id !== auth.user?.id && (
                                                                <Tooltip delayDuration={0}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => router.post(route('users.impersonate', user.id))}
                                                                            className="h-9 w-9 p-0 text-purple-600 hover:text-purple-700 rounded-lg transition-colors"
                                                                        >
                                                                            <UserCheck className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{t('Login As User')}</p></TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {auth.user?.permissions?.includes('view-admin-hub') && user.type === 'company' && (
                                                                <Tooltip delayDuration={0}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => router.get(route('users.admin-hub', user.id))}
                                                                            className="h-9 w-9 p-0 text-indigo-600 hover:text-indigo-700 rounded-lg transition-colors"
                                                                        >
                                                                            <Building2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{t('Admin Hub')}</p></TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {auth.user?.permissions?.includes('view-upgrade-plan') && auth.user?.type === 'superadmin' && user.type === 'company' && (
                                                                <Tooltip delayDuration={0}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => openModal('upgrade-plan', user)}
                                                                            className="h-9 w-9 p-0 text-amber-600 hover:text-amber-700 rounded-lg transition-colors"
                                                                        >
                                                                            <Crown className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{t('Upgrade Plan')}</p></TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {auth.user?.permissions?.includes('change-password-users') && (
                                                                <Tooltip delayDuration={0}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => openModal('change-password', user)}
                                                                            className="h-9 w-9 p-0 text-orange-600 hover:text-orange-700 rounded-lg transition-colors"
                                                                        >
                                                                            <Key className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{t('Change Password')}</p></TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {auth.user?.permissions?.includes('edit-users') && (
                                                                <Tooltip delayDuration={0}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => openModal('edit', user)}
                                                                            className="h-9 w-9 p-0 text-blue-600 hover:text-blue-700 rounded-lg transition-colors"
                                                                        >
                                                                            <Edit className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{t('Edit')}</p></TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {auth.user?.permissions?.includes('delete-users') && (
                                                                <Tooltip delayDuration={0}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => openDeleteDialog(user.id)}
                                                                            className="h-9 w-9 p-0 text-red-600 hover:text-red-700 rounded-lg transition-colors"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{t('Delete')}</p></TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <NoRecordsFound
                                    icon={UsersIcon}
                                    title={t('No users found')}
                                    description={t('Get started by creating your first user.')}
                                    hasFilters={!!(filters.name || filters.email || filters.role || filters.is_enable_login)}
                                    onClearFilters={clearFilters}
                                    createPermission="create-users"
                                    onCreateClick={() => openModal('add')}
                                    createButtonText={t('Create User')}
                                />
                            )}
                        </div>
                    )}
                </CardContent>

                {/* Pagination Footer */}
                <CardContent className="px-4 py-2 border-t bg-gray-50/30">
                    <Pagination
                        data={users}
                        routeName="users.index"
                        filters={{ ...filters, per_page: perPage, view: viewMode }}
                    />
                </CardContent>
            </Card>

            <Dialog open={modalState.isOpen} onOpenChange={closeModal}>
                {modalState.mode === 'add' && (
                    <Create onSuccess={closeModal} roles={roles} />
                )}
                {modalState.mode === 'edit' && modalState.data && (
                    <EditUser
                        user={modalState.data}
                        onSuccess={closeModal}
                        roles={roles}
                    />
                )}
                {modalState.mode === 'change-password' && modalState.data && (
                    <ChangePassword
                        user={modalState.data}
                        onSuccess={closeModal}
                    />
                )}
                {modalState.mode === 'upgrade-plan' && modalState.data && (
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Crown className="h-5 w-5 text-amber-500" />
                                {upgradeView === 'plans'
                                    ? t('Upgrade Plan', { name: modalState.data.name })
                                    : t('Custom Add-ons', { name: modalState.data.name })
                                }
                            </DialogTitle>
                            <DialogDescription>
                                {upgradeView === 'plans'
                                    ? t('Select a plan and duration to assign to this company.')
                                    : t('Select add-ons to activate for this company.')
                                }
                            </DialogDescription>
                        </DialogHeader>
                        <DialogBody>
                            {upgradeView === 'plans' ? (
                                <>
                                    {/* Duration Selector */}
                                    <div className="flex items-center justify-center mb-5">
                                        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                                            {(['Month', 'Year'] as const).map((dur) => (
                                                <button
                                                    key={dur}
                                                    onClick={() => setUpgradeForm({ ...upgradeForm, duration: dur })}
                                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${upgradeForm.duration === dur
                                                        ? 'bg-white text-gray-900 shadow-sm'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                        }`}
                                                >
                                                    {dur === 'Month' ? t('Monthly') : t('Yearly')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Plans Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[40vh] overflow-y-auto pr-1">
                                        {plans.filter(p => p.status && !p.custom_plan).map((plan) => (
                                            <div
                                                key={plan.id}
                                                className={`relative group rounded-xl border p-4 hover:shadow-lg transition-all duration-300 ${plan.free_plan
                                                    ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-300'
                                                    : 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-300'
                                                    }`}
                                            >
                                                {plan.free_plan && (
                                                    <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                                        {t('FREE')}
                                                    </span>
                                                )}
                                                <div className="flex flex-col h-full">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${plan.free_plan ? 'bg-green-100' : 'bg-blue-100'
                                                            }`}>
                                                            <Package className={`h-4 w-4 ${plan.free_plan ? 'text-green-600' : 'text-blue-600'
                                                                }`} />
                                                        </div>
                                                        <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">{plan.name}</h4>
                                                    </div>

                                                    <div className="space-y-1.5 mb-3 flex-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                            <Users className="h-3.5 w-3.5 text-gray-400" />
                                                            <span>{plan.number_of_users === -1 ? t('Unlimited Users') : t('{{count}} Users', { count: plan.number_of_users })}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                            <HardDrive className="h-3.5 w-3.5 text-gray-400" />
                                                            <span>{plan.storage_limit > 0 ? Math.round(plan.storage_limit / (1024 * 1024)) + ' GB' : t('No Storage')}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                            <Layers className="h-3.5 w-3.5 text-gray-400" />
                                                            <span>{Array.isArray(plan.modules) ? plan.modules.length : 0} {t('Modules')}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 pt-1">
                                                            <span className={`${plan.free_plan ? 'text-green-600' : 'text-blue-600'}`}>
                                                                {plan.free_plan
                                                                    ? t('Free')
                                                                    : upgradeForm.duration === 'Year'
                                                                        ? formatAdminCurrency(plan.package_price_yearly)
                                                                        : formatAdminCurrency(plan.package_price_monthly)
                                                                }
                                                            </span>
                                                            {!plan.free_plan && (
                                                                <span className="text-gray-400 font-normal">/ {upgradeForm.duration === 'Year' ? t('year') : t('month')}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {modalState.data?.active_plan === plan.id ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full text-gray-500 border-gray-300 cursor-default"
                                                            disabled
                                                        >
                                                            <span className="flex items-center gap-1">
                                                                <Check className="h-3.5 w-3.5" />
                                                                {t('Already Assigned')}
                                                            </span>
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            className={`w-full text-white ${plan.free_plan
                                                                ? 'bg-green-600 hover:bg-green-700'
                                                                : 'bg-blue-600 hover:bg-blue-700'
                                                                }`}
                                                            disabled={assigningPlanId !== null}
                                                            onClick={() => {
                                                                setAssigningPlanId(plan.id);
                                                                router.post(route('users.assign-plan', modalState.data!.id), {
                                                                    plan_id: plan.id,
                                                                    duration: upgradeForm.duration
                                                                }, {
                                                                    preserveState: true,
                                                                    onFinish: () => {
                                                                        setAssigningPlanId(null);
                                                                        closeModal();
                                                                    }
                                                                });
                                                            }}
                                                        >
                                                            {assigningPlanId === plan.id ? (
                                                                <span className="flex items-center gap-1">
                                                                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                    {t('Assigning...')}
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1">
                                                                    <Check className="h-3.5 w-3.5" />
                                                                    {t('Assign Plan')}
                                                                </span>
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* OR Divider */}
                                    <div className="flex items-center gap-4 my-4">
                                        <div className="flex-1 h-px bg-gray-200" />
                                        <span className="text-sm font-medium text-gray-500">{t('OR')}</span>
                                        <div className="flex-1 h-px bg-gray-200" />
                                    </div>

                                    {/* Custom Add-ons Button */}
                                    <div className="pb-2 flex justify-center">
                                        <Button
                                            size="sm"
                                            onClick={() => setUpgradeView('custom')}
                                            className="text-white bg-purple-600 hover:bg-purple-700 px-8"
                                        >
                                            {t('Custom Add-ons')}
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                /* Custom Add-ons View */
                                <div className="space-y-4">

                                    {/* Duration Selector for Custom */}
                                    <div className="flex items-center justify-center mb-3">
                                        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                                            {(['Month', 'Year'] as const).map((dur) => (
                                                <button
                                                    key={dur}
                                                    onClick={() => setUpgradeForm({ ...upgradeForm, duration: dur })}
                                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${upgradeForm.duration === dur
                                                        ? 'bg-white text-gray-900 shadow-sm'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                        }`}
                                                >
                                                    {dur === 'Month' ? t('Monthly') : t('Yearly')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>


                                    {/* Custom Counters Inputs */}
                                    <Card>
                                        <CardContent className="space-y-4 pt-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>{t('Max Users')}</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder={t('Enter max users')}
                                                        value={customCounters.user_counter || ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value === '' ? '' : parseInt(e.target.value);
                                                            setCustomCounters({ ...customCounters, user_counter: value === '' ? 0 : value });
                                                            if (customErrors.user_counter) {
                                                                setCustomErrors({ ...customErrors, user_counter: undefined });
                                                            }
                                                        }}
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">{t('Note: "-1" for Unlimited')}</p>
                                                    <InputError message={customErrors.user_counter} />
                                                </div>
                                                <div>
                                                    <Label>{t('Storage Limit (GB)')}</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder={t('Enter storage limit in GB')}
                                                        value={customCounters.storage_limit || ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value === '' ? '' : parseInt(e.target.value);
                                                            setCustomCounters({ ...customCounters, storage_limit: value === '' ? 0 : value });
                                                            if (customErrors.storage_limit) {
                                                                setCustomErrors({ ...customErrors, storage_limit: undefined });
                                                            }
                                                        }}
                                                    />
                                                    <InputError message={customErrors.storage_limit} />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>



                                    <div className="border rounded-xl p-4 bg-gray-50/50">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium text-sm text-gray-900">{t('Select Add-ons')}</h4>
                                            <Badge>{selectedModules.length} {t('selected')}</Badge>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[45vh] overflow-y-auto pr-1">
                                            {activeModules?.map((mod) => (
                                                <div
                                                    key={mod.module}
                                                    onClick={() => {
                                                        if (selectedModules.includes(mod.module)) {
                                                            setSelectedModules(selectedModules.filter(m => m !== mod.module));
                                                        } else {
                                                            setSelectedModules([...selectedModules, mod.module]);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all duration-200 ${selectedModules.includes(mod.module)
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-gray-200 bg-white hover:bg-muted/50'
                                                        }`}
                                                >
                                                    <img
                                                        src={getPackageFavicon(mod.module)}
                                                        alt=""
                                                        className="w-8 h-8 border rounded"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                    <span className="text-sm truncate flex-1">{getPackageAlias(mod.module) || mod.name}</span>
                                                    <Checkbox
                                                        checked={selectedModules.includes(mod.module)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedModules([...selectedModules, mod.module]);
                                                            } else {
                                                                setSelectedModules(selectedModules.filter(m => m !== mod.module));
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-center">
                                        <Button
                                            className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                                            disabled={assigningPlanId !== null || selectedModules.length === 0}
                                            onClick={() => {
                                                if (selectedModules.length === 0) return;
                                                if (!validateCustomCounters()) return;
                                                setAssigningPlanId('custom');
                                                router.post(route('users.assign-plan', modalState.data!.id), {
                                                    plan_id: null,
                                                    duration: upgradeForm.duration,
                                                    modules: selectedModules,
                                                    user_counter: customCounters.user_counter,
                                                    storage_limit: customCounters.storage_limit
                                                }, {
                                                    preserveState: true,
                                                    onFinish: () => {
                                                        setAssigningPlanId(null);
                                                        closeModal();
                                                    }
                                                });
                                            }}
                                        >
                                            {assigningPlanId === 'custom' ? (
                                                <span>{t('Assigning...')}</span>
                                            ) : (
                                                <span>{t('Assign {{count}} Add-ons', { count: selectedModules.length })}</span>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </DialogBody>
                    </DialogContent>
                )}
            </Dialog>

            <ConfirmationDialog
                open={deleteState.isOpen}
                onOpenChange={closeDeleteDialog}
                title={t('Delete User')}
                message={deleteState.message}
                confirmText={t('Delete')}
                onConfirm={confirmDelete}
                isLoading={deleteState.isLoading}
                variant="destructive"
            />
        </AuthenticatedLayout>
    );
}
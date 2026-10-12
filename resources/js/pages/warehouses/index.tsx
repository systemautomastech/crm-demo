import { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { useDeleteHandler } from '@/hooks/useDeleteHandler';
import { usePageButtons } from '@/hooks/usePageButtons';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Plus, Edit, Trash2, Warehouse as WarehouseIcon,
    CheckCircle2, XCircle, AlertTriangle, PackageSearch,
    MapPin, Phone, Mail, CalendarDays, PackageX, ArrowRight, AlertOctagon, Boxes, Loader2
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SearchInput } from "@/components/ui/search-input";
import Create from './create';
import EditWarehouse from './edit';
import NoRecordsFound from '@/components/no-records-found';
import { Warehouse, WarehousesIndexProps, WarehouseFilters, WarehouseModalState } from './types';
import { cn } from '@/lib/utils';
import { formatDate, formatCurrency } from '@/utils/helpers';

export default function Index() {
    const { t } = useTranslation();
    const { warehouses, auth, stats } = usePage<WarehousesIndexProps>().props;
    const urlParams = new URLSearchParams(window.location.search);

    const [filters, setFilters] = useState<WarehouseFilters>({
        search: urlParams.get('search') || ''
    });

    const [modalState, setModalState] = useState<WarehouseModalState>({
        isOpen: false,
        mode: '',
        data: null
    });

    useFlashMessages();

    // Add hook here
    const pageButtons = usePageButtons('warehouseBtn', 'Test data');
    const googleDriveBtn = usePageButtons('googleDriveBtn', { module: 'Warehouse', settingKey: 'GoogleDrive Warehouse' });
    const oneDriveBtn = usePageButtons('oneDriveBtn', { module: 'Warehouse', settingKey: 'OneDrive Warehouse' });
    const dropboxBtn = usePageButtons('dropboxBtn', { module: 'Warehouse', settingKey: 'Dropbox Warehouse' });
    const boxBtn = usePageButtons('boxBtn', { module: 'Warehouse', settingKey: 'Box Warehouse' });

    const { deleteState, openDeleteDialog, closeDeleteDialog, confirmDelete } = useDeleteHandler({
        routeName: 'warehouses.destroy',
        defaultMessage: t('Are you sure you want to delete this warehouse?')
    });

    const [reactivateTarget, setReactivateTarget] = useState<Warehouse | null>(null);
    const [stockWarningTarget, setStockWarningTarget] = useState<Warehouse | null>(null);
    const [targetWarehouseId, setTargetWarehouseId] = useState<string>('');
    const [isTransferring, setIsTransferring] = useState<boolean>(false);
    const [isReactivating, setIsReactivating] = useState<boolean>(false);

    const confirmReactivate = () => {
        if (!reactivateTarget) return;
        setIsReactivating(true);
        router.put(route('warehouses.update', reactivateTarget.id), {
            name: reactivateTarget.name,
            address: reactivateTarget.address,
            city: reactivateTarget.city,
            zip_code: reactivateTarget.zip_code,
            phone: reactivateTarget.phone,
            email: reactivateTarget.email,
            is_active: true
        }, {
            onSuccess: () => setReactivateTarget(null),
            onFinish: () => setIsReactivating(false)
        });
    };

    const handleSearch = () => {
        router.get(route('warehouses.index'), { ...filters }, {
            preserveState: true,
            replace: true
        });
    };

    const clearFilters = () => {
        setFilters({ search: '' });
        router.get(route('warehouses.index'));
    };

    const openModal = (mode: 'add' | 'edit', data: Warehouse | null = null) => {
        setModalState({
            isOpen: true,
            mode,
            data
        });
    };

    const closeModal = () => {
        setModalState({
            isOpen: false,
            mode: '',
            data: null
        });
    };

    const activeWarehouses = warehouses.filter((w) => w.is_active);
    const inactiveWarehouses = warehouses.filter((w) => !w.is_active);
    const needsAttentionCount = warehouses.filter((w) => w.has_stranded_stock || w.is_never_stocked || !!w.out_of_stock_count).length;
    const hasActiveFilters = !!filters.search;

    const renderNudge = ({
        tone, icon: Icon, message, title, actionLabel, onAction
    }: {
        tone: 'red' | 'amber';
        icon: React.ComponentType<{ className?: string }>;
        message: string;
        title?: string;
        actionLabel?: string;
        onAction?: () => void;
    }) => {
        const toneClasses = tone === 'red'
            ? { wrap: 'border-red-200 bg-red-50', icon: 'text-red-600', text: 'text-red-800', btn: 'border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800' }
            : { wrap: 'border-amber-200 bg-amber-50', icon: 'text-amber-600', text: 'text-amber-800', btn: 'border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800' };
        return (
            <div className={cn('mb-3 flex items-center justify-between gap-2 rounded-md border pl-3 pr-1.5 py-1.5', toneClasses.wrap)} title={title}>
                <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className={cn('h-3.5 w-3.5 shrink-0', toneClasses.icon)} />
                    <p className={cn('text-xs truncate', toneClasses.text)}>{message}</p>
                </div>
                {actionLabel && onAction && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onAction}
                        className={cn('h-6 px-2.5 text-xs font-medium bg-white shrink-0', toneClasses.btn)}
                    >
                        {actionLabel}
                    </Button>
                )}
            </div>
        );
    };

    const renderCard = (warehouse: Warehouse) => (
        <Card key={warehouse.id} className="border border-gray-200 flex flex-col">
            <div className="p-4 flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                            'p-2 rounded-lg shrink-0 transition-transform duration-200 hover:scale-110',
                            warehouse.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                        )}>
                            <WarehouseIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-base text-gray-900 truncate">{warehouse.name}</h3>
                            <p className="flex items-center gap-1 text-[11px] text-gray-400">
                                <CalendarDays className="h-3 w-3 shrink-0" />
                                {t('Added')} {formatDate(warehouse.created_at)}
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className={cn('shrink-0', warehouse.is_active ? 'border-transparent !bg-green-100 !text-green-800' : 'border-transparent !bg-red-100 !text-red-700')}>
                        {warehouse.is_active ? t('Active') : t('Inactive')}
                    </Badge>
                </div>

                <div className="space-y-1.5 mb-3">
                    <div className="flex items-start gap-1.5 text-gray-600">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <p className="text-xs text-gray-900 truncate" title={`${warehouse.address}, ${warehouse.city} ${warehouse.zip_code}`}>
                            {warehouse.address}, {warehouse.city} {warehouse.zip_code}
                        </p>
                    </div>
                    {warehouse.phone && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <p className="text-xs text-gray-900">{warehouse.phone}</p>
                        </div>
                    )}
                    {warehouse.email && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <p className="text-xs text-gray-900 truncate">{warehouse.email}</p>
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-3 grid grid-cols-2 divide-x divide-gray-200">
                    <div className="text-center">
                        <p className="text-base font-bold text-gray-900">{formatCurrency(warehouse.stock_value ?? 0)}</p>
                        <p className="text-[11px] text-gray-500">{t('Stock Value')}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-base font-bold text-gray-900">{warehouse.product_count ?? 0}</p>
                        <p className="text-[11px] text-gray-500">{t('Products')}</p>
                    </div>
                </div>

                {!!warehouse.out_of_stock_count && renderNudge({
                    tone: 'red',
                    icon: PackageX,
                    message: `${warehouse.out_of_stock_count} ${warehouse.out_of_stock_count === 1 ? t('product') : t('products')} ${t('out of stock')}`,
                    actionLabel: auth.user?.permissions?.includes('manage-stock') ? t('Restock') : undefined,
                    onAction: () => router.visit(route('product-service.stock.index')),
                })}

                {warehouse.has_stranded_stock && renderNudge({
                    tone: 'amber',
                    icon: AlertTriangle,
                    message: `${t('Inactive with')} ${warehouse.stock_quantity} ${t('units stranded')}`,
                    title: t('Inactive but still holds stock — invisible to transfers and sales until reactivated.'),
                    actionLabel: auth.user?.permissions?.includes('edit-warehouses') ? t('Reactivate') : undefined,
                    onAction: () => setReactivateTarget(warehouse),
                })}

                {warehouse.is_never_stocked && renderNudge({
                    tone: 'amber',
                    icon: PackageSearch,
                    message: t('No stock added in 2+ weeks'),
                    title: t('Active for over 2 weeks with no stock added yet.'),
                    actionLabel: auth.user?.permissions?.includes('manage-stock') ? t('Manage Stock') : undefined,
                    onAction: () => router.visit(route('product-service.stock.index')),
                })}
            </div>

            {(auth.user?.permissions?.includes('edit-warehouses') || auth.user?.permissions?.includes('delete-warehouses')) && (
                <div className="flex items-center justify-end gap-1 p-3 border-t bg-gray-50/50">
                    <TooltipProvider>
                        {auth.user?.permissions?.includes('edit-warehouses') && (
                            <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => openModal('edit', warehouse)} className="h-8 w-8 p-0 text-blue-600">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('Edit')}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {auth.user?.permissions?.includes('delete-warehouses') && (
                            <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            if ((warehouse.stock_quantity ?? 0) > 0 || (warehouse.product_count ?? 0) > 0) {
                                                setStockWarningTarget(warehouse);
                                            } else {
                                                openDeleteDialog(warehouse.id);
                                            }
                                        }}
                                        className="h-8 w-8 p-0 text-red-600"
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
            )}
        </Card>
    );

    return (
        <AuthenticatedLayout
            breadcrumbs={[{ label: t('Purchase') }, { label: t('Warehouses') }]}
            pageTitle={t('Manage Warehouses')}
            pageActions={
                <div className="flex gap-2">
                    <TooltipProvider>
                        {pageButtons.map((button) => (
                            <div key={button.id}>{button.component}</div>
                        ))}
                        {googleDriveBtn.map((button) => (
                            <div key={button.id}>{button.component}</div>
                        ))}
                        {oneDriveBtn.map((button) => (
                            <div key={button.id}>{button.component}</div>
                        ))}
                        {dropboxBtn.map((button) => (
                            <div key={button.id}>{button.component}</div>
                        ))}
                        {boxBtn.map((button) => (
                            <div key={button.id}>{button.component}</div>
                        ))}
                        {auth.user?.permissions?.includes('create-warehouses') && (
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
                    </TooltipProvider>
                </div>
            }
        >
            <Head title={t('Warehouses')} />

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                    { key: 'total', label: t('Total Warehouses'), count: stats?.total ?? 0, icon: WarehouseIcon, iconClass: 'text-blue-600 bg-blue-50' },
                    { key: 'active', label: t('Active'), count: stats?.active ?? 0, icon: CheckCircle2, iconClass: 'text-green-600 bg-green-50' },
                    { key: 'inactive', label: t('Inactive'), count: stats?.inactive ?? 0, icon: XCircle, iconClass: 'text-red-600 bg-red-50' },
                    { key: 'attention', label: t('Needs Attention'), count: needsAttentionCount, icon: AlertTriangle, iconClass: 'text-amber-600 bg-amber-50' },
                ].map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card key={card.key} className="border shadow-sm">
                            <CardContent className="p-3.5 flex items-center gap-3">
                                <div className={cn('p-2.5 rounded-xl shrink-0', card.iconClass)}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                                    <p className="text-sm font-bold text-gray-800">{card.count}</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Search */}
            <div className="mb-4">
                <SearchInput
                    value={filters.search}
                    onChange={(value) => setFilters({ search: value })}
                    onSearch={handleSearch}
                    placeholder={t('Search warehouses by name, city or address...')}
                />
            </div>

            {warehouses.length === 0 ? (
                <Card className="shadow-sm">
                    <NoRecordsFound
                        icon={WarehouseIcon}
                        title={t('No warehouses found')}
                        description={t('Get started by creating your first warehouse.')}
                        hasFilters={hasActiveFilters}
                        onClearFilters={clearFilters}
                        createPermission="create-warehouses"
                        onCreateClick={() => openModal('add')}
                        createButtonText={t('Create Warehouse')}
                    />
                </Card>
            ) : (
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <h3 className="text-sm font-semibold text-gray-800">{t('Active Warehouses')}</h3>
                            <Badge variant="outline" className="border-transparent !bg-green-100 !text-green-800">{activeWarehouses.length}</Badge>
                        </div>
                        {activeWarehouses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {activeWarehouses.map(renderCard)}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 py-4">{t('No active warehouses.')}</p>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <h3 className="text-sm font-semibold text-gray-500">{t('Inactive Warehouses')}</h3>
                            <Badge variant="outline" className="border-transparent !bg-red-100 !text-red-700">{inactiveWarehouses.length}</Badge>
                        </div>
                        {inactiveWarehouses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {inactiveWarehouses.map(renderCard)}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 py-4">{t('No inactive warehouses.')}</p>
                        )}
                    </div>
                </div>
            )}

            <Dialog open={modalState.isOpen} onOpenChange={closeModal}>
                {modalState.mode === 'add' && (
                    <Create onSuccess={closeModal} />
                )}
                {modalState.mode === 'edit' && modalState.data && (
                    <EditWarehouse
                        data={modalState.data}
                        warehouse={modalState.data}
                        onSuccess={closeModal}
                    />
                )}
            </Dialog>

            <ConfirmationDialog
                open={deleteState.isOpen}
                onOpenChange={closeDeleteDialog}
                title={t('Delete Warehouse')}
                message={deleteState.message}
                confirmText={t('Delete')}
                onConfirm={confirmDelete}
                isLoading={deleteState.isLoading}
                variant="destructive"
            />

            <ConfirmationDialog
                open={!!reactivateTarget}
                onOpenChange={(open) => !open && setReactivateTarget(null)}
                title={t('Reactivate Warehouse')}
                message={t('This will mark the warehouse as active again, making its stock visible across transfers and sales. Continue?')}
                confirmText={t('Reactivate')}
                isLoading={isReactivating}
                onConfirm={confirmReactivate}
            />

            <Dialog open={!!stockWarningTarget} onOpenChange={(open) => {
                if (!open) {
                    setStockWarningTarget(null);
                    setTargetWarehouseId('');
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t('Cannot Delete Warehouse')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Warning Box */}
                        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-800 text-sm">
                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                                {t('This warehouse contains active stock. To proceed with deletion, please transfer all remaining inventory to another warehouse.')}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-gray-50 border text-xs">
                            <div>
                                <span className="text-gray-500 font-medium block">{t('Total Products')}</span>
                                <span className="text-sm font-semibold text-gray-900">{stockWarningTarget?.product_count ?? 0}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 font-medium block">{t('Total Stock Units')}</span>
                                <span className="text-sm font-semibold text-gray-900">{stockWarningTarget?.stock_quantity ?? 0}</span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700">
                                {t('Transfer To Warehouse')} <span className="text-red-500">*</span>
                            </label>
                            <Select
                                value={targetWarehouseId}
                                onValueChange={setTargetWarehouseId}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('Select target warehouse')} />
                                </SelectTrigger>
                                <SelectContent searchable searchPlaceholder={t('Search warehouse...')}>
                                    {warehouses
                                        .filter((w) => w.id !== stockWarningTarget?.id && w.is_active)
                                        .map((w) => (
                                            <SelectItem key={w.id} value={String(w.id)}>
                                                {w.name} {w.city ? `(${w.city})` : ''}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>

                            {/* Information-Rich Minimal Target Warehouse Details Card */}
                            {(() => {
                                const selectedTarget = warehouses.find(w => String(w.id) === targetWarehouseId);
                                if (!selectedTarget) return null;
                                return (
                                    <div className="mt-2.5 p-3 rounded-lg border border-gray-200/80 bg-gray-50/70 dark:bg-gray-900/50 space-y-2 text-xs">
                                        {/* Header Row */}
                                        <div className="flex items-center justify-between pb-1 border-b border-gray-200/60 dark:border-gray-800 font-semibold text-gray-900 dark:text-gray-100">
                                            <span className="flex items-center gap-1.5">
                                                <WarehouseIcon className="h-3.5 w-3.5 text-gray-500" />
                                                {selectedTarget.name}
                                            </span>
                                            {selectedTarget.city && (
                                                <span className="text-[11px] font-normal text-gray-500 bg-gray-200/60 dark:bg-gray-800 px-2 py-0.5 rounded">
                                                    {selectedTarget.city}
                                                </span>
                                            )}
                                        </div>

                                        {/* Address Row */}
                                        {selectedTarget.address && (
                                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-[11px]">
                                                <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                <span className="truncate">{selectedTarget.address}</span>
                                            </div>
                                        )}

                                        {/* Grid Stats & Contact Info */}
                                        <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[11px] text-gray-600 dark:text-gray-400 pt-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <PackageSearch className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                <span>{t('Products')}: <strong className="text-gray-900 dark:text-gray-100">{selectedTarget.product_count ?? 0}</strong></span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Boxes className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                <span>{t('Stock')}: <strong className="text-gray-900 dark:text-gray-100">{selectedTarget.stock_quantity ?? 0}</strong></span>
                                            </div>
                                            {selectedTarget.phone && (
                                                <div className="flex items-center gap-1.5">
                                                    <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                    <span className="truncate">{selectedTarget.phone}</span>
                                                </div>
                                            )}
                                            {selectedTarget.email && (
                                                <div className="flex items-center gap-1.5">
                                                    <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                    <span className="truncate">{selectedTarget.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isTransferring}
                                onClick={() => {
                                    setStockWarningTarget(null);
                                    setTargetWarehouseId('');
                                }}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="button"
                                disabled={!targetWarehouseId || isTransferring}
                                onClick={() => {
                                    if (!stockWarningTarget || !targetWarehouseId || isTransferring) return;
                                    const fromId = stockWarningTarget.id;
                                    const toId = targetWarehouseId;
                                    setIsTransferring(true);
                                    router.post(route('warehouses.transfer', fromId), {
                                        target_warehouse_id: toId,
                                    }, {
                                        onSuccess: () => {
                                            setStockWarningTarget(null);
                                            setTargetWarehouseId('');
                                        },
                                        onFinish: () => {
                                            setIsTransferring(false);
                                        }
                                    });
                                }}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-medium gap-2"
                            >
                                {isTransferring && <Loader2 className="h-4 w-4 animate-spin" />}
                                {isTransferring ? t('Transferring...') : t('Transfer Stock')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}

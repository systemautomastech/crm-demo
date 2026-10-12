import { useState, useEffect } from 'react';
import { router, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PreviewModal from '@/pages/Proposal/components/Preview/PreviewModal';
import { cn } from '@/lib/utils';
import { Eye, Pencil, Plus, Search, FileText, Trash2, CheckCircle2, XCircle, Loader2, Info, Lock, Package, CalendarClock, GripVertical, Save, RotateCcw, } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface ProposalPageItem {
    id: number;
    title: string;
    content: string;
    page_type: string;
    background_image?: string;
    sort_order: number;
    is_active: boolean;
    creator_id?: number;
    created_by?: number;
    can_manage?: boolean;
    creator_user?: {
        id: number;
        name: string;
        email: string;
    };
}

interface PagesIndexProps {
    settings?: { template_color?: string; background_image?: string;[key: string]: any } | null;
    pages: ProposalPageItem[];
}

export default function Index({ settings, pages = [] }: PagesIndexProps) {
    const { t } = useTranslation();
    const pageProps = usePage<any>().props;

    const [items, setItems] = useState<ProposalPageItem[]>(pages);
    const [searchQuery, setSearchQuery] = useState('');
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [viewingPage, setViewingPage] = useState<ProposalPageItem | null>(null);
    const [deletingPage, setDeletingPage] = useState<ProposalPageItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);

    // Drag-and-drop & Reordering states
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [hasOrderChanged, setHasOrderChanged] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    // Sync when server props change (unless user has unsaved drag changes)
    useEffect(() => {
        if (!hasOrderChanged) {
            setItems(pages);
        }
    }, [pages, hasOrderChanged]);

    const filteredPages = items.filter(
        (page) =>
            page.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Drag Handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        if (searchQuery.trim() !== '') return; // Disable drag during search to prevent index confusion
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (searchQuery.trim() !== '' || draggedIndex === null || draggedIndex === targetIndex) return;

        const updated = [...items];
        const [moved] = updated.splice(draggedIndex, 1);
        updated.splice(targetIndex, 0, moved);

        // Update local sort_order sequentially
        const reordered = updated.map((item, idx) => ({
            ...item,
            sort_order: idx + 1,
        }));

        setDraggedIndex(targetIndex);
        setItems(reordered);
        setHasOrderChanged(true);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    // Save Reordered Sort Orders
    const handleSaveOrder = async () => {
        setIsSavingOrder(true);
        try {
            const orders = items.map((item, idx) => ({
                id: item.id,
                sort_order: idx + 1,
            }));

            const response = await axios.post(route('proposal-setup.pages.reorder'), { orders });

            if (response.data.success) {
                toast.success(t('Page order saved successfully.'));
                setHasOrderChanged(false);
                router.reload({ only: ['pages'] });
            } else {
                toast.error(response.data.message || t('Failed to save order.'));
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || t('Failed to save order.'));
        } finally {
            setIsSavingOrder(false);
        }
    };

    // Discard Reorder Changes
    const handleDiscardOrder = () => {
        setItems(pages);
        setHasOrderChanged(false);
        toast.info(t('Order changes discarded.'));
    };

    const openDeleteModal = (page: ProposalPageItem) => {
        if (page.page_type === 'otc' || page.page_type === 'mrc') {
            toast.error(t('Fixed pages cannot be deleted.'));
            return;
        }
        setDeletingPage(page);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!deletingPage) return;
        setIsDeleting(true);
        router.delete(route('proposal-setup.pages.destroy', deletingPage.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Page deleted successfully.'));
                setIsDeleteModalOpen(false);
                setDeletingPage(null);
            },
            onError: () => {
                toast.error(t('Failed to delete page.'));
            },
            onFinish: () => {
                setIsDeleting(false);
            }
        });
    };

    const handleToggleStatus = (page: ProposalPageItem, checked: boolean) => {
        if (page.page_type === 'otc' || page.page_type === 'mrc') {
            toast.error(t('Fixed pages cannot be deactivated.'));
            return;
        }

        setTogglingId(page.id);
        router.put(route('proposal-setup.pages.update', page.id), {
            title: page.title,
            is_active: checked,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(checked ? t('Page activated.') : t('Page deactivated.'));
            },
            onError: () => {
                toast.error(t('Failed to update page status.'));
            },
            onFinish: () => {
                setTogglingId(null);
            }
        });
    };

    const handleViewPage = (page: ProposalPageItem) => {
        if (page.page_type === 'otc' || page.page_type === 'mrc') {
            return;
        }
        setViewingPage(page);
        setIsViewModalOpen(true);
    };

    return (
        <TooltipProvider delayDuration={150}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold tracking-tight">{t('Proposal Pages')}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {t('Drag cards using the handle to easily sort pages in your desired page sequence.')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Save Changes Floating / Top Button */}
                        {hasOrderChanged && (
                            <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-3 duration-200">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDiscardOrder}
                                    disabled={isSavingOrder}
                                    className="gap-1.5 text-xs text-muted-foreground"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    {t('Discard')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    onClick={handleSaveOrder}
                                    disabled={isSavingOrder}
                                    className="gap-1.5 text-xs shadow-xs font-semibold"
                                >
                                    {isSavingOrder ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Save className="h-3.5 w-3.5" />
                                    )}
                                    {t('Save Order')}
                                </Button>
                            </div>
                        )}

                        <Button asChild size="sm" className="gap-2 shadow-xs">
                            <Link href={route('proposal-setup.pages.create')}>
                                <Plus className="h-4 w-4" />
                                {t('Add New Page')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('Search pages by title...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background shadow-xs"
                    />
                </div>

                {/* Pages Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {filteredPages.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card shadow-xs">
                            <div className="p-3 bg-muted/60 rounded-full mb-3">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h4 className="font-semibold text-sm text-foreground">{t('No proposal pages found')}</h4>
                            <p className="text-xs text-muted-foreground max-w-sm mt-1">
                                {searchQuery ? t('No pages match your search criteria. Try a different search term.') : t('Get started by creating your first proposal page template.')}
                            </p>
                            {searchQuery ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSearchQuery('')}
                                    className="mt-4"
                                >
                                    {t('Clear Search')}
                                </Button>
                            ) : (
                                <Button asChild size="sm" className="mt-4 gap-2">
                                    <Link href={route('proposal-setup.pages.create')}>
                                        <Plus className="h-4 w-4" />
                                        {t('Create First Page')}
                                    </Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        filteredPages.map((page, index) => {
                            const isFixedPage = page.page_type === 'otc' || page.page_type === 'mrc';
                            const isCompanyPage = page.created_by !== undefined && page.creator_id !== undefined && page.created_by === page.creator_id;
                            const canManagePage = page.can_manage !== undefined
                                ? page.can_manage
                                : (page.created_by === undefined || (pageProps.auth?.user?.id ? (page.created_by === pageProps.auth.user.id || pageProps.auth.user.id === page.creator_id) : true));

                            return (
                                <div
                                    key={page.id}
                                    draggable={canManagePage && !searchQuery}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={cn(
                                        "group relative flex flex-col justify-between p-4 sm:p-4.5 min-h-[105px] rounded-xl border transition-all duration-200 hover:shadow-xs select-none",
                                        draggedIndex === index
                                            ? "opacity-35 border-dashed border-primary ring-2 ring-primary/20 scale-[0.98]"
                                            : isFixedPage
                                                ? "bg-amber-500/[0.02] border-amber-500/25 hover:border-amber-500/40"
                                                : "bg-card border-border/70 hover:border-primary/40 hover:bg-muted/10"
                                    )}
                                >
                                    {/* Top Row: Drag Handle, Sort Order Badge, Title & Status */}
                                    <div className="flex items-start justify-between gap-2.5 min-w-0">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            {/* Drag Handle */}
                                            {canManagePage && (
                                                <div
                                                    className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/60 hover:text-foreground shrink-0 rounded transition-colors"
                                                    title={t('Drag to reorder')}
                                                >
                                                    <GripVertical className="h-4 w-4" />
                                                </div>
                                            )}

                                            {/* Sleek Order Badge */}
                                            <span
                                                className={cn(
                                                    "inline-flex items-center justify-center text-xs font-mono font-semibold tracking-tight select-none shrink-0 px-1.5 py-0.5 rounded-md transition-colors",
                                                    isFixedPage
                                                        ? "text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                                        : "text-muted-foreground group-hover:text-primary bg-muted/60"
                                                )}
                                                title={t('Sort Order: {{order}}', { order: page.sort_order })}
                                            >
                                                {String(page.sort_order).padStart(2, '0')}
                                            </span>

                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-sm truncate text-foreground leading-snug tracking-tight" title={page.title}>
                                                    {page.title}
                                                </h4>
                                            </div>
                                        </div>

                                        {/* Status Switch */}
                                        <div className="shrink-0 flex items-center">
                                            {togglingId === page.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            ) : (
                                                <Switch
                                                    checked={page.is_active}
                                                    disabled={!canManagePage || isFixedPage}
                                                    onCheckedChange={(checked) => handleToggleStatus(page, checked)}
                                                    className={cn(
                                                        "scale-90 transition-all",
                                                        (canManagePage && !isFixedPage) ? "hover:opacity-90" : "opacity-50 cursor-not-allowed"
                                                    )}
                                                    title={isFixedPage ? t('Fixed pages cannot be deactivated') : (!canManagePage ? t('Only company admin can change status') : (page.is_active ? t('Deactivate Page') : t('Activate Page')))}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Bottom Row: Minimal Action Buttons */}
                                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50 text-xs">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {/* Fixed / System Badge */}
                                            {isFixedPage ? (
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                                                    <Lock className="h-2.5 w-2.5" />
                                                    {t('Fixed Page')}
                                                </span>
                                            ) : isCompanyPage ? (
                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                                                    {t('Company Default')}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60 shrink-0">
                                                    {t('Custom Page')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {/* Info Button for Fixed Pages */}
                                            {isFixedPage && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-500/10"
                                                        >
                                                            <Info className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-xs text-xs p-2.5 bg-popover text-popover-foreground border shadow-lg">
                                                        <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1">
                                                            {page.page_type === 'otc' ? t('One-Time Charges (OTC)') : t('Monthly Recurring Charges (MRC)')}
                                                        </p>
                                                        <p className="leading-relaxed text-muted-foreground">
                                                            {t('Fixed dynamic page. Automatically generated on the proposal page when items are added. You can configure its sorting order here.')}
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}

                                            {/* Preview Button (For non-fixed pages) */}
                                            {!isFixedPage && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                    onClick={() => handleViewPage(page)}
                                                    title={t('Preview Page')}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                            )}

                                            {/* Edit Button */}
                                            {canManagePage && (
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                    title={isFixedPage ? t('Edit Sort Order') : t('Edit Page')}
                                                >
                                                    <Link href={route('proposal-setup.pages.edit', page.id)}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Link>
                                                </Button>
                                            )}

                                            {/* Delete Button (Hidden for fixed pages) */}
                                            {!isFixedPage && canManagePage && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => openDeleteModal(page)}
                                                    title={t('Delete Page')}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Reusable Proposal Preview Modal */}
                <PreviewModal
                    open={isViewModalOpen}
                    onOpenChange={setIsViewModalOpen}
                    title={viewingPage?.title}
                    pageTitle={viewingPage?.title}
                    content={viewingPage?.content}
                    backgroundImage={viewingPage?.background_image}
                    settings={settings}
                    isPageSetup={true}
                    showPrintButton={false}
                />

                {/* Standard Delete Confirmation Modal */}
                <ConfirmationDialog
                    open={isDeleteModalOpen}
                    onOpenChange={setIsDeleteModalOpen}
                    title={t('Delete Proposal Page')}
                    message={deletingPage ? `${t('Are you sure you want to delete')} "${deletingPage.title}"? ${t('This action cannot be undone.')}` : t('Are you sure you want to delete this page?')}
                    confirmText={t('Delete')}
                    onConfirm={handleConfirmDelete}
                    isLoading={isDeleting}
                    variant="destructive"
                />
            </div>
        </TooltipProvider>
    );
}
import { useState, useMemo } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { useDeleteHandler } from '@/hooks/useDeleteHandler';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Edit as EditIcon, Trash2, Eye, Users as UsersIcon, MoreVertical, Calendar, Kanban, List, ShoppingCart, Globe, CheckSquare, Upload, Phone } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FilterButton } from '@/components/ui/filter-button';
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { PerPageSelector } from '@/components/ui/per-page-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import KanbanBoard from '@/components/kanban-board';
import Create from './Create';
import EditLead from './Edit';
import View from './View';
import LabelView from './LabelView';
import ConvertToDeal from './Show/ConvertToDeal';
import NoRecordsFound from '@/components/no-records-found';
import { Lead, LeadsIndexProps, LeadFilters, LeadModalState } from './types';
import { formatDate, formatDateTime, getImagePath, formatTimeFromDate } from '@/utils/helpers';
import { usePageButtons } from '@/hooks/usePageButtons';
import { DateRangePicker } from '@/components/ui/date-range-picker';

export default function Index() {
    const { t } = useTranslation();
    const { leads, auth, users, pipelines, stages, labels, sources, subjects, products, currentPipelineId, pbxModuleActive } = usePage<LeadsIndexProps>().props;
    const urlParams = new URLSearchParams(window.location.search);

    const [filters, setFilters] = useState<LeadFilters>({
        name: urlParams.get('name') || '',
        phone: urlParams.get('phone') || '',
        email: urlParams.get('email') || '',
        subject: urlParams.get('subject') || '',
        is_active: urlParams.get('is_active') || '',
        user_id: urlParams.get('user_id') || '',
        pipeline_id: urlParams.get('pipeline_id') || '',
        stage_id: urlParams.get('stage_id') || '',
        date_range: (() => {
            const fromDate = urlParams.get('date_from');
            const toDate = urlParams.get('date_to');
            return (fromDate && toDate) ? `${fromDate} - ${toDate}` : '';
        })(),
        created_at_range: (() => {
            const fromDate = urlParams.get('created_from');
            const toDate = urlParams.get('created_to');
            return (fromDate && toDate) ? `${fromDate} - ${toDate}` : '';
        })(),
    });

    const [perPage] = useState(urlParams.get('per_page') || '10');
    const [sortField, setSortField] = useState(urlParams.get('sort') || '');
    const [sortDirection, setSortDirection] = useState(urlParams.get('direction') || 'asc');
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>(urlParams.get('view') as 'list' | 'kanban' || 'list');
    const [modalState, setModalState] = useState<LeadModalState>({
        isOpen: false,
        mode: '',
        data: null
    });
    const [viewingItem, setViewingItem] = useState<Lead | null>(null);
    const [labelingItem, setLabelingItem] = useState<Lead | null>(null);

    const [topPipeline, setTopPipeline] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    const filterStages = useMemo(() => {
        if (!filters.pipeline_id) return [];
        return stages?.filter((item: any) => item.pipeline_id?.toString() === filters.pipeline_id) || [];
    }, [stages, filters.pipeline_id]);

    const googleDriveButtons = usePageButtons('googleDriveBtn', { module: 'Lead', settingKey: 'GoogleDrive Lead' });
    const oneDriveButtons = usePageButtons('oneDriveBtn', { module: 'Lead', settingKey: 'OneDrive Lead' });
    const dropboxBtn = usePageButtons('dropboxBtn', { module: 'Lead', settingKey: 'Dropbox Lead' });
    const boxBtn = usePageButtons('boxBtn', { module: 'Lead', settingKey: 'Box Lead' });


    useFlashMessages();

    const { deleteState, openDeleteDialog, closeDeleteDialog, confirmDelete } = useDeleteHandler({
        routeName: 'lead.leads.destroy',
        defaultMessage: t('Are you sure you want to delete this lead?')
    });

    const handleFilter = () => {
        const filterParams: any = {
            ...filters,
            per_page: perPage,
            sort: sortField,
            direction: sortDirection,
            view: viewMode
        };
        if (filters.date_range) {
            const [fromDate, toDate] = filters.date_range.split(' - ');
            filterParams.date_from = fromDate;
            filterParams.date_to = toDate;
        }
        delete filterParams.date_range;
        if (filters.created_at_range) {
            const [fromDate, toDate] = filters.created_at_range.split(' - ');
            filterParams.created_from = fromDate;
            filterParams.created_to = toDate;
        }
        delete filterParams.created_at_range;
        router.get(route('lead.leads.index'), filterParams, {
            preserveState: true,
            replace: true
        });
    };

    const handleSort = (field: string) => {
        const direction = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortField(field);
        setSortDirection(direction);
        router.get(route('lead.leads.index'), { ...filters, per_page: perPage, sort: field, direction, view: viewMode }, {
            preserveState: true,
            replace: true
        });
    };

    const clearFilters = () => {
        setFilters({
            name: '',
            phone: '',
            email: '',
            subject: '',
            is_active: '',
            user_id: '',
            pipeline_id: '',
            stage_id: '',
            date_range: '',
            created_at_range: '',
        });
        router.get(route('lead.leads.index'), { per_page: perPage, view: viewMode });
    };

    const openModal = async (mode: 'add' | 'edit', data: Lead | null = null) => {
        if (mode === 'edit' && data) {
            try {
                const response = await fetch(route('lead.leads.edit', data.id));
                const editData = await response.json();
                setModalState({ isOpen: true, mode, data: editData });
            } catch (error) {
                setModalState({ isOpen: true, mode, data });
            }
        } else {
            setModalState({ isOpen: true, mode, data });
        }
    };

    const closeModal = () => {
        setModalState({ isOpen: false, mode: '', data: null });
    };

    const handleMove = (leadId: number, fromStage: string, toStage: string) => {
        router.post(route('lead.leads.order'), {
            lead_id: leadId,
            stage_id: toStage,
            order: [leadId]
        }, {
            preserveState: true,
            onSuccess: () => {
                router.reload({ only: ['leads'] });
            }
        });
    };

    const stageColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'];

    const getStageColor = (stageId: number | string) => {
        const index = stages?.findIndex(s => s.id.toString() === stageId?.toString()) ?? -1;
        return index >= 0 ? stageColors[index % stageColors.length] : '#6b7280';
    };

    const getKanbanData = () => {
        const colors = stageColors;

        // Filter stages by pipeline if selected
        const filteredStages = filters.pipeline_id && filters.pipeline_id !== ''
            ? stages?.filter(stage => stage.pipeline_id?.toString() === filters.pipeline_id) || []
            : stages || [];

        const columns = filteredStages.map((stage, index) => ({
            id: stage.id.toString(),
            title: stage.name,
            color: colors[index % colors.length]
        }));

        const tasksByStage = {};
        columns.forEach(col => {
            tasksByStage[col.id] = [];
        });

        const filteredLeads = leads?.data?.filter(lead => {
            let isValid = true;

            if (filters.user_id && filters.user_id !== '') {
                isValid = isValid && lead.user_leads?.some(userLead => userLead.user.id.toString() === filters.user_id);
            }

            if (filters.pipeline_id && filters.pipeline_id !== '') {
                isValid = isValid && lead.pipeline_id?.toString() === filters.pipeline_id;
            }

            return isValid;
        }) || [];

        filteredLeads.forEach(lead => {
            const stageId = lead.stage_id?.toString();
            if (stageId && tasksByStage[stageId]) {
                tasksByStage[stageId].push({
                    id: lead.id,
                    title: lead.name,
                    description: lead.subject,
                    status: stageId,
                    due_date: lead.date,
                    assigned_to: lead.user_leads?.[0]?.user || null,
                    priority: null,
                    lead: lead
                });
            }
        });

        return { columns, tasks: tasksByStage };
    };
    const getFollowUpStatus = (value?: string | null) => {
        if (!value) {
            return { label: '-', className: 'text-muted-foreground', title: '' };
        }

        const followUpDate = new Date(value);
        if (Number.isNaN(followUpDate.getTime())) {
            return { label: formatDate(value), className: 'text-muted-foreground', title: formatDateTime(value) || formatDate(value) };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        followUpDate.setHours(0, 0, 0, 0);

        const differenceInDays = Math.round(
            (followUpDate.getTime() - today.getTime()) / 86400000
        );

        if (differenceInDays < 0) {
            return {
                label: `${t('Overdue')} ${Math.abs(differenceInDays)}${t('d')}`,
                className: 'bg-red-50 text-red-700 border-red-200',
                title: formatDateTime(value),
            };
        }

        if (differenceInDays === 0) {
            return {
                label: t('Today'),
                className: 'bg-amber-50 text-amber-700 border-amber-200',
                title: formatDateTime(value),
            };
        }

        if (differenceInDays === 1) {
            return {
                label: t('Tomorrow'),
                className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                title: formatDateTime(value),
            };
        }

        return {
            label: formatDate(value),
            className: 'bg-muted text-muted-foreground border-border',
            title: formatDateTime(value),
        };
    };

    const LeadCard = ({ task }: { task: any }) => {
        const lead = task.lead;
        const isOverdue = task.due_date && new Date(task.due_date) < new Date();

        const handleDragStart = (e: React.DragEvent) => {
            e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, fromStatus: task.status }));
            e.dataTransfer.effectAllowed = 'move';
        };

        return (
            <div
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-2 hover:shadow-md transition-all cursor-move select-none group"
                draggable={true}
                onDragStart={handleDragStart}
            >
                <div className="flex items-start justify-between mb-2">
                    <h4
                        className="font-medium text-sm text-gray-900 leading-tight pr-2 cursor-pointer hover:text-primary hover:underline"
                        onClick={(e) => {
                            e.stopPropagation();
                            router.get(route('lead.leads.show', lead.id));
                        }}
                    >
                        {task.title}
                    </h4>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                                <MoreVertical className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {auth.user?.permissions?.includes('view-leads') && (
                                <DropdownMenuItem onClick={() => router.get(route('lead.leads.show', lead.id))}>
                                    <Eye className="h-3 w-3 mr-2" />
                                    {t('View')}
                                </DropdownMenuItem>
                            )}
                            {auth.user?.permissions?.includes('edit-leads') && (
                                <DropdownMenuItem onClick={() => openModal('edit', lead)}>
                                    <EditIcon className="h-3 w-3 mr-2" />
                                    {t('Edit')}
                                </DropdownMenuItem>
                            )}
                            {auth.user?.permissions?.includes('delete-leads') && (
                                <DropdownMenuItem onClick={() => openDeleteDialog(lead.id)} className="text-red-600 hover:!text-red-600 focus:text-red-600">
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    {t('Delete')}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {task.description && (
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                )}

                <div className="flex items-center justify-between mb-3">
                    <Tooltip>
                        <TooltipTrigger>
                            <div className={`flex items-center space-x-1 text-sm font-medium px-2 py-1 rounded ${lead.tasks_count > 0 && lead.complete_tasks_count === lead.tasks_count ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50'
                                }`}>
                                <CheckSquare className="h-3 w-3" />
                                <span>{lead.complete_tasks_count || 0}/{lead.tasks_count || 0}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t('Tasks')}</p>
                        </TooltipContent>
                    </Tooltip>

                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger>
                                <div className="flex items-center space-x-1 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                                    <ShoppingCart className="h-3 w-3" />
                                    <span>{lead.products ? lead.products.split(',').filter(id => id.trim()).length : 0}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div>
                                    <p className="font-medium">{t('Products')}</p>
                                    {(() => {
                                        const productIds = lead.products ? lead.products.split(',').filter(id => id.trim()) : [];
                                        return productIds.length > 0 ? productIds.map((productId: string, index: number) => {
                                            const product = products?.find((p: any) => p.id.toString() === String(productId).trim());
                                            return <p key={index} className="text-sm">{product?.name || `Product ${productId}`}</p>;
                                        }) : '';
                                    })()}
                                </div>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger>
                                <div className="flex items-center space-x-1 text-xs text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded">
                                    <Globe className="h-3 w-3" />
                                    <span>{lead.sources ? lead.sources.split(',').filter(id => id.trim()).length : 0}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div>
                                    <p className="font-medium">{t('Sources')}</p>
                                    {(() => {
                                        const sourceIds = lead.sources ? lead.sources.split(',').filter(id => id.trim()) : [];
                                        return sourceIds.length > 0 ? sourceIds.map((sourceId: string, index: number) => {
                                            const source = sources?.find((s: any) => s.id.toString() === sourceId.trim());
                                            return <p key={index} className="text-sm">{source?.name || `Source ${sourceId}`}</p>;
                                        }) : '';
                                    })()}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                        <TooltipProvider>
                            {lead.user_leads?.length > 0 ? lead.user_leads.slice(0, 3).map((userLead: any, index: number) => (
                                <Tooltip key={userLead.user.id}>
                                    <TooltipTrigger>
                                        <div className="h-8 w-8 rounded-full border-2 border-background overflow-hidden">
                                            {userLead.user.avatar ? (
                                                <img
                                                    src={getImagePath(userLead.user.avatar)}
                                                    alt={userLead.user.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-full w-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                                    {userLead.user.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{userLead.user.name}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )) : (
                                <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-background flex items-center justify-center text-sm font-medium">
                                    -
                                </div>
                            )}
                            {lead.user_leads?.length > 3 && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-background flex items-center justify-center text-xs font-medium">
                                            +{lead.user_leads.length - 3}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div className="space-y-1">
                                            {lead.user_leads.slice(3).map((userLead: any, index: number) => (
                                                <p key={userLead.user.id}>{userLead.user.name}</p>
                                            ))}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </TooltipProvider>
                    </div>

                    {task.due_date && (
                        <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            <Calendar className="h-3 w-3" />
                            <span>{formatDateTime(task.due_date)}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const handleDialerCall = (lead: Lead) => {
        let phone = lead.phone?.toString().trim();

        if (phone) {
            phone = phone.replace(/\D/g, '');

            if (phone.length === 10 && phone.startsWith('1')) {
                phone = `0${phone}`;
            }
        }

        if (!phone) {
            window.alert(t('No phone number available for this lead.'));
            return;
        }

        if (!pbxModuleActive) {
            window.alert(t('PBX is not available for this workspace.'));
            return;
        }

        const dialerCaller = (window as Window & typeof globalThis & {
            CTI_PHONE_CALL?: (
                number: string,
                context?: {
                    module?: string;
                    record_id?: number | string;
                }
            ) => void;
        }).CTI_PHONE_CALL;

        if (typeof dialerCaller === 'function') {
            dialerCaller(phone, {
                module: 'Lead',
                record_id: lead.id,
            });
            return;
        }

        window.dispatchEvent(
            new CustomEvent('cti:make-call', {
                detail: { number: phone },
            })
        );
    };

    const tableColumns = [
        {
            key: 'name',
            header: t('Name'),
            sortable: true
        },
        {
            key: 'phone',
            header: t('Phone'),
            sortable: false,
            render: (_: any, row: Lead) => {
                const phone = row.phone;
                if (!phone) return <span className="text-muted-foreground text-xs">-</span>;
                return (
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                className="text-xs text-foreground hover:text-primary cursor-pointer transition-colors"
                                onClick={() => navigator.clipboard.writeText(phone)}
                            >
                                {phone}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t('Click to copy')}</p>
                        </TooltipContent>
                    </Tooltip>
                );
            }
        },
        {
            key: 'subject',
            header: t('Subject'),
            sortable: false,
            render: (_: any, row: Lead) => {
                const subject = row.subject || '-';
                return (
                    <div className="text-xs leading-tight space-y-0.5">
                        <div className="text-foreground font-medium">{subject}</div>
                        {row.organization_type && (
                            <div className="text-[11px] text-muted-foreground">{row.organization_type}</div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'users',
            header: t('Users'),
            sortable: false,
            render: (_: any, lead: Lead) => {
                const userLeads = lead.user_leads || [];
                const assignedUsers = userLeads.length > 0
                    ? userLeads.map((ul: any) => ul.user).filter(Boolean)
                    : (lead.user ? [lead.user] : []);

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
            key: 'created_at',
            header: t('Created'),
            sortable: true,
            render: (value: string) => {
                if (!value) return <span className="text-muted-foreground text-xs">-</span>;
                return (
                    <div className="text-xs leading-tight">
                        <div className="text-foreground">{formatDate(value)}</div>
                        <div className="text-muted-foreground">{formatTimeFromDate(value)}</div>
                    </div>
                );
            }
        },
        {
            key: 'stage',
            header: t('Stage'),
            sortable: false,
            render: (value: any, row: any) => {
                const stageName = row.stage?.name || stages?.find(item => item.id.toString() === row.stage_id?.toString())?.name;
                const color = getStageColor(row.stage_id);
                return (
                    <span className="inline-block max-w-[100px] truncate px-1.5 py-0.5 text-xs font-medium rounded" style={{ backgroundColor: `${color}20`, color }} title={stageName || 'No Stage'}>
                        {stageName || 'No Stage'}
                    </span>
                );
            }
        },
        {
            key: 'date',
            header: t('Follow Up'),
            sortable: true,
            render: (value: string, row: any) => {
                const stage = row.stage || stages?.find((item: any) => item.id?.toString() === row.stage_id?.toString());
                const isFinalAccepted = !!stage?.is_final_accepted;
                const isFinalRejected = !!stage?.is_final_rejected;

                if (!value) return <span className="text-muted-foreground text-xs">-</span>;

                if (isFinalRejected) {
                    return (
                        <span
                            className="inline-flex items-center max-w-[90px] truncate rounded-full border px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500 opacity-60"
                            title={`${t('Rejected')} — ${formatDate(value)}`}
                        >
                            <span className="truncate line-through">{formatDate(value)}</span>
                        </span>
                    );
                }

                if (isFinalAccepted) {
                    return (
                        <span
                            className="inline-flex items-center max-w-[90px] truncate rounded-full border px-1.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                            title={formatDateTime(value) || formatDate(value)}
                        >
                            <span className="truncate">{formatDate(value)}</span>
                        </span>
                    );
                }

                const followUp = getFollowUpStatus(value);
                return (
                    <span
                        className={`inline-flex items-center max-w-[90px] rounded-full border px-1.5 py-0.5 text-xs font-semibold ${followUp.className}`}
                        title={followUp.title || formatDate(value)}
                    >
                        <span className="truncate">{followUp.label}</span>
                    </span>
                );
            },
        },

        {
            key: 'note',
            header: t('Note'),
            sortable: false,
            render: (value: any, row: any) => {
                const note = row.notes
                    ? row.notes
                        .replace(/<[^>]*>/g, ' ')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()
                    : '';

                const shortNote = note
                    ? note.split(' ').slice(0, 12).join(' ') + (note.split(' ').length > 12 ? '...' : '')
                    : '';

                return (
                    <span
                        className="block max-w-[250px] text-xs text-gray-600 line-clamp-2"
                        title={note}
                    >
                        {shortNote || '-'}
                    </span>
                );
            }
        },
        ...(auth.user?.permissions?.some((p: string) => ['view-leads', 'edit-leads', 'delete-leads'].includes(p)) ? [{
            key: 'actions',
            header: t('Actions'),
            render: (_: any, lead: Lead) => (
                <div className="flex gap-1">
                    <TooltipProvider>

                        {auth.user?.permissions?.includes('use dialer') && pbxModuleActive && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => void handleDialerCall(lead)} className="h-8 w-8 p-0 text-green-600 hover:text-green-700">
                                        <Phone className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('Click to Call')}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}

                        {auth.user?.permissions?.includes('edit-leads') && (
                            <ConvertToDeal
                                lead={lead}
                                deal={lead.is_converted ? { id: lead.is_converted, is_active: true } : undefined}
                                buttonVariant="ghost"
                                buttonClassName={lead.is_converted ? "h-8 w-8 p-0 text-gray-400 hover:text-gray-500" : "h-8 w-8 p-0 text-yellow-600 hover:text-yellow-700"}
                            />
                        )}

                        {/* {auth.user?.permissions?.includes('edit-leads') && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => setLabelingItem(lead)} className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700">
                                        <Tag className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('Label')}</p>
                                </TooltipContent>
                            </Tooltip>
                        )} */}
                        {auth.user?.permissions?.includes('view-leads') && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => router.get(route('lead.leads.show', lead.id))} className="h-8 w-8 p-0 text-green-600 hover:text-green-700">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('View')}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {auth.user?.permissions?.includes('edit-leads') && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => openModal('edit', lead)} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700">
                                        <EditIcon className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('Edit')}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {auth.user?.permissions?.includes('delete-leads') && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openDeleteDialog(lead.id)}
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
            breadcrumbs={[
                { label: t('CRM'), url: route('lead.index') },
                { label: t('Leads') }
            ]}
            pageTitle={t('Manage Leads')}
            pageActions={
                <div className="flex items-center gap-2">
                    <TooltipProvider>
                        <Select value={topPipeline} onValueChange={(value) => {
                            const pipelineId = value === 'all' ? '' : value;
                            setTopPipeline(value);

                            // Save default pipeline to user table
                            if (pipelineId) {
                                fetch(route('lead.leads.save-default-pipeline'), {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                                    },
                                    body: JSON.stringify({ pipeline_id: pipelineId })
                                });
                            }

                            setFilters(prev => ({ ...prev, pipeline_id: pipelineId, stage_id: '' }));
                            router.get(route('lead.leads.index'), { ...filters, pipeline_id: pipelineId, stage_id: '', per_page: perPage, sort: sortField, direction: sortDirection, view: viewMode }, {
                                preserveState: true,
                                replace: true
                            });
                        }}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder={t('Select Pipeline')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All Pipelines')}</SelectItem>
                                {pipelines?.map((pipeline: any) => (
                                    <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                                        {pipeline.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>



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
                        {auth.user?.permissions?.includes('view-leads') && (
                            <>
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}>
                                            {viewMode === 'kanban' ? <List className="h-4 w-4" /> : <Kanban className="h-4 w-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{viewMode === 'kanban' ? t('List View') : t('Kanban View')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </>
                        )}
                        {auth.user?.permissions?.includes('create-leads') && (
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            router.get(route('lead.leads.import.index'))
                                        }
                                    >
                                        <Upload className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>

                                <TooltipContent>
                                    <p>{t('Bulk Import')}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {auth.user?.permissions?.includes('create-leads') && (
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
            <Head title={t('Leads')} />

            {viewMode === 'kanban' ? (
                (() => {
                    const { columns, tasks } = getKanbanData();
                    return (
                        <KanbanBoard
                            tasks={tasks}
                            columns={columns}
                            onMove={handleMove}
                            taskCard={LeadCard}
                            kanbanActions={null}
                        />
                    );
                })()
            ) : (
                <Card className="shadow-sm">
                    <CardContent className="p-6 border-b bg-gray-50/50">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 max-w-md">
                                <SearchInput
                                    value={filters.name}
                                    onChange={(value) => setFilters({ ...filters, name: value })}
                                    onSearch={handleFilter}
                                    placeholder={t('Search by name, phone, email or subject...')}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <PerPageSelector
                                    routeName="lead.leads.index"
                                    filters={{ ...filters, view: viewMode }}
                                />
                                <div className="relative">
                                    <FilterButton
                                        showFilters={showFilters}
                                        onToggle={() => setShowFilters(!showFilters)}
                                    />
                                    {(() => {
                                        const activeFilters = [filters.is_active, filters.user_id, filters.pipeline_id, filters.stage_id, filters.date_range, filters.created_at_range].filter(f => f !== '' && f !== null && f !== undefined).length;
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
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('User')}</label>
                                    <Select value={filters.user_id} onValueChange={(value) => setFilters({ ...filters, user_id: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Filter by User')} />
                                        </SelectTrigger>
                                        <SelectContent searchable>
                                            {users?.map((item: any) => (
                                                <SelectItem key={item.id} value={item.id.toString()}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Pipeline')}</label>
                                    <Select
                                        value={filters.pipeline_id}
                                        onValueChange={(value) => {
                                            const pipelineId = value === 'all' ? '' : value;
                                            setFilters(prev => ({ ...prev, pipeline_id: pipelineId, stage_id: '' }));
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Filter by Pipeline')} />
                                        </SelectTrigger>
                                        <SelectContent searchable>
                                            <SelectItem value="all">{t('All Pipelines')}</SelectItem>
                                            {pipelines?.map((item: any) => (
                                                <SelectItem key={item.id} value={item.id.toString()}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Stage')}</label>
                                    <Select
                                        value={filters.stage_id}
                                        onValueChange={(value) => setFilters({ ...filters, stage_id: value === 'all' ? '' : value })}
                                        disabled={!filters.pipeline_id}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={filters.pipeline_id ? t('Filter by Stage') : t('Select Pipeline first')} />
                                        </SelectTrigger>
                                        <SelectContent searchable>
                                            <SelectItem value="all">{t('All Stages')}</SelectItem>
                                            {filterStages?.map((item: any) => (
                                                <SelectItem key={item.id} value={item.id.toString()}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Created At Date Range')}</label>
                                    <DateRangePicker
                                        value={filters.created_at_range}
                                        onChange={(value) => setFilters({ ...filters, created_at_range: value })}
                                        placeholder={t('Select date range')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Follow Up Date Range')}</label>
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
                        <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 max-h-[70vh] rounded-none w-full">
                            <div className="min-w-[800px]">
                                <DataTable
                                    data={leads?.data || []}
                                    columns={tableColumns}
                                    onSort={handleSort}
                                    sortKey={sortField}
                                    sortDirection={sortDirection as 'asc' | 'desc'}
                                    className="rounded-none"
                                    emptyState={
                                        <NoRecordsFound
                                            icon={UsersIcon}
                                            title={t('No Leads found')}
                                            description={t('Get started by creating your first Lead.')}
                                            hasFilters={!!(filters.name || filters.email || filters.subject || filters.is_active || filters.user_id || filters.pipeline_id || filters.stage_id)}
                                            onClearFilters={clearFilters}
                                            createPermission="create-leads"
                                            onCreateClick={() => openModal('add')}
                                            createButtonText={t('Create Lead')}
                                            className="h-auto"
                                        />
                                    }
                                />
                            </div>
                        </div>
                    </CardContent>

                    <CardContent className="px-4 py-2 border-t bg-gray-50/30">
                        <Pagination
                            data={leads || { data: [], links: [], meta: {} }}
                            routeName="lead.leads.index"
                            filters={{ ...filters, per_page: perPage, view: viewMode }}
                        />
                    </CardContent>
                </Card>
            )}

            <Dialog open={modalState.isOpen} onOpenChange={closeModal}>
                {modalState.mode === 'add' && (
                    <Create onSuccess={closeModal} />
                )}
                {modalState.mode === 'edit' && modalState.data && (
                    <EditLead
                        lead={modalState.data.lead || modalState.data}
                        sources={modalState.data.sources || {}}
                        subjects={modalState.data.subjects || subjects || {}}
                        products={modalState.data.products || {}}
                        onSuccess={closeModal}
                    />
                )}
            </Dialog>

            <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
                {viewingItem && <View lead={viewingItem} />}
            </Dialog>

            <Dialog open={!!labelingItem} onOpenChange={() => setLabelingItem(null)}>
                {labelingItem && <LabelView lead={labelingItem} onSuccess={() => setLabelingItem(null)} />}
            </Dialog>

            <ConfirmationDialog
                open={deleteState.isOpen}
                onOpenChange={closeDeleteDialog}
                title={t('Delete Lead')}
                message={deleteState.message}
                confirmText={t('Delete')}
                onConfirm={confirmDelete}
                variant="destructive"
            />
        </AuthenticatedLayout>
    );
}

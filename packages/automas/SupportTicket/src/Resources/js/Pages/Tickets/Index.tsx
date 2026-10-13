import { useState, useMemo } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { useDeleteHandler } from '@/hooks/useDeleteHandler';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Edit, Trash2, Eye, Headphones, Handshake, ArrowRightLeft, Ticket, Clock, CheckCircle2, AlertTriangle, UserCheck, KeyRound, Phone, Mail } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FilterButton } from '@/components/ui/filter-button';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { PerPageSelector } from '@/components/ui/per-page-selector';
import { ListGridToggle } from '@/components/ui/list-grid-toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import NoRecordsFound from '@/components/no-records-found';
import { formatDate } from '@/utils/helpers';
import { usePageButtons } from '@/hooks/usePageButtons';
import { cn } from '@/lib/utils';

interface Ticket {
  id: number;
  encrypted_id: string;
  ticket_id: string;
  name: string;
  email: string;
  phone_number?: string;
  account_type: string;
  subject: string;
  status: string;
  assigned_to?: number;
  team_id?: number;
  assigned_to_name?: string;
  team_name?: string;
  can_pick?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_assign_user?: boolean;
  category: {
    name: string;
    color: string;
  };
  user_slug: string;
  created_at: string;
}

interface SupportUser {
  id: number;
  name: string;
  email: string;
}

interface SupportTeam {
  id: number;
  name: string;
}

interface TicketStats {
  total_tickets?: number;
  todays_tickets?: number;
  picked_today?: number;
  on_process?: number;
  unpicked?: number;
  overdue?: number;
  closed_tickets?: number;
  avg_pick_time?: string;
  avg_close_time?: string;
}

interface TicketsIndexProps {
  tickets: {
    data: Ticket[];
    links: any[];
    meta: any;
  };
  supportUsers?: SupportUser[];
  supportTeams?: SupportTeam[];
  groupUserMappings?: Record<number, SupportUser[]>;
  stats?: TicketStats;
  teamSettings?: {
    enable_group_assignment: boolean;
    allow_ticket_pickup: boolean;
    allow_ticket_transfer: boolean;
    allow_ticket_forward?: boolean;
    allow_user_assign: boolean;
    allow_ticket_delete?: boolean;
  };
  auth: {
    user: {
      permissions: string[];
      slug: string;
      is_company?: boolean;
      type?: string;
    };
  };
}

interface TicketFilters {
  search: string;
  status: string;
}

interface TicketModalState {
  isOpen: boolean;
  mode: string;
  data: any;
}

export default function Index() {
  const { t } = useTranslation();
  const { tickets, supportUsers = [], supportTeams = [], groupUserMappings = {}, stats, teamSettings, auth } = usePage<TicketsIndexProps>().props;
  const allowPickup = teamSettings?.allow_ticket_pickup ?? true;
  const allowForward = teamSettings?.allow_ticket_forward ?? teamSettings?.allow_ticket_transfer ?? true;
  const allowUserAssignment = teamSettings?.allow_user_assign ?? true;
  const isCompanyAdmin = auth.user?.is_company || auth.user?.type === 'super admin' || auth.user?.type === 'company';
  const allowDelete = isCompanyAdmin || (teamSettings?.allow_ticket_delete ?? true);
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const pageButtons = usePageButtons('videoHubBtn', { addonModule: 'SupportTicket', fallbackName: 'Support Ticket' });

  const [pickingTicketId, setPickingTicketId] = useState<number | null>(null);

  // Forward / Transfer Modal state
  const [transferModal, setTransferModal] = useState<{
    isOpen: boolean;
    ticket: Ticket | null;
    forwardType: 'user' | 'team';
    assignedTo: string;
    teamId: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    ticket: null,
    forwardType: allowUserAssignment ? 'user' : 'team',
    assignedTo: '',
    teamId: '',
    isSubmitting: false,
  });

  const openTransferModal = (ticket: Ticket) => {
    const initialType: 'user' | 'team' = allowUserAssignment ? 'user' : 'team';
    setTransferModal({
      isOpen: true,
      ticket,
      forwardType: initialType,
      assignedTo: ticket.assigned_to ? String(ticket.assigned_to) : 'none',
      teamId: ticket.team_id ? String(ticket.team_id) : 'none',
      isSubmitting: false,
    });
  };

  const closeTransferModal = () => {
    setTransferModal({
      isOpen: false,
      ticket: null,
      forwardType: 'user',
      assignedTo: '',
      teamId: '',
      isSubmitting: false,
    });
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModal.ticket) return;

    const isUserType = allowUserAssignment && transferModal.forwardType === 'user';
    const assignedTo = isUserType && transferModal.assignedTo !== 'none' ? transferModal.assignedTo : null;
    const teamId = (!isUserType || !assignedTo) && transferModal.teamId !== 'none' ? transferModal.teamId : (transferModal.ticket.team_id || null);

    if (isUserType && !assignedTo) {
      return;
    }
    if (!isUserType && !teamId) {
      return;
    }

    setTransferModal((prev) => ({ ...prev, isSubmitting: true }));

    const payload = {
      assigned_to: isUserType ? assignedTo : null,
      team_id: teamId,
    };

    router.post(
      route('support-tickets.transfer', transferModal.ticket.id),
      payload,
      {
        preserveScroll: true,
        onSuccess: () => {
          closeTransferModal();
        },
        onFinish: () => {
          setTransferModal((prev) => ({ ...prev, isSubmitting: false }));
        },
      }
    );
  };

  const handlePickTicket = (ticketId: number) => {
    setPickingTicketId(ticketId);
    router.post(route('support-tickets.pick', ticketId), {}, {
      preserveScroll: true,
      onFinish: () => setPickingTicketId(null),
    });
  };

  const [filters, setFilters] = useState<TicketFilters>({
    search: urlParams.get('search') || '',
    status: urlParams.get('status') || '',
  });

  const [perPage, setPerPage] = useState(urlParams.get('per_page') || '10');
  const [sortField, setSortField] = useState(urlParams.get('sort') || '');
  const [sortDirection, setSortDirection] = useState(urlParams.get('direction') || 'asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(urlParams.get('view') as 'list' | 'grid' || 'list');
  const [modalState, setModalState] = useState<TicketModalState>({
    isOpen: false,
    mode: '',
    data: null
  });

  const [showFilters, setShowFilters] = useState(false);

  useFlashMessages();
  const zendeskButtons = usePageButtons('zendeskSyncBtn',{ module: 'ticket', settingKey: 'zendesk_is_on' });
  const googleDriveButtons = usePageButtons('googleDriveBtn', { module: 'Tickets', settingKey: 'GoogleDrive Tickets' });
  const oneDriveButtons = usePageButtons('oneDriveBtn', { module: 'Tickets', settingKey: 'OneDrive Tickets' });
  const dropboxBtn = usePageButtons('dropboxBtn', { module: 'Tickets', settingKey: 'Dropbox Tickets' });
  const boxBtn = usePageButtons('boxBtn', { module: 'Tickets', settingKey: 'Box Tickets' });

  const { deleteState, openDeleteDialog, closeDeleteDialog, confirmDelete } = useDeleteHandler({
    routeName: 'support-tickets.destroy',
    defaultMessage: t('Are you sure you want to delete this ticket?')
  });

  const handleFilter = () => {
    router.get(route('support-tickets.index'), {...filters, per_page: perPage, sort: sortField, direction: sortDirection, view: viewMode}, {
      preserveState: true,
      replace: true
    });
  };

  const handlePerPageChange = (newPerPage: string) => {
    setPerPage(newPerPage);
    router.get(route('support-tickets.index'), {...filters, per_page: newPerPage, sort: sortField, direction: sortDirection, view: viewMode}, {
      preserveState: true,
      replace: true
    });
  };

  const handleSort = (field: string) => {
    const direction = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(direction);
    router.get(route('support-tickets.index'), {...filters, per_page: perPage, sort: field, direction, view: viewMode}, {
      preserveState: true,
      replace: true
    });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
    });
    router.get(route('support-tickets.index'), {per_page: perPage, view: viewMode});
  };

  const openModal = (mode: 'add' | 'edit', data: Ticket | null = null) => {
    setModalState({ isOpen: true, mode, data });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, mode: '', data: null });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'open': 'bg-green-100 text-green-800',
      'Open': 'bg-green-100 text-green-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'closed': 'bg-red-100 text-red-800',
      'Closed': 'bg-red-100 text-red-800',
      'On Hold': 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const tableColumns = [
    {
      key: 'ticket_id',
      header: t('Ticket ID'),
      sortable: true,
      render: (value: string, ticket: Ticket) =>
        auth.user?.permissions?.includes('view-support-tickets') ? (
          <span className="text-blue-600 hover:text-blue-700 cursor-pointer whitespace-nowrap inline-flex items-center" onClick={() => router.get(route('support-ticket.show.ticket', [ticket.user_slug, ticket.encrypted_id]))}>{value}</span>
        ) : (
          <span className="whitespace-nowrap inline-flex items-center">{value}</span>
        )
    },
    {
      key: 'account_type',
      header: t('Account Type'),
      render: (value: string) => (
        <span className="whitespace-nowrap capitalize inline-flex items-center">{value || '-'}</span>
      )
    },
    {
      key: 'name',
      header: t('User'),
      sortable: true,
      render: (value: string, row: Ticket) => (
        <div className="flex flex-col justify-center min-w-0 gap-0.5">
          <span className="font-medium text-foreground whitespace-nowrap">{row.name}</span>
          {row.email && (
            <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
              <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
              {row.email}
            </span>
          )}
          {row.phone_number && (
            <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1 font-mono">
              <Phone className="h-3 w-3 text-teal-600 shrink-0" />
              {row.phone_number}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'subject',
      header: t('Subject'),
      sortable: true,
      render: (value: string) => (
        <span className="whitespace-nowrap max-w-xs truncate inline-flex items-center" title={value}>{value}</span>
      )
    },
    {
      key: 'category',
      header: t('Category'),
      render: (value: any, row: Ticket) => {
        const catColor = row.category?.color || '#6B7280';
        return (
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 border"
            style={{
              backgroundColor: `${catColor}1A`, // ~10% opacity soft background
              color: catColor,
              borderColor: `${catColor}33`, // ~20% opacity border
            }}
          >
            {row.category?.name || '-'}
          </span>
        );
      }
    },
    {
      key: 'assigned_to_name',
      header: t('Picked By'),
      render: (value: string, row: Ticket) => {
        if (row.assigned_to_name) {
          return (
            <div className="flex flex-col justify-center min-w-0">
              <span className="font-medium text-foreground whitespace-nowrap">{row.assigned_to_name}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{row.team_name || ''}</span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {(!row.assigned_to || !row.assigned_to_name) && row.status?.toLowerCase() !== 'closed' && row.status?.toLowerCase() !== 'resolved' && (
              !allowPickup ? (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <span className="inline-block">
                        <Button
                          size="sm"
                          className="h-7 text-xs px-3 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm pointer-events-none"
                          disabled
                        >
                          {t('Pick Ticket')}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs bg-popover text-popover-foreground border shadow-md px-2.5 py-1">
                      <p>{t('Ticket pickup is currently disabled')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  size="sm"
                  className="h-7 text-xs px-3 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  disabled={pickingTicketId === row.id}
                  onClick={() => handlePickTicket(row.id)}
                >
                  {pickingTicketId === row.id ? t('Picking...') : t('Pick Ticket')}
                </Button>
              )
            )}
            {row.can_assign_user && row.status?.toLowerCase() !== 'closed' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2.5 font-semibold text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 shadow-sm"
                onClick={() => openTransferModal(row)}
              >
                {t('Assign User')}
              </Button>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      header: t('Status'),
      render: (value: string) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center ${
          getStatusColor(value)
        }`}>
          {t(value.replace('_', ' '))}
        </span>
      )
    },
    {
      key: 'created_at',
      header: t('Created'),
      sortable: true,
      render: (value: string) => <span className="whitespace-nowrap inline-flex items-center">{formatDate(value)}</span>
    },
    ...(auth.user?.permissions?.some((p: string) => ['edit-support-tickets', 'delete-support-tickets'].includes(p)) ? [{
      key: 'actions',
      header: t('Actions'),
      render: (_: any, ticket: Ticket) => (
        <div className="flex items-center gap-1">
          <TooltipProvider>
            {auth.user?.permissions?.includes('view-support-tickets') && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 text-green-600 hover:text-green-700">
                    <Link href={route('support-tickets.show', ticket.id)}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('View')}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {auth.user?.permissions?.includes('edit-support-tickets') && ticket.can_edit && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700">
                    <Link href={route('support-tickets.edit', ticket.id)}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('Edit & Reply')}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {allowForward && ticket.assigned_to && ticket.status?.toLowerCase() !== 'closed' && (isCompanyAdmin || ticket.assigned_to == auth.user?.id) && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openTransferModal(ticket)}
                    className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('Forward Ticket')}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {auth.user?.permissions?.includes('delete-support-tickets') && allowDelete && (ticket.can_delete ?? true) && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog(ticket.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
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
        {label: t('Support Tickets'), url: route('support-ticket.dashboard')},
        {label: t('Tickets')}
      ]}
      pageTitle={t('Manage Tickets')}
      pageActions={
        <div className="flex items-center gap-2">
            {zendeskButtons.map((button) => (
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
          <TooltipProvider>
            {pageButtons.map((button: any) => (
              <div key={button.id}>{button.component}</div>
            ))}
            {auth.user?.permissions?.includes('create-support-tickets') && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button size="sm" asChild>
                    <Link href={route('support-tickets.create')}>
                      <Plus className="h-4 w-4" />
                    </Link>
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
      <Head title={t('Support Tickets')} />

      {/* System Standard Stats Cards Row */}
      <div className={cn(
        'grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4',
        isCompanyAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-5'
      )}>
        {isCompanyAdmin ? (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{t('Total Tickets')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_tickets ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('all time total')}</p>
                </div>
                <span className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 transition-transform duration-200 hover:scale-110">
                  <Ticket className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{t("Today's Tickets")}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.todays_tickets ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('created today')}</p>
                </div>
                <span className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 bg-blue-50 text-blue-600 transition-transform duration-200 hover:scale-110">
                  <Ticket className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{t('On Process')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.on_process ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('active tickets')}</p>
                </div>
                <span className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 bg-amber-50 text-amber-600 transition-transform duration-200 hover:scale-110">
                  <Clock className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{t('Unpicked')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.unpicked ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('awaiting agent')}</p>
                </div>
                <span className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 bg-purple-50 text-purple-600 transition-transform duration-200 hover:scale-110">
                  <UserCheck className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{t('Overdue')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.overdue ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('exceeded 24h')}</p>
                </div>
                <span className="relative h-9 w-9 rounded-md flex items-center justify-center shrink-0 bg-rose-50 text-rose-600 transition-transform duration-200 hover:scale-110">
                  {(stats?.overdue ?? 0) > 0 && (
                    <span className="absolute inset-0 rounded-md bg-rose-400/40 animate-ping" />
                  )}
                  <AlertTriangle className={cn('h-4 w-4 relative', (stats?.overdue ?? 0) > 0 && 'animate-pulse')} />
                </span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{t('Closed Tickets')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.closed_tickets ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('resolved / closed')}</p>
                </div>
                <span className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600 transition-transform duration-200 hover:scale-110">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{t('Picked Today')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.picked_today ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('assigned to me today')}</p>
                </div>
                <span className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600 transition-transform duration-200 hover:scale-110">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{t('On Process')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.on_process ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('my active tickets')}</p>
                </div>
                <span className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 bg-amber-50 text-amber-600 transition-transform duration-200 hover:scale-110">
                  <Clock className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{t('Overdue')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.overdue ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('exceeded 24h')}</p>
                </div>
                <span className="relative h-9 w-9 rounded-md flex items-center justify-center shrink-0 bg-rose-50 text-rose-600 transition-transform duration-200 hover:scale-110">
                  {(stats?.overdue ?? 0) > 0 && (
                    <span className="absolute inset-0 rounded-md bg-rose-400/40 animate-ping" />
                  )}
                  <AlertTriangle className={cn('h-4 w-4 relative', (stats?.overdue ?? 0) > 0 && 'animate-pulse')} />
                </span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{t('Avg Pick Time')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.avg_pick_time ?? 'N/A'}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('time to pick ticket')}</p>
                </div>
                <span className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 transition-transform duration-200 hover:scale-110">
                  <Clock className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{t('Avg Close Time')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.avg_close_time ?? 'N/A'}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('time to close ticket')}</p>
                </div>
                <span className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 bg-teal-50 text-teal-600 transition-transform duration-200 hover:scale-110">
                  <Clock className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6 border-b bg-gray-50/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <SearchInput
                value={filters.search}
                onChange={(value) => setFilters({...filters, search: value})}
                onSearch={handleFilter}
                placeholder={t('Search tickets...')}
              />
            </div>
            <div className="flex items-center gap-3">
              <ListGridToggle
                currentView={viewMode}
                routeName="support-tickets.index"
                filters={{...filters, per_page: perPage}}
              />
              <PerPageSelector
                routeName="support-tickets.index"
                filters={{...filters, view: viewMode}}
                currentPerPage={perPage}
                onPerPageChange={handlePerPageChange}
              />
              <div className="relative">
                <FilterButton
                  showFilters={showFilters}
                  onToggle={() => setShowFilters(!showFilters)}
                />
                {(() => {
                  const activeFilters = [filters.status].filter(f => f !== '' && f !== null && f !== undefined).length;
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
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Status')}</label>
                <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Filter by Status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Progress">{t('In Progress')}</SelectItem>
                    <SelectItem value="On Hold">{t('On Hold')}</SelectItem>
                    <SelectItem value="Closed">{t('Closed')}</SelectItem>
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
            <div className="w-full overflow-x-auto">
              <div className="min-w-[1400px]">
                <DataTable
                  data={tickets?.data || []}
                  columns={tableColumns}
                  onSort={handleSort}
                  sortKey={sortField}
                  sortDirection={sortDirection as 'asc' | 'desc'}
                  className="rounded-none w-full"
                  emptyState={
                    <NoRecordsFound
                      icon={Headphones}
                      title={t('No Tickets found')}
                      description={t('Get started by creating your first Ticket.')}
                      hasFilters={!!(filters.search || filters.status)}
                      onClearFilters={clearFilters}
                      createPermission="create-support-tickets"
                      onCreateClick={() => window.location.href = route('support-tickets.create')}
                      createButtonText={t('Create Ticket')}
                      className="h-auto"
                    />
                  }
                />
              </div>
            </div>
          ) : (
            <div className="overflow-auto max-h-[70vh] p-6">
              {tickets?.data?.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                  {tickets.data.map((ticket) => (
                    <Card key={ticket.id} className="p-0 hover:shadow-lg transition-all duration-200 relative overflow-hidden flex flex-col h-full min-w-0">
                      {/* Header */}
                      <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent border-b flex-shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Headphones className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm text-gray-900 leading-tight break-words">{ticket.subject}</h3>
                            <p className="text-xs font-medium text-primary cursor-pointer" onClick={() => router.get(route('support-ticket.show.ticket', [ticket.user_slug, ticket.encrypted_id]))}>#{ticket.ticket_id}</p>
                          </div>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-4 flex-1 min-h-0">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-xs min-w-0">
                            <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">{t('Name')}</p>
                            <p className="font-medium text-xs truncate">{ticket.name}</p>
                          </div>
                          <div className="text-xs min-w-0">
                            <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">{t('Category')}</p>
                            {(() => {
                              const catColor = ticket.category?.color || '#6B7280';
                              return (
                                <span
                                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 border"
                                  style={{
                                    backgroundColor: `${catColor}1A`,
                                    color: catColor,
                                    borderColor: `${catColor}33`,
                                  }}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: catColor }}
                                  />
                                  {ticket.category?.name || '-'}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {(ticket.email || ticket.phone_number) && (
                          <div className="grid grid-cols-1 gap-2 mb-4 text-xs">
                            {ticket.email && (
                              <div className="min-w-0">
                                <p className="text-muted-foreground mb-0.5 text-[11px] uppercase tracking-wide">{t('Email')}</p>
                                <p className="font-medium text-xs break-all flex items-center gap-1">
                                  <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                  {ticket.email}
                                </p>
                              </div>
                            )}
                            {ticket.phone_number && (
                              <div className="min-w-0">
                                <p className="text-muted-foreground mb-0.5 text-[11px] uppercase tracking-wide">{t('Phone Number')}</p>
                                <p className="font-medium text-xs font-mono flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-teal-600 shrink-0" />
                                  {ticket.phone_number}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-xs min-w-0">
                            <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">{t('Picked By')}</p>
                            {ticket.assigned_to_name ? (
                              <p className="font-medium text-xs truncate">{ticket.assigned_to_name}</p>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                {(!ticket.assigned_to || !ticket.assigned_to_name) && ticket.status?.toLowerCase() !== 'closed' && ticket.status?.toLowerCase() !== 'resolved' && (
                                  !allowPickup ? (
                                    <TooltipProvider>
                                      <Tooltip delayDuration={0}>
                                        <TooltipTrigger asChild>
                                          <span className="inline-block">
                                            <Button
                                              size="sm"
                                              className="h-6 text-[11px] px-2.5 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm pointer-events-none"
                                              disabled
                                            >
                                              {t('Pick Ticket')}
                                            </Button>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs bg-popover text-popover-foreground border shadow-md px-2.5 py-1">
                                          <p>{t('Ticket pickup is currently disabled')}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="h-6 text-[11px] px-2.5 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                      disabled={pickingTicketId === ticket.id}
                                      onClick={() => handlePickTicket(ticket.id)}
                                    >
                                      {pickingTicketId === ticket.id ? t('Picking...') : t('Pick Ticket')}
                                    </Button>
                                  )
                                )}
                                {ticket.can_assign_user && ticket.status?.toLowerCase() !== 'closed' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[11px] px-2 font-semibold text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 shadow-sm"
                                    onClick={() => openTransferModal(ticket)}
                                  >
                                    {t('Assign User')}
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-xs min-w-0">
                            <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">{t('Team')}</p>
                            <p className="font-medium text-xs truncate">{ticket.team_name || ''}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-xs min-w-0">
                            <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">{t('Account Type')}</p>
                            <p className="font-medium text-xs">{ticket.account_type || '-'}</p>
                          </div>
                          <div className="text-xs min-w-0">
                            <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">{t('Created')}</p>
                            <p className="font-medium text-xs">{formatDate(ticket.created_at)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex justify-between items-center p-3 border-t bg-gray-50/50 flex-shrink-0 mt-auto">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                          {t(ticket.status.replace('_', ' '))}
                        </span>
                        <div className="flex gap-1">
                          <TooltipProvider>
                            {auth.user?.permissions?.includes('view-support-tickets') && (
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => router.get(route('support-tickets.show', ticket.id))} className="h-8 w-8 p-0 text-green-600 hover:text-green-700">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('View')}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {auth.user?.permissions?.includes('edit-support-tickets') && ticket.can_edit && (
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => router.get(route('support-tickets.edit', ticket.id))} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('Edit & Reply')}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {allowForward && ticket.assigned_to && ticket.status?.toLowerCase() !== 'closed' && (isCompanyAdmin || ticket.assigned_to == auth.user?.id) && (
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openTransferModal(ticket)}
                                    className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700"
                                  >
                                    <ArrowRightLeft className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('Forward Ticket')}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {auth.user?.permissions?.includes('delete-support-tickets') && allowDelete && (
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteDialog(ticket.id)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
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
                    </Card>
                  ))}
                </div>
              ) : (
                <NoRecordsFound
                  icon={Headphones}
                  title={t('No Tickets found')}
                  description={t('Get started by creating your first Ticket.')}
                  hasFilters={!!(filters.search || filters.status)}
                  onClearFilters={clearFilters}
                  createPermission="create-support-tickets"
                  onCreateClick={() => window.location.href = route('support-tickets.create')}
                  createButtonText={t('Create Ticket')}
                  className="h-auto"
                />
              )}
            </div>
          )}
        </CardContent>

        <CardContent className="px-4 py-2 border-t bg-gray-50/30">
          <Pagination
            data={tickets}
            routeName="support-tickets.index"
            filters={{...filters, per_page: perPage, view: viewMode}}
          />
        </CardContent>
      </Card>

      <Dialog open={transferModal.isOpen} onOpenChange={closeTransferModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {allowUserAssignment ? t('Forward Support Ticket') : t('Assign Ticket to Team')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransferSubmit} className="space-y-4 py-2">
            {allowUserAssignment && (
              <div className="space-y-2">
                <Label>{t('Forward Target')}</Label>
                <RadioGroup
                  value={transferModal.forwardType}
                  onValueChange={(val: 'user' | 'team') =>
                    setTransferModal((prev) => ({ ...prev, forwardType: val }))
                  }
                  className="flex gap-6 pt-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="user" id="forward-type-user" />
                    <Label htmlFor="forward-type-user" className="cursor-pointer font-normal">
                      {t('User')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="team" id="forward-type-team" />
                    <Label htmlFor="forward-type-team" className="cursor-pointer font-normal">
                      {t('Team Group')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {allowUserAssignment && transferModal.forwardType === 'user' && (
              <div className="space-y-2">
                <Label htmlFor="assigned_to">{t('User')}</Label>
                <Select
                  value={transferModal.assignedTo}
                  onValueChange={(val) => setTransferModal((prev) => ({ ...prev, assignedTo: val }))}
                >
                  <SelectTrigger id="assigned_to">
                    <SelectValue placeholder={t('Select user')} />
                  </SelectTrigger>
                  <SelectContent searchable searchPlaceholder={t('Search user...')}>
                    <SelectItem value="none">{t('Select user')}</SelectItem>
                    {supportUsers.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(!allowUserAssignment || transferModal.forwardType === 'team') && (
              <div className="space-y-2">
                <Label htmlFor="team_id">{t('Team Group')}</Label>
                <Select
                  value={transferModal.teamId}
                  onValueChange={(val) => setTransferModal((prev) => ({ ...prev, teamId: val }))}
                >
                  <SelectTrigger id="team_id">
                    <SelectValue placeholder={t('Select team group')} />
                  </SelectTrigger>
                  <SelectContent searchable searchPlaceholder={t('Search team group...')}>
                    <SelectItem value="none">{t('Select team group')}</SelectItem>
                    {supportTeams.map((team) => (
                      <SelectItem key={team.id} value={String(team.id)}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closeTransferModal}>
                {t('Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  transferModal.isSubmitting ||
                  (allowUserAssignment && transferModal.forwardType === 'user'
                    ? !transferModal.assignedTo || transferModal.assignedTo === 'none'
                    : !transferModal.teamId || transferModal.teamId === 'none')
                }
              >
                {transferModal.isSubmitting ? t('Forwarding...') : t('Forward Ticket')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={deleteState.isOpen}
        onOpenChange={closeDeleteDialog}
        title={t('Delete Ticket')}
        message={deleteState.message}
        confirmText={t('Delete')}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </AuthenticatedLayout>
  );
}

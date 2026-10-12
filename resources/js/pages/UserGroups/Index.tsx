import { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { useDeleteHandler } from '@/hooks/useDeleteHandler';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { SearchInput } from '@/components/ui/search-input';
import { Pagination } from '@/components/ui/pagination';
import NoRecordsFound from '@/components/no-records-found';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Edit, Eye, Trash2, Users, CheckCircle2, XCircle } from 'lucide-react';
import { formatDate } from '@/utils/helpers';

interface UserGroup {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    users_count: number;
    created_at: string;
}

interface PageProps {
    groups: {
        data: UserGroup[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: any[];
        from: number;
        to: number;
    };
    auth: any;
    filters: Record<string, string>;
    [key: string]: any;
}

export default function Index() {
    const { t } = useTranslation();
    const { groups, auth, filters: initialFilters } = usePage<PageProps>().props;
    const [search, setSearch] = useState(initialFilters?.name || '');

    useFlashMessages();

    const { deleteState, openDeleteDialog, closeDeleteDialog, confirmDelete } = useDeleteHandler({
        routeName: 'user-groups.destroy',
        defaultMessage: t('Are you sure you want to delete this user group?'),
    });

    const handleSearch = () => {
        router.get(route('user-groups.index'), { name: search }, { preserveState: true, replace: true });
    };

    const clearSearch = () => {
        setSearch('');
        router.get(route('user-groups.index'));
    };

    const canCreate  = auth?.user?.permissions?.includes('create-user-groups') || auth?.user?.type === 'company';
    const canEdit    = auth?.user?.permissions?.includes('edit-user-groups') || auth?.user?.type === 'company';
    const canDelete  = auth?.user?.permissions?.includes('delete-user-groups') || auth?.user?.type === 'company';

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('User Management'), url: route('users.index') },
                { label: t('User Groups') },
            ]}
            pageTitle={t('User Groups')}
        >
            <Head title={t('User Groups')} />

            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 max-w-md">
                        <SearchInput
                            value={search}
                            onChange={(val) => setSearch(val)}
                            onSearch={handleSearch}
                            placeholder={t('Search groups...')}
                        />
                    </div>
                    {canCreate && (
                        <Button onClick={() => router.visit(route('user-groups.create'))} size="sm">
                            <Plus className="w-4 h-4 mr-1" />
                            {t('New Group')}
                        </Button>
                    )}
                </div>

                {/* Table */}
                <Card>
                    <CardContent className="p-0">
                        {groups.data.length === 0 ? (
                            <NoRecordsFound icon={Users} title={t('No user groups found')} description={t('Create your first user group to get started.')} />
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/40">
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('Name')}</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">{t('Description')}</th>
                                                <th className="px-4 py-3 text-center font-medium text-muted-foreground">{t('Members')}</th>
                                                <th className="px-4 py-3 text-center font-medium text-muted-foreground">{t('Status')}</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">{t('Created')}</th>
                                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('Actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {groups.data.map((group) => (
                                                <tr key={group.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div
                                                            className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                                                            onClick={() => router.visit(route('user-groups.show', group.id))}
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                                <Users className="w-4 h-4 text-primary" />
                                                            </div>
                                                            <span className="font-medium">{group.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                                                        {group.description ? (
                                                            <span className="line-clamp-1">{group.description}</span>
                                                        ) : (
                                                            <span className="text-muted-foreground/50 italic">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Badge variant="secondary">
                                                            {group.users_count} {t('members')}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {group.is_active ? (
                                                            <Badge className="bg-green-100 text-green-800 border-green-200">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                {t('Active')}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                                                                <XCircle className="w-3 h-3 mr-1" />
                                                                {t('Inactive')}
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                                                        {formatDate(group.created_at)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-primary hover:text-primary"
                                                                            onClick={() => router.visit(route('user-groups.show', group.id))}
                                                                        >
                                                                            <Eye className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>{t('View')}</TooltipContent>
                                                                </Tooltip>
                                                                {canEdit && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8"
                                                                                onClick={() => router.visit(route('user-groups.edit', group.id))}
                                                                            >
                                                                                <Edit className="w-3.5 h-3.5" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>{t('Edit')}</TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                                {canDelete && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                                                onClick={() => openDeleteDialog(group.id, group.name)}
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>{t('Delete')}</TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </TooltipProvider>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {groups.last_page > 1 && (
                                    <div className="px-4 py-3 border-t">
                                        <Pagination
                                            data={groups}
                                            routeName="user-groups.index"
                                            filters={{ name: search }}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ConfirmationDialog
                open={deleteState.isOpen}
                onOpenChange={closeDeleteDialog}
                title={t('Delete User Group')}
                message={deleteState.message}
                confirmText={t('Delete')}
                onConfirm={confirmDelete}
                isLoading={deleteState.isLoading}
                variant="destructive"
            />
        </AuthenticatedLayout>
    );
}

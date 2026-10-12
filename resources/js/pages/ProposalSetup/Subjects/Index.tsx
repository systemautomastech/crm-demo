import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import SetupSidebar from '../Sidebar';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/ui/data-table';
import NoRecordsFound from '@/components/no-records-found';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Plus,
    Pencil,
    Trash2,
    List,
    Loader2,
    Save,
    Tag,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export interface ProposalSubjectItem {
    id: number;
    name: string;
    creator_id?: number;
    created_by?: number;
    created_at?: string;
    updated_at?: string;
}

interface ProposalSubjectsProps {
    subjects?: ProposalSubjectItem[];
}

export default function Subjects({ subjects = [] }: ProposalSubjectsProps) {
    const { t } = useTranslation();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addName, setAddName] = useState('');
    const [addError, setAddError] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const [editingSubject, setEditingSubject] = useState<ProposalSubjectItem | null>(null);
    const [editName, setEditName] = useState('');
    const [editError, setEditError] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const [deletingSubject, setDeletingSubject] = useState<ProposalSubjectItem | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleNavClick = (id: string) => {
        if (id !== 'subjects') {
            router.get(route('proposal-setup.index'));
        }
    };

    const handleOpenAdd = () => {
        setAddName('');
        setAddError('');
        setIsAddModalOpen(true);
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!addName.trim()) {
            setAddError(t('Subject name is required.'));
            return;
        }

        setIsAdding(true);
        router.post(route('proposal-setup.subjects.store'), {
            name: addName.trim(),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Subject created successfully.'));
                setIsAddModalOpen(false);
                setAddName('');
                setAddError('');
            },
            onError: (errors: any) => {
                setAddError(errors.name || t('Failed to create subject.'));
            },
            onFinish: () => {
                setIsAdding(false);
            }
        });
    };

    const handleOpenEdit = (subject: ProposalSubjectItem) => {
        setEditingSubject(subject);
        setEditName(subject.name);
        setEditError('');
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSubject) return;

        if (!editName.trim()) {
            setEditError(t('Subject name is required.'));
            return;
        }

        setIsUpdating(true);
        router.put(route('proposal-setup.subjects.update', editingSubject.id), {
            name: editName.trim(),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Subject updated successfully.'));
                setEditingSubject(null);
                setEditName('');
                setEditError('');
            },
            onError: (errors: any) => {
                setEditError(errors.name || t('Failed to update subject.'));
            },
            onFinish: () => {
                setIsUpdating(false);
            }
        });
    };

    const handleOpenDelete = (subject: ProposalSubjectItem) => {
        setDeletingSubject(subject);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!deletingSubject) return;

        setIsDeleting(true);
        router.delete(route('proposal-setup.subjects.destroy', deletingSubject.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Subject deleted successfully.'));
                setDeletingSubject(null);
                setIsDeleteModalOpen(false);
            },
            onError: () => {
                toast.error(t('Failed to delete subject.'));
            },
            onFinish: () => {
                setIsDeleting(false);
            }
        });
    };

    const tableColumns = [
        {
            key: 'name',
            header: t('Subject'),
        },
        {
            key: 'actions',
            header: t('Action'),
            render: (_: any, subject: ProposalSubjectItem) => (
                <div className="flex gap-1">
                    <TooltipProvider>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEdit(subject)}
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('Edit')}</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenDelete(subject)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('Delete')}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )
        }
    ];

    return (
        <TooltipProvider>
            <AuthenticatedLayout
                breadcrumbs={[
                    { label: t('Sales Proposals'), url: route('sales-proposals.index') },
                    { label: t('System Setup'), url: route('proposal-setup.index') },
                    { label: t('Subjects') },
                ]}
                pageTitle={t('System Setup')}
            >
                <Head title={t('Proposal Subjects')} />

                <div className="flex flex-col md:flex-row gap-8 pb-32">
                    <SetupSidebar activeSection="subjects" onNavClick={handleNavClick} />

                    <div className="flex-1 space-y-6">
                        <Card className="shadow-sm">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-medium">{t('Subjects')}</h3>
                                    <Tooltip delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <Button size="sm" onClick={handleOpenAdd}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{t('Create')}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>

                                <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 max-h-[75vh] rounded-none w-full">
                                    <div className="min-w-[600px]">
                                        <DataTable
                                            data={subjects}
                                            columns={tableColumns}
                                            className="rounded-none"
                                            emptyState={
                                                <NoRecordsFound
                                                    icon={List}
                                                    title={t('No Subjects found')}
                                                    description={t('Get started by creating your first Subject.')}
                                                    onCreateClick={handleOpenAdd}
                                                    createButtonText={t('Create Subject')}
                                                    className="h-auto"
                                                />
                                            }
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Add Subject Modal */}
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('Create Subject')}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="name">{t('Name')}</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={addName}
                                    onChange={(e) => {
                                        setAddName(e.target.value);
                                        if (addError) setAddError('');
                                    }}
                                    placeholder={t('Enter Name')}
                                    required
                                />
                                {addError && (
                                    <p className="text-xs text-destructive mt-1">{addError}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsAddModalOpen(false)}
                                    disabled={isAdding}
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" isLoading={isAdding}>
                                    {isAdding ? t('Creating') : t('Create')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Subject Modal */}
                <Dialog open={!!editingSubject} onOpenChange={(open) => !open && setEditingSubject(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('Edit Subject')}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="name">{t('Name')}</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={editName}
                                    onChange={(e) => {
                                        setEditName(e.target.value);
                                        if (editError) setEditError('');
                                    }}
                                    placeholder={t('Enter Name')}
                                    required
                                />
                                {editError && (
                                    <p className="text-xs text-destructive mt-1">{editError}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingSubject(null)}
                                    disabled={isUpdating}
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" isLoading={isUpdating}>
                                    {isUpdating ? t('Updating') : t('Update')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Modal */}
                <ConfirmationDialog
                    open={isDeleteModalOpen}
                    onOpenChange={setIsDeleteModalOpen}
                    title={t('Delete Subject')}
                    message={
                        deletingSubject
                            ? `${t('Are you sure you want to delete the subject')} "${deletingSubject.name}"?`
                            : t('Are you sure you want to delete this Subject?')
                    }
                    confirmText={t('Delete')}
                    onConfirm={handleConfirmDelete}
                    isLoading={isDeleting}
                    variant="destructive"
                />
            </AuthenticatedLayout>
        </TooltipProvider>
    );
}



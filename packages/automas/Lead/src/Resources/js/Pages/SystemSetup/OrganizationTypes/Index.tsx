import { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { useDeleteHandler } from '@/hooks/useDeleteHandler';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import Create from './Create';
import EditOrganizationType from './Edit';
import NoRecordsFound from '@/components/no-records-found';
import { OrganizationType, OrganizationTypesIndexProps, OrganizationTypeModalState } from './types';
import SystemSetupSidebar from "../SystemSetupSidebar";

export default function Index() {
    const { t } = useTranslation();
    const { organizationTypes, auth } = usePage<OrganizationTypesIndexProps>().props;

    const [modalState, setModalState] = useState<OrganizationTypeModalState>({
        isOpen: false,
        mode: '',
        data: null
    });

    useFlashMessages();

    const { deleteState, openDeleteDialog, closeDeleteDialog, confirmDelete } = useDeleteHandler({
        routeName: 'lead.organization-types.destroy',
        defaultMessage: t('Are you sure you want to delete this Organization Type?')
    });

    const openModal = (mode: 'add' | 'edit', data: OrganizationType | null = null) => {
        setModalState({ isOpen: true, mode, data });
    };

    const closeModal = () => {
        setModalState({ isOpen: false, mode: '', data: null });
    };

    const tableColumns = [
        {
            key: 'name',
            header: t('Organization Type'),
        },
        ...(auth.user?.permissions?.some((p: string) => ['edit-organization-types', 'edit-subjects', 'delete-organization-types', 'delete-subjects'].includes(p)) || true ? [{
            key: 'actions',
            header: t('Action'),
            render: (_: any, organizationType: OrganizationType) => (
                <div className="flex gap-1">
                    <TooltipProvider>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => openModal('edit', organizationType)} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700">
                                    <Edit className="h-4 w-4" />
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
                                    onClick={() => openDeleteDialog(organizationType.id)}
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
        }] : [])
    ];

    return (
        <TooltipProvider>
            <AuthenticatedLayout
                breadcrumbs={[
                    { label: t('CRM'), url: route('lead.index') },
                    { label: t('System Setup') },
                    { label: t('Organization Types') }
                ]}
                pageTitle={t('System Setup')}
            >
                <Head title={t('Organization Types')} />

                <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-64 flex-shrink-0">
                        <SystemSetupSidebar activeItem="organization-types" />
                    </div>

                    <div className="flex-1">
                        <Card className="shadow-sm">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-medium">{t('Organization Types')}</h3>
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
                                </div>
                                <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 max-h-[75vh] rounded-none w-full">
                                    <div className="min-w-[600px]">
                                        <DataTable
                                            data={organizationTypes as any}
                                            columns={tableColumns}
                                            className="rounded-none"
                                            emptyState={
                                                <NoRecordsFound
                                                    icon={Building2}
                                                    title={t('No Organization Types found')}
                                                    description={t('Get started by creating your first Organization Type.')}
                                                    onCreateClick={() => openModal('add')}
                                                    createButtonText={t('Create Organization Type')}
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

                <Dialog open={modalState.isOpen} onOpenChange={closeModal}>
                    {modalState.mode === 'add' && (
                        <Create onSuccess={closeModal} />
                    )}
                    {modalState.mode === 'edit' && modalState.data && (
                        <EditOrganizationType
                            organizationType={modalState.data}
                            onSuccess={closeModal}
                        />
                    )}
                </Dialog>

                <ConfirmationDialog
                    open={deleteState.isOpen}
                    onOpenChange={closeDeleteDialog}
                    title={t('Delete Organization Type')}
                    message={deleteState.message}
                    confirmText={t('Delete')}
                    onConfirm={confirmDelete}
                    variant="destructive"
                />
            </AuthenticatedLayout>
        </TooltipProvider>
    );
}

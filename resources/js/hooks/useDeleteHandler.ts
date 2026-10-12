import { useState } from 'react';
import { router } from '@inertiajs/react';

interface UseDeleteHandlerOptions {
    routeName: string;
    defaultMessage?: string;
    onSuccess?: (response?: any) => void;
    onError?: (error: any) => void;
}

export const useDeleteHandler = ({
    routeName,
    defaultMessage = 'Are you sure you want to delete this item?',
    onSuccess,
    onError
}: UseDeleteHandlerOptions) => {
    const [deleteState, setDeleteState] = useState<{
        isOpen: boolean;
        id: number | string | null;
        message: string;
        isLoading: boolean;
    }>({
        isOpen: false,
        id: null,
        message: defaultMessage,
        isLoading: false
    });

    const openDeleteDialog = (id: number | string, message?: string) => {
        setDeleteState({
            isOpen: true,
            id,
            message: message || defaultMessage,
            isLoading: false
        });
    };

    const closeDeleteDialog = () => {
        setDeleteState({
            isOpen: false,
            id: null,
            message: defaultMessage,
            isLoading: false
        });
    };

    const confirmDelete = () => {
        if (deleteState.id) {
            setDeleteState(prev => ({ ...prev, isLoading: true }));
            router.delete(route(routeName, deleteState.id), {
                onSuccess: (response) => {
                    closeDeleteDialog();
                    onSuccess?.(response);
                },
                onError: (error) => {
                    setDeleteState(prev => ({ ...prev, isLoading: false }));
                    onError?.(error);
                },
                onFinish: () => {
                    setDeleteState(prev => ({ ...prev, isLoading: false }));
                }
            });
        }
    };

    return {
        deleteState,
        openDeleteDialog,
        closeDeleteDialog,
        confirmDelete
    };
};
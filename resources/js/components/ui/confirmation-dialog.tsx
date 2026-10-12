import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { Loader } from 'lucide-react';

interface ConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
    isLoading?: boolean;
}

export function ConfirmationDialog({
    open,
    onOpenChange,
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    variant = 'default',
    isLoading = false,
}: ConfirmationDialogProps) {
    const { t } = useTranslation();

    return (
        <AlertDialog open={open} onOpenChange={(val) => {
            if (isLoading) return;
            onOpenChange(val);
        }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title || t('Confirm Action')}</AlertDialogTitle>
                    <AlertDialogDescription>{message || t('Are you sure you want to proceed?')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>{cancelText || t('Cancel')}</AlertDialogCancel>
                    <Button
                        type="button"
                        onClick={() => {
                            if (isLoading) return;
                            onConfirm();
                        }}
                        disabled={isLoading}
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                    >
                        {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin shrink-0" />}
                        {confirmText || t('Confirm')}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
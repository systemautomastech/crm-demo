import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowLeft, Printer, Edit, Send, Check, X } from 'lucide-react';
import { useFormFields } from '@/hooks/useFormFields';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import SalesOrderModal from './components/SalesOrderModal';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface SalesProposal {
    id: number;
    proposal_number: string;
    subject?: string | null;
    proposal_date: string;
    due_date: string;
    customer_id?: number | null;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    customer_address?: string | null;
    customer: { id: number; name: string; email: string; phone?: string; address?: string };
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    status: string;
    converted_to_sales_order?: boolean;
    sales_order_id?: number;
    converted_to_invoice: boolean;
    invoice_id?: number;
    notes?: string;
    payment_terms?: string;
    warehouse?: { id: number; name: string };
    items?: Array<{
        id: number;
        product_id: number;
        description?: string;
        product_description?: string;
        quantity: number;
        unit_price: number;
        discount_percentage: number;
        discount_amount: number;
        tax_percentage: number;
        tax_amount: number;
        total_amount: number;
        product?: {
            id: number;
            name: string;
            sku?: string;
            description?: string;
            type?: string;
            warehouseStocks?: Array<{ id: number; warehouse_id: number; quantity: number }>;
        };
        taxes?: Array<{
            id: number;
            tax_name: string;
            tax_rate: number;
        }>;
    }>;
}

interface ViewProps {
    proposal: SalesProposal;
    customers?: Array<{ id: number; name: string; email?: string }>;
    users?: Array<{ id: number; name: string; email?: string }>;
    userGroups?: Array<{ id: number; name: string }>;
    auth: any;
    [key: string]: any;
}

export default function View() {
    const { t } = useTranslation();
    const { proposal, auth, customers, users, userGroups } = usePage<ViewProps>().props;
    const [isConvertOpen, setIsConvertOpen] = useState(false);
    const [acceptState, setAcceptState] = useState<{ isOpen: boolean; isLoading: boolean }>({
        isOpen: false,
        isLoading: false,
    });
    const [rejectState, setRejectState] = useState<{ isOpen: boolean; isLoading: boolean }>({
        isOpen: false,
        isLoading: false,
    });

    const confirmAccept = () => {
        setAcceptState(prev => ({ ...prev, isLoading: true }));
        router.post(route('sales-proposals.accept', proposal.id), {}, {
            preserveScroll: true,
            onFinish: () => setAcceptState({ isOpen: false, isLoading: false }),
        });
    };

    const confirmReject = () => {
        setRejectState(prev => ({ ...prev, isLoading: true }));
        router.post(route('sales-proposals.reject', proposal.id), {}, {
            preserveScroll: true,
            onFinish: () => setRejectState({ isOpen: false, isLoading: false }),
        });
    };

    useFlashMessages();

    const customFields = useFormFields('getCustomFields', { module: 'General', sub_module: 'Proposal', id: proposal.id }, () => { }, {}, 'view', t);

    const getProposalStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'draft': return 'bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm';
            case 'sent': return 'bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm';
            case 'accepted': return 'bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm';
            case 'rejected': return 'bg-red-100 text-red-700 px-2 py-1 rounded-full text-sm';
            case 'expired': return 'bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-sm';
            default: return 'bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm';
        }
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('Sales Proposal'), url: route('sales-proposals.index') },
                { label: t('Proposal Details') }
            ]}
            pageTitle={`${t('Proposal')} #${proposal.proposal_number}`}
            pageActions={
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.visit(route('sales-proposals.index'))}
                >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    {t('Back')}
                </Button>
            }
        >
            <Head title={`${t('Proposal')} #${proposal.proposal_number}`} />

            <div className="space-y-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <p className="text-lg text-muted-foreground">#{proposal.proposal_number}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={getProposalStatusColor(proposal.status)}>
                                    {proposal.status?.charAt(0).toUpperCase() + proposal.status?.slice(1)}
                                </span>
                                <div className="text-right">
                                    <div className="text-2xl font-bold">{formatCurrency(proposal.total_amount)}</div>
                                    <div className="text-sm text-muted-foreground">{t('Total Amount')}</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <h3 className="font-semibold mb-2">{t('CUSTOMER')}</h3>
                                <div className="text-sm space-y-1">
                                    <div className="font-medium">{(proposal.customer as any)?.customer_name ?? proposal.customer_name ?? '-'}</div>
                                    <div className="text-muted-foreground">{(proposal.customer as any)?.customer_email ?? proposal.customer_email ?? ''}</div>
                                    {((proposal.customer as any)?.customer_phone || proposal.customer_phone) && (
                                        <div className="text-xs text-muted-foreground">{(proposal.customer as any)?.customer_phone ?? proposal.customer_phone}</div>
                                    )}
                                    {((proposal.customer as any)?.billing_address?.address || proposal.customer_address) && (
                                        <div className="text-xs text-muted-foreground">
                                            {typeof (proposal.customer as any)?.billing_address === 'object'
                                                ? [(proposal.customer as any)?.billing_address?.address, (proposal.customer as any)?.billing_address?.city, (proposal.customer as any)?.billing_address?.country].filter(Boolean).join(', ')
                                                : proposal.customer_address}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">{t('DETAILS')}</h3>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('Proposal Date')}</span>
                                        <span>{formatDate(proposal.proposal_date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('Due Date')}</span>
                                        <span className={new Date(proposal.due_date) < new Date() ? 'text-red-600' : ''}>
                                            {formatDate(proposal.due_date)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('Warehouse')}</span>
                                        <span>{proposal.warehouse?.name ?? '-'}</span>
                                    </div>
                                </div>
                                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 rounded">
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-wrap gap-2">
                                            {auth.user?.permissions?.includes('edit-sales-proposals') && proposal.status !== 'accepted' && !proposal.converted_to_invoice && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => router.visit(route('sales-proposals.edit', proposal.id))}
                                                >
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    {t('Edit')}
                                                </Button>
                                            )}
                                            {auth.user?.permissions?.includes('convert-sales-proposals') && proposal.status === 'accepted' && !proposal.converted_to_sales_order && !proposal.converted_to_invoice && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => setIsConvertOpen(true)}
                                                >
                                                    <RefreshCw className="h-4 w-4 mr-2" />
                                                    {t('Convert to Sales Order')}
                                                </Button>
                                            )}
                                            {proposal.converted_to_sales_order && proposal.sales_order_id && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => router.get(route('salesorder.orders.show', proposal.sales_order_id))}
                                                    className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                                                >
                                                    {t('View Sales Order')}
                                                </Button>
                                            )}
                                            {auth.user?.permissions?.includes('sent-sales-proposals') && (proposal.status === 'draft' || proposal.status === 'sent') && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => router.post(route('sales-proposals.sent', proposal.id))}
                                                    className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
                                                >
                                                    <Send className="h-4 w-4 mr-2" />
                                                    {proposal.status === 'sent' ? t('Resend Proposal') : t('Send Proposal')}
                                                </Button>
                                            )}
                                            {auth.user?.permissions?.includes('accept-sales-proposals') && proposal.status === 'sent' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setAcceptState({ isOpen: true, isLoading: false })}
                                                    className="border-green-600 text-green-700 hover:bg-green-50"
                                                >
                                                    <Check className="h-4 w-4 mr-2" />
                                                    {t('Accept Proposal')}
                                                </Button>
                                            )}
                                            {auth.user?.permissions?.includes('reject-sales-proposals') && proposal.status === 'sent' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setRejectState({ isOpen: true, isLoading: false })}
                                                    className="border-red-600 text-red-700 hover:bg-red-50"
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    {t('Reject Proposal')}
                                                </Button>
                                            )}
                                            {auth.user?.permissions?.includes('print-sales-proposals') && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => window.open(route('sales-proposals.print', proposal.id) + '?print=1', '_blank')}
                                                >
                                                    <Printer className="h-4 w-4 mr-2" />
                                                    {t('Print/Download')}
                                                </Button>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-bold text-blue-600">{formatCurrency(proposal.total_amount)}</div>
                                            <div className="text-sm text-muted-foreground">{t('Proposal Amount')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {proposal.notes && (
                            <div className="mt-4 pt-4 border-t">
                                <span className="font-medium text-sm">{t('Notes')}:</span>
                                <span className="text-sm text-muted-foreground ml-2">{proposal.notes}</span>
                            </div>
                        )}

                        {/* Custom Fields */}
                        {customFields.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {customFields.map((field, index) => (
                                        <div key={index} className="space-y-2">
                                            <label className="font-medium text-sm">{(field as any).name ?? (field as any).label ?? 'Custom Field'}</label>
                                            <div className="text-sm text-muted-foreground ml-2">
                                                {field.component}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-semibold">
                            {t('Proposal Items')}
                        </h3>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="px-4 py-3 text-left text-sm font-semibold">{t('Product')}</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold">{t('Qty')}</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold">{t('Unit Price')}</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold">{t('Discount')}</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold">{t('Tax')}</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold">{t('Total')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {proposal.items?.map((item, index) => (
                                        <tr key={index}>
                                            <td className="px-4 py-4">
                                                <div className="font-medium">{item.product?.name}</div>
                                                {item.product?.sku && (
                                                    <div className="text-sm text-muted-foreground">SKU: {item.product.sku}</div>
                                                )}
                                                {(item.description || (item as any).product_description || item.product?.description) && (
                                                    <div
                                                        className="text-sm text-muted-foreground mt-1 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_li]:list-item [&_li_p]:inline [&_li_p]:m-0 [&_p]:my-1"
                                                        dangerouslySetInnerHTML={{ __html: item.description || (item as any).product_description || item.product?.description || '' }}
                                                    />
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right">{item.quantity}</td>
                                            <td className="px-4 py-4 text-right">{formatCurrency(item.unit_price)}</td>
                                            <td className="px-4 py-4 text-right">
                                                {item.discount_percentage > 0 ? (
                                                    <div>
                                                        <div>{item.discount_percentage}%</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            -{formatCurrency(item.discount_amount)}
                                                        </div>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                {item.taxes && item.taxes.length > 0 ? (
                                                    <div>
                                                        {item.taxes.map((tax, taxIndex) => (
                                                            <div key={taxIndex} className="text-sm">{tax.tax_name} ({tax.tax_rate}%)</div>
                                                        ))}
                                                        <div className="text-sm text-muted-foreground">
                                                            {formatCurrency(item.tax_amount)}
                                                        </div>
                                                    </div>
                                                ) : item.tax_percentage > 0 ? (
                                                    <div>
                                                        <div>{item.tax_percentage}%</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {formatCurrency(item.tax_amount)}
                                                        </div>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-4 text-right font-semibold">
                                                {formatCurrency(item.total_amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <div className="w-80 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{t('Subtotal')}</span>
                                    <span className="font-medium">{formatCurrency(proposal.subtotal)}</span>
                                </div>
                                {proposal.discount_amount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{t('Discount')}</span>
                                        <span className="font-medium text-red-600">-{formatCurrency(proposal.discount_amount)}</span>
                                    </div>
                                )}
                                {proposal.tax_amount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{t('Tax')}</span>
                                        <span className="font-medium">{formatCurrency(proposal.tax_amount)}</span>
                                    </div>
                                )}
                                <div className="border-t pt-3">
                                    <div className="flex justify-between">
                                        <span className="font-semibold">{t('Total Amount')}</span>
                                        <span className="font-bold text-lg">{formatCurrency(proposal.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <SalesOrderModal
                open={isConvertOpen}
                onOpenChange={setIsConvertOpen}
                proposal={proposal}
                customers={customers}
                users={users}
                userGroups={userGroups}
            />

            <ConfirmationDialog
                open={acceptState.isOpen}
                onOpenChange={(open) => setAcceptState(prev => ({ ...prev, isOpen: open }))}
                title={t('Accept Proposal')}
                message={t('Are you sure you to accept the proposal?')}
                confirmText={t('Accept')}
                onConfirm={confirmAccept}
                isLoading={acceptState.isLoading}
                variant="default"
            />

            <ConfirmationDialog
                open={rejectState.isOpen}
                onOpenChange={(open) => setRejectState(prev => ({ ...prev, isOpen: open }))}
                title={t('Reject Proposal')}
                message={t('Are you sure you to reject the proposal?')}
                confirmText={t('Reject')}
                onConfirm={confirmReject}
                isLoading={rejectState.isLoading}
                variant="destructive"
            />
        </AuthenticatedLayout>
    );
}

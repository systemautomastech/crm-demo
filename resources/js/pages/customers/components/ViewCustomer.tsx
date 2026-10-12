import React from 'react';
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { Building2, User, FileText, MapPin, Info, Receipt, RotateCcw } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface ViewCustomerProps {
    type?: 'client';
    data: any;
}

export default function ViewCustomer({
    data
}: ViewCustomerProps) {
    const { t } = useTranslation();

    if (!data) return null;

    const parseAddress = (addr: any) => {
        if (!addr) return {};
        if (typeof addr === 'string') {
            try {
                return JSON.parse(addr);
            } catch {
                return { address_line_1: addr };
            }
        }
        return addr;
    };

    const billing = parseAddress(data.billing_address);
    const shipping = parseAddress(data.shipping_address);
    const hasBilling = billing.address_line_1 || billing.city || billing.country || billing.address || billing.state || billing.zip_code;
    const hasShipping = shipping.address_line_1 || shipping.city || shipping.country || shipping.address || shipping.state || shipping.zip_code;

    const customerName = data.customer_name || data.company_name || data.name;
    const customerEmail = data.customer_email || data.email;
    const customerPhone = data.customer_phone || data.mobile_no;

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader className="pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-semibold">
                            {t('Customer Details')}
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            {customerName}
                        </p>
                    </div>
                </div>
            </DialogHeader>

            <div className="space-y-6 pt-2">
                {/* General Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.customer_code && (
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">{t('Customer Code')}</span>
                            <p className="text-sm font-semibold text-primary bg-muted/30 p-2.5 rounded-md">{data.customer_code}</p>
                        </div>
                    )}

                    <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">{t('Customer Name')}</span>
                        <p className="text-sm font-medium text-foreground bg-muted/30 p-2.5 rounded-md">
                            {customerName || '-'}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">{t('Customer Email')}</span>
                        <p className="text-sm text-foreground bg-muted/30 p-2.5 rounded-md">
                            {customerEmail || '-'}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">{t('Customer Phone')}</span>
                        <p className="text-sm text-foreground bg-muted/30 p-2.5 rounded-md">
                            {customerPhone || '-'}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">{t('Tax Number')}</span>
                        <p className="text-sm text-foreground bg-muted/30 p-2.5 rounded-md">
                            {data.tax_number || '-'}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">{t('Payment Terms')}</span>
                        <p className="text-sm text-foreground bg-muted/30 p-2.5 rounded-md">
                            {data.payment_terms || '-'}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">{t('Status')}</span>
                        <div className="pt-1">
                            <Badge className={data.is_active !== false && data.is_active !== 0 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none' : 'bg-slate-100 text-slate-600 hover:bg-slate-100 border-none'}>
                                {data.is_active !== false && data.is_active !== 0 ? t('Active') : t('Inactive')}
                            </Badge>
                        </div>
                    </div>

                    {data.creator && (
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">{t('Created By')}</span>
                            <p className="text-sm font-medium text-foreground bg-muted/30 p-2.5 rounded-md">
                                {data.creator.name || data.creator.email || '-'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Summary / Stats Section using Customer model relationships */}
                {(data.proposals_count !== undefined || data.sales_invoices_count !== undefined || data.sales_returns_count !== undefined) && (
                    <div className="grid grid-cols-3 gap-3 border-t pt-4">
                        <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-700 rounded-md">
                                <FileText className="h-4 w-4" />
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block">{t('Proposals')}</span>
                                <span className="text-base font-semibold text-blue-700">{data.proposals_count ?? 0}</span>
                            </div>
                        </div>

                        <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md">
                                <Receipt className="h-4 w-4" />
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block">{t('Invoices')}</span>
                                <span className="text-base font-semibold text-emerald-700">{data.sales_invoices_count ?? 0}</span>
                            </div>
                        </div>

                        <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-lg flex items-center gap-3">
                            <div className="p-2 bg-amber-100 text-amber-700 rounded-md">
                                <RotateCcw className="h-4 w-4" />
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block">{t('Returns')}</span>
                                <span className="text-base font-semibold text-amber-700">{data.sales_returns_count ?? 0}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Contact Person Section */}
                {(data.contact_person_name || data.contact_person_email || data.contact_person_mobile) && (
                    <div className="space-y-3 border-t pt-4">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            {t('Contact Person Details')}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground">{t('Name')}</span>
                                <p className="text-sm text-foreground bg-muted/30 p-2.5 rounded-md">
                                    {data.contact_person_name || '-'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground">{t('Email')}</span>
                                <p className="text-sm text-foreground bg-muted/30 p-2.5 rounded-md truncate">
                                    {data.contact_person_email || '-'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground">{t('Mobile')}</span>
                                <p className="text-sm text-foreground bg-muted/30 p-2.5 rounded-md">
                                    {data.contact_person_mobile || '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Billing Address */}
                {hasBilling && (
                    <div className="space-y-2 border-t pt-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span>{t('Billing Address')}</span>
                        </div>
                        <div className="text-sm text-foreground bg-muted/30 p-3 rounded-md space-y-1">
                            {billing.name && <p className="font-medium">{billing.name}</p>}
                            {(billing.address_line_1 || billing.address) && (
                                <p>{billing.address_line_1 || billing.address}</p>
                            )}
                            {billing.address_line_2 && <p>{billing.address_line_2}</p>}
                            <p>
                                {[billing.city, billing.state, billing.zip_code].filter(Boolean).join(', ')}
                            </p>
                            {billing.country && <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider">{billing.country}</p>}
                        </div>
                    </div>
                )}

                {/* Shipping Address */}
                {(hasShipping && !data.same_as_billing) && (
                    <div className="space-y-2 border-t pt-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span>{t('Shipping Address')}</span>
                        </div>
                        <div className="text-sm text-foreground bg-muted/30 p-3 rounded-md space-y-1">
                            {shipping.name && <p className="font-medium">{shipping.name}</p>}
                            {(shipping.address_line_1 || shipping.address) && (
                                <p>{shipping.address_line_1 || shipping.address}</p>
                            )}
                            {shipping.address_line_2 && <p>{shipping.address_line_2}</p>}
                            <p>
                                {[shipping.city, shipping.state, shipping.zip_code].filter(Boolean).join(', ')}
                            </p>
                            {shipping.country && <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider">{shipping.country}</p>}
                        </div>
                    </div>
                )}

                {/* Other Informations */}
                {data.other_informations && (
                    <div className="space-y-2 border-t pt-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Info className="h-4 w-4 text-primary" />
                            <span>{t('Other Informations')}</span>
                        </div>
                        <div className="text-sm text-foreground bg-muted/30 p-3 rounded-md whitespace-pre-wrap">
                            {data.other_informations}
                        </div>
                    </div>
                )}

                {/* Notes */}
                {data.notes && (
                    <div className="space-y-2 border-t pt-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            <span>{t('Notes')}</span>
                        </div>
                        <div className="text-sm text-foreground bg-muted/30 p-3 rounded-md whitespace-pre-wrap">
                            {data.notes}
                        </div>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}

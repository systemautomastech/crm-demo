import React, { useEffect, useState, useRef } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import html2pdf from 'html2pdf.js';
import { formatCurrency, formatDate, getCompanySetting } from '@/utils/helpers';
import { SalesInvoice } from './types';
import { usePageButtons } from '@/hooks/usePageButtons';
import { useFormFields } from '@/hooks/useFormFields';
import { Phone, Mail, MapPin } from 'lucide-react';

interface PrintProps {
    invoice: SalesInvoice;
    [key: string]: any;
}

export default function Print() {
    const { t } = useTranslation();
    const { invoice } = usePage<PrintProps>().props;
    const [isDownloading, setIsDownloading] = useState(false);
    const [fieldsLoaded, setFieldsLoaded] = useState(false);
    const downloadInitiatedRef = useRef(false);

    const signaturePrintButtons = usePageButtons('signaturePrintBtn', {
        invoice: invoice,
        invoiceType: 'sales'
    });

    // Custom fields view mode hook
    const customFields = useFormFields('getCustomFields', { ...invoice, module: 'General', sub_module: 'Sales Invoice', id: invoice.id, isPrint: true }, () => {}, {}, 'view', t);
    const pageButtons = usePageButtons('zatcaQRCodeBtn', invoice);

    useEffect(() => {
        // Set fields loaded when custom fields are available
        if (customFields && customFields.length >= 0) {
            setFieldsLoaded(true);
        }
    }, [customFields]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('download') === 'pdf' && fieldsLoaded && !downloadInitiatedRef.current) {
            downloadInitiatedRef.current = true;
            let attempts = 0;
            const maxAttempts = 60;
            let initialPageButtonsLength = pageButtons.length;

            const checkQRCodeOrDownload = () => {
                const qrContainer = document.getElementById('zatca-qr-container');
                const qrImg = document.querySelector('[data-zatca-qr] img[src*="data:image"]') as HTMLImageElement;
                const loadingDiv = document.querySelector('[data-zatca-qr] .animate-spin');
                const currentPageButtonsLength = pageButtons.length;

                // Check if ZATCA is enabled (pageButtons populated at any point)
                const isZatcaEnabled = currentPageButtonsLength > 0 || initialPageButtonsLength > 0 || qrContainer !== null;

                // Case 1: Valid QR code loaded and ready
                if (qrImg && qrImg.complete && qrImg.naturalWidth > 0) {
                    if (qrContainer) qrContainer.classList.remove('hidden');
                    setTimeout(() => downloadPDF(), 1000);
                    return;
                }

                // Case 2: ZATCA disabled (no page buttons and no container)
                if (!isZatcaEnabled && attempts > 5) {
                    setTimeout(() => downloadPDF(), 300);
                    return;
                }

                // Case 3: QR container exists but empty after sufficient attempts (validation failed)
                if (isZatcaEnabled && qrContainer && !qrImg && !loadingDiv && attempts > 15) {
                    if (qrContainer) qrContainer.classList.add('hidden');
                    setTimeout(() => downloadPDF(), 300);
                    return;
                }

                // Case 4: Still loading - continue waiting
                if (loadingDiv && attempts <= 40) {
                    attempts++;
                    setTimeout(checkQRCodeOrDownload, 300);
                    return;
                }

                // Case 5: Max attempts reached - proceed anyway
                if (attempts >= maxAttempts) {
                    if (qrContainer && !qrImg) {
                        qrContainer.classList.add('hidden');
                    }
                    setTimeout(() => downloadPDF(), 300);
                    return;
                }

                // Continue checking
                attempts++;
                setTimeout(checkQRCodeOrDownload, 250);
            };

            setTimeout(checkQRCodeOrDownload, 500);
        }
    }, [fieldsLoaded]);

    const downloadPDF = async () => {
        if (isDownloading) return;
        setIsDownloading(true);

        const printContent = document.querySelector('.invoice-container');
        if (printContent) {
            const opt = {
                margin: 0.25,
                filename: `sales-invoice-${invoice.invoice_number}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
            };

            try {
                await html2pdf().set(opt).from(printContent as HTMLElement).save();
                setTimeout(() => window.close(), 1000);
            } catch (error) {
                console.error('PDF generation failed:', error);
            }
        }

        setIsDownloading(false);
    };

    return (
        <div className="min-h-screen bg-white">
            <Head title={t('Invoice')} />

            {isDownloading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <div className="flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <p className="text-lg font-semibold text-gray-700">{t('Generating PDF...')}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="invoice-container bg-white max-w-4xl mx-auto p-8">
                <div className="flex justify-between items-start mb-8">
                    <div className="w-1/2">
                        <h1 className="text-2xl font-bold mb-4">{getCompanySetting('company_name') || 'YOUR COMPANY'}</h1>
                        <div className="text-sm space-y-1">
                            {getCompanySetting('company_address') && <p>{getCompanySetting('company_address')}</p>}
                            {(getCompanySetting('company_city') || getCompanySetting('company_state') || getCompanySetting('company_zipcode')) && (
                                <p>
                                    {getCompanySetting('company_city')}{getCompanySetting('company_state') && `, ${getCompanySetting('company_state')}`} {getCompanySetting('company_zipcode')}
                                </p>
                            )}
                            {getCompanySetting('company_country') && <p>{getCompanySetting('company_country')}</p>}
                            {getCompanySetting('company_telephone') && <p>{t('Phone')}: {getCompanySetting('company_telephone')}</p>}
                            {getCompanySetting('company_email') && <p>{t('Email')}: {getCompanySetting('company_email')}</p>}
                            {getCompanySetting('registration_number') && <p>{t('Registration')}: {getCompanySetting('registration_number')}</p>}
                        </div>
                    </div>
                    <div className="text-right w-1/2">
                        <h2 className="text-2xl font-bold mb-2">{t('SALES INVOICE')}</h2>
                        <p className="text-lg font-semibold">#{invoice.invoice_number}</p>
                        <div className="text-sm mt-2 space-y-1">
                            <p>{t('Date')}: {formatDate(invoice.invoice_date)}</p>
                            <p>{t('Due')}: {formatDate(invoice.due_date)}</p>
                        </div>
                        {pageButtons.length > 0 ? (
                            <div className="mt-4 flex justify-end">
                                {pageButtons.map((button, index) => (
                                    <div key={`${button.id}-${index}`} data-zatca-qr className="" id="zatca-qr-container">
                                        {button.component}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Empty container for detection when ZATCA is disabled
                            <div className="hidden" id="zatca-qr-container-disabled"></div>
                        )}
                    </div>
                </div>

                <div className="flex justify-between mb-8">
                    <div className="w-1/2">
                        <h3 className="font-bold mb-3">{t('BILL TO')}</h3>
                        <div className="text-sm space-y-1">
                            <p className="font-semibold">{invoice.customer?.customer_name || '-'}</p>
                            {(invoice.customer?.customer_phone) && (
                                <p className="flex items-center gap-1.5 text-gray-700">
                                    <Phone className="w-3 h-3 text-gray-500 fill-current shrink-0" />
                                    <span>{invoice.customer?.customer_phone}</span>
                                </p>
                            )}
                            {(invoice.customer?.customer_email) && (
                                <p className="flex items-center gap-1.5 text-gray-700">
                                    <Mail className="w-3 h-3 text-gray-500 fill-current shrink-0" />
                                    <span>{invoice.customer?.customer_email}</span>
                                </p>
                            )}
                            {invoice.customer_details?.billing_address ? (
                                <div className="flex items-start gap-1.5 text-gray-700">
                                    <MapPin className="w-3 h-3 text-gray-500 fill-current shrink-0 mt-0.5" />
                                    <div>
                                        <p>{invoice.customer_details.billing_address.name}</p>
                                        <p>{invoice.customer_details.billing_address.address_line_1}</p>
                                        <p>{invoice.customer_details.billing_address.city}, {invoice.customer_details.billing_address.state} {invoice.customer_details.billing_address.zip_code}</p>
                                    </div>
                                </div>
                            ) : invoice.customer_address ? (
                                <div className="flex items-start gap-1.5 text-gray-700">
                                    <MapPin className="w-3 h-3 text-gray-500 fill-current shrink-0 mt-0.5" />
                                    <p className="whitespace-pre-line">{invoice.customer_address}</p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                    <div className="text-right w-1/2">
                        <h3 className="font-bold mb-3">{t('SHIP TO')}</h3>
                        <div className="text-sm space-y-1">
                            {invoice.customer_details?.shipping_address ? (
                                <>
                                    <p className="font-semibold">{invoice.customer_details.shipping_address.name}</p>
                                    <p>{invoice.customer_details.shipping_address.address_line_1}</p>
                                    <p>{invoice.customer_details.shipping_address.city}, {invoice.customer_details.shipping_address.state} {invoice.customer_details.shipping_address.zip_code}</p>
                                </>
                            ) : (
                                <p className="text-gray-500">{t('Same as billing address')}</p>
                            )}
                        </div>
                    </div>
                </div>
                {/* Custom Fields Display */}
                {customFields && customFields.length > 0 && (
                    <div className="mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {customFields.map((field) => (
                                <div key={field.id} className="space-y-1">
                                    <div className="font-semibold text-gray-700">{(field as any).name || (field as any).label || 'Custom Field'}:</div>
                                    <div className="text-gray-900">{field.component}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mb-8">
                    <table className="w-full table-fixed">
                        <thead>
                            <tr className="border-b border-gray-300">
                                <th className="text-left py-3 font-bold">{t('ITEM')}</th>
                                <th className="text-center py-3 font-bold">{t('QTY')}</th>
                                <th className="text-right py-3 font-bold">{t('PRICE')}</th>
                                <th className="text-right py-3 font-bold">{t('DISCOUNT')}</th>
                                <th className="text-right py-3 font-bold">{t('TAX')}</th>
                                <th className="text-right py-3 font-bold">{t('TOTAL')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items?.map((item, index) => {
                                const desc = item.description || item.product?.description || item.product?.long_description || '';
                                return (
                                    <tr key={index} className="page-break-inside-avoid">
                                        <td className="py-4">
                                            <div className="font-semibold">{item.product?.name}</div>
                                            {item.product?.sku && (
                                                <div className="text-xs text-gray-500">{t('SKU')}: {item.product.sku}</div>
                                            )}
                                            {desc && (
                                                <div
                                                    className="text-xs text-gray-600 mt-1 prose prose-xs max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: desc }}
                                                />
                                            )}
                                        </td>
                                        <td className="text-center py-4">{item.quantity}</td>
                                        <td className="text-right py-4">{formatCurrency(item.unit_price)}</td>
                                        <td className="text-right py-4">
                                            {item.discount_type === 'fixed' ? (
                                                item.discount_amount > 0 ? (
                                                    <div className="text-sm font-medium">-{formatCurrency(item.discount_amount)}</div>
                                                ) : (
                                                    <div className="text-sm">-</div>
                                                )
                                            ) : (
                                                item.discount_percentage > 0 ? (
                                                    <>
                                                        <div className="text-sm">{item.discount_percentage}%</div>
                                                        <div className="text-sm font-medium text-gray-500">-{formatCurrency(item.discount_amount)}</div>
                                                    </>
                                                ) : (
                                                    <div className="text-sm">0%</div>
                                                )
                                            )}
                                        </td>
                                        <td className="text-right py-4">
                                            {item.taxes && item.taxes.length > 0 ? (
                                                <>
                                                    {item.taxes.map((tax, taxIndex) => (
                                                        <div key={taxIndex} className="text-sm">{tax.tax_name} ({tax.tax_rate}%)</div>
                                                    ))}
                                                    <div className="text-sm font-medium">{formatCurrency(item.tax_amount)}</div>
                                                </>
                                            ) : item.tax_percentage > 0 ? (
                                                <>
                                                    <div className="text-sm">{item.tax_percentage}%</div>
                                                    <div className="text-sm font-medium">{formatCurrency(item.tax_amount)}</div>
                                                </>
                                            ) : (
                                                <div className="text-sm">0%</div>
                                            )}
                                        </td>
                                        <td className="text-right py-4 font-semibold">{formatCurrency(item.total_amount)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end mb-4 page-break-inside-avoid">
                    <div className="w-80 page-break-inside-avoid">
                        <div className="border border-gray-400 p-4 page-break-inside-avoid">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>{t('Subtotal')}:</span>
                                    <span>{formatCurrency(invoice.subtotal)}</span>
                                </div>
                                {invoice.discount_amount > 0 && (
                                    <div className="flex justify-between">
                                        <span>{t('Discount')}:</span>
                                        <span>-{formatCurrency(invoice.discount_amount)}</span>
                                    </div>
                                )}
                                {invoice.tax_amount > 0 && (
                                    <div className="flex justify-between">
                                        <span>{t('Tax')}:</span>
                                        <span>{formatCurrency(invoice.tax_amount)}</span>
                                    </div>
                                )}
                                <div className="border-t border-gray-400 pt-2 mt-2">
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>{t('TOTAL')}:</span>
                                        <span>{formatCurrency(invoice.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-400 pt-4 text-center">
                    {/* Signature Print Display */}
                    {signaturePrintButtons.length > 0 && signaturePrintButtons.map((button) => (
                        <div key={button.id}>{button.component}</div>
                    ))}
                    <p className="font-semibold">{t('PAYMENT TERMS')}: {invoice.payment_terms || t('Net 30 Days')}</p>
                    <p className="text-sm mt-2">{t('Thank you for your business!')}</p>
                </div>
            </div>

            <style>{`
                body {
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                    font-family: Arial, sans-serif;
                }

                @page {
                    margin: 0.5in;
                    size: A4;
                }

                .invoice-container {
                    max-width: 100%;
                    margin: 0;
                    box-shadow: none;
                }

                .page-break-inside-avoid {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }

                @media print {
                    body {
                        background: white;
                    }

                    .invoice-container {
                        box-shadow: none;
                    }
                }
            `}</style>
        </div>
    );
}

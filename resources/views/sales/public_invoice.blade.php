@php
    $companySettings = getCompanyAllSetting($invoice->created_by);

    $creatorId = $invoice->created_by ?? (function_exists('creatorId') ? creatorId() : auth()->id());

    $salesInvoiceSetting = $salesInvoiceSetting ?? \App\Models\SalesInvoiceSetup::getSettings($creatorId);

    /*
    |--------------------------------------------------------------------------
    | Image Helpers
    |--------------------------------------------------------------------------
    */

    $toDataUri = function ($filePath) {
        if (!file_exists($filePath) || !is_readable($filePath)) {
            return null;
        }

        $mime = mime_content_type($filePath) ?: 'image/jpeg';
        $data = file_get_contents($filePath);

        return 'data:' . $mime . ';base64,' . base64_encode($data);
    };

    $getImagePath = function ($path) use ($toDataUri) {
        if (!$path) {
            return '';
        }

        $cleanPath = ltrim($path, '/');

        $localPaths = [
            storage_path('app/public/media/' . basename($cleanPath)),
            storage_path('app/public/' . $cleanPath),
            public_path('storage/media/' . basename($cleanPath)),
            public_path('storage/' . $cleanPath),
            public_path($cleanPath),
            public_path('uploads/' . $cleanPath),
        ];

        foreach ($localPaths as $localPath) {
            if (file_exists($localPath) && is_file($localPath)) {
                $dataUri = $toDataUri($localPath);

                if ($dataUri) {
                    return $dataUri;
                }
            }
        }

        if (str_starts_with($cleanPath, 'http://') || str_starts_with($cleanPath, 'https://')) {
            return $cleanPath;
        }

        if (function_exists('getImageUrlPrefix')) {
            $prefix = getImageUrlPrefix();

            if ($prefix) {
                return rtrim($prefix, '/') . '/' . basename($cleanPath);
            }
        }

        return \Illuminate\Support\Facades\Storage::url($cleanPath);
    };

    /*
    |--------------------------------------------------------------------------
    | Invoice Settings
    |--------------------------------------------------------------------------
    */

    $showLogo = ($salesInvoiceSetting['sales_invoice_show_logo'] ?? 'on') !== 'off';

    $customLogo = $salesInvoiceSetting['sales_invoice_logo'] ?? '';

    $companyLogo = $companySettings['company_logo'] ?? ($companySettings['logo_dark'] ?? '');

    $logoToUse = $customLogo ?: $companyLogo;

    $logoUrl = $showLogo && $logoToUse ? $getImagePath($logoToUse) : '';

    $enableLetterhead = ($salesInvoiceSetting['sales_invoice_enable_letterhead'] ?? 'off') === 'on';

    $bgLetterhead = $salesInvoiceSetting['sales_invoice_bg_letterhead'] ?? '';

    $bgLetterheadUrl = $enableLetterhead && $bgLetterhead ? $getImagePath($bgLetterhead) : '';

    /*
    |--------------------------------------------------------------------------
    | Currency
    |--------------------------------------------------------------------------
    */

    $currencyCode = $companySettings['defaultCurrency'] ?? '';

    $formatNumber = function ($amount) use ($companySettings) {
        $amount = is_numeric($amount) ? (float) $amount : 0;

        $decimalPlaces = (int) ($companySettings['decimalFormat'] ?? 2);

        $decimalSeparator = $companySettings['decimalSeparator'] ?? '.';

        $thousandsSeparator = $companySettings['thousandsSeparator'] ?? ',';

        $floatNumber = ($companySettings['floatNumber'] ?? '1') !== '0';

        $number = $floatNumber ? $amount : floor($amount);

        return number_format(
            $number,
            $decimalPlaces,
            $decimalSeparator,
            $thousandsSeparator === 'none' ? '' : $thousandsSeparator,
        );
    };

    $formatCurrency = function ($amount) use ($companySettings) {
        $amount = is_numeric($amount) ? (float) $amount : 0;

        $decimalPlaces = (int) ($companySettings['decimalFormat'] ?? 2);

        $decimalSeparator = $companySettings['decimalSeparator'] ?? '.';

        $thousandsSeparator = $companySettings['thousandsSeparator'] ?? ',';

        $floatNumber = ($companySettings['floatNumber'] ?? '1') !== '0';

        $symbolSpace = ($companySettings['currencySymbolSpace'] ?? '0') === '1';

        $symbolPosition = $companySettings['currencySymbolPosition'] ?? 'before';

        $number = $floatNumber ? $amount : floor($amount);

        $formatted = number_format(
            $number,
            $decimalPlaces,
            $decimalSeparator,
            $thousandsSeparator === 'none' ? '' : $thousandsSeparator,
        );

        $symbol = $companySettings['currencySymbol'] ?? '$';

        $space = $symbolSpace ? ' ' : '';

        return $symbolPosition === 'before' ? "{$symbol}{$space}{$formatted}" : "{$formatted}{$space}{$symbol}";
    };

    $getAmountFontSize = function ($amountStr, $defaultSize = 10) {
        $cleanStr = strip_tags((string) $amountStr);
        $len = mb_strlen($cleanStr);
        if ($len > 18) {
            return '7.5px';
        }
        if ($len > 15) {
            return '8.5px';
        }
        if ($len > 12) {
            return '9.5px';
        }
        return $defaultSize . 'px';
    };

    /*
    |--------------------------------------------------------------------------
    | Date
    |--------------------------------------------------------------------------
    */

    $formatDate = function ($date) use ($companySettings) {
        if (!$date) {
            return '';
        }

        $format = $companySettings['dateFormat'] ?? ($companySettings['date_format'] ?? 'Y-m-d');

        // Normalize JS format tokens (e.g., 'f' for short month) to PHP Carbon tokens ('M')
        $format = preg_replace('/\bf\b/', 'M', $format);

        try {
            if ($date instanceof \Carbon\Carbon || $date instanceof \DateTimeInterface) {
                return $date->format($format);
            }
            return \Carbon\Carbon::parse($date)->format($format);
        } catch (\Exception $e) {
            return (string) $date;
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Payment Status
    |--------------------------------------------------------------------------
    */

    $paidAmt = (float) ($invoice->paid_amount ?? 0);

    $totalAmt = (float) ($invoice->total_amount ?? 0);

    $statusText = strtolower($invoice->status ?? '');

    if ($statusText === 'paid' || ($totalAmt > 0 && $paidAmt >= $totalAmt)) {
        $badgeLabel = __('Paid');
        $badgeClasses = 'bg-emerald-100/90 text-emerald-800 border-emerald-300 shadow-sm';

        $stampText = 'PAID';
        $stampColor = '#16a34a';
        $stampBorder = '8px solid #16a34a';
        $stampFontSize = '68px';
    } elseif ($statusText === 'partial' || ($paidAmt > 0 && $paidAmt < $totalAmt)) {
        $badgeLabel = __('Partial Payment');
        $badgeClasses = 'bg-amber-100/90 text-amber-800 border-amber-300 shadow-sm';

        $stampText = 'PARTIALLY PAID';
        $stampColor = '#ca8a04';
        $stampBorder = '8px solid #ca8a04';
        $stampFontSize = '46px';
    } else {
        $badgeLabel = __('Due');
        $badgeClasses = 'bg-rose-100/90 text-rose-800 border-rose-300 shadow-sm';

        $stampText = 'DUE';
        $stampColor = '#dc2626';
        $stampBorder = '8px solid #dc2626';
        $stampFontSize = '72px';
    }

    /*
    |--------------------------------------------------------------------------
    | QR Code
    |--------------------------------------------------------------------------
    */

    $qrCodeSvg = '';

    try {
        $encryptedToken = \Illuminate\Support\Facades\Crypt::encryptString($invoice->id);

        $qrUrl = route('sales-invoice.client.view', $encryptedToken);

        $renderer = new \BaconQrCode\Renderer\ImageRenderer(
            new \BaconQrCode\Renderer\RendererStyle\RendererStyle(70, 0),
            new \BaconQrCode\Renderer\Image\SvgImageBackEnd(),
        );

        $writer = new \BaconQrCode\Writer($renderer);

        $qrCodeSvg = $writer->writeString($qrUrl);
    } catch (\Exception $e) {
        $qrCodeSvg = '';
    }

    /*
    |--------------------------------------------------------------------------
    | Payment Allocations
    |--------------------------------------------------------------------------
    */

    $allPaymentAllocations = $invoice->paymentAllocations ?? ($invoice->payment_allocations ?? collect());

    $paymentAllocations = collect($allPaymentAllocations)
        ->filter(function ($allocation) {
            $status = $allocation->payment->status ?? ($allocation->status ?? 'cleared');

            return strtolower($status) === 'cleared';
        })
        ->values();

    /*
    |--------------------------------------------------------------------------
    | Tax Breakdown
    |--------------------------------------------------------------------------
    */

    $taxBreakdown = [];

    foreach ($invoice->items ?? [] as $item) {
        if (!empty($item->taxes) && count($item->taxes) > 0) {
            $itemSubtotal = $item->quantity * $item->unit_price - ($item->discount_amount ?? 0);

            foreach ($item->taxes as $tax) {
                $taxName = $tax->tax_name ?: __('Tax');

                $taxRate = (float) $tax->tax_rate;

                $taxAmount = $itemSubtotal * ($taxRate / 100);

                $key = $taxName;

                if (!isset($taxBreakdown[$key])) {
                    $taxBreakdown[$key] = [
                        'name' => $taxName,
                        'amount' => 0,
                    ];
                }

                $taxBreakdown[$key]['amount'] += $taxAmount;
            }
        } elseif ((float) $item->tax_amount > 0 || (float) $item->tax_percentage > 0) {
            $key = __('Tax');

            if (!isset($taxBreakdown[$key])) {
                $taxBreakdown[$key] = [
                    'name' => __('Tax'),
                    'amount' => 0,
                ];
            }

            $taxBreakdown[$key]['amount'] += (float) $item->tax_amount;
        }
    }
@endphp

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>
        Invoice_{{ $invoice->invoice_number }}
    </title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap"
        rel="stylesheet">

    <script src="https://cdn.tailwindcss.com"></script>

    <style>
        * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family:
                'Open Sans',
                ui-sans-serif,
                system-ui,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                Roboto,
                "Helvetica Neue",
                Arial,
                sans-serif !important;
        }

        html,
        body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff;
            color: #1e293b;
            font-family:
                'Open Sans',
                ui-sans-serif,
                system-ui,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                Roboto,
                "Helvetica Neue",
                Arial,
                sans-serif !important;
        }

        @page {
            size: A4 portrait;
            margin: 0;
        }

        /*
        |--------------------------------------------------------------------------
        | A4 Page
        |--------------------------------------------------------------------------
        */

        .a4-page {
            position: relative;
            width: 210mm;
            height: 297mm;
            min-height: 297mm;
            max-height: 297mm;

            padding: 30mm 14mm;

            margin: 0 auto;

            background: #ffffff;

            overflow: hidden;

            page-break-after: always;
            break-after: page;

            page-break-inside: avoid;
            break-inside: avoid-page;
        }

        .a4-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
        }

        .letterhead-bg-layer {
            position: absolute;
            inset: 0;

            width: 100%;
            height: 100%;

            object-fit: cover;

            z-index: 0;

            pointer-events: none;
        }

        .a4-content {
            position: relative;
            z-index: 1;

            height: 100%;

            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .page-top {
            width: 100%;
        }

        .page-footer {
            width: 100%;
            flex-shrink: 0;
        }

        /*
        |--------------------------------------------------------------------------
        | Content
        |--------------------------------------------------------------------------
        */

        .page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .rich-content {
            word-wrap: break-word !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
        }

        .rich-content * {
            word-wrap: break-word !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
        }

        .rich-content ul {
            list-style-type: disc !important;
            margin-left: 1.25rem !important;
            padding-left: 0 !important;
            margin-top: 0.25rem !important;
            margin-bottom: 0.25rem !important;
        }

        .rich-content ol {
            list-style-type: decimal !important;
            margin-left: 1.25rem !important;
            padding-left: 0 !important;
            margin-top: 0.25rem !important;
            margin-bottom: 0.25rem !important;
        }

        .rich-content li {
            display: list-item !important;
            margin-top: 0.1rem !important;
            margin-bottom: 0.1rem !important;
        }

        .rich-content p {
            margin-top: 0.15rem !important;
            margin-bottom: 0.15rem !important;
        }

        .rich-content p:first-child {
            margin-top: 0 !important;
        }

        .rich-content p:last-child {
            margin-bottom: 0 !important;
        }

        .rich-content strong,
        .rich-content b {
            font-weight: 700 !important;
        }

        .rich-content em,
        .rich-content i {
            font-style: italic !important;
        }

        .rich-content u {
            text-decoration: underline !important;
        }

        .rich-content s,
        .rich-content strike {
            text-decoration: line-through !important;
        }

        table {
            table-layout: fixed !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
        }

        th,
        td {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
            box-sizing: border-box !important;
        }

        /*
        |--------------------------------------------------------------------------
        | Pagination
        |--------------------------------------------------------------------------
        */

        #invoice-source {
            display: none !important;
        }

        #invoice-pages {
            width: 100%;
        }

        .invoice-table {
            width: 100%;
            font-size: 10px;
            table-layout: fixed;
            border-collapse: collapse;
            border: 1px solid #94a3b8;
        }

        .invoice-table thead {
            display: table-header-group;
        }

        .invoice-table tbody tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }

        /*
        |--------------------------------------------------------------------------
        | Print
        |--------------------------------------------------------------------------
        */

        @media print {

            html,
            body {
                background: #ffffff !important;
            }

            .a4-page {
                width: 210mm !important;
                height: 297mm !important;
                min-height: 297mm !important;
                max-height: 297mm !important;

                margin: 0 !important;
                padding: 30mm 14mm !important;

                box-shadow: none !important;
            }

            .a4-page:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
            }
        }
    </style>
</head>

<body>

    {{-- ======================================================================
    SOURCE ROWS
    These rows are used by JavaScript to create real A4 pages.
    No estimated height calculation is used.
    ======================================================================= --}}

    <div id="invoice-source">

        <table>
            <tbody id="invoice-source-rows">

                @foreach ($invoice->items ?? [] as $i => $item)
                    @php
                        $unitName =
                            $item->product?->unitRelation?->unit_name ??
                            (!is_numeric($item->product?->unit) ? $item->product?->unit : '');

                        $itemDesc =
                            $item->description ??
                            ($item->product?->description ?? ($item->product?->long_description ?? ''));
                    @endphp

                    <tr data-item-row data-index="{{ $i }}">
                        <td
                            style="
                                                                padding: 6px 4px;
                                                                border: 1px solid #94a3b8;
                                                                text-align: center;
                                                                vertical-align: top;
                                                                color: #475569;
                                                            ">
                            {{ $i + 1 }}
                        </td>

                        <td
                            style="
                                                                padding: 6px 8px;
                                                                border: 1px solid #94a3b8;
                                                                vertical-align: top;
                                                            ">
                            <div
                                style="
                                                                    font-weight: 600;
                                                                    color: #0f172a;
                                                                    line-height: 1.25;
                                                                    font-size: 10px;
                                                                ">
                                {{ $item->product->name ?? '' }}
                            </div>
                        </td>

                        <td
                            style="
                                                                padding: 6px 8px;
                                                                border: 1px solid #94a3b8;
                                                                vertical-align: top;
                                                                color: #475569;
                                                                font-size: 9px;
                                                                line-height: 1.35;
                                                            ">
                            @if (!empty($itemDesc))
                                <div class="rich-content">
                                    {!! $itemDesc !!}
                                </div>
                            @else
                                <span style="color: #94a3b8;">
                                    -
                                </span>
                            @endif
                        </td>

                        <td
                            style="
                                                                padding: 6px 4px;
                                                                border: 1px solid #94a3b8;
                                                                text-align: center;
                                                                vertical-align: top;
                                                                color: #1e293b;
                                                                font-weight: 500;
                                                            ">
                            {{ $item->quantity }}
                        </td>

                        <td
                            style="
                                                                padding: 6px 8px;
                                                                border: 1px solid #94a3b8;
                                                                text-align: right;
                                                                vertical-align: top;
                                                                color: #1e293b;
                                                            ">
                            {{ $formatNumber($item->unit_price) }}
                        </td>

                        <td
                            style="
                                                                padding: 6px 8px;
                                                                border: 1px solid #94a3b8;
                                                                text-align: right;
                                                                vertical-align: top;
                                                                color: #1e293b;
                                                            ">
                            @if (($item->discount_type ?? 'percentage') === 'fixed')
                                @if ((float) ($item->discount_amount ?? 0) > 0)
                                    <div style="font-weight: 500;">
                                        {{ $formatNumber($item->discount_amount) }}
                                    </div>
                                @else
                                    <span>-</span>
                                @endif
                            @else
                                @if ($item->discount_percentage > 0)
                                    <div>
                                        {{ (float) $item->discount_percentage }}%
                                    </div>
                                    @if ((float) ($item->discount_amount ?? 0) > 0)
                                        <div style="font-size: 8.5px; color: #64748b;">
                                            {{ $formatNumber($item->discount_amount) }}
                                        </div>
                                    @endif
                                @else
                                    <span>-</span>
                                @endif
                            @endif
                        </td>

                        <td
                            style="
                                                                padding: 6px 8px;
                                                                border: 1px solid #94a3b8;
                                                                text-align: right;
                                                                vertical-align: top;
                                                                color: #1e293b;
                                                            ">
                            @if (!empty($item->taxes) && count($item->taxes) > 0)
                                @foreach ($item->taxes as $tax)
                                    <div
                                        style="
                                                                                                                                            line-height: 1.25;
                                                                                                                                            color: #475569;
                                                                                                                                            font-size: 9px;
                                                                                                                                        ">
                                        {{ $tax->tax_name }}
                                        ({{ $tax->tax_rate }}%)
                                    </div>
                                @endforeach
                            @elseif($item->tax_percentage > 0)
                                <div
                                    style="
                                                                                                        color: #475569;
                                                                                                        font-size: 9px;
                                                                                                    ">
                                    {{ $item->tax_percentage }}%
                                </div>
                            @else
                                <span style="color: #94a3b8;">
                                    -
                                </span>
                            @endif
                        </td>

                        <td
                            style="
                                                                padding: 6px 8px;
                                                                border: 1px solid #94a3b8;
                                                                text-align: right;
                                                                vertical-align: top;
                                                                font-weight: 600;
                                                                color: #0f172a;
                                                            ">
                            {{ $formatNumber($item->total_amount) }}
                        </td>
                    </tr>
                @endforeach

            </tbody>
        </table>

    </div>


    {{-- ======================================================================
    FIRST PAGE HEADER TEMPLATE
    ======================================================================= --}}

    <template id="invoice-first-header">

        <div class="header-flex-container flex justify-between items-start mb-5">

            <div class="w-1/2 relative">

                @if ($showLogo && $logoUrl)
                    <div class="mb-2"
                        style="
                                                            position: absolute;
                                                            top: -75px;
                                                            left: 0;
                                                        ">
                        <img src="{{ $logoUrl }}" alt="Logo" class="max-h-14 max-w-[200px] object-contain">
                    </div>
                @endif

                @if (!empty($salesInvoiceSetting['company_name']) || !empty($companySettings['company_name']))
                    <h1
                        class="
                                                                                                                            text-xl
                                                                                                                            sm:text-2xl
                                                                                                                            font-bold
                                                                                                                            mb-1.5
                                                                                                                            text-gray-900
                                                                                                                            leading-tight
                                                                                                                        ">
                        {{ $salesInvoiceSetting['company_name'] ?? $companySettings['company_name'] }}
                    </h1>
                @endif

                <div
                    class="
                        text-xs
                        space-y-0.5
                        text-gray-600
                    ">

                    @if (!empty($companySettings['company_address']))
                        <p>
                            {{ $companySettings['company_address'] }}
                        </p>
                    @endif

                    @if (
                        !empty($companySettings['company_city']) ||
                            !empty($companySettings['company_state']) ||
                            !empty($companySettings['company_zipcode']))
                        <p>
                            {{ $companySettings['company_city'] ?? '' }}
                            {{ !empty($companySettings['company_state']) ? ', ' . $companySettings['company_state'] : '' }}
                            {{ $companySettings['company_zipcode'] ?? '' }}
                        </p>
                    @endif

                    @if (!empty($companySettings['company_country']))
                        <p>
                            {{ $companySettings['company_country'] }}
                        </p>
                    @endif

                    @if (!empty($companySettings['company_telephone']))
                        <p>
                            {{ __('Phone') }}:
                            {{ $companySettings['company_telephone'] }}
                        </p>
                    @endif

                    @if (!empty($companySettings['company_email']))
                        <p>
                            {{ __('Email') }}:
                            {{ $companySettings['company_email'] }}
                        </p>
                    @endif

                </div>

            </div>


            <div
                class="
                    w-1/2
                    flex
                    items-start
                    justify-end
                    gap-4
                    text-right
                ">

                @if (!empty($qrCodeSvg))
                    <div
                        class="
                                                            shrink-0
                                                            p-1.5
                                                            bg-white
                                                            border
                                                            border-slate-300
                                                            rounded
                                                            shadow-sm
                                                            inline-block
                                                            self-center
                                                        ">
                        <div
                            class="
                                                                w-24
                                                                h-24
                                                                [&>svg]:w-full
                                                                [&>svg]:h-full
                                                            ">
                            {!! $qrCodeSvg !!}
                        </div>
                    </div>
                @endif

                <div>

                    <div
                        class="
                            flex
                            items-center
                            justify-end
                            gap-2.5
                            mb-1
                        ">
                        <h2
                            class="
                                text-2xl
                                font-extrabold
                                text-gray-900
                                tracking-tight
                            ">
                            {{ __('INVOICE') }}
                        </h2>
                    </div>

                    <p
                        class="
                            text-sm
                            font-semibold
                            text-gray-800
                        ">
                        #{{ $invoice->invoice_number }}
                    </p>

                    <div
                        class="
                            text-xs
                            mt-2
                            space-y-0.5
                            text-gray-600
                        ">
                        <p>
                            <span class="font-medium text-gray-700">
                                {{ __('Date') }}:
                            </span>

                            {{ $formatDate($invoice->invoice_date) }}
                        </p>

                        <p>
                            <span class="font-medium text-gray-700">
                                {{ __('Due') }}:
                            </span>

                            {{ $formatDate($invoice->due_date) }}
                        </p>
                    </div>

                </div>

            </div>

        </div>


        {{-- Customer Information --}}

        <div
            class="
                flex
                justify-between
                mb-5
                pt-3
                border-t
                border-gray-200
            ">

            <div class="w-1/2">

                <h3
                    class="
                        font-bold
                        text-xs
                        uppercase
                        mb-1.5
                        text-gray-900
                        tracking-wider
                    ">
                    {{ __('BILL TO') }}
                </h3>

                <div
                    class="
                        text-xs
                        space-y-0.5
                        text-gray-700
                    ">

                    <p
                        class="
                            font-semibold
                            text-gray-900
                        ">
                        {{ $invoice->customer->customer_name ?? ($invoice->customer_name ?? '-') }}
                    </p>

                    @if (!empty($invoice->customer->customer_phone ?? $invoice->customer_phone))
                        <p class="flex items-center gap-1.5 text-gray-700">
                            <svg class="w-3 h-3 text-gray-500 shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.062 1.062 0 00-.38 1.21 12.035 12.035 0 007.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293a1.125 1.125 0 011.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clip-rule="evenodd" />
                            </svg>
                            <span>{{ $invoice->customer->customer_phone ?? $invoice->customer_phone }}</span>
                        </p>
                    @endif

                    @if (!empty($invoice->customer->customer_email ?? $invoice->customer_email))
                        <p class="flex items-center gap-1.5 text-gray-700">
                            <svg class="w-3 h-3 text-gray-500 shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                                <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                            </svg>
                            <span>{{ $invoice->customer->customer_email ?? $invoice->customer_email }}</span>
                        </p>
                    @endif

                    @if (!empty($invoice->customerDetails?->billing_address))
                        <p class="flex items-start gap-1.5 text-gray-700">
                            <svg class="w-3 h-3 text-gray-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                            </svg>
                            <span>
                                @if (!empty($invoice->customerDetails->billing_address['name']))
                                    {{ $invoice->customerDetails->billing_address['name'] }}<br>
                                @endif
                                @if (!empty($invoice->customerDetails->billing_address['address_line_1']))
                                    {{ $invoice->customerDetails->billing_address['address_line_1'] }}<br>
                                @endif
                                {{ $invoice->customerDetails->billing_address['city'] ?? '' }}
                                {{ !empty($invoice->customerDetails->billing_address['state'])
                                    ? ', ' . $invoice->customerDetails->billing_address['state']
                                    : '' }}
                                {{ $invoice->customerDetails->billing_address['zip_code'] ?? '' }}
                            </span>
                        </p>
                    @elseif(!empty($invoice->customer_address))
                        <p class="flex items-start gap-1.5 whitespace-pre-line text-gray-700">
                            <svg class="w-3 h-3 text-gray-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                            </svg>
                            <span>{{ $invoice->customer_address }}</span>
                        </p>
                    @endif
                </div>
                    @endif

                </div>

            </div>


            <div class="text-right w-1/2">

                <h3
                    class="
                        font-bold
                        text-xs
                        uppercase
                        mb-1.5
                        text-gray-900
                        tracking-wider
                    ">
                    {{ __('SHIP TO') }}
                </h3>

                <div
                    class="
                        text-xs
                        space-y-0.5
                        text-gray-700
                    ">

                    @if (!empty($invoice->customerDetails?->shipping_address))
                        <p
                            class="
                                                                                                                                                                                                font-semibold
                                                                                                                                                                                                text-gray-900
                                                                                                                                                                                            ">
                            {{ $invoice->customerDetails->shipping_address['name'] ?? '' }}
                        </p>

                        <p>
                            {{ $invoice->customerDetails->shipping_address['address_line_1'] ?? '' }}
                        </p>

                        <p>
                            {{ $invoice->customerDetails->shipping_address['city'] ?? '' }}
                            {{ !empty($invoice->customerDetails->shipping_address['state'])
                                ? ', ' . $invoice->customerDetails->shipping_address['state']
                                : '' }}
                            {{ $invoice->customerDetails->shipping_address['zip_code'] ?? '' }}
                        </p>
                    @else
                        <p class="text-gray-500">
                            {{ __('Same as billing address') }}
                        </p>
                    @endif

                </div>

            </div>

        </div>

    </template>


    {{-- ======================================================================
    COMPACT HEADER TEMPLATE
    ======================================================================= --}}

    <template id="invoice-compact-header">

        <div
            class="
                relative
                flex
                justify-between
                items-center
                mb-4
                pb-2
                border-b
                border-gray-200
            ">

            @if ($showLogo && $logoUrl)
                <div class="mb-2"
                    style="
                        position: absolute;
                        top: -75px;
                        left: 0;
                    ">
                    <img src="{{ $logoUrl }}" alt="Logo" class="max-h-14 max-w-[200px] object-contain">
                </div>
            @endif

            <div>
                <span
                    class="
                        font-bold
                        text-sm
                        text-gray-900
                    ">
                    {{ __('INVOICE') }}:
                    #{{ $invoice->invoice_number }}
                </span>
            </div>

            <div class="
                    text-xs
                    text-gray-600
                ">
                <span>
                    {{ __('Date') }}:
                    {{ $formatDate($invoice->invoice_date) }}
                </span>

                |

                <span>
                    {{ __('Customer') }}:
                    {{ $invoice->customer->customer_name ?? ($invoice->customer_name ?? '') }}
                </span>
            </div>

        </div>

    </template>


    {{-- ======================================================================
    TABLE HEADER TEMPLATE
    ======================================================================= --}}

    <template id="invoice-table-head">

        <tr
            style="
                background-color: #e2e8f0;
                color: #0f172a;
                font-weight: 700;
            ">

            <th
                style="
                    padding: 6px 4px;
                    border: 1px solid #94a3b8;
                    text-align: center;
                    font-size: 9.5px;
                    width: 5%;
                ">
                {{ __('S/N') }}
            </th>

            <th
                style="
                    padding: 6px 8px;
                    border: 1px solid #94a3b8;
                    text-align: left;
                    font-size: 9.5px;
                    width: 16%;
                ">
                {{ __('Item/Service') }}
            </th>

            <th
                style="
                    padding: 6px 8px;
                    border: 1px solid #94a3b8;
                    text-align: left;
                    font-size: 9.5px;
                    width: 29%;
                ">
                {{ __('Description') }}
            </th>

            <th
                style="
                    padding: 6px 4px;
                    border: 1px solid #94a3b8;
                    text-align: center;
                    font-size: 9.5px;
                    width: 6%;
                ">
                {{ __('Qty') }}
            </th>

            <th
                style="
                    padding: 6px 8px;
                    border: 1px solid #94a3b8;
                    text-align: right;
                    font-size: 9.5px;
                    width: 11%;
                ">
                {{ __('Price') }}{{ $currencyCode ? ' (' . $currencyCode . ')' : '' }}
            </th>

            <th
                style="
                    padding: 6px 8px;
                    border: 1px solid #94a3b8;
                    text-align: right;
                    font-size: 9.5px;
                    width: 10%;
                ">
                {{ __('Discount') }}
            </th>

            <th
                style="
                    padding: 6px 8px;
                    border: 1px solid #94a3b8;
                    text-align: right;
                    font-size: 9.5px;
                    width: 10%;
                ">
                {{ __('Tax/VAT') }}
            </th>

            <th
                style="
                    padding: 6px 8px;
                    border: 1px solid #94a3b8;
                    text-align: right;
                    font-size: 9.5px;
                    width: 13%;
                ">
                {{ __('Total') }}{{ $currencyCode ? ' (' . $currencyCode . ')' : '' }}
            </th>

        </tr>

    </template>


    {{-- ======================================================================
    SUMMARY TEMPLATE
    ======================================================================= --}}

    <template id="invoice-summary">

        <tfoot>

            <tr class="page-break-inside-avoid">

                <td colspan="5" style="border: 1px solid #94a3b8;"></td>

                <td
                    colspan="2"
                    style="
                        padding: 5px 8px;
                        font-weight: 600;
                        color: #475569;
                        border: 1px solid #94a3b8;
                        text-align: right;
                    ">
                    {{ __('Subtotal') }}:
                </td>

                <td
                    class="summary-amount-cell"
                    style="
                        padding: 5px 8px;
                        text-align: right;
                        font-weight: 600;
                        color: #1e293b;
                        border: 1px solid #94a3b8;
                        font-size: {{ $getAmountFontSize($formatNumber($invoice->subtotal), 10) }};
                        white-space: nowrap;
                    ">
                    {{ $formatNumber($invoice->subtotal) }}
                </td>

            </tr>


            @if ($invoice->discount_amount > 0)
                <tr class="page-break-inside-avoid">

                    <td colspan="5" style="border: 1px solid #94a3b8;"></td>

                    <td
                        colspan="2"
                        style="
                                                            padding: 5px 8px;
                                                            font-weight: 600;
                                                            color: #475569;
                                                            border: 1px solid #94a3b8;
                                                            text-align: right;
                                                        ">
                        {{ __('Discount') }}:
                    </td>

                    <td
                        class="summary-amount-cell"
                        style="
                                                            padding: 5px 8px;
                                                            text-align: right;
                                                            font-weight: 600;
                                                            border: 1px solid #94a3b8;
                                                            font-size: {{ $getAmountFontSize('-' . $formatNumber($invoice->discount_amount), 10) }};
                                                            white-space: nowrap;
                                                        ">
                        {{'(-) ' . $formatNumber($invoice->discount_amount) }}
                    </td>

                </tr>
            @endif


            @if (!empty($taxBreakdown))

                @foreach ($taxBreakdown as $taxInfo)
                    @if ($taxInfo['amount'] > 0)
                        <tr class="page-break-inside-avoid">

                            <td colspan="5" style="border: 1px solid #94a3b8;"></td>

                            <td
                                colspan="2"
                                style="
                                                                                                                                    padding: 5px 8px;
                                                                                                                                    font-weight: 600;
                                                                                                                                    color: #475569;
                                                                                                                                    border: 1px solid #94a3b8;
                                                                                                                                    text-align: right;
                                                                                                                                ">
                                {{ $taxInfo['name'] }}:
                            </td>

                            <td
                                class="summary-amount-cell"
                                style="
                                                                                                                                    padding: 5px 8px;
                                                                                                                                    text-align: right;
                                                                                                                                    font-weight: 600;
                                                                                                                                    color: #1e293b;
                                                                                                                                    border: 1px solid #94a3b8;
                                                                                                                                    font-size: {{ $getAmountFontSize($formatNumber($taxInfo['amount']), 10) }};
                                                                                                                                    white-space: nowrap;
                                                                                                                                ">
                                {{'(+) ' . $formatNumber($taxInfo['amount']) }}
                            </td>

                        </tr>
                    @endif
                @endforeach
            @elseif($invoice->tax_amount > 0)
                <tr class="page-break-inside-avoid">

                    <td colspan="5" style="border: 1px solid #94a3b8;"></td>

                    <td
                        colspan="2"
                        style="
                                                            padding: 5px 8px;
                                                            font-weight: 600;
                                                            color: #475569;
                                                            border: 1px solid #94a3b8;
                                                            text-align: right;
                                                        ">
                        {{ __('Tax') }}:
                    </td>

                    <td
                        class="summary-amount-cell"
                        style="
                                                            padding: 5px 8px;
                                                            text-align: right;
                                                            font-weight: 600;
                                                            color: #1e293b;
                                                            border: 1px solid #94a3b8;
                                                            font-size: {{ $getAmountFontSize($formatNumber($invoice->tax_amount), 10) }};
                                                            white-space: nowrap;
                                                        ">
                        {{'(+) '. $formatNumber($invoice->tax_amount) }}
                    </td>

                </tr>

            @endif


            <tr class="page-break-inside-avoid" style="font-weight: 700;">

                <td colspan="5" style="border: 1px solid #94a3b8;"></td>

                <td
                    colspan="2"
                    style="
                        padding: 6px 8px;
                        font-size: 11px;
                        color: #0f172a;
                        border: 1px solid #94a3b8;
                        text-align: right;
                    ">
                    {{ __('Total') }}:
                </td>

                <td
                    class="summary-amount-cell"
                    style="
                        padding: 6px 8px;
                        font-size: {{ $getAmountFontSize($formatNumber($invoice->total_amount), 11) }};
                        text-align: right;
                        color: #0f172a;
                        border: 1px solid #94a3b8;
                        white-space: nowrap;
                    ">
                    {{ $formatNumber($invoice->total_amount) }}
                </td>

            </tr>


            @if (($invoice->paid_amount ?? 0) > 0 && ($invoice->balance_amount ?? 0) > 0)
                <tr class="page-break-inside-avoid">

                    <td colspan="5" style="border: 1px solid #94a3b8;"></td>

                    <td
                        colspan="2"
                        style="
                                                            padding: 5px 8px;
                                                            font-weight: 600;
                                                            color: #475569;
                                                            border: 1px solid #94a3b8;
                                                            text-align: right;
                                                        ">
                        {{ __('Paid Amount') }}:
                    </td>

                    <td
                        class="summary-amount-cell"
                        style="
                                                            padding: 5px 8px;
                                                            text-align: right;
                                                            font-weight: 600;
                                                            color: #1e293b;
                                                            border: 1px solid #94a3b8;
                                                            font-size: {{ $getAmountFontSize($formatNumber($invoice->paid_amount), 10) }};
                                                            white-space: nowrap;
                                                        ">
                        {{ $formatNumber($invoice->paid_amount) }}
                    </td>

                </tr>


                <tr class="page-break-inside-avoid" style="font-weight: 700;">

                    <td colspan="5" style="border: 1px solid #94a3b8;"></td>

                    <td
                        colspan="2"
                        style="
                                                            padding: 5px 8px;
                                                            font-size: 10.5px;
                                                            color: #0f172a;
                                                            border: 1px solid #94a3b8;
                                                            text-align: right;
                                                        ">
                        {{ __('Balance Due') }}:
                    </td>

                    <td
                        class="summary-amount-cell"
                        style="
                                                            padding: 5px 8px;
                                                            font-size: {{ $getAmountFontSize($formatNumber($invoice->balance_amount), 10.5) }};
                                                            text-align: right;
                                                            color: #0f172a;
                                                            border: 1px solid #94a3b8;
                                                            white-space: nowrap;
                                                        ">
                        {{ $formatNumber($invoice->balance_amount) }}
                    </td>

                </tr>
            @endif

        </tfoot>

    </template>


    {{-- ======================================================================
    PAYMENT SUMMARY TEMPLATE
    ======================================================================= --}}

    @if (count($paymentAllocations) > 0)

        <template id="invoice-payment-summary">

            <div class="mb-4 mt-6 payment-summary-wrapper page-break-inside-avoid">

                <div
                    style="
                                                        font-size: 10px;
                                                        font-weight: 700;
                                                        color: #0f172a;
                                                        margin-bottom: 4px;
                                                        text-transform: uppercase;
                                                        letter-spacing: 0.05em;
                                                    ">
                    {{ __('Payment Summary') }}
                </div>


                <table
                    style="
                                                        width: 100%;
                                                        font-size: 10px;
                                                        table-layout: fixed;
                                                        border-collapse: collapse;
                                                        border: 1px solid #94a3b8;
                                                    ">

                    <thead>

                        <tr
                            style="
                                                                background-color: #e2e8f0;
                                                                color: #0f172a;
                                                                font-weight: 700;
                                                            ">

                            <th
                                style="
                                                                    padding: 6px 4px;
                                                                    border: 1px solid #94a3b8;
                                                                    text-align: center;
                                                                    font-size: 9.5px;
                                                                    width: 6%;
                                                                ">
                                {{ __('SN') }}
                            </th>

                            <th
                                style="
                                                                    padding: 6px 8px;
                                                                    border: 1px solid #94a3b8;
                                                                    text-align: left;
                                                                    font-size: 9.5px;
                                                                    width: 26%;
                                                                ">
                                {{ __('Payment Date') }}
                            </th>

                            <th
                                style="
                                                                    padding: 6px 8px;
                                                                    border: 1px solid #94a3b8;
                                                                    text-align: left;
                                                                    font-size: 9.5px;
                                                                    width: 44%;
                                                                ">
                                {{ __('Payment Method') }}
                            </th>

                            <th
                                style="
                                                                    padding: 6px 8px;
                                                                    border: 1px solid #94a3b8;
                                                                    text-align: right;
                                                                    font-size: 9.5px;
                                                                    width: 24%;
                                                                ">
                                {{ __('Allocated Amount') }}
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        @foreach ($paymentAllocations as $pIdx => $alloc)
                            @php
                                $payment = $alloc->payment ?? null;

                                $bankAccount = $payment?->bankAccount ?? ($payment?->bank_account ?? null);

                                $method = !empty($bankAccount?->account_name)
                                    ? $bankAccount->account_name .
                                        (!empty($bankAccount->account_number)
                                            ? ' (' . $bankAccount->account_number . ')'
                                            : '')
                                    : ($payment?->payment_method ?:
                                    '-');

                                $paymentDate = $payment?->payment_date ?: $alloc->created_at;
                            @endphp

                            <tr class="page-break-inside-avoid">

                                <td
                                    style="
                                                                                                                                                                        padding: 6px 4px;
                                                                                                                                                                        border: 1px solid #94a3b8;
                                                                                                                                                                        text-align: center;
                                                                                                                                                                        vertical-align: top;
                                                                                                                                                                        color: #475569;
                                                                                                                                                                    ">
                                    {{ $pIdx + 1 }}
                                </td>

                                <td
                                    style="
                                                                                                                                                                        padding: 6px 8px;
                                                                                                                                                                        border: 1px solid #94a3b8;
                                                                                                                                                                        vertical-align: top;
                                                                                                                                                                        color: #475569;
                                                                                                                                                                    ">
                                    {{ $formatDate($paymentDate) }}
                                </td>

                                <td
                                    style="
                                                                                                                                                                        padding: 6px 8px;
                                                                                                                                                                        border: 1px solid #94a3b8;
                                                                                                                                                                        vertical-align: top;
                                                                                                                                                                        color: #0f172a;
                                                                                                                                                                        font-weight: 500;"> {{ $method }}</td>

                                <td style="padding: 6px 8px;border: 1px solid #94a3b8;text-align: right;vertical-align: top;font-weight: 600;color: #0f172a;">
                                    {{ $formatCurrency($alloc->allocated_amount ?? 0) }}
                                </td>

                            </tr>
                        @endforeach

                    </tbody>

                </table>

            </div>

        </template>

    @endif


    {{-- ======================================================================
    LAST PAGE FOOTER TEMPLATE
    ======================================================================= --}}

    <template id="invoice-footer">

        <div>

            @if ($invoice->payment_terms)
                <div
                    class="
                                                        pt-2
                                                        text-xs
                                                        text-gray-600
                                                        page-break-inside-avoid
                                                    ">
                    <span
                        class="
                                                            font-semibold
                                                            text-gray-800
                                                        ">
                        {{ __('TERMS & CONDITIONS') }}:
                    </span>
                </div>

                <div
                    class="
                                                        pt-2
                                                        mb-2
                                                        text-xs
                                                        text-gray-600
                                                        page-break-inside-avoid
                                                    ">
                    <div
                        class="
                                                            rich-content
                                                            text-gray-600
                                                            inline-block
                                                        ">
                        {!! $invoice->payment_terms !!}
                    </div>
                </div>
            @endif


            <div
                class="
                    border-t
                    border-gray-300
                    pt-2
                    text-center
                    text-xs
                    text-gray-500
                    page-break-inside-avoid
                ">
                <span>
                    {{ __('Thank you for your business!') }}
                </span>
            </div>

        </div>

    </template>


    {{-- ======================================================================
    GENERATED A4 PAGES
    ======================================================================= --}}

    <div id="invoice-pages"></div>


    {{-- ======================================================================
    PAYMENT STAMP
    ======================================================================= --}}

    <script>
        (() => {
            const sourceRows =
                Array.from(
                    document.querySelectorAll(
                        '#invoice-source-rows > tr[data-item-row]'
                    )
                );

            const pages =
                document.getElementById('invoice-pages');

            const firstHeader =
                document.getElementById(
                    'invoice-first-header'
                );

            const compactHeader =
                document.getElementById(
                    'invoice-compact-header'
                );

            const tableHead =
                document.getElementById(
                    'invoice-table-head'
                );

            const summary =
                document.getElementById(
                    'invoice-summary'
                );

            const paymentSummary =
                document.getElementById(
                    'invoice-payment-summary'
                );

            const footer =
                document.getElementById(
                    'invoice-footer'
                );

            if (!pages) {
                return;
            }

            /*
            |--------------------------------------------------------------------------
            | Create Page
            |--------------------------------------------------------------------------
            */

            function createPage(first = false) {
                const page =
                    document.createElement('div');

                page.className = 'a4-page';

                @if ($bgLetterheadUrl)
                    page.innerHTML = `
                                                        <img
                                                            src="{{ $bgLetterheadUrl }}"
                                                            alt="Letterhead Background"
                                                            class="letterhead-bg-layer"
                                                        >
                                                    `;
                @endif

                const content =
                    document.createElement('div');

                content.className =
                    'a4-content';

                const top =
                    document.createElement('div');

                top.className =
                    'page-top';

                const header =
                    first ?
                    firstHeader.content.cloneNode(true) :
                    compactHeader.content.cloneNode(true);

                top.appendChild(header);

                const table =
                    document.createElement('table');

                table.className =
                    'invoice-table';

                const thead =
                    document.createElement('thead');

                thead.appendChild(
                    tableHead.content
                    .cloneNode(true)
                );

                const tbody =
                    document.createElement('tbody');

                table.appendChild(thead);
                table.appendChild(tbody);

                top.appendChild(table);

                const bottom =
                    document.createElement('div');

                bottom.className =
                    'page-footer';

                content.appendChild(top);
                content.appendChild(bottom);

                page.appendChild(content);

                const stamp =
                    document.createElement('div');

                stamp.style.cssText = `
                    font-size: {{ $stampFontSize }};
                    color: {{ $stampColor }};
                    position: absolute;
                    bottom: 25%;
                    left: 50%;
                    transform: translateX(-50%) rotate(-25deg);
                    opacity: 0.22;
                    text-transform: uppercase;
                    border: {{ $stampBorder }};
                    padding: 0 24px;
                    font-weight: 800;
                    letter-spacing: 3px;
                    pointer-events: none;
                    z-index: 10;
                    white-space: nowrap;
                    user-select: none;
                    font-family: 'Open Sans', sans-serif;
                `;

                stamp.textContent =
                    '{{ $stampText }}';

                page.appendChild(stamp);

                pages.appendChild(page);

                return {
                    page,
                    content,
                    top,
                    bottom,
                    table,
                    tbody,
                };
            }

            /*
            |--------------------------------------------------------------------------
            | Check Page Height
            |--------------------------------------------------------------------------
            */

            function getHeight(page) {
                return page.top.getBoundingClientRect().height;
            }

            function getAvailableHeight(page) {
                return (
                    page.content.getBoundingClientRect().height -
                    page.bottom.getBoundingClientRect().height
                );
            }

            function fits(page) {
                return (
                    getHeight(page) <=
                    getAvailableHeight(page) + 1
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Add Row
            |--------------------------------------------------------------------------
            */

            function addRow(page, sourceRow) {
                const row =
                    sourceRow.cloneNode(true);

                page.tbody.appendChild(row);

                return row;
            }

            /*
            |--------------------------------------------------------------------------
            | Remove Last Row
            |--------------------------------------------------------------------------
            */

            function removeLastRow(page) {
                const row =
                    page.tbody.lastElementChild;

                if (!row) {
                    return null;
                }

                page.tbody.removeChild(row);

                return row;
            }

            /*
            |--------------------------------------------------------------------------
            | Split Description Row
            |--------------------------------------------------------------------------
            */

            function splitDescriptionRow(page, sourceRow) {
                const descContainer = sourceRow.querySelector('.rich-content');
                if (!descContainer) return null;

                const fullText = (descContainer.innerText || descContainer.textContent || '').trim();
                const wordCount = fullText ? fullText.split(/\s+/).length : 0;
                // Do not split small/medium descriptions; move the whole item to the next page instead
                if (fullText.length < 300 || wordCount < 45) {
                    return null;
                }

                const originalHtml = descContainer.innerHTML;
                const textNodes = [];

                // Collect all child elements or paragraphs
                const children = Array.from(descContainer.children);
                if (children.length > 1) {
                    // Try splitting by block elements (like <p>, <div>, <li>)
                    for (let i = children.length - 1; i >= 1; i--) {
                        const topPart = children.slice(0, i);
                        const bottomPart = children.slice(i);

                        descContainer.innerHTML = topPart.map(el => el.outerHTML).join('');
                        const row = addRow(page, sourceRow);

                        if (fits(page)) {
                            // First part fits on current page!
                            // Create continuation row for next page
                            const contRow = sourceRow.cloneNode(true);
                            const contDesc = contRow.querySelector('.rich-content');
                            contDesc.innerHTML = bottomPart.map(el => el.outerHTML).join('');

                            // Clear non-description columns for continuation row (to look like a split)
                            const cells = Array.from(contRow.children);
                            cells.forEach((cell, idx) => {
                                if (idx !==
                                    2) { // 2 is Description column index (0: SN, 1: ITEMS, 2: DESCRIPTION)
                                    cell.innerHTML = '';
                                }
                            });

                            return contRow;
                        } else {
                            page.tbody.removeChild(row);
                        }
                    }
                }

                // If block element split didn't work or single block, try word/text binary search split
                const words = fullText.split(/\s+/);
                if (words.length <= 3) {
                    descContainer.innerHTML = originalHtml;
                    return null;
                }

                let low = 1;
                let high = words.length - 1;
                let bestCount = 0;

                while (low <= high) {
                    const mid = Math.floor((low + high) / 2);
                    descContainer.textContent = words.slice(0, mid).join(' ') + '...';

                    const row = addRow(page, sourceRow);
                    const isFit = fits(page);
                    page.tbody.removeChild(row);

                    if (isFit) {
                        bestCount = mid;
                        low = mid + 1;
                    } else {
                        high = mid - 1;
                    }
                }

                if (bestCount > 0) {
                    descContainer.textContent = words.slice(0, bestCount).join(' ') + '...';
                    addRow(page, sourceRow);

                    const contRow = sourceRow.cloneNode(true);
                    const contDesc = contRow.querySelector('.rich-content');
                    contDesc.textContent = '...' + words.slice(bestCount).join(' ');

                    const cells = Array.from(contRow.children);
                    cells.forEach((cell, idx) => {
                        if (idx !== 2) cell.innerHTML = '';
                    });

                    return contRow;
                }

                descContainer.innerHTML = originalHtml;
                return null;
            }

            /*
            |--------------------------------------------------------------------------
            | Build Item Pages with Recursive/Multi-Page Description Splitting
            |--------------------------------------------------------------------------
            */

            function buildPages() {
                pages.innerHTML = '';

                const result = [];

                let page =
                    createPage(true);

                result.push(page);

                // Queue of rows to process (allows inserting continuation rows)
                const queue = sourceRows.map(r => r.cloneNode(true));
                let safetyCounter = 0;
                const maxSafety = sourceRows.length * 50 + 200;

                while (queue.length > 0) {
                    safetyCounter++;
                    if (safetyCounter > maxSafety) {
                        console.warn('Pagination safety limit reached.');
                        break;
                    }

                    const currentRow = queue.shift();
                    const addedNode = addRow(page, currentRow);

                    if (!fits(page)) {
                        page.tbody.removeChild(addedNode);

                        // Try splitting the description of currentRow on current page
                        const contRow = splitDescriptionRow(page, currentRow);

                        if (contRow) {
                            // Part 1 was added to current page inside splitDescriptionRow().
                            // Remaining Part 2 (contRow) goes to the front of queue to be processed on next page!
                            page = createPage(false);
                            result.push(page);
                            queue.unshift(contRow);
                        } else {
                            // If current page is NOT empty, move the whole row to a new page
                            if (page.tbody.children.length > 0) {
                                page = createPage(false);
                                result.push(page);
                                queue.unshift(currentRow);
                            } else {
                                // If page IS empty and split failed, force add row to prevent endless loop
                                addRow(page, currentRow);
                            }
                        }
                    }
                }

                return result;
            }

            /*
            |--------------------------------------------------------------------------
            | Add Last Page Content
            |--------------------------------------------------------------------------
            */

            function addSummaryContent(page) {
                if (summary) {
                    page.table.appendChild(
                        summary.content.cloneNode(true)
                    );
                }

                if (paymentSummary) {
                    page.top.appendChild(
                        paymentSummary.content.cloneNode(true)
                    );
                }
            }

            function addFooterContent(page) {
                if (footer) {
                    page.bottom.appendChild(
                        footer.content.cloneNode(true)
                    );
                }
            }

            function addLastPageContent(page) {
                addSummaryContent(page);
                addFooterContent(page);
            }

            /*
            |--------------------------------------------------------------------------
            | Make Last Page Fit & Smart Terms / Footer Page Push
            |--------------------------------------------------------------------------
            */

            function addLastPage() {
                let result =
                    buildPages();

                let last =
                    result[result.length - 1];

                // Step 1: Add only Summary & Payment Summary to current page first
                addSummaryContent(last);

                // If even Summary table alone causes the item page to overflow
                if (!fits(last)) {
                    // Remove summary/payment from overflowing page
                    const oldSummary = last.table.querySelector('tfoot');
                    if (oldSummary) oldSummary.remove();

                    const oldPayment = last.top.querySelector('.mb-4.page-break-inside-avoid');
                    if (oldPayment) oldPayment.remove();

                    // Summary table MUST NOT be alone on a page. Pop 1 row/split to accompany summary on new page
                    let movedRow = null;
                    if (last.tbody.children.length > 0) {
                        if (last.tbody.children.length === 1) {
                            const singleRow = last.tbody.firstElementChild;
                            const contRow = splitDescriptionRow(last, singleRow);
                            movedRow = contRow ? contRow : removeLastRow(last);
                        } else {
                            movedRow = removeLastRow(last);
                        }
                    }

                    const finalPage = createPage(false);
                    if (movedRow) {
                        addRow(finalPage, movedRow);
                    }

                    addSummaryContent(finalPage);
                    addFooterContent(finalPage);
                    result.push(finalPage);

                    if (last.tbody.children.length === 0 && result.length > 1) {
                        last.page.remove();
                        result = result.filter(p => p !== last);
                    }
                } else {
                    // Step 2: Summary table fits on current page! Now try adding Terms & Conditions / Footer
                    addFooterContent(last);

                    // If Terms & Conditions / Footer makes page overflow, move ONLY Terms/Footer to next page!
                    if (!fits(last)) {
                        last.bottom.innerHTML = ''; // Remove footer from current page

                        const termsPage = createPage(false);
                        // Since termsPage has no item rows, hide the empty item table/header
                        if (termsPage.tbody.children.length === 0) {
                            termsPage.table.style.display = 'none';
                        }
                        // Append footer content into top flow container (instead of page-footer) so it flows naturally
                        if (footer) {
                            termsPage.top.appendChild(
                                footer.content.cloneNode(true)
                            );
                        }
                        result.push(termsPage);
                    }
                }

                result.forEach((page, index) => {
                    // Check if payment summary is at the top of the page (no table rows above it or table is hidden)
                    const psWrapper = page.top.querySelector('.payment-summary-wrapper');
                    if (psWrapper) {
                        const hasItemsOnPage = page.table.style.display !== 'none' && page.tbody.children.length > 0;
                        if (!hasItemsOnPage) {
                            psWrapper.classList.remove('mt-6');
                            psWrapper.classList.add('mt-0');
                        }
                    }

                    page.page.style.pageBreakAfter =
                        index === result.length - 1 ?
                        'avoid' :
                        'always';
                });

                return result;
            }

            /*
            |--------------------------------------------------------------------------
            | Wait For Fonts / Images
            |--------------------------------------------------------------------------
            */

            async function waitForPage() {
                if (document.fonts?.ready) {
                    await document.fonts.ready;
                }

                const images =
                    Array.from(
                        document.images
                    );

                await Promise.all(
                    images.map((image) => {
                        if (image.complete) {
                            return Promise.resolve();
                        }

                        return new Promise((resolve) => {
                            image.addEventListener(
                                'load',
                                resolve, {
                                    once: true
                                }
                            );

                            image.addEventListener(
                                'error',
                                resolve, {
                                    once: true
                                }
                            );
                        });
                    })
                );

                await new Promise(
                    (resolve) =>
                    requestAnimationFrame(
                        () =>
                        requestAnimationFrame(
                            resolve
                        )
                    )
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Auto-fit Summary Amount Cells
            |--------------------------------------------------------------------------
            */

            function fitSummaryAmounts() {
                const cells = document.querySelectorAll('.summary-amount-cell');
                cells.forEach((cell) => {
                    let currentSize = parseFloat(window.getComputedStyle(cell).fontSize) || 10;
                    const minSize = 6;
                    while (cell.scrollWidth > cell.clientWidth && currentSize > minSize) {
                        currentSize -= 0.5;
                        cell.style.fontSize = currentSize + 'px';
                    }
                });
            }

            /*
            |--------------------------------------------------------------------------
            | Start
            |--------------------------------------------------------------------------
            */

            async function start() {
                await waitForPage();

                addLastPage();

                fitSummaryAmounts();

                await new Promise(
                    (resolve) =>
                    requestAnimationFrame(resolve)
                );

                window.invoicePagesReady = true;

                document.dispatchEvent(
                    new Event('invoice-pages-ready')
                );
            }

            start();
        })();
    </script>


    {{-- ======================================================================
    PRINT / PDF
    ======================================================================= --}}

    @if (empty($isServerPdf))
        <div id="downloading-loader"
            class="
                                                fixed
                                                inset-0
                                                bg-black
                                                bg-opacity-50
                                                flex
                                                items-center
                                                justify-center
                                                z-50
                                                hidden
                                            ">
            <div
                class="
                                                    bg-white
                                                    p-6
                                                    rounded-lg
                                                    shadow-lg
                                                ">
                <div
                    class="
                                                        flex
                                                        items-center
                                                        space-x-3
                                                    ">
                    <div
                        class="
                                                            animate-spin
                                                            rounded-full
                                                            h-6
                                                            w-6
                                                            border-b-2
                                                            border-blue-600
                                                        ">
                    </div>

                    <p
                        class="
                                                            text-lg
                                                            font-semibold
                                                            text-gray-700
                                                        ">
                        {{ __('Generating PDF...') }}
                    </p>
                </div>
            </div>
        </div>


        <script>
            window.addEventListener(
                'DOMContentLoaded',
                () => {
                    const startPrint =
                        () => {
                            const params =
                                new URLSearchParams(
                                    window.location.search
                                );

                            if (
                                params.get('download') ===
                                'pdf'
                            ) {
                                const loader =
                                    document.getElementById(
                                        'downloading-loader'
                                    );

                                if (loader) {
                                    loader.classList.remove(
                                        'hidden'
                                    );
                                }

                                window.location.href =
                                    "{{ route('sales-invoices.download-pdf', $invoice->id) }}";

                                return;
                            }

                            window.onafterprint = function() {
                                window.close();
                            };
                            window.print();
                        };

                    if (
                        window.invoicePagesReady
                    ) {
                        startPrint();

                        return;
                    }

                    document.addEventListener(
                        'invoice-pages-ready',
                        startPrint, {
                            once: true,
                        }
                    );
                }
            );
        </script>
    @endif

</body>

</html>

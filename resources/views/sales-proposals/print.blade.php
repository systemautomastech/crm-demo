@php
    $creatorId = $proposal->created_by ?? $proposal->creator_id ?? auth()->id();
    $proposalSetting = $proposalSetting ?? \App\Models\ProposalSetting::getSettings($creatorId);
    $templateColor = $proposalSetting['template_color'] ?? '#E9591C';

    $toDataUri = function ($fullFilePath) {
        if (!file_exists($fullFilePath) || !is_readable($fullFilePath)) {
            return null;
        }
        $mime = mime_content_type($fullFilePath) ?: 'image/jpeg';
        $data = file_get_contents($fullFilePath);
        return 'data:' . $mime . ';base64,' . base64_encode($data);
    };

    $getImagePath = function ($path) use ($toDataUri) {
        if (!$path)
            return '';

        $cleanPath = ltrim($path, '/');

        // Check local storage files first to convert to base64 (avoids HTTP deadlock during PDF rendering)
        $possibleLocalPaths = [
            storage_path('app/public/media/' . basename($cleanPath)),
            storage_path('app/public/' . $cleanPath),
            public_path('storage/media/' . basename($cleanPath)),
            public_path('storage/' . $cleanPath),
            public_path($cleanPath),
            public_path('uploads/' . $cleanPath),
        ];

        foreach ($possibleLocalPaths as $localPath) {
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

    $showLogo = isset($proposalSetting['show_logo'])
        ? in_array($proposalSetting['show_logo'], [1, '1', true, 'true'], true)
        : true;
    $rawLogo = $proposalSetting['logo_image'] ?? $proposalSetting['company_logo'] ?? '';
    $logoImage = $rawLogo ? $getImagePath($rawLogo) : asset('uploads/logo/logo_dark.png');
    $headerLogoUrl = ($showLogo && $rawLogo) ? $getImagePath($rawLogo) : '';
    $headerLogoAlign = $proposalSetting['header_logo_align'] ?? 'right';
    $headerLogoStyle = match ($headerLogoAlign) {
        'left' => 'left: 15mm; right: auto; justify-content: flex-start;',
        'center', 'middle' => 'left: 50%; right: auto; transform: translateX(-50%); justify-content: center;',
        default => 'right: 15mm; left: auto; justify-content: flex-end;',
    };

    $defaultBgImage = $proposalSetting['background_image'] ?? '';
    $getPageBgUrl = function ($customBg = null) use ($getImagePath, $defaultBgImage) {
        $activeBg = !empty($customBg) ? $customBg : $defaultBgImage;
        if ($activeBg) {
            return $getImagePath($activeBg);
        }
        return '';
    };
    $getPageBgStyle = function ($customBg = null) use ($getImagePath, $defaultBgImage) {
        $activeBg = !empty($customBg) ? $customBg : $defaultBgImage;
        if ($activeBg) {
            $url = $getImagePath($activeBg);
            return "background-image: url('{$url}') !important; background-size: 100% 100% !important; background-position: center !important; background-repeat: no-repeat !important;";
        }
        return '';
    };

    $companySettings = getCompanyAllSetting($creatorId);
    $currencySymbol = $companySettings['currencySymbol'] ?? '৳';
    $currencyCode = $companySettings['defaultCurrency'] ?? 'BDT';

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
        $symbol = $companySettings['currencySymbol'] ?? '৳';
        $space = $symbolSpace ? ' ' : '';
        return $symbolPosition === 'before' ? "{$symbol}{$space}{$formatted}" : "{$formatted}{$space}{$symbol}";
    };

    $companyName = $proposalSetting['company_name'] ?? company_setting('company_name', $creatorId) ?? '';
    $proposalNumber = $proposal->proposal_number;
    $pdfFilename = "Proposal For_{$proposal->subject}_({$proposal->proposal_number}).pdf";

    $replaceProposalShortcodes = function ($content) use ($proposal, $proposalSetting, $getImagePath, $logoImage, $templateColor, $creatorId, $formatCurrency) {
        if (empty($content))
            return '';
        $customer = $proposal->customer ?? null;
        $dateFormat = $proposalSetting['dateFormat'] ?? 'Y-m-d';

        $rawCompanyLogo = company_setting('logo_dark', $creatorId)
            ?? company_setting('logo_light', $creatorId)
            ?? company_setting('company_logo', $creatorId)
            ?? company_setting('logo', $creatorId)
            ?? admin_setting('logo_dark')
            ?? admin_setting('logo_light')
            ?? admin_setting('logo')
            ?? 'uploads/logo/logo_dark.png';
        $companyLogoUrl = $getImagePath($rawCompanyLogo) ?: asset('uploads/logo/logo_dark.png');
        $rawProposalLogo = $proposalSetting['logo_image'] ?? $rawCompanyLogo;
        $proposalLogoUrl = $getImagePath($rawProposalLogo) ?: $logoImage;

        $authorUserId = $proposal->creator_id ?? $proposal->created_by ?? $creatorId;
        $authorUser = \App\Models\User::with('employee.designation')->find($authorUserId);
        $employeeRecord = $authorUser?->employee;
        $compPhone = $proposalSetting['company_telephone']
            ?? $proposalSetting['company_phone']
            ?? company_setting('company_telephone', $creatorId)
            ?? company_setting('company_phone', $creatorId)
            ?? '';

        $custAddr = '';
        if (!empty($customer?->billing_address)) {
            if (is_array($customer->billing_address)) {
                $custAddr = trim(($customer->billing_address['address'] ?? $customer->billing_address['address_line_1'] ?? '') . ' ' . ($customer->billing_address['city'] ?? '') . ' ' . ($customer->billing_address['state'] ?? '') . ' ' . ($customer->billing_address['zip_code'] ?? ''));
            } else {
                $custAddr = (string) $customer->billing_address;
            }
        }

        $authorName = $authorUser?->name ?? 'Administrator';
        $authorDesignation = $employeeRecord?->designation?->name ?? $authorUser?->designation ?? 'Sales Representative';
        $authorEmail = $authorUser?->email ?? '';
        $authorPhone = $authorUser?->mobile_no ?? $authorUser?->phone ?? '';
        $authorId = $employeeRecord?->employee_id ?? ($authorUser?->id ?? '');

        $rawDate = $proposal->proposal_date ?? $proposal->invoice_date ?? null;
        $rawDueDate = $proposal->due_date ?? null;
        $proposalDateFormatted = $rawDate ? \Carbon\Carbon::parse($rawDate)->format('j F Y') : '';
        $proposalDueDateFormatted = $rawDueDate ? \Carbon\Carbon::parse($rawDueDate)->format('j F Y') : '';

        $values = [
            'company_name' => $proposalSetting['company_name'] ?? company_setting('company_name', $proposal->creator_id ?? $proposal->created_by) ?? config('app.name', 'Automas'),
            'company_email' => $proposalSetting['company_email'] ?? company_setting('company_email', $proposal->creator_id ?? $proposal->created_by) ?? '',
            'company_phone' => $compPhone,
            'company_telephone' => $compPhone,
            'company_address' => $proposalSetting['company_address'] ?? company_setting('company_address', $proposal->creator_id ?? $proposal->created_by) ?? '',
            'company_website' => $proposalSetting['company_website'] ?? company_setting('company_website', $proposal->creator_id ?? $proposal->created_by) ?? '',
            'proposal_number' => $proposal->proposal_number,
            'proposal_subject' => $proposal->subject,
            'subject' => $proposal->subject,
            'proposal_date' => $proposalDateFormatted,
            'date' => $proposalDateFormatted,
            'invoice_date' => $proposalDateFormatted,
            'proposal_due_date' => $proposalDueDateFormatted,
            'due_date' => $proposalDueDateFormatted,
            'valid_until' => $proposalDueDateFormatted,
            'customer_name' => $customer->customer_name ?? $proposal->customer_name ?? '',
            'customer_email' => $customer->customer_email ?? $proposal->customer_email ?? '',
            'customer_phone' => $customer->customer_phone ?? $proposal->customer_phone ?? '',
            'customer_address' => !empty($custAddr) ? $custAddr : ($proposal->customer_address ?? ''),
            'user_id' => $authorId,
            'user_name' => $authorName,
            'user_email' => $authorEmail,
            'user_phone' => $authorPhone,
            'creator_name' => $authorName,
            'creator_designation' => $authorDesignation,
            'creator_email' => $authorEmail,
            'creator_phone' => $authorPhone,
            'proposal_validity' => $proposal->payment_terms ?? '',
            'payment_terms' => $proposal->payment_terms ?? '',
            'terms' => $proposal->payment_terms ?? '',
            'subtotal' => !empty($proposal->subtotal) ? $formatCurrency($proposal->subtotal) : '',
            'sub_total' => !empty($proposal->subtotal) ? $formatCurrency($proposal->subtotal) : '',
            'tax_amount' => !empty($proposal->tax_amount) ? $formatCurrency($proposal->tax_amount) : '',
            'total_tax' => !empty($proposal->tax_amount) ? $formatCurrency($proposal->tax_amount) : '',
            'discount_amount' => !empty($proposal->discount_amount) ? $formatCurrency($proposal->discount_amount) : '',
            'total_discount' => !empty($proposal->discount_amount) ? $formatCurrency($proposal->discount_amount) : '',
            'total_amount' => !empty($proposal->total_amount) ? $formatCurrency($proposal->total_amount) : '',
            'total' => !empty($proposal->total_amount) ? $formatCurrency($proposal->total_amount) : '',
        ];

        $res = $content;

        // Ensure any embedded CSS variables match template color
        $res = preg_replace('/--sp-accent-color:\s*#[a-f0-9]{3,8}/i', '--sp-accent-color: ' . $templateColor, $res);

        // Handle attributes
        $res = preg_replace('/src=(["\'])\s*\{\s*company_logo\s*\}\s*\1/i', 'src=$1' . $companyLogoUrl . '$1', $res);
        $res = preg_replace('/src=(["\'])\s*\{\s*proposal_logo\s*\}\s*\1/i', 'src=$1' . $proposalLogoUrl . '$1', $res);

        // Handle standalone tags
        if ($companyLogoUrl) {
            $res = preg_replace('/\{\s*company_logo\s*\}/i', '<img src="' . $companyLogoUrl . '" alt="Company Logo" class="proposal-logo" style="display: inline-block !important; vertical-align: middle; max-height: 64px; max-width: 220px; object-fit: contain;" />', $res);
        } else {
            $res = preg_replace('/\{\s*company_logo\s*\}/i', '', $res);
        }

        if ($proposalLogoUrl) {
            $res = preg_replace('/\{\s*proposal_logo\s*\}/i', '<img src="' . $proposalLogoUrl . '" alt="Proposal Logo" class="proposal-logo" style="display: inline-block !important; vertical-align: middle; max-height: 64px; max-width: 220px; object-fit: contain;" />', $res);
        } else {
            $res = preg_replace('/\{\s*proposal_logo\s*\}/i', '', $res);
        }

        foreach ($values as $k => $v) {
            $valStr = ($v !== null && $v !== '') ? (string) $v : '';
            $res = preg_replace('/\{\s*' . preg_quote($k, '/') . '\s*\}/i', $valStr, $res);
        }
        return $res;
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
@endphp
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proposal For_{{ $proposal->subject }}_({{ $proposal->proposal_number }})</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap"
        rel="stylesheet">
    <style>
        :root {
            --template-color:
                {{ $templateColor }}
                !important;
            --sp-accent-color:
                {{ $templateColor }}
                !important;
            --sp-text-title: #111827;
            --sp-text-sub: #64748b;
            --sp-text-body: #334155;
            --sp-border: #cbd5e1;
            --sp-bg-light-1: #f9fafb;
            --sp-bg-light-2: #eef2f7;
        }

        * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        html,
        body {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100%;
            font-family: "Open Sans", sans-serif !important;
            color: #1e293b;
        }

        .print-container {
            width: 210mm;
            margin: 0 auto;
            padding: 0;
            background-color: #ffffff;
            font-family: "Open Sans", sans-serif !important;
        }

        .proposal-preview-sheet,
        .proposal-cover__sheet {
            width: 210mm;
            height: 297mm;
            min-height: 297mm;
            max-height: 297mm;
            background-color: #ffffff;
            margin: 0 auto;
            position: relative !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid-page;
        }

        .proposal-preview-sheet:last-child,
        .proposal-cover__sheet:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
        }

        .proposal-bg-layer {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
        }

        .proposal-bg-layer img {
            width: 100%;
            height: 100%;
            object-fit: fill;
            display: block;
        }

        .proposal-header-logo-container {
            position: absolute;
            top: 8mm;
            z-index: 20;
            pointer-events: none;
            display: flex;
            align-items: center;
            max-height: 20mm;
            max-width: 60mm;
        }

        .proposal-header-logo-container img,
        img.proposal-logo,
        .proposal-logo {
            display: inline-block !important;
            vertical-align: middle;
            max-height: 16mm;
            max-width: 55mm;
            object-fit: contain;
        }

        .proposal-page__body {
            position: relative !important;
            z-index: 1 !important;
            padding: 32mm 15mm 20mm !important;
            height: calc(297mm - 52mm) !important;
            min-height: calc(297mm - 52mm) !important;
            max-height: calc(297mm - 52mm) !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
        }

        .proposal-section-title {
            font-weight: 700;
            margin-top: 12px;
            margin-bottom: 6px;
            font-size: 13px;
            color: #293240;
        }

        .proposal-page__body> :first-child .proposal-section-title,
        .proposal-charges-wrapper:first-child .proposal-section-title {
            margin-top: 0;
        }

        /* Merged Proposal & HTML Table System */
        .proposal-table,
        .html-preview-container table {
            width: 100% !important;
            font-size: 10px !important;
            font-family: "Open Sans", sans-serif !important;
            line-height: 1.35 !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            border: 1px solid #cbd5e1 !important;
            margin-bottom: 8px !important;
        }

        .proposal-table thead tr,
        .html-preview-container table thead tr {
            background-color:
                {{ $templateColor }}
                !important;
            color: #ffffff !important;
        }

        .proposal-table thead th,
        .html-preview-container th {
            padding: 6px 8px !important;
            border: 1px solid #cbd5e1 !important;
            color: #ffffff !important;
            font-size: 10px !important;
            font-weight: 600 !important;
            font-family: "Open Sans", sans-serif !important;
            line-height: 1.35 !important;
            background-color:
                {{ $templateColor }}
                !important;
            box-sizing: border-box !important;
            vertical-align: middle !important;
        }

        .html-preview-container th * {
            margin: 0 !important;
            padding: 0 !important;
            font-size: 10px !important;
            font-weight: 600 !important;
            font-family: "Open Sans", sans-serif !important;
            line-height: 1.35 !important;
            color: #ffffff !important;
        }

        .proposal-table tbody td,
        .html-preview-container table td {
            border: 1px solid #cbd5e1 !important;
            color: #293240 !important;
            padding: 6px 8px !important;
            font-size: 10px !important;
            font-family: "Open Sans", sans-serif !important;
            line-height: 1.35 !important;
            vertical-align: middle !important;
            box-sizing: border-box !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
        }

        .html-preview-container table td * {
            margin: 0 !important;
            padding: 0 !important;
            font-size: 10px !important;
            font-family: "Open Sans", sans-serif !important;
            line-height: 1.35 !important;
            color: inherit !important;
        }

        .html-preview-container table td p+p {
            margin-top: 3px !important;
        }

        .proposal-table th.col-sn {
            width: 5%;
            text-align: center;
            padding: 6px 4px !important;
        }

        .proposal-table th.col-item {
            width: 15%;
            text-align: left;
        }

        .proposal-table th.col-desc {
            width: 25%;
            text-align: left;
        }

        .proposal-table th.col-qty {
            width: 6%;
            text-align: center;
            padding: 6px 4px !important;
        }

        .proposal-table th.col-price {
            width: 12%;
            text-align: right;
        }

        .proposal-table th.col-discount {
            width: 12%;
            text-align: right;
        }

        .proposal-table th.col-tax {
            width: 12%;
            text-align: right;
        }

        .proposal-table th.col-total {
            width: 13%;
            text-align: right;
        }

        .proposal-td-sn {
            text-align: center;
        }

        .proposal-td-item {
            font-weight: 500;
        }

        .proposal-td-qty {
            text-align: center;
        }

        .proposal-td-price,
        .proposal-td-tax {
            text-align: right;
        }

        .proposal-td-total {
            text-align: right;
            font-weight: 700;
        }

        .proposal-no-items {
            padding: 16px !important;
            text-align: center;
            color: #94a3b8;
            font-style: italic;
        }

        .proposal-summary-label,
        .proposal-summary-value {
            padding: 4px 6px !important;
            border: 1px solid #cbd5e1 !important;
            text-align: right;
            font-weight: 700;
            font-size: 10px !important;
            white-space: nowrap;
            vertical-align: middle !important;
        }

        .proposal-summary-label {
            color: #1e293b;
        }

        .proposal-summary-value {
            color: #0f172a;
        }

        /* Description HTML Typography */
        .proposal-item-desc {
            padding: 4px 6px !important;
            text-align: left;
            font-size: 10px !important;
            line-height: 1.35 !important;
            color: #293240;
            word-break: break-word;
            overflow-wrap: anywhere;
        }

        .proposal-item-desc p {
            margin: 0 0 2px 0 !important;
            padding: 0 !important;
            line-height: 1.35 !important;
        }

        .proposal-item-desc p:last-child {
            margin-bottom: 0 !important;
        }

        .proposal-item-desc ul,
        .proposal-item-desc ol {
            margin: 0 0 2px 0 !important;
            padding-left: 14px !important;
            list-style-position: outside !important;
        }

        .proposal-item-desc li {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1.35 !important;
        }

        .proposal-item-desc li p {
            display: inline !important;
            margin: 0 !important;
        }

        /* Content / Other Details Typography */
        .html-preview-container {
            font-size: 14px;
            line-height: 1.5;
            color: #1e293b;
            width: 100%;
            display: flex !important;
            flex-direction: column !important;
            flex: 1 !important;
            height: 100% !important;
        }

        .html-preview-container h1 {
            font-size: 24px;
            font-weight: 700;
            margin: 8px 0;
            color: #0f172a;
        }

        .html-preview-container h2 {
            font-size: 20px;
            font-weight: 700;
            margin: 8px 0;
            color: #0f172a;
        }

        .html-preview-container h3 {
            font-size: 18px;
            font-weight: 600;
            margin: 6px 0;
            color: #0f172a;
        }

        .html-preview-container h4 {
            font-size: 16px;
            font-weight: 600;
            margin: 4px 0;
            color: #0f172a;
        }

        .html-preview-container p {
            margin: 4px 0;
        }

        .html-preview-container>p:first-child {
            margin-top: 0;
        }

        .html-preview-container>p:last-child {
            margin-bottom: 0;
        }

        .html-preview-container p:empty {
            min-height: 1.15em;
            margin: 0;
        }

        .html-preview-container p:empty::before {
            content: "\00a0";
        }

        .html-preview-container ul {
            list-style-type: disc;
            margin-left: 24px;
            margin-top: 8px;
            margin-bottom: 8px;
        }

        .html-preview-container ol {
            list-style-type: decimal;
            margin-left: 24px;
            margin-top: 8px;
            margin-bottom: 8px;
        }

        .html-preview-container li {
            margin-top: 2px;
            margin-bottom: 2px;
        }

        .html-preview-container blockquote {
            border-left: 4px solid #cbd5e1;
            padding-left: 16px;
            font-style: italic;
            margin: 8px 0;
        }

        .html-preview-container a {
            color: #2563eb;
            text-decoration: underline;
        }

        /* Accent & Badge Dynamic Coloring */
        .sp-doc-badge-label {
            color:
                {{ $templateColor }}
                !important;
        }

        .sp-doc-accent-line {
            background-color:
                {{ $templateColor }}
                !important;
            background:
                {{ $templateColor }}
                !important;
        }

        .sp-doc-date-tag {
            border-color:
                {{ $templateColor }}
                !important;
            color:
                {{ $templateColor }}
                !important;
        }

        @media print {
            @page {
                size: 210mm 297mm;
                margin: 0;
            }

            html,
            body,
            .print-container {
                width: 210mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background-color: #ffffff !important;
            }

            .proposal-preview-sheet,
            .proposal-cover__sheet {
                width: 210mm !important;
                height: 297mm !important;
                min-height: 297mm !important;
                max-height: 297mm !important;
                padding: 0 !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid-page !important;
                overflow: hidden !important;
            }

            .proposal-page__body {
                position: relative !important;
                z-index: 1 !important;
                padding: 32mm 15mm 20mm !important;
                height: calc(297mm - 52mm) !important;
                min-height: calc(297mm - 52mm) !important;
                max-height: calc(297mm - 52mm) !important;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
            }

            .proposal-preview-sheet:last-child,
            .proposal-cover__sheet:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
            }
        }
    </style>
</head>

<body>
    @php
        $items = $proposal->items ?? collect();
        $otcItems = $items->filter(function ($i) {
            return ($i->section === 'otc' || $i->section === 'general' || !$i->section) && ((float) $i->unit_price > 0 || (int) $i->product_id > 0 || !empty($i->description) || !empty($i->product_description));
        })->values();

        $otcSubtotal = $otcItems->sum(fn($i) => (float) ($i->quantity * $i->unit_price));
        $otcDiscount = $otcItems->sum(fn($i) => (float) ($i->discount_amount ?? 0));
        $otcTax = $otcItems->sum(fn($i) => (float) ($i->tax_amount ?? 0));

        $mrcItems = $items->filter(function ($i) {
            return $i->section === 'mrc' && ((float) $i->unit_price > 0 || (int) $i->product_id > 0 || !empty($i->description) || !empty($i->product_description));
        })->values();

        $mrcSubtotal = $mrcItems->sum(fn($i) => (float) ($i->quantity * $i->unit_price));
        $mrcDiscount = $mrcItems->sum(fn($i) => (float) ($i->discount_amount ?? 0));
        $mrcTax = $mrcItems->sum(fn($i) => (float) ($i->tax_amount ?? 0));

        // If items discount sum is 0, use section-level discounts (otc_discount_value / mrc_discount_value)
        if (($otcDiscount + $mrcDiscount) == 0) {
            $otcDiscVal = (float) ($proposal->otc_discount_value ?? 0);
            $otcDiscType = $proposal->otc_discount_type ?? 'percentage';
            if ($otcDiscVal > 0) {
                $otcDiscount = $otcDiscType === 'percentage'
                    ? ($otcSubtotal * min(100, $otcDiscVal)) / 100
                    : min($otcSubtotal, $otcDiscVal);
            }

            $mrcDiscVal = (float) ($proposal->mrc_discount_value ?? 0);
            $mrcDiscType = $proposal->mrc_discount_type ?? 'percentage';
            if ($mrcDiscVal > 0) {
                $mrcDiscount = $mrcDiscType === 'percentage'
                    ? ($mrcSubtotal * min(100, $mrcDiscVal)) / 100
                    : min($mrcSubtotal, $mrcDiscVal);
            }
        }

        $otcTotal = max(0, $otcSubtotal - $otcDiscount + $otcTax);
        $mrcTotal = max(0, $mrcSubtotal - $mrcDiscount + $mrcTax);

        // Helper to format discount label
        $getDiscountLabel = function ($discountAmount, $subtotal, $items) {
            return 'Discount:';
        };

        $otcDiscountLabel = $getDiscountLabel($otcDiscount, $otcSubtotal, $otcItems);
        $mrcDiscountLabel = $getDiscountLabel($mrcDiscount, $mrcSubtotal, $mrcItems);

        // Build Sections Source for this individual proposal
        $customContentPages = [];
        if (isset($proposal->contents) && count($proposal->contents) > 0) {
            $customContentPages = $proposal->contents->map(function ($c) {
                $rawVal = $c->content ?? $c->proposal_content ?? '';
                $decoded = is_string($rawVal) ? json_decode($rawVal, true) : null;
                if (is_array($decoded)) {
                    return [
                        'title' => $decoded['title'] ?? $c->title ?? '',
                        'content' => $decoded['content'] ?? $rawVal,
                        'page_type' => $decoded['page_type'] ?? $c->page_type ?? 'content',
                        'background_image' => $decoded['background_image'] ?? $c->background_image ?? null,
                        'order' => $c->order ?? 1,
                    ];
                }
                return [
                    'title' => $c->title ?? '',
                    'content' => $rawVal,
                    'page_type' => $c->page_type ?? 'content',
                    'background_image' => $c->background_image ?? null,
                    'order' => $c->order ?? 1,
            })->toArray();
        }

        if (empty($customContentPages)) {
            $rawContent = $proposal->proposal_content ?? ($proposal->others ?? null);
            if (is_string($rawContent)) {
                $customContentPages = json_decode($rawContent, true) ?: [];
            } elseif (is_array($rawContent)) {
                $customContentPages = $rawContent;
            }
        }

        if (empty($customContentPages)) {
            $creatorId = $proposal->created_by ?? null;
            $pages = \App\Models\ProposalPage::where('created_by', $creatorId)
                ->where('is_active', 1)
                ->orderBy('sort_order')
                ->get();

            if ($pages->isEmpty()) {
                $pages = \App\Models\ProposalPage::where('is_active', 1)
                    ->orderBy('sort_order')
                    ->get();
            }

            $customContentPages = $pages->map(function ($p) {
                return [
                    'title' => $p->title,
                    'content' => $p->content,
                    'page_type' => $p->page_type ?? 'content',
                    'background_image' => $p->background_image ?? null,
                    'order' => $p->sort_order,
                ];
            })->toArray();
        }

        $sectionsSource = $customContentPages;
        if (empty($sectionsSource)) {
            $sectionsSource = [
                ['title' => 'One-Time Charges (OTC)', 'content' => '[OTC_CHARGES_TABLE]', 'page_type' => 'otc', 'order' => 1],
                ['title' => 'Monthly Recurring Charges (MRC)', 'content' => '[MRC_CHARGES_TABLE]', 'page_type' => 'mrc', 'order' => 2],
            ];
        }

        // Sort sections by order
        usort($sectionsSource, function ($a, $b) {
            $orderA = $a['order'] ?? 999;
            $orderB = $b['order'] ?? 999;
            return $orderA <=> $orderB;
        });

        // Prepare Section Pages
        // In this clean architecture, each section is rendered in full into a page template container.
        // If OTC and MRC are adjacent or fit together, client-side pagination keeps them on the same sheet.
        $hasOtcInSource = false;
        $hasMrcInSource = false;
        $hasOtherInSource = false;
        foreach ($sectionsSource as $sec) {
            $sec = (array) $sec;
            $rawContent = trim((string) ($sec['content'] ?? ''));
            $title = $sec['title'] ?? '';
            if ($rawContent === '[OTC_CHARGES_TABLE]' || (!empty($title) && stripos($title, 'one-time charges') !== false)) {
                $hasOtcInSource = true;
            }
            if ($rawContent === '[MRC_CHARGES_TABLE]' || (!empty($title) && stripos($title, 'monthly recurring charges') !== false)) {
                $hasMrcInSource = true;
            }
            if ($rawContent === '[OTHER_DETAILS_CONTENT]' || (!empty($title) && stripos($title, 'other details') !== false)) {
                $hasOtherInSource = true;
            }
        }

        if (count($otcItems) > 0 && !$hasOtcInSource) {
            $sectionsSource[] = [
                'title' => 'One-Time Charges (OTC)',
                'content' => '[OTC_CHARGES_TABLE]',
                'page_type' => 'otc',
                'order' => count($sectionsSource) + 1,
            ];
        }
        if (count($mrcItems) > 0 && !$hasMrcInSource) {
            $sectionsSource[] = [
                'title' => 'Monthly Recurring Charges (MRC)',
                'content' => '[MRC_CHARGES_TABLE]',
                'page_type' => 'mrc',
                'order' => count($sectionsSource) + 1,
            ];
        }
        if (!empty($proposal->other_details) && trim($proposal->other_details) !== '' && $proposal->other_details !== '<p></p>' && !$hasOtherInSource) {
            $sectionsSource[] = [
                'title' => 'Other Details',
                'content' => '[OTHER_DETAILS_CONTENT]',
                'page_type' => 'other-details',
                'order' => count($sectionsSource) + 1,
            ];
        }

        // Build Renderable Page Blocks matching section order
        $renderableSections = [];
        $otcRendered = false;
        $mrcRendered = false;
        $otherRendered = false;

        foreach ($sectionsSource as $sIdx => $sec) {
            $sec = (array) $sec;
            $rawContent = trim((string) ($sec['content'] ?? ''));
            $title = $sec['title'] ?? '';
            $pageType = $sec['page_type'] ?? '';
            $isOtc = $pageType === 'otc' || $rawContent === '[OTC_CHARGES_TABLE]' || (!empty($title) && stripos($title, 'one-time charges') !== false);
            $isMrc = $pageType === 'mrc' || $rawContent === '[MRC_CHARGES_TABLE]' || (!empty($title) && stripos($title, 'monthly recurring charges') !== false);
            $isOther = $pageType === 'other-details' || $rawContent === '[OTHER_DETAILS_CONTENT]' || (!empty($title) && stripos($title, 'other details') !== false);

            if ($isOtc && !$otcRendered) {
                if (count($otcItems) > 0) {
                    $renderableSections[] = [
                        'id' => "otc-section-{$sIdx}",
                        'type' => 'otc',
                        'title' => !empty($title) ? $title : 'One-Time Charges (OTC)',
                        'background_image' => $sec['background_image'] ?? null,
                    ];
                    $otcRendered = true;
                }
                continue;
            }

            if ($isMrc && !$mrcRendered) {
                if (count($mrcItems) > 0) {
                    $renderableSections[] = [
                        'id' => "mrc-section-{$sIdx}",
                        'type' => 'mrc',
                        'title' => !empty($title) ? $title : 'Monthly Recurring Charges (MRC)',
                        'background_image' => $sec['background_image'] ?? null,
                    ];
                    $mrcRendered = true;
                }
                continue;
            }

            if ($isOther && !$otherRendered) {
                if (!empty($proposal->other_details) && trim($proposal->other_details) !== '' && $proposal->other_details !== '<p></p>') {
                    $renderableSections[] = [
                        'id' => "other-section-{$sIdx}",
                        'type' => 'other-details',
                        'title' => !empty($title) ? $title : 'OTHER DETAILS',
                        'content' => $proposal->other_details,
                        'background_image' => $sec['background_image'] ?? null,
                    ];
                    $otherRendered = true;
                }
                continue;
            }

            // Normal Custom / Default Content Page
            $renderableSections[] = [
                'id' => "content-section-{$sIdx}",
                'type' => 'content',
                'title' => $title,
                'content' => $sec['content'] ?? '',
                'background_image' => $sec['background_image'] ?? null,
            ];
        }
    @endphp

    {{-- SECTIONS CONTAINER --}}
    <div class="print-container" id="boxes">
        @foreach($renderableSections as $pIdx => $page)
            @php
                $sheetBgUrl = $getPageBgUrl($page['background_image'] ?? null);
            @endphp

            {{-- 1. OTC CHARGES SECTION --}}
            @if($page['type'] === 'otc')
                <div class="proposal-preview-sheet otc-paginated-page" id="{{ $page['id'] }}" data-page-type="otc">
                    @if(!empty($sheetBgUrl))
                        <div class="proposal-bg-layer">
                            <img src="{{ $sheetBgUrl }}" alt="Sheet Background" />
                        </div>
                    @endif
                    @if(!empty($headerLogoUrl))
                        <div class="proposal-header-logo-container" style="{{ $headerLogoStyle }}">
                            <img src="{{ $headerLogoUrl }}" alt="Header Logo" />
                        </div>
                    @endif
                    <div class="proposal-page__body">
                        <div class="proposal-charges-wrapper">
                            <div class="proposal-section-title">
                                {{ $page['title'] }}
                            </div>

                            <table class="proposal-table">
                                <thead>
                                    <tr>
                                        <th class="col-sn">S/N</th>
                                        <th class="col-item">Item / Service</th>
                                        <th class="col-desc">Description</th>
                                        <th class="col-qty">Qty.</th>
                                        <th class="col-price">Price ({{ $currencyCode }})</th>
                                        <th class="col-discount">Discount</th>
                                        <th class="col-tax">Tax / VAT</th>
                                        <th class="col-total">Total ({{ $currencyCode }})</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @forelse($otcItems as $index => $item)
                                        @php
                                            $pName = $item->product->name ?? $item->product_name ?? 'Item';
                                            $pDesc = $item->description ?? $item->product_description ?? $item->product->description ?? '';
                                            $pUnit = $item->product->unitRelation->unit_name ?? (!is_numeric($item->product->unit ?? '') ? ($item->product->unit ?? '') : '');
                                            $lTotal = (float) ($item->total_amount ?? ($item->quantity * $item->unit_price));
                                            $displayQty = ((float) $item->quantity == (int) $item->quantity) ? (int) $item->quantity : (float) $item->quantity;
                                        @endphp
                                        <tr>
                                            <td class="proposal-td-sn">{{ $index + 1 }}</td>
                                            <td class="proposal-td-item">{{ $pName }}</td>
                                            <td class="proposal-item-desc">{!! $pDesc !!}</td>
                                            <td class="proposal-td-qty">
                                                {{ $displayQty . ($pUnit ? ' ' . $pUnit : '') }}
                                            </td>
                                            <td class="proposal-td-price">{{ $formatNumber($item->unit_price) }}</td>
                                            <td class="proposal-td-price">
                                                @php $itemDiscType = $item->discount_type ?? 'percentage'; @endphp
                                                @if($itemDiscType === 'percentage' && (float)($item->discount_percentage ?? 0) > 0)
                                                    <div>{{ (float) $item->discount_percentage }}%</div>
                                                    @if((float)($item->discount_amount ?? 0) > 0)
                                                        <div style="font-size: 10px; color: #64748b;">({{ $formatCurrency($item->discount_amount) }})</div>
                                                    @endif
                                                @elseif($itemDiscType === 'fixed' && (float)($item->discount_amount ?? 0) > 0)
                                                    <div>{{ $formatCurrency($item->discount_amount) }}</div>
                                                @elseif((float)($item->discount_percentage ?? 0) > 0)
                                                    <div>{{ (float) $item->discount_percentage }}%</div>
                                                @elseif((float)($item->discount_amount ?? 0) > 0)
                                                    <div>{{ $formatCurrency($item->discount_amount) }}</div>
                                                @else
                                                    <span style="color: #94a3b8;">-</span>
                                                @endif
                                            </td>
                                            <td class="proposal-td-tax">
                                                @if(!empty($item->taxes) && count($item->taxes) > 0)
                                                    @foreach($item->taxes as $tItem)
                                                        <div>{{ $tItem->tax_name }} ({{ (float) $tItem->tax_rate }}%)</div>
                                                    @endforeach
                                                @elseif((float) ($item->tax_percentage ?? 0) > 0)
                                                    <div>{{ (float) $item->tax_percentage }}%</div>
                                                @elseif((float) ($item->tax_amount ?? 0) > 0)
                                                    <div>{{ $formatNumber($item->tax_amount) }}</div>
                                                @else
                                                    <span style="color: #94a3b8;">-</span>
                                                @endif
                                            </td>
                                            <td class="proposal-td-total">{{ $formatNumber($lTotal) }}</td>
                                        </tr>
                                    @empty
                                        <tr>
                                            <td colspan="8" class="proposal-no-items">No OTC items added.</td>
                                        </tr>
                                    @endforelse
                                </tbody>
                                <tfoot>
                                     @if(count($otcItems) > 0)
                                         @php
                                             $otcSubtotalStr = $formatNumber($otcSubtotal);
                                             $otcDiscountStr = '(-) ' . $formatNumber($otcDiscount);
                                             $otcTaxStr = '(+) ' . $formatNumber($otcTax);
                                             $otcTotalStr = $formatNumber($otcTotal);
                                         @endphp
                                         <tr>
                                             <td colspan="5"></td>
                                             <td colspan="2" class="proposal-summary-label">Total ({{ $currencyCode }}):</td>
                                             <td class="proposal-summary-value" style="font-size: {{ $getAmountFontSize($otcSubtotalStr, 10) }};">{{ $otcSubtotalStr }}</td>
                                         </tr>
                                         @if($otcDiscount > 0)
                                             <tr>
                                                 <td colspan="5"></td>
                                                 <td colspan="2" class="proposal-summary-label">{{ $otcDiscountLabel ?? 'Discount:' }}</td>
                                                 <td class="proposal-summary-value" style="font-size: {{ $getAmountFontSize($otcDiscountStr, 10) }};">{{ $otcDiscountStr }}</td>
                                             </tr>
                                         @endif
                                         @if($otcTax > 0)
                                             <tr>
                                                 <td colspan="5"></td>
                                                 <td colspan="2" class="proposal-summary-label">VAT/Tax:</td>
                                                 <td class="proposal-summary-value" style="font-size: {{ $getAmountFontSize($otcTaxStr, 10) }};">{{ $otcTaxStr }}</td>
                                             </tr>
                                         @endif
                                         @if($otcDiscount > 0 || $otcTax > 0)
                                             <tr>
                                                 <td colspan="5"></td>
                                                 <td colspan="2" class="proposal-summary-label">Grand Total:</td>
                                                 <td class="proposal-summary-value" style="font-size: {{ $getAmountFontSize($otcTotalStr, 10) }};">{{ $otcTotalStr }}</td>
                                             </tr>
                                         @endif
                                     @endif
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

                {{-- 2. MRC CHARGES SECTION --}}
            @elseif($page['type'] === 'mrc')
                <div class="proposal-preview-sheet mrc-paginated-page" id="{{ $page['id'] }}" data-page-type="mrc">
                    @if(!empty($sheetBgUrl))
                        <div class="proposal-bg-layer">
                            <img src="{{ $sheetBgUrl }}" alt="Sheet Background" />
                        </div>
                    @endif
                    @if(!empty($headerLogoUrl))
                        <div class="proposal-header-logo-container" style="{{ $headerLogoStyle }}">
                            <img src="{{ $headerLogoUrl }}" alt="Header Logo" />
                        </div>
                    @endif
                    <div class="proposal-page__body">
                        <div class="proposal-charges-wrapper">
                            <div class="proposal-section-title title-mrc" style="{{ $pIdx === 0 ? '' : 'margin-top: 2rem;' }}">
                                {{ $page['title'] }}
                            </div>

                            <table class="proposal-table">
                                <thead>
                                     <tr>
                                         <th class="col-sn">S/N</th>
                                         <th class="col-item">Item / Service</th>
                                         <th class="col-desc">Description</th>
                                         <th class="col-qty">Qty.</th>
                                         <th class="col-price">Price ({{ $currencyCode }})</th>
                                         <th class="col-discount">Discount</th>
                                         <th class="col-tax">Tax / VAT</th>
                                         <th class="col-total">Total ({{ $currencyCode }})</th>
                                     </tr>
                                </thead>
                                <tbody>
                                     @forelse($mrcItems as $index => $item)
                                         @php
                                             $pName = $item->product->name ?? $item->product_name ?? 'Item';
                                             $pDesc = $item->description ?? $item->product_description ?? $item->product->description ?? '';
                                             $pUnit = $item->product->unitRelation->unit_name ?? (!is_numeric($item->product->unit ?? '') ? ($item->product->unit ?? '') : '');
                                             $lTotal = (float) ($item->total_amount ?? ($item->quantity * $item->unit_price));
                                             $displayQty = ((float) $item->quantity == (int) $item->quantity) ? (int) $item->quantity : (float) $item->quantity;
                                         @endphp
                                         <tr>
                                             <td class="proposal-td-sn">{{ $index + 1 }}</td>
                                             <td class="proposal-td-item">{{ $pName }}</td>
                                             <td class="proposal-item-desc">{!! $pDesc !!}</td>
                                             <td class="proposal-td-qty">
                                                 {{ $displayQty . ($pUnit ? ' ' . $pUnit : '') }}
                                             </td>
                                             <td class="proposal-td-price">{{ $formatNumber($item->unit_price) }}</td>
                                             <td class="proposal-td-price">
                                                 @php $effMrcType = $item->discount_type ?? $proposal->mrc_discount_type ?? 'percentage'; @endphp
                                                 @if($effMrcType === 'percentage' && (float)($item->discount_percentage ?? 0) > 0)
                                                     <div>{{ (float) $item->discount_percentage }}%</div>
                                                     @if((float)($item->discount_amount ?? 0) > 0)
                                                         <div style="font-size: 10px; color: #64748b;">({{ $formatCurrency($item->discount_amount) }})</div>
                                                     @endif
                                                 @elseif((float)($item->discount_amount ?? 0) > 0)
                                                     <div>{{ $formatCurrency($item->discount_amount) }}</div>
                                                 @else
                                                     <span style="color: #94a3b8;">-</span>
                                                 @endif
                                             </td>
                                             <td class="proposal-td-tax">
                                                 @if(!empty($item->taxes) && count($item->taxes) > 0)
                                                     @foreach($item->taxes as $tItem)
                                                         <div>{{ $tItem->tax_name }} ({{ (float) $tItem->tax_rate }}%)</div>
                                                     @endforeach
                                                 @elseif((float) ($item->tax_percentage ?? 0) > 0)
                                                     <div>{{ (float) $item->tax_percentage }}%</div>
                                                 @elseif((float) ($item->tax_amount ?? 0) > 0)
                                                     <div>{{ $formatNumber($item->tax_amount) }}</div>
                                                 @else
                                                     <span style="color: #94a3b8;">-</span>
                                                 @endif
                                             </td>
                                             <td class="proposal-td-total">{{ $formatNumber($lTotal) }}</td>
                                         </tr>
                                     @empty
                                         <tr>
                                             <td colspan="8" class="proposal-no-items">No MRC items added.</td>
                                         </tr>
                                     @endforelse
                                </tbody>
                                <tfoot>
                                     @if(count($mrcItems) > 0)
                                         @php
                                             $mrcSubtotalStr = $formatNumber($mrcSubtotal);
                                             $mrcDiscountStr = '(-) ' . $formatNumber($mrcDiscount);
                                             $mrcTaxStr = '(+) ' . $formatNumber($mrcTax);
                                             $mrcTotalStr = $formatNumber($mrcTotal);
                                         @endphp
                                         <tr>
                                             <td colspan="5"></td>
                                             <td colspan="2" class="proposal-summary-label">Total ({{ $currencyCode }}):</td>
                                             <td class="proposal-summary-value" style="font-size: {{ $getAmountFontSize($mrcSubtotalStr, 10) }};">{{ $mrcSubtotalStr }}</td>
                                         </tr>
                                         @if($mrcDiscount > 0)
                                             <tr>
                                                 <td colspan="5"></td>
                                                 <td colspan="2" class="proposal-summary-label">{{ $mrcDiscountLabel ?? 'Discount:' }}</td>
                                                 <td class="proposal-summary-value" style="font-size: {{ $getAmountFontSize($mrcDiscountStr, 10) }};">{{ $mrcDiscountStr }}</td>
                                             </tr>
                                         @endif
                                         @if($mrcTax > 0)
                                             <tr>
                                                 <td colspan="5"></td>
                                                 <td colspan="2" class="proposal-summary-label">VAT/Tax:</td>
                                                 <td class="proposal-summary-value" style="font-size: {{ $getAmountFontSize($mrcTaxStr, 10) }};">{{ $mrcTaxStr }}</td>
                                             </tr>
                                         @endif
                                         @if($mrcDiscount > 0 || $mrcTax > 0)
                                             <tr>
                                                 <td colspan="5"></td>
                                                 <td colspan="2" class="proposal-summary-label">Grand Total:</td>
                                                 <td class="proposal-summary-value" style="font-size: {{ $getAmountFontSize($mrcTotalStr, 10) }};">{{ $mrcTotalStr }}</td>
                                             </tr>
                                         @endif
                                     @endif
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

                {{-- 3. OTHER DETAILS SECTION --}}
            @elseif($page['type'] === 'other-details')
                <div class="proposal-preview-sheet proposal-cover__sheet other-details-page" id="{{ $page['id'] }}">
                    @if(!empty($sheetBgUrl))
                        <div class="proposal-bg-layer">
                            <img src="{{ $sheetBgUrl }}" alt="Sheet Background" />
                        </div>
                    @endif
                    @if(!empty($headerLogoUrl))
                        <div class="proposal-header-logo-container" style="{{ $headerLogoStyle }}">
                            <img src="{{ $headerLogoUrl }}" alt="Header Logo" />
                        </div>
                    @endif
                    <div class="proposal-page__body">
                        <div class="html-preview-container">
                            <h3 style="font-size: 14px; font-weight: 700; color: #293240; margin-bottom: 12px;">
                                {{ $replaceProposalShortcodes($page['title']) }}
                            </h3>
                            {!! $replaceProposalShortcodes($page['content']) !!}
                        </div>
                    </div>
                </div>

                {{-- 4. CONTENT / DEFAULT PAGES --}}
            @else
                <div class="proposal-preview-sheet proposal-cover__sheet content-page" id="{{ $page['id'] }}">
                    @if(!empty($sheetBgUrl))
                        <div class="proposal-bg-layer">
                            <img src="{{ $sheetBgUrl }}" alt="Sheet Background" />
                        </div>
                    @endif
                    @if(!empty($headerLogoUrl))
                        <div class="proposal-header-logo-container" style="{{ $headerLogoStyle }}">
                            <img src="{{ $headerLogoUrl }}" alt="Header Logo" />
                        </div>
                    @endif
                    <div class="proposal-page__body">
                        <div class="html-preview-container">
                            {!! $replaceProposalShortcodes($page['content']) !!}
                        </div>
                    </div>
                </div>
            @endif
        @endforeach
    </div>

    {{-- CLIENT-SIDE DYNAMIC PAGINATION ENGINE (SYNCED WITH PREVIEW MODAL) --}}
    <script>
        const MM_TO_PX = 3.7795;
        const A4_USABLE_HEIGHT_MM = 297 - 32 - 20; // 245mm
        const DEFAULT_A4_CONTENT_HEIGHT_PX = Math.round(A4_USABLE_HEIGHT_MM * MM_TO_PX); // 926px

        function paginateDomContainer(container, maxPageHeight = DEFAULT_A4_CONTENT_HEIGHT_PX) {
            const effectiveMaxHeight = maxPageHeight;
            const pages = [];
            let currentPageHtml = [];
            let currentPageAccumulatedHeight = 0;

            const startNewPage = () => {
                if (currentPageHtml.length > 0) {
                    pages.push(currentPageHtml.join(''));
                    currentPageHtml = [];
                    currentPageAccumulatedHeight = 0;
                }
            };

            const processElement = (el) => {
                if (!el || el.nodeType !== 1) return;
                const tag = el.tagName.toLowerCase();
                if (tag === 'style' || tag === 'script') return;

                if (
                    el.classList.contains('page-break') ||
                    el.style.pageBreakAfter === 'always' ||
                    el.style.pageBreakBefore === 'always' ||
                    el.style.breakAfter === 'page' ||
                    el.style.breakBefore === 'page'
                ) {
                    startNewPage();
                    return;
                }

                const elHeight = el.offsetHeight || 25;
                const computedStyle = window.getComputedStyle(el);
                const margin = (parseFloat(computedStyle.marginTop) || 0) + (parseFloat(computedStyle.marginBottom) || 0);
                const totalElHeight = elHeight + margin;

                const tableInside = tag === 'table' ? el : el.querySelector('table');
                if (tableInside) {
                    const tableEl = tableInside;
                    const thead = tableEl.querySelector('thead');
                    const theadHtml = thead ? thead.outerHTML : '';
                    const theadHeight = thead ? (thead.offsetHeight || 32) : 0;
                    const tfoot = tableEl.querySelector('tfoot');
                    const tfootHtml = tfoot ? tfoot.outerHTML : '';
                    const tfootHeight = tfoot ? (tfoot.offsetHeight || 80) : 0;
                    const bodyRows = Array.from(tableEl.querySelectorAll('tbody > tr'));
                    const tableClasses = tableEl.getAttribute('class') || '';
                    const tableStyle = tableEl.getAttribute('style') || '';

                    if (currentPageAccumulatedHeight + totalElHeight <= effectiveMaxHeight) {
                        currentPageHtml.push(el.outerHTML);
                        currentPageAccumulatedHeight += totalElHeight;
                        return;
                    }

                    if (totalElHeight <= effectiveMaxHeight && currentPageHtml.length > 0) {
                        startNewPage();
                        currentPageHtml.push(el.outerHTML);
                        currentPageAccumulatedHeight += totalElHeight;
                        return;
                    }

                    const titleEl = tag !== 'table' ? el.querySelector('.proposal-section-title, .font-bold, h1, h2, h3, h4, h5, h6') : null;
                    const titleHtml = titleEl ? titleEl.outerHTML : '';

                    if (bodyRows.length > 0) {
                        let currentTableRows = [];
                        let currentTableChunkHeight = theadHeight;
                        let isFirstTableChunk = true;

                        for (let rIdx = 0; rIdx < bodyRows.length; rIdx++) {
                            const row = bodyRows[rIdx];
                            const rowHeight = row.offsetHeight || 30;
                            const isLastRow = (rIdx === bodyRows.length - 1);
                            const neededRowHeight = rowHeight + (isLastRow ? tfootHeight : 0);

                            if (currentPageAccumulatedHeight + currentTableChunkHeight + neededRowHeight > effectiveMaxHeight && currentTableRows.length > 0) {
                                const tableHtml = `<table class="${tableClasses}" style="${tableStyle}">${theadHtml}<tbody>${currentTableRows.join('')}</tbody></table>`;
                                if (isFirstTableChunk && titleHtml) currentPageHtml.push(titleHtml);
                                currentPageHtml.push(tableHtml);
                                startNewPage();
                                isFirstTableChunk = false;
                                currentTableRows = [row.outerHTML];
                                currentTableChunkHeight = theadHeight + rowHeight;
                            } else {
                                currentTableRows.push(row.outerHTML);
                                currentTableChunkHeight += rowHeight;
                            }
                        }

                        if (currentTableRows.length > 0) {
                            const tableHtml = `<table class="${tableClasses}" style="${tableStyle}">${theadHtml}<tbody>${currentTableRows.join('')}</tbody>${tfootHtml}</table>`;
                            if (isFirstTableChunk && titleHtml) currentPageHtml.push(titleHtml);
                            currentPageHtml.push(tableHtml);
                            currentPageAccumulatedHeight += currentTableChunkHeight + tfootHeight;
                        }
                        return;
                    }
                }

                if ((tag === 'div' || tag === 'section' || tag === 'article') && el.children.length > 0) {
                    if (currentPageAccumulatedHeight + totalElHeight <= effectiveMaxHeight) {
                        currentPageHtml.push(el.outerHTML);
                        currentPageAccumulatedHeight += totalElHeight;
                        return;
                    }
                    if (totalElHeight <= effectiveMaxHeight && currentPageHtml.length > 0) {
                        startNewPage();
                        currentPageHtml.push(el.outerHTML);
                        currentPageAccumulatedHeight += totalElHeight;
                        return;
                    }
                    Array.from(el.children).forEach((child) => processElement(child));
                    return;
                }

                if (currentPageAccumulatedHeight + totalElHeight > effectiveMaxHeight && currentPageHtml.length > 0) {
                    startNewPage();
                }

                currentPageHtml.push(el.outerHTML);
                currentPageAccumulatedHeight += totalElHeight;
            };

            Array.from(container.children).forEach((child) => processElement(child));

            if (currentPageHtml.length > 0) {
                pages.push(currentPageHtml.join(''));
            }

            return pages.length > 0 ? pages : [container.innerHTML];
        }

        function runFullPagination() {
            let printContainer = document.getElementById('boxes');
            if (!printContainer) return;

            let sheets = Array.from(printContainer.querySelectorAll('.proposal-preview-sheet'));
            if (sheets.length === 0) return;

            let measureBox = document.createElement('div');
            measureBox.style.cssText = 'position: absolute; left: -9999px; top: -9999px; width: 180mm; visibility: hidden; pointer-events: none; padding: 0; margin: 0; font-family: "Open Sans", sans-serif; font-size: 14px; box-sizing: border-box;';
            document.body.appendChild(measureBox);

            let newSheets = [];

            sheets.forEach(sheet => {
                let body = sheet.querySelector('.proposal-page__body');
                if (!body) {
                    newSheets.push(sheet);
                    return;
                }

                measureBox.innerHTML = body.innerHTML;

                let pages = paginateDomContainer(measureBox, DEFAULT_A4_CONTENT_HEIGHT_PX);

                if (pages.length <= 1) {
                    newSheets.push(sheet);
                } else {
                    pages.forEach((pageHtml) => {
                        let sheetClone = sheet.cloneNode(true);
                        sheetClone.removeAttribute('id');
                        let cloneBody = sheetClone.querySelector('.proposal-page__body');
                        if (cloneBody) {
                            cloneBody.innerHTML = pageHtml;
                        }
                        newSheets.push(sheetClone);
                    });
                }
            });

            measureBox.remove();

            printContainer.innerHTML = '';
            newSheets.forEach(s => printContainer.appendChild(s));
        }

        window.addEventListener('DOMContentLoaded', function () {
            runFullPagination();

            @if(empty($isServerPdf))
                var urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('print') === '1' || urlParams.has('print')) {
                    window.onafterprint = function () {
                        window.close();
                    };
                    setTimeout(function () {
                        window.print();
                    }, 400);
                }
            @endif
        });
    </script>
</body>

</html>
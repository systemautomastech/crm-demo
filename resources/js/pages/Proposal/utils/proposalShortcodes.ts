import { usePage } from '@inertiajs/react';
import { getCompanySetting, getAdminSetting, getImagePath, formatDate, formatCurrency } from '@/utils/helpers';

export interface ProposalShortcodeContext {
  proposal?: any;
  formData?: any;
  customer?: any;
  totals?: {
    subtotal?: number;
    sub_total?: number;
    total?: number;
    total_amount?: number;
    tax_amount?: number;
    taxAmount?: number;
    total_tax?: number;
    discount_amount?: number;
    discountAmount?: number;
    total_discount?: number;
    [key: string]: any;
  };
  proposalSetting?: any;
  pageProps?: any;
  settings?: any;
  isPageSetup?: boolean;
  [key: string]: any;
}

export const replaceProposalShortcodes = (
  content: string | undefined | null,
  context: ProposalShortcodeContext = {}
): string => {
  if (!content) return '';

  let pageProps = context.pageProps;
  if (!pageProps && typeof window !== 'undefined') {
    pageProps = (window as any)?.__INITIAL_PAGE__?.props;
  }

  const companyName = getCompanySetting('company_name', pageProps) || context.settings?.company_name || 'My Company Ltd.';
  const companyEmail = getCompanySetting('company_email', pageProps) || context.settings?.company_email || 'info@company.com';
  const companyPhone =
    getCompanySetting('company_telephone', pageProps) ||
    getCompanySetting('company_phone', pageProps) ||
    context.settings?.company_telephone ||
    context.settings?.company_phone ||
    '+880 1234-567890';
  const companyAddress = getCompanySetting('company_address', pageProps) || context.settings?.company_address || '123 Main Street, Dhaka, Bangladesh';
  const companyWebsite = getCompanySetting('company_website', pageProps) || context.settings?.company_website || 'https://www.example.com';
  const appName = companyName || getAdminSetting('app_name', pageProps) || 'ERP System';

  const rawCompanyLogo =
    getCompanySetting('logo_dark', pageProps) ||
    getCompanySetting('logo_light', pageProps) ||
    getCompanySetting('logo', pageProps) ||
    getCompanySetting('company_logo', pageProps) ||
    getCompanySetting('company_dark_logo', pageProps) ||
    getCompanySetting('company_light_logo', pageProps) ||
    getAdminSetting('logo_dark', pageProps) ||
    getAdminSetting('logo_light', pageProps) ||
    getAdminSetting('logo', pageProps) ||
    'uploads/logo/logo_dark.png';
  const companyLogoUrl = getImagePath(rawCompanyLogo, pageProps);

  const rawProposalLogo = context.proposalSetting?.logo_image || context.settings?.logo_image || rawCompanyLogo;
  const proposalLogoUrl = getImagePath(rawProposalLogo, pageProps);

  const proposalSubject =
    context.formData?.subject ||
    context.proposal?.subject ||
    context.formData?.notes ||
    context.proposal?.notes ||
    (context.isPageSetup ? 'Proposal Subject' : '');
  const proposalNumber = context.formData?.proposal_number || context.proposal?.proposal_number || '';
  const proposalDate = context.formData?.invoice_date || context.formData?.proposal_date || context.proposal?.proposal_date || context.proposal?.invoice_date;
  const formattedProposalDate = proposalDate ? formatDate(proposalDate, pageProps) : '';
  const dueDate = context.formData?.due_date || context.proposal?.due_date;
  const formattedDueDate = dueDate ? formatDate(dueDate, pageProps) : '';

  const customer = context.customer || context.formData?.customer || context.proposal?.customer || {};
  const customerName = customer?.customer_name || context.formData?.customer_name || context.proposal?.customer_name || '';
  const customerEmail = customer?.customer_email || context.formData?.customer_email || context.proposal?.customer_email || '';
  const customerPhone =
    customer?.customer_phone ||
    customer?.contact_person_mobile ||
    context.formData?.customer_phone ||
    context.proposal?.customer_phone ||
    '';
  const customerAddress =
    (typeof customer?.billing_address === 'string' ? customer.billing_address : '') ||
    (customer?.billing_address && typeof customer.billing_address === 'object'
      ? `${customer.billing_address.address_line_1 || ''} ${customer.billing_address.city || ''} ${customer.billing_address.state || ''} ${customer.billing_address.zip_code || ''}`.trim()
      : '') ||
    context.formData?.customer_address ||
    context.proposal?.customer_address ||
    '';

  const authUser =
    context.user ||
    context.creator ||
    context.author ||
    context.proposal?.creator ||
    context.proposal?.author ||
    pageProps?.auth?.user ||
    (typeof window !== 'undefined' ? (window as any)?.__INITIAL_PAGE__?.props?.auth?.user : null) ||
    {};

  const userName =
    authUser?.name ||
    context.formData?.user_name ||
    context.formData?.creator_name ||
    '';

  const userEmail =
    authUser?.email ||
    context.formData?.user_email ||
    context.formData?.creator_email ||
    '';

  const userPhone =
    authUser?.mobile_no ||
    authUser?.phone ||
    authUser?.mobile ||
    authUser?.telephone ||
    context.formData?.user_phone ||
    context.formData?.creator_phone ||
    '';

  const userId = authUser?.id ? String(authUser.id) : (context.formData?.user_id || '');

  const subTotal = context.totals?.subtotal ?? context.totals?.sub_total ?? context.formData?.subtotal ?? context.formData?.sub_total ?? context.proposal?.subtotal ?? context.proposal?.sub_total;
  const totalTax = context.totals?.tax_amount ?? context.totals?.taxAmount ?? context.totals?.total_tax ?? context.formData?.tax_amount ?? context.formData?.total_tax ?? context.proposal?.tax_amount ?? context.proposal?.total_tax;
  const totalDiscount = context.totals?.discount_amount ?? context.totals?.discountAmount ?? context.totals?.total_discount ?? context.formData?.discount_amount ?? context.formData?.total_discount ?? context.proposal?.discount_amount ?? context.proposal?.total_discount;
  const totalAmount = context.totals?.total ?? context.totals?.total_amount ?? context.formData?.total_amount ?? context.formData?.total ?? context.proposal?.total_amount ?? context.proposal?.total;

  const values: Record<string, string> = {
    app_name: appName,
    company_name: companyName,
    company_email: companyEmail,
    company_phone: companyPhone,
    company_telephone: companyPhone,
    company_address: companyAddress,
    company_website: companyWebsite,
    user_id: userId,
    user_name: userName,
    user_email: userEmail,
    user_phone: userPhone,
    creator_name: userName,
    creator_email: userEmail,
    creator_phone: userPhone,
    proposal_subject: proposalSubject,
    subject: proposalSubject,
    proposal_number: proposalNumber,
    proposal_date: formattedProposalDate,
    proposal_due_date: formattedDueDate,
    due_date: formattedDueDate,
    proposal_validity: context.formData?.payment_terms || context.proposal?.payment_terms || '',
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    customer_address: customerAddress,
    total_amount: totalAmount !== undefined && totalAmount !== null && totalAmount !== '' ? formatCurrency(Number(totalAmount), context.pageProps) : '',
    sub_total: subTotal !== undefined && subTotal !== null && subTotal !== '' ? formatCurrency(Number(subTotal), context.pageProps) : '',
    total_tax: totalTax !== undefined && totalTax !== null && totalTax !== '' ? formatCurrency(Number(totalTax), context.pageProps) : '',
    total_discount: totalDiscount !== undefined && totalDiscount !== null && totalDiscount !== '' ? formatCurrency(Number(totalDiscount), context.pageProps) : '',
  };

  let result = content;
  const isPageSetup = Boolean(context.isPageSetup);

  // Handle company_logo and proposal_logo in attributes (e.g. src="{company_logo}")
  if (companyLogoUrl) {
    result = result.replace(/src=(["'])\s*\{\s*company_logo\s*\}\s*\1/gi, `src=$1${companyLogoUrl}$1`);
    result = result.replace(/\{\s*company_logo\s*\}/gi, `<img src="${companyLogoUrl}" alt="Company Logo" class="proposal-logo inline-block max-h-16 max-w-[220px] object-contain" style="display: inline-block !important; vertical-align: middle; max-height: 64px; max-width: 220px; object-fit: contain;" />`);
  } else if (!isPageSetup) {
    result = result.replace(/src=(["'])\s*\{\s*company_logo\s*\}\s*\1/gi, 'src=""');
    result = result.replace(/\{\s*company_logo\s*\}/gi, '');
  }

  if (proposalLogoUrl) {
    result = result.replace(/src=(["'])\s*\{\s*proposal_logo\s*\}\s*\1/gi, `src=$1${proposalLogoUrl}$1`);
    result = result.replace(/\{\s*proposal_logo\s*\}/gi, `<img src="${proposalLogoUrl}" alt="Proposal Logo" class="proposal-logo inline-block max-h-16 max-w-[220px] object-contain" style="display: inline-block !important; vertical-align: middle; max-height: 64px; max-width: 220px; object-fit: contain;" />`);
  } else if (!isPageSetup) {
    result = result.replace(/src=(["'])\s*\{\s*proposal_logo\s*\}\s*\1/gi, 'src=""');
    result = result.replace(/\{\s*proposal_logo\s*\}/gi, '');
  }

  const userKeys = [
    'user_id',
    'user_name',
    'user_email',
    'user_phone',
    'creator_name',
    'creator_email',
    'creator_phone',
    'creator_designation',
    'user_designation',
  ];

  // Replace shortcodes (if value exists, replace with value; if not in proposal page setup, blank it out)
  for (const [key, val] of Object.entries(values)) {
    // In proposal page setup, preserve user shortcodes as-is ({user_name}, etc.) so template is never corrupted
    if (isPageSetup && userKeys.includes(key)) {
      continue;
    }
    const regex = new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi');
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      result = result.replace(regex, String(val));
    } else if (!isPageSetup) {
      result = result.replace(regex, '');
    }
  }

  return result;
};

export const replaceUserShortcodes = (content: string | undefined | null, authUser: any): string => {
  if (!content) return '';
  const userName = authUser?.name || '';
  const userEmail = authUser?.email || '';
  const userPhone =
    authUser?.mobile_no ||
    authUser?.phone ||
    authUser?.mobile ||
    authUser?.telephone ||
    '';
  const userId = authUser?.id ? String(authUser.id) : '';
  const userDesignation = authUser?.designation || '';

  const userMap: Record<string, string> = {
    user_name: userName,
    creator_name: userName,
    user_email: userEmail,
    creator_email: userEmail,
    user_phone: userPhone,
    creator_phone: userPhone,
    user_id: userId,
    creator_designation: userDesignation,
    user_designation: userDesignation,
  };

  let result = content;
  for (const [key, val] of Object.entries(userMap)) {
    if (val) {
      result = result.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi'), val);
    }
  }
  return result;
};

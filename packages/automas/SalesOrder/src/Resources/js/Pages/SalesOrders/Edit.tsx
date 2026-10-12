import React, { useState, useEffect } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { SalesOrderItem } from './types';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import OrderItemsTable from './components/OrderItemsTable';
import { useTaxCalculator } from './components/TaxCalculator';
import { formatCurrency } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputError } from '@/components/ui/input-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, Package, UserPlus, Users, User, X, MapPin, Loader } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useFormFields } from '@/hooks/useFormFields';
import { MultiSelectEnhanced } from '@/components/ui/multi-select-enhanced';

interface EditProps {
    order: any;
    customers: Array<{
        id: number;
        name?: string;
        customer_name?: string;
        email?: string;
        customer_email?: string;
        mobile_no?: string;
        customer_phone?: string;
        billing_address?: any;
        shipping_address?: any;
    }>;
    warehouses: Array<{ id: number; name: string; address: string }>;
    users?: Array<{ id: number; name: string }>;
    userGroups?: Array<{ id: number; name: string }>;
    quotes?: Array<{ id: number; name: string; customer_id?: number; warehouse_id?: number;[key: string]: any }>;
    [key: string]: any;
}

export default function Edit() {
    const { t } = useTranslation();
    const { order, customers, warehouses, users, userGroups, quotes } = usePage<EditProps>().props;
    const [availableProducts, setAvailableProducts] = useState([]);
    const [copyBillingToShipping, setCopyBillingToShipping] = useState(false);

    const parseAddress = (addrData: any) => {
        if (typeof addrData === 'object' && addrData !== null) {
            return {
                address: addrData.billing_address || addrData.shipping_address || addrData.address || addrData.address_line_1 || '',
                city: addrData.billing_city || addrData.shipping_city || addrData.city || '',
                state: addrData.billing_state || addrData.shipping_state || addrData.state || '',
                country: addrData.billing_country || addrData.shipping_country || addrData.country || '',
                postal_code: addrData.billing_postal_code || addrData.shipping_postal_code || addrData.postal_code || addrData.zip_code || '',
            };
        }
        return {
            address: typeof addrData === 'string' ? addrData : '',
            city: '',
            state: '',
            country: '',
            postal_code: '',
        };
    };

    const initialBilling = parseAddress(order.billing_address);
    const initialShipping = parseAddress(order.shipping_address);

    const initialAssignedUserIds = order.assigned_users ? order.assigned_users.map((u: any) => u.id) : [];
    const initialAssignmentMode = order.assigned_group_id
        ? 'group'
        : (initialAssignedUserIds.length > 0 ? 'user' : 'group');

    useFlashMessages();
    const { data, setData, put, processing, errors } = useForm({
        name: order.name || '',
        quotation_id: order.quotation_id || null,
        status: order.status || 'draft',
        warehouse_id: order.warehouse_id ? order.warehouse_id.toString() : '',
        order_date: order.order_date ? new Date(order.order_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        expected_delivery_date: order.expected_delivery_date ? new Date(order.expected_delivery_date).toISOString().split('T')[0] : '',

        customer_id: order.customer_id || null,

        billing_address: initialBilling.address,
        shipping_address: initialShipping.address,
        billing_city: initialBilling.city,
        billing_state: initialBilling.state,
        shipping_city: initialShipping.city,
        shipping_state: initialShipping.state,
        billing_country: initialBilling.country,
        billing_postal_code: initialBilling.postal_code,
        shipping_country: initialShipping.country,
        shipping_postal_code: initialShipping.postal_code,

        assignment_mode: initialAssignmentMode as 'none' | 'group' | 'user',
        assigned_group_id: order.assigned_group_id || null as number | null,
        assign_user_id: initialAssignedUserIds[0] || null,
        assigned_user_ids: initialAssignedUserIds,
        description: order.description || '',
        notes: order.notes || '',
        items: (order.items || []).map((item: any) => ({
            ...item,
            taxes: item.taxes || []
        })) as SalesOrderItem[]
    });

    // Custom fields hook
    const customFields = useFormFields('getCustomFields', { ...data, module: 'Sales', sub_module: 'Sales Orders', id: order.id }, setData, errors, 'edit', t);

    const fetchWarehouseProducts = async (warehouseId: string) => {
        if (!warehouseId) {
            setAvailableProducts([]);
            return [];
        }

        try {
            const response = await fetch(route('salesorder.orders.products') + `?warehouse_id=${warehouseId}`);
            if (!response.ok) throw new Error('Failed to fetch products');
            const warehouseProducts = await response.json();
            setAvailableProducts(Array.isArray(warehouseProducts) ? warehouseProducts : []);
            return warehouseProducts;
        } catch (error) {
            console.error('Failed to fetch warehouse products:', error);
            setAvailableProducts([]);
            return [];
        }
    };

    // Initial products load for order warehouse
    useEffect(() => {
        if (order.warehouse_id) {
            fetchWarehouseProducts(order.warehouse_id.toString());
        }
    }, [order.warehouse_id]);

    const handleWarehouseSelect = (warehouseId: string) => {
        setData(prev => ({
            ...prev,
            warehouse_id: warehouseId,
            items: prev.items.map(item => ({
                ...item,
                product_id: 0,
                unit_price: 0,
                description: '',
                tax_percentage: 0,
                taxes: [],
                tax_amount: 0,
                discount_amount: 0,
                total_amount: 0,
            }))
        }));
        fetchWarehouseProducts(warehouseId);
    };

    const selectedCustomer = React.useMemo(() => {
        if (!data.customer_id || !Array.isArray(customers)) return null;
        return customers.find((c: any) => String(c.id) === String(data.customer_id)) || null;
    }, [data.customer_id, customers]);

    const quotationOptions = React.useMemo(() => {
        const list = Array.isArray(quotes) ? [...quotes] : [];
        if (order.quotation_id && !list.some(q => String(q.id) === String(order.quotation_id))) {
            const qNum = order.quotation_number || order.quotation?.quotation_number || '';
            const qName = order.quotation_name || order.quotation?.subject || order.name || '';
            list.push({
                id: order.quotation_id,
                quotation_number: qNum,
                name: qName,
            });
        }
        return list;
    }, [quotes, order]);

    const handleCustomerChange = async (customerId: string) => {
        const id = customerId ? parseInt(customerId) : null;
        setData('customer_id', id);

        if (!customerId || customerId === 'none') {
            return;
        }

        // 1. Instant local auto-fill if available in customers prop
        const localCust = customers?.find((c: any) => String(c.id) === String(customerId));
        if (localCust) {
            const b = localCust.billing_address || {};
            const s = localCust.shipping_address || {};

            setData(prev => ({
                ...prev,
                customer_id: id,
                billing_address: b.address || b.address_line_1 || '',
                billing_city: b.city || '',
                billing_state: b.state || '',
                billing_country: b.country || '',
                billing_postal_code: b.postal_code || b.zip_code || '',
                shipping_address: s.address || s.address_line_1 || '',
                shipping_city: s.city || '',
                shipping_state: s.state || '',
                shipping_country: s.country || '',
                shipping_postal_code: s.postal_code || s.zip_code || '',
            }));
        }

        // 2. Async fetch for comprehensive customer profile
        try {
            const response = await fetch(route('salesorder.orders.customer-details', customerId));
            if (response.ok) {
                const fetchedData = await response.json();
                const fetchedCustomer = fetchedData.customer || fetchedData;
                const b = fetchedCustomer.billing_address || localCust?.billing_address || {};
                const s = fetchedCustomer.shipping_address || localCust?.shipping_address || {};

                setData(prev => ({
                    ...prev,
                    customer_id: id,
                    billing_address: b.address || b.address_line_1 || prev.billing_address,
                    billing_city: b.city || prev.billing_city,
                    billing_state: b.state || prev.billing_state,
                    billing_country: b.country || prev.billing_country,
                    billing_postal_code: b.postal_code || b.zip_code || prev.billing_postal_code,
                    shipping_address: s.address || s.address_line_1 || prev.shipping_address,
                    shipping_city: s.city || prev.shipping_city,
                    shipping_state: s.state || prev.shipping_state,
                    shipping_country: s.country || prev.shipping_country,
                    shipping_postal_code: s.postal_code || s.zip_code || prev.shipping_postal_code,
                }));
            }
        } catch (error) {
            console.error('Failed to fetch customer address details:', error);
        }
    };

    const handleCopyBillingToShipping = (checked: boolean) => {
        setCopyBillingToShipping(checked);
        if (checked) {
            setData(prev => ({
                ...prev,
                shipping_address: prev.billing_address,
                shipping_city: prev.billing_city,
                shipping_state: prev.billing_state,
                shipping_country: prev.billing_country,
                shipping_postal_code: prev.billing_postal_code
            }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('salesorder.orders.update', order.id), {
            onError: (err) => {
                console.error('Validation errors updating sales order:', err);
            }
        });
    };

    const totals = useTaxCalculator(data.items);

    return (
        <AuthenticatedLayout
            pageTitle={t('Edit Sales Order')}
            breadcrumbs={[
                { label: t('Sales'), url: route('salesorder.orders.index') },
                { label: t('Sales Orders'), url: route('salesorder.orders.index') },
                { label: t('Edit') }
            ]}
        >
            <Head title={t('Edit Sales Order')} />

            <div>
                <div className="mx-auto space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Primary Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Package className="w-5 h-5 text-primary" />
                                    {t('Primary Information')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Row 1: Order Name, Order Date, Expected Delivery Date, Status */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <Label htmlFor="name" required>
                                            {t('Order Name')}
                                        </Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder={t('e.g. Sales order For Mr. X')}
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div>
                                        <Label htmlFor="order_date" required>
                                            {t('Order Date')}
                                        </Label>
                                        <DatePicker
                                            id="order_date"
                                            value={data.order_date}
                                            onChange={(value) => {
                                                const newOrderDate = value;
                                                // Calculate 3 days after new order_date
                                                let newExpDate = data.expected_delivery_date;
                                                if (newOrderDate) {
                                                    const d = new Date(newOrderDate);
                                                    d.setDate(d.getDate() + 3);
                                                    const year = d.getFullYear();
                                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                                    const day = String(d.getDate()).padStart(2, '0');
                                                    newExpDate = `${year}-${month}-${day}`;
                                                }
                                                setData(prev => ({
                                                    ...prev,
                                                    order_date: newOrderDate,
                                                    expected_delivery_date: newExpDate
                                                }));
                                            }}
                                        />
                                        <InputError message={errors.order_date} />
                                    </div>

                                    <div>
                                        <Label htmlFor="expected_delivery_date" required>
                                            {t('Expected Delivery Date')}
                                        </Label>
                                        <DatePicker
                                            id="expected_delivery_date"
                                            value={data.expected_delivery_date}
                                            onChange={(value) => setData('expected_delivery_date', value)}
                                            minDate={data.order_date ? new Date(data.order_date) : undefined}
                                        />
                                        <InputError message={errors.expected_delivery_date} />
                                    </div>

                                    <div>
                                        <Label htmlFor="status" required>
                                            {t('Status')}
                                        </Label>
                                        <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="draft">{t('Draft')}</SelectItem>
                                                <SelectItem value="confirmed">{t('Confirmed')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.status} />
                                    </div>
                                </div>

                                {/* Row 2: Quotation, Warehouse, Customer, Assign To */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Quotation */}
                                    <div>
                                        <Label htmlFor="quotation_id">
                                            {t('Quotation')}
                                        </Label>
                                        <Select value={data.quotation_id?.toString() || ''} disabled={true}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select Quotation or Leave Empty')} />
                                            </SelectTrigger>
                                            <SelectContent searchable>
                                                {quotationOptions && quotationOptions.length > 0 ? (
                                                    quotationOptions.map((quote) => (
                                                        <SelectItem key={quote.id} value={quote.id.toString()}>
                                                            {quote.quotation_number ? `${quote.quotation_number} - ${quote.name}` : quote.name}
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem value="no-data" disabled>
                                                        {t('No accepted Quotations available')}
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.quotation_id} />
                                    </div>

                                    {/* Warehouse */}
                                    <div>
                                        <Label htmlFor="warehouse_id" required>
                                            {t('Warehouse')}
                                        </Label>
                                        <Select value={data.warehouse_id} onValueChange={handleWarehouseSelect}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select Warehouse')} />
                                            </SelectTrigger>
                                            <SelectContent searchable>
                                                {warehouses?.map((warehouse) => (
                                                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                                        {warehouse.name} - {warehouse.address}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.warehouse_id} />
                                    </div>

                                    {/* Customer */}
                                    <div>
                                        <Label htmlFor="customer_id" required>
                                            {t('Customer')}
                                        </Label>
                                        <Select
                                            value={data.customer_id ? data.customer_id.toString() : ''}
                                            onValueChange={handleCustomerChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select Customer')} />
                                            </SelectTrigger>
                                            <SelectContent searchable>
                                                {customers && customers.length > 0 ? (
                                                    customers.map((customer) => {
                                                        const custName = customer.customer_name;
                                                        const custEmail = customer.customer_email;
                                                        return (
                                                            <SelectItem key={customer.id} value={customer.id.toString()}>
                                                                {custName} {custEmail ? `- ${custEmail}` : ''}
                                                            </SelectItem>
                                                        );
                                                    })
                                                ) : (
                                                    <SelectItem value="no-data" disabled>
                                                        {t('No Customers available')}
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.customer_id} />

                                        {/* Selected Customer Preview Card */}
                                        {selectedCustomer && (
                                            <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-slate-50/80 dark:bg-slate-900/40 text-xs space-y-1">
                                                <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <div className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                                                            <User className="w-2.5 h-2.5" />
                                                        </div>
                                                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">
                                                            {selectedCustomer.customer_name}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-4 px-1 text-[10px] font-medium gap-0.5 shrink-0"
                                                        onClick={() => {
                                                            setData(prev => ({
                                                                ...prev,
                                                                customer_id: null,
                                                                billing_address: '',
                                                                billing_city: '',
                                                                billing_state: '',
                                                                billing_country: '',
                                                                billing_postal_code: '',
                                                                shipping_address: '',
                                                                shipping_city: '',
                                                                shipping_state: '',
                                                                shipping_country: '',
                                                                shipping_postal_code: '',
                                                            }));
                                                        }}
                                                    >
                                                        <X className="w-2.5 h-2.5" />
                                                        {t('Clear')}
                                                    </Button>
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 truncate">
                                                    <div className="truncate">{selectedCustomer.customer_email || '-'}</div>
                                                    {selectedCustomer.customer_phone && (
                                                        <div className="truncate">{selectedCustomer.customer_phone}</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Assign To */}
                                    <div>
                                        <Label>
                                            {t('Assign To')}
                                        </Label>
                                        <div className="space-y-2">
                                            {/* Button Group for Assignment Toggle */}
                                            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-full">
                                                <button
                                                    type="button"
                                                    className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${data.assignment_mode === 'group'
                                                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm font-semibold'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                                        }`}
                                                    onClick={() => {
                                                        if (data.assignment_mode === 'group') {
                                                            // Deselect
                                                            setData(prev => ({
                                                                ...prev,
                                                                assignment_mode: 'none',
                                                                assigned_group_id: null,
                                                                assigned_user_ids: [],
                                                                assign_user_id: null,
                                                            }));
                                                        } else {
                                                            // Select Group & clear user data
                                                            setData(prev => ({
                                                                ...prev,
                                                                assignment_mode: 'group',
                                                                assigned_user_ids: [],
                                                                assign_user_id: null,
                                                            }));
                                                        }
                                                    }}
                                                >
                                                    <Users className="w-3.5 h-3.5" />
                                                    {t('User Group')}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${data.assignment_mode === 'user'
                                                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm font-semibold'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                                        }`}
                                                    onClick={() => {
                                                        if (data.assignment_mode === 'user') {
                                                            // Deselect
                                                            setData(prev => ({
                                                                ...prev,
                                                                assignment_mode: 'none',
                                                                assigned_group_id: null,
                                                                assigned_user_ids: [],
                                                                assign_user_id: null,
                                                            }));
                                                        } else {
                                                            // Select User & clear group data
                                                            setData(prev => ({
                                                                ...prev,
                                                                assignment_mode: 'user',
                                                                assigned_group_id: null,
                                                            }));
                                                        }
                                                    }}
                                                >
                                                    <User className="w-3.5 h-3.5" />
                                                    {t('User')}
                                                </button>
                                            </div>

                                            {data.assignment_mode === 'group' && (
                                                <div>
                                                    <Select
                                                        value={data.assigned_group_id ? data.assigned_group_id.toString() : ''}
                                                        onValueChange={(val) => setData('assigned_group_id', val ? parseInt(val) : null)}
                                                    >
                                                        <SelectTrigger className="h-10 text-xs">
                                                            <SelectValue placeholder={t('Select User Group')} />
                                                        </SelectTrigger>
                                                        <SelectContent searchable>
                                                            {userGroups?.map((group) => (
                                                                <SelectItem key={group.id} value={group.id.toString()}>
                                                                    {group.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <InputError message={errors.assigned_group_id} />
                                                </div>
                                            )}

                                            {data.assignment_mode === 'user' && (
                                                <div>
                                                    <MultiSelectEnhanced
                                                        options={users?.map((u) => ({ value: String(u.id), label: u.name })) || []}
                                                        value={data.assigned_user_ids.map(id => String(id))}
                                                        onValueChange={(selectedValues) => {
                                                            const updatedIds = selectedValues.map(v => parseInt(v));
                                                            setData(prev => ({
                                                                ...prev,
                                                                assigned_user_ids: updatedIds,
                                                                assign_user_id: updatedIds[0] || null,
                                                            }));
                                                        }}
                                                        placeholder={t('Select user(s)...')}
                                                        searchable={true}
                                                    />
                                                    <InputError message={errors.assigned_user_ids || errors.assign_user_id} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Addresses: Billing & Shipping */}
                        <Card>
                            <CardContent className="space-y-4 pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                    <div>
                                        <h4 className="font-medium mb-3">{t('Billing Address')}</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <Label htmlFor="billing_address">
                                                    {t('Address')}
                                                </Label>
                                                <Textarea
                                                    id="billing_address"
                                                    value={data.billing_address}
                                                    onChange={(e) => setData('billing_address', e.target.value)}
                                                    rows={2}
                                                    placeholder={t('Billing address...')}
                                                />
                                                <InputError message={errors.billing_address} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label htmlFor="billing_city">
                                                        {t('City')}
                                                    </Label>
                                                    <Input
                                                        id="billing_city"
                                                        value={data.billing_city}
                                                        onChange={(e) => setData('billing_city', e.target.value)}
                                                        placeholder={t('City')}
                                                    />
                                                    <InputError message={errors.billing_city} />
                                                </div>
                                                <div>
                                                    <Label htmlFor="billing_state">
                                                        {t('State')}
                                                    </Label>
                                                    <Input
                                                        id="billing_state"
                                                        value={data.billing_state}
                                                        onChange={(e) => setData('billing_state', e.target.value)}
                                                        placeholder={t('State')}
                                                    />
                                                    <InputError message={errors.billing_state} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label htmlFor="billing_country">
                                                        {t('Country')}
                                                    </Label>
                                                    <Input
                                                        id="billing_country"
                                                        value={data.billing_country}
                                                        onChange={(e) => setData('billing_country', e.target.value)}
                                                        placeholder={t('Country')}
                                                    />
                                                    <InputError message={errors.billing_country} />
                                                </div>
                                                <div>
                                                    <Label htmlFor="billing_postal_code">
                                                        {t('Postal Code')}
                                                    </Label>
                                                    <Input
                                                        id="billing_postal_code"
                                                        value={data.billing_postal_code}
                                                        onChange={(e) => setData('billing_postal_code', e.target.value)}
                                                        placeholder={t('Postal Code')}
                                                    />
                                                    <InputError message={errors.billing_postal_code} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium">{t('Shipping Address')}</h4>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="copy-address"
                                                    checked={copyBillingToShipping}
                                                    onCheckedChange={(checked) => handleCopyBillingToShipping(checked === true)}
                                                />
                                                <Label htmlFor="copy-address" className="text-sm cursor-pointer">
                                                    {t('Copy from billing')}
                                                </Label>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <Label htmlFor="shipping_address">
                                                    {t('Address')}
                                                </Label>
                                                <Textarea
                                                    id="shipping_address"
                                                    value={data.shipping_address}
                                                    onChange={(e) => setData('shipping_address', e.target.value)}
                                                    rows={2}
                                                    placeholder={t('Shipping address...')}
                                                />
                                                <InputError message={errors.shipping_address} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label htmlFor="shipping_city">
                                                        {t('City')}
                                                    </Label>
                                                    <Input
                                                        id="shipping_city"
                                                        value={data.shipping_city}
                                                        onChange={(e) => setData('shipping_city', e.target.value)}
                                                        placeholder={t('City')}
                                                    />
                                                    <InputError message={errors.shipping_city} />
                                                </div>
                                                <div>
                                                    <Label htmlFor="shipping_state">
                                                        {t('State')}
                                                    </Label>
                                                    <Input
                                                        id="shipping_state"
                                                        value={data.shipping_state}
                                                        onChange={(e) => setData('shipping_state', e.target.value)}
                                                        placeholder={t('State')}
                                                    />
                                                    <InputError message={errors.shipping_state} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label htmlFor="shipping_country">
                                                        {t('Country')}
                                                    </Label>
                                                    <Input
                                                        id="shipping_country"
                                                        value={data.shipping_country}
                                                        onChange={(e) => setData('shipping_country', e.target.value)}
                                                        placeholder={t('Country')}
                                                    />
                                                    <InputError message={errors.shipping_country} />
                                                </div>
                                                <div>
                                                    <Label htmlFor="shipping_postal_code">
                                                        {t('Postal Code')}
                                                    </Label>
                                                    <Input
                                                        id="shipping_postal_code"
                                                        value={data.shipping_postal_code}
                                                        onChange={(e) => setData('shipping_postal_code', e.target.value)}
                                                        placeholder={t('Postal Code')}
                                                    />
                                                    <InputError message={errors.shipping_postal_code} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Description & Notes */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <Label htmlFor="description">
                                            {t('Description')}
                                        </Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            rows={2}
                                            placeholder={t('Order description...')}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="notes">
                                            {t('Notes')}
                                        </Label>
                                        <Textarea
                                            id="notes"
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                            rows={2}
                                            placeholder={t('Additional notes...')}
                                        />
                                    </div>
                                </div>

                                {/* Custom Fields */}
                                {customFields.length > 0 && (
                                    <div className="mt-1 pt-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {customFields.map((field) => (
                                                <div key={field.id} className="space-y-2">
                                                    {field.component}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Order Items */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Package className="h-5 w-5" />
                                        {t('Sales Order Items')}
                                    </CardTitle>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            const newItem = {
                                                product_id: 0,
                                                quantity: 1,
                                                unit_price: 0,
                                                discount_percentage: 0,
                                                discount_amount: 0,
                                                tax_percentage: 0,
                                                tax_amount: 0,
                                                total_amount: 0
                                            };
                                            setData('items', [...data.items, newItem]);
                                        }}
                                        variant="default"
                                        size="sm"
                                    >
                                        + {t('Add Item')}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <OrderItemsTable
                                    items={data.items}
                                    onChange={(items) => setData('items', items)}
                                    errors={errors}
                                    products={availableProducts}
                                    warehouseId={data.warehouse_id}
                                    showAddButton={false}
                                />

                                <div className="mt-6 flex justify-end">
                                    <div className="w-80 bg-muted/30 rounded-lg p-4">
                                        <h3 className="font-semibold mb-3">{t('Order Summary')}</h3>
                                        <div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">{t('Subtotal')}</span>
                                                <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">{t('Discount')}</span>
                                                <span className="font-medium text-red-600">-{formatCurrency(totals.discountAmount)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">{t('Tax')}</span>
                                                <span className="font-medium">{formatCurrency(totals.taxAmount)}</span>
                                            </div>
                                            <Separator className="my-2" />
                                            <div className="flex justify-between">
                                                <span className="font-semibold">{t('Total')}</span>
                                                <span className="font-bold text-lg">{formatCurrency(totals.total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-between items-center">
                            <div className="text-sm text-muted-foreground">
                                {data.items.length} {t('items added')}
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.visit(route('salesorder.orders.show', order.id))}
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing || data.items.length === 0}
                                    className="flex items-center gap-2"
                                >
                                    {processing && <Loader className="h-4 w-4 animate-spin shrink-0" />}
                                    <span>{processing ? t('Saving') : t('Save Changes')}</span>
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

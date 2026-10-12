export interface SalesInvoice {
    id: number;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    customer_mode?: 'existing' | 'new';
    customer_id?: number | null;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    customer_address?: string | null;
    warehouse_id?: number;
    type: 'product' | 'service';
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    paid_amount: number;
    balance_amount: number;
    status: 'draft' | 'posted' | 'partial' | 'paid' | 'overdue';
    display_status: 'draft' | 'posted' | 'partial' | 'paid' | 'overdue';
    payment_terms?: string;
    notes?: string;
    public_url?: string;
    creator_id: number;
    created_by: number;
    created_at: string;
    updated_at: string;
    customer?: Customer | User;
    customer_details?: CustomerDetails;
    warehouse?: Warehouse;
    items?: SalesInvoiceItem[];
    paymentAllocations?: CustomerPaymentAllocation[];
    payment_allocations?: CustomerPaymentAllocation[];
}

export interface CustomerPaymentAllocation {
    id?: number;
    payment_id?: number;
    invoice_id?: number;
    allocated_amount?: number;
    dues?: number;
    created_at?: string;
    updated_at?: string;
    payment?: {
        id?: number;
        payment_date?: string;
        payment_method?: string;
        status?: string;
        bank_account_id?: number;
        bankAccount?: {
            id?: number;
            account_name?: string;
            account_number?: string;
            bank_name?: string;
        };
        [key: string]: any;
    };
    [key: string]: any;
}

export interface SalesInvoiceItem {
    id?: number;
    invoice_id?: number;
    product_id: number;
    product_type?: string;
    description?: string;
    quantity: number;
    unit_price: number;
    discount_type?: 'percentage' | 'fixed';
    discount_percentage: number;
    discount_amount: number;
    tax_percentage: number;
    tax_amount: number;
    total_amount: number;
    taxes?: Array<{id?: number; tax_name: string; tax_rate: number}>;
    product?: ProductServiceItem;
}

export interface Customer {
    id: number;
    user_id?: number;
    name?: string;
    customer_name?: string;
    email?: string;
    customer_email?: string;
    phone?: string;
    customer_phone?: string;
    address?: string;
    customer_address?: string;
    billing_address?: any;
    shipping_address?: any;
    [key: string]: any;
}

export interface User {
    id: number;
    name: string;
    email: string;
    type?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
}

export interface CustomerDetails {
    id: number;
    user_id: number;
    customer_code: string;
    company_name: string;
    contact_person_name?: string;
    contact_person_email?: string;
    contact_person_mobile?: string;
    tax_number?: string;
    payment_terms?: string;
    billing_address?: Address;
    shipping_address?: Address;
    same_as_billing: boolean;
    notes?: string;
}

export interface Address {
    name: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
}

export interface Warehouse {
    id: number;
    name: string;
}

export interface ProductServiceItem {
    id: number;
    name: string;
    sku?: string;
    type?: string;
    description?: string;
    long_description?: string;
    price?: number;
    sale_price?: number;
    tax_rate?: number;
    unit?: string;
    unit_name?: string;
    unit_relation?: {
        id: number;
        unit_name: string;
    };
}

export interface SalesFilters {
    customer_id?: string;
    warehouse_id?: string;
    status?: string;
    search?: string;
    date_range?: string;
}
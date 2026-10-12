import { PaginatedData, ModalState, AuthContext } from '@/types/common';

// ─── Core Models ──────────────────────────────────────────────────────────────

export interface SalesOrder {
    id: number;
    order_number?: string;
    name: string;
    quotation_id?: number;
    status: 'draft' | 'confirmed' | 'cancelled';
    delivery_status: 'pending' | 'partial' | 'delivered';
    assignment_status: 'unassigned' | 'group_assigned' | 'acquired';
    assigned_group_id?: number;
    acquired_by?: number;
    acquired_at?: string;
    customer_id?: number;
    warehouse_id?: number;
    order_date: string;
    expected_delivery_date?: string;
    confirmed_at?: string;
    billing_address?: string;
    shipping_address?: string;
    billing_city?: string;
    billing_state?: string;
    shipping_city?: string;
    shipping_state?: string;
    billing_country?: string;
    billing_postal_code?: string;
    shipping_country?: string;
    shipping_postal_code?: string;
    description?: string;
    notes?: string;
    subtotal?: number;
    tax_amount?: number;
    discount_amount?: number;
    total_amount?: number;
    amount: number;  // computed by controller
    is_invoiced?: boolean;
    invoice_id?: number;
    created_at: string;

    // Relations
    customer?: { id: number; name: string; email?: string };
    warehouse?: { id: number; name: string };
    assigned_users?: Array<{ id: number; name: string; avatar?: string }>;
    assigned_group?: UserGroup;
    acquired_by_user?: { id: number; name: string; avatar?: string };
    items?: SalesOrderItem[];
    deliveries?: SalesOrderDelivery[];
    quotation?: { id: number; quotation_number: string };
}

export interface UserGroup {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    users_count?: number;
    users?: Array<{ id: number; name: string; email?: string }>;
}

export interface SalesOrderItem {
    id?: number;
    order_id?: number;
    product_id?: number | null;
    product_name?: string;
    product?: { id: number; name: string; sku?: string };
    quantity: number;
    unit_price: number;
    discount_percentage: number;
    discount_amount: number;
    tax_percentage: number;
    tax_amount: number;
    total_amount: number;
    unit?: string;
    description?: string;
    delivered_quantity?: number;
    remaining_quantity?: number;
    stock_quantity?: number;
    is_service?: boolean;
    hasStock?: boolean;
    taxes?: Array<{ tax_name: string; tax_rate: number }>;
}

export interface SalesOrderDelivery {
    id: number;
    sales_order_id: number;
    delivery_number: string;
    delivery_date: string;
    notes?: string;
    status: 'delivered' | 'cancelled';
    created_at: string;
    creator?: { id: number; name: string };
    items?: SalesOrderDeliveryItem[];
}

export interface SalesOrderDeliveryItem {
    id: number;
    delivery_id: number;
    sales_order_item_id: number;
    product_id?: number;
    quantity: number;
    notes?: string;
    sales_order_item?: Partial<SalesOrderItem>;
}

// ─── Form Data ────────────────────────────────────────────────────────────────

export interface SalesOrderFormData {
    name: string;
    quotation_id?: number | null;
    status: string;
    customer_id: number | null;
    warehouse_id?: number | null;
    order_date: string;
    expected_delivery_date?: string;
    billing_address: string;
    shipping_address: string;
    billing_city: string;
    billing_state: string;
    shipping_city: string;
    shipping_state: string;
    billing_country: string;
    billing_postal_code: string;
    shipping_country: string;
    shipping_postal_code: string;
    description: string;
    notes: string;
    assigned_group_id?: number | null;
    assign_user_id?: number | null;
    assigned_user_ids: number[];
    items: SalesOrderItem[];
    same_as_billing?: boolean;
}

export interface DeliveryFormData {
    delivery_date: string;
    notes: string;
    items: Array<{
        sales_order_item_id: number;
        quantity: number;
        notes?: string;
    }>;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface SalesOrderSettings {
    so_prefix: string;
    so_starting_number: string;
    dc_prefix: string;
    dc_starting_number: string;
    default_notes: string;
    default_terms: string;
    footer_note: string;
    template_color: string;
    show_logo: 'on' | 'off';
    logo_image: string;
    enable_letterhead: 'on' | 'off';
    bg_letterhead: string;
}

// ─── Page Props ───────────────────────────────────────────────────────────────

export type PaginatedSalesOrders = PaginatedData<SalesOrder>;
export type SalesOrderModalState = ModalState<SalesOrder>;

export interface DropdownOption {
    id: number;
    name: string;
    email?: string;
}

export interface SalesOrdersIndexProps {
    salesOrders: PaginatedSalesOrders;
    auth: AuthContext;
    customers?: DropdownOption[];
    users?: DropdownOption[];
    warehouses?: DropdownOption[];
    userGroups?: UserGroup[];
    settings?: SalesOrderSettings;
    filters?: Record<string, string>;
}

export interface SalesOrderShowProps {
    salesOrder: SalesOrder;
    orderItems: SalesOrderItem[];
    deliveries: SalesOrderDelivery[];
    quotation?: any;
    settings: SalesOrderSettings;
    userGroups?: UserGroup[];
    canConfirm: boolean;
    canCancel: boolean;
    canDeliver: boolean;
    canAssignGroup: boolean;
    canAcquire: boolean;
    canRelease: boolean;
    canReassign: boolean;
}

export interface SalesOrderFormProps {
    customers: DropdownOption[];
    users: DropdownOption[];
    userGroups?: UserGroup[];
    warehouses: DropdownOption[];
    settings: SalesOrderSettings;
    fromQuote?: any;
    order?: SalesOrder;
}
import { PaginatedData, ModalState, AuthContext } from '@/types/common';



export interface Lead {
    id: number;
    name: string;
    email: any;
    subject: string;
    organization_type?: string;
    user_id?: number;
    pipeline_id?: number;
    stage_id?: number;
    sources?: string[] | string;
    products?: string[] | string;
    notes?: string;
    labels?: string;
    order?: number;
    phone?: string;
    is_active: boolean;
    is_converted?: number;
    date?: string;
    creator_id?: number;
    created_at: string;
    additional_images?: string[] | string;
    stage?: any;
    user?: any;
    user_leads?: any[];
    tasks?: any[];
    emails?: any[];
    discussions?: any[];
    calls?: any[];
    activities?: any[];
}

export interface LeadFormData {
    subject?: string;
    organization_type?: string;
    user_id?: string;
    name?: string;
    email?: string;
    phone?: string;
    date?: string;
    pipeline_id?: string;
    stage_id?: string;
    sources?: string[];
    products?: string[];
    labels?: string[];
    notes?: string;
}

export interface CreateLeadFormData {
    subject: string;
    organization_type?: string;
    user_id: string;
    name: string;
    email: string;
    phone: string;
    date: string;
    pipeline_id?: string;
    stage_id?: string;
    sources?: string[];
    notes?: string;
}

export interface EditLeadFormData {
    subject: string;
    organization_type?: string;
    user_id: string;
    name: string;
    email: string;
    phone: string;
    date: string;
    pipeline_id: string;
    stage_id: string;
    sources: string[];
    products: string[];
    labels: string[];
    notes: string;
}

export interface LeadFilters {
    name: string;
    phone: string;
    email: string;
    subject: string;
    is_active: string;
    user_id: string;
    pipeline_id: string;
    stage_id: string;
    date_range: string;
    created_at_range: string;
}

export type PaginatedLeads = PaginatedData<Lead>;
export type LeadModalState = ModalState<Lead>;

export interface LeadsIndexProps {
    leads: PaginatedLeads;
    auth: AuthContext;
    users: any[];
    currentPipelineId?: number | null;
    pbxModuleActive?: boolean;
    [key: string]: unknown;
}

export interface CreateLeadProps {
    onSuccess: () => void;
}

export interface EditLeadProps {
    lead: Lead;
    onSuccess: () => void;
}

export interface LeadShowProps {
    lead: Lead;
    [key: string]: unknown;
}

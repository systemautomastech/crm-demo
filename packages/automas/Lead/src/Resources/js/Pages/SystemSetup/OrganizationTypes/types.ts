import { PaginatedData, ModalState, AuthContext, CreateProps, EditProps } from '@/types/common';

export interface OrganizationType {
    id: number;
    name: string;
    created_at: string;
}

export interface OrganizationTypeFormData {
    name: string;
}

export interface CreateOrganizationTypeProps extends CreateProps {
}

export interface EditOrganizationTypeProps extends EditProps<OrganizationType> {
}

export type PaginatedOrganizationTypes = PaginatedData<OrganizationType>;
export type OrganizationTypeModalState = ModalState<OrganizationType>;

export interface OrganizationTypesIndexProps {
    organizationTypes: OrganizationType[] | PaginatedOrganizationTypes;
    auth: AuthContext;
    [key: string]: unknown;
}

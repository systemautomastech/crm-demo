import { PaginatedData, ModalState, AuthContext, CreateProps, EditProps } from '@/types/common';

export interface CustomPage {
    id: number;
    title: string;
    slug: string;
    description: string;
    contents: string;
    is_editable: boolean;
    enable_page_footer: string;
    created_at: string;
}

export interface CustomPageFormData {
    title: string;
    slug: string;
    description: string;
    contents: string;
    enable_page_footer: string;
}

export interface CreateCustomPageProps extends CreateProps {
}

export interface EditCustomPageProps {
    customPage: CustomPage;
    onSuccess: () => void;
}

export type PaginatedCustomPages = PaginatedData<CustomPage>;
export type CustomPageModalState = ModalState<CustomPage>;

export interface CustomPagesIndexProps {
    custompages: PaginatedCustomPages;
    auth: AuthContext;
    [key: string]: unknown;
}
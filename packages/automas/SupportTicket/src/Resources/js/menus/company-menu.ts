import { Headphones } from 'lucide-react';

declare global {
    function route(name: string): string;
}

export const supportticketCompanyMenu = (t: (key: string) => string) => [
    {
        title: t('Support Dashboard'),
        href: route('support-ticket.dashboard'),
        permission: 'manage-dashboard-support-ticket',
        parent: 'dashboard',
        order: 140,
    },
    {
        title: t('Support Ticket'),
        icon: Headphones,
        permission: 'manage-support-ticket',
        order: 700,
        children: [
            {
                title: t('Tickets'),
                href: route('support-tickets.index'),
                permission: 'manage-support-tickets',
            },
            {
                title: t('Knowledge Base'),
                href: route('support-ticket-knowledge.index'),
                permission: 'manage-knowledge-base',
            },
            {
                title: t('FAQ'),
                href: route('support-ticket-faq.index'),
                permission: 'manage-faq',
            },
            {
                title: t('Contact'),
                href: route('support-ticket-contact.index'),
                permission: 'manage-contact',
            },
            {
                title: t('System Setup'),
                href: route('support-ticket.system-setup.support-team.index'),
                permission: 'manage-support-ticket-team',
            },
        ],
    }
];
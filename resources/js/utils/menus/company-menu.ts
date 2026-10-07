import { LayoutGrid, Users, Warehouse, ArrowRightLeft, Package, Tag, Tags, Shield, Settings, Image, CreditCard, Headphones, ShoppingCart, Kanban, Calendar, Replace, Receipt, Bot, FileCheck } from 'lucide-react';
import { NavItem } from '@/types';

export const getCompanyMenu = (t: (key: string) => string): NavItem[] => [
    {
        title: t('Dashboard'),
        icon: LayoutGrid,
        permission: 'manage-dashboard',
        name: 'dashboard',
        order: 10,
    },
    {
        title: t('User Management'),
        icon: Users,
        permission: 'manage-users',
        order: 20,
        children: [
            {
                title: t('Roles'),
                href: route('roles.index'),
                permission: 'manage-roles',
            },
            {
                title: t('Users'),
                href: route('users.index'),
                permission: 'manage-users',
            },
            {
                title: t('Clients & Vendors'),
                href: route('users.clients-vendors'),
                permission: 'manage-clients-vendors',
            },
            {
                title: t('User Groups'),
                href: route('user-groups.index'),
                permission: 'manage-user-groups',
            },
        ],
    },
    {
        title: t('Proposal'),
        icon: Replace,
        permission: 'manage-sales-proposals',
        order: 40,
        children: [
            {
                title: t('Proposal'),
                href: route('sales-proposals.index'),
                permission: 'manage-sales-proposals',
            },
            {
                title: t('System Setup'),
                href: route('proposal-setup.index'),
                permission: 'manage-proposal-system-setup',
                activeRoutes: [
                    'proposal-setup.*',
                ],
            },
        ],
    },
    {
        title: t('Invoice'),
        icon: Receipt,
        permission: 'manage-sales-invoices',
        module: 'ProductService',
        order: 60,
        children: [
            {
                title: t('Invoice'),
                href: route('sales-invoices.index'),
                permission: 'manage-sales-invoices',
            },
            {
                title: t('Invoice Returns'),
                href: route('sales-returns.index'),
                permission: 'manage-sales-return-invoices',
            },
            {
                title: t('System Setup'),
                href: route('sales-invoice-setup.index'),
                permission: 'manage-sales-invoice-setup',
            },
        ],
    },

    {
        title: t('Media Library'),
        href: route('media-library'),
        icon: Image,
        permission: 'manage-media',
        order: 200,
    },

    {
        title: t('Plan'),
        icon: CreditCard,
        permission: 'manage-plans',
        order: 250,
        children: [
            {
                title: t('Setup Subscription Plan'),
                href: route('plans.index'),
                permission: 'manage-plans',
            },
            {
                title: t('Bank Transfer Requests'),
                href: route('bank-transfer.index'),
                permission: 'manage-bank-transfer-requests',
            },
            {
                title: t('Orders'),
                href: route('orders.index'),
                permission: 'manage-orders',
            }
        ]
    },
    {
        title: t('Settings'),
        href: route('settings.index'),
        icon: Settings,
        permission: 'manage-settings',
        name: 'settings',
        order: 300,
    },
];

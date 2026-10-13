import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { Folder, BookOpen, HelpCircle, Library, Palette, FileEdit, Type, MousePointer, Link, Info, MapPin, Settings, Users } from "lucide-react";

interface SidebarItem {
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    route: string;
    permission: string;
}

interface SystemSetupSidebarProps {
    activeItem?: string;
    onSectionChange?: (section: string) => void;
}

export default function SystemSetupSidebar({ activeItem, onSectionChange }: SystemSetupSidebarProps) {
    const { t } = useTranslation();
    const { auth } = usePage().props as any;
    const currentRoute = route().current();

    const sidebarItems: SidebarItem[] = [
        {
            key: 'support-team',
            label: t('Support Team'),
            icon: Users,
            route: 'support-ticket.system-setup.support-team.index',
            permission: 'manage-support-ticket-team'
        },
        {
            key: 'categories',
            label: t('Categories'),
            icon: Folder,
            route: 'support-ticket.system-setup.ticket-category.index',
            permission: 'manage-ticket-categories'
        },
        {
            key: 'knowledge-categories',
            label: t('KnowledgeBase Category'),
            icon: Library,
            route: 'support-ticket.system-setup.knowledge-category.index',
            permission: 'manage-knowledge-base'
        },
        {
            key: 'brand-settings',
            label: t('Brand Settings'),
            icon: Palette,
            route: 'support-ticket.system-setup.brand-settings.index',
            permission: 'manage-support-settings'
        },

        {
            key: 'custom-pages',
            label: t('Custom Pages'),
            icon: FileEdit,
            route: 'support-ticket.system-setup.custom-pages.index',
            permission: 'manage-support-settings'
        },
        {
            key: 'title-sections',
            label: t('Title Sections'),
            icon: Type,
            route: 'support-ticket.system-setup.title-sections.index',
            permission: 'manage-support-settings'
        },
        {
            key: 'cta-sections',
            label: t('CTA Sections'),
            icon: MousePointer,
            route: 'support-ticket.system-setup.cta-sections.index',
            permission: 'manage-support-settings'
        },
        {
            key: 'quick-links',
            label: t('Quick Links'),
            icon: Link,
            route: 'support-ticket.system-setup.quick-links.index',
            permission: 'manage-support-settings'
        },
        {
            key: 'support-information',
            label: t('Support Information'),
            icon: Info,
            route: 'support-ticket.system-setup.support-information.index',
            permission: 'manage-support-settings'
        },
        {
            key: 'contact-information',
            label: t('Contact Information'),
            icon: MapPin,
            route: 'support-ticket.system-setup.contact-information.index',
            permission: 'manage-support-settings'
        },
    ];

    const filteredItems = sidebarItems.filter(item =>
        auth.user?.permissions?.includes(item.permission)
    );

    return (
        <div className="sticky top-4">
            <ScrollArea className="h-[calc(100vh-8rem)]">
                <div className="pr-4 space-y-1">
                    {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeItem === item.key || currentRoute === item.route;

                        return (
                            <Button
                                key={item.key}
                                variant="ghost"
                                className={cn('w-full justify-start', {
                                    'bg-muted font-medium': isActive,
                                })}
                                onClick={() => {
                                    router.get(route(item.route));
                                    onSectionChange?.(item.key);
                                }}
                            >
                                <Icon className="h-4 w-4 mr-2" />
                                {item.label}
                            </Button>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
import { useState, ReactNode } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from "@/components/ui/button";
import { getImagePath } from '@/utils/helpers';
import { useTranslation } from 'react-i18next';
import { useFormFields } from '@/hooks/useFormFields';

import {
    Menu,
    X,
    Ticket,
    Search,
    Book,
    HelpCircle,
    Headphones,
    KeyRound
} from 'lucide-react';

interface LayoutProps {
    children: ReactNode;
    title?: string;
}


export default function Layout({ children, title = "Support Ticket" }: LayoutProps) {
    const { t } = useTranslation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { supportTicketSettings, customPages, userSlug, companyAllSetting } = usePage<PageProps>().props;

    const integrationFields = useFormFields('getIntegrationFields', {}, () => { }, {}, 'create', t, 'SupportTicket');

    // Extract settings with proper fallbacks
    const brandSettings = supportTicketSettings.brand_settings || {};
    const featureSettings = supportTicketSettings?.feature_settings || {};

    // Dynamic system theme color extraction
    const themeColors: Record<string, string> = {
        blue: '#3b82f6',
        green: '#10b981',
        purple: '#8b5cf6',
        orange: '#f97316',
        red: '#ef4444'
    };

    const primaryColor = companyAllSetting?.themeColor === 'custom'
        ? (companyAllSetting?.customColor || '#10b981')
        : (themeColors[companyAllSetting?.themeColor] || '#10b981');

    // Helper for converting hex to HSL components
    const hexToHsl = (hex: string) => {
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(c => c + c).join('');
        }
        const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
        const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
        const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    const primaryHsl = hexToHsl(primaryColor);

    const logoUrl = brandSettings.logo_dark
        ? getImagePath(brandSettings.logo_dark)
        : getImagePath('packages/automas/SupportTicket/src/Resources/assets/images/logo.png');

    const faviconUrl = brandSettings.favicon
        ? getImagePath(brandSettings.favicon)
        : getImagePath('packages/automas/SupportTicket/src/Resources/assets/images/favicon.png');

    const siteTitle = brandSettings.title_text || 'Support Center';
    const footerText = brandSettings.footer_text || `Support System. All rights reserved.`;

    const navigationItems = [
        { name: t('Create Ticket'), href: route('support-ticket.index', [userSlug]), icon: Ticket },
        { name: t('Search Tickets'), href: route('support-ticket.search', [userSlug]), icon: Search },
        { name: t('My Ticket'), href: route('support-ticket.my-ticket', [userSlug]), icon: KeyRound },
    ];

    if (companyAllSetting?.knowledge_base_is_on === 'on') {
        navigationItems.push({ name: t('Knowledge Base'), href: route('support-ticket.knowledge', [userSlug]), icon: Book });
    }

    if (companyAllSetting?.faq_is_on === 'on') {
        navigationItems.push({ name: t('FAQ'), href: route('support-ticket.faq', [userSlug]), icon: HelpCircle });
    }

    return (
        <>
            <Head title={title}>
                <link rel="icon" type="image/x-icon" href={`${faviconUrl}?v=${Date.now()}`} />
            </Head>

            <style>{`
                :root {
                    --primary: ${primaryHsl};
                    --primary-foreground: 0 0% 98%;
                    --ring: ${primaryHsl};
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
            `}</style>

            <div className="min-h-screen font-sans relative overflow-x-hidden" style={{
                backgroundColor: `hsla(${primaryHsl} / 0.08)`,
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230284c7' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}>
                <div className="container mx-auto px-4 py-4 max-w-7xl relative z-10">
                    {/* Header */}
                    <header className="mb-10 md:mb-16">
                        <div className="bg-primary text-primary-foreground py-3 px-4 rounded-xl shadow-lg mb-4">
                            <div className="flex justify-between items-center">
                                {/* Logo */}
                                <h1>
                                    <Link href={route('support-ticket.index', [userSlug])} className="flex items-center space-x-3 lg:max-w-none max-w-[120px]">
                                        <img src={logoUrl} alt={siteTitle} className="h-8" />
                                    </Link>
                                </h1>

                                {/* Desktop Navigation */}
                                <div className="main-nav hidden md:flex flex-1 justify-center">
                                    <nav className="flex items-center gap-6">
                                        {navigationItems.map((item) => (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                className="text-white transition font-medium duration-300 hover:text-gray-200"
                                            >
                                                {item.name}
                                            </Link>
                                        ))}
                                    </nav>
                                </div>

                                {/* Contact Button */}
                                <div className="hidden md:block">
                                    <Button variant="secondary" size="sm" className="bg-white text-gray-700 hover:bg-gray-100" asChild>
                                        <Link href={route('support-ticket.contact', [userSlug])}>
                                            <Headphones className="h-4 w-4 mr-2" />
                                            {t('Contact')}
                                        </Link>
                                    </Button>
                                </div>

                                {/* Mobile Menu Button */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="md:hidden text-white"
                                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                >
                                    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                                </Button>
                            </div>
                        </div>

                        {/* Mobile Menu */}
                        {mobileMenuOpen && (
                            <div className="bg-white rounded-xl shadow-lg mb-4 p-4 md:hidden">
                                <nav className="flex flex-col space-y-2">
                                    {navigationItems.map((item) => (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className="text-gray-700 rounded-lg hover:text-primary transition duration-300 flex items-center p-2"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <item.icon className="h-4 w-4 mr-2" /> {item.name}
                                        </Link>
                                    ))}
                                    {featureSettings.contact_is_on === 'on' && (
                                        <div className="flex flex-wrap justify-center items-center border-t pt-3 gap-3">
                                            <Button size="sm" asChild>
                                                <Link href={route('support-ticket.contact', [userSlug])}>
                                                    <Headphones className="h-4 w-4 mr-2" /> {t('Contact')}
                                                </Link>
                                            </Button>
                                        </div>
                                    )}
                                </nav>
                            </div>
                        )}
                    </header>

                    {/* Main Content */}
                    {children}

                    {/* Help Chat Button */}
                    {featureSettings.contact_is_on === 'on' && (
                        <div className="fixed right-4 bottom-4 md:right-8 md:bottom-8 z-10">
                            <Button
                                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-14 h-14 p-0 shadow-lg hover:scale-110 transition-all duration-300"
                                aria-label="Get Help"
                                asChild
                            >
                                <Link href={route('support-ticket.contact', [userSlug])}>
                                    <Headphones className="h-6 w-6" />
                                </Link>
                            </Button>
                        </div>
                    )}

                    {/* Integration Widgets */}
                    {integrationFields.map((field) => (
                        <div key={field.id}>
                            {field.component}
                        </div>
                    ))}

                    {/* Footer */}
                    <footer className="mt-8 md:mt-12 text-center text-gray-600 text-sm">
                        <p>&copy; {new Date().getFullYear()} {footerText}</p>
                        {/* Custom Pages in Footer */}
                        <div className="mt-2 flex flex-wrap justify-center space-x-4">
                            <Link href={route('support-ticket.contact', [userSlug])} className="hover:text-primary transition-colors duration-200">{t('Contact Us')}</Link>
                            {customPages && customPages.filter((page: any) => page.enable_page_footer == 'on' || page.enable_page_footer === true).map((page: any) => (
                                <Link
                                    key={page.slug}
                                    href={route('support-ticket.custom-page', [userSlug, page.slug])}
                                    className="hover:text-primary transition-colors duration-200"
                                >
                                    {page.title}
                                </Link>
                            ))}
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}
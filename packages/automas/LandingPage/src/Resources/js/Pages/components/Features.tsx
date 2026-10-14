import { useTranslation } from 'react-i18next';
import {
    Folder,
    Calculator,
    UserCheck,
    Contact,
    ShoppingBag,
    Package,
    Layers,
    BarChart3,
    Shield,
    Settings,
    FileText,
    CheckSquare
} from 'lucide-react';

interface FeaturesProps {
    settings?: any;
}

export default function Features({ settings }: FeaturesProps) {
    const { t } = useTranslation();
    const sectionData = settings?.config_sections?.sections?.features || {};
    const colors = settings?.config_sections?.colors || {
        primary: 'var(--color-primary, #130774)',
        secondary: 'var(--color-secondary, #0b55b7)',
        accent: 'var(--color-accent, #130674)'
    };

    const title = sectionData.title || 'Powerful Modular Features';
    const subtitle = sectionData.subtitle || 'Everything your business needs in one integrated platform';

    const defaultIcons = [Folder, Calculator, UserCheck, Contact, ShoppingBag, Package];

    const getFeatureIcon = (iconName?: string, idx: number = 0) => {
        if (!iconName) return defaultIcons[idx % defaultIcons.length];

        const name = String(iconName).toLowerCase().replace(/[\s\-_]/g, '');
        switch (name) {
            case 'folder':
            case 'folderkanban':
            case 'layout':
                return Folder;
            case 'calculator':
            case 'landmark':
            case 'dollarsign':
                return Calculator;
            case 'usercheck':
            case 'user-check':
            case 'user_check':
            case 'users':
            case 'usercog':
            case 'hrm':
                return UserCheck;
            case 'contact':
            case 'usershield':
            case 'crm':
                return Contact;
            case 'shoppingbag':
            case 'shoppingcart':
            case 'pos':
                return ShoppingBag;
            case 'package':
            case 'layers':
            case 'box':
            case 'product':
                return Package;
            case 'shield':
                return Shield;
            case 'barchart':
            case 'barchart3':
                return BarChart3;
            case 'settings':
                return Settings;
            case 'filetext':
                return FileText;
            case 'checksquare':
                return CheckSquare;
            default:
                return defaultIcons[idx % defaultIcons.length];
        }
    };

    const defaultFeatureCards = [
        {
            icon: 'Folder',
            bg: '#F5F2FF',
            color: '#7C5CFF',
            badge: 'Enterprise',
            title: 'Project Management',
            description: 'Organize and track projects efficiently. Manage tasks, milestones, and deadlines with team collaboration. Track progress with Gantt charts and Kanban boards.'
        },
        {
            icon: 'Calculator',
            bg: '#EAF1FE',
            color: '#2F6FED',
            badge: 'Enterprise',
            title: 'Accounting',
            description: 'Manage finances with ease and accuracy. Handle invoices, bills, and payments. Track income and expenses and generate detailed financial reports.'
        },
        {
            icon: 'User Check',
            bg: '#FFF6E5',
            color: '#F5A524',
            badge: 'Enterprise',
            title: 'HRM',
            description: 'Simplify employee management and payroll. Manage employee records and profiles, attendance and leave management, and payroll processing automation.'
        },
        {
            icon: 'Contact',
            bg: '#FDEEF3',
            color: '#EC4899',
            badge: 'Enterprise',
            title: 'CRM',
            description: 'Strengthen customer relationships and improve sales. Manage leads and contacts, track sales pipeline, and handle deal and opportunity management.'
        },
        {
            icon: 'ShoppingBag',
            bg: '#E5FAFD',
            color: '#06B6D4',
            badge: 'Enterprise',
            title: 'POS',
            description: 'Fast and reliable point-of-sale solution. Process transactions quickly, manage inventory in real-time, and handle multiple payment methods.'
        },
        {
            icon: 'Package',
            bg: '#EAFBF0',
            color: '#16A34A',
            badge: 'Enterprise',
            title: 'Product & Service',
            description: 'Manage your products and services catalog efficiently. Organize product categories, manage inventory levels, and implement pricing strategies.'
        }
    ];

    const featureCards = (sectionData.features && sectionData.features.length > 0)
        ? sectionData.features
        : defaultFeatureCards;

    return (
        <section id="features" className="py-6 lg:py-24 bg-transparent">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">

                {/* Header from settings */}
                <div className="text-center max-w-2xl mx-auto mb-16 gsap-card-reveal">
                    <span
                        className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full mb-4 shadow-2xs"
                        style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
                    >
                        <span className="text-[10px]">◆</span> {t('Main Features')}
                    </span>
                    <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
                        {t(title)}
                    </h2>
                    {subtitle && (
                        <p className="mt-4 text-base text-slate-500 font-normal">
                            {t(subtitle)}
                        </p>
                    )}
                </div>

                {/* 6 Cards Grid with Selected Settings Icons (2 columns on mobile) */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                    {featureCards.map((item: any, idx: number) => {
                        const fallbackCard = defaultFeatureCards[idx % defaultFeatureCards.length];
                        const cardBg = item.bg || fallbackCard.bg;
                        const cardColor = item.color || fallbackCard.color;
                        const cardBadge = item.badge || fallbackCard.badge;
                        const IconComponent = getFeatureIcon(item.icon || item.icon_name || fallbackCard.icon, idx);

                        return (
                            <div
                                key={idx}
                                className="gsap-card-reveal rounded-xl sm:rounded-2xl border border-slate-200/80 p-3.5 sm:p-8 transition-[box-shadow,border-color] duration-300 hover:shadow-xl group flex flex-col justify-between h-full min-h-[160px] sm:min-h-[220px]"
                                style={{ backgroundColor: cardBg }}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3 sm:mb-6">
                                        <div
                                            className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300"
                                            style={{ backgroundColor: cardColor }}
                                        >
                                            <IconComponent className="w-4 h-4 sm:w-6 sm:h-6 stroke-[2]" />
                                        </div>
                                        {cardBadge && (
                                            <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-xs font-bold bg-white/80 border border-slate-200/60 text-slate-700 shadow-2xs">
                                                {t(cardBadge)}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="font-display text-sm sm:text-xl font-bold text-slate-900 mb-1.5 sm:mb-3 line-clamp-2">
                                        {t(item.title)}
                                    </h3>

                                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal line-clamp-3 sm:line-clamp-none">
                                        {t(item.description || item.desc)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}
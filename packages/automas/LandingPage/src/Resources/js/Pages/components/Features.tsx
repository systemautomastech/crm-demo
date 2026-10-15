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

    const rawTitle = sectionData.title;
    const title = (!rawTitle || rawTitle === 'Powerful Sales & Communication Tools' || rawTitle === 'Powerful Modular Features')
        ? 'Tools That Keep Business Moving'
        : rawTitle;
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
            description: 'Organize and track projects efficiently. Manage tasks, milestones, and deadlines with team collaboration. Track progress with Gantt charts and Kanban boards.',
            image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        },
        {
            icon: 'Calculator',
            bg: '#EAF1FE',
            color: '#2F6FED',
            badge: 'Enterprise',
            title: 'Accounting',
            description: 'Manage finances with ease and accuracy. Handle invoices, bills, and payments. Track income and expenses and generate detailed financial reports.',
            image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
        },
        {
            icon: 'User Check',
            bg: '#FFF6E5',
            color: '#F5A524',
            badge: 'Enterprise',
            title: 'HRM',
            description: 'Simplify employee management and payroll. Manage employee records and profiles, attendance and leave management, and payroll processing automation.',
            image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
        },
        {
            icon: 'Contact',
            bg: '#FDEEF3',
            color: '#EC4899',
            badge: 'Enterprise',
            title: 'CRM',
            description: 'Strengthen customer relationships and improve sales. Manage leads and contacts, track sales pipeline, and handle deal and opportunity management.',
            image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
        },
        {
            icon: 'ShoppingBag',
            bg: '#E5FAFD',
            color: '#06B6D4',
            badge: 'Enterprise',
            title: 'POS',
            description: 'Fast and reliable point-of-sale solution. Process transactions quickly, manage inventory in real-time, and handle multiple payment methods.',
            image: 'https://images.unsplash.com/photo-1556742049-0a67e557224f?auto=format&fit=crop&w=800&q=80',
        },
        {
            icon: 'Package',
            bg: '#EAFBF0',
            color: '#16A34A',
            badge: 'Enterprise',
            title: 'Product & Service',
            description: 'Manage your products and services catalog efficiently. Organize product categories, manage inventory levels, and implement pricing strategies.',
            image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
        }
    ];

    const featureCards = (sectionData.features && sectionData.features.length > 0)
        ? sectionData.features
        : defaultFeatureCards;

    return (
        <section id="features" className="py-12 lg:py-24 bg-transparent select-text">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-14 lg:mb-20 gsap-section-header">
                    <span
                        className="inline-flex items-center gap-2 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full mb-4 shadow-2xs border border-slate-200/80 bg-white"
                        style={{ color: colors.primary }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        {t('Modular Capabilities')}
                    </span>
                    <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                        {t(title)}
                    </h2>
                    {subtitle && (
                        <p className="mt-4 text-base sm:text-lg text-slate-500 font-normal max-w-2xl mx-auto leading-relaxed">
                            {t(subtitle)}
                        </p>
                    )}
                </div>

                {/* Sticky Stacking Cards Container */}
                <div className="relative flex flex-col gap-8 lg:gap-10 pb-20">
                    {featureCards.map((item: any, idx: number) => {
                        const fallbackCard = defaultFeatureCards[idx % defaultFeatureCards.length];
                        const cardBg = item.bg || fallbackCard.bg;
                        const cardColor = item.color || fallbackCard.color;
                        const cardBadge = item.badge || fallbackCard.badge;
                        const cardImage = item.image || item.image_url || fallbackCard.image;
                        const IconComponent = getFeatureIcon(item.icon || item.icon_name || fallbackCard.icon, idx);

                        // Sticky top offset increased so when cards stick/atkay, they have a generous top margin below the header
                        const topOffset = 130 + idx * 30;

                        return (
                            <div
                                key={idx}
                                className="sticky rounded-3xl border transition-all duration-300 p-8 sm:p-10 lg:p-12 shadow-[0_10px_35px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_45px_rgba(0,0,0,0.07)] group will-change-transform min-h-[380px] lg:min-h-[420px] flex flex-col justify-center"
                                style={{
                                    top: `${topOffset}px`,
                                    zIndex: idx + 1,
                                    backgroundColor: cardBg,
                                    borderColor: `${cardColor}28`,
                                }}
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                                    {/* Left Content Column */}
                                    <div className="lg:col-span-6 flex flex-col justify-between py-2">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div
                                                className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-200 bg-white shadow-2xs"
                                                style={{ color: cardColor }}
                                            >
                                                <IconComponent className="w-5 h-5 stroke-[2.2]" />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono font-semibold text-slate-400">
                                                    0{idx + 1}
                                                </span>
                                                <span className="text-slate-300">/</span>
                                                {cardBadge && (
                                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-slate-700 border border-slate-200/80 shadow-2xs">
                                                        {t(cardBadge)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-4 font-display">
                                            {t(item.title)}
                                        </h3>

                                        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal mb-8 max-w-xl">
                                            {t(item.description || item.desc)}
                                        </p>

                                        {/* Minimal Highlights */}
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 pt-5 border-t border-slate-900/5 text-xs sm:text-sm font-medium text-slate-700">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cardColor }} />
                                                <span>{t('Instant Sync & Updates')}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cardColor }} />
                                                <span>{t('Role-Based Access')}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cardColor }} />
                                                <span>{t('Automated Audit Logs')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right High-Quality Visual Image Resource Column */}
                                    <div className="lg:col-span-6">
                                        <div className="rounded-2xl overflow-hidden border border-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative h-[240px] sm:h-[280px] lg:h-[320px] bg-white group/img">
                                            <img
                                                src={cardImage}
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700 ease-out"
                                                loading="lazy"
                                            />
                                            {/* Soft Gradient Overlay for text contrast */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/10 to-transparent" />

                                            {/* Floating Info Capsule over Image */}
                                            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between p-3 rounded-xl bg-white/90 backdrop-blur-md border border-white/80 shadow-md">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-xs font-bold text-slate-800">
                                                        {t(item.title)} Module
                                                    </span>
                                                </div>
                                                <span
                                                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                                                    style={{ backgroundColor: `${cardColor}18`, color: cardColor }}
                                                >
                                                    {t('Live & Connected')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}
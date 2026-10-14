import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronLeft, ChevronRight, Layout, Landmark, Users as HrmIcon, Contact, ShoppingCart, Package, Layers, CheckCircle2, Sparkles } from 'lucide-react';
import { getImagePath } from '@/utils/helpers';

interface ModulesProps {
    settings?: any;
}

export default function Modules({ settings }: ModulesProps) {
    const { t } = useTranslation();
    const trackRef = useRef<HTMLDivElement>(null);

    const sectionData = settings?.config_sections?.sections?.modules || {};

    const colors = settings?.config_sections?.colors || {
        primary: 'var(--color-primary, #130774)',
        secondary: 'var(--color-secondary, #0b55b7)',
        accent: 'var(--color-accent, #130674)'
    };
    const primaryColor = colors.primary || 'var(--color-primary)';
    const secondaryColor = colors.secondary || 'var(--color-secondary)';

    const sectionTitle = sectionData.title || 'Complete Business Solutions';
    const sectionSubtitle = sectionData.subtitle || 'Discover our comprehensive modules designed to streamline every aspect of your business operations.';

    const defaultModulesList = [
        {
            key: 'taskly',
            label: 'Project',
            title: 'Project Management System',
            description: 'Organize and track projects efficiently with comprehensive project management tools. Manage tasks, milestones, and deadlines with team collaboration in one centralized platform.',
            highlights: ['Gantt Charts & Kanban Boards', 'Task Priority & Deadline Tracking', 'Team Collaboration & Timesheets', 'Comprehensive Project Reports'],
            image: '/packages/automas/LandingPage/src/marketplace/image1.png'
        },
        {
            key: 'account',
            label: 'Accounting',
            title: 'Complete Accounting & Financial Management',
            description: 'Streamline your financial operations with our comprehensive accounting system. Manage invoices, bills, and payments, track income and expenses, perform bank account reconciliation.',
            highlights: ['Invoice & Bill Management', 'Bank Account Reconciliation', 'Tax Calculations & Compliance', 'Real-time Financial Analytics'],
            image: '/packages/automas/LandingPage/src/marketplace/image2.png'
        },
        {
            key: 'hrm',
            label: 'HRM',
            title: 'Human Resource Management System',
            description: 'Complete employee management solution for modern businesses. Manage employee records and profiles, attendance and leave management, payroll processing and automation.',
            highlights: ['Employee Profile Management', 'Attendance & Leave Tracking', 'Automated Payroll Processing', 'Performance Evaluation'],
            image: '/packages/automas/LandingPage/src/marketplace/image3.png'
        },
        {
            key: 'lead',
            label: 'CRM',
            title: 'Customer Relationship Management',
            description: 'Build stronger customer relationships and boost sales with our powerful CRM system. Manage leads and contacts, track sales pipeline, handle deal and opportunity management.',
            highlights: ['Lead & Pipeline Tracking', 'Customer Contact History', 'Deal Stage Automation', 'Sales Performance Insights'],
            image: '/packages/automas/LandingPage/src/marketplace/image4.png'
        },
        {
            key: 'pos',
            label: 'POS',
            title: 'Point of Sale System',
            description: 'Fast, reliable point-of-sale solution for retail and service businesses. Process transactions quickly, manage inventory in real-time, handle multiple payment methods.',
            highlights: ['Quick Checkout & Barcode Scan', 'Real-Time Inventory Sync', 'Multiple Payment Gateways', 'Daily Sales & Cash Reports'],
            image: '/packages/automas/LandingPage/src/marketplace/image5.png'
        },
        {
            key: 'productservice',
            label: 'Product & Service',
            title: 'Product & Service Management',
            description: 'Efficiently manage your complete products and services catalog. Organize product categories, manage inventory levels, implement pricing strategies and variations.',
            highlights: ['Catalog & Category Organization', 'Multi-Warehouse Stock Control', 'Product Variant Management', 'Purchase & Reorder Alerts'],
            image: '/packages/automas/LandingPage/src/marketplace/image6.png'
        }
    ];

    const modulesList: any[] = (sectionData.modules && sectionData.modules.length > 0)
        ? sectionData.modules
        : defaultModulesList;

    const [activeIdx, setActiveIdx] = useState<number>(0);
    const [isAutoPlay, setIsAutoPlay] = useState<boolean>(true);
    const [windowWidth, setWindowWidth] = useState<number>(
        typeof window !== 'undefined' ? window.innerWidth : 1200
    );

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getModuleIcon = (key: string) => {
        switch (key) {
            case 'taskly': return Layout;
            case 'account': return Landmark;
            case 'hrm': return HrmIcon;
            case 'lead': return Contact;
            case 'pos': return ShoppingCart;
            case 'productservice': return Package;
            default: return Layers;
        }
    };

    const nextSlide = () => {
        setActiveIdx((prev) => (prev + 1) % modulesList.length);
    };

    const prevSlide = () => {
        setActiveIdx((prev) => (prev - 1 + modulesList.length) % modulesList.length);
    };

    useEffect(() => {
        if (!isAutoPlay) return;
        const timer = setInterval(() => {
            nextSlide();
        }, 6000);
        return () => clearInterval(timer);
    }, [isAutoPlay, modulesList.length]);

    // Calculate dynamic transform to center active slide across device modes
    const getTrackTransform = () => {
        if (windowWidth >= 1280) {
            // Desktop mode (1280px+): 900px cards perfectly centered at 50vw
            return `translateX(calc(50vw - ${(activeIdx * 900) + 450}px))`;
        } else {
            // Tablet & Mobile mode: Clean 1-by-1 slide transition centered 100% in viewport
            return `translateX(-${activeIdx * 100}%)`;
        }
    };

    return (
        <section id="modules" className="relative py-6 lg:py-24 bg-transparent text-slate-900 overflow-hidden select-none">
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-10 lg:mb-14 gsap-section-header">
                    <span
                        className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border border-slate-200/80 mb-4 shadow-2xs"
                        style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        {t('Business Modules')}
                    </span>
                    <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-4">
                        {t(sectionTitle)}
                    </h2>
                    {sectionSubtitle && (
                        <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
                            {t(sectionSubtitle)}
                        </p>
                    )}
                </div>

                {/* Centered Category Pill Tabs */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mb-12 lg:mb-4">
                    {modulesList.map((mod: any, idx: number) => {
                        const isActive = idx === activeIdx;
                        const ModIcon = getModuleIcon(mod.key);
                        return (
                            <button
                                key={mod.key || idx}
                                onClick={() => {
                                    setActiveIdx(idx);
                                    setIsAutoPlay(false);
                                }}
                                style={isActive ? { backgroundColor: primaryColor, color: '#ffffff' } : {}}
                                className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-2.5 ${isActive
                                    ? 'shadow-lg scale-110'
                                    : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
                                    }`}
                            >
                                <ModIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                                <span>{t(mod.label || mod.title)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Slider Wrapper */}
            <div
                className="gsap-modules-carousel relative z-10 w-full"
                onMouseEnter={() => setIsAutoPlay(false)}
                onMouseLeave={() => setIsAutoPlay(true)}
            >
                {/* Floating Outside Arrow Buttons */}
                <button
                    onClick={prevSlide}
                    aria-label="Previous Module"
                    className="absolute left-1 sm:left-6 lg:left-12 top-1/2 -translate-y-1/2 z-40 w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/95 text-slate-800 border border-slate-200/90 shadow-2xl hidden sm:flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer group"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = primaryColor;
                        e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                        e.currentTarget.style.color = '#1e293b';
                    }}
                >
                    <ChevronLeft className="w-5 h-5 sm:w-7 sm:h-7 transition-transform group-hover:-translate-x-0.5" />
                </button>

                <button
                    onClick={nextSlide}
                    aria-label="Next Module"
                    className="absolute right-1 sm:right-6 lg:right-12 top-1/2 -translate-y-1/2 z-40 w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/95 text-slate-800 border border-slate-200/90 shadow-2xl hidden sm:flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer group"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = primaryColor;
                        e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                        e.currentTarget.style.color = '#1e293b';
                    }}
                >
                    <ChevronRight className="w-5 h-5 sm:w-7 sm:h-7 transition-transform group-hover:translate-x-0.5" />
                </button>

                {/* Carousel Track Centered on Screen */}
                <div className="py-4 overflow-hidden w-full max-w-full">
                    <div
                        ref={trackRef}
                        className="flex items-center w-full transition-transform duration-700 ease-out"
                        style={{ transform: getTrackTransform() }}
                    >
                        {modulesList.map((mod: any, idx: number) => {
                            const isActive = idx === activeIdx;
                            const IconComponent = getModuleIcon(mod.key);
                            const imageUrl = mod.image ? getImagePath(mod.image) : null;

                            return (
                                <div
                                    key={mod.key || idx}
                                    onClick={() => {
                                        if (!isActive) {
                                            setActiveIdx(idx);
                                            setIsAutoPlay(false);
                                        }
                                    }}
                                    className={`w-full min-w-full xl:min-w-0 xl:w-[900px] shrink-0 px-4 sm:px-6 transition-all duration-700 ease-out ${isActive
                                        ? 'scale-100 opacity-100 visible z-20'
                                        : 'scale-95 xl:scale-90 opacity-0 invisible xl:visible xl:opacity-40 pointer-events-none xl:pointer-events-auto hover:opacity-75 cursor-pointer z-10'
                                        }`}
                                >
                                    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 lg:p-8 max-w-4xl mx-auto">
                                        {/* Top Header Row Across Card - Far Left & Far Right */}
                                        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
                                            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100/90 text-slate-800 border border-slate-200">
                                                <IconComponent className="w-4 h-4 text-slate-700" />
                                                <span>{t(mod.label || 'Module')}</span>
                                            </div>

                                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400 bg-slate-100/90 px-3.5 py-1.5 rounded-full border border-slate-200/70 shadow-2xs">
                                                <span style={{ color: primaryColor }} className="text-sm font-extrabold">0{idx + 1}</span>
                                                <span>/</span>
                                                <span>0{modulesList.length}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

                                            {/* Left Info Column (Second on mobile, First on desktop) */}
                                            <div className="lg:col-span-6 space-y-5 lg:space-y-6 order-2 lg:order-1">

                                                {/* Title & Description */}
                                                <div className="space-y-3">
                                                    <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 leading-tight tracking-tight">
                                                        {t(mod.title)}
                                                    </h3>
                                                    <p className="text-slate-400 text-sm leading-relaxed font-normal">
                                                        {t(mod.description)}
                                                    </p>
                                                </div>

                                                {/* Feature Highlights Grid */}
                                                {mod.highlights && mod.highlights.length > 0 && (
                                                    <div className="space-y-2.5 pt-1">
                                                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                            {t('Key Capabilities')}
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                            {mod.highlights.map((h: string, i: number) => (
                                                                <div key={i} className="flex items-center gap-2 text-xs text-slate-700 font-medium bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                                                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                                                                    <span>{t(h)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* CTA Action Button */}
                                                <div className="pt-2">
                                                    <a
                                                        href={route('register')}
                                                        style={{ backgroundColor: primaryColor }}
                                                        className="px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold text-white inline-flex items-center gap-2 shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-105 hover:opacity-95"
                                                    >
                                                        <span>{t(`Explore ${mod.label || 'Module'}`)}</span>
                                                        <ArrowRight className="w-4 h-4" />
                                                    </a>
                                                </div>

                                            </div>

                                            {/* Right Full Dashboard Image Frame (First on mobile, Second on desktop) */}
                                            <div className="lg:col-span-6 order-1 lg:order-2">
                                                <div className="relative bg-gray-50 rounded-2xl p-3 border border-slate-200 overflow-hidden group">
                                                    {/* Browser Header Bar */}
                                                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 px-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                                        </div>
                                                        <div className="bg-gray-100 text-slate-400 text-[11px] font-mono px-3 py-0.5 rounded-full border border-slate-200 truncate max-w-[240px]">
                                                            {import.meta.env.VITE_APP_URL || 'automas.com.bd'}/{mod.key || 'module'}
                                                        </div>
                                                    </div>

                                                    {/* Screenshot Image Container */}
                                                    <div className="relative overflow-hidden rounded-xl bg-gray-100">
                                                        {imageUrl ? (
                                                            <img
                                                                src={imageUrl}
                                                                alt={t(mod.title)}
                                                                className="w-full h-[200px] sm:h-[300px] lg:h-[200px] object-fill rounded-xl transition-all duration-700 group-hover:scale-102"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-[200px] sm:h-[300px] lg:h-[350px] bg-slate-900 flex flex-col items-center justify-center text-slate-500 gap-2">
                                                                <IconComponent className="w-12 h-12 stroke-[1.5]" />
                                                                <span className="text-xs font-mono">{t('Module Dashboard Preview')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Pagination Indicator Dots */}
                <div className="flex items-center justify-center gap-2.5 mt-6">
                    {modulesList.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setActiveIdx(idx);
                                setIsAutoPlay(false);
                            }}
                            aria-label={`Go to slide ${idx + 1}`}
                            className={`h-2.5 rounded-full transition-all duration-300 ${idx === activeIdx
                                ? 'w-10 bg-slate-900'
                                : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
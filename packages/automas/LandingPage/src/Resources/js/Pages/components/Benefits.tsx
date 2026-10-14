import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Landmark, UserCog, Contact, MonitorSmartphone, Shield, Eye, Maximize2, X, Plus, ArrowUpRight } from 'lucide-react';
import { getImagePath } from '@/utils/helpers';

interface BenefitsProps {
    settings?: any;
}

export default function Benefits({ settings }: BenefitsProps) {
    const { t } = useTranslation();
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [activeShot, setActiveShot] = useState<number>(0);

    const sectionData = settings?.config_sections?.sections?.benefits || {};
    const galleryData = settings?.config_sections?.sections?.gallery || {};
    const colors = settings?.config_sections?.colors || {
        primary: 'var(--color-primary, #130774)',
        secondary: 'var(--color-secondary, #0b55b7)',
        accent: 'var(--color-accent, #130674)'
    };
    const primaryColor = colors.primary || 'var(--color-primary)';
    const secondaryColor = colors.secondary || 'var(--color-secondary)';

    const sectionTitle = sectionData.title || 'Why Choose Automas CRM?';
    const sectionSubtitle = sectionData.subtitle || 'Built for modern enterprises that demand reliability, scalability, and seamless integration.';

    const defaultWhyChooseUs = [
        { icon: ClipboardList, cardBg: '#F5F2FF', iconBg: '#7C5CFF', title: 'Complete Project Management', desc: 'End-to-end project tracking with Gantt charts, Kanban boards, and team collaboration tools.' },
        { icon: Landmark, cardBg: '#EAF1FE', iconBg: '#2F6FED', title: 'Integrated Financial System', desc: 'Comprehensive accounting, invoicing, expense tracking, and real-time financial reporting.' },
        { icon: UserCog, cardBg: '#FFF6E5', iconBg: '#F5A524', title: 'Efficient HR Management', desc: 'Streamlined employee records, attendance, payroll, and performance tracking.' },
        { icon: Contact, cardBg: '#FDEEF3', iconBg: '#EC4899', title: 'Powerful CRM Tools', desc: 'Manage leads, track pipelines, and close deals faster with intelligent automation.' },
        { icon: MonitorSmartphone, cardBg: '#E5FAFD', iconBg: '#06B6D4', title: 'Modern POS Solution', desc: 'Fast transactions, real-time inventory, and multi-payment support for retail.' },
        { icon: Shield, cardBg: '#EAFBF0', iconBg: '#16A34A', title: 'Scalable & Secure', desc: 'Enterprise-grade security with 99.9% uptime. Scales with your business growth.' },
    ];

    const icons = [ClipboardList, Landmark, UserCog, Contact, MonitorSmartphone, Shield];

    const whyChooseUs = (sectionData.benefits && sectionData.benefits.length > 0)
        ? sectionData.benefits.map((b: any, idx: number) => {
            const fallback = defaultWhyChooseUs[idx % defaultWhyChooseUs.length];
            return {
                icon: icons[idx % icons.length],
                cardBg: b.bg || b.card_bg || fallback.cardBg,
                iconBg: b.color || b.icon_bg || fallback.iconBg,
                title: b.title,
                desc: b.description || b.desc
            };
        })
        : defaultWhyChooseUs;

    const galleryTitle = galleryData.title || 'See Automas CRM in Action';
    const gallerySubtitle = galleryData.subtitle || 'Explore our intuitive interface and powerful features through real screenshots of our platform.';

    const galleryImages: string[] = galleryData.images && galleryData.images.length > 0
        ? galleryData.images
        : [
            '/packages/automas/LandingPage/src/marketplace/image1.png',
            '/packages/automas/LandingPage/src/marketplace/image2.png',
            '/packages/automas/LandingPage/src/marketplace/image3.png',
            '/packages/automas/LandingPage/src/marketplace/image4.png',
        ];

    const screenshots = galleryImages.map((img: string, idx: number) => {
        const resolvedUrl = !img ? null : (img.startsWith('http') || img.startsWith('blob:') ? img : getImagePath(img));
        return {
            id: idx + 1,
            title: `${t('Screenshot')} ${idx + 1}`,
            image: resolvedUrl,
        };
    });

    const faqs = [
        {
            q: 'What is Automas CRM?',
            a: 'Automas CRM is an all-in-one cloud business management system that connects Project Management, Accounting, HRM, CRM, POS, and Inventory into a single unified platform.'
        },
        {
            q: 'How does our Call Center feature work?',
            a: 'With our built-in Click-to-Call feature, you can place phone calls directly from the ERP to your clients with a single click. There is no need to manually enter phone numbers into your handset—simply click the customer phone icon in your CRM or sales lead profile to initiate instant calls, log conversation notes, and track agent activity seamlessly.'
        },
        {
            q: 'What are the main features of our ERP?',
            a: 'Key features include automated financial reporting, sales proposal generation, real-time inventory tracking, employee attendance and payroll, Kanban project boards, and retail point-of-sale support.'
        },
        {
            q: 'How does fixed pricing and usage-based pricing work?',
            a: 'We offer flexible subscription plans: choose fixed monthly/yearly packages for full module access, or opt for usage-based pricing where you pay based on active team members and storage consumption.'
        },
        {
            q: 'What is an IP number and how is it used in Automas CRM?',
            a: 'An IP (Internet Protocol) address is a unique numerical identifier assigned to your device on a network. In Automas CRM, IP addresses are used for security logging, restrict staff logins to whitelisted office networks, and prevent unauthorized account access.'
        },
    ];

    return (
        <>
            {/* Why Choose Automas CRM */}
            <section className="relative py-6 lg:py-24 bg-transparent">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="text-center mb-16 gsap-section-header">
                        <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-900 mb-5 tracking-tight">
                            {t(sectionTitle)}
                        </h2>
                        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal">
                            {t(sectionSubtitle)}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-8">
                        {whyChooseUs.map((item: any, idx: number) => {
                            const fallback = defaultWhyChooseUs[idx % defaultWhyChooseUs.length];
                            const cardBg = item.cardBg || fallback.cardBg;
                            const iconBg = item.iconBg || fallback.iconBg;
                            const IconComponent = item.icon;

                            return (
                                <div
                                    key={idx}
                                    style={{ backgroundColor: cardBg }}
                                    className="gsap-card-reveal rounded-xl sm:rounded-2xl p-3.5 sm:p-8 border border-slate-200/80 shadow-xs hover:shadow-xl transition-[box-shadow,border-color] duration-300 group flex flex-col justify-between h-full min-h-[160px] sm:min-h-[220px]"
                                >
                                    <div>
                                        <div
                                            className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-6 shadow-md text-white group-hover:scale-110 transition-transform duration-300"
                                            style={{ backgroundColor: iconBg }}
                                        >
                                            <IconComponent className="w-4 h-4 sm:w-6 sm:h-6 stroke-[2]" />
                                        </div>
                                        <h3 className="text-sm sm:text-xl font-display font-bold text-slate-900 mb-1.5 sm:mb-3 line-clamp-2">
                                            {t(item.title)}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal line-clamp-3 sm:line-clamp-none">
                                            {t(item.desc)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Visual Tour — tabbed viewer */}
            <section id="demo" className="relative py-16 lg:py-20 bg-transparent">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">

                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 gsap-section-header">
                        <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-[1.05] max-w-xl">
                            {t(galleryTitle)}
                        </h2>
                        <p className="text-base sm:text-lg text-slate-500 max-w-sm lg:text-right leading-relaxed">
                            {t(gallerySubtitle)}
                        </p>
                    </div>

                    <div className="gsap-card-reveal grid lg:grid-cols-[200px_1fr] gap-0 border border-slate-200 rounded-2xl overflow-hidden">
                        {/* Left Tab List without right border line or gap on mobile */}
                        <div className="bg-slate-50/60 flex lg:flex-col overflow-x-auto lg:overflow-visible p-2 lg:p-3 gap-1.5 lg:gap-2">
                            {screenshots.map((shot, idx) => {
                                const isActive = activeShot === idx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveShot(idx)}
                                        className={`relative shrink-0 text-left px-5 py-4 rounded-xl flex items-center justify-between transition-all cursor-pointer ${isActive ? 'bg-white shadow-sm border border-slate-200/80 font-bold' : 'hover:bg-white/60 text-slate-500'}`}
                                    >
                                        <span className={`font-mono text-sm ${isActive ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                                            0{idx + 1}
                                        </span>
                                        <ArrowUpRight className={`w-4 h-4 transition-transform ${isActive ? 'opacity-100 text-slate-900 translate-x-0.5 -translate-y-0.5' : 'opacity-0'}`} />
                                    </button>
                                );
                            })}
                        </div>

                        {/* preview panel displaying real settings image */}
                        <div
                            onClick={() => setLightboxIndex(activeShot)}
                            className="group relative cursor-pointer bg-slate-950 min-h-[320px] sm:min-h-[440px] flex flex-col justify-between overflow-hidden"
                        >
                            <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-100 border-b border-white/10 relative z-10">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                                <span className="ml-2 text-[11px] font-mono text-slate-400">{screenshots[activeShot]?.code}</span>
                                <span className="ml-auto flex items-center gap-1 text-[11px] font-mono text-slate-300 opacity-80 group-hover:opacity-100 transition-opacity">
                                    {t('expand')} <ArrowUpRight className="w-3.5 h-3.5" />
                                </span>
                            </div>

                            {/* Image Visual Display */}
                            <div className="relative flex-1 bg-white flex items-center justify-center overflow-hidden">
                                {screenshots[activeShot]?.image ? (
                                    <img
                                        src={screenshots[activeShot].image}
                                        alt={`Screenshot ${activeShot + 1}`}
                                        className="w-full h-full max-h-[460px] object-fill transition-transform duration-500 group-hover:scale-[1.01]"
                                    />
                                ) : (
                                    <div className="text-center space-y-3">
                                        <Maximize2 className="w-8 h-8 text-white/50 mx-auto" />
                                        <p className="text-sm font-semibold text-white/90">Screenshot {activeShot + 1}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Lightbox Modal for Full View */}
            {lightboxIndex !== null && (
                <div
                    className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
                    onClick={() => setLightboxIndex(null)}
                >
                    <div className="relative max-w-5xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-800">
                            {/* <span className="text-sm font-semibold text-white">{screenshots[lightboxIndex]?.title}</span> */}
                            <button
                                onClick={() => setLightboxIndex(null)}
                                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[80vh] overflow-hidden">
                            {screenshots[lightboxIndex]?.image ? (
                                <img
                                    src={screenshots[lightboxIndex].image}
                                    alt={screenshots[lightboxIndex].title}
                                    className="max-w-full max-h-[75vh] object-contain rounded-lg"
                                />
                            ) : (
                                <p className="text-slate-400 font-mono text-sm py-12">Screenshot {lightboxIndex + 1}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FAQ Section */}
            <section className="relative py-6 lg:py-24 bg-transparent">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="text-left mb-12 gsap-section-header">
                        <span
                            className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border border-slate-200 mb-3 shadow-2xs"
                            style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
                        >
                            {t('Got Questions?')}
                        </span>
                        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
                            {t('Frequently Asked Questions')}
                        </h2>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                        {/* Left Side: FAQs List */}
                        <div className="lg:col-span-7 space-y-4">
                            {faqs.map((faq, idx) => {
                                const isOpen = openFaq === idx;
                                return (
                                    <div
                                        key={idx}
                                        className="gsap-faq-item bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs transition-all duration-300"
                                    >
                                        <button
                                            onClick={() => setOpenFaq(isOpen ? null : idx)}
                                            className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-display font-bold text-slate-900 text-base sm:text-lg"
                                        >
                                            <span>{t(faq.q)}</span>
                                            <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-45 bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                <Plus className="w-4 h-4" />
                                            </span>
                                        </button>
                                        {isOpen && (
                                            <div className="px-6 pb-6 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100 pt-4">
                                                {t(faq.a)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Right Side: Storage FAQ Image */}
                        <div className="lg:col-span-5 sticky top-24 gsap-faq-media">
                            <div className="relative rounded-3xl overflow-hidden p-3">
                                <img
                                    src={getImagePath('storage/app/public/media/faq.png')}
                                    onError={(e: any) => {
                                        if (!e.currentTarget.dataset.retried) {
                                            e.currentTarget.dataset.retried = 'true';
                                            e.currentTarget.src = '/storage/media/faq.png';
                                        }
                                    }}
                                    alt="Automas CRM FAQ"
                                    className="w-full h-auto max-h-[560px] object-contain rounded-2xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
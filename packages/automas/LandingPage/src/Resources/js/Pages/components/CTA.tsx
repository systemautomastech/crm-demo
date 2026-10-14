import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ArrowRight, Star } from 'lucide-react';
import { formatAdminCurrency } from '@/utils/helpers';

interface CTAProps {
    settings?: any;
    plans?: any[];
    activeModules?: any[];
}

export default function CTA({ settings, plans: propPlans = [], activeModules = [] }: CTAProps) {
    const { t } = useTranslation();
    const sectionData = settings?.config_sections?.sections?.cta || {};
    const pricingSettings = settings?.config_sections?.sections?.pricing || {};
    const colors = settings?.config_sections?.colors || {
        primary: 'var(--color-primary, #130774)',
        secondary: 'var(--color-secondary, #0b55b7)',
        accent: 'var(--color-accent, #130674)'
    };
    const primaryColor = colors.primary || 'var(--color-primary)';
    const secondaryColor = colors.secondary || 'var(--color-secondary)';

    const [priceType, setPriceType] = useState(pricingSettings.default_price_type || 'monthly');

    const title = sectionData.title || 'Ready to Transform Your Business?';
    const subtitle = sectionData.subtitle || 'Join thousands of businesses already using Automas CRM to streamline operations, cut overhead costs, and accelerate growth.';
    const primaryButtonText = sectionData.primary_button || 'Start Free Trial';
    const secondaryButtonText = sectionData.secondary_button || 'Talk to Sales';

    // System database plans sorted by sort_order position
    const hasSystemPlans = propPlans && propPlans.length > 0;
    const sortedPlans = hasSystemPlans
        ? propPlans.slice().sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        : [];

    // Check DB field is_most_popular or fallback to highest order count
    const featuredPlan = hasSystemPlans
        ? (sortedPlans.find((p: any) => p.is_most_popular || p.is_popular || p.most_popular || p.popular) ||
            sortedPlans.reduce((prev: any, current: any) =>
                (current.orders_count || 0) > (prev.orders_count || 0) ? current : prev
            ))
        : null;

    const mostPopularPlanId = featuredPlan ? featuredPlan.id : null;

    const defaultPlans = [
        {
            name: 'Basic Plan',
            price: '$29',
            desc: 'The basics for your business — for one workspace.',
            features: ['1 user', 'Core modules', '5GB storage', 'Email support'],
            buttonText: 'Get Started',
            featured: false,
        },
        {
            name: 'Pro Plan',
            price: '$199',
            desc: 'All six modules, built for a growing enterprise team.',
            features: ['5 users', 'All six modules', '50GB storage', 'Priority support', 'Custom subdomain'],
            buttonText: 'Start Free Trial',
            featured: true,
        },
        {
            name: 'Enterprise Custom',
            price: "Let's talk",
            desc: 'Need something specific? Custom scope & dedicated assistance.',
            features: ['50+ users', 'Premium integrations', '500GB storage', 'Dedicated manager'],
            buttonText: 'Contact Now',
            featured: false,
        }
    ];

    return (
        <section className="relative py-6 lg:py-24 bg-transparent overflow-hidden" id="pricing">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">

                {/* Header from settings */}
                <div className="text-center max-w-2xl mx-auto mb-12 gsap-section-header">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border border-slate-200 mb-4" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>
                        {t('Flexible Subscriptions')}
                    </span>
                    <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
                        {pricingSettings.title || t('Choose Your Pricing Plan')}
                    </h2>
                    {pricingSettings.subtitle && (
                        <p className="mt-4 text-base text-slate-500 font-normal">
                            {t(pricingSettings.subtitle)}
                        </p>
                    )}
                </div>

                {/* Monthly/Yearly Toggle for System Plans */}
                {hasSystemPlans && (
                    <div className="flex items-center justify-center mb-12">
                        <div className="bg-slate-200/70 p-1.5 rounded-full flex items-center gap-1 shadow-inner">
                            <button
                                onClick={() => setPriceType('monthly')}
                                style={priceType === 'monthly' ? { backgroundColor: '#ffffff', color: '#0f172a' } : {}}
                                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${priceType === 'monthly'
                                    ? 'shadow-md'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                {t('Monthly Billing')}
                            </button>
                            <button
                                onClick={() => setPriceType('yearly')}
                                style={priceType === 'yearly' ? { backgroundColor: '#ffffff', color: '#0f172a' } : {}}
                                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${priceType === 'yearly'
                                    ? 'shadow-md'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                {t('Yearly Billing')}
                            </button>
                        </div>
                    </div>
                )}

                {/* System Database Plans or Settings Plans Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch mb-24">
                    {hasSystemPlans ? (
                        sortedPlans.map((plan: any) => {
                            const isFeatured = plan.id === mostPopularPlanId && propPlans.length > 1;
                            const isFree = plan.free_plan;
                            const priceAmount = priceType === 'monthly' ? plan.package_price_monthly : plan.package_price_yearly;
                            const formattedPrice = isFree ? t('Free') : formatAdminCurrency(priceAmount);
                            const userText = plan.number_of_users === -1 ? t('Unlimited users') : `${plan.number_of_users} ${t('users')}`;
                            const storageText = `${Math.round(plan.storage_limit / (1024 * 1024))} ${t('GB storage')}`;

                            return (
                                <div
                                    key={plan.id}
                                    style={isFeatured ? { borderColor: primaryColor } : {}}
                                    className={`gsap-card-reveal rounded-2xl p-8 transition-[box-shadow,border-color] duration-300 flex flex-col justify-between ${isFeatured
                                        ? 'bg-[#0A1E42] text-white shadow-2xl ring-2 relative md:-translate-y-3'
                                        : 'bg-white text-slate-900 border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md'
                                        }`}
                                >
                                    {isFeatured && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full text-white text-[11px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1" style={{ backgroundColor: primaryColor }}>
                                            <Star className="w-3 h-3 fill-current" />
                                            {t('Most Popular')}
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="font-display text-2xl font-bold mb-2">
                                            {t(plan.name)}
                                        </h3>

                                        {plan.description && (
                                            <p className={`text-xs leading-relaxed mb-6 ${isFeatured ? 'text-slate-300' : 'text-slate-500'}`}>
                                                {t(plan.description)}
                                            </p>
                                        )}

                                        <div className="mb-6">
                                            <span className="text-4xl font-extrabold tracking-tight">{formattedPrice}</span>
                                            {!isFree && (
                                                <span className={`text-xs ml-1 font-semibold ${isFeatured ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    /{priceType === 'monthly' ? t('mo') : t('yr')}
                                                </span>
                                            )}
                                        </div>

                                        <ul className="space-y-3 mb-8 text-sm font-medium">
                                            <li className="flex items-center gap-3">
                                                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                                                <span>{userText}</span>
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                                                <span>{storageText}</span>
                                            </li>
                                            {plan.trial && (
                                                <li className="flex items-center gap-3">
                                                    <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                                                    <span className="text-emerald-500 font-semibold">{plan.trial_days} {t('Days Trial')}</span>
                                                </li>
                                            )}

                                            {/* Render sorted modules: Enabled green checks first, Disabled red crosses last */}
                                            {activeModules
                                                .slice()
                                                .sort((a: any, b: any) => {
                                                    const aEnabled = plan.modules?.includes(a.module) ? 1 : 0;
                                                    const bEnabled = plan.modules?.includes(b.module) ? 1 : 0;
                                                    return bEnabled - aEnabled; // Enabled (1) first, Disabled (0) last
                                                })
                                                .map((module: any) => {
                                                    const isEnabled = plan.modules?.includes(module.module);
                                                    return (
                                                        <li
                                                            key={module.module}
                                                            className={`flex items-center gap-3 ${!isEnabled ? (isFeatured ? 'text-slate-400/70' : 'text-slate-400 opacity-60') : ''}`}
                                                        >
                                                            {isEnabled ? (
                                                                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                                                            ) : (
                                                                <span className="w-4 h-4 shrink-0 font-bold text-rose-500 text-center flex items-center justify-center">✕</span>
                                                            )}
                                                            <span className={!isEnabled ? 'line-through' : ''}>
                                                                {t(module.alias)}
                                                            </span>
                                                        </li>
                                                    );
                                                })}

                                            {!plan.trial && (
                                                <li className="flex items-center gap-3 text-slate-400 opacity-60 pt-1 border-t border-slate-100/10">
                                                    <span className="w-4 h-4 shrink-0 font-bold text-rose-500 text-center flex items-center justify-center">✕</span>
                                                    <span className="line-through">{t('No Trial Period')}</span>
                                                </li>
                                            )}
                                        </ul>
                                    </div>

                                    <a
                                        href={route('register')}
                                        style={isFeatured ? { backgroundColor: primaryColor } : {}}
                                        className={`w-full py-3.5 rounded-[10px] text-center text-sm font-semibold transition-all shadow-xs ${isFeatured
                                            ? 'text-white hover:opacity-90'
                                            : 'bg-[#0A1E42] text-white hover:bg-[#122A52]'
                                            }`}
                                    >
                                        {t('Select Plan')}
                                    </a>
                                </div>
                            );
                        })
                    ) : (
                        (sectionData.plans && sectionData.plans.length > 0 ? sectionData.plans : defaultPlans).map((plan: any, idx: number) => {
                            const isFeatured = plan.featured;
                            return (
                                <div
                                    key={idx}
                                    style={isFeatured ? { borderColor: primaryColor } : {}}
                                    className={`gsap-card-reveal rounded-2xl p-8 transition-all duration-300 flex flex-col justify-between ${isFeatured
                                        ? 'bg-[#0A1E42] text-white shadow-xl ring-2 relative md:-translate-y-3'
                                        : 'bg-white text-slate-900 border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md'
                                        }`}
                                >
                                    {isFeatured && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full text-white text-[11px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1" style={{ backgroundColor: primaryColor }}>
                                            <Star className="w-3 h-3 fill-current" />
                                            {t('Most Popular')}
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="font-display text-xl font-bold mb-2">
                                            {t(plan.name)}
                                        </h3>

                                        <p className={`text-xs leading-relaxed mb-6 ${isFeatured ? 'text-slate-300' : 'text-slate-500'}`}>
                                            {t(plan.desc || plan.description)}
                                        </p>

                                        <div className="mb-6">
                                            <span className="text-4xl font-extrabold tracking-tight">{t(plan.price)}</span>
                                            {plan.price !== "Let's talk" && (
                                                <span className={`text-xs ml-1 ${isFeatured ? 'text-slate-400' : 'text-slate-500'}`}>/month</span>
                                            )}
                                        </div>

                                        <ul className="space-y-3 mb-8 text-sm font-medium">
                                            {(plan.features || []).map((feat: any, fIdx: number) => {
                                                const isObject = typeof feat === 'object';
                                                const featText = isObject ? feat.text : feat;
                                                const isAvailable = isObject ? feat.available !== false : true;

                                                return (
                                                    <li key={fIdx} className={`flex items-center gap-3 ${!isAvailable ? 'text-slate-400 opacity-60' : ''}`}>
                                                        {isAvailable ? (
                                                            <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                                                        ) : (
                                                            <span className="w-4 h-4 shrink-0 font-bold text-rose-500 text-center flex items-center justify-center">✕</span>
                                                        )}
                                                        <span className={!isAvailable ? 'line-through' : ''}>
                                                            {t(featText)}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>

                                    <a
                                        href={route('register')}
                                        style={isFeatured ? { backgroundColor: primaryColor } : {}}
                                        className={`w-full py-3.5 rounded-[10px] text-center text-sm font-semibold transition-all shadow-xs ${isFeatured
                                            ? 'text-white hover:opacity-90'
                                            : 'bg-[#0A1E42] text-white hover:bg-[#122A52]'
                                            }`}
                                    >
                                        {t(plan.buttonText || 'Get Started')}
                                    </a>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Clean, Enterprise Dark Blue Container */}
                <div className="gsap-cta-banner bg-[#0A1E42] text-white rounded-3xl p-10 md:p-16 text-center border border-[#122A52] shadow-2xl relative overflow-hidden">
                    <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                            {t(title)}
                        </h2>

                        <p className="text-slate-300 text-base sm:text-lg leading-relaxed font-normal">
                            {t(subtitle)}
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <a
                                href={route('register')}
                                style={{ backgroundColor: primaryColor }}
                                className="px-8 py-3.5 rounded-[10px] text-base font-semibold text-white transition-all shadow-md inline-flex items-center justify-center gap-2 w-full sm:w-auto hover:opacity-90"
                            >
                                <span>{t(primaryButtonText)}</span>
                                <ArrowRight className="w-4 h-4" />
                            </a>

                            <a
                                href="#contact"
                                className="px-8 py-3.5 rounded-[10px] text-base font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all w-full sm:w-auto"
                            >
                                {t(secondaryButtonText)}
                            </a>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}
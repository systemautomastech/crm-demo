import { Head, router, usePage } from '@inertiajs/react';
import Header from './components/Header';
import Footer from './components/Footer';
import { getAdminSetting, getImagePath, formatAdminCurrency } from '@/utils/helpers';
import { useState } from 'react';
import CookieConsent from "@/components/cookie-consent";
import { useTranslation } from 'react-i18next';

interface Plan {
    id: number;
    name: string;
    description?: string;
    package_price_monthly: number;
    package_price_yearly: number;
    number_of_users: number;
    storage_limit: number;
    modules: string[];
    free_plan: boolean;
    trial: boolean;
    trial_days: number;
    orders_count?: number;
}

interface Module {
    module: string;
    alias: string;
    image?: string;
    monthly_price?: number;
    yearly_price?: number;
}

interface PricingProps {
    plans?: Plan[];
    activeModules?: Module[];
    settings?: any;
    filters?: {
        search?: string;
        category?: string;
        price?: string;
        price_type?: string;
        sort?: string;
    };
}

export default function Pricing(props: PricingProps) {
    const { t } = useTranslation();
    const favicon = getAdminSetting('favicon');
    const faviconUrl = favicon ? getImagePath(favicon) : null;
    const { adminAllSetting, auth } = usePage().props as any;
    const plans = props.plans || [];
    const activeModules = props.activeModules || [];
    const settings = { ...props.settings, is_authenticated: (auth?.user?.id !== undefined && auth?.user?.id !== null) };
    const filters = props.filters || {};
    const colors = settings?.config_sections?.colors || { primary: '#10b981', secondary: '#059669', accent: '#f59e0b' };
    const pricingSettings = settings?.config_sections?.sections?.pricing || {};

    const [priceType, setPriceType] = useState(pricingSettings.default_price_type || 'monthly');

    const hasSystemPlans = plans && plans.length > 0;

    // Check DB field is_most_popular / is_popular or fallback to highest order count
    const featuredPlan = hasSystemPlans
        ? (plans.find((p: any) => p.is_most_popular || p.is_popular || p.most_popular || p.popular) ||
            plans.reduce((prev: any, current: any) =>
                (current.orders_count || 0) > (prev.orders_count || 0) ? current : prev
            ))
        : null;

    const mostPopularPlanId = featuredPlan ? featuredPlan.id : null;

    return (
        <>
            <Head title="Pricing" >
                {faviconUrl && <link rel="icon" type="image/x-icon" href={faviconUrl} />}
            </Head>

            <Header settings={settings} />

            <main className="min-h-screen bg-slate-50/70 pt-28 pb-24 font-sans">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">

                    {/* Header */}
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <span
                            className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border border-slate-200 mb-4 shadow-2xs"
                            style={{ backgroundColor: `${colors.primary}12`, color: colors.primary }}
                        >
                            {t('Flexible Subscriptions')}
                        </span>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.08] mb-4">
                            {pricingSettings.title || t('Subscription Setting')}
                        </h1>
                        {pricingSettings.subtitle && (
                            <p className="text-base sm:text-lg text-slate-500 font-normal leading-relaxed mb-8">
                                {t(pricingSettings.subtitle)}
                            </p>
                        )}

                        {/* Monthly/Yearly Pill Toggle */}
                        <div className="inline-flex items-center bg-slate-200/70 p-1.5 rounded-full shadow-inner gap-1">
                            <button
                                onClick={() => setPriceType('monthly')}
                                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${priceType === 'monthly'
                                        ? 'bg-white text-slate-900 shadow-md'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                {t("Monthly Billing")}
                            </button>
                            <button
                                onClick={() => setPriceType('yearly')}
                                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${priceType === 'yearly'
                                        ? 'bg-white text-slate-900 shadow-md'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                {t("Yearly Billing")}
                            </button>
                        </div>
                    </div>

                    {/* Clean Subscription Cards Grid */}
                    {plans.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch mt-8 mb-16">
                            {plans
                                .slice()
                                .sort((a: any, b: any) => ((a.position ?? a.sort_order ?? 0) - (b.position ?? b.sort_order ?? 0)))
                                .map((plan: any) => {
                                    const isFeatured = (plan.is_most_popular || plan.id === mostPopularPlanId) && plans.length > 1;
                                    const isFree = plan.free_plan;
                                    const priceAmount = priceType === 'monthly' ? plan.package_price_monthly : plan.package_price_yearly;
                                    const formattedPrice = isFree ? t('Free') : formatAdminCurrency(priceAmount);
                                    const userText = plan.number_of_users === -1 ? t('Unlimited users') : `${plan.number_of_users} ${t('users')}`;
                                    const storageText = `${Math.round(plan.storage_limit / (1024 * 1024))} ${t('GB storage')}`;

                                    return (
                                        <div
                                            key={plan.id}
                                            style={isFeatured ? { borderColor: colors.primary } : {}}
                                            className={`rounded-2xl p-8 transition-all duration-300 flex flex-col justify-between ${isFeatured
                                                    ? 'bg-[#0A1E42] text-white shadow-2xl ring-2 relative md:-translate-y-3'
                                                    : 'bg-white text-slate-900 border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md'
                                                }`}
                                        >
                                            {isFeatured && (
                                                <div
                                                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full text-white text-[11px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1"
                                                    style={{ backgroundColor: colors.primary }}
                                                >
                                                    <span className="text-yellow-300">★</span>
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
                                                            /{priceType === 'monthly' ? 'mo' : 'yr'}
                                                        </span>
                                                    )}
                                                </div>

                                                <ul className="space-y-3 mb-8 text-sm font-medium">
                                                    <li className="flex items-center gap-3">
                                                        <span className="w-4 h-4 shrink-0 font-bold text-emerald-500 text-center flex items-center justify-center">✓</span>
                                                        <span>{userText}</span>
                                                    </li>
                                                    <li className="flex items-center gap-3">
                                                        <span className="w-4 h-4 shrink-0 font-bold text-emerald-500 text-center flex items-center justify-center">✓</span>
                                                        <span>{storageText}</span>
                                                    </li>
                                                    {plan.trial && (
                                                        <li className="flex items-center gap-3">
                                                            <span className="w-4 h-4 shrink-0 font-bold text-emerald-500 text-center flex items-center justify-center">✓</span>
                                                            <span className="text-emerald-500 font-semibold">{plan.trial_days} {t('Days Trial')}</span>
                                                        </li>
                                                    )}

                                                    {/* Modules: Enabled (Green ✓) first, Disabled (Red ✕) last */}
                                                    {activeModules
                                                        .slice()
                                                        .sort((a: any, b: any) => {
                                                            const aEnabled = plan.modules?.includes(a.module) ? 1 : 0;
                                                            const bEnabled = plan.modules?.includes(b.module) ? 1 : 0;
                                                            return bEnabled - aEnabled;
                                                        })
                                                        .map((module: any) => {
                                                            const isEnabled = plan.modules?.includes(module.module);
                                                            return (
                                                                <li
                                                                    key={module.module}
                                                                    className={`flex items-center gap-3 ${!isEnabled ? (isFeatured ? 'text-slate-400/70' : 'text-slate-400 opacity-60') : ''}`}
                                                                >
                                                                    {isEnabled ? (
                                                                        <span className="w-4 h-4 shrink-0 font-bold text-emerald-500 text-center flex items-center justify-center">✓</span>
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
                                                style={isFeatured ? { backgroundColor: colors.primary } : {}}
                                                className={`w-full py-3.5 rounded-xl text-center text-sm font-semibold transition-all shadow-xs ${isFeatured
                                                        ? 'text-white hover:opacity-90'
                                                        : 'bg-[#0A1E42] text-white hover:bg-[#122A52]'
                                                    }`}
                                            >
                                                {t('Select Plan')}
                                            </a>
                                        </div>
                                    );
                                })}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/90 shadow-sm max-w-xl mx-auto my-12 p-8">
                            <div className="w-20 h-20 mx-auto mb-5 bg-slate-100 rounded-2xl flex items-center justify-center">
                                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{t("No Plans Available")}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">{pricingSettings.empty_message || t('Check back later for new pricing plans.')}</p>
                        </div>
                    )}
                </div>
            </main>

            <Footer settings={settings} />

            <CookieConsent settings={adminAllSetting || {}} />
        </>
    );
}
import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { getAdminSetting, getImagePath } from '@/utils/helpers';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Layers, ArrowRight, ArrowUp } from 'lucide-react';

interface FooterProps {
    settings?: any;
}

export default function Footer({ settings }: FooterProps) {
    const { t } = useTranslation();
    const [emailInput, setEmailInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sectionData = settings?.config_sections?.sections?.footer || {};
    const colors = settings?.config_sections?.colors || {
        primary: 'var(--color-primary, #130774)',
        secondary: 'var(--color-secondary, #0b55b7)',
        accent: 'var(--color-accent, #130674)'
    };
    const primaryColor = colors.primary || 'var(--color-primary)';

    const companyName = sectionData.company_name || settings?.company_name || 'Automas CRM';
    const contactEmail = sectionData.contact_email || settings?.contact_email || 'support@automas.com.bd';
    const phone = sectionData.contact_phone || settings?.contact_phone || '+880 9617 300 600';
    const footerDescription = sectionData.description || 'The complete all-in-one business management solution combining Project Management, Accounting, HRM, CRM, POS, and Product Management into a single platform.';

    const logoKey = 'logo_light';
    const logoPath = getAdminSetting(logoKey);
    const logoUrl = logoPath ? getImagePath(logoPath) : null;

    const handleNewsletterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailInput.trim()) {
            toast.error(t('Please enter your email address'));
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await fetch(route('newsletter.subscribe'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({ email: emailInput.trim() })
            });
            const data = await response.json();
            if (data.success) {
                toast.success(data.message || t('Subscribed successfully!'));
                setEmailInput('');
            } else {
                toast.error(data.message || t('Subscription failed'));
            }
        } catch {
            toast.error(t('An error occurred. Please try again.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="bg-[#0A1E42] text-white pt-20 pb-10 border-t border-[#122A52]">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">

                {/* 4-Col Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 pb-16 border-b border-slate-800">

                    {/* Brand Info from settings */}
                    <div className="lg:col-span-4 space-y-4">
                        <Link href={route('landing.page')} className="flex items-center gap-3 font-bold text-xl text-white tracking-tight">
                            {logoUrl ? (
                                <img src={logoUrl} alt={companyName} className="h-9 w-auto max-w-36 object-contain" />
                            ) : (
                                <>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: primaryColor }}>
                                        <Layers className="w-5 h-5" />
                                    </div>
                                    <span>{companyName}</span>
                                </>
                            )}
                        </Link>

                        <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                            {t(footerDescription)}
                        </p>

                        <div className="space-y-1.5 text-xs text-slate-400 font-medium">
                            <div>{contactEmail}</div>
                            <div>{phone}</div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="lg:col-span-2 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {t('Navigation')}
                        </h4>
                        <ul className="space-y-2.5 text-sm text-slate-300 font-medium">
                            <li><a href="#features" className="hover:text-white transition-colors">{t('Features')}</a></li>
                            <li><a href="#modules" className="hover:text-white transition-colors">{t('Modules')}</a></li>
                            <li><a href="#pricing" className="hover:text-white transition-colors">{t('Pricing')}</a></li>
                            <li><a href="#demo" className="hover:text-white transition-colors">{t('Demo')}</a></li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div className="lg:col-span-2 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {t('Pages')}
                        </h4>
                        <ul className="space-y-2.5 text-sm text-slate-300 font-medium">
                            <li><Link href={route('pricing.page')} className="hover:text-white transition-colors">{t('Pricing')}</Link></li>
                            <li><a href="#contact" className="hover:text-white transition-colors">{t('Contact')}</a></li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div className="lg:col-span-4 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {t('Subscribe to updates')}
                        </h4>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            {t('Get the latest features and business management tips directly to your inbox.')}
                        </p>
                        <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                            <input
                                type="email"
                                placeholder={t('Enter your email')}
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 rounded-[10px] bg-[#122A52] border border-[#233A63] text-white placeholder-slate-400 text-xs focus:outline-none focus:border-slate-500"
                            />
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                style={{ backgroundColor: primaryColor }}
                                className="px-5 py-3 rounded-[10px] text-white text-xs font-semibold flex items-center gap-1 shadow-md transition-all hover:opacity-90"
                            >
                                <span>{t('Subscribe')}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </form>
                    </div>

                </div>

                {/* Bottom Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-slate-400 font-medium">
                    <p>© {new Date().getFullYear()} {companyName} — {t('All rights reserved.')}</p>

                    <button
                        onClick={scrollToTop}
                        className="flex items-center gap-2 p-2.5 rounded-full bg-[#122A52] text-slate-300 hover:text-white transition-all"
                        aria-label="Scroll to top"
                    >
                        <span>{t('Back to Top')}</span>
                        <ArrowUp className="w-4 h-4" />
                    </button>
                </div>

            </div>
        </footer>
    );
}

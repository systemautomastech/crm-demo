import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, ShieldCheck, Headset, Globe2, Sparkles, TrendingUp, ArrowUpRight } from 'lucide-react';

interface StatsProps {
    settings?: any;
}

export default function Stats({ settings }: StatsProps) {
    const { t } = useTranslation();
    const sectionRef = useRef<HTMLDivElement>(null);
    const [hasAnimated, setHasAnimated] = useState(false);

    const sectionData = settings?.config_sections?.sections?.stats || {};
    const defaultStats = [
        { label: 'Businesses Trust Us', value: '10,000+', subtitle: 'Active business accounts', icon: Building2, tag: 'Trust' },
        { label: 'Uptime Guarantee', value: '99.9%', subtitle: 'High availability SLA', icon: ShieldCheck, tag: 'Reliable' },
        { label: 'Customer Support', value: '24/7', subtitle: 'Dedicated assistance', icon: Headset, tag: 'Support' },
        { label: 'Countries Worldwide', value: '50+', subtitle: 'Global user coverage', icon: Globe2, tag: 'Global' },
    ];

    const statsList: any[] = (sectionData.stats && sectionData.stats.length > 0)
        ? sectionData.stats.map((s: any, idx: number) => ({
            ...s,
            subtitle: defaultStats[idx % defaultStats.length]?.subtitle,
            icon: defaultStats[idx % defaultStats.length]?.icon || Building2,
            tag: defaultStats[idx % defaultStats.length]?.tag || 'Metric'
        }))
        : defaultStats;

    const [counts, setCounts] = useState({
        businesses: 0,
        uptime: 0,
        countries: 0,
    });

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !hasAnimated) {
                    setHasAnimated(true);

                    const duration = 2000;
                    const startTime = performance.now();

                    const animate = (currentTime: number) => {
                        const elapsedTime = currentTime - startTime;
                        const progress = Math.min(elapsedTime / duration, 1);
                        const easeProgress = 1 - Math.pow(1 - progress, 3);

                        setCounts({
                            businesses: Math.floor(easeProgress * 10000),
                            uptime: parseFloat((easeProgress * 99.9).toFixed(1)),
                            countries: Math.floor(easeProgress * 50),
                        });

                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        }
                    };

                    requestAnimationFrame(animate);
                }
            },
            { threshold: 0.2 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, [hasAnimated]);

    const formatValue = (item: any, idx: number) => {
        if (idx === 0) return `${counts.businesses.toLocaleString()}+`;
        if (idx === 1) return `${counts.uptime}%`;
        if (idx === 3) return `${counts.countries}+`;
        return item.value || '24/7';
    };

    const colors = settings?.config_sections?.colors || {};
    const primaryColor = colors.primary || '#130774';
    const accentColor = colors.accent || '#130674';

    // Curated soft, clean solid pastel themes (zero blur, purely clean & soothing)
    const cardThemes = [
        {
            cardBg: 'bg-[#F0F5FF]',          // Soft Pastel Blue
            cardBorder: 'border-[#D9E6FF]',
            cardHoverBorder: 'hover:border-[#B5D1FF]',
            iconBg: 'bg-[#3B82F6] text-white',
            dotColor: 'bg-[#2563EB]',
            badgeBg: 'bg-white/90 text-[#1D4ED8] border-[#BFDBFE]',
            numberColor: 'text-[#1E293B]',
            labelColor: 'text-[#334155]',
            subColor: 'text-[#64748B]',
        },
        {
            cardBg: 'bg-[#F0FDF4]',          // Soft Pastel Mint / Green
            cardBorder: 'border-[#DCFCE7]',
            cardHoverBorder: 'hover:border-[#BBF7D0]',
            iconBg: 'bg-[#10B981] text-white',
            dotColor: 'bg-[#059669]',
            badgeBg: 'bg-white/90 text-[#047857] border-[#A7F3D0]',
            numberColor: 'text-[#1E293B]',
            labelColor: 'text-[#334155]',
            subColor: 'text-[#64748B]',
        },
        {
            cardBg: 'bg-[#FAF5FF]',          // Soft Pastel Lavender / Purple
            cardBorder: 'border-[#F3E8FF]',
            cardHoverBorder: 'hover:border-[#E9D5FF]',
            iconBg: 'bg-[#8B5CF6] text-white',
            dotColor: 'bg-[#7C3AED]',
            badgeBg: 'bg-white/90 text-[#6D28D9] border-[#DDD6FE]',
            numberColor: 'text-[#1E293B]',
            labelColor: 'text-[#334155]',
            subColor: 'text-[#64748B]',
        },
        {
            cardBg: 'bg-[#FFFBEB]',          // Soft Pastel Amber / Warm Cream
            cardBorder: 'border-[#FEF3C7]',
            cardHoverBorder: 'hover:border-[#FDE68A]',
            iconBg: 'bg-[#F59E0B] text-white',
            dotColor: 'bg-[#D97706]',
            badgeBg: 'bg-white/90 text-[#B45309] border-[#FDE68A]',
            numberColor: 'text-[#1E293B]',
            labelColor: 'text-[#334155]',
            subColor: 'text-[#64748B]',
        },
    ];

    return (
        <section ref={sectionRef} className="relative py-8 sm:py-12 bg-transparent select-text">
            <style>{`
                .stat-counting-num {
                    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-weight: 800;
                    letter-spacing: -0.04em;
                    line-height: 1;
                }
                .stat-counting-label {
                    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    letter-spacing: -0.015em;
                }
            `}</style>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                    {statsList.map((statItem: any, idx: number) => {
                        const theme = cardThemes[idx % cardThemes.length];
                        const IconComponent = statItem.icon || defaultStats[idx % defaultStats.length].icon;
                        const statTag = statItem.tag || defaultStats[idx % defaultStats.length].tag;
                        const statSub = statItem.subtitle || defaultStats[idx % defaultStats.length].subtitle;

                        return (
                            <div
                                key={idx}
                                className={`gsap-stat-card group relative rounded-2xl p-5 sm:p-6 ${theme.cardBg} border ${theme.cardBorder} ${theme.cardHoverBorder} shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_24px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 cursor-default flex flex-col justify-between`}
                            >
                                {/* Top Header: Minimal Clean Solid Icon & Tag */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`gsap-stat-icon w-10 h-10 rounded-xl ${theme.iconBg} flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300`}>
                                        <IconComponent className="w-5 h-5 stroke-[2.2]" />
                                    </div>

                                    <span className={`gsap-stat-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${theme.badgeBg} shadow-2xs`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
                                        {t(statTag)}
                                    </span>
                                </div>

                                {/* Metric Number & Labels with Premium Sans Typography */}
                                <div>
                                    <div className={`gsap-stat-number stat-counting-num text-3xl sm:text-4xl lg:text-[42px] ${theme.numberColor} mb-1.5 will-change-transform`}>
                                        {formatValue(statItem, idx)}
                                    </div>
                                    <div className={`gsap-stat-label stat-counting-label text-sm sm:text-[15px] font-bold ${theme.labelColor} leading-snug mb-0.5 will-change-transform`}>
                                        {t(statItem.label)}
                                    </div>
                                    {statSub && (
                                        <p className={`gsap-stat-sub text-[12px] ${theme.subColor} font-normal leading-normal will-change-transform`}>
                                            {t(statSub)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
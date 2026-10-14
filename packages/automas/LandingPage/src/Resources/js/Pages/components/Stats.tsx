import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface StatsProps {
    settings?: any;
}

export default function Stats({ settings }: StatsProps) {
    const { t } = useTranslation();
    const sectionRef = useRef<HTMLDivElement>(null);
    const [hasAnimated, setHasAnimated] = useState(false);

    const sectionData = settings?.config_sections?.sections?.stats || {};
    const defaultStats = [
        { label: 'Businesses Trust Us', value: '10,000+' },
        { label: 'Uptime Guarantee', value: '99.9%' },
        { label: 'Customer Support', value: '24/7' },
        { label: 'Countries Worldwide', value: '50+' },
    ];

    const statsList: any[] = (sectionData.stats && sectionData.stats.length > 0)
        ? sectionData.stats
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

                    // Animate Businesses (0 to 10000)
                    const duration = 2000;
                    const startTime = performance.now();

                    const animate = (currentTime: number) => {
                        const elapsedTime = currentTime - startTime;
                        const progress = Math.min(elapsedTime / duration, 1);

                        // Ease out cubic
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
    const primaryColor = colors.primary || 'var(--color-primary)';
    const accentColor = colors.accent || 'var(--color-accent)';

    return (
        <section ref={sectionRef} className="relative py-4 lg:py-16 bg-transparent">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
                    {statsList.map((statItem: any, idx: number) => (
                        <div
                            key={idx}
                            className="gsap-stat-card rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group min-h-[105px] sm:min-h-[130px] flex flex-col justify-center"
                            style={{ backgroundColor: accentColor }}
                        >
                            {/* Subtle Inner Glow Highlight */}
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                            <div className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-1 sm:mb-2">
                                {formatValue(statItem, idx)}
                            </div>
                            <div className="text-xs sm:text-sm text-white/90 font-medium tracking-wide">
                                {t(statItem.label)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
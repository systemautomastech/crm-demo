import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
import { Head, usePage } from '@inertiajs/react';
import { getAdminSetting, getImagePath } from '@/utils/helpers';
import CookieConsent from "@/components/cookie-consent";
import Header from './components/Header';
import Hero from './components/Hero';
import Stats from './components/Stats';
import Features from './components/Features';
import Modules from './components/Modules';
import Benefits from './components/Benefits';
import Gallery from './components/Gallery';
import CTA from './components/CTA';
import Footer from './components/Footer';

interface LandingProps {
    plans?: any[];
    activeModules?: any[];
    settings?: {
        company_name?: string;
        contact_email?: string;
        contact_phone?: string;
        contact_address?: string;
        config_sections?: {
            sections?: { [key: string]: any };
            section_visibility?: { [key: string]: boolean };
            section_order?: string[];
            colors?: { primary: string; secondary: string; accent: string };
        };
    };
}

export default function Landing({ settings, plans, activeModules }: LandingProps) {
    const { adminAllSetting } = usePage().props as any;
    const favicon = getAdminSetting('favicon');
    const faviconUrl = favicon ? getImagePath(favicon) : null;

    useEffect(() => {
        const ctx = gsap.context(() => {
            // 1. Hero Entrance Animation Timeline
            const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

            heroTl.fromTo('.gsap-hero-title',
                { y: 45, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.9, delay: 0.1 }
            )
            .fromTo('.gsap-hero-subtitle',
                { y: 35, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8 },
                '-=0.6'
            )
            .fromTo('.gsap-hero-cta',
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.7 },
                '-=0.5'
            )
            .fromTo('.gsap-hero-stage',
                { y: 55, opacity: 0, scale: 0.94 },
                { y: 0, opacity: 1, scale: 1, duration: 1, ease: 'power2.out' },
                '-=0.4'
            );

            // Continuous organic floating physics for Hero badges
            gsap.to('.gsap-hero-float-top', {
                y: -10,
                x: 4,
                duration: 3.5,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });

            gsap.to('.gsap-hero-float-bottom', {
                y: 12,
                x: -5,
                duration: 4.2,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                delay: 0.5
            });



            // 3. Stats Cards - Smooth card entrance & inner text rise choreography
            const statCards = gsap.utils.toArray('.gsap-stat-card');
            statCards.forEach((card: any, i: number) => {
                const numberEl = card.querySelector('.gsap-stat-number');
                const labelEl = card.querySelector('.gsap-stat-label');
                const subEl = card.querySelector('.gsap-stat-sub');
                const iconEl = card.querySelector('.gsap-stat-icon');
                const badgeEl = card.querySelector('.gsap-stat-badge');

                const cardTl = gsap.timeline({
                    scrollTrigger: {
                        trigger: card,
                        start: 'top 88%',
                        toggleActions: 'play none none none',
                    }
                });

                // Smooth lift for card container
                cardTl.fromTo(card,
                    { y: 30, opacity: 0, scale: 0.96 },
                    {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        duration: 0.7,
                        delay: i * 0.1,
                        ease: 'power3.out',
                        force3D: true,
                    }
                );

                // Smooth pop for badge & icon
                if (iconEl && badgeEl) {
                    cardTl.fromTo([iconEl, badgeEl],
                        { scale: 0.85, opacity: 0 },
                        { scale: 1, opacity: 1, duration: 0.45, stagger: 0.08, ease: 'back.out(1.5)' },
                        '-=0.45'
                    );
                }

                // Silky smooth rise for metric number, label, and subtitle
                const textElements = [numberEl, labelEl, subEl].filter(Boolean);
                if (textElements.length > 0) {
                    cardTl.fromTo(textElements,
                        { y: 16, opacity: 0 },
                        {
                            y: 0,
                            opacity: 1,
                            duration: 0.6,
                            stagger: 0.08,
                            ease: 'power3.out',
                            force3D: true,
                        },
                        '-=0.4'
                    );
                }
            });

            // 4. Section Headers - Clean rise with badge pop
            const headers = gsap.utils.toArray('.gsap-section-header');
            headers.forEach((header: any) => {
                gsap.fromTo(header,
                    { y: 35, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.75,
                        ease: 'power3.out',
                        force3D: true,
                        scrollTrigger: {
                            trigger: header,
                            start: 'top 86%',
                            toggleActions: 'play none none none',
                        }
                    }
                );
            });

            // 5. Individual Cards (Features, Benefits, Pricing) - 3D Lift & Fade Reveal
            const cards = gsap.utils.toArray('.gsap-card-reveal');
            cards.forEach((card: any) => {
                gsap.fromTo(card,
                    { y: 40, opacity: 0, scale: 0.96 },
                    {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        duration: 0.7,
                        ease: 'power2.out',
                        force3D: true,
                        scrollTrigger: {
                            trigger: card,
                            start: 'top 88%',
                            toggleActions: 'play none none none',
                        }
                    }
                );
            });

            // 6. Business Modules Carousel - Reveal with subtle depth
            const carousel = document.querySelector('.gsap-modules-carousel');
            if (carousel) {
                gsap.fromTo(carousel,
                    { y: 40, opacity: 0, scale: 0.97 },
                    {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        duration: 0.85,
                        ease: 'power3.out',
                        force3D: true,
                        scrollTrigger: {
                            trigger: carousel,
                            start: 'top 85%',
                            toggleActions: 'play none none none',
                        }
                    }
                );
            }

            // 7. FAQ Accordion Items - Step-by-step unfold
            const faqItems = gsap.utils.toArray('.gsap-faq-item');
            faqItems.forEach((item: any) => {
                gsap.fromTo(item,
                    { y: 25, opacity: 0, x: -12 },
                    {
                        y: 0,
                        x: 0,
                        opacity: 1,
                        duration: 0.55,
                        ease: 'power2.out',
                        force3D: true,
                        scrollTrigger: {
                            trigger: item,
                            start: 'top 89%',
                            toggleActions: 'play none none none',
                        }
                    }
                );
            });

            // 8. FAQ Graphic Media - Parallax float in from right
            const faqMedia = document.querySelector('.gsap-faq-media');
            if (faqMedia) {
                gsap.fromTo(faqMedia,
                    { x: 40, opacity: 0, scale: 0.95 },
                    {
                        x: 0,
                        opacity: 1,
                        scale: 1,
                        duration: 0.85,
                        ease: 'power2.out',
                        force3D: true,
                        scrollTrigger: {
                            trigger: faqMedia,
                            start: 'top 85%',
                            toggleActions: 'play none none none',
                        }
                    }
                );
            }

            // 9. Bottom CTA Banner - Dramatic expand on scroll
            const ctaBanner = document.querySelector('.gsap-cta-banner');
            if (ctaBanner) {
                gsap.fromTo(ctaBanner,
                    { y: 55, opacity: 0, scale: 0.95 },
                    {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        duration: 0.9,
                        ease: 'back.out(1.2)',
                        force3D: true,
                        scrollTrigger: {
                            trigger: ctaBanner,
                            start: 'top 86%',
                            toggleActions: 'play none none none',
                        }
                    }
                );
            }

            // 10. Footer Columns
            const footerCols = gsap.utils.toArray('footer .grid > div');
            footerCols.forEach((col: any) => {
                gsap.fromTo(col,
                    { y: 25, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.6,
                        ease: 'power2.out',
                        force3D: true,
                        scrollTrigger: {
                            trigger: col,
                            start: 'top 92%',
                            toggleActions: 'play none none none',
                        }
                    }
                );
            });
        });

        return () => ctx.revert();
    }, []);

    const isSectionVisible = (key: string) =>
        settings?.config_sections?.section_visibility?.[key] !== false;

    const sectionOrder = settings?.config_sections?.section_order ||
        ['header', 'hero', 'stats', 'features', 'modules', 'benefits', 'gallery', 'cta', 'footer'];

    const sectionBgMap: Record<string, string> = {
        header: 'bg-transparent',
        hero: 'bg-[#f9f7f2]',
        stats: 'bg-[#f9f7f2]',
        features: 'bg-white',
        modules: 'bg-[#f9f7f2]',
        benefits: 'bg-white',
        gallery: 'bg-[#f9f7f2]',
        cta: 'bg-white',
        footer: 'bg-transparent',
    };

    const renderSection = (sectionKey: string) => {
        if (!isSectionVisible(sectionKey)) return null;

        let sectionElement = null;
        switch (sectionKey) {
            case 'header': sectionElement = <Header key={sectionKey} settings={settings} />; break;
            case 'hero': sectionElement = <Hero key={sectionKey} settings={settings} />; break;
            case 'stats': sectionElement = <Stats key={sectionKey} settings={settings} />; break;
            case 'features': sectionElement = <Features key={sectionKey} settings={settings} />; break;
            case 'modules': sectionElement = <Modules key={sectionKey} settings={settings} />; break;
            case 'benefits': sectionElement = <Benefits key={sectionKey} settings={settings} />; break;
            case 'gallery': sectionElement = <Gallery key={sectionKey} settings={settings} />; break;
            case 'cta': sectionElement = <CTA key={sectionKey} settings={settings} plans={plans} activeModules={activeModules} />; break;
            case 'footer': sectionElement = <Footer key={sectionKey} settings={settings} />; break;
            default: return null;
        }

        const bgClass = sectionBgMap[sectionKey] || 'bg-transparent';
        if (sectionKey === 'header' || sectionKey === 'footer') {
            return sectionElement;
        }

        return (
            <div key={sectionKey} className={`w-full ${bgClass} transition-colors duration-300`}>
                {sectionElement}
            </div>
        );
    };

    const colorScheme = settings?.config_sections?.colors || {
        primary: '#130774',
        secondary: '#0b55b7',
        accent: '#130674'
    };

    return (
        <div
            className="landing-page-root min-h-screen relative"
            style={{
                backgroundColor: '#f9f7f2',
                '--color-primary': colorScheme.primary || '#130774',
                '--color-secondary': colorScheme.secondary || '#0b55b7',
                '--color-accent': colorScheme.accent || '#130674',
            } as React.CSSProperties}
        >
            {/* Scoped font strictly for Landing Page */}
            <style>{`
                .landing-page-root {
                    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                }
                .landing-page-root h1, 
                .landing-page-root h2, 
                .landing-page-root h3, 
                .landing-page-root h4, 
                .landing-page-root h5, 
                .landing-page-root h6 {
                    font-family: 'Satoshi', -apple-system, sans-serif;
                }
            `}</style>
            {/* CLEAN BACKGROUND LAYER */}
            <div className="sticky top-0 h-screen w-full pointer-events-none z-0 overflow-hidden -mb-[100vh]">
                {/* Subtle Grid Texture */}
                <div
                    className="absolute inset-0 opacity-[0.25]"
                    style={{
                        backgroundImage: 'radial-gradient(rgba(148,163,184,0.18) 1px, transparent 1px)',
                        backgroundSize: '36px 36px'
                    }}
                />
            </div>

            <Head title={`${settings?.company_name || 'Automas CRM'} - All-in-One Business Management Solution`}>
                <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
                <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap" rel="stylesheet" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600;1,700&family=Plus+Jakarta+Sans:wght@700;800;900&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet" />

                {faviconUrl && <link rel="icon" type="image/x-icon" href={faviconUrl} />}
            </Head>

            {/* Render sections in order */}
            <div className="relative z-10 bg-transparent">
                {sectionOrder.map(sectionKey => renderSection(sectionKey))}
            </div>

            <CookieConsent settings={adminAllSetting || {}} />
        </div>
    );
}
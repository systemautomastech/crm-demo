import { useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { gsap } from 'gsap';

interface HeroProps {
    settings?: any;
}

export default function Hero({ settings }: HeroProps) {
    const { props } = usePage();
    const { t } = useTranslation();

    // System Settings & Colors
    const sectionData = settings?.config_sections?.sections?.hero || {};
    const colors = settings?.config_sections?.colors || {
        primary: 'var(--color-primary, #130774)',
        secondary: 'var(--color-secondary, #0b55b7)',
        accent: 'var(--color-accent, #130674)'
    };
    const systemPrimaryColor = colors.primary || 'var(--color-primary)';

    // Exact Topbox Theme Palette
    const primaryDark = '#2b0249';      // Deep Dark Purple / Plum
    const accentBlue = systemPrimaryColor || '#318df7'; // Use system primary brand color
    const badgePink = 'rgb(233 89 27)';        // AI-POWERED Badge Pink
    const textColorMuted = '#645469';   // Subtitle & secondary text
    const bgColor = '#f9f7f2';          // Warm cream canvas

    // Exact Topbox original background wave & lightning colors
    const waveStrokeColor = 'rgba(250, 232, 191, 0.4)';
    const waveBgStrokeColor = 'rgba(250, 232, 191, 0.2)';
    const voltageGradColor = 'rgb(255, 136, 24)'; // Exact original Topbox glowing orange/amber

    // Hero title & copy
    const badgeTag = 'AI-POWERED';
    const badgeText = 'ALL-IN-ONE BUSINESS CRM';

    const titlePrefix = 'Every Customer';
    const titleItalic = 'Matters.';
    const titleMiddle = 'Every Opportunity';
    const titleSuffix = 'Counts.';

    const subtitle = sectionData.subtitle || 'From the first customer enquiry to the final deal, keep your business moving without losing track of what matters. AutomasCRM gives you the tools to manage it all under one roof.';

    const primaryBtnText = sectionData.primary_button_text || 'Get 14 Days Free Trial';
    const primaryBtnLink = sectionData.primary_button_link || (typeof (window as any).route === 'function' ? (window as any).route('register') : '/register');

    const secondaryBtnText = sectionData.secondary_button_text || 'Book A Demo';
    const secondaryBtnLink = sectionData.secondary_button_link || '#demo';

    const brandMarqueeTitle = sectionData.brand_title || settings?.company_name
        ? t('Trusted by 10,000+ growing businesses, sales teams, and modern enterprises')
        : t('Relied upon by 10,000+ modern businesses, sales teams, and fast-growing enterprises');

    // Topbox 4 Overlapping Customer Avatars
    const avatars = [
        'https://framerusercontent.com/images/lTAhzGxMV5sNMbuZr6b1kKU.png?width=512&height=512',
        'https://framerusercontent.com/images/FEyvDkvvS9rMLm0VrtAJBlRGc.png?width=512&height=512',
        'https://framerusercontent.com/images/t2ATWkgujZri4SeHJmBENa40VlE.png?width=512&height=512',
        'https://framerusercontent.com/images/RxGNh8TibROx4t9VNtq5ZVx7Y.png?width=512&height=512'
    ];

    // Automas.com.bd Transparent Partner & Client Brand Logos
    const clientLogos = [
        { name: 'Client 1', url: '/images/clients/2WpY8FPj8AtnEGHoeVzJ44bS5oALuhlRYUya1mEM-removebg-preview.png' },
        { name: 'Client 2', url: '/images/clients/42E4YCBH8VnruHYF7aY20ouy1MgOnYfjJuVdlSLj-removebg-preview.png' },
        { name: 'Client 3', url: '/images/clients/A7dzrR6h00i48jBIGufPrQiZqGJjCY3QNdbAOAzf-removebg-preview.png' },
        { name: 'Client 4', url: '/images/clients/cwUcwEVmDY1sblIpyJVc27Lxkyed3G1gE2IIOE5N-removebg-preview.png' },
        { name: 'Client 5', url: '/images/clients/dFjcSWTaHwrT4xv6nFQ8k8F1R0wq9zNRHfFx7GNO-removebg-preview.png' },
        { name: 'Client 6', url: '/images/clients/WiHpyvetIhKh50V8qkAUbMBZwPDTmkcUfPRFEcFz-removebg-preview.png' },
        { name: 'Client 7', url: '/images/clients/rFu9uCj3CP3KRrIPPTtHMptuRk2qxbTcbbuRPf7J-removebg-preview.png' },
        { name: 'Client 8', url: '/images/clients/zSW9eHI5FtGxs9dRaxCvLVk8YZ19yTYOSJjv6gWy-removebg-preview.png' },
    ];



    return (
        <>
            {/* Topbox Exact Styles & Keyframe Animations */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');

                .topbox-root {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                }

                .topbox-h1-sans {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-weight: 600;
                    font-size: 58px;
                    line-height: 1.15;
                    letter-spacing: -1.5px;
                    color: ${primaryDark};
                    margin: 0;
                    padding: 0;
                    display: inline;
                }

                .topbox-h1-serif {
                    font-family: 'Instrument Serif', Georgia, serif;
                    font-style: italic;
                    font-weight: 400;
                    font-size: 64px;
                    line-height: 1.15;
                    letter-spacing: -1.5px;
                    color: ${primaryDark};
                    display: inline;
                }

                @media (max-width: 1199.98px) {
                    .topbox-h1-sans {
                        font-size: 46px;
                        letter-spacing: -1px;
                    }
                    .topbox-h1-serif {
                        font-size: 50px;
                        letter-spacing: -1px;
                    }
                }

                @media (max-width: 767.98px) {
                    .topbox-h1-sans {
                        font-size: 32px;
                        line-height: 1.2;
                        letter-spacing: -0.5px;
                    }
                    .topbox-h1-serif {
                        font-size: 36px;
                        line-height: 1.2;
                        letter-spacing: -0.5px;
                    }
                }

                @media (max-width: 480px) {
                    .topbox-h1-sans {
                        font-size: 27px;
                        line-height: 1.22;
                        letter-spacing: -0.4px;
                    }
                    .topbox-h1-serif {
                        font-size: 31px;
                        line-height: 1.22;
                        letter-spacing: -0.4px;
                    }
                }

                /* Primary Modern SaaS Button */
                .topbox-btn-primary {
                    position: relative;
                    background-color: ${accentBlue};
                    background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 100%);
                    border-radius: 10px;
                    padding: 13px 26px;
                    box-shadow: none;
                    border: none;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 15px;
                    font-weight: 600;
                    line-height: 1.5;
                    color: #ffffff;
                    text-decoration: none;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    overflow: visible;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                /* Framer / Webflow Style Rolling Text & Sliding Icon Containers */
                .topbox-btn-roll-text-wrap {
                    display: inline-flex;
                    flex-direction: column;
                    height: 24px;
                    overflow: hidden;
                    position: relative;
                    vertical-align: middle;
                }

                .topbox-btn-roll-text-inner {
                    display: flex;
                    flex-direction: column;
                    transform: translate3d(0, 0, 0);
                    will-change: transform;
                    transition: transform 0.95s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .topbox-btn-roll-line {
                    display: inline-block;
                    height: 24px;
                    line-height: 24px;
                    white-space: nowrap;
                    will-change: transform;
                    transform: translateZ(0);
                    backface-visibility: hidden;
                }

                .topbox-btn-primary:hover .topbox-btn-roll-text-inner,
                .topbox-btn-secondary:hover .topbox-btn-roll-text-inner {
                    transform: translate3d(0, -24px, 0);
                }

                /* Framer / Webflow Style Sliding Arrow Mask Container */
                .topbox-btn-slide-icon-wrap {
                    display: inline-flex;
                    align-items: center;
                    width: 20px;
                    height: 24px;
                    overflow: hidden;
                    position: relative;
                    margin-left: 6px;
                    flex-shrink: 0;
                    vertical-align: middle;
                }

                .topbox-btn-slide-icon-track {
                    display: inline-flex;
                    align-items: center;
                    position: absolute;
                    left: 0;
                    top: 2px;
                    width: 52px;
                    height: 20px;
                    transform: translate3d(0, 0, 0);
                    will-change: transform;
                    transition: transform 0.95s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .topbox-btn-primary:hover .topbox-btn-slide-icon-track {
                    transform: translate3d(-26px, 0, 0);
                }

                .topbox-btn-primary:hover {
                    box-shadow: none;
                    opacity: 0.92;
                    transform: translateY(-1px);
                }

                .topbox-btn-primary:active {
                    transform: translateY(1px);
                    box-shadow: none;
                }

                /* Secondary Modern SaaS Button */
                .topbox-btn-secondary {
                    position: relative;
                    background-color: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 13px 24px;
                    box-shadow: none;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 15px;
                    font-weight: 600;
                    line-height: 1.5;
                    color: #1e293b;
                    text-decoration: none;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .topbox-btn-secondary:hover {
                    background-color: #f8fafc;
                    border-color: #cbd5e1;
                    color: #0f172a;
                    box-shadow: none;
                    transform: translateY(-1px);
                }

                .topbox-btn-secondary:active {
                    transform: translateY(1px);
                    box-shadow: none;
                }

                /* Right 3D Cards Stage Container */
                .topbox-cards-wrapper {
                    width: 525px;
                    min-height: 570px;
                    height: 570px;
                    position: relative;
                    overflow: visible;
                    flex-shrink: 0;
                }

                @media (max-width: 1199.98px) {
                    .topbox-cards-wrapper {
                        width: 100%;
                        max-width: 480px;
                        height: 480px;
                        min-height: unset;
                    }
                }

                @media (max-width: 991.98px) {
                    .topbox-cards-wrapper {
                        width: 100%;
                        max-width: 440px;
                        height: 420px;
                        min-height: unset;
                    }
                }

                @media (max-width: 767.98px) {
                    .topbox-cards-wrapper {
                        width: 100%;
                        max-width: 360px;
                        height: 310px;
                        min-height: unset;
                    }
                }

                @media (max-width: 480px) {
                    .topbox-cards-wrapper {
                        width: 100%;
                        max-width: 310px;
                        height: 260px;
                        min-height: unset;
                    }
                }

                /* Card 1: Main Dashboard Card (Account) */
                .topbox-card-1 {
                    aspect-ratio: 1.62362;
                    position: absolute;
                    width: 84%;
                    bottom: 261px;
                    left: 55%;
                    transform: translateX(-50%);
                    border-radius: 16px;
                    overflow: hidden;
                    z-index: 0;
                    box-shadow: 18px 20px 60px rgba(241, 231, 210, 0.45);
                    border: 1px solid rgba(241, 231, 210, 0.7);
                    background: #ffffff;
                }

                @media (max-width: 1199.98px) {
                    .topbox-card-1 {
                        bottom: 200px;
                    }
                }

                @media (max-width: 767.98px) {
                    .topbox-card-1 {
                        bottom: unset;
                        left: unset;
                        transform: unset;
                        top: 10px;
                        right: 0;
                        width: 86%;
                        border-radius: 12px;
                    }
                }

                /* Card 2: Floating Top Transactions Card (Bottom-Left) */
                .topbox-card-2 {
                    aspect-ratio: 1.02564;
                    position: absolute;
                    width: 46%;
                    top: 324px;
                    left: 16px;
                    border-radius: 16px;
                    overflow: visible;
                    z-index: 2;
                    box-shadow: 30px 0 60px rgba(139, 116, 68, 0.22);
                    border: 1px solid rgba(229, 213, 179, 0.7);
                    background: #ffffff;
                }

                @media (max-width: 1199.98px) {
                    .topbox-card-2 {
                        top: 270px;
                    }
                }

                @media (max-width: 991.98px) {
                    .topbox-card-2 {
                        top: 230px;
                    }
                }

                @media (max-width: 767.98px) {
                    .topbox-card-2 {
                        top: unset;
                        bottom: 0;
                        left: 0;
                        width: 48%;
                        border-radius: 12px;
                    }
                }

                /* Lightning Vector Badge */
                .topbox-lightning {
                    height: 96px;
                    width: 36px;
                    position: absolute;
                    top: -98px;
                    left: 7%;
                    transform: translate(-50%) rotate(33.47deg);
                    pointer-events: none;
                    z-index: 5;
                    display: block;
                }

                @media (max-width: 1199.98px) {
                    .topbox-lightning {
                        height: 80px;
                        width: 30px;
                        top: -80px;
                    }
                }

                @media (max-width: 767.98px) {
                    .topbox-lightning {
                        height: 52px;
                        width: 20px;
                        top: -46px;
                        left: 4%;
                        transform: rotate(33.47deg);
                    }
                }

                @media (max-width: 480px) {
                    .topbox-lightning {
                        height: 42px;
                        width: 16px;
                        top: -36px;
                        left: 3%;
                    }
                }

                /* Card 3: Floating Yearly Spending Card (Bottom-Right) */
                .topbox-card-3 {
                    aspect-ratio: 0.798319;
                    position: absolute;
                    width: 36%;
                    top: 323px;
                    left: 70%;
                    transform: translateX(-50%);
                    border-radius: 16px;
                    overflow: hidden;
                    z-index: 2;
                    box-shadow: 30px 28px 81px rgba(241, 231, 210, 0.45);
                    border: 1px solid rgba(241, 231, 210, 0.7);
                    background: #ffffff;
                }

                @media (max-width: 1199.98px) {
                    .topbox-card-3 {
                        top: 270px;
                    }
                }

                @media (max-width: 991.98px) {
                    .topbox-card-3 {
                        top: 230px;
                    }
                }

                @media (max-width: 767.98px) {
                    .topbox-card-3 {
                        top: unset;
                        bottom: 0;
                        left: unset;
                        right: 8px;
                        transform: unset;
                        width: 38%;
                        border-radius: 10px;
                    }
                }

                /* Topbox Left-Side Ambient Backdrop Blur Layer */
                .topbox-blur-layer {
                    -webkit-backdrop-filter: blur(100px);
                    backdrop-filter: blur(100px);
                    z-index: 1;
                    width: 60%;
                    position: absolute;
                    top: 0;
                    bottom: 40px;
                    left: 0;
                    -webkit-mask: linear-gradient(270deg, rgba(0,0,0,0) 0%, #000000 69%);
                    mask: linear-gradient(270deg, rgba(0,0,0,0) 0%, #000000 69%);
                    pointer-events: none;
                }

                /* Floating keyframe animations */
                @keyframes topboxFloat1 {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-7px); }
                }

                @keyframes topboxFloat2Desktop {
                    0%, 100% { transform: translateX(-50%) translateY(0px); }
                    50% { transform: translateX(-50%) translateY(7px); }
                }

                @keyframes topboxFloat2Mobile {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(7px); }
                }

                .anim-float-1 {
                    animation: topboxFloat1 5.5s ease-in-out infinite;
                }

                .anim-float-2 {
                    animation: topboxFloat2Desktop 6.5s ease-in-out infinite;
                }

                @media (max-width: 767.98px) {
                    .anim-float-2 {
                        animation: topboxFloat2Mobile 6.5s ease-in-out infinite;
                    }
                }

                /* Wave stroke flow animations */
                @keyframes topboxStrokeFlow1 {
                    0% { stroke-dashoffset: 2325.47; }
                    50% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: -2325.47; }
                }

                @keyframes topboxStrokeFlow2 {
                    0% { stroke-dashoffset: -2306.06; }
                    50% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: 2306.06; }
                }

                .topbox-stroke-anim-1 {
                    animation: topboxStrokeFlow1 16s ease-in-out infinite alternate;
                }

                .topbox-stroke-anim-2 {
                    animation: topboxStrokeFlow2 18s ease-in-out infinite alternate;
                }

                /* Brand Section & Logo Marquee */
                .topbox-brand-title {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    font-size: 20px;
                    font-weight: 400;
                    line-height: 1.7em;
                    text-align: center;
                    color: ${primaryDark};
                    margin-bottom: 48px;
                }

                @media (max-width: 767.98px) {
                    .topbox-brand-title {
                        font-size: 16px;
                        margin-bottom: 32px;
                    }
                }

                .topbox-marquee-container {
                    width: 100%;
                    max-width: 1280px;
                    overflow: hidden;
                    position: relative;
                    padding: 8px 0;
                    mask-image: linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 12.5%, rgba(0, 0, 0, 1) 87.5%, rgba(0, 0, 0, 0) 100%);
                    -webkit-mask-image: linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 12.5%, rgba(0, 0, 0, 1) 87.5%, rgba(0, 0, 0, 0) 100%);
                }

                .topbox-marquee-track {
                    display: flex;
                    align-items: center;
                    gap: 80px;
                    width: max-content;
                    animation: topboxMarqueeRoll 35s linear infinite;
                }

                .topbox-marquee-track:hover {
                    animation-play-state: paused;
                }

                @keyframes topboxMarqueeRoll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(calc(-50% - 40px)); }
                }

                .client-logo-img {
                    height: 48px !important;
                    width: auto !important;
                    max-width: 200px !important;
                    object-fit: contain !important;
                    opacity: 0.85;
                    transition: opacity 0.3s ease;
                }

                .client-logo-img:hover {
                    opacity: 1;
                }
            `}} />

            <section
                className="relative overflow-hidden w-full pt-[120px] sm:pt-[135px] lg:pt-[150px] pb-0 topbox-root select-text"
                style={{ backgroundColor: bgColor }}
            >
                {/* Topbox Left Ambient Backdrop Blur Layer */}
                <div className="topbox-blur-layer" />

                {/* Pattern 1: Upper Curved Wave Pattern */}
                <div className="absolute top-[33%] left-[29px] right-[-259px] w-[calc(100%+230px)] h-[265px] -translate-y-1/2 pointer-events-none z-0 overflow-visible select-none">
                    <svg
                        viewBox="0 0 1665 308"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-[1665px] h-[265px] block drop-shadow-xs"
                    >
                        <g opacity="0.3">
                            <path
                                d="M 1623.989 143.666 C 1624.964 141.166 1560.59 -117.334 1522.063 65.166 C 1491.456 210.139 1411.515 195.076 1374.587 169.004 C 1374.07 168.638 1373.584 168.228 1373.134 167.778 C 1359.888 154.618 1154.271 -46.202 1113.871 122.948 C 1061.689 341.448 872.955 314.948 858.812 168.448 C 844.669 21.948 676.7 19.66 579.857 184.948 C 522.31 283.166 428.512 279.833 364.788 244.166 C 328.862 223.572 305.778 183.166 266.276 135.666 C 207.653 65.176 75.103 -37.334 0 110.666"
                                stroke={waveBgStrokeColor}
                                strokeWidth="20"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                transform="translate(25 15)"
                            />
                        </g>
                        <g opacity="0.6">
                            <path
                                className="topbox-stroke-anim-1"
                                d="M 1623.989 143.836 C 1624.964 141.333 1560.59 -117.473 1522.063 65.243 C 1491.456 210.387 1411.515 195.306 1374.587 169.204 C 1374.07 168.838 1373.584 168.427 1373.134 167.976 C 1359.888 154.801 1154.271 -46.257 1113.871 123.093 C 1061.689 341.851 872.955 315.32 858.812 168.647 C 844.669 21.974 676.7 19.683 579.857 185.167 C 522.31 283.501 428.512 280.164 364.788 244.454 C 328.862 223.836 305.778 183.382 266.276 135.826 C 207.653 65.253 75.103 -37.378 0 110.797"
                                stroke={waveStrokeColor}
                                strokeWidth="20"
                                strokeDasharray="2325.47 2325.47"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                transform="translate(25 15)"
                            />
                        </g>
                    </svg>
                </div>

                {/* Pattern 2: Lower Inverted Curved Wave Pattern */}
                <div className="absolute top-[79%] left-[126px] right-[-356px] w-[calc(100%+230px)] h-[265px] -translate-y-1/2 rotate-180 pointer-events-none z-0 overflow-visible select-none">
                    <svg
                        viewBox="0 0 1665 308"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-[1665px] h-[265px] block drop-shadow-xs"
                    >
                        <g opacity="0.3">
                            <path
                                d="M 1636.989 135.23 C 1637.972 137.663 1573.082 389.152 1534.247 211.601 C 1503.397 70.56 1422.817 85.215 1385.588 110.579 C 1385.056 110.942 1384.592 111.328 1384.128 111.772 C 1370.771 124.575 1163.507 319.948 1122.787 155.386 C 1070.187 -57.188 879.942 -31.407 865.686 111.12 C 851.43 253.647 682.117 255.873 584.499 95.068 C 526.492 -0.486 431.939 2.756 367.708 37.456 C 331.488 57.491 308.226 96.802 268.407 143.013 C 209.319 211.593 75.705 311.322 0 167.335"
                                stroke={waveBgStrokeColor}
                                strokeWidth="21.77"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                transform="translate(10.884 16.994)"
                            />
                        </g>
                        <g opacity="0.6">
                            <path
                                className="topbox-stroke-anim-2"
                                d="M 1636.989 135.23 C 1637.972 137.663 1573.082 389.152 1534.247 211.601 C 1503.397 70.56 1422.817 85.215 1385.588 110.579 C 1385.056 110.942 1384.592 111.328 1384.128 111.772 C 1370.771 124.575 1163.507 319.948 1122.787 155.386 C 1070.187 -57.188 879.942 -31.407 865.686 111.12 C 851.43 253.647 682.117 255.873 584.499 95.068 C 526.492 -0.486 431.939 2.756 367.708 37.456 C 331.488 57.491 308.226 96.802 268.407 143.013 C 209.319 211.593 75.705 311.322 0 167.335"
                                stroke={waveStrokeColor}
                                strokeWidth="21.77"
                                strokeDasharray="2306.06 2306.06"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                transform="translate(11.884 16.994)"
                            />
                        </g>
                    </svg>
                </div>

                {/* Hero Layout Container */}
                <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 sm:px-8">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-1 lg:gap-[12px]">

                        {/* Left Column: Heading, Subtitle, CTA buttons, Avatars */}
                        <div className="w-full max-w-[700px] lg:max-w-[700px] flex-1 flex flex-col items-start text-left">

                            {/* Tag Pill Badge */}
                            <div className="inline-flex max-w-full items-center gap-1.5 sm:gap-2 p-[2px] pr-2.5 sm:pr-3.5 pl-[2px] bg-white rounded-full border border-[#e1e4ea] mb-5 sm:mb-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] backdrop-blur-[20px] transition-transform hover:scale-[1.02]">
                                <div
                                    className="px-2.5 sm:px-3 py-[2px] sm:py-[3px] rounded-full text-white text-[11px] sm:text-[13px] font-semibold tracking-wider leading-normal uppercase flex-shrink-0"
                                    style={{ backgroundColor: badgePink }}
                                >
                                    {badgeTag}
                                </div>
                                <div
                                    className="text-[11px] sm:text-[13px] font-semibold tracking-wide leading-normal pr-1 pl-1 truncate sm:whitespace-nowrap"
                                    style={{ color: primaryDark }}
                                >
                                    {badgeText}
                                </div>
                            </div>

                            {/* Main Heading: 2 Perfectly Balanced Sentences */}
                            <div className="gsap-hero-title flex flex-col items-start gap-1 text-left mb-6 w-full">
                                {/* Line 1: Every Customer Matters. */}
                                <div className="flex flex-wrap items-baseline gap-x-2 sm:gap-x-3.5">
                                    <h1 className="topbox-h1-sans m-0 p-0 inline">
                                        {titlePrefix}
                                    </h1>
                                    <span className="topbox-h1-serif inline">
                                        {titleItalic}
                                    </span>
                                </div>

                                {/* Line 2: Every Opportunity Counts. */}
                                <div className="flex flex-wrap items-baseline gap-x-2 sm:gap-x-3.5">
                                    <span className="topbox-h1-sans inline">
                                        {titleMiddle}
                                    </span>
                                    <span className="topbox-h1-serif inline">
                                        {titleSuffix}
                                    </span>
                                </div>
                            </div>

                            {/* Subtitle */}
                            <p
                                className="gsap-hero-subtitle text-[15px] sm:text-[16px] leading-[1.65em] sm:leading-[1.7em] max-w-[548px] font-normal mb-8 text-left"
                                style={{ color: textColorMuted }}
                            >
                                {subtitle}
                            </p>

                            {/* CTA Action Buttons */}
                            <div className="gsap-hero-cta flex flex-wrap sm:flex-nowrap items-center gap-3 mb-8 sm:mb-10 w-full sm:w-auto">
                                {/* Primary Button: Framer & Webflow Style Rolling Text & Sliding Arrow */}
                                <a
                                    href={primaryBtnLink}
                                    className="topbox-btn-primary group w-full sm:w-auto text-center"
                                >
                                    {/* Rolling Text: Current text scrolls up, duplicate enters from bottom */}
                                    <span className="topbox-btn-roll-text-wrap">
                                        <span className="topbox-btn-roll-text-inner">
                                            <span className="topbox-btn-roll-line">{t(primaryBtnText)}</span>
                                            <span className="topbox-btn-roll-line" aria-hidden="true">{t(primaryBtnText)}</span>
                                        </span>
                                    </span>

                                    {/* Sliding Arrow: Current arrow exits right, second arrow enters from left */}
                                    <span className="topbox-btn-slide-icon-wrap" aria-hidden="true">
                                        <span className="topbox-btn-slide-icon-track">
                                            {/* Arrow 1 */}
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-5 h-5 text-white flex-shrink-0"
                                            >
                                                <path
                                                    d="M3 12H20.5M20.5 12L13.5 5M20.5 12L13.5 19"
                                                    stroke="currentColor"
                                                    strokeWidth="2.2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                            {/* Arrow 2 (entering from left) */}
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-5 h-5 text-white flex-shrink-0 ml-1"
                                            >
                                                <path
                                                    d="M3 12H20.5M20.5 12L13.5 5M20.5 12L13.5 19"
                                                    stroke="currentColor"
                                                    strokeWidth="2.2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </span>
                                    </span>
                                </a>

                                {/* Secondary Button: Framer & Webflow Style Rolling Text */}
                                <a
                                    href={secondaryBtnLink}
                                    className="topbox-btn-secondary group w-full sm:w-auto text-center"
                                >
                                    <span className="topbox-btn-roll-text-wrap">
                                        <span className="topbox-btn-roll-text-inner">
                                            <span className="topbox-btn-roll-line">{t(secondaryBtnText)}</span>
                                            <span className="topbox-btn-roll-line" aria-hidden="true">{t(secondaryBtnText)}</span>
                                        </span>
                                    </span>
                                </a>
                            </div>

                            {/* Genuine Product Guarantees (Polished Glassmorphic Reassurance Bar) */}
                            <div className="inline-flex flex-wrap items-center gap-x-4 gap-y-2 py-2 px-3.5 bg-white/70 hover:bg-white/90 backdrop-blur-md rounded-xl border border-slate-200/70 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.04)] text-[13px] font-medium transition-all duration-300">
                                <div className="inline-flex items-center gap-2 text-slate-700">
                                    <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                    </span>
                                    <span>{t('14-day free trial')}</span>
                                </div>

                                <span className="w-1 h-1 rounded-full bg-slate-300/80 hidden sm:inline-block" />

                                <div className="inline-flex items-center gap-2 text-slate-700">
                                    <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                    </span>
                                    <span>{t('No credit card required')}</span>
                                </div>

                                <span className="w-1 h-1 rounded-full bg-slate-300/80 hidden sm:inline-block" />

                                <div className="inline-flex items-center gap-2 text-slate-700">
                                    <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
                                        <Clock className="w-3.5 h-3.5" />
                                    </span>
                                    <span>{t('Setup in 2 minutes')}</span>
                                </div>
                            </div>

                        </div>

                        {/* Right Column: Layered 3D Dashboard Mockup Cards */}
                        <div className="w-full max-w-[525px] flex justify-center items-center flex-shrink-0 gsap-hero-stage">
                            <div className="topbox-cards-wrapper">

                                {/* Card 1: Main Dashboard Card (Account) */}
                                <div className="topbox-card-1">
                                    <img
                                        src="https://framerusercontent.com/images/n5le42To2eoiRap368d3b8kTQqU.png?width=2128&height=1308"
                                        alt="Topbox Dashboard Card"
                                        className="w-full h-full object-cover block"
                                    />
                                </div>

                                {/* Card 2: Floating Top Transactions Card (Bottom-Left) */}
                                <div className="topbox-card-2 anim-float-1">
                                    <img
                                        src="https://framerusercontent.com/images/CfMDpn0SVlrpDGylJQtOf95t2zw.png?width=1160&height=1132"
                                        alt="Top Transactions"
                                        className="w-full h-full object-cover block rounded-[15px]"
                                    />

                                    {/* Voltage / Lightning Vector Badge with dynamic system color */}
                                    <div className="topbox-lightning">
                                        <svg viewBox="0 0 36 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                            <defs>
                                                <linearGradient id="topboxLightningGrad" x1="0.4975" y1="0" x2="0.5025" y2="1">
                                                    <stop offset="0%" stopColor={voltageGradColor} />
                                                    <stop offset="100%" stopColor={voltageGradColor} stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            <path
                                                d="M 34.653 30.941 C 34.446 30.38 34.048 30.067 33.656 30.152 L 25.287 32.058 L 35.373 7.541 C 35.554 7.092 35.585 6.519 35.439 6.021 C 35.306 5.539 35.015 5.205 34.677 5.131 L 9.817 0.011 C 9.328 -0.078 8.866 0.392 8.737 1.143 L 0.035 49.111 C -0.056 49.665 0.031 50.243 0.278 50.651 C 0.527 51.049 0.887 51.218 1.232 51.074 L 8.697 48.079 L 0.663 70.572 C 0.489 71.078 0.501 71.698 0.696 72.189 C 0.892 72.669 1.239 72.944 1.606 72.895 L 11.065 71.653 L 7.01 92.93 C 6.873 93.634 7.074 94.403 7.475 94.75 C 7.574 94.847 7.67 94.91 7.77 94.942 C 8.104 95.048 8.467 94.866 8.709 94.436 L 26.987 61.595 C 27.257 61.108 27.31 60.41 27.124 59.845 C 26.941 59.259 26.546 58.924 26.155 58.999 L 21.118 59.803 L 34.572 32.687 C 34.816 32.181 34.856 31.479 34.653 30.941 Z"
                                                fill="url(#topboxLightningGrad)"
                                                transform="translate(0.241 0.924)"
                                            />
                                        </svg>
                                    </div>
                                </div>

                                {/* Card 3: Floating Yearly Spending Card (Bottom-Right) */}
                                <div className="topbox-card-3 anim-float-2">
                                    <img
                                        src="https://framerusercontent.com/images/czkobBcL05vKoiyoZadlfUSo.png?width=920&height=1152"
                                        alt="Yearly Spending"
                                        className="w-full h-full object-cover block"
                                    />
                                </div>

                            </div>
                        </div>

                    </div>

                    {/* Brand Section: Partner & Client Logo Marquee */}
                    <div className="w-full pt-20 pb-16 lg:pt-24 lg:pb-24 flex flex-col items-center">
                        <p className="topbox-brand-title">
                            {brandMarqueeTitle}
                        </p>

                        <div className="topbox-marquee-container">
                            <div className="topbox-marquee-track">
                                {/* Set 1 */}
                                <div className="flex items-center gap-16 sm:gap-24 flex-shrink-0">
                                    {clientLogos.map((logo, idx) => (
                                        <div key={idx} className="flex-shrink-0 flex items-center justify-center">
                                            <img
                                                src={logo.url}
                                                alt={logo.name}
                                                className="client-logo-img block"
                                                onError={(e) => {
                                                    const target = e.currentTarget;
                                                    const filename = logo.url.split('/').pop();
                                                    if (!target.dataset.triedSubdir) {
                                                        target.dataset.triedSubdir = '1';
                                                        target.src = `/automas-crm/public/images/clients/${filename}`;
                                                    } else if (!target.dataset.triedStorage) {
                                                        target.dataset.triedStorage = '1';
                                                        target.src = `/storage/media/${filename}`;
                                                    }
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Set 2 for seamless infinite roll */}
                                <div className="flex items-center gap-16 sm:gap-24 flex-shrink-0" aria-hidden="true">
                                    {clientLogos.map((logo, idx) => (
                                        <div key={`dup-${idx}`} className="flex-shrink-0 flex items-center justify-center">
                                            <img
                                                src={logo.url}
                                                alt={logo.name}
                                                className="client-logo-img block"
                                                onError={(e) => {
                                                    const target = e.currentTarget;
                                                    const filename = logo.url.split('/').pop();
                                                    if (!target.dataset.triedSubdir) {
                                                        target.dataset.triedSubdir = '1';
                                                        target.src = `/automas-crm/public/images/clients/${filename}`;
                                                    } else if (!target.dataset.triedStorage) {
                                                        target.dataset.triedStorage = '1';
                                                        target.src = `/storage/media/${filename}`;
                                                    }
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </section>
        </>
    );
}

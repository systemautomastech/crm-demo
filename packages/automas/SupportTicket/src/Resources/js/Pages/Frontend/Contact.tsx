import { useState, useEffect } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import Layout from './Layouts/Layout';
import { useTranslation } from 'react-i18next';
import {
    MessageCircle,
    Mail,
    Phone,
    MapPin,
    Clock,
    Send,
    Upload,
    ChevronDown,
    Facebook,
    Twitter,
    Linkedin,
    Instagram,
    Youtube
} from 'lucide-react';

interface ContactProps {
    settings: {
        faq_is_on: string;
        knowledge_base_is_on: string;
    };
    brandSettings?: {
        logo_dark?: string;
        favicon?: string;
        titleText?: string;
        footerText?: string;
    };
    titleSections?: {
        contact?: {
            title: string;
            description: string;
        };
    };
    contactInformation?: {
        map_embed_url?: string;
        address?: string;
        phone?: string;
        email?: string;
        business_hours?: {
            monday_friday?: string;
            saturday?: string;
            sunday?: string;
        };
        social_media?: {
            facebook?: string;
            twitter?: string;
            linkedin?: string;
            instagram?: string;
            youtube?: string;
        };
    };
}

export default function Contact({ settings, brandSettings, titleSections, contactInformation }: ContactProps) {
     const { t } = useTranslation();
    const { flash, userSlug } = usePage().props as any;
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const pageTitle = titleSections?.contact?.title || 'Contact Support';
    const pageDescription = titleSections?.contact?.description || 'Get in touch with our friendly support team. We\'re here to help you with any questions or issues you may have.';

    const { data, setData, post, processing, errors, reset } = useForm({
        firstName: '',
        lastName: '',
        email: '',
        subject: '',
        message: '',
        priority: 'medium',
        attachments: []
    });

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
            reset();
        }
        if (flash?.error) {
            toast.error(flash.error);
        }

    }, [flash, contactInformation]);

    return (
        <Layout title={pageTitle} settings={settings} brandSettings={brandSettings}>
            {/* Page Title */}
            <div className="text-center lg:mb-8 mb-6">
                <h2 className="lg:text-3xl md:text-2xl text-xl font-bold text-gray-800">{pageTitle}</h2>
                <p className="text-gray-500 mt-2 max-w-2xl mx-auto">{pageDescription}</p>
            </div>

            {/* Contact Form Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:mb-12 mb-10">
                {/* Left Side: Form */}
                <Card className="shadow-lg">
                    <CardContent className="p-4 md:p-8">
                        <h2 className="lg:text-3xl md:text-2xl text-xl font-bold mb-3 md:mb-4">{t('Send Us a Message')}</h2>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            post(route('support-ticket.contact.store',[userSlug]), {
                                onSuccess: () => {
                                    reset();
                                    setSelectedFiles([]);
                                },
                                onError: (errors) => {
                                    console.error('Contact form errors:', errors);
                                    const errorMessage = Object.values(errors).flat().join(', ') || 'Failed to send message. Please try again.';
                                    toast.error(errorMessage);
                                }
                            });
                        }} className="space-y-5">
                            {/* Name Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="firstName">{t('First Name')}</Label>
                                    <Input
                                        id="firstName"
                                        value={data.firstName}
                                        onChange={(e) => setData('firstName', e.target.value)}
                                        placeholder={t('John')}
                                        required
                                    />
                                    {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="lastName">{t('Last Name')}</Label>
                                    <Input
                                        id="lastName"
                                        value={data.lastName}
                                        onChange={(e) => setData('lastName', e.target.value)}
                                        placeholder={t('Doe')}
                                        required
                                    />
                                    {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <Label htmlFor="email">{t('Email Address')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder={t('john.doe@example.com')}
                                    required
                                />
                                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                            </div>

                            {/* Subject */}
                            <div>
                                <Label htmlFor="subject">{t('Subject')}</Label>
                                <Input
                                    id="subject"
                                    value={data.subject}
                                    onChange={(e) => setData('subject', e.target.value)}
                                    placeholder={t('How can we help you?')}
                                    required
                                />
                                {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject}</p>}
                            </div>

                            {/* Message */}
                            <div>
                                <Label htmlFor="message">{t('Message')}</Label>
                                <Textarea
                                    id="message"
                                    rows={5}
                                    value={data.message}
                                    onChange={(e) => setData('message', e.target.value)}
                                    placeholder={t('Please describe your issue or question in detail...')}
                                    className="resize-none"
                                    required
                                />
                                {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message}</p>}
                            </div>


                            {/* Submit Button */}
                            <Button type="submit" disabled={processing} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                                <Send className="h-4 w-4 mr-2" />
                                {processing ? 'Sending...' : 'Send Message'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Right Side: Office Info */}
                <div className="space-y-6">
                    {/* Company Location */}
                    <Card className="shadow-lg overflow-hidden">
                        <div className="h-64 bg-gray-100 relative">
                            {contactInformation?.map_embed_url && contactInformation.map_embed_url.trim() !== '' ? (
                                <iframe
                                    src={(() => {
                                        const mapUrl = contactInformation.map_embed_url;
                                        // Extract src URL if full iframe HTML is provided
                                        if (mapUrl.includes('<iframe')) {
                                            const srcMatch = mapUrl.match(/src=["']([^"']+)["']/);
                                            return srcMatch ? srcMatch[1] : mapUrl;
                                        }
                                        return mapUrl;
                                    })()}
                                    className="w-full h-full border-0"
                                    allowFullScreen
                                    loading="lazy"
                                    title="Office Location Map"
                                />
                            ) : (
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d387193.305935303!2d-74.25986548248684!3d40.697149422055104!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c24fa5d33f083b%3A0xc80b8f06e177fe62!2sNew%20York%2C%20NY%2C%20USA!5e0!3m2!1sen!2s!4v1652814677887!5m2!1sen!2s"
                                    className="w-full h-full border-0"
                                    allowFullScreen
                                    loading="lazy"
                                    title="Default Office Location Map"
                                    onError={() => console.warn('Failed to load default map')}
                                />
                            )}
                        </div>
                        <CardContent className="p-4 md:p-6">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('Our Headquarters')}</h3>
                            <div className="space-y-3">
                                <div className="flex items-start">
                                    <MapPin className="text-primary mt-1 mr-3 h-4 w-4 flex-shrink-0" />
                                    <span className="text-gray-600">{contactInformation?.address || '350 Fifth Avenue, New York, NY 10118'}</span>
                                </div>
                                <div className="flex items-center">
                                    <Phone className="text-primary mr-3 h-4 w-4 flex-shrink-0" />
                                    <span className="text-gray-600">{contactInformation?.phone || '+1 (212) 736-3100'}</span>
                                </div>
                                <div className="flex items-center">
                                    <Mail className="text-primary mr-3 h-4 w-4 flex-shrink-0" />
                                    <span className="text-gray-600">{contactInformation?.email || 'info@dashsupport.com'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Social Media Links */}
                    {(contactInformation?.social_media?.facebook || contactInformation?.social_media?.twitter || contactInformation?.social_media?.linkedin || contactInformation?.social_media?.instagram || contactInformation?.social_media?.youtube) && (
                        <Card className="shadow-lg">
                            <CardContent className="p-4 md:p-6">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('Follow Us')}</h3>
                                <div className="flex space-x-4">
                                    {contactInformation?.social_media?.facebook && (
                                        <a href={contactInformation.social_media.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors">
                                            <Facebook className="h-6 w-6" />
                                        </a>
                                    )}
                                    {contactInformation?.social_media?.twitter && (
                                        <a href={contactInformation.social_media.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600 transition-colors">
                                            <Twitter className="h-6 w-6" />
                                        </a>
                                    )}
                                    {contactInformation?.social_media?.linkedin && (
                                        <a href={contactInformation.social_media.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-900 transition-colors">
                                            <Linkedin className="h-6 w-6" />
                                        </a>
                                    )}
                                    {contactInformation?.social_media?.instagram && (
                                        <a href={contactInformation.social_media.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-800 transition-colors">
                                            <Instagram className="h-6 w-6" />
                                        </a>
                                    )}
                                    {contactInformation?.social_media?.youtube && (
                                        <a href={contactInformation.social_media.youtube} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-800 transition-colors">
                                            <Youtube className="h-6 w-6" />
                                        </a>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </Layout>
    );
}

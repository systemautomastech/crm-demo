import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Layout from './Layouts/Layout';
import { getImagePath } from '@/utils/helpers';
import { useTranslation } from 'react-i18next';
import { 
    HelpCircle,
    Plus,
    Search,
    Ticket,
    Book
} from 'lucide-react';

interface FaqItem {
    id: number;
    title: string;
    description: string;
    created_at: string;
}

interface FaqProps {
    faqs: FaqItem[];
}

export default function Faq({ faqs }: FaqProps) {
    const { t } = useTranslation();
    const { supportTicketSettings, userSlug } = usePage().props as any;
    const [searchTerm, setSearchTerm] = useState('');
    const [openFaq, setOpenFaq] = useState<number>(-1);
    
    // Get settings from middleware
    const titleSections = supportTicketSettings?.title_sections || {};
    const ctaSections = supportTicketSettings?.cta_sections || {};
    const featureSettings = supportTicketSettings?.feature_settings || {};
    
    const pageTitle = titleSections?.faq?.title || 'Frequently Asked Questions';
    const pageDescription = titleSections?.faq?.description || 'Quick answers to the most common questions';
    const bottomTitle = ctaSections?.faq?.title || 'Still Have Questions?';
    const bottomDescription = ctaSections?.faq?.description || 'Our support team is ready to help';

    const filteredFaqs = faqs.filter(faq =>
        faq.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? -1 : index);
    };

    // Show empty state if no FAQs are available
    if (!faqs.length) {
        return (
            <Layout title={pageTitle}>
                <div className="text-center py-16">
                    <HelpCircle className="h-16 w-16 text-gray-300 mx-auto mb-6" />
                    <h3 className="text-2xl font-semibold text-gray-600 mb-4">{t('No FAQs Available')}</h3>
                    <p className="text-gray-500">{t('Frequently asked questions will appear here once they are configured.')}</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title={pageTitle}>
            <Card className="bg-primary text-primary-foreground mb-8">
                <CardContent className="p-8 text-center">
                    <h2 className="text-3xl font-bold mb-4">{pageTitle}</h2>
                    <p className="mb-6">{pageDescription}</p>
                    
                    <div className="relative max-w-2xl mx-auto">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <Input
                            type="text"
                            placeholder={t('Search for questions...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 py-3 bg-white text-gray-700"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="max-w-4xl mx-auto space-y-4">
                {filteredFaqs.length > 0 ? (
                    filteredFaqs.map((faq, index) => (
                        <Card key={faq.id} className="overflow-hidden">
                            <button
                                onClick={() => toggleFaq(index)}
                                className={`w-full p-5 text-left focus:outline-none transition-all duration-300 ${
                                    openFaq === index ? 'bg-primary text-primary-foreground' : 'bg-white hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{faq.title}</span>
                                    <Plus className={`h-5 w-5 transition-transform duration-300 ${
                                        openFaq === index ? 'rotate-45' : ''
                                    }`} />
                                </div>
                            </button>
                            
                            {openFaq === index && (
                                <CardContent className="p-5 bg-gray-50 border-t">
                                    <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: faq.description }} />
                                </CardContent>
                            )}
                        </Card>
                    ))
                ) : (
                    <Card className="p-8 text-center">
                        <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">{t('No FAQs Found')}</h3>
                        <p className="text-gray-500">{t('No FAQs match your search criteria.')}</p>
                    </Card>
                )}
            </div>

            {/* Still Have Questions Section */}
            <div className="mt-12 mb-12">
                <Card className="bg-primary text-primary-foreground overflow-hidden relative">
                    <CardContent className="flex flex-col md:flex-row items-center px-4 py-6 md:p-8 lg:p-12 relative">
                        <div className="w-full md:w-2/3 text-white mb-6 md:mb-0 md:pr-12 text-center md:text-left">
                            <h2 className="lg:text-3xl md:text-2xl text-xl font-bold mb-3 md:mb-4">{bottomTitle}</h2>
                            <p className="text-white mb-4 md:mb-6">{bottomDescription}</p>
                            <div className="flex flex-wrap gap-3 md:gap-4 justify-center md:justify-start">
                                <Button variant="secondary" className="bg-white text-primary hover:bg-gray-100 font-semibold" asChild>
                                    <Link href={route('support-ticket.index', [userSlug])}>
                                        <Ticket className="h-4 w-4 mr-2" />
                                        {t('Create Support Ticket')}
                                    </Link>
                                </Button>
                                {featureSettings.knowledge_base_is_on === 'on' && (
                                    <Button variant="outline" className="border-white/20 bg-white/20 hover:bg-white/30 text-white border-2" asChild>
                                        <Link href={route('support-ticket.knowledge', [userSlug])}>
                                            <Book className="h-4 w-4 mr-2" />
                                            {t('Browse Knowledge Base')}
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="w-full md:w-1/3 flex justify-center">
                            <div className="relative w-48 h-48 md:w-56 md:h-56">
                                <img src={getImagePath('packages/automas/SupportTicket/src/Resources/assets/images/faq-image.svg')} alt="FAQ" className="w-full h-full object-contain" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
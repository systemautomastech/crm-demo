import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Layout from './Layouts/Layout';
import { getImagePath, formatDate } from '@/utils/helpers';
import { useTranslation } from 'react-i18next';

import { Lightbulb, Search, FileText, ChevronRight, Ticket, HelpCircle } from 'lucide-react';

export default function Knowledge({ knowledgeItems, categories }: KnowledgeProps) {
    const { t } = useTranslation();
    const { supportTicketSettings, userSlug } = usePage().props as any;
    const [searchTerm, setSearchTerm] = useState('');
    
    // Extract settings from middleware
    const featureSettings = supportTicketSettings?.feature_settings || {};
    const titleSections = supportTicketSettings?.title_sections || {};
    const ctaSections = supportTicketSettings?.cta_sections || {};
    
    const pageTitle = titleSections?.knowledge_base?.title || 'Knowledge Base';
    const pageDescription = titleSections?.knowledge_base?.description || 'Find answers to common questions and issues';
    const bottomTitle = ctaSections?.knowledge_base?.title || 'Can\'t find what you\'re looking for?';
    const bottomDescription = ctaSections?.knowledge_base?.description || 'Our support team is here to help';

    const filteredItems = knowledgeItems.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedItems = categories.map(category => ({
        ...category,
        icon: FileText,
        articles: filteredItems.filter(item => item.category?.id === category.id)
    })).filter(category => category.articles.length > 0);

    // Add uncategorized items
    const uncategorizedItems = filteredItems.filter(item => !item.category);
    if (uncategorizedItems.length > 0) {
        groupedItems.push({
            id: 0,
            title: "General",
            icon: FileText,
            articles: uncategorizedItems
        });
    }

    return (
        <Layout title={pageTitle}>
            <div className="rounded-2xl overflow-hidden shadow-xl mb-12 bg-primary text-primary-foreground relative">
                <div className="relative py-12 px-8">
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="mb-4 inline-block p-2 px-4 bg-white/20 rounded-full text-white text-sm">
                            <Lightbulb className="inline h-4 w-4 mr-2" />
                            {t('Knowledge Center')}
                        </div>
                        <h2 className="text-4xl font-bold mb-4 text-white">{pageTitle}</h2>
                        <p className="text-white/90 mb-6">{pageDescription}</p>
                        
                        <div className="relative mx-auto max-w-2xl">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center">
                                <Search className="h-5 w-5 text-primary" />
                            </div>
                            <Input
                                type="text"
                                className="bg-white/95 border-0 pl-12 pr-24 py-3 text-gray-700 focus-visible:ring-2 focus-visible:ring-primary"
                                placeholder={t('What are you looking for?')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-12">
                <h2 className="text-3xl font-bold mb-6 text-gray-800">{t('Knowledge Articles')}</h2>
                
                {groupedItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupedItems.map((category) => (
                            <Card key={category.id} className="shadow-lg overflow-hidden flex flex-col">
                                <div className="bg-primary text-primary-foreground py-4 px-5">
                                    <h3 className="font-medium flex items-center text-lg">
                                        <category.icon className="h-5 w-5 mr-2 flex-shrink-0" />
                                        {category.title}
                                    </h3>
                                </div>
                                <CardContent className="p-5 space-y-1 flex-1 overflow-y-auto">
                                    {category.articles.map((article) => (
                                        <div key={article.id} className="group hover:translate-x-1 transition-all duration-300">
                                            <Link href={route('support-ticket.knowledge.article', [userSlug, article.id])} className="flex items-start p-3 gap-3 rounded-lg hover:bg-primary/5">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary flex-shrink-0 transition-colors">
                                                    <FileText className="h-4 w-4 text-primary group-hover:text-primary-foreground" />
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <h4 className="text-gray-800 group-hover:text-primary text-sm font-medium line-clamp-2">{article.title}</h4>
                                                    <p className="text-xs text-gray-500 mt-1">{formatDate(article.created_at)}</p>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" />
                                            </Link>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="p-8 text-center">
                        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">{t('No Knowledge Articles Found')}</h3>
                        <p className="text-gray-500">{t('There are no knowledge articles available at the moment.')}</p>
                    </Card>
                )}
            </div>

            <div className="mt-12 mb-12">
                <Card className="bg-primary text-primary-foreground overflow-hidden relative">
                    <div className="absolute inset-0 opacity-10">
                        <svg width="100%" height="100%">
                            <defs>
                                <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/>
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#smallGrid)"/>
                        </svg>
                    </div>
                    
                    <CardContent className="flex flex-col md:flex-row items-center px-4 py-6 md:p-8 lg:p-12 relative">
                        <div className="w-full md:w-2/3 text-white mb-6 md:mb-0 md:pr-12 text-center md:text-left">
                            <h2 className="lg:text-3xl md:text-2xl text-xl font-bold mb-3 md:mb-4">{bottomTitle}</h2>
                            <p className="text-white mb-4 md:mb-6">
                                {bottomDescription || "Can't find the answer you're looking for? Our support team is ready to help you with any issues or concerns you might have."}
                            </p>
                            <div className="flex flex-wrap gap-3 md:gap-4 justify-center md:justify-start">
                                <Button variant="secondary" className="bg-white text-primary hover:bg-gray-100 font-semibold" asChild>
                                    <Link href={route('support-ticket.index', [userSlug])}>
                                        <Ticket className="h-4 w-4 mr-2" />
                                        {t('Create Support Ticket')}
                                    </Link>
                                </Button>
                                {featureSettings.faq_is_on === 'on' && (
                                    <Button variant="outline" className="border-white/20 bg-white/20 hover:bg-white/30 text-white border-2" asChild>
                                        <Link href={route('support-ticket.faq', [userSlug])}>
                                            <HelpCircle className="h-4 w-4 mr-2" />
                                            {t('Browse FAQ')}
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="w-full md:w-1/3 flex justify-center">
                            <div className="relative w-48 h-48 md:w-56 md:h-56">
                                <img src={getImagePath('packages/automas/SupportTicket/src/Resources/assets/images/svg/support-illustration.svg')} alt="FAQ" className="w-full h-full object-contain" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
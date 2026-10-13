import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from './Layouts/Layout';
import { getImagePath, formatDate } from '@/utils/helpers';
import { useTranslation } from 'react-i18next';
import {  Database, Calendar, List, FileCode, Server, Shield, Info, Ticket, Link as LinkIcon} from 'lucide-react';

export default function KnowledgeArticle({ article, relatedArticles }: KnowledgeArticleProps) {
    const { t } = useTranslation();
    const { supportTicketSettings, userSlug } = usePage().props as any;
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Extract settings from middleware
    const featureSettings = supportTicketSettings?.feature_settings || {};

    // Generate table of contents from article description HTML
    const generateTocItems = (description: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(description, 'text/html');
        const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        return Array.from(headings).map((heading, index) => ({
            id: `heading-${index}`,
            title: heading.textContent || `Section ${index + 1}`
        }));
    };

    const tocItems = generateTocItems(article.description);

    return (
        <Layout title={article.title}>
            {/* Breadcrumbs */}
            <div className="text-sm text-gray-500 mb-4">
                <Link href={route('support-ticket.index', [userSlug])} className="hover:text-primary">{t('Home')}</Link>
                <span className="mx-2">/</span>
                <Link href={route('support-ticket.knowledge', [userSlug])} className="hover:text-primary">{t('Knowledge Base')}</Link>
                {article.category && (
                    <>
                        <span className="mx-2">/</span>
                        <span className="hover:text-primary">{article.category.title}</span>
                    </>
                )}
                <span className="mx-2">/</span>
                <span className="text-gray-700">{article.title}</span>
            </div>

            {/* Article Header */}
            <Card className="bg-primary text-primary-foreground overflow-hidden shadow-lg mb-8">
                <CardContent className="py-6 px-4 md:p-8 flex flex-col md:flex-row items-center">
                    <div className="w-full md:w-3/5 text-white mb-8 md:mb-0 md:pr-8">
                        <div className="mb-4">
                            <span className="inline-block bg-white/20 text-white text-sm px-4 py-1 rounded-full backdrop-blur-sm mb-3 md:mb-4">
                                <Database className="inline h-4 w-4 mr-1" />
                                {article.category?.title || t('Knowledge Base')}
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4 text-white">{article.title}</h2>
                        <p className="text-white/90 mb-4 md:mb-6">
                            {t('Comprehensive guide to help you understand and implement the solution')}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-sm">
                            <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                <span>{t('Last updated')}: {formatDate(article.updated_at)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-full md:w-2/5 flex justify-center">
                      
                            <img src={getImagePath('packages/automas/SupportTicket/src/Resources/assets/images/svg/database-illustration.svg')}
                            alt="Knowledge Base Illustration" 
                            className="w-full max-w-sm"
                            style={{ animation: 'float 3s ease-in-out infinite' }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Sidebar (Table of Contents) */}
                {tocItems.length > 0 && (
                    <div className="w-full lg:w-1/4">
                        <Card className="shadow-md sticky top-4">
                            <CardContent className="p-4 md:p-5">
                                <h3 className="text-lg font-semibold mb-4 flex items-center">
                                    <List className="h-5 w-5 text-primary mr-2" />
                                    {t('Table of Contents')}
                                </h3>
                                <div className="space-y-1">
                                    {tocItems.map((item) => (
                                        <a 
                                            key={item.id}
                                            href={`#${item.id}`} 
                                            className="block text-gray-700 text-sm rounded p-2 hover:bg-primary/5 hover:text-primary hover:border-l-2 hover:border-primary hover:pl-3 transition-all duration-300"
                                        >
                                            {item.title}
                                        </a>
                                    ))}
                                </div>
                                
                                {/* Quick Resources Box */}
                                <div className="mt-8 pt-6 border-t border-gray-200">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                                        <LinkIcon className="h-5 w-5 text-primary mr-2" />
                                        {t('Quick Resources')}
                                    </h3>
                                    <div className="space-y-3">
                                        <Link href={route('support-ticket.knowledge', [userSlug])} className="flex items-center text-gray-700 hover:text-primary text-sm">
                                            <FileCode className="h-4 w-4 mr-2 text-primary" />
                                            <span>{t('Browse All Articles')}</span>
                                        </Link>
                                        <Link href={route('support-ticket.index', [userSlug])} className="flex items-center text-gray-700 hover:text-primary text-sm">
                                            <Server className="h-4 w-4 mr-2 text-primary" />
                                            <span>{t('Create Support Ticket')}</span>
                                        </Link>
                                        {featureSettings.faq_is_on === 'on' && (
                                            <Link href={route('support-ticket.faq', [userSlug])} className="flex items-center text-gray-700 hover:text-primary text-sm">
                                                <Shield className="h-4 w-4 mr-2 text-primary" />
                                                <span>{t('FAQ Section')}</span>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Main Article Content */}
                <div className={`w-full ${tocItems.length > 0 ? 'lg:w-2/4' : 'lg:w-2/3'}`}>
                    <Card className="shadow-md">
                        <CardContent className="p-4 lg:p-8 md:p-6 max-h-[80vh] overflow-y-auto">
                            {/* Introduction Section */}
                            <div className="mb-8">
                                <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl">
                                    <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                                        <Info className="h-5 w-5 text-primary mr-2" />
                                        {t('Article Information')}
                                    </h4>
                                    <p className="text-gray-700 text-sm">
                                        {t('This article provides detailed information to help you understand the topic. Please read through the content carefully.')}
                                    </p>
                                </div>
                            </div>

                            {/* Article Content */}
                            <div className="mb-10">
                                <div 
                                    className="prose prose-gray max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-800"
                                    dangerouslySetInnerHTML={{ __html: article.description }}
                                />
                            </div>


                        </CardContent>
                    </Card>
                </div>

                {/* Right Sidebar */}
                {tocItems.length > 0 && (
                    <div className="w-full lg:w-1/4">
                        {/* Related Articles */}
                        <Card className="shadow-md mb-6">
                            <CardContent className="p-5">

                                <h3 className="text-lg font-semibold mb-4 flex items-center">
                                    <LinkIcon className="h-5 w-5 text-primary mr-2" />
                                    {t('Related Articles')}
                                </h3>
                                <div className="space-y-4">
                                    {relatedArticles && relatedArticles.length > 0 ? (
                                        relatedArticles.map((relatedArticle) => (
                                            <Link key={relatedArticle.id} href={route('support-ticket.knowledge.article', [userSlug, relatedArticle.id])} className="block rounded-lg p-4 border border-gray-200 hover:border-primary hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                                                <h4 className="font-medium text-gray-800 mb-1 hover:text-primary transition-colors duration-300">{relatedArticle.title}</h4>
                                                <p className="text-gray-500 text-sm line-clamp-2">{relatedArticle.description.replace(/<[^>]*>/g, '').substring(0, 100)}...</p>
                                                <p className="text-xs text-gray-400 mt-2">{formatDate(relatedArticle.created_at)}</p>
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-sm">{t('No related articles found.')}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Navigation */}
                        <Card className="shadow-md">
                            <CardContent className="p-5">
                                <h3 className="text-lg font-semibold mb-4 flex items-center">
                                    <LinkIcon className="h-5 w-5 text-primary mr-2" />
                                    {t('Navigation')}
                                </h3>
                                <div className="space-y-4">
                                    <Link href={route('support-ticket.knowledge', [userSlug])} className="block rounded-lg p-4 border border-gray-200 hover:border-primary hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                                        <h4 className="font-medium text-gray-800 mb-1 hover:text-primary transition-colors duration-300">← {t('Back to Knowledge Base')}</h4>
                                        <p className="text-gray-500 text-sm">{t('Browse all available articles')}</p>
                                    </Link>
                                    {article.category && (
                                        <div className="rounded-lg p-4 border border-gray-200">
                                            <h4 className="font-medium text-gray-800 mb-1">{t('Category')}</h4>
                                            <p className="text-primary text-sm font-semibold">{article.category.title}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
                {/* Right Sidebar - Show when no TOC */}
                {tocItems.length === 0 && (
                    <div className="w-full lg:w-1/3">
                        {/* Related Articles */}
                        <Card className="shadow-md mb-6">
                            <CardContent className="p-5">
                                <h3 className="text-lg font-semibold mb-4 flex items-center">
                                    <LinkIcon className="h-5 w-5 text-primary mr-2" />
                                    {t('Related Articles')}
                                </h3>
                                <div className="space-y-4">
                                    {relatedArticles && relatedArticles.length > 0 ? (
                                        relatedArticles.map((relatedArticle) => (
                                            <Link key={relatedArticle.id} href={route('support-ticket.knowledge.article', [userSlug, relatedArticle.id])} className="block rounded-lg p-4 border border-gray-200 hover:border-primary hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                                                <h4 className="font-medium text-gray-800 mb-1 hover:text-primary transition-colors duration-300">{relatedArticle.title}</h4>
                                                <p className="text-gray-500 text-sm line-clamp-2">{relatedArticle.description.replace(/<[^>]*>/g, '').substring(0, 100)}...</p>
                                                <p className="text-xs text-gray-400 mt-2">{formatDate(relatedArticle.created_at)}</p>
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-sm">{t('No related articles found.')}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Support Section */}
                        <Card className="shadow-md">
                            <CardContent className="p-5">
                                <h3 className="text-lg font-semibold mb-4">{t('Need Help?')}</h3>
                                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                                    <h4 className="font-bold text-gray-800 mb-3">{t('Still have questions?')}</h4>
                                    <p className="text-gray-700 text-sm mb-4">
                                        {t('If you couldn\'t find the information you were looking for, our support team is here to help.')}
                                    </p>
                                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full" asChild>
                                        <Link href={route('support-ticket.index', [userSlug])}>
                                            <Ticket className="h-4 w-4 mr-2" />
                                            {t('Create a Support Ticket')}
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </Layout>
    );
}
import { useState, useEffect } from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Layout from './Layouts/Layout';
import { getImagePath } from '@/utils/helpers';
import { useTranslation } from 'react-i18next';
import { KeyRound, Ticket, Lock, ExternalLink, LogOut } from 'lucide-react';

interface AuthenticatedTicket {
    id: number;
    ticket_id: string;
    subject: string;
    status: string;
    category: string;
    created_at: string;
    url: string;
}

interface MyTicketProps {
    authenticatedTickets?: AuthenticatedTicket[];
    initialTicketId?: string;
}

export default function MyTicket({ authenticatedTickets = [], initialTicketId = '' }: MyTicketProps) {
    const { t } = useTranslation();
    const { supportTicketSettings, userSlug, flash } = usePage().props as any;

    const titleSections = supportTicketSettings?.title_sections || {};
    const pageTitle = t('Access My Ticket');
    const pageDescription = t('Enter your ticket number and password to access your ticket details and reply');

    const { data, setData, post, processing, errors } = useForm({
        ticket_id: initialTicketId || '',
        password: '',
    });

    useEffect(() => {
        if (flash?.error) {
            toast.error(flash.error);
        }
        if (flash?.success) {
            toast.success(flash.success);
        }
    }, [flash]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('support-ticket.my-ticket.auth', [userSlug]), {
            onError: (err) => {
                if (err.ticket_id || err.password) {
                    toast.error(err.ticket_id || err.password);
                }
            }
        });
    };

    const handleLogout = (ticketId?: number) => {
        router.post(route('support-ticket.my-ticket.logout', [userSlug]), {
            ticket_id: ticketId ?? null
        });
    };

    return (
        <Layout title={pageTitle}>
            {/* Page Title */}
            <div className="text-center lg:mb-8 mb-6">
                <h2 className="lg:text-3xl md:text-2xl text-xl font-bold text-gray-800">{pageTitle}</h2>
                <p className="text-gray-500 mt-2">{pageDescription}</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
                {/* Active Logged-in Tickets Section */}
                {authenticatedTickets.length > 0 && (
                    <Card className="rounded-lg text-card-foreground min-w-0 overflow-hidden shadow-lg border border-primary/20 bg-white">
                        <div className="p-4 bg-primary text-primary-foreground rounded-t-xl flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-base md:text-lg flex items-center gap-2">
                                    <KeyRound className="h-5 w-5" />
                                    {t('Active Ticket Sessions')}
                                </h3>
                                <p className="text-xs text-primary-foreground/80 mt-0.5">
                                    {t('You are logged in and authenticated to access these tickets without credentials.')}
                                </p>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleLogout()}
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 flex-row dark:text-white h-9 rounded-md px-3 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold border border-white/30"
                            >
                                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                                {t('Logout All')}
                            </Button>
                        </div>
                        <CardContent className="p-4 md:p-6 divide-y divide-slate-100">
                            {authenticatedTickets.map((tkt) => (
                                <div key={tkt.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                                #{tkt.ticket_id}
                                            </span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${tkt.status?.toLowerCase() === 'open' ? 'bg-emerald-100 text-emerald-800' :
                                                    tkt.status?.toLowerCase() === 'in progress' ? 'bg-blue-100 text-blue-800' :
                                                        tkt.status?.toLowerCase() === 'closed' ? 'bg-slate-100 text-slate-700' :
                                                            'bg-amber-100 text-amber-800'
                                                }`}>
                                                {tkt.status}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-base">{tkt.subject}</h4>
                                        <p className="text-xs text-slate-500">
                                            {t('Category')}: <span className="font-medium text-slate-700">{tkt.category}</span> &bull; {t('Created')}: <span className="font-medium text-slate-700">{tkt.created_at}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                        <Button
                                            size="sm"
                                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 flex-row h-9 rounded-md px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex-1 md:flex-initial"
                                            onClick={() => window.location.href = tkt.url}
                                        >
                                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                            {t('Open Conversation')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 flex-row border bg-background dark:text-white hover:text-accent-foreground h-9 rounded-md px-3 text-red-600 border-red-200 hover:bg-red-50 text-xs"
                                            onClick={() => handleLogout(tkt.id)}
                                        >
                                            <LogOut className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Login Credentials Form */}
                <Card className="shadow-md">
                    <CardContent className="md:p-8 p-4">
                        <div className="p-4 md:p-6 bg-primary text-primary-foreground rounded-xl overflow-hidden relative shadow-md">
                            <div className="flex flex-col-reverse md:flex-row items-center gap-6 md:gap-8">
                                <div className="w-full md:w-1/3">
                                    <img
                                        src={getImagePath('packages/automas/SupportTicket/src/Resources/assets/images/search-person.svg')}
                                        alt="Access ticket illustration"
                                        className="w-full h-auto"
                                    />
                                </div>
                                <div className="w-full md:w-2/3 text-white">
                                    <h2 className="lg:text-3xl md:text-2xl text-xl font-bold mb-3 md:mb-4">{t('My Ticket Portal')}</h2>
                                    <p className="mb-4 text-white/90">{t('Please enter your Ticket ID and Access Password to enter the ticket conversation.')}</p>

                                    {/* Access Form */}
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Ticket className="h-5 w-5 text-white/70" />
                                            </div>
                                            <input
                                                type="text"
                                                value={data.ticket_id}
                                                onChange={(e) => setData('ticket_id', e.target.value)}
                                                placeholder={t('Enter Ticket Number (e.g., 1742123456)')}
                                                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                                                required
                                            />
                                            {errors.ticket_id && <p className="text-red-200 text-sm mt-1">{errors.ticket_id}</p>}
                                        </div>

                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-white/70" />
                                            </div>
                                            <input
                                                type="password"
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
                                                placeholder={t('Enter Access Password')}
                                                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                                                required
                                            />
                                            {errors.password && <p className="text-red-200 text-sm mt-1">{errors.password}</p>}
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            className="bg-white text-primary hover:bg-gray-100 w-full md:w-auto transition duration-300 shadow-md hover:shadow-lg font-semibold"
                                        >
                                            <KeyRound className="h-4 w-4 mr-2" />
                                            {processing ? t('Verifying...') : t('Access Ticket')}
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}

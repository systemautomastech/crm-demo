import { useState, useEffect } from 'react';
import { useForm, Link, usePage, router } from '@inertiajs/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Layout from './Layouts/Layout';
import { getImagePath } from '@/utils/helpers';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { toast } from 'sonner';
import {
    Search,
    Ticket,
    Phone,
    User,
    Headphones,
    FolderTree,
    Calendar,
    ArrowRight,
    AlertCircle,
    KeyRound,
    ExternalLink,
    Lock,
    Loader2
} from 'lucide-react';

interface TicketItem {
    id: number;
    encrypted_id?: string;
    ticket_id: string;
    subject: string;
    name: string;
    phone_number?: string;
    status: string;
    category: string;
    support_person?: string | null;
    created_at: string;
}

interface SearchTicketProps {
    searchResult?: TicketItem;
    tickets?: TicketItem[];
    searchQuery?: string;
    errorMessage?: string;
}

export default function SearchTicket({ searchResult, tickets, searchQuery, errorMessage }: SearchTicketProps) {
    const { t } = useTranslation();
    const { supportTicketSettings, userSlug } = usePage().props as any;
    useFlashMessages();

    const titleSections = supportTicketSettings?.title_sections || {};
    const pageTitle = titleSections?.search_ticket?.title || t('Find Your Support Ticket');
    const pageDescription = titleSections?.search_ticket?.description || t('Track the status of your existing support tickets using Ticket Number or Phone Number');

    const [searchInput, setSearchInput] = useState(searchQuery || '');
    const [isSearching, setIsSearching] = useState(false);

    // Authentication modal state
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        setSearchInput(searchQuery || '');
    }, [searchQuery]);

    useEffect(() => {
        if (errorMessage) {
            toast.error(errorMessage);
        }
    }, [errorMessage]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const query = searchInput.trim();
        if (!query) return;

        setIsSearching(true);
        router.get(
            route('support-ticket.search', [userSlug]),
            { q: query },
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setIsSearching(false),
            }
        );
    };

    const handleOpenAccessModal = (ticketId: string) => {
        setSelectedTicketId(ticketId);
        setAuthPassword('');
        setAuthError('');
        setIsAuthModalOpen(true);
    };

    const handleAuthSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicketId || !authPassword) return;

        setIsAuthenticating(true);
        setAuthError('');

        router.post(
            route('support-ticket.my-ticket.auth', [userSlug]),
            {
                ticket_id: selectedTicketId,
                password: authPassword,
            },
            {
                preserveScroll: false,
                onSuccess: () => {
                    setIsAuthenticating(false);
                    setIsAuthModalOpen(false);
                },
                onError: (err: any) => {
                    setIsAuthenticating(false);
                    const msg = err.ticket_id || err.password || err.error || (typeof err === 'string' ? err : '');
                    setAuthError(msg || t('Invalid Access Credentials.'));
                }
            }
        );
    };

    const getStatusBadge = (status: string) => {
        const normalized = (status || '').toLowerCase();
        let colorClasses = 'bg-amber-100 text-amber-800 border-amber-200';

        if (normalized === 'open') {
            colorClasses = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        } else if (normalized === 'in progress') {
            colorClasses = 'bg-blue-100 text-blue-800 border-blue-200';
        } else if (normalized === 'closed') {
            colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
        }

        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${colorClasses}`}>
                {status}
            </span>
        );
    };

    const renderTicketCard = (item: TicketItem) => (
        <Card key={item.id} className="shadow-md border border-slate-200 hover:border-primary/40 transition-colors bg-white">
            <CardContent className="p-5 md:p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-4 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20 uppercase tracking-wider">
                                {t('Ticket ID')}: #{item.ticket_id}
                            </span>
                            {item.phone_number && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Phone className="h-3 w-3 text-slate-400" />
                                    {item.phone_number}
                                </span>
                            )}
                        </div>
                        <h3 className="text-base md:text-lg font-bold text-slate-800 mt-1.5">{item.subject}</h3>
                    </div>
                    <div className="flex items-center gap-2.5">
                        {getStatusBadge(item.status)}
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => handleOpenAccessModal(item.ticket_id)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-8 px-3 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                            <KeyRound className="h-3.5 w-3.5" />
                            {t('Access')}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs text-slate-600">
                    <div>
                        <p className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {t('Name')}
                        </p>
                        <p className="font-medium text-slate-700 mt-1 text-sm">{item.name}</p>
                    </div>

                    <div>
                        <p className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Headphones className="h-3.5 w-3.5 text-primary" />
                            {t('Support Person')}
                        </p>
                        <p className="font-medium text-slate-800 mt-1 text-sm">
                            {item.support_person ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold border border-primary/20 text-xs">
                                    {item.support_person}
                                </span>
                            ) : (
                                <span className="text-slate-400 italic">{t('Unassigned')}</span>
                            )}
                        </p>
                    </div>

                    <div>
                        <p className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <FolderTree className="h-3.5 w-3.5 text-slate-400" />
                            {t('Category')}
                        </p>
                        <p className="font-medium text-slate-700 mt-1 text-sm">{item.category}</p>
                    </div>

                    <div>
                        <p className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {t('Created At')}
                        </p>
                        <p className="font-medium text-slate-700 mt-1 text-sm">{item.created_at}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <Layout title={pageTitle}>
            {/* Password Verification Modal Popup matching Show/MyTicket design */}
            <Dialog
                open={isAuthModalOpen}
                onOpenChange={(open) => {
                    setIsAuthModalOpen(open);
                    if (!open) setAuthError('');
                }}
            >
                <DialogContent className="w-[95vw] sm:max-w-2xl p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-transparent">
                    <div className="p-5 sm:p-8 md:py-10 md:px-10 bg-primary text-primary-foreground rounded-2xl overflow-hidden relative shadow-xl">
                        <div className="flex flex-col-reverse md:flex-row items-center gap-5 md:gap-8">
                            <div className="w-full md:w-1/3 flex justify-center">
                                <img
                                    src={getImagePath('packages/automas/SupportTicket/src/Resources/assets/images/search-person.svg')}
                                    alt="Access ticket illustration"
                                    className="w-28 sm:w-36 md:w-full h-auto drop-shadow-md"
                                />
                            </div>
                            <div className="w-full md:w-2/3 text-white">
                                <h2 className="text-xl md:text-2xl font-bold mb-2">{t('My Ticket Portal')}</h2>
                                <p className="mb-4 sm:mb-6 text-white/90 text-xs sm:text-sm leading-relaxed">
                                    {t('Please enter your Ticket ID and Access Password to enter the ticket conversation.')}
                                </p>

                                {authError && (
                                    <div className="mb-4 p-3 bg-red-500/20 backdrop-blur-xs border border-red-300/40 rounded-lg text-white text-xs font-medium">
                                        {authError}
                                    </div>
                                )}

                                <form onSubmit={handleAuthSubmit} className="space-y-4" noValidate>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Ticket className="h-5 w-5 text-white/70" />
                                        </div>
                                        <input
                                            type="text"
                                            value={selectedTicketId}
                                            readOnly
                                            className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white rounded-lg focus:outline-none cursor-not-allowed text-sm font-semibold opacity-90"
                                        />
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-white/70" />
                                        </div>
                                        <input
                                            type="password"
                                            value={authPassword}
                                            onChange={(e) => {
                                                setAuthPassword(e.target.value);
                                                if (authError) setAuthError('');
                                            }}
                                            placeholder={t('Enter Access Password')}
                                            autoFocus
                                            className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-sm"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <Button
                                            type="submit"
                                            disabled={isAuthenticating}
                                            className="bg-white text-primary hover:bg-gray-100 w-full md:w-auto transition duration-300 shadow-md hover:shadow-lg font-bold text-sm px-8 py-3 cursor-pointer"
                                        >
                                            {isAuthenticating ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
                                                    {t('Verifying...')}
                                                </>
                                            ) : (
                                                <>
                                                    <KeyRound className="h-4 w-4 mr-2 text-primary" />
                                                    {t('Enter')}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Page Title */}
            <div className="text-center lg:mb-8 mb-6">
                <h2 className="lg:text-3xl md:text-2xl text-xl font-bold text-gray-800">{pageTitle}</h2>
                <p className="text-gray-500 mt-2">{pageDescription}</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
                <Card className="shadow-md">
                    <CardContent className="md:p-8 p-4">
                        <div className="p-4 md:p-6 bg-primary text-primary-foreground rounded-xl overflow-hidden relative shadow-md">
                            <div className="flex flex-col-reverse md:flex-row items-center gap-6 md:gap-8">
                                <div className="w-full md:w-1/3">
                                    <img
                                        src={getImagePath('packages/automas/SupportTicket/src/Resources/assets/images/search-person.svg')}
                                        alt="Search illustration"
                                        className="w-full h-auto"
                                    />
                                </div>
                                <div className="w-full md:w-2/3 text-white">
                                    <h2 className="lg:text-3xl md:text-2xl text-xl font-bold mb-3 md:mb-4">{t('Find Your Ticket')}</h2>
                                    <p className="mb-4 text-white/90">
                                        {t('Enter your Ticket Number or Phone Number to check your ticket details and status')}
                                    </p>

                                    {/* Search Form */}
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                <Search className="h-5 w-5 text-white/70" />
                                            </div>
                                            <input
                                                type="text"
                                                value={searchInput}
                                                onChange={(e) => setSearchInput(e.target.value)}
                                                placeholder={t('Enter Ticket or Phone Number')}
                                                className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-sm md:text-base"
                                                required
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={isSearching}
                                            className="bg-white text-primary hover:bg-gray-100 w-full md:w-auto transition duration-300 shadow-md hover:shadow-lg font-semibold cursor-pointer"
                                        >
                                            <Search className="h-4 w-4 mr-2" />
                                            {isSearching ? t('Searching...') : t('Search Tickets')}
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Error / Not Found Message */}
                {errorMessage && (
                    <Card className="border-red-200 bg-red-50 text-red-700 shadow-xs">
                        <CardContent className="p-4 flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                            <p className="text-sm font-medium">{errorMessage}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Single Ticket Result (when searched by ticket_id) */}
                {searchResult && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                {t('Search Result')}
                            </h3>
                        </div>
                        {renderTicketCard(searchResult)}
                    </div>
                )}

                {/* Multiple Tickets Result (when searched by phone number) */}
                {tickets && tickets.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                {t('Tickets Found')} ({tickets.length})
                            </h3>
                        </div>
                        <div className="space-y-4">
                            {tickets.map((item) => renderTicketCard(item))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
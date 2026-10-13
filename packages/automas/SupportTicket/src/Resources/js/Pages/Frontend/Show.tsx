import React, { useState, useEffect, useRef } from 'react';
import { useForm, router, usePage } from '@inertiajs/react';
import Layout from './Layouts/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Paperclip, Send, Ticket, ThumbsUp, ChevronUp, Loader2, MessageSquare, Calendar, KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { route } from 'ziggy-js';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import { formatDateTime } from '@/utils/helpers';
import { getImagePath } from '@/utils/helpers';
import { toast } from 'sonner';

interface Attachment {
    name: string;
    path: string;
}

interface Conversion {
    id: number;
    ticket_id?: number;
    description: string;
    sender: string;
    attachments: Attachment[];
    created_at: string;
    replyBy?: { name: string };
}

interface CategoryInfo {
    id: number;
    name: string;
    color?: string;
}

interface TicketDetail {
    id: number;
    ticket_id: string;
    name: string;
    email: string;
    subject: string;
    status: string;
    description: string;
    note?: string;
    attachments: Attachment[];
    category_info?: CategoryInfo;
    conversions: Conversion[];
    has_more_conversions?: boolean;
    total_conversions?: number;
    created_at: string;
}

interface ShowProps {
    ticket: TicketDetail;
    settings?: any;
    brandSettings?: any;
    requiresPassword?: boolean;
    ticketNumber?: string;
    encryptedTicketId?: string;
}

export default function Show({ ticket, settings, brandSettings, requiresPassword = false, ticketNumber = '', encryptedTicketId = '' }: ShowProps) {
    const { t } = useTranslation();
    useFlashMessages();
    const pageProps = usePage().props;
    const { imageUrlPrefix, userSlug, flash } = pageProps as any;

    const displayTicketNumber = ticket?.ticket_id || ticketNumber;
    const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(requiresPassword);
    const [authPassword, setAuthPassword] = useState<string>('');
    const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
    const [authError, setAuthError] = useState<string>('');

    useEffect(() => {
        setIsAuthModalOpen(requiresPassword);
    }, [requiresPassword]);
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [activeToolbar, setActiveToolbar] = useState<string[]>([]);
    const [editorKey, setEditorKey] = useState(0);

    const [conversations, setConversations] = useState<Conversion[]>(ticket.conversions || []);
    const [hasMore, setHasMore] = useState<boolean>(Boolean(ticket.has_more_conversions));
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const isInitialScrollDone = useRef<boolean>(false);

    useEffect(() => {
        if (ticket.conversions) {
            setConversations(ticket.conversions);
            setHasMore(Boolean(ticket.has_more_conversions));
        }
    }, [ticket.conversions, ticket.has_more_conversions]);

    // Scroll to bottom initially
    useEffect(() => {
        if (!isInitialScrollDone.current && chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            isInitialScrollDone.current = true;
        }
    }, [conversations]);

    const handleLoadMore = async () => {
        if (isLoadingMore || !hasMore || conversations.length === 0) return;
        setIsLoadingMore(true);

        const oldestId = conversations[0].id;
        const scrollContainer = chatContainerRef.current;
        const previousScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
        const previousScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

        const urlParts = window.location.pathname.split('/').filter(Boolean);
        const urlTicketId = urlParts[urlParts.length - 1] || ticket.id;

        try {
            const response = await fetch(route('support-ticket.conversions.load', {
                slug: userSlug,
                ticketId: urlTicketId,
                before_id: oldestId
            }), {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.ok) {
                const resData = await response.json();
                const newConversions: Conversion[] = resData.conversions || [];
                setHasMore(Boolean(resData.has_more));

                if (newConversions.length > 0) {
                    setConversations(prev => [...newConversions, ...prev]);

                    requestAnimationFrame(() => {
                        if (scrollContainer) {
                            const heightDifference = scrollContainer.scrollHeight - previousScrollHeight;
                            scrollContainer.scrollTop = previousScrollTop + heightDifference;
                        }
                    });
                }
            }
        } catch (err) {
            console.error('Failed to load more conversions:', err);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const downloadAttachment = (path: string, name: string) => {
        const link = document.createElement('a');
        link.href = `${imageUrlPrefix}/${path}`;
        link.download = name;
        link.click();
    };

    const { data, setData, processing, errors, reset } = useForm({
        reply_description: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('description', data.reply_description);

        if (selectedFiles && selectedFiles.length > 0) {
            for (let i = 0; i < selectedFiles.length; i++) {
                formData.append('attachments[]', selectedFiles[i]);
            }
        }

        // Get slug and encrypted ticket ID from URL
        const urlParts = window.location.pathname.split('/');
        const encryptedTicketId = urlParts[urlParts.length - 1];

        router.post(route('support-ticket.send-conversion.store', { slug: userSlug, ticketId: encryptedTicketId }),
            formData,
            {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    setSelectedFiles(null);
                    setImagePreviews([]);
                    setData('reply_description', '');
                    setEditorKey(prev => prev + 1); // Force remount RichTextEditor to clear content

                    // Clear file input
                    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                    if (fileInput) {
                        fileInput.value = '';
                    }

                    // Auto-scroll to bottom after sending reply
                    setTimeout(() => {
                        if (chatContainerRef.current) {
                            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                        }
                    }, 100);
                },
                onError: (errors) => {
                }
            });
    };

    const toggleToolbar = (tool: string) => {
        setActiveToolbar(prev =>
            prev.includes(tool)
                ? prev.filter(t => t !== tool)
                : [...prev, tool]
        );
    };

    const formatDate = (dateString: string) => {
        return formatDateTime(dateString);
    };

    const handleAuthSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsAuthenticating(true);
        setAuthError('');

        router.post(
            route('support-ticket.my-ticket.auth', [userSlug]),
            {
                ticket_id: displayTicketNumber,
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

    const getStatusColor = (status: string) => {
        const colors = {
            'open': 'bg-green-100 text-green-800',
            'Open': 'bg-green-100 text-green-800',
            'In Progress': 'bg-blue-100 text-blue-800',
            'closed': 'bg-red-100 text-red-800',
            'Closed': 'bg-red-100 text-red-800',
            'On Hold': 'bg-yellow-100 text-yellow-800'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    return (
        <Layout
            title={requiresPassword ? t('Access My Ticket') : `Ticket - ${ticket.ticket_id}`}
            settings={settings}
            brandSettings={brandSettings}
        >
            {/* Password Verification Modal Popup matching MyTicket design */}
            <Dialog
                open={isAuthModalOpen}
                onOpenChange={(open) => {
                    if (!open && requiresPassword) {
                        return;
                    }
                    setIsAuthModalOpen(open);
                }}
            >
                <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-transparent">
                    <div className="p-8 md:py-12 md:px-10 bg-primary text-primary-foreground rounded-2xl overflow-hidden relative shadow-xl">
                        <div className="flex flex-col-reverse md:flex-row items-center gap-6 md:gap-8">
                            <div className="w-full md:w-1/3 flex justify-center">
                                <img
                                    src={getImagePath('packages/automas/SupportTicket/src/Resources/assets/images/search-person.svg')}
                                    alt="Access ticket illustration"
                                    className="w-40 md:w-full h-auto drop-shadow-md"
                                />
                            </div>
                            <div className="w-full md:w-2/3 text-white">
                                <h2 className="lg:text-2xl md:text-xl text-lg font-bold mb-2.5">{t('My Ticket Portal')}</h2>
                                <p className="mb-6 text-white/90 text-xs md:text-sm leading-relaxed">
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
                                            value={displayTicketNumber}
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

            {/* If ticket requires password and is not authenticated yet, do NOT render conversation at all */}
            {requiresPassword ? (
                <div className="max-w-4xl mx-auto my-12">
                    <Card className="shadow-md border-0 bg-transparent">
                        <CardContent className="p-0">
                            <div className="p-6 md:p-10 bg-primary rounded-2xl overflow-hidden relative shadow-xl text-center text-white">
                                <div className="max-w-md mx-auto space-y-4">
                                    <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto border border-white/20">
                                        <Lock className="h-8 w-8 text-white" />
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-bold">{t('Ticket Protected')}</h2>
                                    <p className="text-white/80 text-sm">
                                        {t('Please enter your Ticket ID and Access Password to enter the ticket conversation.')}
                                    </p>
                                    <Button
                                        onClick={() => setIsAuthModalOpen(true)}
                                        className="bg-white text-primary hover:bg-gray-100 font-bold px-6 py-2.5 shadow-md cursor-pointer text-sm"
                                    >
                                        <KeyRound className="h-4 w-4 mr-2" />
                                        {t('Enter Password')}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <>
                    {/* Ticket ID Header */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg">
                            <div className="flex items-center space-x-2">
                                <Ticket className="h-5 w-5" />
                                <span className="font-semibold">{t('Ticket')} - {ticket.ticket_id}</span>
                            </div>
                        </div>
                    </div>

                    {/* Ticket Info and Conversation */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Conversation */}
                        <div className="lg:col-span-2">
                            {/* Ticket Subject */}
                            <Card className="shadow-md mb-6">
                                <CardContent className="p-4 md:p-6">
                                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-y-2">
                                        <h2 className="md:text-2xl text-xl font-bold text-gray-800">{ticket.subject}</h2>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500 block">{t('Created')} :</span>
                                            <span className="font-medium">{formatDateTime(ticket.created_at)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">{t('Customer')}:</span>
                                            <span className="font-medium">{ticket.name}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">{t('Email')}:</span>
                                            <span className="font-medium">{ticket.email}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Chat Box Container */}
                            <Card className="shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden mb-6">
                                <CardHeader className="py-3 px-5 border-b border-gray-200/80 dark:border-gray-800 bg-white dark:bg-slate-900/60">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                                <MessageSquare className="h-4 w-4" />
                                            </div>
                                            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {t('Conversation')}
                                            </CardTitle>
                                            <span className="text-xs font-normal text-muted-foreground">
                                                ({1 + (conversations?.length || 0)} {t('messages')})
                                            </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {ticket.created_at ? formatDateTime(ticket.created_at) : ''}
                                        </span>
                                    </div>
                                </CardHeader>

                                {/* Fixed Height Scrollable Chat Area */}
                                <div
                                    ref={chatContainerRef}
                                    className="p-4 sm:p-5 h-[450px] overflow-y-auto overflow-x-hidden space-y-4 bg-slate-50/50 dark:bg-slate-950/40 relative"
                                >
                                    {/* Load More Button when scrolled top / has more older messages */}
                                    {hasMore && (
                                        <div className="flex justify-center pb-2 pt-1 sticky top-0 z-20 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xs">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleLoadMore}
                                                disabled={isLoadingMore}
                                                className="text-xs h-7 gap-1.5 px-3 rounded-full bg-white dark:bg-slate-900 shadow-2xs border-gray-200 dark:border-gray-700 hover:border-primary text-gray-700 dark:text-gray-200"
                                            >
                                                {isLoadingMore ? (
                                                    <>
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                                        <span>{t('Loading older messages...')}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronUp className="h-3.5 w-3.5 text-primary" />
                                                        <span>{t('Load More Messages')}</span>
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}

                                    {/* Initial Customer Request Message */}
                                    <div className="flex items-start gap-3 justify-start max-w-[85%] sm:max-w-[78%]">
                                        <Avatar className="h-9 w-9 shrink-0 ring-2 ring-blue-500/20 shadow-xs">
                                            <AvatarFallback className="bg-blue-600 text-white font-semibold text-xs">
                                                {ticket.name ? ticket.name.charAt(0).toUpperCase() : 'C'}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex flex-col items-start min-w-0">
                                            <div className="flex items-center gap-2 mb-1 px-1">
                                                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{ticket.name}</span>
                                                <span className="text-[11px] text-gray-400 font-mono">
                                                    {ticket.created_at ? formatDateTime(ticket.created_at) : ''}
                                                </span>
                                            </div>

                                            <div className="bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs border border-gray-200/80 dark:border-gray-800 text-sm leading-relaxed break-words w-full">
                                                <div
                                                    className="prose dark:prose-invert max-w-none text-sm text-gray-800 dark:text-gray-200 leading-relaxed"
                                                    dangerouslySetInnerHTML={{ __html: ticket.description || 'No description provided.' }}
                                                />

                                                {ticket.attachments && ticket.attachments.length > 0 && (
                                                    <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800/80 space-y-1.5">
                                                        <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                                                            <Paperclip className="h-3 w-3 text-blue-500" />
                                                            {t('Attachments')} ({ticket.attachments.length})
                                                        </span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {ticket.attachments.map((file, idx) => (
                                                                <Button
                                                                    key={idx}
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => downloadAttachment(file.path, file.name)}
                                                                    className="h-7 text-xs gap-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 px-2.5 py-0 rounded-lg border-gray-200 dark:border-gray-700"
                                                                >
                                                                    <Paperclip className="h-3 w-3 text-blue-600" />
                                                                    <span className="truncate max-w-[140px] text-xs font-normal">{file.name}</span>
                                                                    <Download className="h-3 w-3 text-gray-400 ml-0.5" />
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Conversion History Bubbles */}
                                    {conversations && conversations.map((conv) => {
                                        const isAdmin = conv.sender === 'admin';
                                        return (
                                            <div
                                                key={conv.id}
                                                className={`flex items-start gap-3 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {!isAdmin && (
                                                    <Avatar className="h-9 w-9 shrink-0 ring-2 ring-blue-500/20 shadow-xs">
                                                        <AvatarFallback className="bg-blue-600 text-white font-semibold text-xs">
                                                            {ticket.name ? ticket.name.charAt(0).toUpperCase() : 'C'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                )}

                                                <div className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[78%] min-w-0`}>
                                                    <div className="flex items-center gap-2 mb-1 px-1">
                                                        {isAdmin && (
                                                            <span className="text-[11px] text-gray-400 font-mono">
                                                                {conv.created_at ? formatDateTime(conv.created_at) : ''}
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                                                            {isAdmin ? (conv.replyBy?.name || t('Admin')) : ticket.name}
                                                        </span>
                                                        {!isAdmin && (
                                                            <span className="text-[11px] text-gray-400 font-mono">
                                                                {conv.created_at ? formatDateTime(conv.created_at) : ''}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div
                                                        className={`rounded-2xl px-4 py-3 shadow-xs text-sm leading-relaxed break-words w-full ${isAdmin
                                                                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 border border-emerald-200/80 dark:border-emerald-800/60 rounded-tr-sm'
                                                                : 'bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-800 rounded-tl-sm'
                                                            }`}
                                                    >
                                                        <div
                                                            className="prose dark:prose-invert max-w-none text-sm text-gray-800 dark:text-gray-200 leading-relaxed"
                                                            dangerouslySetInnerHTML={{ __html: conv.description || '' }}
                                                        />

                                                        {conv.attachments && conv.attachments.length > 0 && (
                                                            <div className={`mt-3 pt-2.5 border-t space-y-1.5 ${isAdmin ? 'border-emerald-200/60 dark:border-emerald-800/40' : 'border-gray-100 dark:border-gray-800/80'
                                                                }`}>
                                                                <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                                                                    <Paperclip className={`h-3 w-3 ${isAdmin ? 'text-emerald-600' : 'text-blue-500'}`} />
                                                                    {t('Attachments')} ({conv.attachments.length})
                                                                </span>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {conv.attachments.map((file, fIdx) => (
                                                                        <Button
                                                                            key={fIdx}
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => downloadAttachment(file.path, file.name)}
                                                                            className="h-7 text-xs gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-0 rounded-lg border-gray-200 dark:border-gray-700 hover:border-primary"
                                                                        >
                                                                            <Paperclip className={`h-3 w-3 ${isAdmin ? 'text-emerald-600' : 'text-blue-600'}`} />
                                                                            <span className="truncate max-w-[140px] text-xs font-normal">{file.name}</span>
                                                                            <Download className="h-3 w-3 text-gray-400 ml-0.5" />
                                                                        </Button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {isAdmin && (
                                                    <Avatar className="h-9 w-9 shrink-0 ring-2 ring-emerald-500/20 shadow-xs">
                                                        <AvatarFallback className="bg-emerald-600 text-white font-semibold text-xs">
                                                            {conv.replyBy?.name ? conv.replyBy.name.charAt(0).toUpperCase() : 'A'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>

                            {/* Reply Form */}
                            {ticket.status !== 'Closed' ? (
                                <Card className="shadow-md overflow-hidden">


                                    <CardContent className="p-4">
                                        <form onSubmit={handleSubmit}>
                                            <RichTextEditor
                                                key={editorKey}
                                                content={data.reply_description}
                                                onChange={(value) => setData('reply_description', value)}
                                                placeholder="Write your reply here..."
                                                className="mb-4"
                                            />

                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    {t('Attachments')}
                                                </label>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        setSelectedFiles(e.target.files);
                                                        if (e.target.files) {
                                                            const previews: string[] = [];
                                                            for (let i = 0; i < e.target.files.length; i++) {
                                                                const file = e.target.files[i];
                                                                const reader = new FileReader();
                                                                reader.onload = (event) => {
                                                                    previews.push(event.target?.result as string);
                                                                    if (previews.length === e.target.files!.length) {
                                                                        setImagePreviews(previews);
                                                                    }
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        } else {
                                                            setImagePreviews([]);
                                                        }
                                                    }}
                                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                                />
                                                {imagePreviews.length > 0 && (
                                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                                        {imagePreviews.map((preview, index) => (
                                                            <img
                                                                key={index}
                                                                src={preview}
                                                                alt={`Preview ${index + 1}`}
                                                                className="w-full h-20 object-cover rounded border"
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-end">
                                                <Button
                                                    type="submit"
                                                    disabled={processing || !data.reply_description.trim()}
                                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                                >
                                                    <Send className="h-4 w-4 mr-2" />
                                                    {processing ? t('Sending...') : t('Send Reply')}
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card>
                                    <CardContent className="p-4 text-center text-gray-600">
                                        {t('Ticket is closed and cannot receive replies.')}
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Ticket Sidebar */}
                        <div className="space-y-6">
                            <Card className="shadow-md overflow-hidden">
                                <div className="bg-primary text-primary-foreground py-3 px-4">
                                    <h3 className="font-medium flex items-center">
                                        <Ticket className="h-4 w-4 mr-2" />
                                        {t('Ticket Information')}
                                    </h3>
                                </div>
                                <CardContent className="p-4 space-y-4">
                                    {[
                                        { label: t('Status'), value: ticket.status },
                                        { label: t('Ticket ID'), value: `#${ticket.ticket_id}` },
                                        { label: t('Created'), value: formatDateTime(ticket.created_at) },
                                        { label: t('Customer'), value: ticket.name },
                                        { label: t('Email'), value: ticket.email }
                                    ].map((item, index) => (
                                        <div key={index} className="flex justify-between text-sm">
                                            <span className="text-gray-500">{item.label}:</span>
                                            <span className="font-medium text-gray-900">{item.value}</span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </>
            )}
        </Layout>
    );
}
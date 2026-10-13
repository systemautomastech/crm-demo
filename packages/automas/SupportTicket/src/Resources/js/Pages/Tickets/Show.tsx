import React, { useState, useEffect, useRef } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Paperclip, ArrowLeft, Edit, User, Mail, Calendar, Tag, History, MessageSquare, StickyNote, UserCheck, Users, Clock, CheckCircle2, ChevronUp, Loader2, KeyRound } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDateTime } from '@/utils/helpers';

interface Attachment {
  name: string;
  path: string;
}

interface Conversion {
  id: number;
  ticket_id: number;
  description: string;
  sender: string;
  attachments: Attachment[];
  created_at: string;
  replyBy: { name: string; role?: string };
}

interface CategoryInfo {
  id: number;
  name: string;
  color: string;
}

interface TicketDetail {
  id: number;
  ticket_id: string;
  name: string;
  email: string;
  user_id?: number;
  account_type: string;
  category?: number;
  subject: string;
  status: string;
  description: string;
  note?: string;
  attachments: Attachment[];
  assigned_to_name?: string;
  team_name?: string;
  category_info?: CategoryInfo;
  can_edit?: boolean;
  conversions: Conversion[];
  has_more_conversions?: boolean;
  total_conversions?: number;
  created_at: string;
  updated_at: string;
  formatted_created_at?: string;
  picked_at?: string;
  formatted_picked_at?: string;
  closed_at?: string;
  formatted_closed_at?: string;
}

interface ShowProps {
  ticket: TicketDetail;
}

export default function Show({ ticket }: ShowProps) {
  const { t } = useTranslation();
  const pageProps = usePage().props;
  const { imageUrlPrefix, auth } = pageProps as any;

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

    try {
      const response = await fetch(route('support-tickets.conversions.load', {
        id: ticket.id,
        before_id: oldestId
      }), {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const newConversions: Conversion[] = data.conversions || [];
        setHasMore(Boolean(data.has_more));

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

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'open') {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
    }
    if (s === 'in progress') {
      return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/60';
    }
    if (s === 'closed' || s === 'resolved') {
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/60';
    }
    if (s === 'on hold') {
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';
    }
    return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  };

  const downloadAttachment = (path: string, name: string) => {
    const link = document.createElement('a');
    link.href = `${imageUrlPrefix}/${path}`;
    link.download = name;
    link.click();
  };

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { label: t('Support Tickets'), url: route('support-tickets.index') },
        { label: `#${ticket.ticket_id}`, url: route('support-tickets.show', ticket.id) },
        { label: t('History') }
      ]}
      pageTitle={`${t('Ticket History')} - #${ticket.ticket_id}`}
    >
      <Head title={`${t('Ticket History')} - #${ticket.ticket_id}`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Balanced Top Header Card */}
        <Card className="shadow-xs border border-gray-200 dark:border-gray-800 overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-5">
            {/* Action & Title Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex items-center flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.get(route('support-tickets.index'))}
                    className="gap-1.5 h-7 text-xs font-medium mr-1.5 shadow-2xs hover:bg-muted"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>{t('Back')}</span>
                  </Button>

                  <Badge variant="secondary" className="font-mono text-xs px-2.5 py-0.5 font-semibold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                    #{ticket.ticket_id}
                  </Badge>

                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status)}`}>
                    {t(ticket.status)}
                  </span>

                  {ticket.category_info?.name && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/80 px-2.5 py-0.5 rounded-md font-medium border border-gray-200 dark:border-gray-700">
                      <Tag className="h-3 w-3 text-primary" />
                      {ticket.category_info.name}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {ticket.subject}
                </h1>
              </div>

              {auth?.user?.permissions?.includes('edit-support-tickets') && ticket.can_edit && (
                <Button
                  size="sm"
                  onClick={() => router.get(route('support-tickets.edit', ticket.id))}
                  className="gap-2 shrink-0 self-start sm:self-center shadow-xs font-medium"
                >
                  <Edit className="h-4 w-4" />
                  <span>{t('Edit & Reply')}</span>
                </Button>
              )}
            </div>

            <Separator />

            {/* Horizontal Balanced Timestamps & Requester Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 border border-primary/20">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[11px] font-medium">{t('Requester')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white truncate block">{ticket.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 shrink-0 border border-gray-200 dark:border-gray-700">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[11px] font-medium">{t('Created At')}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate block font-mono text-[11px]">
                    {ticket.created_at ? formatDateTime(ticket.created_at, pageProps) : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0 border border-blue-200/60 dark:border-blue-900/60">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[11px] font-medium">{t('Picked At')}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate block font-mono text-[11px]">
                    {ticket.picked_at ? formatDateTime(ticket.picked_at, pageProps) : t('Not Picked Yet')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shrink-0 border border-rose-200/60 dark:border-rose-900/60">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-[11px] font-medium">{t('Closed At')}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate block font-mono text-[11px]">
                    {ticket.closed_at ? formatDateTime(ticket.closed_at, pageProps) : t('Not Closed')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Initial Description & Conversion Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dedicated Scrollable Chat Box Container */}
            <Card className="border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-gray-100 dark:border-gray-800 py-3.5 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    {t('Conversation')}
                    <Badge variant="secondary" className="ml-1 text-xs font-normal">
                      {(ticket.conversions?.length || 0) + 1} {t('messages')}
                    </Badge>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {ticket.created_at ? formatDateTime(ticket.created_at, pageProps) : ''}
                  </span>
                </div>
              </CardHeader>

              {/* Fixed Height Scrollable Chat Message Area */}
              <div
                ref={chatContainerRef}
                className="p-4 sm:p-5 h-[450px] overflow-y-auto overflow-x-hidden space-y-4 bg-slate-50/40 dark:bg-slate-950/40 relative"
              >
                {/* Load More Button when scrolled top / has more previous messages */}
                {hasMore && (
                  <div className="flex justify-center pb-2 pt-1 sticky top-0 z-20 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xs">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="text-xs h-7 gap-1.5 px-3 rounded-full bg-white dark:bg-slate-900 shadow-2xs border-gray-200 dark:border-gray-700 hover:border-primary/50 text-gray-700 dark:text-gray-200"
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

                {/* Initial Request (First Message) */}
                <div className="flex items-start gap-3 justify-start max-w-[85%] sm:max-w-[78%]">
                  <Avatar className="h-9 w-9 shrink-0 ring-2 ring-blue-500/20 shadow-xs">
                    <AvatarFallback className="bg-blue-600 text-white font-semibold text-xs">
                      {ticket.name ? ticket.name.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col items-start min-w-0">
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{ticket.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40">
                        {t('Customer')}
                      </Badge>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {ticket.created_at ? formatDateTime(ticket.created_at, pageProps) : ''}
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
                              {conv.created_at ? formatDateTime(conv.created_at, pageProps) : ''}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                            {isAdmin ? (conv.replyBy?.name || t('Admin')) : ticket.name}
                          </span>
                          <Badge
                            variant={isAdmin ? 'default' : 'outline'}
                            className={`text-[10px] px-1.5 py-0 h-4 font-normal capitalize ${
                              isAdmin
                                ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                                : 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40'
                            }`}
                          >
                            {isAdmin ? (conv.replyBy?.role ? t(conv.replyBy.role) : t('Staff')) : t('Customer')}
                          </Badge>
                          {!isAdmin && (
                            <span className="text-[11px] text-gray-400 font-mono">
                              {conv.created_at ? formatDateTime(conv.created_at, pageProps) : ''}
                            </span>
                          )}
                        </div>

                        <div
                          className={`rounded-2xl px-4 py-3 shadow-xs text-sm leading-relaxed break-words w-full ${
                            isAdmin
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 border border-emerald-200/80 dark:border-emerald-800/60 rounded-tr-sm'
                              : 'bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-800 rounded-tl-sm'
                          }`}
                        >
                          <div
                            className="prose dark:prose-invert max-w-none text-sm text-gray-800 dark:text-gray-200 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: conv.description || '' }}
                          />

                          {conv.attachments && conv.attachments.length > 0 && (
                            <div className={`mt-3 pt-2.5 border-t space-y-1.5 ${
                              isAdmin ? 'border-emerald-200/60 dark:border-emerald-800/40' : 'border-gray-100 dark:border-gray-800/80'
                            }`}>
                              <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                                <Paperclip className={`h-3 w-3 ${isAdmin ? 'text-emerald-600' : 'text-blue-500'}`} />
                                {t('Attachments')} ({conv.attachments.length})
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {conv.attachments.map((file, fIdx) => (
                                  <Button
                                    key={fIdx}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadAttachment(file.path, file.name)}
                                    className="h-7 text-xs gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-0 rounded-lg border-gray-200 dark:border-gray-700 hover:border-primary/50"
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

            {/* Internal Note */}
            {ticket.note && (
              <Card className="shadow-sm border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
                <CardHeader className="pb-2 border-b border-amber-200/60 dark:border-amber-900/50">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <StickyNote className="h-4 w-4 text-amber-600" />
                    {t('Internal Note')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4.5 text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap leading-relaxed">
                  {ticket.note}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar Metadata */}
          <div className="space-y-6">
            {/* Requester Details */}
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader className="bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800 pb-3.5">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <User className="h-4 w-4 text-primary" />
                  {t('Requester Information')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block font-medium mb-0.5">{t('Name')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{ticket.name}</span>
                </div>
                <Separator />
                <div>
                  <span className="text-xs text-muted-foreground block font-medium mb-0.5">{t('Email')}</span>
                  <span className="font-mono text-xs text-gray-800 dark:text-gray-200 break-all">{ticket.email || '-'}</span>
                </div>
                <Separator />
                <div>
                  <span className="text-xs text-muted-foreground block font-medium mb-0.5">{t('Phone Number')}</span>
                  <span className="font-mono text-xs text-gray-800 dark:text-gray-200 break-all">{ticket.phone_number || '-'}</span>
                </div>
                <Separator />
                <div>
                  <span className="text-xs text-muted-foreground block font-medium mb-0.5">{t('Account Type')}</span>
                  <Badge variant="outline" className="capitalize text-xs font-medium mt-0.5">
                    {ticket.account_type || 'Custom'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Ticket Assignment & Status Details */}
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader className="bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800 pb-3.5">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Tag className="h-4 w-4 text-primary" />
                  {t('Ticket Details')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block font-medium mb-0.5">{t('Category')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {ticket.category_info?.name || t('No Category')}
                  </span>
                </div>
                <Separator />
                <div>
                  <span className="text-xs text-muted-foreground block font-medium mb-0.5">{t('Assigned Agent')}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {ticket.assigned_to_name || t('Unassigned')}
                    </span>
                  </div>
                </div>
                <Separator />
                <div>
                  <span className="text-xs text-muted-foreground block font-medium mb-0.5">{t('Assigned Team')}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {ticket.team_name || t('No Team')}
                    </span>
                  </div>
                </div>
                <Separator />
                <div>
                  <span className="text-xs text-muted-foreground block font-medium mb-0.5">{t('Last Updated')}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200 font-mono text-xs">
                    {ticket.updated_at ? formatDateTime(ticket.updated_at, pageProps) : ''}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

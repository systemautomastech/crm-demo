import { useState, useEffect, useRef } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import MediaPicker from '@/components/MediaPicker';
import { Edit, Send, Download, Paperclip, ChevronDown, ChevronUp, User, Calendar, Tag, AlertCircle, MessageSquare, StickyNote, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate, formatDateTime } from '@/utils/helpers';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Attachment {
  name: string;
  path: string;
}

interface Conversion {
  id: number;
  description: string;
  sender: string;
  created_at: string;
  attachments: Attachment[];
  replyBy: { name: string; role?: string };
}

interface Category {
  id: number;
  name: string;
  color: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface SupportTeam {
  id: number;
  name: string;
  users_count?: number;
}

interface TicketData {
  id: number;
  ticket_id: string;
  name: string;
  email: string;
  user_id?: number;
  account_type: string;
  category: number;
  subject: string;
  status: string;
  assigned_to?: number | string | null;
  team_id?: number | string | null;
  assigned_to_name?: string;
  team_name?: string;
  description: string;
  note?: string;
  attachments: Attachment[];
  fields?: Record<string, any>;
  category_info?: Category;
  conversions: Conversion[];
  has_more_conversions?: boolean;
  total_conversions?: number;
  created_at: string;
  updated_at: string;
}

interface Field {
  id: number;
  name: string;
  type: string;
  placeholder: string;
  width: string;
  is_required: boolean;
  custom_id: string;
}

interface EditReplyProps {
  ticket: TicketData;
  categories: Category[];
  staff: User[];
  clients: User[];
  vendors: User[];
  allFields: Field[];
  customFields: Field[];
  supportUsers?: User[];
  supportTeams?: SupportTeam[];
}

export default function EditReply({ 
  ticket, 
  categories, 
  staff, 
  clients, 
  vendors, 
  allFields, 
  customFields,
  supportUsers = [],
  supportTeams = []
}: EditReplyProps) {
  const { t } = useTranslation();
  const pageProps = usePage().props;
  const { imageUrlPrefix } = pageProps as any;
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [conversations, setConversations] = useState<Conversion[]>(ticket.conversions || []);
  const [hasMore, setHasMore] = useState<boolean>(Boolean(ticket.has_more_conversions));
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [showScrollTopBtn, setShowScrollTopBtn] = useState<boolean>(false);
  const [replyEditorKey, setReplyEditorKey] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isInitialScrollDone = useRef<boolean>(false);

  useEffect(() => {
    if (ticket.conversions) {
      setConversations(ticket.conversions);
      setHasMore(Boolean(ticket.has_more_conversions));
    }
  }, [ticket.conversions, ticket.has_more_conversions]);

  // Auto-scroll to bottom only on initial load or when new reply is added
  useEffect(() => {
    if (!isInitialScrollDone.current && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      isInitialScrollDone.current = true;
    }
  }, [conversations]);

  // Handle scroll to detect when near top and show load more button
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop } = chatContainerRef.current;
    setShowScrollTopBtn(scrollTop < 80);
  };

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

          // Preserve user scroll position after prepending older messages
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

  useFlashMessages();

  const initialTab: 'user' | 'group' = ticket.assigned_to ? 'user' : (ticket.team_id ? 'group' : 'user');
  const [assignmentTab, setAssignmentTab] = useState<'user' | 'group'>(initialTab);

  const { data: editData, setData: setEditData, put, processing: editProcessing, errors: editErrors } = useForm({
    name: ticket.name,
    email: ticket.email,
    user_id: ticket.user_id ? ticket.user_id.toString() : '',
    account_type: ticket.account_type,
    category: ticket.category?.toString() || '',
    subject: ticket.subject,
    status: ticket.status,
    assigned_to: ticket.assigned_to ? String(ticket.assigned_to) : '',
    team_id: ticket.team_id ? String(ticket.team_id) : '',
    description: ticket.description,
    fields: ticket.fields || {} as Record<string, any>
  });

  const { data: replyData, setData: setReplyData, post, processing: replyProcessing, errors: replyErrors, reset } = useForm({
    description: '',
    attachments: [] as string[],
  });

  const { data: noteData, setData: setNoteData, post: postNote, processing: noteProcessing, errors: noteErrors } = useForm({
    note: ticket.note || '',
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    put(route('support-tickets.update', ticket.id), {
      onSuccess: () => {
        setIsEditOpen(false);
      }
    });
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    post(route('support-tickets.admin-send-conversion.store', ticket.id), {
      preserveScroll: true,
      onSuccess: () => {
        // Add new conversation to state immediately
        const authUser = (pageProps as any)?.auth?.user;
        const newConversation = {
          id: Date.now(),
          description: replyData.description,
          sender: 'admin',
          created_at: new Date().toISOString(),
          attachments: replyData.attachments.map(path => {
            const fileName = path.split('/').pop() || 'file';
            const media = path.includes('media/') ? fileName : fileName;
            return {
              name: fileName.replace(/^\d+_/, ''), // Remove timestamp prefix
              path: media
            };
          }),
          replyBy: { name: authUser?.name || 'Admin' }
        };
        setConversations(prev => [...prev, newConversation]);
        
        // Clear form completely
        reset();
        setReplyData({
          description: '',
          attachments: []
        });
        setReplyEditorKey(prev => prev + 1); // Force remount RichTextEditor to clear content
      }
    });
  };

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    postNote(route('support-tickets.note.store', ticket.id));
  };

  const handleAccountTypeChange = (value: string) => {
    setEditData('account_type', value);
    setEditData('user_id', '');
  };

  const handleUserChange = (value: string) => {
    setEditData('user_id', value);
    
    // Find user and update name/email
    let user = null;
    if (editData.account_type === 'staff') {
      user = staff.find(u => u.id.toString() === value);
    } else if (editData.account_type === 'client') {
      user = clients.find(u => u.id.toString() === value);
    } else if (editData.account_type === 'vendor') {
      user = vendors.find(u => u.id.toString() === value);
    }
    
    if (user) {
      setEditData('name', user.name);
      setEditData('email', user.email);
    }
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
    <AuthenticatedLayout
      breadcrumbs={[
        { label: t('Support Tickets'), url: route('support-ticket.dashboard') },
        { label: t('Ticket'), url: route('support-tickets.index') },
        { label: `#${ticket.ticket_id}` }
      ]}
      pageTitle={`${t('Ticket')} - ${ticket.ticket_id}`}
    >
      <Head title={`${t('Edit Ticket')} - ${ticket.ticket_id}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{ticket.ticket_id}
                    </Badge>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {ticket.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(ticket.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      {ticket.category_info?.name || 'No Category'}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(!isEditOpen)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {t('Edit')}
                  {isEditOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Edit Form */}
          {isEditOpen && (
            <Card className="border-orange-200 bg-orange-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <Edit className="h-5 w-5" />
                  {t('Edit Ticket Information')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>{t('Account Type')}</Label>
                      <div className="flex gap-4 mt-2">
                        {['custom', 'staff', 'client', 'vendor'].map((type) => (
                          <label key={type} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="account_type"
                              value={type}
                              checked={editData.account_type === type}
                              onChange={(e) => handleAccountTypeChange(e.target.value)}
                            />
                            {t(type.charAt(0).toUpperCase() + type.slice(1))}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* All Fields ordered by 'order' field */}
                  <div className="grid grid-cols-12 gap-4">
                    {allFields && allFields.length > 0 ? allFields.sort((a, b) => a.order - b.order).map((field) => {
                        const colSpan = field.width === '12' ? 'col-span-12' : 
                                field.width === '6' ? 'col-span-6' : 
                                field.width === '4' ? 'col-span-4' : 
                                field.width === '3' ? 'col-span-3' : 'col-span-12';
                      if (field.custom_id == 1) { // Name field
                        return editData.account_type === 'custom' ? (
                          <div key={field.id} className={colSpan}>
                            <Label htmlFor="name" required={field.is_required}>{t(field.name)}</Label>
                            <Input
                              id="name"
                              value={editData.name}
                              onChange={(e) => setEditData('name', e.target.value)}
                              error={editErrors.name}
                            />
                          </div>
                        ) : (
                          <div key={field.id} className={colSpan}>
                            <Label required>{t('Select User')}</Label>
                            <Select value={editData.user_id} onValueChange={handleUserChange}>
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${editData.account_type}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {(editData.account_type === 'staff' ? staff :
                                  editData.account_type === 'client' ? clients : vendors
                                ).map((user) => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }
                      
                      if (field.custom_id == 2) { // Email field
                        return (
                          <div key={field.id} className={colSpan}>
                            <Label htmlFor="email" required={field.is_required}>{t(field.name)}</Label>
                            <Input
                              id="email"
                              type="email"
                              value={editData.email}
                              onChange={(e) => setEditData('email', e.target.value)}
                              error={editErrors.email}
                            />
                          </div>
                        );
                      }
                      
                      if (field.custom_id == 3) { // Category field
                        return (
                          <div key={field.id} className={colSpan}>
                            <Label required={field.is_required}>{t(field.name)}</Label>
                            <Select value={editData.category} onValueChange={(value) => setEditData('category', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder={t(field.placeholder)} />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }
                      
                      if (field.custom_id == 4) { // Subject field
                        return [
                          <div key={`subject-${field.id}`} className={colSpan}>
                            <Label htmlFor="subject" required={field.is_required}>{t(field.name)}</Label>
                            <Input
                              id="subject"
                              value={editData.subject}
                              onChange={(e) => setEditData('subject', e.target.value)}
                              error={editErrors.subject}
                            />
                          </div>,
                          <div key={`status-${field.id}`} className={colSpan}>
                            <Label required>{t('Status')}</Label>
                            <Select value={editData.status} onValueChange={(value) => setEditData('status', value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">{t('Open')}</SelectItem>
                                <SelectItem value="In Progress">{t('In Progress')}</SelectItem>
                                <SelectItem value="On Hold">{t('On Hold')}</SelectItem>
                                <SelectItem value="Closed">{t('Closed')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>,
                          <div key={`assignment-${field.id}`} className="col-span-12 rounded-lg border border-orange-200 bg-white/70 p-4">
                            <Label className="text-sm font-semibold mb-2 block text-gray-800">{t('Assignment')}</Label>
                            <Tabs 
                              value={assignmentTab} 
                              onValueChange={(val: string) => {
                                const newTab = val as 'user' | 'group';
                                setAssignmentTab(newTab);
                                if (newTab === 'user') {
                                  setEditData('team_id', '');
                                } else {
                                  setEditData('assigned_to', '');
                                }
                              }}
                              className="w-full"
                            >
                              <TabsList className="grid w-full max-w-xs grid-cols-2 mb-3">
                                <TabsTrigger value="user">{t('User Assign')}</TabsTrigger>
                                <TabsTrigger value="group">{t('Group Assign')}</TabsTrigger>
                              </TabsList>
                              <TabsContent value="user" className="mt-0">
                                <div className="space-y-1 max-w-md">
                                  <Label htmlFor="edit_assigned_to" className="text-xs text-muted-foreground">{t('Select User')}</Label>
                                  <Select 
                                    value={editData.assigned_to} 
                                    onValueChange={(val) => {
                                      setEditData('assigned_to', val === 'none' ? '' : val);
                                    }}
                                  >
                                    <SelectTrigger id="edit_assigned_to" className={editErrors.assigned_to ? 'border-red-500' : ''}>
                                      <SelectValue placeholder={t('Select user to assign')} />
                                    </SelectTrigger>
                                    <SelectContent searchable searchPlaceholder={t('Search user...')}>
                                      <SelectItem value="none">{t('Unassigned')}</SelectItem>
                                      {supportUsers.map((user) => (
                                        <SelectItem key={user.id} value={String(user.id)}>
                                          {user.name} ({user.email})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {editErrors.assigned_to && <p className="text-red-500 text-xs mt-1">{editErrors.assigned_to}</p>}
                                </div>
                              </TabsContent>
                              <TabsContent value="group" className="mt-0">
                                <div className="space-y-1 max-w-md">
                                  <Label htmlFor="edit_team_id" className="text-xs text-muted-foreground">{t('Select Team / User Group')}</Label>
                                  <Select 
                                    value={editData.team_id} 
                                    onValueChange={(val) => {
                                      setEditData('team_id', val === 'none' ? '' : val);
                                    }}
                                  >
                                    <SelectTrigger id="edit_team_id" className={editErrors.team_id ? 'border-red-500' : ''}>
                                      <SelectValue placeholder={t('Select user group to assign')} />
                                    </SelectTrigger>
                                    <SelectContent searchable searchPlaceholder={t('Search team group...')}>
                                      <SelectItem value="none">{t('Unassigned')}</SelectItem>
                                      {supportTeams.map((team) => (
                                        <SelectItem key={team.id} value={String(team.id)}>
                                          {team.name} {typeof team.users_count === 'number' ? `(${team.users_count} members)` : ''}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {editErrors.team_id && <p className="text-red-500 text-xs mt-1">{editErrors.team_id}</p>}
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        ];
                      }
                      
                      if (field.custom_id == 5) { // Description field
                        return (
                          <div key={field.id} className={colSpan}>
                            <Label htmlFor="description" required={field.is_required}>{t(field.name)}</Label>
                            <RichTextEditor
                              content={editData.description}
                              onChange={(value) => setEditData('description', value)}
                            />
                          </div>
                        );
                      }
                      
                      // Handle custom fields (custom_id > 6)
                      if (field.custom_id > 6) {
                        if (field.type === 'text') {
                          return (
                            <div key={field.id} className={colSpan}>
                              <Label htmlFor={`field-${field.id}`} required={field.is_required}>{t(field.name)}</Label>
                              <Input
                                id={`field-${field.id}`}
                                value={editData.fields[field.id] || ''}
                                onChange={(e) => setEditData('fields', {...editData.fields, [field.id]: e.target.value})}
                                placeholder={t(field.placeholder)}
                                required={field.is_required}
                              />
                            </div>
                          );
                        }
                        
                        if (field.type === 'email') {
                          return (
                            <div key={field.id} className={colSpan}>
                              <Label htmlFor={`field-${field.id}`} required={field.is_required}>{t(field.name)}</Label>
                              <Input
                                id={`field-${field.id}`}
                                type="email"
                                value={editData.fields[field.id] || ''}
                                onChange={(e) => setEditData('fields', {...editData.fields, [field.id]: e.target.value})}
                                placeholder={t(field.placeholder)}
                                required={field.is_required}
                              />
                            </div>
                          );
                        }
                        
                        if (field.type === 'number') {
                          return (
                            <div key={field.id} className={colSpan}>
                              <Label htmlFor={`field-${field.id}`} required={field.is_required}>{t(field.name)}</Label>
                              <Input
                                id={`field-${field.id}`}
                                type="number"
                                value={editData.fields[field.id] || ''}
                                onChange={(e) => setEditData('fields', {...editData.fields, [field.id]: e.target.value})}
                                placeholder={t(field.placeholder)}
                                required={field.is_required}
                              />
                            </div>
                          );
                        }
                        
                        if (field.type === 'date') {
                          return (
                            <div key={field.id} className={colSpan}>
                              <Label htmlFor={`field-${field.id}`} required={field.is_required}>{t(field.name)}</Label>
                              <DatePicker
                                value={editData.fields[field.id] || ''}
                                onChange={(value) => setEditData('fields', {...editData.fields, [field.id]: value})}
                                placeholder={t(field.placeholder)}
                              />
                            </div>
                          );
                        }
                        
                        if (field.type === 'textarea') {
                          return (
                            <div key={field.id} className={colSpan}>
                              <Label htmlFor={`field-${field.id}`} required={field.is_required}>{t(field.name)}</Label>
                              <RichTextEditor
                                content={editData.fields[field.id] || ''}
                                onChange={(value) => setEditData('fields', {...editData.fields, [field.id]: value})}
                                placeholder={t(field.placeholder)}
                              />
                            </div>
                          );
                        }
                      }
                      
                      return null;
                    }) : null}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                      {t('Cancel')}
                    </Button>
                    <Button type="submit" disabled={editProcessing}>
                      {editProcessing ? t('Updating...') : t('Update Ticket')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Dedicated Scrollable Chat Box Container */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-gray-100 dark:border-gray-800 py-3.5 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  {t('Conversation')}
                  <Badge variant="secondary" className="ml-1 text-xs font-normal">
                    {(conversations?.length || 0) + 1} {t('messages')}
                  </Badge>
                </CardTitle>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(ticket.created_at)}
                </span>
              </div>
            </CardHeader>

            {/* Fixed Height Scrollable Chat Message Area */}
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
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

              {/* Original / Initial Ticket Request (First Message) */}
              <div className="flex items-start gap-3 justify-start max-w-[85%] sm:max-w-[78%]">
                <Avatar className="h-9 w-9 shrink-0 ring-2 ring-blue-500/20 shadow-xs">
                  <AvatarFallback className="bg-blue-600 text-white font-semibold text-xs">
                    {ticket.name ? ticket.name.charAt(0).toUpperCase() : 'C'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col items-start min-w-0">
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{ticket.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40">
                      {t('Customer')}
                    </Badge>
                    <span className="text-[11px] text-gray-400 font-mono">
                      {formatDateTime(ticket.created_at, pageProps)}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs border border-gray-200/80 dark:border-gray-800 text-sm leading-relaxed break-words w-full">
                    <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: ticket.description }} />

                    {ticket.attachments && ticket.attachments.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800/80 space-y-1.5">
                        <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                          <Paperclip className="h-3 w-3 text-blue-500" />
                          {t('Attachments')} ({ticket.attachments.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {ticket.attachments.map((attachment, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 px-2.5 py-0 rounded-lg border-gray-200 dark:border-gray-700"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `${imageUrlPrefix || '/storage'}/${attachment.path}`;
                                link.download = attachment.name;
                                link.click();
                              }}
                            >
                              <Paperclip className="h-3 w-3 text-blue-600" />
                              <span className="truncate max-w-[140px] text-xs font-normal">{attachment.name}</span>
                              <Download className="h-3 w-3 text-gray-400 ml-0.5" />
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Subsequent Conversation Bubbles */}
              {conversations && conversations.map((conversion) => {
                const isAdmin = conversion.sender === 'admin';
                return (
                  <div
                    key={conversion.id}
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
                            {formatDateTime(conversion.created_at, pageProps)}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {isAdmin ? (conversion.replyBy?.name || t('Admin')) : (conversion.replyBy?.name || ticket.name)}
                        </span>
                        <Badge
                          variant={isAdmin ? 'default' : 'outline'}
                          className={`text-[10px] px-1.5 py-0 h-4 font-normal capitalize ${
                            isAdmin
                              ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                              : 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40'
                          }`}
                        >
                          {isAdmin ? (conversion.replyBy?.role ? t(conversion.replyBy.role) : t('Staff')) : t('Customer')}
                        </Badge>
                        {!isAdmin && (
                          <span className="text-[11px] text-gray-400 font-mono">
                            {formatDateTime(conversion.created_at, pageProps)}
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
                          className="prose dark:prose-invert max-w-none text-sm"
                          dangerouslySetInnerHTML={{ __html: conversion.description }}
                        />

                        {conversion.attachments && conversion.attachments.length > 0 && (
                          <div className={`mt-3 pt-2.5 border-t space-y-1.5 ${
                            isAdmin ? 'border-emerald-200/60 dark:border-emerald-800/40' : 'border-gray-100 dark:border-gray-800/80'
                          }`}>
                            <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                              <Paperclip className={`h-3 w-3 ${isAdmin ? 'text-emerald-600' : 'text-blue-500'}`} />
                              {t('Attachments')} ({conversion.attachments.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {conversion.attachments.map((attachment, index) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-0 rounded-lg border-gray-200 dark:border-gray-700 hover:border-primary/50"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = `${imageUrlPrefix || '/storage'}/${attachment.path}`;
                                    link.download = attachment.name;
                                    link.click();
                                  }}
                                >
                                  <Paperclip className={`h-3 w-3 ${isAdmin ? 'text-emerald-600' : 'text-blue-600'}`} />
                                  <span className="truncate max-w-[140px] text-xs font-normal">{attachment.name}</span>
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
                          {conversion.replyBy?.name ? conversion.replyBy.name.charAt(0).toUpperCase() : 'A'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Reply Form */}
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <MessageSquare className="h-5 w-5" />
                {t('Add Reply')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReplySubmit} className="space-y-4">
                <div>
                  <Label className="text-green-800">{t('Reply Message')}</Label>
                  <RichTextEditor
                    key={replyEditorKey}
                    content={replyData.description}
                    onChange={(value) => setReplyData('description', value)}
                    placeholder={t('Write your reply here...')}
                    className="bg-white"
                  />
                  {replyErrors.description && (
                    <p className="text-sm text-red-600 mt-1">{replyErrors.description}</p>
                  )}
                </div>

                <div>
                  <Label className="text-green-800">{t('Attachments')}</Label>
                  <MediaPicker
                    value={replyData.attachments}
                    onChange={(value) => setReplyData('attachments', Array.isArray(value) ? value : [value].filter(Boolean))}
                    multiple={true}
                    placeholder={t('Select attachments')}
                    showPreview={true}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={replyProcessing || !replyData.description.trim()} className="bg-green-600 hover:bg-green-700">
                    <Send className="h-4 w-4 mr-2" />
                    {replyProcessing ? t('Sending...') : t('Send Reply')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4" />
                {t('Ticket Information')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('Status')}:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('Priority')}:</span>
                  <Badge variant="outline">{t('Normal')}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('Category')}:</span>
                  <span className="text-sm font-medium">{ticket.category_info?.name || 'None'}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('Assigned To')}:</span>
                  <span className="text-sm font-medium">
                    {ticket.assigned_to_name ? (
                      <Badge variant="secondary" className="font-normal">{ticket.assigned_to_name}</Badge>
                    ) : ticket.team_name ? (
                      <Badge variant="outline" className="font-normal">{ticket.team_name} ({t('Team')})</Badge>
                    ) : (
                      <span className="text-muted-foreground">{t('Unassigned')}</span>
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('Created')}:</span>
                  <span className="text-sm">{formatDate(ticket.created_at)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('Updated')}:</span>
                  <span className="text-sm">{formatDate(ticket.updated_at)}</span>
                </div>
                {/* Custom Fields Display */}
                <Separator />
                {customFields && customFields.length > 0 && customFields.map((field) => (
                  <div key={field.id}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{field.name}:</span>
                      <span className="text-sm">
                        {ticket.fields && ticket.fields[field.id] ? 
                          field.type === 'date' ? 
                            formatDate(ticket.fields[field.id]) : 
                            ticket.fields[field.id] 
                          : '-'
                        }
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                {t('Customer Information')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="font-medium">{ticket.name}</p>
                  <p className="text-sm text-gray-600">{ticket.email}</p>
                </div>
                <Separator />
                <div>
                  <span className="text-sm text-gray-600">{t('Account Type')}:</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {ticket.account_type}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Note Section */}
          <Card className="border-yellow-200 bg-yellow-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-yellow-800">
                <StickyNote className="h-4 w-4" />
                {t('Internal Note')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNoteSubmit} className="space-y-4">
                <div>
                  <RichTextEditor
                    content={noteData.note}
                    onChange={(value) => setNoteData('note', value)}
                    placeholder={t('Add internal note...')}
                    className="bg-white min-h-[120px]"
                  />
                  {noteErrors.note && (
                    <p className="text-sm text-red-600 mt-1">{noteErrors.note}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  disabled={noteProcessing} 
                  size="sm" 
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                >
                  <StickyNote className="h-4 w-4 mr-2" />
                  {noteProcessing ? t('Saving...') : t('Save Note')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
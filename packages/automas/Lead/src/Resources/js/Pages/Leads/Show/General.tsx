import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lead } from '../types';
import { formatDate, formatDateTime } from '@/utils/helpers';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { InputError } from '@/components/ui/input-error';
import { Textarea } from '@/components/ui/textarea';
import { useForm, usePage } from '@inertiajs/react';
import {
    Plus,
    Mail,
    Phone,
    Calendar,
    User,
    GitBranch,
    Layers,
    CheckSquare,
    Globe,
    Package,
    Tag,
    Pencil,
    List,
    Building2,
} from 'lucide-react';
import { useFormFields } from '@/hooks/useFormFields';
import LabelView from '../LabelView';

interface GeneralProps {
    lead: Lead;
}

interface LeadLabel {
    id: number;
    name: string;
    color: string;
    pipeline_id?: number;
}

export default function General({ lead }: GeneralProps) {
    const { t } = useTranslation();
    const { productItems, sourceItems, labels } = usePage<any>().props;

    const labelList: LeadLabel[] = labels || []; const productItemsList: { id: number; name: string }[] = productItems || [];
    const sourceItemsList: { id: number; name: string }[] = sourceItems || [];
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [discussionModalOpen, setDiscussionModalOpen] = useState(false);
    const [emailEditorKey, setEmailEditorKey] = useState(0);
    const [labelModalOpen, setLabelModalOpen] = useState(false);

    const { data: emailForm, setData: setEmailData, post: postEmail, processing: emailProcessing, errors: emailErrors, reset: resetEmail } = useForm({
        to: '',
        subject: '',
        description: '',
    });

    const { data: notesForm, setData: setNotesData, put: putNotes, processing: notesProcessing, errors: notesErrors } = useForm({
        name: lead.name,
        email: lead.email || '',
        subject: lead.subject,
        user_id: lead.user_id,
        labels: lead.labels || '',
        phone: lead.phone || '',
        date: lead.date || '',
        pipeline_id: lead.pipeline_id,
        stage_id: lead.stage_id,
        notes: lead.notes || '',
    });

    const { data: discussionForm, setData: setDiscussionData, post: postDiscussion, processing: discussionProcessing, errors: discussionErrors, reset: resetDiscussion } = useForm({
        message: '',
    });

    const customFields = useFormFields('getCustomFields', { ...lead, module: 'Lead', sub_module: 'Lead', id: lead.id }, () => { }, {}, 'view', t);

    const emailSubjectAI = useFormFields('aiField', emailForm, (field, value) => {
        setEmailData(field as any, value);
    }, {}, 'create', 'subject', 'Subject', 'lead', 'lead_email');

    const emailDescriptionAI = useFormFields('aiField', emailForm, (field, value) => {
        setEmailData(field as any, value);
        setEmailEditorKey(prev => prev + 1);
    }, {}, 'create', 'description', 'Description', 'lead', 'lead_email');

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postEmail(route('lead.leads.store-email', lead.id), {
            onSuccess: () => {
                resetEmail();
                setEmailModalOpen(false);
            }
        });
    };

    const handleDiscussionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postDiscussion(route('lead.leads.store-discussion', lead.id), {
            onSuccess: () => {
                resetDiscussion();
                setDiscussionModalOpen(false);
            }
        });
    };

    const selectedLabelIds = (lead.labels || '')
        .split(',')
        .map((id) => Number(id))
        .filter(Boolean);

    const assignedLabels = labelList.filter((label) =>
        selectedLabelIds.includes(label.id)
    );
    return (
        <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{lead.emails?.length ?? 0}</p>
                        <p className="text-xs text-gray-500">{t('Emails')}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Globe className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{sourceItemsList.length}</p>
                        <p className="text-xs text-gray-500">{t('Sources')}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <Package className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{productItemsList.length}</p>
                        <p className="text-xs text-gray-500">{t('Products')}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                        <CheckSquare className="h-5 w-5 text-violet-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{lead.tasks?.length ?? 0}</p>
                        <p className="text-xs text-gray-500">{t('Tasks')}</p>
                    </div>
                </div>
            </div>

            {/* Header + Details — Combined Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-blue-100">
                    <div className="grid grid-cols-[1fr_30%] gap-6 items-start">

                        {/* Left */}
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold text-gray-900">
                                {lead.name}
                            </h1>

                            {lead.subject && (
                                <p className="text-sm text-gray-500 mt-1">
                                    {lead.subject}
                                </p>
                            )}
                        </div>

                        {/* Right */}
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex flex-wrap justify-end gap-2 max-w-full">
                                {assignedLabels.map((label) => (
                                    <span
                                        key={label.id}
                                        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white whitespace-nowrap"
                                        style={{ backgroundColor: label.color }}
                                    >
                                        {label.name}
                                    </span>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setLabelModalOpen(true)}
                                    className="
                                    inline-flex h-7 w-7 shrink-0
                                    items-center justify-center
                                    rounded-full border border-gray-300
                                    bg-white text-gray-600
                                    shadow-sm transition
                                    hover:border-primary
                                    hover:bg-primary/10
                                    hover:text-primary
                                    focus:outline-none
                                    focus:ring-2
                                    focus:ring-primary/30"
                                    aria-label={t('Manage Labels')}
                                >
                                    <Tag className="h-3.5 w-3.5" />
                                </button>                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="px-6 py-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <Mail className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{t('Email')}</p>
                                <p className="text-sm font-medium text-gray-800">{lead.email || '-'}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                <Phone className="h-4 w-4 text-green-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{t('Phone')}</p>
                                <p className="text-sm font-medium text-gray-800">{lead.phone || '-'}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <Calendar className="h-4 w-4 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{t('Follow Up Date & Time')}</p>
                                <p className={`text-sm font-medium ${lead.date && new Date(typeof lead.date === 'string' && lead.date.includes(' ') && !lead.date.includes('T') ? lead.date.replace(' ', 'T') : lead.date) < new Date() ? 'text-red-500' : 'text-gray-800'
                                    }`}>
                                    {lead.date ? formatDateTime(lead.date) : '-'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                <GitBranch className="h-4 w-4 text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{t('Pipeline')}</p>
                                <p className="text-sm font-medium text-gray-800">{lead.pipeline?.name || '-'}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <Layers className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{t('Stage')}</p>
                                <p className="text-sm font-medium text-gray-800">{lead.stage?.name || '-'}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                                <List className="h-4 w-4 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{t('Subject')}</p>
                                <p className="text-sm font-medium text-gray-800">{lead.subject || '-'}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                                <Building2 className="h-4 w-4 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{t('Organization Type')}</p>
                                <p className="text-sm font-medium text-gray-800">{lead.organization_type || '-'}</p>
                            </div>
                        </div>

                        {customFields.map((field, index) => (
                            <div key={index} className="flex items-start gap-3">
                                <div className="mt-0.5 h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-gray-400">#</span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{field.label}</p>
                                    <div className="text-sm font-medium text-gray-800">{field.component}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>



            {/* Description Section */}
            {lead.description && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Description')}</h3>
                    <div
                        className="prose prose-sm max-w-none text-gray-700"
                        dangerouslySetInnerHTML={{ __html: lead.description }}
                    />
                </div>
            )}

            {/* Notes Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Notes')}</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <RichTextEditor
                        content={notesForm.notes}
                        onChange={(content) => setNotesData('notes', content)}
                        placeholder={t('Add notes...')}
                        className="min-h-[300px]"
                    />
                </div>
                <div className="flex justify-end mt-4">
                    <Button
                        type="button"
                        disabled={notesProcessing}
                        onClick={() => putNotes(route('lead.leads.update-notes', lead.id), { preserveState: false })}
                    >
                        {notesProcessing ? t('Saving...') : t('Save')}
                    </Button>
                </div>
            </div>

            {/* Emails and Discussions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Emails */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{t('Emails')}</h3>
                        <TooltipProvider>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button size="sm" onClick={() => setEmailModalOpen(true)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('Send Email')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {lead.emails && lead.emails.length > 0 ? (
                            lead.emails.map((email: any, index: number) => {
                                const stripHtmlAndDecode = (html: string) => {
                                    if (!html) return '';
                                    return html
                                        .replace(/<[^>]*>/g, '')
                                        .replace(/&amp;/g, '&')
                                        .replace(/&lt;/g, '<')
                                        .replace(/&gt;/g, '>')
                                        .replace(/&quot;/g, '"')
                                        .replace(/&#39;/g, "'")
                                        .replace(/&nbsp;/g, ' ');
                                };
                                const cleanText = stripHtmlAndDecode(email.description);
                                return (
                                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-gray-100 p-1 rounded-full">
                                                    <svg className="h-3 w-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm text-gray-900">{email.to}</p>
                                                    <p className="text-xs text-gray-500">{formatDateTime(email.created_at)}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                                            <h4 className="font-semibold text-gray-800 mb-2 text-sm">{email.subject}</h4>
                                            <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                {cleanText}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-gray-500 text-sm text-center py-4">{t('No emails found')}</p>
                        )}
                    </div>
                </div>

                {/* Discussions */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{t('Discussions')}</h3>
                        <TooltipProvider>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button size="sm" onClick={() => setDiscussionModalOpen(true)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('Add Message')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {lead.discussions && lead.discussions.length > 0 ? (
                            lead.discussions.map((discussion: any, index: number) => (
                                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-medium text-sm text-gray-900">{discussion.creator?.name || t('Unknown')}</span>
                                        <span className="text-xs text-gray-400 ml-auto">{formatDateTime(discussion.created_at)}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">{discussion.comment}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-sm text-center py-4">{t('No discussions found')}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Email Modal */}
            <Dialog open={emailModalOpen} onOpenChange={(open) => { setEmailModalOpen(open); if (!open) resetEmail(); }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('Send Email')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="to" required>{t('To')}</Label>
                            <Input
                                id="to"
                                type="email"
                                value={emailForm.to}
                                onChange={(e) => setEmailData('to', e.target.value)}
                                placeholder={t('Enter email address')}
                            />
                            <InputError message={emailErrors.to} />
                        </div>
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <Label htmlFor="subject" required>{t('Subject')}</Label>
                                <Input
                                    id="subject"
                                    type="text"
                                    value={emailForm.subject}
                                    onChange={(e) => setEmailData('subject', e.target.value)}
                                    placeholder={t('Enter subject')}
                                />
                                <InputError message={emailErrors.subject} />
                            </div>
                            {emailSubjectAI.map(field => <div key={field.id}>{field.component}</div>)}
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label htmlFor="description" required>{t('Description')}</Label>
                                <div className="flex gap-2">
                                    {emailDescriptionAI.map(field => <div key={field.id}>{field.component}</div>)}
                                </div>
                            </div>
                            <RichTextEditor
                                key={`email-editor-${emailEditorKey}`}
                                content={emailForm.description}
                                onChange={(content) => setEmailData('description', content)}
                                placeholder={t('Enter email content')}
                                className="mt-1"
                            />
                            <InputError message={emailErrors.description} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => { setEmailModalOpen(false); resetEmail(); }}>{t('Cancel')}</Button>
                            <Button type="submit" disabled={emailProcessing}>
                                {emailProcessing ? t('Sending...') : t('Send Email')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Discussion Modal */}
            <Dialog open={discussionModalOpen} onOpenChange={(open) => { setDiscussionModalOpen(open); if (!open) resetDiscussion(); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('Add Message')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleDiscussionSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="message" required>{t('Message')}</Label>
                            <Textarea
                                id="message"
                                value={discussionForm.message}
                                onChange={(e) => setDiscussionData('message', e.target.value)}
                                placeholder={t('Enter your message')}
                                rows={3}
                            />
                            <InputError message={discussionErrors.message} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => { setDiscussionModalOpen(false); resetDiscussion(); }}>{t('Cancel')}</Button>
                            <Button type="submit" disabled={discussionProcessing}>
                                {discussionProcessing ? t('Saving...') : t('Save')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={labelModalOpen} onOpenChange={setLabelModalOpen}>
                {labelModalOpen && (
                    <LabelView
                        lead={lead}
                        onSuccess={() => setLabelModalOpen(false)}
                    />
                )}
            </Dialog>
        </div>
    );
}

import { DialogContent, DialogHeader, DialogTitle, Dialog } from "@/components/ui/dialog";
import { useForm, usePage } from "@inertiajs/react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import InputError from '@/components/ui/input-error';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PhoneInputComponent } from '@/components/ui/phone-input';
import { DateTimeRangePicker } from '@/components/ui/datetime-range-picker';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { CreateLeadProps, CreateLeadFormData } from './types';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { formatDate } from '@/utils/helpers';
import { useFormFields } from '@/hooks/useFormFields';
import { MultiSelectEnhanced } from '@/components/ui/multi-select-enhanced';
import { CheckCircle2, XCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Create({ onSuccess }: CreateLeadProps) {
    const { users, sources, subjects, organizationTypes, auth, pipelines } = usePage<any>().props;
    const [stages, setStages] = useState<any[]>([]);
    const [subjectList, setSubjectList] = useState<any[]>(Array.isArray(subjects) ? subjects : []);
    const [orgTypeList, setOrgTypeList] = useState<any[]>(Array.isArray(organizationTypes) ? organizationTypes : []);
    const [quickAddModal, setQuickAddModal] = useState<{ isOpen: boolean; type: 'subject' | 'organization_type' | null }>({
        isOpen: false,
        type: null
    });
    const [quickAddName, setQuickAddName] = useState('');
    const [isQuickAdding, setIsQuickAdding] = useState(false);

    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm<CreateLeadFormData>({
        subject: '',
        organization_type: '',
        user_id: auth?.user?.id ? auth.user.id.toString() : '',
        name: '',
        email: '',
        phone: '',
        sources: [],
        date: '',
        pipeline_id: '',
        stage_id: '',
        notes: '',
    });

    useEffect(() => {
        if (data.pipeline_id) {
            fetch(route('lead.stages.by-pipeline', data.pipeline_id))
                .then(res => res.json())
                .then(stageList => {
                    setStages(stageList || []);
                })
                .catch(() => setStages([]));
        } else {
            setStages([]);
        }
    }, [data.pipeline_id]);

    const selectedStage = stages?.find(
        (s: any) => s.id?.toString() === data.stage_id?.toString()
    );
    const isFinalAccepted = !!selectedStage?.is_final_accepted;
    const isFinalRejected = !!selectedStage?.is_final_rejected;

    const nameAI = useFormFields('aiField', data, setData, errors, 'create', 'name', 'Name', 'lead', 'lead');
    const subjectAI = useFormFields('aiField', data, setData, errors, 'create', 'subject', 'Subject', 'lead', 'lead');
    const customFields = useFormFields('getCustomFields', { ...data, module: 'Lead', sub_module: 'Lead' }, setData, errors, 'create', t);
    const [notesEditorKey, setNotesEditorKey] = useState(0);
    const notesAI = useFormFields('aiField', data, (field, value) => {
        setData('notes', value);
        setNotesEditorKey(prev => prev + 1);
    }, errors, 'create', 'notes', 'Notes', 'lead', 'lead');

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('lead.leads.store'), {
            onSuccess: () => {
                onSuccess();
            }
        });
    };

    const handleQuickAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickAddName.trim()) return;

        setIsQuickAdding(true);
        try {
            if (quickAddModal.type === 'subject') {
                const res = await axios.post(route('lead.subjects.store'), { name: quickAddName });
                const newSubject = res.data?.data || { name: quickAddName };
                setSubjectList(prev => [...prev, newSubject]);
                setData('subject', newSubject.name);
                toast.success(t('Subject created successfully'));
            } else if (quickAddModal.type === 'organization_type') {
                const res = await axios.post(route('lead.organization-types.store'), { name: quickAddName });
                const newOrgType = res.data?.data || { name: quickAddName };
                setOrgTypeList(prev => [...prev, newOrgType]);
                setData('organization_type', newOrgType.name);
                toast.success(t('Organization Type created successfully'));
            }
            setQuickAddName('');
            setQuickAddModal({ isOpen: false, type: null });
        } catch (err) {
            toast.error(t('Failed to create item'));
        } finally {
            setIsQuickAdding(false);
        }
    };

    const canCreateSubject = auth?.user?.permissions?.includes('create-subjects');
    const canCreateOrgType = auth?.user?.permissions?.includes('create-organization-types');

    return (
        <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
                <DialogTitle>{t('Create Lead')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <Label htmlFor="name">{t('Name')}</Label>
                            <Input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder={t('Enter Name')}
                                required
                            />
                            <InputError message={errors.name} />
                        </div>
                        {nameAI.map(field => <div key={field.id}>{field.component}</div>)}
                    </div>

                    <div>
                        <Label htmlFor="email">{t('Email')}</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder={t('Enter Email')}
                        />
                        <InputError message={errors.email} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <Label htmlFor="subject" required>{t('Subject')}</Label>
                            {canCreateSubject && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1.5 text-xs text-primary hover:text-primary/80 flex items-center gap-1 p-0"
                                    onClick={() => {
                                        setQuickAddName('');
                                        setQuickAddModal({ isOpen: true, type: 'subject' });
                                    }}
                                >
                                    <Plus className="h-3 w-3" />
                                    {t('Add New')}
                                </Button>
                            )}
                        </div>
                        <Select value={data.subject} onValueChange={(value) => setData('subject', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Select Subject')} />
                            </SelectTrigger>
                            <SelectContent searchable>
                                {subjectList.map((item: any) => (
                                    <SelectItem key={item.id ?? item.name ?? item} value={item.name ?? item}>
                                        {item.name ?? item}
                                    </SelectItem>
                                ))}
                                {data.subject && !subjectList.some((s: any) => (s.name ?? s) === data.subject) && (
                                    <SelectItem key="custom_subject" value={data.subject}>
                                        {data.subject}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.subject} />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <Label htmlFor="organization_type">{t('Organization Type')}</Label>
                            {canCreateOrgType && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1.5 text-xs text-primary hover:text-primary/80 flex items-center gap-1 p-0"
                                    onClick={() => {
                                        setQuickAddName('');
                                        setQuickAddModal({ isOpen: true, type: 'organization_type' });
                                    }}
                                >
                                    <Plus className="h-3 w-3" />
                                    {t('Add New')}
                                </Button>
                            )}
                        </div>
                        <Select value={data.organization_type || ''} onValueChange={(value) => setData('organization_type', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Select Organization Type')} />
                            </SelectTrigger>
                            <SelectContent searchable>
                                {orgTypeList.map((item: any) => (
                                    <SelectItem key={item.id ?? item.name ?? item} value={item.name ?? item}>
                                        {item.name ?? item}
                                    </SelectItem>
                                ))}
                                {data.organization_type && !orgTypeList.some((o: any) => (o.name ?? o) === data.organization_type) && (
                                    <SelectItem key="custom_org_type" value={data.organization_type}>
                                        {data.organization_type}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.organization_type} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="user_id" required>{t('User')}</Label>
                        <Select value={data.user_id?.toString() || ''} onValueChange={(value) => setData('user_id', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Select User')} />
                            </SelectTrigger>
                            <SelectContent searchable>
                                {users?.map((item: any) => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.user_id} />
                    </div>

                    <div>
                        <PhoneInputComponent
                            label={t('Phone No')}
                            value={data.phone}
                            onChange={(value) => setData('phone', value || '')}
                            error={errors.phone}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <Label className={isFinalAccepted ? 'text-emerald-700 dark:text-emerald-400 font-medium' : (isFinalRejected ? 'text-muted-foreground' : '')}>
                                {t('Follow Up Date')}
                            </Label>
                            {isFinalAccepted && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    {t('Final Accepted')}
                                </span>
                            )}
                            {isFinalRejected && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full">
                                    <XCircle className="h-3 w-3 text-rose-600" />
                                    {t('Disabled for Rejected')}
                                </span>
                            )}
                        </div>
                        <DateTimeRangePicker
                            value={data.date}
                            onChange={(date) => setData('date', date)}
                            placeholder={isFinalRejected ? t('Disabled for rejected stage') : t('Select Follow Up Date & Time')}
                            mode="single"
                            disabled={isFinalRejected}
                            triggerClassName={cn(
                                isFinalAccepted && "border-emerald-500 bg-emerald-50/50 text-emerald-900 focus:border-emerald-600 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-200 ring-1 ring-emerald-500/20",
                                isFinalRejected && "opacity-60 cursor-not-allowed bg-muted border-dashed text-muted-foreground"
                            )}
                        />
                        <InputError message={errors.date} />
                    </div>

                    <div>
                        <Label htmlFor="pipeline_id">{t('Pipeline')}</Label>
                        <Select
                            value={data.pipeline_id || ''}
                            onValueChange={(value) => {
                                setData(prev => ({ ...prev, pipeline_id: value, stage_id: '' }));
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('Select Pipeline')} />
                            </SelectTrigger>
                            <SelectContent searchable>
                                {pipelines?.map((item: any) => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.pipeline_id} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="stage_id">{t('Stage')}</Label>
                        <Select
                            value={data.stage_id || ''}
                            onValueChange={(value) => {
                                const stageObj = stages?.find((s: any) => s.id?.toString() === value?.toString());
                                if (stageObj?.is_final_rejected) {
                                    setData(prev => ({ ...prev, stage_id: value, date: '' }));
                                } else {
                                    setData('stage_id', value);
                                }
                            }}
                            disabled={!data.pipeline_id}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={data.pipeline_id ? t('Select Stage') : t('Select Pipeline first')} />
                            </SelectTrigger>
                            <SelectContent searchable>
                                {stages?.map((item: any) => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                        <div className="flex items-center justify-between w-full gap-2">
                                            <span>{item.name}</span>
                                            {!!item.is_final_accepted && (
                                                <span className="text-[10px] text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded font-normal">
                                                    {t('Accepted')}
                                                </span>
                                            )}
                                            {!!item.is_final_rejected && (
                                                <span className="text-[10px] text-rose-700 bg-rose-100 dark:bg-rose-950 dark:text-rose-300 px-1.5 py-0.5 rounded font-normal">
                                                    {t('Rejected')}
                                                </span>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.stage_id} />
                    </div>

                    <div>
                        <Label htmlFor="sources">
                            {t('Sources')}
                        </Label>

                        <MultiSelectEnhanced
                            options={
                                Array.isArray(sources)
                                    ? sources.map((source: any) => ({
                                        value: String(source.id),
                                        label: String(source.name ?? ''),
                                    }))
                                    : Object.entries(sources || {}).map(
                                        ([id, source]: [string, any]) => ({
                                            value: String(
                                                source?.id ?? id
                                            ),
                                            label: String(
                                                source?.name ??
                                                source ??
                                                ''
                                            ),
                                        })
                                    )
                            }
                            value={
                                Array.isArray(data.sources)
                                    ? data.sources.map(String)
                                    : []
                            }
                            onValueChange={(values) =>
                                setData('sources', values)
                            }
                            placeholder={t('Select Sources')}
                            searchable
                        />

                        <InputError message={errors.sources} />
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="notes">{t('Notes')}</Label>
                        <div className="flex gap-2">
                            {notesAI.map(field => <div key={field.id}>{field.component}</div>)}
                        </div>
                    </div>
                    <RichTextEditor
                        key={`notes-editor-${notesEditorKey}`}
                        content={data.notes || ''}
                        onChange={(content) => setData('notes', content)}
                        placeholder={t('Enter Notes')}
                    />
                    <InputError message={errors.notes} />
                </div>

                {customFields.length > 0 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {customFields.map((field) => (
                                <div key={field.id}>
                                    {field.component}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onSuccess}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing ? t('Creating...') : t('Create')}
                    </Button>
                </div>
            </form>

            <Dialog open={quickAddModal.isOpen} onOpenChange={(open) => setQuickAddModal(prev => ({ ...prev, isOpen: open }))}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {quickAddModal.type === 'subject' ? t('Create Lead Subject') : t('Create Organization Type')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleQuickAddSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="quick-add-name">{t('Name')}</Label>
                            <Input
                                id="quick-add-name"
                                value={quickAddName}
                                onChange={(e) => setQuickAddName(e.target.value)}
                                placeholder={quickAddModal.type === 'subject' ? t('Enter Subject Name') : t('Enter Organization Type Name')}
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setQuickAddModal({ isOpen: false, type: null })}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={isQuickAdding}>
                                {isQuickAdding ? t('Creating...') : t('Create')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </DialogContent>
    );
}

import { DialogContent, DialogHeader, DialogTitle, Dialog } from "@/components/ui/dialog";
import { useForm, usePage } from "@inertiajs/react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import InputError from '@/components/ui/input-error';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhoneInputComponent } from '@/components/ui/phone-input';
import { DateTimeRangePicker } from '@/components/ui/datetime-range-picker';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { MultiSelectEnhanced } from '@/components/ui/multi-select-enhanced';
import { EditLeadProps, LeadFormData } from './types';
import { useState, useEffect } from 'react';
import { formatDate } from '@/utils/helpers';
import { Tag, CheckCircle2, XCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormFields } from '@/hooks/useFormFields';
import axios from 'axios';
import { toast } from 'sonner';

export default function EditLead({ lead, sources: propSources, subjects: propSubjects, organizationTypes: propOrgTypes, products: propProducts, onSuccess }: EditLeadProps & { sources?: any, subjects?: any, organizationTypes?: any, products?: any }) {
    const { users, pipelines, products, labels: labelOptions, subjects: pageSubjects, organizationTypes: pageOrgTypes, auth } = usePage<any>().props;
    const [stages, setStages] = useState([]);
    const [sources, setSources] = useState(propSources || []);
    const [subjects, setSubjects] = useState(propSubjects || pageSubjects || []);
    const [orgTypes, setOrgTypes] = useState(propOrgTypes || pageOrgTypes || []);
    const [productOptions, setProductOptions] = useState(propProducts || []);
    const [quickAddModal, setQuickAddModal] = useState<{ isOpen: boolean; type: 'subject' | 'organization_type' | null }>({
        isOpen: false,
        type: null
    });
    const [quickAddName, setQuickAddName] = useState('');
    const [isQuickAdding, setIsQuickAdding] = useState(false);

    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm<LeadFormData>({
        ...lead,
        user_id: lead.user_id?.toString() || '',
        pipeline_id: lead.pipeline_id?.toString() || '',
        stage_id: lead.stage_id?.toString() || '',
        organization_type: lead.organization_type || '',
        sources: Array.isArray(lead.sources) ? lead.sources : (lead.sources ? lead.sources.split(',') : []),
        products: Array.isArray(lead.products) ? lead.products : (lead.products ? lead.products.split(',') : []),
        labels: Array.isArray(lead.labels) ? lead.labels : (lead.labels ? lead.labels.split(',') : []),
    });

    const nameAI = useFormFields('aiField', data, setData, errors, 'edit', 'name', 'Name', 'lead', 'lead');
    const subjectAI = useFormFields('aiField', data, setData, errors, 'edit', 'subject', 'Subject', 'lead', 'lead');
    const customFields = useFormFields('getCustomFields', { ...data, module: 'Lead', sub_module: 'Lead', id: lead.id }, setData, errors, 'edit', t);
    const [notesEditorKey, setNotesEditorKey] = useState(0);
    const notesAI = useFormFields('aiField', data, (field, value) => {
        setData(field, value);
        setNotesEditorKey(prev => prev + 1);
    }, errors, 'edit', 'notes', 'Notes', 'lead', 'lead');

    useEffect(() => {
        if (propSubjects) {
            setSubjects(propSubjects);
        }
    }, [propSubjects]);

    useEffect(() => {
        if (propOrgTypes) {
            setOrgTypes(propOrgTypes);
        }
    }, [propOrgTypes]);

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

    const isSubjectInList = (subjectName: string, list: any) => {
        if (!subjectName || !list) return false;
        if (Array.isArray(list)) {
            return list.some((item: any) => (item.name ?? item) === subjectName);
        }
        return Object.values(list).some((name: any) => (typeof name === 'string' ? name : name?.name) === subjectName);
    };

    const isOrgTypeInList = (orgTypeName: string, list: any) => {
        if (!orgTypeName || !list) return false;
        if (Array.isArray(list)) {
            return list.some((item: any) => (item.name ?? item) === orgTypeName);
        }
        return Object.values(list).some((name: any) => (typeof name === 'string' ? name : name?.name) === orgTypeName);
    };

    const selectedStage = (stages as any[])?.find(
        (s: any) => s.id?.toString() === data.stage_id?.toString()
    );
    const isFinalAccepted = !!selectedStage?.is_final_accepted;
    const isFinalRejected = !!selectedStage?.is_final_rejected;

    const canCreateSubject = auth?.user?.permissions?.includes('create-subjects');
    const canCreateOrgType = auth?.user?.permissions?.includes('create-organization-types');

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('lead.leads.update', lead.id), {
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
                setSubjects(prev => Array.isArray(prev) ? [...prev, newSubject] : [...Object.values(prev), newSubject]);
                setData('subject', newSubject.name);
                toast.success(t('Subject created successfully'));
            } else if (quickAddModal.type === 'organization_type') {
                const res = await axios.post(route('lead.organization-types.store'), { name: quickAddName });
                const newOrgType = res.data?.data || { name: quickAddName };
                setOrgTypes(prev => Array.isArray(prev) ? [...prev, newOrgType] : [...Object.values(prev), newOrgType]);
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

    return (
        <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
                <DialogTitle>{t('Edit Lead')}</DialogTitle>
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
                        <Select value={data.subject || ''} onValueChange={(value) => setData('subject', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Select Subject')} />
                            </SelectTrigger>
                            <SelectContent searchable>
                                {Array.isArray(subjects) ? (
                                    subjects.map((item: any) => (
                                        <SelectItem key={item.id ?? item.name ?? item} value={item.name ?? item}>
                                            {item.name ?? item}
                                        </SelectItem>
                                    ))
                                ) : (
                                    Object.entries(subjects || {}).map(([id, name]: [string, any]) => (
                                        <SelectItem key={id} value={typeof name === 'string' ? name : (name?.name ?? id)}>
                                            {typeof name === 'string' ? name : (name?.name ?? id)}
                                        </SelectItem>
                                    ))
                                )}
                                {data.subject && !isSubjectInList(data.subject, subjects) && (
                                    <SelectItem key="current_subject" value={data.subject}>
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
                                {Array.isArray(orgTypes) ? (
                                    orgTypes.map((item: any) => (
                                        <SelectItem key={item.id ?? item.name ?? item} value={item.name ?? item}>
                                            {item.name ?? item}
                                        </SelectItem>
                                    ))
                                ) : (
                                    Object.entries(orgTypes || {}).map(([id, name]: [string, any]) => (
                                        <SelectItem key={id} value={typeof name === 'string' ? name : (name?.name ?? id)}>
                                            {typeof name === 'string' ? name : (name?.name ?? id)}
                                        </SelectItem>
                                    ))
                                )}
                                {data.organization_type && !isOrgTypeInList(data.organization_type, orgTypes) && (
                                    <SelectItem key="current_org_type" value={data.organization_type}>
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
                                const stageObj = (stages as any[])?.find((s: any) => s.id?.toString() === value?.toString());
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
                                {(stages as any[])?.map((item: any) => (
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
                        {processing ? t('Updating...') : t('Update')}
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
                            <Label htmlFor="quick-add-name-edit">{t('Name')}</Label>
                            <Input
                                id="quick-add-name-edit"
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

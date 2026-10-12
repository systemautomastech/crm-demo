import {
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    Head,
    router,
    useForm,
} from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    FileSpreadsheet,
    GitBranch,
    Info,
    LoaderCircle,
    Plus,
    Trash2,
    Upload,
    UserRoundCog,
} from 'lucide-react';

import AuthenticatedLayout from '@/layouts/authenticated-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface CsvHeader {
    index: number;
    key: string;
    label: string;
}

interface CsvPreviewRow {
    row_number: number;
    values: string[];
}

interface CrmField {
    key: string;
    label: string;
    required: boolean;
}

interface ImportUser {
    id: number;
    name: string;
    email?: string | null;
}

interface Pipeline {
    id: number;
    name: string;
}

interface Stage {
    id: number;
    name: string;
    pipeline_id: number;
}

interface LeadImport {
    uuid: string;
    original_filename: string;
    file_size: number;
    mode: 'preview' | 'direct';
    status: string;
    duplicate_strategy: string;
    column_mapping: Record<string, number>;
    delimiter_name?: string | null;
}

interface PreviewData {
    headers: CsvHeader[];
    rows: CsvPreviewRow[];
    required_fields: string[];
}

interface PreviewProps {
    leadImport: LeadImport;
    preview: PreviewData;
    crmFields: CrmField[];
    users: ImportUser[];
    pipelines?: Pipeline[];
    stages?: Stage[];
    defaults?: {
        pipeline_id: number;
        stage_id: number;
    };
}

interface AssignmentRange {
    id: string;
    from_row: string;
    to_row: string;
    user_id: string;
}

interface MappingForm {
    column_mapping: Record<string, string>;
    assignment_ranges: Array<{
        from_row: number | string;
        to_row: number | string;
        user_id: number | string;
    }>;
}

const IGNORE_VALUE = '__ignore__';

function createRange(): AssignmentRange {
    return {
        id: crypto.randomUUID(),
        from_row: '',
        to_row: '',
        user_id: '',
    };
}

export default function Preview({
    leadImport,
    preview,
    crmFields,
    users,
    pipelines = [],
    stages = [],
    defaults = { pipeline_id: 0, stage_id: 0 },
}: PreviewProps) {
    const { t } = useTranslation();

    const isDirectMode = leadImport.mode === 'direct';

    const [pipelineId, setPipelineId] = useState<string>(
        String(defaults?.pipeline_id || pipelines[0]?.id || '')
    );
    const [stageId, setStageId] = useState<string>(
        String(defaults?.stage_id || stages.filter(s => String(s.pipeline_id) === String(defaults?.pipeline_id || pipelines[0]?.id))?.[0]?.id || '')
    );

    const availableStages = useMemo(() => {
        return stages.filter((stage) => String(stage.pipeline_id) === pipelineId);
    }, [stages, pipelineId]);

    const changePipeline = (pId: string): void => {
        setPipelineId(pId);
        const pStages = stages.filter((s) => String(s.pipeline_id) === pId);
        setStageId(pStages[0] ? String(pStages[0].id) : '');
    };

    /*
     * Convert saved mapping:
     *
     * name => 0
     *
     * Into table-header mapping:
     *
     * 0 => name
     */
    const initialColumnMapping = useMemo<
        Record<string, string>
    >(() => {
        const mapping: Record<string, string> = {};

        preview.headers.forEach((header) => {
            mapping[String(header.index)] = IGNORE_VALUE;
        });

        Object.entries(
            leadImport.column_mapping ?? {}
        ).forEach(([crmField, columnIndex]) => {
            mapping[String(columnIndex)] = crmField;
        });

        return mapping;
    }, [
        leadImport.column_mapping,
        preview.headers,
    ]);

    const [assignmentRanges, setAssignmentRanges] =
        useState<AssignmentRange[]>([]);

    useEffect(() => {
        if (assignmentRanges.length === 0) {
            const initialRange = createRange();
            if (users.length === 1) {
                initialRange.user_id = String(users[0].id);
            }
            setAssignmentRanges([initialRange]);
        }
    }, []);

    const {
        data,
        setData,
        post,
        processing,
        errors,
    } = useForm<MappingForm>({
        column_mapping: initialColumnMapping,
        assignment_ranges: [],
    });

    useEffect(() => {
        setData(
            'assignment_ranges',
            assignmentRanges.map((range) => ({
                from_row: range.from_row,
                to_row: range.to_row,
                user_id: range.user_id,
            }))
        );
    }, [assignmentRanges]);

    const requiredFields = useMemo(
        () =>
            crmFields.filter(
                (field) => field.required
            ),
        [crmFields]
    );

    const selectedFields = useMemo(
        () =>
            Object.values(
                data.column_mapping
            ).filter(
                (field) =>
                    field !== IGNORE_VALUE
            ),
        [data.column_mapping]
    );

    const missingRequiredFields = useMemo(
        () =>
            requiredFields.filter(
                (requiredField) =>
                    !selectedFields.includes(
                        requiredField.key
                    )
            ),
        [requiredFields, selectedFields]
    );

    const hasDuplicateFields = useMemo(
        () =>
            new Set(selectedFields).size !==
            selectedFields.length,
        [selectedFields]
    );

    const rangeErrors = useMemo(() => {
        const messages: string[] = [];

        const normalizedRanges = assignmentRanges
            .map((range) => ({
                from: Number(range.from_row),
                to: Number(range.to_row),
                userId: Number(range.user_id),
            }))
            .filter(
                (range) =>
                    range.from > 0 ||
                    range.to > 0 ||
                    range.userId > 0
            );

        for (const range of normalizedRanges) {
            if (
                !range.from ||
                !range.to ||
                !range.userId
            ) {
                messages.push(
                    t(
                        'Complete all fields in each assignment range.'
                    )
                );

                break;
            }

            if (range.to < range.from) {
                messages.push(
                    t(
                        'An ending row cannot be smaller than its starting row.'
                    )
                );

                break;
            }
        }

        const sortedRanges = [
            ...normalizedRanges,
        ].sort((first, second) =>
            first.from - second.from
        );

        for (
            let index = 1;
            index < sortedRanges.length;
            index++
        ) {
            const previous =
                sortedRanges[index - 1];
            const current =
                sortedRanges[index];

            if (current.from <= previous.to) {
                messages.push(
                    t(
                        'User assignment ranges cannot overlap.'
                    )
                );

                break;
            }
        }

        return messages;
    }, [assignmentRanges, t]);

    const canContinue =
        preview.headers.length > 0 &&
        preview.rows.length > 0 &&
        missingRequiredFields.length === 0 &&
        !hasDuplicateFields &&
        rangeErrors.length === 0;

    const updateColumnMapping = (
        columnIndex: number,
        crmField: string
    ): void => {
        const nextMapping = {
            ...data.column_mapping,
        };

        /*
         * Automatically remove this CRM field from another
         * CSV column before assigning it here.
         */
        if (crmField !== IGNORE_VALUE) {
            Object.entries(nextMapping).forEach(
                ([
                    currentColumnIndex,
                    currentCrmField,
                ]) => {
                    if (
                        currentColumnIndex !==
                        String(columnIndex) &&
                        currentCrmField === crmField
                    ) {
                        nextMapping[
                            currentColumnIndex
                        ] = IGNORE_VALUE;
                    }
                }
            );
        }

        nextMapping[String(columnIndex)] =
            crmField;

        setData(
            'column_mapping',
            nextMapping
        );
    };

    const addAssignmentRange = (): void => {
        setAssignmentRanges((current) => {
            const previousRange =
                current[current.length - 1];

            const nextRange = createRange();

            if (previousRange?.to_row) {
                nextRange.from_row = String(
                    Number(previousRange.to_row) + 1
                );
            }

            return [...current, nextRange];
        });
    };

    const updateAssignmentRange = (
        id: string,
        key: keyof Omit<
            AssignmentRange,
            'id'
        >,
        value: string
    ): void => {
        setAssignmentRanges((current) =>
            current.map((range) =>
                range.id === id
                    ? {
                        ...range,
                        [key]: value,
                    }
                    : range
            )
        );
    };

    const removeAssignmentRange = (
        id: string
    ): void => {
        setAssignmentRanges((current) =>
            current.filter(
                (range) => range.id !== id
            )
        );
    };

    const formatFileSize = (
        bytes: number
    ): string => {
        if (!bytes || bytes <= 0) {
            return '0 B';
        }

        if (bytes < 1024) {
            return `${bytes} B`;
        }

        const kilobytes = bytes / 1024;

        if (kilobytes < 1024) {
            return `${kilobytes.toFixed(
                1
            )} KB`;
        }

        return `${(
            kilobytes / 1024
        ).toFixed(1)} MB`;
    };

    const submit = (
        event: FormEvent
    ): void => {
        event.preventDefault();

        if (!canContinue) {
            return;
        }

        post(
            route(
                'lead.leads.import.mapping.store',
                leadImport.uuid
            ),
            {
                preserveScroll: false,
                onError: (errors) => {
                    console.error('Import Mapping Errors:', errors);
                },
            }
        );
    };

    const directSubmit = (event: FormEvent): void => {
        event.preventDefault();

        if (assignmentRanges.length === 0 || rangeErrors.length > 0 || !pipelineId || !stageId) {
            return;
        }

        router.post(
            route('lead.leads.import.direct-start', leadImport.uuid),
            {
                pipeline_id: pipelineId,
                stage_id: stageId,
                assignment_ranges: assignmentRanges.map((range) => ({
                    from_row: range.from_row,
                    to_row: range.to_row,
                    user_id: range.user_id,
                })),
            },
            {
                preserveScroll: true,
            }
        );
    };

    if (isDirectMode) {
        return (
            <AuthenticatedLayout
                breadcrumbs={[
                    {
                        label: t('CRM'),
                        url: route('lead.index'),
                    },
                    {
                        label: t('Leads'),
                        url: route('lead.leads.index'),
                    },
                    {
                        label: t('Bulk Import'),
                        url: route('lead.leads.import.index'),
                    },
                    {
                        label: t('Direct Import'),
                    },
                ]}
                pageTitle={t('Direct Lead Import')}
                pageActions={
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={processing}
                        onClick={() => router.get(route('lead.leads.import.index'))}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        {t('Upload Another File')}
                    </Button>
                }
            >
                <Head title={t('Direct Lead Import')} />

                <form onSubmit={directSubmit} className="space-y-6">
                    <Card className="shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                        <FileSpreadsheet className="h-6 w-6 text-primary" />
                                    </div>

                                    <div className="min-w-0">
                                        <h2 className="truncate text-lg font-semibold">
                                            {leadImport.original_filename}
                                        </h2>

                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                            <span>{formatFileSize(leadImport.file_size)}</span>
                                            <span>
                                                {t('Delimiter')}:{' '}
                                                {leadImport.delimiter_name || t('Unknown')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Badge className="w-fit bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300">
                                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                    {t('Direct Upload Mode')}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pipeline & Stage Card */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <GitBranch className="h-4 w-4 text-primary" />
                                {t('Pipeline and Stage')}
                            </CardTitle>
                            <CardDescription>
                                {t('Select the target pipeline and stage for imported leads.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-xs font-medium">
                                    {t('Pipeline')} <span className="text-destructive">*</span>
                                </label>
                                <Select
                                    value={pipelineId}
                                    disabled={processing}
                                    onValueChange={changePipeline}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select pipeline')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {pipelines.map((pipeline) => (
                                            <SelectItem
                                                key={pipeline.id}
                                                value={String(pipeline.id)}
                                            >
                                                {pipeline.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-medium">
                                    {t('Initial Stage')} <span className="text-destructive">*</span>
                                </label>
                                <Select
                                    value={stageId}
                                    disabled={processing || availableStages.length === 0}
                                    onValueChange={setStageId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select stage')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {availableStages.map((stage) => (
                                            <SelectItem
                                                key={stage.id}
                                                value={String(stage.id)}
                                            >
                                                {stage.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Assign Leads by Row Range Block ONLY */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <UserRoundCog className="h-4 w-4" />
                                        {t('Assign Leads by Row Range')}
                                    </CardTitle>

                                    <CardDescription className="mt-1">
                                        {t('Assign different CSV row ranges to team members before uploading.')}
                                    </CardDescription>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={processing}
                                    onClick={addAssignmentRange}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('Add Range')}
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {assignmentRanges.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-8 text-center">
                                    <UserRoundCog className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

                                    <p className="font-medium">
                                        {t('No user assignment ranges')}
                                    </p>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {t('Imported leads will remain unassigned unless you add a row range.')}
                                    </p>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="mt-4"
                                        onClick={addAssignmentRange}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('Add First Range')}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {assignmentRanges.map((range, index) => (
                                        <div
                                            key={range.id}
                                            className="grid gap-3 rounded-lg border p-4 md:grid-cols-[120px_120px_minmax(220px,1fr)_auto] md:items-end"
                                        >
                                            <div>
                                                <label className="mb-2 block text-sm font-medium">
                                                    {t('From Row')}
                                                </label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    step={1}
                                                    disabled={processing}
                                                    value={range.from_row}
                                                    placeholder="1"
                                                    onChange={(event) =>
                                                        updateAssignmentRange(
                                                            range.id,
                                                            'from_row',
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium">
                                                    {t('To Row')}
                                                </label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    step={1}
                                                    disabled={processing}
                                                    value={range.to_row}
                                                    placeholder="100"
                                                    onChange={(event) =>
                                                        updateAssignmentRange(
                                                            range.id,
                                                            'to_row',
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium">
                                                    {t('Assign User')}
                                                </label>
                                                <Select
                                                    value={range.user_id}
                                                    disabled={processing}
                                                    onValueChange={(value) =>
                                                        updateAssignmentRange(
                                                            range.id,
                                                            'user_id',
                                                            value
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('Select user')} />
                                                    </SelectTrigger>
                                                    <SelectContent searchable>
                                                        {users.map((user) => (
                                                            <SelectItem
                                                                key={user.id}
                                                                value={String(user.id)}
                                                            >
                                                                {user.name}
                                                                {user.email ? ` — ${user.email}` : ''}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                disabled={processing}
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => removeAssignmentRange(range.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">{t('Remove range')}</span>
                                            </Button>

                                            <div className="md:col-span-4">
                                                <p className="text-xs text-muted-foreground">
                                                    {t('Range')} {index + 1}
                                                    {range.from_row && range.to_row
                                                        ? `: ${range.from_row}–${range.to_row}`
                                                        : ''}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {rangeErrors.map((message) => (
                                <div
                                    key={message}
                                    className="flex items-start gap-2 text-sm text-destructive"
                                >
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{message}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Direct Submit Actions Bar */}
                    <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:mx-0 sm:rounded-lg sm:border">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                {rangeErrors.length === 0 && pipelineId && stageId ? (
                                    <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>{t('Ready for direct upload & processing.')}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-2 text-sm text-destructive">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>
                                            {!pipelineId || !stageId
                                                ? t('Select pipeline and stage before starting.')
                                                : t('Fix user assignment ranges before starting.')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={processing}
                                    onClick={() => router.get(route('lead.leads.import.index'))}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    {t('Cancel')}
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={
                                        rangeErrors.length > 0 ||
                                        !pipelineId ||
                                        !stageId ||
                                        processing
                                    }
                                >
                                    {processing ? (
                                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <ChevronRight className="mr-2 h-4 w-4" />
                                    )}
                                    {t('Start Direct Import')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                {
                    label: t('CRM'),
                    url: route('lead.index'),
                },
                {
                    label: t('Leads'),
                    url: route(
                        'lead.leads.index'
                    ),
                },
                {
                    label: t('Bulk Import'),
                    url: route(
                        'lead.leads.import.index'
                    ),
                },
                {
                    label: t('Preview'),
                },
            ]}
            pageTitle={t('Import Preview')}
            pageActions={
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={processing}
                    onClick={() =>
                        router.get(
                            route(
                                'lead.leads.import.index'
                            )
                        )
                    }
                >
                    <Upload className="mr-2 h-4 w-4" />
                    {t('Upload Another File')}
                </Button>
            }
        >
            <Head title={t('Import Preview')} />

            <form
                onSubmit={submit}
                className="space-y-6"
            >
                <Card className="shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                                </div>

                                <div className="min-w-0">
                                    <h2 className="truncate text-lg font-semibold">
                                        {
                                            leadImport.original_filename
                                        }
                                    </h2>

                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                        <span>
                                            {formatFileSize(
                                                leadImport.file_size
                                            )}
                                        </span>

                                        <span>
                                            {preview.headers.length}{' '}
                                            {t('columns')}
                                        </span>

                                        <span>
                                            {preview.rows.length}{' '}
                                            {t(
                                                'sample rows'
                                            )}
                                        </span>

                                        <span>
                                            {t('Delimiter')}:{' '}
                                            {leadImport.delimiter_name ||
                                                t('Unknown')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Badge className="w-fit bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                {t('Ready for Mapping')}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <UserRoundCog className="h-4 w-4" />
                                    {t(
                                        'Assign Leads by Row Range'
                                    )}
                                </CardTitle>

                                <CardDescription className="mt-1">
                                    {t(
                                        'Assign different CSV row ranges to different users.'
                                    )}
                                </CardDescription>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={processing}
                                onClick={
                                    addAssignmentRange
                                }
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                {t('Add Range')}
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {assignmentRanges.length ===
                            0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-center">
                                <UserRoundCog className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

                                <p className="font-medium">
                                    {t(
                                        'No user assignment ranges'
                                    )}
                                </p>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t(
                                        'Imported leads will remain unassigned unless you add a row range.'
                                    )}
                                </p>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={
                                        addAssignmentRange
                                    }
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t(
                                        'Add First Range'
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {assignmentRanges.map(
                                    (
                                        range,
                                        index
                                    ) => (
                                        <div
                                            key={
                                                range.id
                                            }
                                            className="grid gap-3 rounded-lg border p-4 md:grid-cols-[120px_120px_minmax(220px,1fr)_auto] md:items-end"
                                        >
                                            <div>
                                                <label className="mb-2 block text-sm font-medium">
                                                    {t(
                                                        'From Row'
                                                    )}
                                                </label>

                                                <Input
                                                    type="number"
                                                    min={1}
                                                    step={1}
                                                    disabled={
                                                        processing
                                                    }
                                                    value={
                                                        range.from_row
                                                    }
                                                    placeholder="1"
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateAssignmentRange(
                                                            range.id,
                                                            'from_row',
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium">
                                                    {t(
                                                        'To Row'
                                                    )}
                                                </label>

                                                <Input
                                                    type="number"
                                                    min={1}
                                                    step={1}
                                                    disabled={
                                                        processing
                                                    }
                                                    value={
                                                        range.to_row
                                                    }
                                                    placeholder="100"
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateAssignmentRange(
                                                            range.id,
                                                            'to_row',
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium">
                                                    {t(
                                                        'Assign User'
                                                    )}
                                                </label>

                                                <Select
                                                    value={
                                                        range.user_id
                                                    }
                                                    disabled={
                                                        processing
                                                    }
                                                    onValueChange={(
                                                        value
                                                    ) =>
                                                        updateAssignmentRange(
                                                            range.id,
                                                            'user_id',
                                                            value
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue
                                                            placeholder={t(
                                                                'Select user'
                                                            )}
                                                        />
                                                    </SelectTrigger>

                                                    <SelectContent searchable>
                                                        {users.map(
                                                            (
                                                                user
                                                            ) => (
                                                                <SelectItem
                                                                    key={
                                                                        user.id
                                                                    }
                                                                    value={String(
                                                                        user.id
                                                                    )}
                                                                >
                                                                    {
                                                                        user.name
                                                                    }
                                                                    {user.email
                                                                        ? ` — ${user.email}`
                                                                        : ''}
                                                                </SelectItem>
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                disabled={
                                                    processing
                                                }
                                                className="text-destructive hover:text-destructive"
                                                onClick={() =>
                                                    removeAssignmentRange(
                                                        range.id
                                                    )
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />

                                                <span className="sr-only">
                                                    {t(
                                                        'Remove range'
                                                    )}
                                                </span>
                                            </Button>

                                            <div className="md:col-span-4">
                                                <p className="text-xs text-muted-foreground">
                                                    {t(
                                                        'Range'
                                                    )}{' '}
                                                    {index + 1}
                                                    {range.from_row &&
                                                        range.to_row
                                                        ? `: ${range.from_row}–${range.to_row}`
                                                        : ''}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        {rangeErrors.map(
                            (message) => (
                                <div
                                    key={message}
                                    className="flex items-start gap-2 text-sm text-destructive"
                                >
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>
                                        {message}
                                    </span>
                                </div>
                            )
                        )}
                    </CardContent>
                </Card>

                {(errors.column_mapping ||
                    errors.assignment_ranges) && (
                        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                            <div className="space-y-1 text-sm">
                                {errors.column_mapping && (
                                    <p>
                                        {
                                            errors.column_mapping
                                        }
                                    </p>
                                )}

                                {errors.assignment_ranges && (
                                    <p>
                                        {
                                            errors.assignment_ranges
                                        }
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">
                            {t(
                                'Map CSV Columns'
                            )}
                        </CardTitle>

                        <CardDescription>
                            {t(
                                'Choose the CRM field directly above each CSV column. Matching headers are selected automatically.'
                            )}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="mb-4 flex flex-wrap gap-2">
                            {requiredFields.map(
                                (field) => {
                                    const mapped =
                                        selectedFields.includes(
                                            field.key
                                        );

                                    return (
                                        <Badge
                                            key={
                                                field.key
                                            }
                                            variant={
                                                mapped
                                                    ? 'default'
                                                    : 'destructive'
                                            }
                                        >
                                            {mapped ? (
                                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                            ) : (
                                                <AlertCircle className="mr-1 h-3 w-3" />
                                            )}

                                            {
                                                field.label
                                            }
                                        </Badge>
                                    );
                                }
                            )}
                        </div>

                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full min-w-[900px] text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="sticky left-0 z-20 w-16 min-w-16 border-r bg-muted/50 px-3 py-3 text-left">
                                            #
                                        </th>

                                        {preview.headers.map(
                                            (header) => (
                                                <th
                                                    key={
                                                        header.key
                                                    }
                                                    className="min-w-[210px] border-r p-3 text-left align-top last:border-r-0"
                                                >
                                                    <p
                                                        className="mb-2 truncate font-semibold"
                                                        title={
                                                            header.label
                                                        }
                                                    >
                                                        {
                                                            header.label
                                                        }
                                                    </p>

                                                    <Select
                                                        value={
                                                            data
                                                                .column_mapping[
                                                            String(
                                                                header.index
                                                            )
                                                            ] ??
                                                            IGNORE_VALUE
                                                        }
                                                        disabled={
                                                            processing
                                                        }
                                                        onValueChange={(
                                                            value
                                                        ) =>
                                                            updateColumnMapping(
                                                                header.index,
                                                                value
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger className="h-9 bg-background">
                                                            <SelectValue
                                                                placeholder={t(
                                                                    'Select field'
                                                                )}
                                                            />
                                                        </SelectTrigger>

                                                        <SelectContent>
                                                            <SelectItem
                                                                value={
                                                                    IGNORE_VALUE
                                                                }
                                                            >
                                                                {t(
                                                                    'Ignore column'
                                                                )}
                                                            </SelectItem>

                                                            {crmFields.map(
                                                                (
                                                                    field
                                                                ) => (
                                                                    <SelectItem
                                                                        key={
                                                                            field.key
                                                                        }
                                                                        value={
                                                                            field.key
                                                                        }
                                                                    >
                                                                        {
                                                                            field.label
                                                                        }
                                                                        {field.required
                                                                            ? ' *'
                                                                            : ''}
                                                                    </SelectItem>
                                                                )
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </th>
                                            )
                                        )}
                                    </tr>
                                </thead>

                                <tbody className="divide-y">
                                    {preview.rows.map(
                                        (
                                            row,
                                            previewIndex
                                        ) => (
                                            <tr
                                                key={
                                                    row.row_number
                                                }
                                                className="hover:bg-muted/20"
                                            >
                                                <td className="sticky left-0 z-10 border-r bg-background px-3 py-3 text-muted-foreground">
                                                    {previewIndex +
                                                        1}
                                                </td>

                                                {preview.headers.map(
                                                    (
                                                        header
                                                    ) => {
                                                        const value =
                                                            row
                                                                .values[
                                                            header
                                                                .index
                                                            ] ??
                                                            '';

                                                        return (
                                                            <td
                                                                key={`${row.row_number}-${header.key}`}
                                                                className="max-w-[280px] border-r px-3 py-3 last:border-r-0"
                                                                title={
                                                                    value
                                                                }
                                                            >
                                                                <span className="block truncate">
                                                                    {value ||
                                                                        '-'}
                                                                </span>
                                                            </td>
                                                        );
                                                    }
                                                )}
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* <div className="mt-4 flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                            <p className="text-sm text-muted-foreground">
                                {t(
                                    'The displayed row numbers exclude the CSV header. User assignment row 1 means the first lead data row.'
                                )}
                            </p>
                        </div> */}
                    </CardContent>
                </Card>

                <div className="sticky bottom-0 z-20 bg-background/95 p-4 backdrop-blur">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            {canContinue ? (
                                <div className="flex items-center gap-2 text-sm text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4" />

                                    <span>
                                        {t(
                                            'Required fields and assignment ranges are valid.'
                                        )}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-start gap-2 text-sm text-destructive">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                                    <span>
                                        {missingRequiredFields.length >
                                            0
                                            ? t(
                                                'Map Name, Subject and Phone before continuing.'
                                            )
                                            : hasDuplicateFields
                                                ? t(
                                                    'A CRM field cannot be selected more than once.'
                                                )
                                                : t(
                                                    'Fix the user assignment ranges before continuing.'
                                                )}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={processing}
                                onClick={() =>
                                    router.get(
                                        route(
                                            'lead.leads.import.index'
                                        )
                                    )
                                }
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t('Back')}
                            </Button>

                            <Button
                                type="submit"
                                disabled={
                                    !canContinue ||
                                    processing
                                }
                            >
                                {processing ? (
                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <ChevronRight className="mr-2 h-4 w-4" />
                                )}

                                {t(
                                    'Continue to Import Settings'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}
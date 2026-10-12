import React, { useEffect, useMemo, useState } from "react";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import { useTranslation } from "react-i18next";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import PreviewModal from "@/pages/Proposal/components/Preview/PreviewModal";
import { scopeAndSanitizeDocumentHtml } from "@/pages/Proposal/components/Preview/helpers";
import MediaPicker from "@/components/MediaPicker";
import {
    ArrowLeft,
    Check,
    Copy,
    Eye,
    Image as ImageIcon,
    Info,
    Save,
} from "lucide-react";
import { toast } from "sonner";

export interface VariableGroup {
    title: string;
    items: {
        label: string;
        key: string;
    }[];
}

export interface PageData {
    id?: number | string;
    title?: string;
    content?: string;
    background_image?: string;
    sort_order?: number;
    is_active?: boolean | number;
    page_type?: string;
}

export interface ProposalPageFormProps {
    mode: "create" | "edit";
    page?: PageData;
    settings?: {
        template_color?: string;
        background_image?: string;
        logo_image?: string;
        company_logo?: string;
        show_logo?: boolean | string | number;
        header_logo_align?: string;
        [key: string]: any;
    } | null;
    nextSortOrder?: number;
    variableGroups: VariableGroup[];
    replaceShortcodes: (
        content: string,
        context: {
            settings?: any;
            isPageSetup?: boolean;
        },
    ) => string;
    storeRoute?: string;
    updateRoute?: string;
    backRoute: string;
    breadcrumbs: {
        label: string;
        url?: string;
    }[];
    pageTitle: string;
}

type ContentEditorType = "text" | "html";

export default function ProposalPageForm({
    mode,
    page,
    settings,
    nextSortOrder,
    variableGroups,
    replaceShortcodes,
    storeRoute,
    updateRoute,
    backRoute,
    breadcrumbs,
    pageTitle,
}: ProposalPageFormProps) {
    const { t } = useTranslation();
    const pageProps = usePage<any>()?.props || {};

    const templateColor = settings?.template_color || "#E9591C";
    const initialPageContent = page?.content || "";
    const initialEditorType: ContentEditorType =
        page?.page_type === "html" || page?.page_type === "custom"
            ? "html"
            : "text";

    const [contentEditorType, setContentEditorType] = useState<ContentEditorType>(initialEditorType);
    const [textEditorContent, setTextEditorContent] = useState<string>(() =>
        initialEditorType === "text" ? initialPageContent : ""
    );
    const [htmlEditorContent, setHtmlEditorContent] = useState<string>(() =>
        initialEditorType === "html" ? initialPageContent : ""
    );
    const [textEditorKey, setTextEditorKey] = useState(0);

    const activeContent = contentEditorType === "html" ? htmlEditorContent : textEditorContent;

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const hasCustomBackground = Boolean(
        page?.background_image && String(page.background_image).trim() !== ""
    );
    const [useCustomBackground, setUseCustomBackground] = useState(hasCustomBackground);

    useEffect(() => {
        setUseCustomBackground(
            Boolean(page?.background_image && String(page.background_image).trim() !== "")
        );
    }, [page?.background_image]);

    const [copiedVariableKey, setCopiedVariableKey] = useState<string | null>(null);

    const { data, setData, post, put, processing, errors, transform } = useForm({
        title: page?.title || (nextSortOrder ? `Page ${nextSortOrder}` : "Page 1"),
        content: page?.content || "",
        page_type: page?.page_type || "general",
        background_image: page?.background_image || "",
        sort_order: page?.sort_order || nextSortOrder || 1,
        is_active: page?.is_active !== undefined ? Boolean(page.is_active) : true,
    });

    const isFixedPage = page?.page_type === "otc" || page?.page_type === "mrc";

    const processedPreviewContent = useMemo(() => {
        if (!activeContent) return "";
        const shortcodeReplacedContent = replaceShortcodes(activeContent, {
            settings,
            isPageSetup: true,
        });
        return scopeAndSanitizeDocumentHtml(shortcodeReplacedContent);
    }, [activeContent, replaceShortcodes, settings, pageProps]);

    const handleEditorTypeChange = (editorType: ContentEditorType) => {
        if (editorType === contentEditorType) return;
        setContentEditorType(editorType);
        if (editorType === "text") {
            setTextEditorKey((previousKey) => previousKey + 1);
        }
    };

    const handlePreviewOpen = () => {
        setIsPreviewOpen(true);
    };

    const handleVariableCopy = async (variableKey: string) => {
        const variableText = `{${variableKey}}`;
        try {
            await navigator.clipboard.writeText(variableText);
            setCopiedVariableKey(variableKey);
            toast.success(t("Variable copied: {{var}}", { var: variableText }));
            window.setTimeout(() => setCopiedVariableKey(null), 1500);
        } catch {
            toast.error(t("Failed to copy variable. Please try again."));
        }
    };

    const handleBackgroundModeToggle = () => {
        setUseCustomBackground((previousValue) => !previousValue);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        transform((currentFormData) => {
            const isFixedType =
                currentFormData.page_type === "otc" ||
                currentFormData.page_type === "mrc" ||
                currentFormData.page_type === "other-details";

            const determinedPageType = isFixedType
                ? currentFormData.page_type
                : contentEditorType === "html"
                    ? "html"
                    : "general";

            return {
                ...currentFormData,
                content: activeContent || "",
                page_type: determinedPageType,
                background_image: useCustomBackground ? currentFormData.background_image || "" : "",
            };
        });

        const submitOptions = {
            onSuccess: () => {
                toast.success(
                    mode === "create"
                        ? t("Proposal page created successfully.")
                        : t("Proposal page updated successfully.")
                );
            },
            onError: (formErrors: any) => {
                if (formErrors?.sort_order) {
                    toast.error(formErrors.sort_order);
                    return;
                }
                if (formErrors?.title) {
                    toast.error(formErrors.title);
                    return;
                }
                toast.error(
                    mode === "create"
                        ? t("Failed to create page. Please check errors.")
                        : t("Failed to update page. Please check errors.")
                );
            },
        };

        if (mode === "create" && storeRoute) {
            post(storeRoute, submitOptions);
            return;
        }

        if (mode === "edit" && updateRoute) {
            put(updateRoute, submitOptions);
        }
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={breadcrumbs}
            pageTitle={pageTitle}
            pageActions={
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.visit(backRoute)}
                >
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    {t("Back")}
                </Button>
            }
        >
            <Head title={pageTitle} />

            <div className="grid grid-cols-12 items-start gap-6">
                {/* LEFT COLUMN: AVAILABLE VARIABLES */}
                <div className="col-span-12 space-y-4 lg:sticky lg:top-4 lg:col-span-3">
                    <Card className="border-border/70 shadow-xs">
                        <CardHeader className="border-b bg-muted/20 p-3.5 pb-2.5">
                            <CardTitle className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                <span>{t("Available Variables")}</span>
                                <span className="text-[10px] font-normal lowercase text-muted-foreground">
                                    {t("click to copy")}
                                </span>
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="max-h-[calc(100vh-180px)] space-y-3.5 overflow-y-auto p-3 pr-1.5">
                            {variableGroups.map((variableGroup) => (
                                <div key={variableGroup.title} className="space-y-1">
                                    <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {t(variableGroup.title)}
                                    </div>

                                    <div className="space-y-0.5">
                                        {variableGroup.items.map(({ label, key }) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => handleVariableCopy(key)}
                                                title={t("Click to copy")}
                                                className="group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs leading-tight transition-colors hover:bg-muted/70"
                                            >
                                                <span className="max-w-[130px] truncate text-[11px] text-slate-600 dark:text-slate-400">
                                                    {t(label)}:
                                                </span>

                                                <span className="flex shrink-0 items-center gap-1">
                                                    <span className="font-mono text-[11px] font-medium text-primary group-hover:underline">
                                                        {`{${key}}`}
                                                    </span>

                                                    {copiedVariableKey === key ? (
                                                        <Check className="h-3 w-3 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                                                    )}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN: PAGE FORM */}
                <div className="col-span-12 space-y-6 lg:col-span-9">
                    <Card className="border-border/70 shadow-xs">
                        <CardContent className="p-5 sm:p-6">
                            <form id={`${mode}-proposal-page-form`} onSubmit={handleSubmit} className="space-y-5">
                                {/* PAGE TITLE */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="page-title" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        {t("Page Title")}{" "}
                                        <span className="text-red-500">*</span>
                                    </Label>

                                    <Input
                                        id="page-title"
                                        value={data.title}
                                        disabled={isFixedPage}
                                        placeholder={t("e.g. Terms & Conditions")}
                                        onChange={(event) => setData("title", event.target.value)}
                                        className={errors.title ? "border-red-500" : ""}
                                    />

                                    {errors.title && (
                                        <p className="mt-1 text-xs text-red-500">{errors.title}</p>
                                    )}
                                </div>

                                {/* SORT ORDER & STATUS */}
                                <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="page-sort-order" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                            {t("Sort Order")}{" "}
                                            <span className="text-red-500">*</span>
                                        </Label>

                                        <Input
                                            id="page-sort-order"
                                            type="number"
                                            min={1}
                                            value={data.sort_order}
                                            onChange={(event) =>
                                                setData("sort_order", parseInt(event.target.value, 10) || 1)
                                            }
                                            className={errors.sort_order ? "border-red-500" : ""}
                                        />

                                        {errors.sort_order && (
                                            <p className="mt-1 text-xs text-red-500">{errors.sort_order}</p>
                                        )}
                                    </div>

                                    <div className="flex h-10 items-center justify-between rounded-md border border-input bg-muted/20 px-3 py-2">
                                        <Label htmlFor="page-is-active" className="cursor-pointer select-none text-xs font-semibold">
                                            {t("Active")}
                                        </Label>

                                        <Switch
                                            id="page-is-active"
                                            checked={Boolean(data.is_active)}
                                            onCheckedChange={(isChecked) => setData("is_active", isChecked)}
                                        />
                                    </div>
                                </div>

                                {/* BACKGROUND SETTINGS */}
                                <div className="space-y-3 rounded-lg border p-3.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ImageIcon className="h-4 w-4 text-primary" />
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                {t("Page Background Image")}
                                            </span>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={handleBackgroundModeToggle}
                                        >
                                            {useCustomBackground
                                                ? t("Use Default Background")
                                                : t("Upload Custom Background")}
                                        </Button>
                                    </div>

                                    {useCustomBackground && (
                                        <div className="space-y-2 border-t pt-2">
                                            <MediaPicker
                                                id="bg-image"
                                                value={data.background_image}
                                                onChange={(selectedImage) =>
                                                    setData(
                                                        "background_image",
                                                        typeof selectedImage === "string"
                                                            ? selectedImage
                                                            : selectedImage?.[0] || ""
                                                    )
                                                }
                                                placeholder={t("Choose background image from library...")}
                                                showPreview
                                            />

                                            <div className="inline-flex items-center gap-1.5 rounded border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-300">
                                                <Info className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                                <span>{t("Recommended size: A4 210mm × 297mm (JPG, PNG, WebP).")}</span>
                                            </div>

                                            {errors.background_image && (
                                                <p className="mt-1 text-xs text-red-500">{errors.background_image}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* PAGE CONTENT */}
                                <div className="space-y-2 pt-1">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-4">
                                            <Label htmlFor="page-content" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                {t("Page Content")}
                                            </Label>

                                            <Select
                                                value={contentEditorType}
                                                onValueChange={(value: ContentEditorType) => handleEditorTypeChange(value)}
                                            >
                                                <SelectTrigger className="h-9 w-[130px] text-xs font-medium">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="text" className="text-xs">
                                                        {t("Text Editor")}
                                                    </SelectItem>
                                                    <SelectItem value="html" className="text-xs">
                                                        {t("HTML Page")}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* PREVIEW BUTTON */}
                                        <div className="flex items-center rounded-md border border-border">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="inline-flex h-7 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-medium shadow-none transition-all hover:bg-secondary/80"
                                                onClick={handlePreviewOpen}
                                                title={t("View exact A4 HTML and CSS rendering")}
                                            >
                                                <Eye className="h-3.5 w-3.5 text-primary" />
                                                <span>{t("Preview")}</span>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* TEXT EDITOR */}
                                    {contentEditorType === "text" && (
                                        <div style={{ "--template-color": templateColor } as React.CSSProperties}>
                                            <RichTextEditor
                                                key={textEditorKey}
                                                content={textEditorContent}
                                                onChange={setTextEditorContent}
                                                placeholder={t("Enter page content with HTML and variables")}
                                                className="min-h-[320px] overflow-hidden rounded-lg border bg-white shadow-xs"
                                            />
                                        </div>
                                    )}

                                    {/* HTML EDITOR */}
                                    {contentEditorType === "html" && (
                                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
                                            <Textarea
                                                id="page-content-html"
                                                value={htmlEditorContent}
                                                onChange={(event) => setHtmlEditorContent(event.target.value)}
                                                placeholder={t("Paste or write full HTML and CSS here...")}
                                                rows={15}
                                                spellCheck={false}
                                                className="min-h-[320px] resize-y rounded-none border-none bg-white p-4 font-mono text-xs leading-relaxed text-slate-900 selection:bg-primary/20 focus-visible:outline-none focus-visible:ring-0"
                                            />
                                        </div>
                                    )}

                                    {errors.content && (
                                        <p className="mt-1 text-xs text-red-500">{errors.content}</p>
                                    )}
                                </div>

                                {/* SAVE BAR */}
                                <div className="flex justify-end gap-3 border-t pt-4">
                                    <Button type="submit" isLoading={processing} className="min-w-28 gap-2">
                                        {!processing && <Save className="h-4 w-4" />}
                                        {processing
                                            ? t("Saving...")
                                            : mode === "create"
                                                ? t("Create Page")
                                                : t("Save Changes")}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* PREVIEW MODAL */}
            <PreviewModal
                open={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                title={data.title || t("Preview")}
                pageTitle={data.title || t("Preview")}
                content={processedPreviewContent}
                backgroundImage={useCustomBackground ? data.background_image : ""}
                settings={settings}
                isPageSetup={true}
                customHtml={contentEditorType === "html"}
                showPrintButton={false}
            />
        </AuthenticatedLayout>
    );
}

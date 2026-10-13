import { useState, useRef, useEffect, useMemo } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Users, ChevronDown, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SystemSetupSidebar from '../SystemSetupSidebar';

interface DbUserGroup {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    users_count?: number;
}

interface PageProps {
    userGroups?: DbUserGroup[];
    settings?: Record<string, string>;
}

export default function TicketSettings() {
    const { t } = useTranslation();
    const { userGroups = [], settings = {} } = usePage<PageProps>().props;

    const [enableGroupAssignment, setEnableGroupAssignment] = useState<boolean>(
        settings.enable_group_assignment ? settings.enable_group_assignment === '1' : true
    );
    const [allowTicketPickup, setAllowTicketPickup] = useState<boolean>(
        settings.allow_ticket_pickup ? settings.allow_ticket_pickup === '1' : true
    );
    const [allowTicketForward, setAllowTicketForward] = useState<boolean>(() => {
        return settings && typeof settings === 'object' && 'allow_ticket_forward' in settings
            ? settings.allow_ticket_forward ? settings.allow_ticket_forward === '1' : true
            : (settings.allow_ticket_transfer ? settings.allow_ticket_transfer === '1' : true);
    });
    const [allowUserAssign, setAllowUserAssign] = useState<boolean>(() => {
        return settings && typeof settings === 'object' && 'allow_user_assign' in settings
            ? settings.allow_user_assign ? settings.allow_user_assign === '1' : true
            : true;
    });
    const [allowUnpickedTicketEdit, setAllowUnpickedTicketEdit] = useState<boolean>(() => {
        return settings && typeof settings === 'object' && 'allow_unpicked_ticket_edit' in settings
            ? settings.allow_unpicked_ticket_edit ? settings.allow_unpicked_ticket_edit === '1' : false
            : false;
    });
    const [enableAutoAssign, setEnableAutoAssign] = useState<boolean>(() => {
        return settings && typeof settings === 'object' && 'enable_auto_assign' in settings
            ? settings.enable_auto_assign ? settings.enable_auto_assign === '1' : false
            : false;
    });
    const [allowTicketDelete, setAllowTicketDelete] = useState<boolean>(() => {
        return settings && typeof settings === 'object' && 'allow_ticket_delete' in settings
            ? settings.allow_ticket_delete ? settings.allow_ticket_delete === '1' : true
            : true;
    });

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const groupOptions = useMemo(() => {
        const map: Record<string, { id: string; name: string; users: string }> = {};
        userGroups.forEach(g => {
            map[g.id.toString()] = {
                id: g.id.toString(),
                name: g.name,
                users: `${g.users_count ?? 0} members`
            };
        });
        return map;
    }, [userGroups]);

    const initialSelectedIds = useMemo(() => {
        if (settings.support_user_group_ids) {
            try {
                const parsed = JSON.parse(settings.support_user_group_ids);
                if (Array.isArray(parsed)) return parsed.map(String);
            } catch (e) {
                // fallthrough
            }
        }
        return [];
    }, [settings]);

    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(initialSelectedIds);

    useEffect(() => {
        if (settings.support_user_group_ids) {
            try {
                const parsed = JSON.parse(settings.support_user_group_ids);
                if (Array.isArray(parsed)) {
                    setSelectedGroupIds(parsed.map(String));
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
    }, [settings]);

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleGroupSelection = (id: string) => {
        setSelectedGroupIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const removeGroup = (id: string) => {
        setSelectedGroupIds(prev => prev.filter(item => item !== id));
    };

    const handleSave = () => {
        setIsLoading(true);

        router.post(route('support-ticket.system-setup.support-team.store'), {
            enable_group_assignment: enableGroupAssignment,
            allow_ticket_pickup: allowTicketPickup,
            allow_ticket_forward: allowTicketForward,
            allow_user_assign: allowUserAssign,
            allow_unpicked_ticket_edit: allowUnpickedTicketEdit,
            enable_auto_assign: enableAutoAssign,
            allow_ticket_delete: allowTicketDelete,
            support_user_group_ids: selectedGroupIds,
        }, {
            preserveScroll: true,
            onSuccess: (page) => {
                setIsLoading(false);
                const successMsg = (page.props.flash as any)?.success;
                const errorMsg = (page.props.flash as any)?.error;
                if (successMsg) {
                    toast.success(successMsg);
                } else if (errorMsg) {
                    toast.error(errorMsg);
                } else {
                    toast.success(t('Settings saved successfully.'));
                }
            },
            onError: () => {
                setIsLoading(false);
                toast.error(t('Failed to save settings.'));
            }
        });
    };

    const filteredOptions = Object.values(groupOptions).filter(group =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <TooltipProvider>
            <AuthenticatedLayout
                breadcrumbs={[
                    { label: t('Support Tickets'), url: route('support-ticket.dashboard') },
                    { label: t('System Setup') },
                    { label: t('Support Team') }
                ]}
                pageTitle={t('System Setup')}
            >
                <Head title={t('Support Team')} />

                <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-64 flex-shrink-0">
                        <SystemSetupSidebar activeItem="support-team" />
                    </div>

                    <div className="flex-1">
                        <Card className="shadow-sm">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-lg font-medium">{t('Support Team Setting')}</h3>
                                    </div>
                                    <Button size="sm" onClick={handleSave} disabled={isLoading} className="inline-flex items-center gap-1.5">
                                        <Save className="w-4 h-4" />
                                        {isLoading ? t('Saving...') : t('Save Changes')}
                                    </Button>
                                </div>

                                <div className="space-y-6">
                                    {/* Support User Group Selection Section */}
                                    <div className="space-y-4 pb-6 border-b border-border">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <h4 className="text-sm font-semibold text-foreground">{t('Support User Groups')}</h4>
                                                <p className="text-sm text-muted-foreground">{t('Select the groups that are allowed to handle support tickets.')}</p>
                                            </div>
                                        </div>

                                        {/* Multi-select Dropdown Container */}
                                        <div className="relative" ref={dropdownRef}>
                                            <div
                                                onClick={() => setIsDropdownOpen(prev => !prev)}
                                                className="w-full min-h-[46px] border border-input rounded-md bg-background px-3 py-1.5 flex items-center gap-2 flex-wrap cursor-pointer hover:border-accent focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1 transition-all"
                                            >
                                                {selectedGroupIds.length === 0 ? (
                                                    <span className="text-sm text-muted-foreground">{t('Select user groups...')}</span>
                                                ) : (
                                                    selectedGroupIds.map(id => (
                                                        <span
                                                            key={id}
                                                            className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded px-2 py-1 text-xs font-medium"
                                                        >
                                                            {groupOptions[id]?.name}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeGroup(id);
                                                                }}
                                                                className="text-primary/70 hover:text-primary leading-none"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </span>
                                                    ))
                                                )}

                                                <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground shrink-0" />
                                            </div>

                                            {/* Dropdown Options */}
                                            {isDropdownOpen && (
                                                <div className="absolute z-20 left-0 right-0 top-[calc(100%+6px)] bg-popover text-popover-foreground border border-border rounded-md shadow-lg overflow-hidden">
                                                    <div className="p-2 border-b border-border">
                                                        <Input
                                                            type="text"
                                                            placeholder={t('Search user groups...')}
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            className="h-8 text-sm"
                                                            autoFocus
                                                        />
                                                    </div>

                                                    <div className="max-h-56 overflow-y-auto divide-y divide-border">
                                                        {filteredOptions.length === 0 ? (
                                                            <div className="p-3 text-sm text-muted-foreground text-center">
                                                                {t('No user groups found.')}
                                                            </div>
                                                        ) : (
                                                            filteredOptions.map(group => (
                                                                <label
                                                                    key={group.id}
                                                                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 cursor-pointer text-sm"
                                                                >
                                                                    <Checkbox
                                                                        checked={selectedGroupIds.includes(group.id)}
                                                                        onCheckedChange={() => toggleGroupSelection(group.id)}
                                                                    />
                                                                    <div>
                                                                        <div className="font-medium text-foreground">{group.name}</div>
                                                                        <div className="text-xs text-muted-foreground">{group.users}</div>
                                                                    </div>
                                                                </label>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Current Selected Groups Cards */}
                                        <div className="pt-2">
                                            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                                {t('Selected Groups')}
                                            </h5>

                                            {selectedGroupIds.length === 0 ? (
                                                <div className="border border-dashed border-border rounded-md p-6 text-center text-sm text-muted-foreground">
                                                    {t('No support groups selected.')}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {selectedGroupIds.map(id => (
                                                        <div
                                                            key={id}
                                                            className="border border-border rounded-md p-3 flex items-center gap-3 bg-card"
                                                        >
                                                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                                                                <Users className="w-4 h-4" />
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-semibold text-foreground truncate">
                                                                    {groupOptions[id]?.name}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {groupOptions[id]?.users}
                                                                </div>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => removeGroup(id)}
                                                                className="text-muted-foreground hover:text-destructive p-1 rounded"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Permissions Section */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-1">{t('Action Permissions')}</h4>
                                        <p className="text-sm text-muted-foreground mb-4">{t('Configure permissions for group user.')}</p>

                                        {/* 5 Action Permission Cards (4 cards per row layout) */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                                            {/* Card: Allow Ticket Pickup */}
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger asChild>
                                                    <div className="p-3 border border-border rounded-lg bg-card/60 hover:bg-card hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs">
                                                        <h4 className="text-xs font-semibold text-foreground leading-snug min-w-0 truncate">
                                                            {t('Allow Ticket Pickup')}
                                                        </h4>
                                                        <Switch
                                                            checked={allowTicketPickup}
                                                            onCheckedChange={setAllowTicketPickup}
                                                            className="shrink-0 scale-90"
                                                        />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs text-xs">
                                                    <p className="font-semibold mb-0.5">{t('Allow Ticket Pickup')}</p>
                                                    <p className="text-muted-foreground">{t('Allow support team members to pick up unassigned tickets.')}</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            {/* Card: Allow Ticket Forward */}
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger asChild>
                                                    <div className="p-3 border border-border rounded-lg bg-card/60 hover:bg-card hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs">
                                                        <h4 className="text-xs font-semibold text-foreground leading-snug min-w-0 truncate">
                                                            {t('Allow Ticket Forward')}
                                                        </h4>
                                                        <Switch
                                                            checked={allowTicketForward}
                                                            onCheckedChange={setAllowTicketForward}
                                                            className="shrink-0 scale-90"
                                                        />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs text-xs">
                                                    <p className="font-semibold mb-0.5">{t('Allow Ticket Forward')}</p>
                                                    <p className="text-muted-foreground">{t('Allow support members to forward or re-assign tickets to other users or groups.')}</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            {/* Card: User Assign on Forward */}
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger asChild>
                                                    <div className="p-3 border border-border rounded-lg bg-card/60 hover:bg-card hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs">
                                                        <h4 className="text-xs font-semibold text-foreground leading-snug min-w-0 truncate">
                                                            {t('User Assign on Forward')}
                                                        </h4>
                                                        <Switch
                                                            checked={allowUserAssign}
                                                            onCheckedChange={setAllowUserAssign}
                                                            className="shrink-0 scale-90"
                                                        />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs text-xs">
                                                    <p className="font-semibold mb-0.5">{t('User Assign on Forward')}</p>
                                                    <p className="text-muted-foreground">{t('Allow team members to assign tickets directly to other team members.')}</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            {/* Card: Auto Assign Ticket */}
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger asChild>
                                                    <div className="p-3 border border-border rounded-lg bg-card/60 hover:bg-card hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs">
                                                        <h4 className="text-xs font-semibold text-foreground leading-snug min-w-0 truncate">
                                                            {t('Auto Assign Ticket')}
                                                        </h4>
                                                        <Switch
                                                            checked={enableAutoAssign}
                                                            onCheckedChange={setEnableAutoAssign}
                                                            className="shrink-0 scale-90"
                                                        />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs text-xs">
                                                    <p className="font-semibold mb-0.5">{t('Auto Assign Ticket')}</p>
                                                    <p className="text-muted-foreground">{t('Automatically assign new tickets to group members equally.')}</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            {/* Card: Allow Edit Unpicked Ticket */}
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger asChild>
                                                    <div className="p-3 border border-border rounded-lg bg-card/60 hover:bg-card hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs">
                                                        <h4 className="text-xs font-semibold text-foreground leading-snug min-w-0 truncate">
                                                            {t('Allow Edit Unpicked Ticket')}
                                                        </h4>
                                                        <Switch
                                                            checked={allowUnpickedTicketEdit}
                                                            onCheckedChange={setAllowUnpickedTicketEdit}
                                                            className="shrink-0 scale-90"
                                                        />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs text-xs">
                                                    <p className="font-semibold mb-0.5">{t('Allow Edit Unpicked Ticket')}</p>
                                                    <p className="text-muted-foreground">{t('Allow support members to edit or reply to tickets before picking them.')}</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            {/* Card: Allow Ticket Delete */}
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger asChild>
                                                    <div className="p-3 border border-border rounded-lg bg-card/60 hover:bg-card hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs">
                                                        <h4 className="text-xs font-semibold text-foreground leading-snug min-w-0 truncate">
                                                            {t('Allow Ticket Delete')}
                                                        </h4>
                                                        <Switch
                                                            checked={allowTicketDelete}
                                                            onCheckedChange={setAllowTicketDelete}
                                                            className="shrink-0 scale-90"
                                                        />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs text-xs">
                                                    <p className="font-semibold mb-0.5">{t('Allow Ticket Delete')}</p>
                                                    <p className="text-muted-foreground">{t('Allow support team members to delete tickets.')}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </AuthenticatedLayout>
        </TooltipProvider>
    );
}

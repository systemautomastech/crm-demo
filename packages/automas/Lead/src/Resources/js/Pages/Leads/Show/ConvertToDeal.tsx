import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { RefreshCw, CheckCircle, UserPlus, Users, UserX, Briefcase, Tag, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputError } from '@/components/ui/input-error';
import { Lead } from '../types';

interface Client {
    id: number;
    name: string;
    email: string;
}

interface ConvertToDealProps {
    lead: Lead;
    deal?: {
        id: number;
        is_active: boolean;
    };
    buttonClassName?: string;
}

export default function ConvertToDeal({ lead, deal, buttonClassName }: ConvertToDealProps) {
    const { t } = useTranslation();
    const { organizationTypes: pageOrgTypes } = usePage<any>().props;
    const [open, setOpen] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [orgTypes, setOrgTypes] = useState<any[]>(Array.isArray(pageOrgTypes) ? pageOrgTypes : []);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const [formData, setFormData] = useState({
        name: lead.subject || lead.name,
        price: '0',
        status: 'Active',
        organization_type: lead.organization_type || '',
        client_check: 'none',
        clients: '',
        client_name: lead.name || '',
        client_email: lead.email || '',
        client_phone: lead.phone || '',
        client_password: '',
        client_address: '',
        client_city: '',
        client_state: '',
        client_country: '',
        client_zip_code: '',
        is_transfer: ['products', 'sources', 'files', 'discussion', 'notes', 'calls', 'emails']
    });

    useEffect(() => {
        if (open && orgTypes.length === 0) {
            fetch(route('lead.organization-types.index'), {
                headers: { 'Accept': 'application/json' }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setOrgTypes(data);
                    }
                })
                .catch(() => { });
        }
    }, [open]);

    useEffect(() => {
        if (formData.client_check === 'exist') {
            fetch(route('lead.leads.existing-clients'))
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(data => setClients(Array.isArray(data) ? data : []))
                .catch(() => {
                    setClients([]);
                });
        }
    }, [formData.client_check]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        router.post(route('lead.leads.convert-to-deal', lead.id), formData, {
            onSuccess: () => {
                setOpen(false);
                setErrors({});
                setProcessing(false);
            },
            onError: (errs) => {
                setErrors(errs);
                setProcessing(false);
            }
        });
    };

    const handleTransferChange = (value: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            is_transfer: checked
                ? [...prev.is_transfer, value]
                : prev.is_transfer.filter(item => item !== value)
        }));
    };

    if (deal) {
        return (
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Link href={route('lead.deals.show', deal.id)}>
                            <Button size="sm" variant={buttonClassName ? 'ghost' : 'default'} className={buttonClassName}>
                                <CheckCircle className="h-4 w-4" />
                            </Button>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                        <span className="font-normal">{t('Already Converted To Deal')}</span>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            <Button size="sm" variant={buttonClassName ? 'ghost' : 'default'} className={buttonClassName}>
                                <RefreshCw className="h-4 w-4 mr-1.5" />
                            </Button>
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <span className="font-normal">{t('Convert Lead to Deal')}</span>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <DialogContent className="max-w-2xl">
                <DialogHeader className="border-b pb-3">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Briefcase className="h-5 w-5 text-primary" />
                        {t('Convert Lead to Deal')}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5 py-2">
                    {/* Deal Core Information */}
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-4">
                        <h3 className="font-semibold text-sm text-foreground/80 flex items-center gap-1.5">
                            <Tag className="h-4 w-4 text-primary" />
                            {t('Deal Details')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name" className="text-xs font-medium">{t('Deal Name')}</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder={t('Enter Deal Name')}
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div>
                                <CurrencyInput
                                    label={t('Price')}
                                    value={formData.price}
                                    onChange={(value) => setFormData(prev => ({ ...prev, price: value }))}
                                    error={errors.price}
                                />
                            </div>

                            <div>
                                <Label htmlFor="status" className="text-xs font-medium">{t('Initial Deal Status')}</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder={t('Select Initial Status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">{t('Active')}</SelectItem>
                                        <SelectItem value="Won">{t('Won')}</SelectItem>
                                        <SelectItem value="Loss">{t('Loss')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.status} />
                            </div>

                            <div>
                                <Label htmlFor="organization_type" required className="text-xs font-medium">{t('Organization Type')}</Label>
                                <Select
                                    value={formData.organization_type}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, organization_type: value }))}
                                >
                                    <SelectTrigger id="organization_type">
                                        <SelectValue placeholder={t('Select Organization Type')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {orgTypes.map((item: any) => (
                                            <SelectItem key={item.id ?? item.name ?? item} value={item.name ?? item}>
                                                {item.name ?? item}
                                            </SelectItem>
                                        ))}
                                        {formData.organization_type && !orgTypes.some((o: any) => (o.name ?? o) === formData.organization_type) && (
                                            <SelectItem key="custom_org_type" value={formData.organization_type}>
                                                {formData.organization_type}
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.organization_type} />
                            </div>
                        </div>
                    </div>

                    {/* Customer Selection / Creation */}
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-4">
                        <h3 className="font-semibold text-sm text-foreground/80 flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-primary" />
                            {t('Customer Profile')}
                        </h3>

                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'none', label: t('No Client'), icon: UserX },
                                { id: 'exist', label: t('Existing Client'), icon: Users },
                                { id: 'new', label: t('New Client'), icon: UserPlus },
                            ].map((type) => {
                                const IconComponent = type.icon;
                                const isSelected = formData.client_check === type.id;
                                return (
                                    <button
                                        type="button"
                                        key={type.id}
                                        onClick={() => setFormData(prev => ({ ...prev, client_check: type.id }))}
                                        className={`flex flex-col items-center justify-center p-3 rounded-md border text-xs font-medium transition-all ${isSelected
                                            ? 'border-primary bg-primary/10 text-primary font-semibold shadow-sm'
                                            : 'border-border bg-background hover:bg-accent text-muted-foreground'
                                            }`}
                                    >
                                        <IconComponent className={`h-4 w-4 mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span>{type.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <InputError message={errors.client_check} />

                        {formData.client_check === 'exist' && (
                            <div>
                                <Label htmlFor="clients" className="text-xs font-medium">{t('Select Client')}</Label>
                                <Select value={formData.clients} onValueChange={(value) => setFormData(prev => ({ ...prev, clients: value }))}>
                                    <SelectTrigger id="clients">
                                        <SelectValue placeholder={t('Select Client')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {clients.map((client) => (
                                            <SelectItem key={client.id} value={client.email}>
                                                {client.name} ({client.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.clients} />
                            </div>
                        )}

                        {formData.client_check === 'new' && (
                            <div className="space-y-4 pt-2 border-t border-border/40">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="client_name" className="text-xs font-medium">{t('Client Name')}</Label>
                                        <Input
                                            id="client_name"
                                            value={formData.client_name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                                            placeholder={t('Enter Client Name')}
                                            required
                                        />
                                        <InputError message={errors.client_name} />
                                    </div>
                                    <div>
                                        <Label htmlFor="client_email" className="text-xs font-medium">{t('Client Email')}</Label>
                                        <Input
                                            id="client_email"
                                            type="email"
                                            value={formData.client_email}
                                            onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                                            placeholder={t('Enter Client Email')}
                                            required
                                        />
                                        <InputError message={errors.client_email} />
                                    </div>
                                    <div>
                                        <Label htmlFor="client_phone" className="text-xs font-medium">{t('Phone Number')}</Label>
                                        <Input
                                            id="client_phone"
                                            type="tel"
                                            value={formData.client_phone}
                                            onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                                            placeholder={t('Enter Phone Number')}
                                        />
                                        <InputError message={errors.client_phone} />
                                    </div>
                                    <div>
                                        <Label htmlFor="client_password" className="text-xs font-medium">{t('Login Password')}</Label>
                                        <Input
                                            id="client_password"
                                            type="password"
                                            value={formData.client_password}
                                            onChange={(e) => setFormData(prev => ({ ...prev, client_password: e.target.value }))}
                                            placeholder={t('Set Client Password (Optional)')}
                                        />
                                        <InputError message={errors.client_password} />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {t('Billing & Shipping Address')}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="md:col-span-2">
                                            <Input
                                                id="client_address"
                                                value={formData.client_address}
                                                onChange={(e) => setFormData(prev => ({ ...prev, client_address: e.target.value }))}
                                                placeholder={t('Street Address')}
                                            />
                                            <InputError message={errors.client_address} />
                                        </div>
                                        <div>
                                            <Input
                                                id="client_city"
                                                value={formData.client_city}
                                                onChange={(e) => setFormData(prev => ({ ...prev, client_city: e.target.value }))}
                                                placeholder={t('City')}
                                            />
                                            <InputError message={errors.client_city} />
                                        </div>
                                        <div>
                                            <Input
                                                id="client_state"
                                                value={formData.client_state}
                                                onChange={(e) => setFormData(prev => ({ ...prev, client_state: e.target.value }))}
                                                placeholder={t('State / Province')}
                                            />
                                            <InputError message={errors.client_state} />
                                        </div>
                                        <div>
                                            <Input
                                                id="client_country"
                                                value={formData.client_country}
                                                onChange={(e) => setFormData(prev => ({ ...prev, client_country: e.target.value }))}
                                                placeholder={t('Country')}
                                            />
                                            <InputError message={errors.client_country} />
                                        </div>
                                        <div>
                                            <Input
                                                id="client_zip_code"
                                                value={formData.client_zip_code}
                                                onChange={(e) => setFormData(prev => ({ ...prev, client_zip_code: e.target.value }))}
                                                placeholder={t('Postal / Zip Code')}
                                            />
                                            <InputError message={errors.client_zip_code} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Transfer Lead Items */}
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-3">
                        <Label className="font-semibold text-sm text-foreground/80">{t('Copy Data From Lead')}</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { key: 'products', label: 'Products' },
                                { key: 'sources', label: 'Sources' },
                                { key: 'files', label: 'Files' },
                                { key: 'discussion', label: 'Discussion' },
                                { key: 'notes', label: 'Notes' },
                                { key: 'calls', label: 'Calls' },
                                { key: 'emails', label: 'Emails' }
                            ].map(item => (
                                <div key={item.key} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`is_transfer_${item.key}`}
                                        checked={formData.is_transfer.includes(item.key)}
                                        onCheckedChange={(checked) => handleTransferChange(item.key, checked as boolean)}
                                    />
                                    <Label htmlFor={`is_transfer_${item.key}`} className="text-xs cursor-pointer">{t(item.label)}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? t('Converting...') : t('Convert to Deal')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

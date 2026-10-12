import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm, usePage } from "@inertiajs/react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import InputError from "@/components/ui/input-error";
import { PhoneInputComponent } from "@/components/ui/phone-input";
import { EditUserProps, EditUserFormData } from './types';

export default function Edit({ user, onSuccess, roles = {} }: EditUserProps) {
    const { t } = useTranslation();
    const { auth } = usePage().props as any;
    const isSuperAdmin = auth.user?.type === 'superadmin';

    // Find initial role ID for the user
    const initialRoleId = user.roles && user.roles.length > 0
        ? String(user.roles[0].id)
        : (Object.entries(roles).find(([id, label]) => label.toLowerCase() === user.type?.toLowerCase() || id === user.type)?.[0] || '');

    const { data, setData, put, processing, errors } = useForm<EditUserFormData>({
        name: user.name,
        email: user.email,
        mobile_no: user.mobile_no || '',
        type: initialRoleId,
        is_enable_login: user.is_enable_login,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('users.update', user.id), {
            onSuccess: () => {
                onSuccess();
            }
        });
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('Edit User')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <Label htmlFor="edit_name">{t('Name')}</Label>
                    <Input
                        id="edit_name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder={t('Enter full name')}
                        required
                    />
                    <InputError message={errors.name} />
                </div>
                <div>
                    <Label htmlFor="edit_email">{t('Email')}</Label>
                    <Input
                        id="edit_email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder={t('Enter email address')}
                        required
                    />
                    <InputError message={errors.email} />
                </div>
                <div>
                    <PhoneInputComponent
                        label={t('Mobile Number')}
                        value={data.mobile_no}
                        onChange={(value) => setData('mobile_no', value)}
                        placeholder="+1234567890"
                        error={errors.mobile_no}
                    />
                </div>

                {!isSuperAdmin && Object.keys(roles).length > 0 && (
                    <div>
                        <Label htmlFor="edit_type">{t('Role')}</Label>
                        {Object.keys(roles).length === 1 ? (
                            <Input
                                id="edit_type"
                                value={roles[Object.keys(roles)[0]]}
                                disabled
                                className="border-input bg-muted/30 text-foreground opacity-100 disabled:opacity-100 cursor-not-allowed"
                            />
                        ) : (
                            <Select value={data.type || ''} onValueChange={(value) => setData('type', value)}>
                                <SelectTrigger id="edit_type">
                                    <SelectValue placeholder={t('Select Role')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(roles).map(([id, label]) => (
                                        <SelectItem key={id} value={String(id)}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <InputError message={errors.type} />
                    </div>
                )}

                <div>
                    <Label htmlFor="edit_is_enable_login">{t('Login Status')}</Label>
                    <Select value={data.is_enable_login ? "1" : "0"} onValueChange={(value) => setData('is_enable_login', value === "1")}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">{t('Enabled')}</SelectItem>
                            <SelectItem value="0">{t('Disabled')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <InputError message={errors.is_enable_login} />
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onSuccess}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" isLoading={processing}>
                        {processing ? t('Updating') : t('Update')}
                    </Button>
                </div>
            </form>
        </DialogContent>
    );
}
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InputError from '@/components/ui/input-error';
import { Users, X, Search } from 'lucide-react';
import { useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
}

interface CreateProps {
    users: User[];
    [key: string]: any;
}

export default function Create() {
    const { t } = useTranslation();
    const { users = [] } = usePage<CreateProps>().props;
    const [userSearch, setUserSearch] = useState('');

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        is_active: true as boolean,
        user_ids: [] as number[],
    });

    const filteredUsers = users.filter((u) =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
    );

    const selectedUsers = users.filter((u) => data.user_ids.includes(u.id));

    const toggleUser = (userId: number) => {
        if (data.user_ids.includes(userId)) {
            setData('user_ids', data.user_ids.filter((id) => id !== userId));
        } else {
            setData('user_ids', [...data.user_ids, userId]);
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('user-groups.store'));
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('User Management'), url: route('users.index') },
                { label: t('User Groups'), url: route('user-groups.index') },
                { label: t('Create Group') },
            ]}
            pageTitle={t('Create User Group')}
        >
            <Head title={t('Create User Group')} />

            <form onSubmit={submit} className="space-y-6 max-w-ful mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Group Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-base">{t('Group Information')}</CardTitle>
                                <div className="flex items-center gap-3 pt-1">
                                    <Switch
                                        id="is_active"
                                        checked={data.is_active}
                                        onCheckedChange={(v) => setData('is_active', v)}
                                    />
                                    <Label htmlFor="is_active" className="cursor-pointer">{t('Active')}</Label>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col sm:flex-row items-start gap-3">
                                    <div className="flex-1">
                                        <Label htmlFor="name">{t('Group Name')} <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder={t('e.g. North Region Delivery Team')}
                                            autoFocus
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="flex-1">
                                        <Label htmlFor="description">{t('Description')}</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder={t('Optional notes about this group...')}
                                            rows={3}
                                        />
                                        <InputError message={errors.description} />
                                    </div></div>
                            </CardContent>
                        </Card>

                        {/* Member Selection */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Select Members')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        className="pl-9"
                                        placeholder={t('Search users...')}
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                    />
                                </div>

                                {filteredUsers.length === 0 ? (
                                    <p className="text-sm text-center text-muted-foreground py-6">{t('No users found.')}</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                                        {filteredUsers.map((user) => {
                                            const selected = data.user_ids.includes(user.id);
                                            return (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    onClick={() => toggleUser(user.id)}
                                                    className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-colors ${selected
                                                        ? 'border-primary bg-primary/5 text-primary'
                                                        : 'border-border hover:bg-muted/50'
                                                        }`}
                                                >
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                                        }`}>
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-medium truncate">{user.name}</div>
                                                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                <InputError message={errors.user_ids} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Summary */}
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">{data.user_ids.length}</div>
                                        <div className="text-xs text-muted-foreground">{t('Members selected')}</div>
                                    </div>
                                </div>

                                {selectedUsers.length > 0 && (
                                    <div className="space-y-1">
                                        {selectedUsers.map((u) => (
                                            <div key={u.id} className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-muted/50">
                                                <span className="truncate">{u.name}</span>
                                                <button type="button" onClick={() => toggleUser(u.id)} className="text-muted-foreground hover:text-destructive ml-2 flex-shrink-0">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-col gap-2 pt-2">
                                    <Button type="submit" isLoading={processing} className="w-full">
                                        {processing ? t('Creating') : t('Create Group')}
                                    </Button>
                                    <Button type="button" variant="outline" className="w-full" onClick={() => router.visit(route('user-groups.index'))}>
                                        {t('Cancel')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}

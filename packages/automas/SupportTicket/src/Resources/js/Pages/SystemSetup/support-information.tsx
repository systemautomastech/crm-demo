import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useFlashMessages } from '@/hooks/useFlashMessages';
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { TimePicker } from '@/components/ui/time-picker';
import InputError from '@/components/ui/input-error';
import { Save } from "lucide-react";
import SystemSetupSidebar from "./SystemSetupSidebar";
import { PhoneInputComponent } from '@/components/ui/phone-input';

interface BusinessHour {
    day: string;
    is_open: boolean;
}

interface SupportInformationData {
    response_time: string;
    opening_hours: string;
    closing_hours: string;
    phone_support: string;
    business_hours: BusinessHour[];
}

interface SupportInformationProps {
    supportInformation: SupportInformationData;
}

export default function SupportInformation({ supportInformation }: SupportInformationProps) {
    const { t } = useTranslation();

    const [businessHours, setBusinessHours] = useState<BusinessHour[]>(
        supportInformation?.business_hours || [
            { day: 'Monday', is_open: true },
            { day: 'Tuesday', is_open: true },
            { day: 'Wednesday', is_open: true },
            { day: 'Thursday', is_open: true },
            { day: 'Friday', is_open: true },
            { day: 'Saturday', is_open: false },
            { day: 'Sunday', is_open: false }
        ]
    );

    const { data, setData, post, processing, errors } = useForm<SupportInformationData>({
        ...supportInformation,
        business_hours: businessHours
    });

    useFlashMessages();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('support-ticket.system-setup.support-information.store'));
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: t('Support Ticket'), url: route('support-tickets.index') },
                { label: t('System Setup'), url: route('support-ticket.system-setup.brand-settings.index') },
                { label: t('Support Information') }
            ]}
            pageTitle={t('System Setup')}
        >
            <Head title={t('Support Information')} />

            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-64 flex-shrink-0">
                    <SystemSetupSidebar activeItem="support-information" />
                </div>

                <div className="flex-1">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>{t('Support Information')}</CardTitle>
                                <Button type="submit" disabled={processing} form="support-information-form">
                                    <Save className="h-4 w-4 mr-2" />
                                    {processing ? t('Saving...') : t('Save Changes')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form id="support-information-form" onSubmit={submit} className="space-y-6">
                                <div>
                                    <Label htmlFor="response-time">{t('Response Time')}</Label>
                                    <Textarea
                                        id="response-time"
                                        value={data.response_time}
                                        onChange={(e) => setData('response_time', e.target.value)}
                                        placeholder={t('Enter response time information')}
                                        rows={3}
                                        required
                                    />
                                    <InputError message={errors.response_time} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label>{t('Opening Hours')}</Label>
                                        <TimePicker
                                            value={data.opening_hours}
                                            onChange={(value) => setData('opening_hours', value)}
                                            placeholder={t('Select opening time')}
                                            required
                                        />
                                        <InputError message={errors.opening_hours} />
                                    </div>
                                    <div>
                                        <Label>{t('Closing Hours')}</Label>
                                        <TimePicker
                                            value={data.closing_hours}
                                            onChange={(value) => setData('closing_hours', value)}
                                            placeholder={t('Select closing time')}
                                            required
                                        />
                                        <InputError message={errors.closing_hours} />
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-base font-medium mb-4 block">{t('Business Hours')}</Label>
                                    <div className="space-y-2">
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                                            <div key={day} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                                <Label className="font-medium">{t(day)}</Label>
                                                <Switch
                                                    checked={businessHours.find(h => h.day === day)?.is_open ?? true}
                                                    onCheckedChange={(checked) => {
                                                        const newHours = [...businessHours];
                                                        const existingIndex = newHours.findIndex(h => h.day === day);
                                                        if (existingIndex >= 0) {
                                                            newHours[existingIndex].is_open = checked;
                                                        } else {
                                                            newHours.push({ day, is_open: checked });
                                                        }
                                                        setBusinessHours(newHours);
                                                        setData('business_hours', newHours);
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <PhoneInputComponent
                                        label={t('Phone Support')}
                                        value={data.phone_support}
                                        onChange={(value) => setData('phone_support', value)}
                                        placeholder={t('+1234567890')}
                                        error={errors.phone_support}
                                        required
                                    />
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
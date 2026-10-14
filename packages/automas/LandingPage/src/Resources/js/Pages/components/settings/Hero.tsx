import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layout } from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';

interface HeroProps {
    data: any;
    getSectionData: (key: string) => any;
    updateSectionData: (key: string, updates: any) => void;
    updateSectionVisibility: (sectionKey: string, visible: boolean) => void;
}

export default function Hero({ data, getSectionData, updateSectionData, updateSectionVisibility }: HeroProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Layout className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base">{t('Hero Content')}</CardTitle>
                                <p className="text-sm text-gray-500">{t('Main headline and supporting text')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="text-sm">{t('Enable Section')}</Label>
                            <Switch
                                checked={data.config_sections?.section_visibility?.hero !== false}
                                onCheckedChange={(checked) => updateSectionVisibility('hero', checked)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>{t('Hero Variant')}</Label>
                            <Select
                                value={getSectionData('hero').variant}
                                onValueChange={(value) => updateSectionData('hero', { variant: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select Hero Style')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hero1">{t('Image Left Split')}</SelectItem>
                                    <SelectItem value="hero2">{t('Image Right Split')}</SelectItem>
                                    <SelectItem value="hero3">{t('Background Image')}</SelectItem>
                                    <SelectItem value="hero4">{t('Minimal')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>{t('Hero Title Prefix / Static Title')}</Label>
                            <Input
                                value={getSectionData('hero').title || ''}
                                onChange={(e) => updateSectionData('hero', { title: e.target.value })}
                                placeholder={t('e.g. Transform Your Business with')}
                            />
                        </div>
                    </div>
                    <div>
                        <Label>{t('Animated Rotating Titles (Comma separated)')}</Label>
                        <Input
                            value={
                                Array.isArray(getSectionData('hero').rotating_texts)
                                    ? getSectionData('hero').rotating_texts.join(', ')
                                    : (getSectionData('hero').rotating_texts || '')
                            }
                            onChange={(e) => updateSectionData('hero', { rotating_texts: e.target.value })}
                            placeholder={t('Automas CRM, Project Management, HRM & Payroll, POS & Inventory')}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('Comma-separated list of titles that will automatically animate and rotate in the hero section.')}
                        </p>
                    </div>
                    <div>
                        <Label>{t('Hero Subtitle')}</Label>
                        <Textarea
                            value={getSectionData('hero').subtitle || ''}
                            onChange={(e) => updateSectionData('hero', { subtitle: e.target.value })}
                            placeholder={t('Supporting text for your headline')}
                            rows={3}
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>{t('Primary Button Text')}</Label>
                                <Input
                                    value={getSectionData('hero').primary_button_text || ''}
                                    onChange={(e) => updateSectionData('hero', { primary_button_text: e.target.value })}
                                    placeholder={t('Start Free Trial')}
                                />
                            </div>
                            <div>
                                <Label>{t('Primary Button Link')}</Label>
                                <Input
                                    value={getSectionData('hero').primary_button_link || ''}
                                    onChange={(e) => updateSectionData('hero', { primary_button_link: e.target.value })}
                                    placeholder={t('Enter button link URL')}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>{t('Secondary Button Text')}</Label>
                                <Input
                                    value={getSectionData('hero').secondary_button_text || ''}
                                    onChange={(e) => updateSectionData('hero', { secondary_button_text: e.target.value })}
                                    placeholder={t('Login')}
                                />
                            </div>
                            <div>
                                <Label>{t('Secondary Button Link')}</Label>
                                <Input
                                    value={getSectionData('hero').secondary_button_link || ''}
                                    onChange={(e) => updateSectionData('hero', { secondary_button_link: e.target.value })}
                                    placeholder={t('Enter button link URL')}
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <Label>{t('Hero Image')}</Label>
                        <MediaPicker
                            value={getSectionData('hero').image || ''}
                            onChange={(value) => updateSectionData('hero', { image: value })}
                            placeholder={t('Select hero image')}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
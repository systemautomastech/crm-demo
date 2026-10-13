import Layout from './Layouts/Layout';
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/helpers';

interface CustomPageProps {
    customPage: {
        id: number;
        title: string;
        contents: string;
        description: string;
        updated_at?: string;
    };
}

export default function CustomPage({ customPage }: CustomPageProps) {
    const { t } = useTranslation();
    return (
        <Layout title={customPage.title}>
            <div className="max-w-4xl mx-auto">
                <Card className="shadow-md">
                    <CardContent className="p-8">
                        <h1 className="text-3xl font-bold mb-6 text-gray-800">{customPage.title}</h1>
                        
                        {customPage.description && (
                            <div className="mb-6">
                                <p className="text-gray-600 text-lg">{customPage.description}</p>
                            </div>
                        )}
                        
                        <div 
                            className="prose max-w-none space-y-6 text-gray-600"
                            dangerouslySetInnerHTML={{ __html: customPage.contents }}
                        />
                        
                        {customPage.updated_at && (
                            <div className="border-t border-gray-200 pt-6 mt-8">
                                <div className="bg-gray-100 p-4 rounded-lg">
                                    <p className="text-gray-600 text-sm">
                                        {t('Last Updated:')} {formatDate(customPage.updated_at)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
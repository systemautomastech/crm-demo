<?php

namespace Automas\SalesOrder\Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\EmailTemplate;
use App\Models\EmailTemplateLang;
use App\Models\User;

class EmailTemplatesSeeder extends Seeder
{
    public function run(): void
    {
        if (!class_exists(EmailTemplate::class)) {
            return;
        }

        $admin = User::where('type', 'company')->first();

        $emailTemplates = [
            'New Sales Order',
            'Sales Order Delivery Created',
        ];

        $defaultTemplates = [
            'New Sales Order' => [
                'subject'   => 'New Sales Order Created',
                'variables' => json_encode([
                    'App Url'         => 'app_url',
                    'App Name'        => 'app_name',
                    'Company Name'    => 'company_name',
                    'Order Number'    => 'order_number',
                    'Customer Name'   => 'customer_name',
                    'Total Amount'    => 'total_amount',
                    'Order Date'      => 'order_date',
                ]),
                'lang' => [
                    'en' => '<div style="font-family:Arial,sans-serif;padding:30px;background:#f8f9fa;">
                        <div style="max-width:600px;margin:auto;background:#fff;padding:24px;border-radius:8px;border:1px solid #e2e8f0;">
                            <h2 style="color:#3B82F6;margin-top:0;">Sales Order #{order_number}</h2>
                            <p>Hello {customer_name},</p>
                            <p>Your sales order has been created successfully with {company_name}.</p>
                            <div style="background:#f1f5f9;padding:16px;border-radius:6px;margin:16px 0;">
                                <p><strong>Order Number:</strong> #{order_number}</p>
                                <p><strong>Date:</strong> {order_date}</p>
                                <p><strong>Total:</strong> {total_amount}</p>
                            </div>
                            <p>Thank you for your business.</p>
                        </div>
                    </div>',
                ],
            ],
            'Sales Order Delivery Created' => [
                'subject'   => 'Delivery Dispatched for Order #{order_number}',
                'variables' => json_encode([
                    'App Url'         => 'app_url',
                    'App Name'        => 'app_name',
                    'Company Name'    => 'company_name',
                    'Order Number'    => 'order_number',
                    'Delivery Number' => 'delivery_number',
                    'Delivery Date'   => 'delivery_date',
                    'Customer Name'   => 'customer_name',
                ]),
                'lang' => [
                    'en' => '<div style="font-family:Arial,sans-serif;padding:30px;background:#f8f9fa;">
                        <div style="max-width:600px;margin:auto;background:#fff;padding:24px;border-radius:8px;border:1px solid #e2e8f0;">
                            <h2 style="color:#10B981;margin-top:0;">Delivery #{delivery_number}</h2>
                            <p>Hello {customer_name},</p>
                            <p>A new delivery #{delivery_number} has been created for your Sales Order #{order_number}.</p>
                            <div style="background:#f1f5f9;padding:16px;border-radius:6px;margin:16px 0;">
                                <p><strong>Delivery Number:</strong> #{delivery_number}</p>
                                <p><strong>Order Number:</strong> #{order_number}</p>
                                <p><strong>Date:</strong> {delivery_date}</p>
                            </div>
                            <p>Thank you for choosing {company_name}.</p>
                        </div>
                    </div>',
                ],
            ],
        ];

        foreach ($emailTemplates as $templateName) {
            $template = EmailTemplate::firstOrCreate(
                ['name' => $templateName],
                [
                    'from'        => config('mail.from.name', 'AutomasCRM'),
                    'module_name' => 'SalesOrder',
                    'created_by'  => $admin?->id ?? 1,
                ]
            );

            if (isset($defaultTemplates[$templateName]['lang'])) {
                foreach ($defaultTemplates[$templateName]['lang'] as $lang => $content) {
                    if (class_exists(EmailTemplateLang::class)) {
                        EmailTemplateLang::firstOrCreate(
                            [
                                'parent_id' => $template->id,
                                'lang'      => $lang,
                            ],
                            [
                                'subject'   => $defaultTemplates[$templateName]['subject'],
                                'content'   => $content,
                                'variables' => $defaultTemplates[$templateName]['variables'] ?? '',
                            ]
                        );
                    }
                }
            }
        }
    }
}

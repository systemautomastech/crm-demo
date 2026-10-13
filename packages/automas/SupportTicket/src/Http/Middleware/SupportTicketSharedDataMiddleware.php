<?php

namespace Automas\SupportTicket\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\User;
use App\Classes\Module;
use Automas\SupportTicket\Models\QuickLink;
use Automas\SupportTicket\Models\SupportTicketSetting;
use Automas\SupportTicket\Models\SupportTicketCustomPage;

class SupportTicketSharedDataMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        if (str_starts_with($request->route()?->getName() ?? '', 'support-ticket.')) {
            $userId = $this->getUserIdFromRequest($request);

            $user = User::find($userId);
            $userSlug = $request->route('slug');
            $sanitizedUserSlug = $userSlug ? htmlspecialchars($userSlug, ENT_QUOTES, 'UTF-8') : null;

            Inertia::share([
                'supportTicketSettings' => $this->getSupportTicketSettings($userId),
                'customPages' => $this->getCustomPages($userId),
                'companyAllSetting' => getCompanyAllSetting($userId),
                'userSlug' => $sanitizedUserSlug,
                'auth' => [
                    'user' => ['activatedPackages' => ActivatedModule($userId ?? null)],
                    'supportTicketCustomer' => null,
                ],
                'packages' => (new Module())->allModules(),
                'imageUrlPrefix' => $user ? getImageUrlPrefix() : url('/'),
            ]);
        }

        return $next($request);
    }

    private function getUserIdFromRequest(Request $request): int
    {
        $userSlug = $request->route('slug');
        if ($userSlug) {
            try {
                $user = User::where('slug', $userSlug)->first();
                if ($user) {
                    return $user->id;
                }
            } catch (\Exception $e) {
                abort(500, 'Database error');
            }
        }

        abort(404, 'Support ticket page not found');
    }

    private function getSupportTicketSettings($userId): array
    {
        try {
            $settings = SupportTicketSetting::where('created_by', $userId)->pluck('value', 'key')->toArray();
            $quickLinks = QuickLink::where('created_by', $userId)->get();
            return [
                'brand_settings' => [
                    'logo_dark' => $settings['logo_dark'] ?? null,
                    'favicon' => $settings['favicon'] ?? null,
                    'title_text' => $settings['titleText'] ?? 'Support Center',
                    'footer_text' => $settings['footerText'] ?? null,
                    'ticket_prefix' => $settings['ticket_prefix'] ?? 'TCK-',
                    'ticket_number' => $settings['ticket_number'] ?? '1001',
                ],
                'banner_section' => [
                    'banner_subtitle' => $settings['banner_subtitle'] ?? null,
                    'banner_title' => $settings['banner_title'] ?? null,
                    'banner_description' => $settings['banner_description'] ?? null,
                    'banner_background_image' => $settings['banner_background_image'] ?? null,
                ],
                'title_sections' => json_decode($settings['title_sections'] ?? '{}', true) ?: [
                    'create_ticket' => [
                        'title' => 'Create Support Ticket',
                        'description' => 'Submit your support request and get help from our team'
                    ],
                    'search_ticket' => [
                        'title' => 'Search Your Ticket',
                        'description' => 'Track the status of your existing support tickets'
                    ],
                    'knowledge_base' => [
                        'title' => 'Knowledge Base',
                        'description' => 'Find answers to common questions and issues'
                    ],
                    'faq' => [
                        'title' => 'Frequently Asked Questions',
                        'description' => 'Quick answers to the most common questions'
                    ],
                    'contact' => [
                        'title' => 'Contact Us',
                        'description' => 'Get in touch with our support team'
                    ]
                ],
                'support_information' => json_decode($settings['support_information'] ?? '{}', true) ?: [
                    'response_time' => 'We typically respond to all support tickets within 24-48 hours during business days. Critical issues are prioritized and may receive faster responses.',
                    'opening_hours' => '09:00',
                    'closing_hours' => '18:00',
                    'phone_support' => '+911234567890',
                    'email_support' => 'support@example.com',
                    'business_days' => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                    'timezone' => 'UTC'
                ],
                'contact_information' => json_decode($settings['contact_information'] ?? '{}', true) ?: [
                    'address' => '123 Business Street, City, State 12345',
                    'phone' => '+1 (555) 123-4567',
                    'email' => 'contact@company.com',
                    'working_hours' => 'Mon-Fri: 9AM-6PM'
                ],
                'cta_sections' => json_decode($settings['cta_sections'] ?? '{}', true) ?: [
                    'knowledge_base' => [
                        'title' => 'Can\'t find what you\'re looking for?',
                        'description' => 'Our support team is here to help',
                        'button_text' => 'Contact Support'
                    ],
                    'faq' => [
                        'title' => 'Still Have Questions?',
                        'description' => 'Our support team is ready to help',
                        'button_text' => 'Create Ticket'
                    ]
                ],
                'social_links' => json_decode($settings['social_links'] ?? '{}', true) ?: [],
                'quick_links' => json_decode($quickLinks ?? '{}', true) ?: [],
            ];
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getCustomPages($userId): array
    {
        try {
            return SupportTicketCustomPage::where('created_by', $userId)
                ->get(['id', 'title', 'slug', 'enable_page_footer', 'updated_at'])
                ->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }
}

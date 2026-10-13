<?php

namespace Automas\SupportTicket\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Automas\SupportTicket\Models\TicketCategory;
use Automas\SupportTicket\Models\SupportTicketCustomPage;
use Automas\SupportTicket\Models\QuickLink;

class SupportUtility extends Model
{
    public static function defaultdata($company_id = null)
    {
        $categories = [
            'Technical Support',
            'Billing',
            'General Inquiry',
            'Bug Report',
            'Feature Request',
        ];

        if (!empty($company_id)) {
            foreach ($categories as $index => $category_name) {
                $category = TicketCategory::where('name', $category_name)
                    ->where('created_by', $company_id)
                    ->first();

                if (empty($category)) {
                    $category = new TicketCategory();
                    $category->name = $category_name;
                    $category->color = self::getDefaultColor($index);
                    $category->created_by = !empty($company_id) ? $company_id : 2;
                    $category->save();
                }
            }
        }

        $pages = [
            [
                'title' => 'Privacy Policy',
                'slug' => 'privacy-policy',
                'description' => 'Your data privacy and security are our priority.',
                'contents' => '<p>We collect information you provide when submitting support tickets, including your name, email, and issue details. We use this information to provide technical support and resolve issues. We do not sell, trade, or share your personal information with third parties without your consent, except as required by law.</p>',
                'is_editable' => false,
                'enable_page_footer' => 'on',
                'creator_id' => $company_id,
                'created_by' => $company_id,
            ],
            [
                'title' => 'Terms & Conditions',
                'slug' => 'terms-conditions',
                'description' => 'Terms and conditions for using our support ticket system.',
                'contents' => '<p>By submitting a support ticket, you agree to provide accurate information and follow our support guidelines. We aim to respond to all tickets within 24-48 hours during business days. Critical issues will be prioritized. All information provided in support tickets will be kept confidential and used only for support purposes.</p>',
                'is_editable' => false,
                'enable_page_footer' => 'on',
                'creator_id' => $company_id,
                'created_by' => $company_id,
            ]
        ];

        foreach ($pages as $pageData) {
            SupportTicketCustomPage::firstOrCreate(
                ['slug' => $pageData['slug'], 'created_by' => $company_id],
                $pageData
            );
        }

        $defaultLinks = [
            ['title' => 'User Guides', 'icon' => 'BookOpen', 'link' => '#'],
            ['title' => 'Video Tutorials', 'icon' => 'Video', 'link' => '#'],
            ['title' => 'Tips & Tricks', 'icon' => 'Lightbulb', 'link' => '#'],
            ['title' => 'API Documentation', 'icon' => 'Code', 'link' => '#'],
            ['title' => 'Community Forums', 'icon' => 'MessageCircle', 'link' => '#'],
        ];

        foreach ($defaultLinks as $link) {
            QuickLink::firstOrCreate(
                [
                    'title' => $link['title'],
                    'created_by' => $company_id
                ],
                [
                    'icon' => $link['icon'],
                    'link' => $link['link'],
                    'creator_id' => $company_id,
                    'created_by' => $company_id
                ]
            );
        }
    }

    private static function getDefaultColor($index)
    {
        $colors = [
            '#3B82F6', 
            '#10B981', 
            '#F59E0B', 
            '#8B5CF6', 
            '#EF4444'];
        return $colors[$index % count($colors)];
    }

    public static function GivePermissionToRoles($role_id = null, $rolename = null)
    {
        $staff_permissions = [
            'manage-dashboard-support-ticket',
            'manage-support-ticket',

            'manage-support-tickets',
            'manage-own-support-tickets',
            'view-support-tickets',
            'create-support-tickets',
            'edit-support-tickets',
            'delete-support-tickets',
            'reply-support-tickets',
            'pick-support-tickets',
            'transfer-support-tickets',

            'manage-ticket-categories',
            'manage-any-ticket-categories',
            'create-ticket-categories',

            'manage-knowledge-base',
            'manage-any-knowledge-base',

            'manage-faq',
            'manage-any-faq',

            'manage-contact',
            'manage-any-contact',
            'view-contact',
        ];

        $client_permissions = [
            'manage-dashboard-support-ticket',
            'manage-support-ticket',

            'manage-own-support-tickets',
            'manage-support-tickets',
            'view-support-tickets',
            'reply-support-tickets',

            'manage-ticket-categories',
            'manage-any-ticket-categories',

            'manage-knowledge-base',
            'manage-any-knowledge-base',

            'manage-faq',
            'manage-any-faq',

            'manage-ticket-categories',
            'manage-any-ticket-categories',

            'manage-contact',
            'manage-own-contact',
            'view-contact',
        ];

        $vendor_permissions = [
            'manage-dashboard-support-ticket',
            'manage-support-ticket',

            'manage-own-support-tickets',
            'manage-support-tickets',
            'view-support-tickets',
            'reply-support-tickets',

            'manage-ticket-categories',
            'manage-any-ticket-categories',

            'manage-knowledge-base',
            'manage-any-knowledge-base',

            'manage-faq',
            'manage-any-faq',

            'manage-ticket-categories',
            'manage-any-ticket-categories',

            'manage-contact',
            'manage-own-contact',
            'view-contact',
        ];

        if ($rolename == 'staff') {
            $roles_v = Role::where('name', 'staff')->where('id', $role_id)->first();
            if ($roles_v) {
                foreach ($staff_permissions as $permission_v) {
                    $permission = Permission::where('name', $permission_v)->first();
                    if (!empty($permission)) {
                        if (!$roles_v->hasPermissionTo($permission_v)) {
                            $roles_v->givePermissionTo($permission);
                        }
                    }
                }
            }
        }

        if ($rolename == 'client') {
            $roles_v = Role::where('name', 'client')->where('id', $role_id)->first();
            if ($roles_v) {
                foreach ($client_permissions as $permission_v) {
                    $permission = Permission::where('name', $permission_v)->first();
                    if (!empty($permission)) {
                        if (!$roles_v->hasPermissionTo($permission_v)) {
                            $roles_v->givePermissionTo($permission);
                        }
                    }
                }
            }
        }

        if ($rolename == 'vendor') {
            $roles_v = Role::where('name', 'vendor')->where('id', $role_id)->first();
            if ($roles_v) {
                foreach ($vendor_permissions as $permission_v) {
                    $permission = Permission::where('name', $permission_v)->first();
                    if (!empty($permission)) {
                        if (!$roles_v->hasPermissionTo($permission_v)) {
                            $roles_v->givePermissionTo($permission);
                        }
                    }
                }
            }
        }
    }
}

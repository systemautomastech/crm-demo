<?php

namespace Database\Seeders;

use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Database\Seeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;

class PermissionRoleSeeder extends Seeder
{
    public function run()
    {
        Model::unguard();
        Artisan::call('cache:clear');

        // Create Super Admin User
        $superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@automas.com'],
            [
                'name' => 'Super Admin',
                'email_verified_at' => now(),
                'password' => Hash::make('Automas1234#'),
                'type' => 'superadmin',
                'lang' => 'en',
                'mobile_no' => '+133344455566',
                'total_user' => -1,
                'creator_id' => null,
                'created_by' => null
            ]
        );


        // Create Company User
        $company = User::firstOrCreate(
            ['email' => 'systemautomastech@gmail.com'],
            [
                'name' => 'Automas Technologies',
                'email_verified_at' => now(),
                'password' => Hash::make('Automas1234#'),
                'mobile_no' => '+122233344455',
                'type' => 'company',
                'lang' => 'en',
                'creator_id' => $superAdmin->id,
                'created_by' => $superAdmin->id
            ]
        );

        $permissions = [
            // Dashboard permissions
            ['name' => 'manage-dashboard', 'module' => 'dashboard', 'label' => 'Manage Dashboard'],

            // User management
            ['name' => 'manage-users', 'module' => 'users', 'label' => 'Manage Users'],
            ['name' => 'manage-any-users', 'module' => 'users', 'label' => 'Manage All Users'],
            ['name' => 'manage-customers', 'module' => 'users', 'label' => 'Manage Customers'],
            ['name' => 'manage-own-users', 'module' => 'users', 'label' => 'Manage Own Users'],
            ['name' => 'create-users', 'module' => 'users', 'label' => 'Create Users'],
            ['name' => 'edit-users', 'module' => 'users', 'label' => 'Edit Users'],
            ['name' => 'delete-users', 'module' => 'users', 'label' => 'Delete Users'],
            ['name' => 'change-password-users', 'module' => 'users', 'label' => 'Change Password Users'],
            ['name' => 'impersonate-users', 'module' => 'users', 'label' => 'Login As User'],
            ['name' => 'toggle-status-users', 'module' => 'users', 'label' => 'Change Status Users'],
            ['name' => 'view-login-history', 'module' => 'users', 'label' => 'View Login History'],
            ['name' => 'view-admin-hub', 'module' => 'users', 'label' => 'View Admin Hub'],
            ['name' => 'view-upgrade-plan', 'module' => 'users', 'label' => 'View Upgrade Plan'],

            // Role management
            ['name' => 'manage-roles', 'module' => 'roles', 'label' => 'Manage Roles'],
            ['name' => 'create-roles', 'module' => 'roles', 'label' => 'Create Roles'],
            ['name' => 'edit-roles', 'module' => 'roles', 'label' => 'Edit Roles'],
            ['name' => 'delete-roles', 'module' => 'roles', 'label' => 'Delete Roles'],

            // User Group management
            ['name' => 'manage-user-groups', 'module' => 'user-groups', 'label' => 'Manage User Groups'],
            ['name' => 'create-user-groups', 'module' => 'user-groups', 'label' => 'Create User Groups'],
            ['name' => 'edit-user-groups', 'module' => 'user-groups', 'label' => 'Edit User Groups'],
            ['name' => 'delete-user-groups', 'module' => 'user-groups', 'label' => 'Delete User Groups'],

            // Warehouse management
            ['name' => 'manage-warehouses', 'module' => 'warehouses', 'label' => 'Manage Warehouses'],
            ['name' => 'manage-any-warehouses', 'module' => 'warehouses', 'label' => 'Manage All Warehouses'],
            ['name' => 'manage-own-warehouses', 'module' => 'warehouses', 'label' => 'Manage Own Warehouses'],
            ['name' => 'create-warehouses', 'module' => 'warehouses', 'label' => 'Create Warehouses'],
            ['name' => 'edit-warehouses', 'module' => 'warehouses', 'label' => 'Edit Warehouses'],
            ['name' => 'delete-warehouses', 'module' => 'warehouses', 'label' => 'Delete Warehouses'],

            // Transfer management
            ['name' => 'manage-transfers', 'module' => 'transfers', 'label' => 'Manage Transfers'],
            ['name' => 'manage-any-transfers', 'module' => 'transfers', 'label' => 'Manage All Transfers'],
            ['name' => 'manage-own-transfers', 'module' => 'transfers', 'label' => 'Manage Own Transfers'],
            ['name' => 'create-transfers', 'module' => 'transfers', 'label' => 'Create Transfers'],
            ['name' => 'edit-transfers', 'module' => 'transfers', 'label' => 'Edit Transfers'],
            ['name' => 'delete-transfers', 'module' => 'transfers', 'label' => 'Delete Transfers'],

            // Settings management
            ['name' => 'manage-settings', 'module' => 'settings', 'label' => 'Manage Settings'],
            ['name' => 'edit-settings', 'module' => 'settings', 'label' => 'Edit Settings'],
            ['name' => 'manage-brand-settings', 'module' => 'settings', 'label' => 'Manage Brand Settings'],
            ['name' => 'edit-brand-settings', 'module' => 'settings', 'label' => 'Edit Brand Settings'],
            ['name' => 'manage-company-settings', 'module' => 'settings', 'label' => 'Manage Company Settings'],
            ['name' => 'edit-company-settings', 'module' => 'settings', 'label' => 'Edit Company Settings'],
            ['name' => 'manage-system-settings', 'module' => 'settings', 'label' => 'Manage System Settings'],
            ['name' => 'edit-system-settings', 'module' => 'settings', 'label' => 'Edit System Settings'],
            ['name' => 'manage-currency-settings', 'module' => 'settings', 'label' => 'Manage Currency Settings'],
            ['name' => 'edit-currency-settings', 'module' => 'settings', 'label' => 'Edit Currency Settings'],
            ['name' => 'manage-cache-settings', 'module' => 'settings', 'label' => 'Manage Cache Settings'],
            ['name' => 'clear-cache', 'module' => 'settings', 'label' => 'Clear Cache'],
            ['name' => 'manage-cookie-settings', 'module' => 'settings', 'label' => 'Manage Cookie Settings'],
            ['name' => 'edit-cookie-settings', 'module' => 'settings', 'label' => 'Edit Cookie Settings'],
            ['name' => 'manage-seo-settings', 'module' => 'settings', 'label' => 'Manage SEO Settings'],
            ['name' => 'edit-seo-settings', 'module' => 'settings', 'label' => 'Edit SEO Settings'],
            ['name' => 'manage-storage-settings', 'module' => 'settings', 'label' => 'Manage Storage Settings'],
            ['name' => 'edit-storage-settings', 'module' => 'settings', 'label' => 'Edit Storage Settings'],
            ['name' => 'manage-email-settings', 'module' => 'settings', 'label' => 'Manage Email Settings'],
            ['name' => 'edit-email-settings', 'module' => 'settings', 'label' => 'Edit Email Settings'],
            ['name' => 'test-email', 'module' => 'settings', 'label' => 'Test Email'],
            ['name' => 'manage-bank-transfer-settings', 'module' => 'settings', 'label' => 'Manage Bank Transfer Settings'],
            ['name' => 'edit-bank-transfer-settings', 'module' => 'settings', 'label' => 'Edit Bank Transfer Settings'],
            ['name' => 'manage-bank-transfer-requests', 'module' => 'bank-transfer', 'label' => 'Manage Bank Transfer Requests'],
            ['name' => 'approve-bank-transfer-requests', 'module' => 'bank-transfer', 'label' => 'Approve Bank Transfer Requests'],
            ['name' => 'reject-bank-transfer-requests', 'module' => 'bank-transfer', 'label' => 'Reject Bank Transfer Requests'],
            ['name' => 'delete-bank-transfer-requests', 'module' => 'bank-transfer', 'label' => 'Delete Bank Transfer Requests'],
            ['name' => 'manage-email-notification-settings', 'module' => 'settings', 'label' => 'Manage Email Notification Settings'],
            ['name' => 'manage-pusher-settings', 'module' => 'settings', 'label' => 'Manage Pusher Settings'],
            ['name' => 'edit-pusher-settings', 'module' => 'settings', 'label' => 'Edit Pusher Settings'],

            // Media management
            ['name' => 'manage-media', 'module' => 'media', 'label' => 'Manage Media'],
            ['name' => 'manage-any-media', 'module' => 'media', 'label' => 'Manage All Media'],
            ['name' => 'manage-own-media', 'module' => 'media', 'label' => 'Manage Own Media'],
            ['name' => 'create-media', 'module' => 'media', 'label' => 'Create Media'],
            ['name' => 'download-media', 'module' => 'media', 'label' => 'Download Media'],
            ['name' => 'delete-media', 'module' => 'media', 'label' => 'Delete Media'],
            ['name' => 'manage-media-directories', 'module' => 'media', 'label' => 'Manage Media Directories'],
            ['name' => 'manage-any-media-directories', 'module' => 'media', 'label' => 'Manage All Media Directories'],
            ['name' => 'manage-own-media-directories', 'module' => 'media', 'label' => 'Manage Own Media Directories'],
            ['name' => 'create-media-directories', 'module' => 'media', 'label' => 'Create Media Directories'],
            ['name' => 'edit-media-directories', 'module' => 'media', 'label' => 'Edit Media Directories'],
            ['name' => 'delete-media-directories', 'module' => 'media', 'label' => 'Delete Media Directories'],


            // Language management
            ['name' => 'manage-languages', 'module' => 'languages', 'label' => 'Manage Languages'],
            ['name' => 'create-languages', 'module' => 'languages', 'label' => 'Create Languages'],
            ['name' => 'edit-languages', 'module' => 'languages', 'label' => 'Edit Languages'],

            // Add-on management
            ['name' => 'manage-add-on', 'module' => 'add-on', 'label' => 'Manage Add-on'],
            ['name' => 'manage-actions', 'module' => 'add-on', 'label' => 'Manage Actions'],

            // Plan management
            ['name' => 'manage-plans', 'module' => 'plans', 'label' => 'Manage Plans'],
            ['name' => 'manage-any-plans', 'module' => 'plans', 'label' => 'Manage All Plans'],
            ['name' => 'manage-own-plans', 'module' => 'plans', 'label' => 'Manage Own Plans'],
            ['name' => 'view-plans', 'module' => 'plans', 'label' => 'View Plans'],
            ['name' => 'create-plans', 'module' => 'plans', 'label' => 'Create Plans'],
            ['name' => 'edit-plans', 'module' => 'plans', 'label' => 'Edit Plans'],
            ['name' => 'delete-plans', 'module' => 'plans', 'label' => 'Delete Plans'],

            // Coupon management
            ['name' => 'manage-coupons', 'module' => 'coupons', 'label' => 'Manage Coupons'],
            ['name' => 'manage-any-coupons', 'module' => 'coupons', 'label' => 'Manage All Coupons'],
            ['name' => 'manage-own-coupons', 'module' => 'coupons', 'label' => 'Manage Own Coupons'],
            ['name' => 'view-coupons', 'module' => 'coupons', 'label' => 'View Coupons'],
            ['name' => 'create-coupons', 'module' => 'coupons', 'label' => 'Create Coupons'],
            ['name' => 'edit-coupons', 'module' => 'coupons', 'label' => 'Edit Coupons'],
            ['name' => 'delete-coupons', 'module' => 'coupons', 'label' => 'Delete Coupons'],

            // Profile management
            ['name' => 'manage-profile', 'module' => 'profile', 'label' => 'Manage Profile'],
            ['name' => 'edit-profile', 'module' => 'profile', 'label' => 'Edit Profile'],
            ['name' => 'change-password-profile', 'module' => 'profile', 'label' => 'Change Password Profile'],

            // Email Templates management
            ['name' => 'manage-email-templates', 'module' => 'email-templates', 'label' => 'Manage Email Templates'],
            ['name' => 'edit-email-templates', 'module' => 'email-templates', 'label' => 'Edit Email Templates'],

            // Notification Templates management
            ['name' => 'manage-notification-templates', 'module' => 'notification-templates', 'label' => 'Manage Notification Templates'],
            ['name' => 'edit-notification-templates', 'module' => 'notification-templates', 'label' => 'Edit Notification Templates'],

            // Order management
            ['name' => 'manage-orders', 'module' => 'orders', 'label' => 'Manage Orders'],

            // Sales Proposal permissions
            ['name' => 'manage-sales-proposals', 'module' => 'sales-proposals', 'label' => 'Manage Sales Proposals'],
            ['name' => 'create-sales-proposals', 'module' => 'sales-proposals', 'label' => 'Create Proposals'],
            ['name' => 'edit-sales-proposals', 'module' => 'sales-proposals', 'label' => 'Edit Sales Proposals'],
            ['name' => 'delete-sales-proposals', 'module' => 'sales-proposals', 'label' => 'Delete Sales Proposals'],
            ['name' => 'view-sales-proposals', 'module' => 'sales-proposals', 'label' => 'View Sales Proposals'],
            ['name' => 'print-sales-proposals', 'module' => 'sales-proposals', 'label' => 'Print Sales Proposals'],
            ['name' => 'sent-sales-proposals', 'module' => 'sales-proposals', 'label' => 'Sent Sales Proposals'],
            ['name' => 'accept-sales-proposals', 'module' => 'sales-proposals', 'label' => 'Accept Sales Proposals'],
            ['name' => 'reject-sales-proposals', 'module' => 'sales-proposals', 'label' => 'Reject Sales Proposals'],
            ['name' => 'convert-sales-proposals', 'module' => 'sales-proposals', 'label' => 'Convert Sales Proposals'],
            ['name' => 'manage-proposal-system-setup', 'module' => 'sales-proposals', 'label' => 'Manage Proposal Setup'],

            // Sales Invoice permissions
            ['name' => 'manage-sales-invoices', 'module' => 'sales-invoices', 'label' => 'Manage Sales Invoices'],
            ['name' => 'create-sales-invoices', 'module' => 'sales-invoices', 'label' => 'Create Sales Invoices'],
            ['name' => 'edit-sales-invoices', 'module' => 'sales-invoices', 'label' => 'Edit Sales Invoices'],
            ['name' => 'delete-sales-invoices', 'module' => 'sales-invoices', 'label' => 'Delete Sales Invoices'],
            ['name' => 'view-sales-invoices', 'module' => 'sales-invoices', 'label' => 'View Sales Invoices'],
            ['name' => 'print-sales-invoices', 'module' => 'sales-invoices', 'label' => 'Print Sales Invoices'],
            ['name' => 'post-sales-invoices', 'module' => 'sales-invoices', 'label' => 'Post Sales Invoices'],
            ['name' => 'manage-sales-invoice-setup', 'module' => 'sales-invoices', 'label' => 'Manage Sales Invoice Setup'],

            // Sales Return permissions
            ['name' => 'manage-sales-return-invoices', 'module' => 'sales-returns', 'label' => 'Manage Sales Returns'],
            ['name' => 'create-sales-returns', 'module' => 'sales-returns', 'label' => 'Create Sales Returns'],
            ['name' => 'view-sales-returns', 'module' => 'sales-returns', 'label' => 'View Sales Returns'],
            ['name' => 'delete-sales-returns', 'module' => 'sales-returns', 'label' => 'Delete Sales Returns'],
            ['name' => 'approve-sales-returns', 'module' => 'sales-returns', 'label' => 'Approve Sales Returns'],
            ['name' => 'complete-sales-returns', 'module' => 'sales-returns', 'label' => 'Complete Sales Returns'],
        ];

        $roles = [
            'superadmin' => [
                'label' => 'Super Admin',
                'permissions' => [
                    'manage-dashboard',
                    'manage-users',
                    'manage-any-users',
                    'manage-customers',
                    'manage-own-users',
                    'create-users',
                    'edit-users',
                    'delete-users',
                    'change-password-users',
                    'toggle-status-users',
                    'impersonate-users',
                    'view-login-history',
                    'view-admin-hub',
                    'view-upgrade-plan',
                    'manage-user-groups',
                    'create-user-groups',
                    'edit-user-groups',
                    'delete-user-groups',
                    'manage-settings',
                    'edit-settings',
                    'manage-brand-settings',
                    'edit-brand-settings',
                    'manage-system-settings',
                    'edit-system-settings',
                    'manage-currency-settings',
                    'edit-currency-settings',
                    'manage-cache-settings',
                    'clear-cache',
                    'manage-cookie-settings',
                    'edit-cookie-settings',
                    'manage-seo-settings',
                    'edit-seo-settings',
                    'manage-storage-settings',
                    'edit-storage-settings',
                    'manage-email-settings',
                    'edit-email-settings',
                    'test-email',
                    'manage-email-notification-settings',
                    'manage-pusher-settings',
                    'edit-pusher-settings',
                    'manage-notification-templates',
                    'edit-notification-templates',
                    'manage-bank-transfer-settings',
                    'edit-bank-transfer-settings',
                    'manage-languages',
                    'create-languages',
                    'edit-languages',
                    'manage-media',
                    'manage-own-media',
                    'create-media',
                    'download-media',
                    'delete-media',
                    'manage-media-directories',
                    'manage-own-media-directories',
                    'manage-any-media-directories',
                    'create-media-directories',
                    'edit-media-directories',
                    'delete-media-directories',
                    'manage-add-on',
                    'manage-actions',
                    'manage-email-templates',
                    'edit-email-templates',
                    'manage-plans',
                    'manage-any-plans',
                    'manage-own-plans',
                    'view-plans',
                    'create-plans',
                    'edit-plans',
                    'delete-plans',
                    'manage-coupons',
                    'manage-any-coupons',
                    'manage-own-coupons',
                    'view-coupons',
                    'create-coupons',
                    'edit-coupons',
                    'delete-coupons',
                    'manage-bank-transfer-requests',
                    'approve-bank-transfer-requests',
                    'reject-bank-transfer-requests',
                    'delete-bank-transfer-requests',
                    'manage-profile',
                    'edit-profile',
                    'change-password-profile',
                    'manage-orders',
                    'view-orders',
                    'manage-email-plan-purchases'
                ]
            ],
            'company' => [
                'label' => 'Company',
                'permissions' => [
                    'manage-dashboard',
                    'manage-users',
                    'manage-any-users',
                    'manage-customers',
                    'manage-own-users',
                    'create-users',
                    'edit-users',
                    'delete-users',
                    'change-password-users',
                    'toggle-status-users',
                    'impersonate-users',
                    'view-login-history',
                    'manage-roles',
                    'view-roles',
                    'create-roles',
                    'edit-roles',
                    'delete-roles',
                    'manage-user-groups',
                    'create-user-groups',
                    'edit-user-groups',
                    'delete-user-groups',
                    'manage-warehouses',
                    'manage-any-warehouses',
                    'manage-own-warehouses',
                    'create-warehouses',
                    'edit-warehouses',
                    'delete-warehouses',
                    'manage-transfers',
                    'manage-any-transfers',
                    'manage-own-transfers',
                    'create-transfers',
                    'edit-transfers',
                    'delete-transfers',
                    'manage-settings',
                    'edit-settings',
                    'manage-brand-settings',
                    'edit-brand-settings',
                    'manage-company-settings',
                    'edit-company-settings',
                    'manage-system-settings',
                    'edit-system-settings',
                    'manage-email-settings',
                    'edit-email-settings',
                    'test-email',
                    'manage-email-notification-settings',
                    'manage-currency-settings',
                    'edit-currency-settings',
                    'manage-media',
                    'manage-own-media',
                    'create-media',
                    'download-media',
                    'delete-media',
                    'manage-media-directories',
                    'manage-own-media-directories',
                    'create-media-directories',
                    'edit-media-directories',
                    'delete-media-directories',
                    'manage-plans',
                    'manage-any-plans',
                    'manage-own-plans',
                    'view-plans',
                    'manage-bank-transfer-requests',
                    'delete-bank-transfer-requests',
                    'manage-orders',
                    'view-orders',
                    'manage-profile',
                    'edit-profile',
                    'change-password-profile',
                    'manage-sales-proposals',
                    'create-sales-proposals',
                    'edit-sales-proposals',
                    'delete-sales-proposals',
                    'view-sales-proposals',
                    'print-sales-proposals',
                    'sent-sales-proposals',
                    'accept-sales-proposals',
                    'reject-sales-proposals',
                    'convert-sales-proposals',
                    'manage-proposal-system-setup',
                    'manage-sales-invoices',
                    'create-sales-invoices',
                    'edit-sales-invoices',
                    'delete-sales-invoices',
                    'view-sales-invoices',
                    'print-sales-invoices',
                    'post-sales-invoices',
                    'manage-sales-invoice-setup',
                    'manage-sales-return-invoices',
                    'create-sales-returns',
                    'view-sales-returns',
                    'delete-sales-returns',
                    'approve-sales-returns',
                    'complete-sales-returns',
                ]
            ]
        ];

        // Create permissions
        foreach ($permissions as $perm) {
            Permission::firstOrCreate(
                ['name' => $perm['name'], 'guard_name' => 'web'],
                [
                    'module' => $perm['module'],
                    'label' => $perm['label'],
                    'add_on' => 'general',
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ]
            );
        }

        // Create roles and assign permissions
        foreach ($roles as $roleName => $roleData) {
            $role = Role::firstOrCreate(
                ['name' => $roleName, 'guard_name' => 'web'],
                [
                    'label' => $roleData['label'],
                    'editable' => false,
                    'created_by' => $superAdmin->id
                ]
            );

            // Get permission objects by name
            $permissionObjects = Permission::whereIn('name', $roleData['permissions'])->get();
            $role->givePermissionTo($permissionObjects);
        }

        // Assign super admin role
        $superAdmin->assignRole('superadmin');

        // Assign company role
        $company->assignRole('company');

        // Make Company's role
        User::MakeRole($company->id);
    }
}

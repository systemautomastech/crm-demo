<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $company = User::find(2)
            ?? User::where('email', 'company@automas.com')->first()
            ?? User::where('email', 'info@automas.com.bd')->first()
            ?? User::where('type', 'company')->first();

        if (!$company) {
            $this->command->error('No company user found.');
            return;
        }

        $companyId = $company->id;
        $this->command->info("Seeding 15 Users (Roles: Manager, Admin, Sales, Tech-Ops, Staff, Clients) for company: {$company->name} (ID: {$companyId})");

        $defaultPassword = Hash::make('12345678');

        // 15 Structured Demo Users
        $usersData = [
            // --- Management & Administration (3) ---
            [
                'name' => 'Tariqul Islam',
                'email' => 'tariqul.manager@automas.com',
                'mobile_no' => '+880 1711-889901',
                'type' => 'manager',
                'role_name' => 'manager',
            ],
            [
                'name' => 'Nusrat Jahan',
                'email' => 'nusrat.admin@automas.com',
                'mobile_no' => '+880 1819-889902',
                'type' => 'admin',
                'role_name' => 'admin',
            ],
            [
                'name' => 'Farhana Akter',
                'email' => 'farhana.hr@automas.com',
                'mobile_no' => '+880 1912-889903',
                'type' => 'hr',
                'role_name' => 'hr',
            ],

            // --- Sales & Account Management (4) ---
            [
                'name' => 'Tanvir Ahmed',
                'email' => 'tanvir.sales@automas.com',
                'mobile_no' => '+880 1611-889904',
                'type' => 'sales',
                'role_name' => 'sales',
            ],
            [
                'name' => 'Shakil Mahmud',
                'email' => 'shakil.sales@automas.com',
                'mobile_no' => '+880 1715-889905',
                'type' => 'sales',
                'role_name' => 'sales',
            ],
            [
                'name' => 'Anika Tabassum',
                'email' => 'anika.sales@automas.com',
                'mobile_no' => '+880 1814-889906',
                'type' => 'sales',
                'role_name' => 'sales',
            ],
            [
                'name' => 'Rashedul Hasan',
                'email' => 'rashed.sales@automas.com',
                'mobile_no' => '+880 1917-889907',
                'type' => 'sales',
                'role_name' => 'sales',
            ],

            // --- Technical Operation & Support Staff (4) ---
            [
                'name' => 'Kamrul Hasan',
                'email' => 'kamrul.tech@automas.com',
                'mobile_no' => '+880 1716-889908',
                'type' => 'technical-operation',
                'role_name' => 'technical-operation',
            ],
            [
                'name' => 'Mehedi Hasan',
                'email' => 'mehedi.tech@automas.com',
                'mobile_no' => '+880 1518-889909',
                'type' => 'technical-operation',
                'role_name' => 'technical-operation',
            ],
            [
                'name' => 'Zubair Hossain',
                'email' => 'zubair.staff@automas.com',
                'mobile_no' => '+880 1712-889910',
                'type' => 'staff',
                'role_name' => 'staff',
            ],
            [
                'name' => 'Sabbir Ahmed',
                'email' => 'sabbir.staff@automas.com',
                'mobile_no' => '+880 1813-889911',
                'type' => 'staff',
                'role_name' => 'staff',
            ],

            // --- Business Clients (4) ---
            [
                'name' => 'Apex Footwear Solutions',
                'email' => 'procurement@apexfootwear-demo.com',
                'mobile_no' => '+880 1719-770011',
                'type' => 'client',
                'role_name' => 'client',
            ],
            [
                'name' => 'Bengal Communications Ltd.',
                'email' => 'contact@bengalcomm-demo.com',
                'mobile_no' => '+880 1819-770022',
                'type' => 'client',
                'role_name' => 'client',
            ],
            [
                'name' => 'Square Logistics & Supply',
                'email' => 'supply@squarelogistics-demo.com',
                'mobile_no' => '+880 1914-770033',
                'type' => 'client',
                'role_name' => 'client',
            ],
            [
                'name' => 'Navana Tech Engineering',
                'email' => 'billing@navanatech-demo.com',
                'mobile_no' => '+880 1618-770044',
                'type' => 'client',
                'role_name' => 'client',
            ],
        ];

        foreach ($usersData as $uData) {
            $user = User::updateOrCreate(
                ['email' => $uData['email']],
                [
                    'name' => $uData['name'],
                    'email_verified_at' => now(),
                    'password' => $defaultPassword,
                    'mobile_no' => $uData['mobile_no'],
                    'type' => $uData['type'],
                    'lang' => 'en',
                    'layout_direction' => 'ltr',
                    'is_enable_login' => 1,
                    'active_status' => 1,
                    'creator_id' => $companyId,
                    'created_by' => $companyId,
                ]
            );

            // Assign Spatie Role matching the type/role_name
            $role = Role::where('name', $uData['role_name'])
                ->where(function ($q) use ($companyId) {
                    $q->where('created_by', $companyId)->orWhereNull('created_by');
                })
                ->first();

            if ($role && !$user->hasRole($role)) {
                $user->assignRole($role);
            }
        }

        $this->command->info('15 Users seeded successfully! Default password for all: 12345678');
    }
}

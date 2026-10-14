<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            PermissionRoleSeeder::class,
            DefultSetting::class,
            PlanSeeder::class,
            EmailTemplatesSeeder::class,
            NotificationsTableSeeder::class,
            PackageSeeder::class,
            WarehouseSeeder::class,
            ProductSeeder::class,
            UserSeeder::class,
            CustomerSeeder::class,
            DealStageSeeder::class,
            LeadSeeder::class,
            LeadTaskSeeder::class,
            DealSeeder::class,
            DealTaskSeeder::class,
        ]);

        $companyUser = User::where('type', 'company')->first();
        if ($companyUser) {
            User::CompanySetting($companyUser->id);
        }
    }
}
    
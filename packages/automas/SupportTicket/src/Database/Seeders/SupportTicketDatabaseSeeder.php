<?php

namespace Automas\SupportTicket\Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class SupportTicketDatabaseSeeder extends Seeder
{
    public function run()
    {
        Model::unguard();
        $this->call(EmailTemplateTableSeeder::class);
        $this->call(NotificationsTableSeeder::class);
        $this->call(PermissionTableSeeder::class);
        $this->call(DefultSettingTableSeeder::class);
        $this->call(MarketplaceSettingSeeder::class);
    }
}

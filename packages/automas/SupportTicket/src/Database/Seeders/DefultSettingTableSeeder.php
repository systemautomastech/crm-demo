<?php

namespace Automas\SupportTicket\Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Database\Eloquent\Model;
use Automas\SupportTicket\Models\TicketField;

class DefultSettingTableSeeder extends Seeder
{
    public function run()
    {
        Model::unguard();

        $super_admin = User::where('type', 'superadmin')->first();
        if (!empty($super_admin)) {
            $companies = User::where('type', 'company')->get();
            foreach ($companies as $company) {
                TicketField::defaultdata($company->id);
            }
        }
    }
}
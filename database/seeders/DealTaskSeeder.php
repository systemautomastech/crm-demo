<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Automas\Lead\Models\Deal;
use Automas\Lead\Models\DealTask;

class DealTaskSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $company = User::findOrFail(2);

        $companyId = $company->id;
        $this->command->info("Seeding Deal Tasks for company: {$company->name} (ID: {$companyId})");

        $deals = Deal::where('created_by', $companyId)->take(10)->get();

        if ($deals->isEmpty()) {
            $this->command->warn('No deals found to attach tasks.');
            return;
        }

        $dealTaskTemplates = [
            ['name' => 'Prepare Commercial Contract & Payment Milestone Agreement', 'priority' => 3, 'status' => 1],
            ['name' => 'Coordinate with Finance for Advanced Invoice Generation', 'priority' => 3, 'status' => 1],
            ['name' => 'Dispatch Deployment Engineers for On-site Setup', 'priority' => 3, 'status' => 0],
            ['name' => 'Client Final Acceptance & Sign-off Review', 'priority' => 2, 'status' => 0],
            ['name' => 'Procurement & Warehouse Stock Clearance Check', 'priority' => 2, 'status' => 1],
            ['name' => 'Conduct Admin & Staff Onboarding Training Session', 'priority' => 2, 'status' => 0],
            ['name' => 'Post-deployment 30-Day Check-in & Customer Satisfaction Survey', 'priority' => 1, 'status' => 0],
            ['name' => 'Send Warranty Certificate & SLA Terms Document', 'priority' => 2, 'status' => 1],
        ];

        foreach ($deals as $index => $deal) {
            $t1 = $dealTaskTemplates[$index % count($dealTaskTemplates)];
            $t2 = $dealTaskTemplates[($index + 1) % count($dealTaskTemplates)];

            DealTask::updateOrCreate(
                [
                    'deal_id' => $deal->id,
                    'name' => $t1['name'],
                ],
                [
                    'date' => now()->addDays(rand(1, 10))->format('Y-m-d'),
                    'time' => '10:30',
                    'priority' => $t1['priority'],
                    'status' => $t1['status'],
                    'creator_id' => $deal->creator_id ?? $companyId,
                    'created_by' => $companyId,
                ]
            );

            DealTask::updateOrCreate(
                [
                    'deal_id' => $deal->id,
                    'name' => $t2['name'],
                ],
                [
                    'date' => now()->addDays(rand(3, 14))->format('Y-m-d'),
                    'time' => '16:00',
                    'priority' => $t2['priority'],
                    'status' => $t2['status'],
                    'creator_id' => $deal->creator_id ?? $companyId,
                    'created_by' => $companyId,
                ]
            );
        }

        $this->command->info('Deal Tasks seeded successfully!');
    }
}

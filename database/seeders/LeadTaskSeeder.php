<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Automas\Lead\Models\Lead;
use Automas\Lead\Models\LeadTask;

class LeadTaskSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $company = User::findOrFail(2);

        $companyId = $company->id;
        $this->command->info("Seeding Lead Tasks for company: {$company->name} (ID: {$companyId})");

        $leads = Lead::where('created_by', $companyId)->take(10)->get();

        if ($leads->isEmpty()) {
            $this->command->warn('No leads found to attach tasks.');
            return;
        }

        $taskTemplates = [
            ['name' => 'Initial Discovery Call & Need Assessment', 'priority' => 3, 'status' => 1],
            ['name' => 'Prepare & Send Customized Technical Quotation', 'priority' => 3, 'status' => 0],
            ['name' => 'Schedule Live Product Demonstration on Zoom', 'priority' => 2, 'status' => 0],
            ['name' => 'Follow up on Sent Commercial Proposal via Phone', 'priority' => 2, 'status' => 0],
            ['name' => 'Collect Network Infrastructure & Hardware Specs', 'priority' => 2, 'status' => 1],
            ['name' => 'Meeting with Decision Maker & Managing Director', 'priority' => 3, 'status' => 0],
            ['name' => 'Check WhatsApp response & answer technical queries', 'priority' => 1, 'status' => 0],
            ['name' => 'Final Price Negotiation & Payment Terms Discussion', 'priority' => 3, 'status' => 0],
            ['name' => 'Send Sample SLA Agreement & Compliance Docs', 'priority' => 2, 'status' => 1],
            ['name' => 'Coordinate with Logistics team for hardware dispatch', 'priority' => 2, 'status' => 0],
        ];

        foreach ($leads as $index => $lead) {
            $tpl1 = $taskTemplates[$index % count($taskTemplates)];
            $tpl2 = $taskTemplates[($index + 1) % count($taskTemplates)];

            LeadTask::updateOrCreate(
                [
                    'lead_id' => $lead->id,
                    'name' => $tpl1['name'],
                ],
                [
                    'date' => now()->addDays(rand(1, 7))->format('Y-m-d'),
                    'time' => '11:00',
                    'priority' => $tpl1['priority'],
                    'status' => $tpl1['status'],
                    'creator_id' => $lead->user_id ?? $companyId,
                    'created_by' => $companyId,
                ]
            );

            LeadTask::updateOrCreate(
                [
                    'lead_id' => $lead->id,
                    'name' => $tpl2['name'],
                ],
                [
                    'date' => now()->addDays(rand(2, 10))->format('Y-m-d'),
                    'time' => '15:30',
                    'priority' => $tpl2['priority'],
                    'status' => $tpl2['status'],
                    'creator_id' => $lead->user_id ?? $companyId,
                    'created_by' => $companyId,
                ]
            );
        }

        $this->command->info('Lead Tasks seeded successfully!');
    }
}

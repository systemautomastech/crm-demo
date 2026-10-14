<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Automas\Lead\Models\Pipeline;
use Automas\Lead\Models\DealStage;

class DealStageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $company = User::findOrFail(2);

        $companyId = $company->id;
        $this->command->info("Seeding Deal Stages for company: {$company->name} (ID: {$companyId})");

        $pipeline = Pipeline::where('created_by', $companyId)->where('name', 'New Sales')->first()
            ?? Pipeline::where('created_by', $companyId)->first();

        if (!$pipeline) {
            $pipeline = Pipeline::create([
                'name' => 'New Sales',
                'created_by' => $companyId,
            ]);
        }

        $stages = [
            ['name' => 'Opportunity Identified', 'order' => 1],
            ['name' => 'Requirement Collected', 'order' => 2],
            ['name' => 'Proposal / Quotation Sent', 'order' => 3],
            ['name' => 'Negotiation & Review', 'order' => 4],
            ['name' => 'Confirmed / Won', 'order' => 5],
            ['name' => 'Closed / Lost', 'order' => 6],
        ];

        foreach ($stages as $stageData) {
            DealStage::updateOrCreate(
                [
                    'name' => $stageData['name'],
                    'pipeline_id' => $pipeline->id,
                    'created_by' => $companyId,
                ],
                [
                    'order' => $stageData['order'],
                    'creator_id' => $companyId,
                    'created_by' => $companyId,
                ]
            );
        }

        $this->command->info('Deal Stages seeded successfully!');
    }
}

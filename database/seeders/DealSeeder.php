<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Automas\Lead\Models\Deal;
use Automas\Lead\Models\DealStage;
use Automas\Lead\Models\Pipeline;
use Automas\Lead\Models\Source;
use Automas\Lead\Models\Label;
use Automas\ProductService\Models\ProductServiceItem;

class DealSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $company = User::findOrFail(2);

        $companyId = $company->id;
        $this->command->info("Seeding Deals for company: {$company->name} (ID: {$companyId})");

        // Main Pipeline
        $pipeline = Pipeline::where('created_by', $companyId)->where('name', 'New Sales')->first()
            ?? Pipeline::where('created_by', $companyId)->first();

        // Sales users
        $salesUsers = User::where('created_by', $companyId)
            ->whereIn('type', ['sales', 'manager', 'staff'])
            ->pluck('id')
            ->toArray();

        if (empty($salesUsers)) {
            $salesUsers = [$companyId];
        }

        // Stages from DealStage table
        $stages = DealStage::where('pipeline_id', $pipeline?->id ?? 12)->where('created_by', $companyId)->pluck('id', 'name')->toArray();
        $stageWon = $stages['Confirmed / Won'] ?? array_values($stages)[0] ?? 6;
        $stageNegotiation = $stages['Negotiation & Review'] ?? $stageWon;
        $stageProposal = $stages['Proposal / Quotation Sent'] ?? $stageNegotiation;
        $stageRequirement = $stages['Requirement Collected'] ?? $stageProposal;

        // Sources & Labels
        $sourceWeb = Source::where('name', 'Website Inbound')->where('created_by', $companyId)->value('id') ?? 1;
        $sourceRef = Source::where('name', 'Company Reference')->where('created_by', $companyId)->value('id') ?? 18;
        $labelHot = Label::where('name', 'Hot')->where('created_by', $companyId)->value('id') ?? 1;
        $labelVIP = Label::where('name', '⭐ VIP')->where('created_by', $companyId)->value('id') ?? 4;

        $productItems = ProductServiceItem::where('created_by', $companyId)->pluck('id')->toArray();
        $prodSample = !empty($productItems) ? [(string)$productItems[0]] : [];

        $dealsData = [
            [
                'name' => 'Apex Footwear - Enterprise CRM Deployment',
                'price' => 145000.00,
                'phone' => '+880 1711-223344',
                'status' => 'Won',
                'stage_id' => $stageWon,
                'notes' => '<p>Closed deal for Enterprise CRM and onboarding package for 20 sales managers.</p>',
            ],
            [
                'name' => 'Bengal Communications - 50x IP Phone & IP-PBX',
                'price' => 285000.00,
                'phone' => '+880 1819-556677',
                'status' => 'Won',
                'stage_id' => $stageWon,
                'notes' => '<p>Hardware procurement and deployment deal for new call center branch.</p>',
            ],
            [
                'name' => 'Square Logistics - Annual IT AMC Contract',
                'price' => 120000.00,
                'phone' => '+880 1914-889900',
                'status' => 'Won',
                'stage_id' => $stageWon,
                'notes' => '<p>Comprehensive 24/7 technical maintenance & network SLA contract.</p>',
            ],
            [
                'name' => 'Navana Tech - 100K Bulk SMS & WhatsApp Gateway',
                'price' => 38000.00,
                'phone' => '+880 1618-334455',
                'status' => 'Active',
                'stage_id' => $stageNegotiation,
                'notes' => '<p>Testing API webhook integration on staging server.</p>',
            ],
            [
                'name' => 'Akij Group - Multi-Warehouse Inventory Pilot',
                'price' => 210000.00,
                'phone' => '+880 1715-998877',
                'status' => 'Active',
                'stage_id' => $stageNegotiation,
                'notes' => '<p>Demo successful. Price negotiation ongoing with procurement board.</p>',
            ],
            [
                'name' => 'Walton Digi-Tech - Cloud PBX MRC Service',
                'price' => 180000.00,
                'phone' => '+880 1716-443322',
                'status' => 'Won',
                'stage_id' => $stageWon,
                'notes' => '<p>Annual recurring contract for hosted PBX and call center software.</p>',
            ],
            [
                'name' => 'City Hospital - Patient Helpdesk Call Center',
                'price' => 95000.00,
                'phone' => '+880 1712-665544',
                'status' => 'Active',
                'stage_id' => $stageProposal,
                'notes' => '<p>Commercial proposal sent, waiting for budget clearance meeting.</p>',
            ],
            [
                'name' => 'Pran-RFL Depot - Network Switch & Router Setup',
                'price' => 165000.00,
                'phone' => '+880 1817-112233',
                'status' => 'Active',
                'stage_id' => $stageRequirement,
                'notes' => '<p>Equipment delivery scheduled for next Monday at Gazipur plant.</p>',
            ],
            [
                'name' => 'Meghna Group - 30 Seat Omnichannel Support',
                'price' => 240000.00,
                'phone' => '+880 1918-990011',
                'status' => 'Active',
                'stage_id' => $stageNegotiation,
                'notes' => '<p>Technical architecture review completed. Final SLA draft under review.</p>',
            ],
            [
                'name' => 'Daraz Partner Hub - Automated WhatsApp Bot',
                'price' => 55000.00,
                'phone' => '+880 1611-778899',
                'status' => 'Won',
                'stage_id' => $stageWon,
                'notes' => '<p>Payment received. WhatsApp Business API verification approved by Meta.</p>',
            ],
        ];

        foreach ($dealsData as $idx => $dInfo) {
            $assignedUser = $salesUsers[$idx % count($salesUsers)];

            Deal::updateOrCreate(
                [
                    'name' => $dInfo['name'],
                    'created_by' => $companyId,
                ],
                [
                    'price' => $dInfo['price'],
                    'pipeline_id' => $pipeline?->id ?? 12,
                    'stage_id' => $dInfo['stage_id'],
                    'sources' => [(string)$sourceWeb, (string)$sourceRef],
                    'products' => $prodSample,
                    'notes' => $dInfo['notes'],
                    'labels' => [(string)$labelHot, (string)$labelVIP],
                    'phone' => $dInfo['phone'],
                    'status' => $dInfo['status'],
                    'is_active' => true,
                    'order' => $idx + 1,
                    'creator_id' => $assignedUser,
                    'created_by' => $companyId,
                ]
            );
        }

        $this->command->info('10 Deals seeded successfully!');
    }
}

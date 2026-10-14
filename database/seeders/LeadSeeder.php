<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Automas\Lead\Models\Lead;
use Automas\Lead\Models\Pipeline;
use Automas\Lead\Models\LeadStage;
use Automas\Lead\Models\Source;
use Automas\Lead\Models\Label;
use Automas\ProductService\Models\ProductServiceItem;

class LeadSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $company = User::findOrFail(2);

        $companyId = $company->id;
        $this->command->info("Seeding Leads for company: {$company->name} (ID: {$companyId})");

        // Get or find the main "New Sales" pipeline
        $pipeline = Pipeline::where('created_by', $companyId)->where('name', 'New Sales')->first()
            ?? Pipeline::where('created_by', $companyId)->first();

        if (!$pipeline) {
            $pipeline = Pipeline::create([
                'name' => 'New Sales',
                'created_by' => $companyId,
            ]);
        }

        // Get Sales Reps/Users in the company to assign leads
        $salesUsers = User::where('created_by', $companyId)
            ->whereIn('type', ['sales', 'manager', 'staff'])
            ->pluck('id')
            ->toArray();

        if (empty($salesUsers)) {
            $salesUsers = [$companyId];
        }

        // Ensure Lead Stages exist for this pipeline
        $defaultStages = [
            'New Lead' => 1,
            'Contacted' => 2,
            'Interested' => 3,
            'Qualified' => 4,
            'Requirement Collected' => 5,
            'Meeting / Demo Scheduled' => 6,
            'Proposal Sent' => 7,
            'Negotiation' => 8,
            'Confirmed / Won' => 9,
            'Lost' => 10,
        ];

        foreach ($defaultStages as $sName => $sOrder) {
            LeadStage::firstOrCreate(
                ['name' => $sName, 'pipeline_id' => $pipeline->id],
                ['order' => $sOrder, 'creator_id' => $companyId, 'created_by' => $companyId]
            );
        }

        // Get Stages for this pipeline
        $stages = LeadStage::where('pipeline_id', $pipeline->id)->orderBy('order')->pluck('id', 'name')->toArray();

        $stageNew = $stages['New Lead'] ?? array_values($stages)[0];
        $stageContacted = $stages['Contacted'] ?? $stageNew;
        $stageQualified = $stages['Qualified'] ?? $stageContacted;
        $stageRequirement = $stages['Requirement Collected'] ?? $stageQualified;
        $stageDemo = $stages['Meeting / Demo Scheduled'] ?? $stageRequirement;
        $stageProposal = $stages['Proposal Sent'] ?? $stageDemo;
        $stageNegotiation = $stages['Negotiation'] ?? $stageProposal;
        $stageWon = $stages['Confirmed / Won'] ?? $stageNegotiation;

        // Sources
        $sourceFacebook = Source::firstOrCreate(['name' => 'Facebook', 'created_by' => $companyId])->id;
        $sourceWhatsApp = Source::firstOrCreate(['name' => 'WhatsApp', 'created_by' => $companyId])->id;
        $sourceWebsite = Source::firstOrCreate(['name' => 'Website Inbound', 'created_by' => $companyId])->id;
        $sourceLinkedin = Source::firstOrCreate(['name' => 'Linkedin', 'created_by' => $companyId])->id;
        $sourceReferral = Source::firstOrCreate(['name' => 'Company Reference', 'created_by' => $companyId])->id;

        // Labels
        $labelHot = Label::where('name', 'Hot')->where('created_by', $companyId)->value('id') ?? '1';
        $labelWarm = Label::where('name', 'Warm')->where('created_by', $companyId)->value('id') ?? '2';
        $labelVIP = Label::where('name', '⭐ VIP')->where('created_by', $companyId)->value('id') ?? '4';
        $labelMeeting = Label::where('name', '📅 Meeting')->where('created_by', $companyId)->value('id') ?? '8';

        // Products
        $products = ProductServiceItem::where('created_by', $companyId)->pluck('id')->toArray();
        $prodList = !empty($products) ? (string)$products[0] : null;

        $leadsData = [
            [
                'name' => 'Kazi Shafiul Alam',
                'email' => 'shafiul@apextextile-bd.com',
                'phone' => '+880 1711-294821',
                'subject' => 'Call Center with CRM Setup for 30 Agents',
                'stage_id' => $stageRequirement,
                'source' => $sourceWebsite,
                'label' => $labelHot,
                'notes' => '<p>Apex Textile looking for dedicated CRM and IP PBX for their customer service department.</p>',
            ],
            [
                'name' => 'Syed Muntasir Billah',
                'email' => 'muntasir@pran-rfl-dist.com',
                'phone' => '+880 1819-338822',
                'subject' => 'Enterprise Multi-Warehouse Inventory System',
                'stage_id' => $stageDemo,
                'source' => $sourceReferral,
                'label' => $labelVIP,
                'notes' => '<p>Scheduled Zoom demo on Thursday 3:00 PM with head of supply chain.</p>',
            ],
            [
                'name' => 'Mahbubur Rahman Chowdhury',
                'email' => 'mahbub@chattogramport-logistics.com',
                'phone' => '+880 1814-772299',
                'subject' => 'VoIP IP Phone 50 Units & PBX Appliance',
                'stage_id' => $stageProposal,
                'source' => $sourceLinkedin,
                'label' => $labelHot,
                'notes' => '<p>Official quotation sent for 50 Fanvil X303P phones + Yeastar P550 appliance.</p>',
            ],
            [
                'name' => 'Dr. Farhana Yasmin',
                'email' => 'dr.farhana@citydentalhospital.com',
                'phone' => '+880 1712-445566',
                'subject' => 'Patient Appointment CRM & Bulk SMS Masking',
                'stage_id' => $stageQualified,
                'source' => $sourceFacebook,
                'label' => $labelWarm,
                'notes' => '<p>Interested in automated SMS appointment reminder feature.</p>',
            ],
            [
                'name' => 'Ahsan Habib',
                'email' => 'ahsan@dhakahomesbuilders.com',
                'phone' => '+880 1912-887711',
                'subject' => 'Real Estate Lead Management & Calling Solution',
                'stage_id' => $stageNegotiation,
                'source' => $sourceWhatsApp,
                'label' => $labelHot,
                'notes' => '<p>Negotiating on annual user license subscription discount for 15 sales executives.</p>',
            ],
            [
                'name' => 'Tahmidul Islam',
                'email' => 'tahmid@shwapno-retailpartner.com',
                'phone' => '+880 1611-998844',
                'subject' => 'Point of Sale & POS Hardware Integration',
                'stage_id' => $stageNew,
                'source' => $sourceWebsite,
                'label' => $labelWarm,
                'notes' => '<p>New web inquiry submitted through landing page pricing calculator.</p>',
            ],
            [
                'name' => 'Nasreen Sultana',
                'email' => 'nasreen@greenherbal-ecommerce.com',
                'phone' => '+880 1715-667788',
                'subject' => 'E-Commerce Order Management & Courier Tracking',
                'stage_id' => $stageContacted,
                'source' => $sourceFacebook,
                'label' => $labelWarm,
                'notes' => '<p>Contacted on WhatsApp, catalog and video overview shared.</p>',
            ],
            [
                'name' => 'Engr. Golam Sarwar',
                'email' => 'sarwar@walton-smarttech.com',
                'phone' => '+880 1716-554433',
                'subject' => 'Corporate Network Switch & MikroTik Core Router Supply',
                'stage_id' => $stageWon,
                'source' => $sourceReferral,
                'label' => $labelVIP,
                'notes' => '<p>Work order signed. Handed over to technical ops team for dispatch.</p>',
            ],
            [
                'name' => 'Faisal Mahmud',
                'email' => 'faisal@bengalcrafts-export.com',
                'phone' => '+880 1817-223344',
                'subject' => 'Annual IT AMC & Server Maintenance Support',
                'stage_id' => $stageProposal,
                'source' => $sourceLinkedin,
                'label' => $labelHot,
                'notes' => '<p>Proposal submitted for 24/7 SLA maintenance contract.</p>',
            ],
            [
                'name' => 'Rezaul Karim',
                'email' => 'rezaul@sylhettouristhotel.com',
                'phone' => '+880 1918-112233',
                'subject' => 'Hotel Room IP Telephony & Wi-Fi Network Setup',
                'stage_id' => $stageRequirement,
                'source' => $sourceWebsite,
                'label' => $labelMeeting,
                'notes' => '<p>Requirement collected for 40 rooms IP phones and central reception console.</p>',
            ],
        ];

        foreach ($leadsData as $idx => $lInfo) {
            $assignedUser = $salesUsers[$idx % count($salesUsers)];

            Lead::updateOrCreate(
                [
                    'email' => $lInfo['email'],
                    'created_by' => $companyId,
                ],
                [
                    'name' => $lInfo['name'],
                    'phone' => $lInfo['phone'],
                    'subject' => $lInfo['subject'],
                    'pipeline_id' => $pipeline->id,
                    'stage_id' => $lInfo['stage_id'],
                    'user_id' => $assignedUser,
                    'sources' => (string)$lInfo['source'],
                    'labels' => (string)$lInfo['label'],
                    'products' => $prodList,
                    'notes' => $lInfo['notes'],
                    'is_active' => true,
                    'is_converted' => ($lInfo['stage_id'] === $stageWon) ? 1 : 0,
                    'date' => now()->subDays(rand(1, 15)),
                    'creator_id' => $assignedUser,
                    'created_by' => $companyId,
                ]
            );
        }

        $this->command->info('10 Leads seeded successfully!');
    }
}

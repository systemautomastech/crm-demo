<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Warehouse;
use Automas\ProductService\Models\ProductServiceCategory;
use Automas\ProductService\Models\ProductServiceItem;
use Automas\ProductService\Models\ProductServiceUnit;
use Automas\ProductService\Models\ProductServiceTax;
use Automas\ProductService\Models\WarehouseStock;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $company = User::findOrFail(2);

        $companyId = $company->id;
        $this->command->info("Seeding Products & Services for company: {$company->name} (ID: {$companyId})");

        // 1. Taxes
        $standardVat = ProductServiceTax::firstOrCreate(
            ['tax_name' => 'Standard VAT (5%)', 'created_by' => $companyId],
            ['rate' => 5.00, 'creator_id' => $companyId]
        );

        // 2. Units
        $unitPcs = ProductServiceUnit::firstOrCreate(
            ['unit_name' => 'Pcs', 'created_by' => $companyId],
            ['creator_id' => $companyId]
        );

        $unitSet = ProductServiceUnit::firstOrCreate(
            ['unit_name' => 'Set', 'created_by' => $companyId],
            ['creator_id' => $companyId]
        );

        $unitMonth = ProductServiceUnit::firstOrCreate(
            ['unit_name' => 'Month', 'created_by' => $companyId],
            ['creator_id' => $companyId]
        );

        $unitYear = ProductServiceUnit::firstOrCreate(
            ['unit_name' => 'Year', 'created_by' => $companyId],
            ['creator_id' => $companyId]
        );

        $unitService = ProductServiceUnit::firstOrCreate(
            ['unit_name' => 'Service', 'created_by' => $companyId],
            ['creator_id' => $companyId]
        );

        // 3. Categories
        $categories = [
            'IP Hardware & Telephony' => ProductServiceCategory::firstOrCreate(
                ['name' => 'IP Hardware & Telephony', 'created_by' => $companyId],
                ['color' => '#3B82F6', 'creator_id' => $companyId]
            ),
            'Networking & Infrastructure' => ProductServiceCategory::firstOrCreate(
                ['name' => 'Networking & Infrastructure', 'created_by' => $companyId],
                ['color' => '#10B981', 'creator_id' => $companyId]
            ),
            'Enterprise Software & SaaS' => ProductServiceCategory::firstOrCreate(
                ['name' => 'Enterprise Software & SaaS', 'created_by' => $companyId],
                ['color' => '#E9591C', 'creator_id' => $companyId]
            ),
            'Implementation & IT Support' => ProductServiceCategory::firstOrCreate(
                ['name' => 'Implementation & IT Support', 'created_by' => $companyId],
                ['color' => '#8B5CF6', 'creator_id' => $companyId]
            ),
            'Digital Marketing & Messaging' => ProductServiceCategory::firstOrCreate(
                ['name' => 'Digital Marketing & Messaging', 'created_by' => $companyId],
                ['color' => '#EC4899', 'creator_id' => $companyId]
            ),
        ];

        // 4. Products & Services
        $itemsData = [
            // --- Physical Products ---
            [
                'name' => 'Fanvil X303P Enterprise PoE IP Phone',
                'sku' => 'SKU-FAN-X303P',
                'type' => 'product',
                'category_id' => $categories['IP Hardware & Telephony']->id,
                'unit' => $unitPcs->id,
                'sale_price' => 4500.00,
                'purchase_price' => 3400.00,
                'description' => '2.4-inch color screen enterprise IP Phone with 4 SIP lines, dual Fast Ethernet ports and integrated PoE support.',
            ],
            [
                'name' => 'Grandstream GRP2602W HD Wi-Fi IP Phone',
                'sku' => 'SKU-GS-GRP2602W',
                'type' => 'product',
                'category_id' => $categories['IP Hardware & Telephony']->id,
                'unit' => $unitPcs->id,
                'sale_price' => 6200.00,
                'purchase_price' => 4800.00,
                'description' => 'Essential 2-line Wi-Fi IP phone with HD audio, dual-band Wi-Fi 802.11 a/b/g/n/ac and enterprise-level security.',
            ],
            [
                'name' => 'Yeastar P550 VoIP PBX System Appliance',
                'sku' => 'SKU-YEA-P550',
                'type' => 'product',
                'category_id' => $categories['IP Hardware & Telephony']->id,
                'unit' => $unitSet->id,
                'sale_price' => 78500.00,
                'purchase_price' => 62000.00,
                'description' => 'Scalable IP PBX appliance supporting up to 50 users and 25 concurrent calls, built-in call recording and auto-provisioning.',
            ],
            [
                'name' => 'Cisco Catalyst 1000 24-Port Gigabit PoE+ Switch',
                'sku' => 'SKU-CISCO-C1000-24P',
                'type' => 'product',
                'category_id' => $categories['Networking & Infrastructure']->id,
                'unit' => $unitPcs->id,
                'sale_price' => 52000.00,
                'purchase_price' => 41500.00,
                'description' => 'Enterprise Layer 2 managed switch with 24 Gigabit Ethernet PoE+ ports, 195W power budget, and 4x 1G SFP uplinks.',
            ],
            [
                'name' => 'MikroTik CCR2004-16G-2S+ Cloud Core Router',
                'sku' => 'SKU-MT-CCR2004',
                'type' => 'product',
                'category_id' => $categories['Networking & Infrastructure']->id,
                'unit' => $unitPcs->id,
                'sale_price' => 48500.00,
                'purchase_price' => 38000.00,
                'description' => 'High performance router powered by Annapurna Labs Alpine v2 CPU with 16x Gigabit Ethernet and 2x 10G SFP+ cages.',
            ],
            [
                'name' => 'Jabra Evolve 20 Stereo USB Call Center Headset',
                'sku' => 'SKU-JAB-EV20-DUO',
                'type' => 'product',
                'category_id' => $categories['IP Hardware & Telephony']->id,
                'unit' => $unitPcs->id,
                'sale_price' => 4800.00,
                'purchase_price' => 3600.00,
                'description' => 'Professional wired binaural headset with noise-cancelling microphone and in-line call control unit.',
            ],
            [
                'name' => 'APC Smart-UPS 1500VA LCD 230V with SmartConnect',
                'sku' => 'SKU-APC-SMT1500I',
                'type' => 'product',
                'category_id' => $categories['Networking & Infrastructure']->id,
                'unit' => $unitPcs->id,
                'sale_price' => 64000.00,
                'purchase_price' => 51000.00,
                'description' => 'Intelligent and efficient network power protection from entry level to scaleable runtime. Pure sine wave output on battery.',
            ],

            // --- Professional Services ---
            [
                'name' => 'AutomasCRM Enterprise Cloud Subscription (Per Seat)',
                'sku' => 'SRV-CRM-ENT-M',
                'type' => 'service',
                'category_id' => $categories['Enterprise Software & SaaS']->id,
                'unit' => $unitMonth->id,
                'sale_price' => 1200.00,
                'purchase_price' => 0.00,
                'description' => 'Monthly cloud license per user including lead pipelines, deal tracking, multi-warehouse inventory, and accounting sync.',
            ],
            [
                'name' => 'Automas Omni-Channel Call Center Solution MRC',
                'sku' => 'SRV-CC-MRC-M',
                'type' => 'service',
                'category_id' => $categories['Enterprise Software & SaaS']->id,
                'unit' => $unitMonth->id,
                'sale_price' => 15000.00,
                'purchase_price' => 2000.00,
                'description' => 'Monthly recurring charges for dedicated PBX server hosting, automated call distribution (ACD), call recording and SLA support.',
            ],
            [
                'name' => 'Enterprise CRM Deployment & Onboarding Package',
                'sku' => 'SRV-CRM-ONBOARD',
                'type' => 'service',
                'category_id' => $categories['Implementation & IT Support']->id,
                'unit' => $unitService->id,
                'sale_price' => 45000.00,
                'purchase_price' => 10000.00,
                'description' => 'End-to-end CRM implementation including data migration, role & permission configuration, staff training, and workflow setup.',
            ],
            [
                'name' => 'VoIP PBX & Network Infrastructure Installation',
                'sku' => 'SRV-VOIP-INSTALL',
                'type' => 'service',
                'category_id' => $categories['Implementation & IT Support']->id,
                'unit' => $unitService->id,
                'sale_price' => 25000.00,
                'purchase_price' => 8000.00,
                'description' => 'On-site installation and configuration of IP PBX server, trunk routing, firewall port mapping, and IP phone auto-provisioning.',
            ],
            [
                'name' => 'Annual Comprehensive IT AMC & Maintenance Contract',
                'sku' => 'SRV-IT-AMC-Y',
                'type' => 'service',
                'category_id' => $categories['Implementation & IT Support']->id,
                'unit' => $unitYear->id,
                'sale_price' => 120000.00,
                'purchase_price' => 25000.00,
                'description' => 'Yearly Annual Maintenance Contract (AMC) providing 24/7 server monitoring, quarterly on-site hardware health checks, and emergency breakdown support.',
            ],
            [
                'name' => 'Enterprise Bulk SMS & WhatsApp Gateway Package',
                'sku' => 'SRV-SMS-PKG-100K',
                'type' => 'service',
                'category_id' => $categories['Digital Marketing & Messaging']->id,
                'unit' => $unitService->id,
                'sale_price' => 38000.00,
                'purchase_price' => 28000.00,
                'description' => '100,000 branded masking SMS package with instant DLR API integration, web portal access, and campaign scheduler.',
            ],
        ];

        // Fetch company's warehouses to allocate initial inventory for products
        $warehouses = Warehouse::where('created_by', $companyId)->get();

        foreach ($itemsData as $itemInfo) {
            $productItem = ProductServiceItem::updateOrCreate(
                [
                    'sku' => $itemInfo['sku'],
                    'created_by' => $companyId,
                ],
                [
                    'name' => $itemInfo['name'],
                    'type' => $itemInfo['type'],
                    'category_id' => $itemInfo['category_id'],
                    'unit' => $itemInfo['unit'],
                    'sale_price' => $itemInfo['sale_price'],
                    'purchase_price' => $itemInfo['purchase_price'],
                    'description' => $itemInfo['description'],
                    'is_active' => true,
                    'tax_ids' => [$standardVat->id],
                    'creator_id' => $companyId,
                    'created_by' => $companyId,
                ]
            );

            // If it's a physical product, allocate stock across existing warehouses
            if ($itemInfo['type'] === 'product' && $warehouses->isNotEmpty()) {
                foreach ($warehouses as $wh) {
                    WarehouseStock::updateOrCreate(
                        [
                            'product_id' => $productItem->id,
                            'warehouse_id' => $wh->id,
                        ],
                        [
                            'quantity' => rand(15, 60),
                        ]
                    );
                }
            }
        }

        $this->command->info('Products and Services seeded successfully with warehouse stocks!');
    }
}

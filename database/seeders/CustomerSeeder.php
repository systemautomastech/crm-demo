<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Customer;

class CustomerSeeder extends Seeder
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
        $this->command->info("Seeding 10 Business Customers for company: {$company->name} (ID: {$companyId})");

        // 10 Detailed Corporate Customers with unique and distinct Billing & Shipping Addresses
        $customersData = [
            [
                'customer_name' => 'Apex Footwear Ltd.',
                'customer_email' => 'corporate@apexfootwear.com',
                'customer_phone' => '+880 1711-294821',
                'contact_person_name' => 'Kazi Shafiul Alam',
                'contact_person_email' => 'shafiul.procurement@apexfootwear.com',
                'contact_person_mobile' => '+880 1711-294821',
                'tax_number' => 'BIN-123456789-0101',
                'payment_terms' => 'Net 30 Days',
                'same_as_billing' => false,
                'billing_address' => [
                    'name' => 'Apex Footwear Ltd. (HQ Accounts)',
                    'address_line_1' => 'House 06, Road 137, Block SE(D), Gulshan-1',
                    'address_line_2' => 'Level 5, Corporate Head Office',
                    'city' => 'Dhaka',
                    'state' => 'Dhaka Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '1212',
                ],
                'shipping_address' => [
                    'name' => 'Apex Footwear Central Delivery Hub',
                    'address_line_1' => 'Plot 45-48, Shafipur Industrial Area',
                    'address_line_2' => 'Apex Footwear Factory Gate 2',
                    'city' => 'Gazipur',
                    'state' => 'Dhaka Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '1751',
                ],
                'notes' => 'Key Enterprise Account. VIP customer for IP-PBX & Omnichannel CRM solutions.',
            ],
            [
                'customer_name' => 'Pran-RFL Group (Logistics Division)',
                'customer_email' => 'supplychain@pranrflgroup.com',
                'customer_phone' => '+880 1819-338822',
                'contact_person_name' => 'Syed Muntasir Billah',
                'contact_person_email' => 'muntasir.b@pranrflgroup.com',
                'contact_person_mobile' => '+880 1819-338822',
                'tax_number' => 'BIN-987654321-0202',
                'payment_terms' => 'Net 15 Days',
                'same_as_billing' => false,
                'billing_address' => [
                    'name' => 'PRAN-RFL Group Accounts Dept.',
                    'address_line_1' => 'PRAN-RFL Centre, 105 Middle Badda',
                    'address_line_2' => 'Level 7, Finance Wing',
                    'city' => 'Dhaka',
                    'state' => 'Dhaka Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '1212',
                ],
                'shipping_address' => [
                    'name' => 'PRAN Logistics & Distribution Warehouse',
                    'address_line_1' => 'Ghorashal Regional Depot, Danga',
                    'address_line_2' => 'Warehouse Gate 4, Loading Bay A',
                    'city' => 'Narsingdi',
                    'state' => 'Dhaka Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '1610',
                ],
                'notes' => 'Contracted for multi-warehouse management hardware and network switches.',
            ],
            [
                'customer_name' => 'Chattogram Marine Port Logistics',
                'customer_email' => 'info@chattogramport-logistics.com',
                'customer_phone' => '+880 1814-772299',
                'contact_person_name' => 'Mahbubur Rahman Chowdhury',
                'contact_person_email' => 'mahbub@chattogramport-logistics.com',
                'contact_person_mobile' => '+880 1814-772299',
                'tax_number' => 'BIN-554433221-0303',
                'payment_terms' => 'Immediate / Cash',
                'same_as_billing' => false,
                'billing_address' => [
                    'name' => 'Chattogram Marine Port Logistics (Finance)',
                    'address_line_1' => 'Agrabad Commercial Area, Double Mooring',
                    'address_line_2' => 'World Trade Center, Level 11',
                    'city' => 'Chattogram',
                    'state' => 'Chattogram Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '4100',
                ],
                'shipping_address' => [
                    'name' => 'Chattogram Port Container Terminal Store',
                    'address_line_1' => 'Port Access Road, Custom House Area',
                    'address_line_2' => 'Shed 14, Berth No 4',
                    'city' => 'Chattogram',
                    'state' => 'Chattogram Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '4101',
                ],
                'notes' => 'Port shipping logistics management firm using Automas VoIP infrastructure.',
            ],
            [
                'customer_name' => 'City Specialized Dental Hospital',
                'customer_email' => 'support@citydentalhospital.com',
                'customer_phone' => '+880 1712-445566',
                'contact_person_name' => 'Dr. Farhana Yasmin',
                'contact_person_email' => 'dr.farhana@citydentalhospital.com',
                'contact_person_mobile' => '+880 1712-445566',
                'tax_number' => 'BIN-667788990-0404',
                'payment_terms' => 'Advance 50%, Net 15 Days',
                'same_as_billing' => true,
                'billing_address' => [
                    'name' => 'City Specialized Dental Hospital',
                    'address_line_1' => 'Plot 22, Road 11, Block D, Banani',
                    'address_line_2' => 'Executive Office & Pharmacy',
                    'city' => 'Dhaka',
                    'state' => 'Dhaka Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '1213',
                ],
                'shipping_address' => [
                    'name' => 'City Specialized Dental Hospital',
                    'address_line_1' => 'Plot 22, Road 11, Block D, Banani',
                    'address_line_2' => 'Executive Office & Pharmacy',
                    'city' => 'Dhaka',
                    'state' => 'Dhaka Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '1213',
                ],
                'notes' => 'Uses Automas SMS gateway and automated patient appointment reminders.',
            ],
            [
                'customer_name' => 'Dhaka Homes & Properties Ltd.',
                'customer_email' => 'info@dhakahomesbuilders.com',
                'customer_phone' => '+880 1912-887711',
                'contact_person_name' => 'Ahsan Habib',
                'contact_person_email' => 'ahsan.sales@dhakahomesbuilders.com',
                'contact_person_mobile' => '+880 1912-887711',
                'tax_number' => 'BIN-332211445-0505',
                'payment_terms' => 'Net 30 Days',
                'same_as_billing' => false,
                'billing_address' => [
                    'name' => 'Dhaka Homes & Properties Ltd. Accounts',
                    'address_line_1' => 'Level 8, Concord Tower, 113 Kazi Nazrul Islam Avenue',
                    'address_line_2' => 'Banglamotor Corporate Suite',
                    'city' => 'Dhaka',
                    'state' => 'Dhaka Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '1000',
                ],
                'shipping_address' => [
                    'name' => 'Dhaka Homes Purbachal Site Office',
                    'address_line_1' => 'Sector 3, 300 Feet Expressway',
                    'address_line_2' => 'Project Management Complex',
                    'city' => 'Dhaka',
                    'state' => 'Dhaka Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '1229',
                ],
                'notes' => 'Real estate lead management client with 15 active CRM sales licenses.',
            ],
            [
                'customer_name' => 'Shwapno Super Shop (Partner Outlet)',
                'customer_email' => 'procurement@shwapno-retail.com',
                'customer_phone' => '+880 1611-998844',
                'contact_person_name' => 'Tahmidul Islam',
                'contact_person_email' => 'tahmid@shwapno-retail.com',
                'contact_person_mobile' => '+880 1611-998844',
                'tax_number' => 'BIN-445566778-0606',
                'payment_terms' => 'Net 15 Days',
                'same_as_billing' => false,
                'billing_address' => [
                    'name' => 'ACI Logistics Ltd. (Shwapno HQ)',
                    'address_line_1' => 'Novo Tower, Level 8, 270 Tejgaon I/A',
                    'address_line_2' => 'Finance & Procurement Wing',
                    'city' => 'Dhaka',
                    'state' => 'Dhaka Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '1208',
                ],
                'shipping_address' => [
                    'name' => 'Shwapno Central Fulfillment Center',
                    'address_line_1' => 'Plot 14-16, South Tejgaon Link Road',
                    'address_line_2' => 'Dock 3, Receiving Department',
                    'city' => 'Dhaka',
                    'state' => 'Dhaka Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '1208',
                ],
                'notes' => 'Point of Sale (POS) and inventory replenishment supply client.',
            ],
            [
                'customer_name' => 'Green Herbal E-Commerce BD',
                'customer_email' => 'orders@greenherbal-ecommerce.com',
                'customer_phone' => '+880 1715-667788',
                'contact_person_name' => 'Nasreen Sultana',
                'contact_person_email' => 'nasreen@greenherbal-ecommerce.com',
                'contact_person_mobile' => '+880 1715-667788',
                'tax_number' => 'BIN-778899001-0707',
                'payment_terms' => 'Immediate',
                'same_as_billing' => true,
                'billing_address' => [
                    'name' => 'Green Herbal E-Commerce BD',
                    'address_line_1' => 'House 45, Sector 4, Road 18, Uttara Model Town',
                    'address_line_2' => 'Floor 3, Packaging & Dispatch Unit',
                    'city' => 'Dhaka',
                    'state' => 'Dhaka Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '1230',
                ],
                'shipping_address' => [
                    'name' => 'Green Herbal E-Commerce BD',
                    'address_line_1' => 'House 45, Sector 4, Road 18, Uttara Model Town',
                    'address_line_2' => 'Floor 3, Packaging & Dispatch Unit',
                    'city' => 'Dhaka',
                    'state' => 'Dhaka Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '1230',
                ],
                'notes' => 'Social media commerce merchant integrated with Automas CRM Facebook chat.',
            ],
            [
                'customer_name' => 'Walton Smart-Tech Corporation',
                'customer_email' => 'enterprise@walton-smarttech.com',
                'customer_phone' => '+880 1716-554433',
                'contact_person_name' => 'Engr. Golam Sarwar',
                'contact_person_email' => 'sarwar.network@walton-smarttech.com',
                'contact_person_mobile' => '+880 1716-554433',
                'tax_number' => 'BIN-119922883-0808',
                'payment_terms' => 'Net 45 Days',
                'same_as_billing' => false,
                'billing_address' => [
                    'name' => 'Walton Corporate Office (Accounts)',
                    'address_line_1' => 'Plot 1088, Block I, Sabrina Sobhan Road',
                    'address_line_2' => 'Bashundhara R/A',
                    'city' => 'Dhaka',
                    'state' => 'Dhaka Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '1229',
                ],
                'shipping_address' => [
                    'name' => 'Walton Hi-Tech Industries PLC Plant',
                    'address_line_1' => 'Chandra, Kaliakair Industrial Zone',
                    'address_line_2' => 'IT Infrastructure Building, Gate 1',
                    'city' => 'Gazipur',
                    'state' => 'Dhaka Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '1751',
                ],
                'notes' => 'Bulk hardware buyer for Cisco enterprise switches and high-speed MikroTik routers.',
            ],
            [
                'customer_name' => 'Bengal Crafts & Agro Export',
                'customer_email' => 'export@bengalcrafts-export.com',
                'customer_phone' => '+880 1817-223344',
                'contact_person_name' => 'Faisal Mahmud',
                'contact_person_email' => 'faisal.export@bengalcrafts-export.com',
                'contact_person_mobile' => '+880 1817-223344',
                'tax_number' => 'BIN-882233445-0909',
                'payment_terms' => 'Net 30 Days',
                'same_as_billing' => false,
                'billing_address' => [
                    'name' => 'Bengal Crafts Head Office',
                    'address_line_1' => 'Shaheb Bazar Commercial Plaza',
                    'address_line_2' => 'Level 3, Suite 302',
                    'city' => 'Rajshahi',
                    'state' => 'Rajshahi Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '6000',
                ],
                'shipping_address' => [
                    'name' => 'Bengal Crafts Export Processing Warehouse',
                    'address_line_1' => 'Plot 18, Sopura BSCIC Industrial Estate',
                    'address_line_2' => 'Cold Storage & Dispatch Section',
                    'city' => 'Rajshahi',
                    'state' => 'Rajshahi Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '6203',
                ],
                'notes' => 'Subscribed to 24/7 IT AMC & Server Maintenance Support Contract.',
            ],
            [
                'customer_name' => 'Sylhet Grand Tourist Hotel & Resort',
                'customer_email' => 'info@sylhettouristhotel.com',
                'customer_phone' => '+880 1918-112233',
                'contact_person_name' => 'Rezaul Karim',
                'contact_person_email' => 'rezaul@sylhettouristhotel.com',
                'contact_person_mobile' => '+880 1918-112233',
                'tax_number' => 'BIN-991122334-1010',
                'payment_terms' => 'Net 15 Days',
                'same_as_billing' => false,
                'billing_address' => [
                    'name' => 'Sylhet Grand Holdings Ltd. (Finance)',
                    'address_line_1' => 'Zindabazar Point, Al-Hamra Shopping City',
                    'address_line_2' => 'Floor 9, Suite 904',
                    'city' => 'Sylhet',
                    'state' => 'Sylhet Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '3100',
                ],
                'shipping_address' => [
                    'name' => 'Sylhet Grand Tourist Hotel Property',
                    'address_line_1' => 'Subidbazar Main Road, Kotwali',
                    'address_line_2' => 'Hotel Receiving & IT Control Room',
                    'city' => 'Sylhet',
                    'state' => 'Sylhet Division',
                    'country' => 'Bangladesh',
                    'zip_code' => '3100',
                ],
                'notes' => 'Hospitality client with 40 rooms deployed with Fanvil PoE IP phones.',
            ],
        ];

        $lastCustomer = Customer::orderByDesc('id')->first();
        $startNumber = $lastCustomer ? (int)str_replace('CUST-', '', $lastCustomer->customer_code ?? '0') : 0;

        foreach ($customersData as $c) {
            $existing = Customer::where('customer_email', $c['customer_email'])
                ->where('created_by', $companyId)
                ->first();

            if (!$existing) {
                $startNumber++;
                $customerCode = 'CUST-' . str_pad($startNumber, 4, '0', STR_PAD_LEFT);
            } else {
                $customerCode = $existing->customer_code;
            }

            Customer::updateOrCreate(
                [
                    'customer_email' => $c['customer_email'],
                    'created_by' => $companyId,
                ],
                [
                    'customer_code' => $existing?->customer_code ?? $customerCode,
                    'customer_name' => $c['customer_name'],
                    'customer_phone' => $c['customer_phone'],
                    'contact_person_name' => $c['contact_person_name'],
                    'contact_person_email' => $c['contact_person_email'],
                    'contact_person_mobile' => $c['contact_person_mobile'],
                    'tax_number' => $c['tax_number'],
                    'payment_terms' => $c['payment_terms'],
                    'billing_address' => $c['billing_address'],
                    'shipping_address' => $c['shipping_address'],
                    'same_as_billing' => $c['same_as_billing'],
                    'other_informations' => 'Verified corporate customer profile',
                    'notes' => $c['notes'],
                    'is_active' => true,
                    'creator_id' => $companyId,
                    'created_by' => $companyId,
                ]
            );
        }

        $this->command->info('10 Business Customers seeded successfully with realistic Billing & Shipping Addresses!');
    }
}

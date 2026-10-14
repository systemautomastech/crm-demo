<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Warehouse;

class WarehouseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $company = User::findOrFail(2);

        $companyId = $company->id;
        $this->command->info("Seeding 10 Warehouses for company: {$company->name} (ID: {$companyId})");

        $warehousesData = [
            // --- 5 Inside Dhaka ---
            [
                'name' => 'Dhaka Central Hub - Tejgaon',
                'address' => 'Plot 14-16, Tejgaon Industrial Area',
                'city' => 'Dhaka',
                'zip_code' => '1208',
                'phone' => '+880 1711-234567',
                'email' => 'wh.tejgaon@automas.com.bd',
                'is_active' => true,
            ],
            [
                'name' => 'Uttara Regional Fulfillment Center',
                'address' => 'Sector 7, Road 13, Uttara Model Town',
                'city' => 'Dhaka',
                'zip_code' => '1230',
                'phone' => '+880 1819-345678',
                'email' => 'wh.uttara@automas.com.bd',
                'is_active' => true,
            ],
            [
                'name' => 'Mohammadpur Distribution Depot',
                'address' => 'House 132, Road 6, Mohammadia Housing Society, Mohammadpur',
                'city' => 'Dhaka',
                'zip_code' => '1207',
                'phone' => '+880 1898-778480',
                'email' => 'wh.mohammadpur@automas.com.bd',
                'is_active' => true,
            ],
            [
                'name' => 'Motijheel Corporate Warehouse',
                'address' => '45 Dilkusha Commercial Area, Motijheel',
                'city' => 'Dhaka',
                'zip_code' => '1000',
                'phone' => '+880 1912-456789',
                'email' => 'wh.motijheel@automas.com.bd',
                'is_active' => true,
            ],
            [
                'name' => 'Mirpur Logistics Depot',
                'address' => 'Plot 8, Block B, Section 10, Mirpur',
                'city' => 'Dhaka',
                'zip_code' => '1216',
                'phone' => '+880 1611-567890',
                'email' => 'wh.mirpur@automas.com.bd',
                'is_active' => true,
            ],

            // --- 5 Outside Dhaka (Across Bangladesh Divisions) ---
            [
                'name' => 'Chattogram Port Logistics Hub',
                'address' => 'Agrabad Commercial Area, Double Mooring',
                'city' => 'Chattogram',
                'zip_code' => '4100',
                'phone' => '+880 1814-567891',
                'email' => 'wh.chattogram@automas.com.bd',
                'is_active' => true,
            ],
            [
                'name' => 'Sylhet Divisional Depot',
                'address' => 'Subidbazar Main Road, Kotwali',
                'city' => 'Sylhet',
                'zip_code' => '3100',
                'phone' => '+880 1715-678912',
                'email' => 'wh.sylhet@automas.com.bd',
                'is_active' => true,
            ],
            [
                'name' => 'Rajshahi North Bengal Hub',
                'address' => 'Sopura Industrial Area, Boalia',
                'city' => 'Rajshahi',
                'zip_code' => '6203',
                'phone' => '+880 1716-789123',
                'email' => 'wh.rajshahi@automas.com.bd',
                'is_active' => true,
            ],
            [
                'name' => 'Khulna South-West Distribution Center',
                'address' => 'Khalishpur Industrial Area, Mujgunni',
                'city' => 'Khulna',
                'zip_code' => '9000',
                'phone' => '+880 1917-891234',
                'email' => 'wh.khulna@automas.com.bd',
                'is_active' => true,
            ],
            [
                'name' => 'Bogura Trade & Supply Center',
                'address' => 'Sherpur Road, Colony Area',
                'city' => 'Bogura',
                'zip_code' => '5800',
                'phone' => '+880 1518-912345',
                'email' => 'wh.bogura@automas.com.bd',
                'is_active' => true,
            ],
        ];

        foreach ($warehousesData as $wInfo) {
            Warehouse::updateOrCreate(
                [
                    'name' => $wInfo['name'],
                    'created_by' => $companyId,
                ],
                [
                    'address' => $wInfo['address'],
                    'city' => $wInfo['city'],
                    'zip_code' => $wInfo['zip_code'],
                    'phone' => $wInfo['phone'],
                    'email' => $wInfo['email'],
                    'is_active' => $wInfo['is_active'],
                    'creator_id' => $companyId,
                    'created_by' => $companyId,
                ]
            );
        }

        $this->command->info('10 Warehouses seeded successfully!');
    }
}

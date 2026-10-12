<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Warehouse;
use App\Models\Plan;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Automas\ProductService\Models\ProductServiceCategory;
use Automas\ProductService\Models\ProductServiceUnit;
use Automas\ProductService\Models\ProductServiceTax;
use Automas\ProductService\Models\ProductServiceItem;
use Automas\ProductService\Models\WarehouseStock;
use Automas\Hrm\Models\Branch;
use Automas\Hrm\Models\Department;
use Automas\Hrm\Models\Designation;

class DemoCompaniesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $superAdmin = User::where('type', 'superadmin')->first();
        if (!$superAdmin) {
            $superAdmin = User::firstOrCreate(
                ['email' => 'superadmin@automas.com'],
                [
                    'name' => 'Super Admin',
                    'email_verified_at' => now(),
                    'password' => Hash::make('Automas1234#'),
                    'type' => 'superadmin',
                    'lang' => 'en',
                    'mobile_no' => '+133344455566',
                    'total_user' => -1,
                    'creator_id' => null,
                    'created_by' => null,
                ]
            );
            $superAdmin->assignRole('superadmin');
        }

        $activePlan = Plan::where('status', true)->where('name', 'Professional Plan')->first()
            ?? Plan::where('status', true)->first();

        // 6 distinct demo companies
        $companiesData = [
            [
                'name' => 'Nexus Cloud Technologies',
                'email' => 'contact@nexuscloud.com',
                'phone' => '+1-555-0101',
                'address' => '742 Evergreen Terrace, Suite 400',
                'city' => 'Springfield',
                'zip' => '97477',
                'domain' => 'IT & Cloud Services',
                'branches' => ['Headquarters', 'East Coast Office'],
                'departments' => ['Engineering', 'Sales & Marketing', 'Customer Success', 'Finance'],
                'designations' => ['Senior Cloud Engineer', 'Sales Director', 'Technical Lead', 'Account Executive', 'Solutions Architect', 'Support Specialist'],
                'warehouses' => [
                    ['name' => 'Nexus Main Data Center', 'city' => 'Springfield', 'address' => '100 Technology Way', 'zip' => '97477', 'phone' => '+1-555-0102'],
                    ['name' => 'Nexus Logistics Hub', 'city' => 'Portland', 'address' => '500 Distribution Blvd', 'zip' => '97201', 'phone' => '+1-555-0103'],
                ],
                'users' => [
                    ['name' => 'Ethan Walker', 'email' => 'ethan@nexuscloud.com', 'role' => 'staff', 'phone' => '+1-555-0111', 'desig' => 'Sales Director'],
                    ['name' => 'Sophia Martinez', 'email' => 'sophia@nexuscloud.com', 'role' => 'staff', 'phone' => '+1-555-0112', 'desig' => 'Account Executive'],
                    ['name' => 'Liam Chen', 'email' => 'liam@nexuscloud.com', 'role' => 'staff', 'phone' => '+1-555-0113', 'desig' => 'Senior Cloud Engineer'],
                    ['name' => 'Olivia Davis', 'email' => 'olivia@nexuscloud.com', 'role' => 'staff', 'phone' => '+1-555-0114', 'desig' => 'Solutions Architect'],
                    ['name' => 'Mason Taylor', 'email' => 'mason@nexuscloud.com', 'role' => 'staff', 'phone' => '+1-555-0115', 'desig' => 'Technical Lead'],
                    ['name' => 'Global Finance Corp', 'email' => 'billing@globalfinance.com', 'role' => 'client', 'phone' => '+1-555-0116', 'address' => '1 Wall Street, New York, NY'],
                    ['name' => 'Starlight Media Ltd', 'email' => 'procurement@starlightmedia.com', 'role' => 'client', 'phone' => '+1-555-0117', 'address' => '200 Sunset Blvd, Los Angeles, CA'],
                ],
                'products' => [
                    ['name' => 'Managed Dedicated Server Pro', 'sku' => 'NEX-SRV-01', 'price' => 450.00, 'cost' => 280.00, 'type' => 'service', 'cat' => 'Infrastructure', 'desc' => 'Enterprise 32-core dedicated bare metal server with 1Gbps uplink and 24/7 SLA.'],
                    ['name' => 'Enterprise Cloud VPS - Tier 3', 'sku' => 'NEX-VPS-03', 'price' => 120.00, 'cost' => 65.00, 'type' => 'service', 'cat' => 'Infrastructure', 'desc' => 'High-performance cloud VPS with 16 vCPU, 32GB RAM, NVMe storage.'],
                    ['name' => 'IP-PBX Hosted Trunk License', 'sku' => 'NEX-PBX-10', 'price' => 85.00, 'cost' => 40.00, 'type' => 'service', 'cat' => 'Telecom', 'desc' => 'Unlimited SIP trunking license with international DID allocation and failover.'],
                    ['name' => 'Cisco Catalyst 9200 Switch', 'sku' => 'NEX-HW-01', 'price' => 1850.00, 'cost' => 1400.00, 'type' => 'product', 'cat' => 'Hardware', 'desc' => '48-port Gigabit PoE+ managed enterprise switch with redundant power supplies.'],
                    ['name' => 'Mikrotik CCR2004 Core Router', 'sku' => 'NEX-HW-02', 'price' => 620.00, 'cost' => 480.00, 'type' => 'product', 'cat' => 'Hardware', 'desc' => 'Carrier-grade cloud core router with 12x 10G SFP+ ports.'],
                    ['name' => 'Ubiquiti UniFi Pro Access Point', 'sku' => 'NEX-HW-03', 'price' => 180.00, 'cost' => 135.00, 'type' => 'product', 'cat' => 'Hardware', 'desc' => 'Dual-band Wi-Fi 6 enterprise access point supporting 300+ concurrent clients.'],
                    ['name' => 'Cat6A Shielded Patch Cord (3m)', 'sku' => 'NEX-ACC-01', 'price' => 15.00, 'cost' => 6.50, 'type' => 'product', 'cat' => 'Accessories', 'desc' => 'High-speed 10Gbps 500MHz pure copper shielded ethernet patch cable.'],
                    ['name' => 'Server Rack 42U Enclosure', 'sku' => 'NEX-HW-04', 'price' => 890.00, 'cost' => 620.00, 'type' => 'product', 'cat' => 'Hardware', 'desc' => 'Heavy-duty steel 19-inch 42U server cabinet with ventilated mesh doors.'],
                    ['name' => 'APC Smart-UPS 3000VA Rackmount', 'sku' => 'NEX-HW-05', 'price' => 1250.00, 'cost' => 950.00, 'type' => 'product', 'cat' => 'Hardware', 'desc' => 'Sine wave battery backup with SmartConnect network management card.'],
                    ['name' => 'Network Security & Firewall Audit', 'sku' => 'NEX-SRV-02', 'price' => 750.00, 'cost' => 300.00, 'type' => 'service', 'cat' => 'Consulting', 'desc' => 'Comprehensive vulnerability assessment and penetration testing report.'],
                    ['name' => 'Fiber Optic Transceiver 10G SFP+', 'sku' => 'NEX-ACC-02', 'price' => 45.00, 'cost' => 22.00, 'type' => 'product', 'cat' => 'Accessories', 'desc' => '10GBASE-SR 850nm 300m LC multi-mode optical transceiver.'],
                    ['name' => 'Disaster Recovery Backup License', 'sku' => 'NEX-SRV-03', 'price' => 95.00, 'cost' => 45.00, 'type' => 'service', 'cat' => 'Cloud Backup', 'desc' => 'Encrypted real-time off-site backup storage (1TB) with instant VM boot capability.'],
                ],
            ],
            [
                'name' => 'Apex Solar & Renewable Power',
                'email' => 'info@apexsolar.com',
                'phone' => '+1-555-0201',
                'address' => '1200 Sunbelt Industrial Blvd',
                'city' => 'Phoenix',
                'zip' => '85001',
                'domain' => 'Clean Energy & Solar Solutions',
                'branches' => ['Central Depot', 'Southwest Branch'],
                'departments' => ['Field Installation', 'Engineering & Design', 'Sales', 'Logistics'],
                'designations' => ['Senior Solar Engineer', 'Project Manager', 'Field Technician', 'Sales Consultant', 'Energy Auditor'],
                'warehouses' => [
                    ['name' => 'Apex Central Warehouse', 'city' => 'Phoenix', 'address' => '1200 Sunbelt Blvd', 'zip' => '85001', 'phone' => '+1-555-0202'],
                    ['name' => 'Apex Tucson Regional Yard', 'city' => 'Tucson', 'address' => '88 Desert Solar Way', 'zip' => '85701', 'phone' => '+1-555-0203'],
                ],
                'users' => [
                    ['name' => 'Lucas Vance', 'email' => 'lucas@apexsolar.com', 'role' => 'staff', 'phone' => '+1-555-0211', 'desig' => 'Senior Solar Engineer'],
                    ['name' => 'Ava Robinson', 'email' => 'ava@apexsolar.com', 'role' => 'staff', 'phone' => '+1-555-0212', 'desig' => 'Sales Consultant'],
                    ['name' => 'Noah Jenkins', 'email' => 'noah@apexsolar.com', 'role' => 'staff', 'phone' => '+1-555-0213', 'desig' => 'Project Manager'],
                    ['name' => 'Emma Wright', 'email' => 'emma@apexsolar.com', 'role' => 'staff', 'phone' => '+1-555-0214', 'desig' => 'Energy Auditor'],
                    ['name' => 'James Foster', 'email' => 'james@apexsolar.com', 'role' => 'staff', 'phone' => '+1-555-0215', 'desig' => 'Field Technician'],
                    ['name' => 'Green Horizon Estates', 'email' => 'management@greenhorizon.com', 'role' => 'client', 'phone' => '+1-555-0216', 'address' => '450 Oak Ridge Lane, Scottsdale, AZ'],
                    ['name' => 'Desert Springs Resort', 'email' => 'facilities@desertsprings.com', 'role' => 'client', 'phone' => '+1-555-0217', 'address' => '900 Palm Valley Dr, Phoenix, AZ'],
                ],
                'products' => [
                    ['name' => 'Monocrystalline Solar Panel 550W', 'sku' => 'APX-SOL-550', 'price' => 220.00, 'cost' => 160.00, 'type' => 'product', 'cat' => 'Solar Panels', 'desc' => 'Tier-1 high efficiency PERC half-cut cell solar module with 25-year warranty.'],
                    ['name' => 'Hybrid Solar Inverter 10kW', 'sku' => 'APX-INV-10K', 'price' => 1650.00, 'cost' => 1200.00, 'type' => 'product', 'cat' => 'Inverters', 'desc' => 'Three-phase smart on-grid/off-grid hybrid inverter with mobile app monitoring.'],
                    ['name' => 'Lithium Battery Storage 48V 100Ah', 'sku' => 'APX-BAT-48V', 'price' => 1400.00, 'cost' => 980.00, 'type' => 'product', 'cat' => 'Energy Storage', 'desc' => 'LiFePO4 wall-mounted modular battery unit with built-in intelligent BMS.'],
                    ['name' => 'Solar Mounting Aluminum Rail (4.2m)', 'sku' => 'APX-MNT-01', 'price' => 38.00, 'cost' => 22.00, 'type' => 'product', 'cat' => 'Mounting & Hardware', 'desc' => 'Anodized corrosion-resistant extruded aluminum rail for roof & ground mount.'],
                    ['name' => 'Solar PV Cable 6mm² (100m Roll)', 'sku' => 'APX-CBL-01', 'price' => 110.00, 'cost' => 75.00, 'type' => 'product', 'cat' => 'Cables & Connectors', 'desc' => 'UV-resistant double insulated halogen-free cross-linked solar cable.'],
                    ['name' => 'MC4 Waterproof Connector Pair', 'sku' => 'APX-CON-01', 'price' => 4.50, 'cost' => 1.80, 'type' => 'product', 'cat' => 'Cables & Connectors', 'desc' => 'IP68 waterproof male and female solar connector pair for PV strings.'],
                    ['name' => 'Residential Solar Installation Service', 'sku' => 'APX-SRV-01', 'price' => 850.00, 'cost' => 400.00, 'type' => 'service', 'cat' => 'Services', 'desc' => 'Complete rooftop installation, mechanical mounting, testing, and commissioning.'],
                    ['name' => 'Annual Preventive Maintenance Contract', 'sku' => 'APX-SRV-02', 'price' => 350.00, 'cost' => 120.00, 'type' => 'service', 'cat' => 'Services', 'desc' => 'Semi-annual panel cleaning, thermal imaging inspection, and inverter diagnostic.'],
                    ['name' => 'Surge Protection Device (SPD) Type II', 'sku' => 'APX-ELC-01', 'price' => 45.00, 'cost' => 25.00, 'type' => 'product', 'cat' => 'Electrical', 'desc' => '1000V DC lightning and voltage surge protector for solar combiners.'],
                    ['name' => 'Solar Smart Meter & CT Clamp', 'sku' => 'APX-ELC-02', 'price' => 135.00, 'cost' => 85.00, 'type' => 'product', 'cat' => 'Electrical', 'desc' => 'Bi-directional power meter with zero export control capability.'],
                    ['name' => 'Solar Water Heater System 200L', 'sku' => 'APX-THM-01', 'price' => 780.00, 'cost' => 520.00, 'type' => 'product', 'cat' => 'Thermal Systems', 'desc' => 'Pressurized solar thermal hot water heating system with auxiliary electric backup.'],
                ],
            ],
            [
                'name' => 'Prime Logistics & Freight Solutions',
                'email' => 'support@primelogistics.com',
                'phone' => '+1-555-0301',
                'address' => '880 Harbor Gateway Road',
                'city' => 'Long Beach',
                'zip' => '90802',
                'domain' => 'Supply Chain, Cargo & Freight',
                'branches' => ['Port Terminal Branch', 'Inland Logistics Center'],
                'departments' => ['Fleet Operations', 'Customs Clearance', 'Warehousing', 'Client Relations'],
                'designations' => ['Fleet Operations Manager', 'Customs Broker', 'Warehouse Supervisor', 'Freight Forwarder', 'Logistics Coordinator'],
                'warehouses' => [
                    ['name' => 'Harbor Cold Storage & Dry Goods', 'city' => 'Long Beach', 'address' => '880 Harbor Gateway', 'zip' => '90802', 'phone' => '+1-555-0302'],
                    ['name' => 'Inland Distribution Center', 'city' => 'Riverside', 'address' => '2100 Logistics Way', 'zip' => '92501', 'phone' => '+1-555-0303'],
                    ['name' => 'Air Cargo Transit Hub', 'city' => 'Los Angeles', 'address' => '5900 Aviation Blvd', 'zip' => '90045', 'phone' => '+1-555-0304'],
                ],
                'users' => [
                    ['name' => 'Benjamin Hayes', 'email' => 'benjamin@primelogistics.com', 'role' => 'staff', 'phone' => '+1-555-0311', 'desig' => 'Fleet Operations Manager'],
                    ['name' => 'Mia Cooper', 'email' => 'mia@primelogistics.com', 'role' => 'staff', 'phone' => '+1-555-0312', 'desig' => 'Customs Broker'],
                    ['name' => 'Henry Brooks', 'email' => 'henry@primelogistics.com', 'role' => 'staff', 'phone' => '+1-555-0313', 'desig' => 'Warehouse Supervisor'],
                    ['name' => 'Chloe Bennett', 'email' => 'chloe@primelogistics.com', 'role' => 'staff', 'phone' => '+1-555-0314', 'desig' => 'Logistics Coordinator'],
                    ['name' => 'Alexander Reed', 'email' => 'alexander@primelogistics.com', 'role' => 'staff', 'phone' => '+1-555-0315', 'desig' => 'Freight Forwarder'],
                    ['name' => 'Pacific Imports Inc', 'email' => 'supply@pacificimports.com', 'role' => 'client', 'phone' => '+1-555-0316', 'address' => '300 Pier Ave, Long Beach, CA'],
                    ['name' => 'Atlas Retail Group', 'email' => 'shipping@atlasretail.com', 'role' => 'client', 'phone' => '+1-555-0317', 'address' => '720 Commerce Way, San Diego, CA'],
                ],
                'products' => [
                    ['name' => 'Full Container Load (FCL) Shipping - 40ft', 'sku' => 'PLG-FCL-40', 'price' => 3200.00, 'cost' => 2400.00, 'type' => 'service', 'cat' => 'Ocean Freight', 'desc' => 'Standard dry 40ft container maritime transport door-to-port.'],
                    ['name' => 'Less than Container Load (LCL) per CBM', 'sku' => 'PLG-LCL-01', 'price' => 140.00, 'cost' => 90.00, 'type' => 'service', 'cat' => 'Ocean Freight', 'desc' => 'Consolidated ocean freight rate per cubic meter (min 1 CBM).'],
                    ['name' => 'Express Air Freight Courier (per kg)', 'sku' => 'PLG-AIR-01', 'price' => 8.50, 'cost' => 5.20, 'type' => 'service', 'cat' => 'Air Freight', 'desc' => 'International priority air cargo service with 3-5 days delivery.'],
                    ['name' => 'Heavy Duty Euro Wooden Pallet', 'sku' => 'PLG-MAT-01', 'price' => 22.00, 'cost' => 14.00, 'type' => 'product', 'cat' => 'Packaging Materials', 'desc' => 'Heat-treated standard EPAL compliant 1200x800mm wooden pallet.'],
                    ['name' => 'Industrial Stretch Film Roll (500mm)', 'sku' => 'PLG-MAT-02', 'price' => 18.50, 'cost' => 11.00, 'type' => 'product', 'cat' => 'Packaging Materials', 'desc' => 'High-grade 23-micron stretch wrap film for secure palletized cargo.'],
                    ['name' => 'Customs Clearance & Brokerage Service', 'sku' => 'PLG-SRV-01', 'price' => 280.00, 'cost' => 110.00, 'type' => 'service', 'cat' => 'Customs', 'desc' => 'Import declaration, tariff classification, and documentation processing.'],
                    ['name' => 'Temperature-Controlled Storage (per Pallet/mo)', 'sku' => 'PLG-SRV-02', 'price' => 45.00, 'cost' => 18.00, 'type' => 'service', 'cat' => 'Warehousing', 'desc' => 'Secure climate-controlled pharmaceutical & food grade warehouse storage.'],
                    ['name' => 'Cargo Security Bolt Seals (Box of 50)', 'sku' => 'PLG-MAT-03', 'price' => 65.00, 'cost' => 35.00, 'type' => 'product', 'cat' => 'Security & Seals', 'desc' => 'ISO 17712 certified high security tamper-evident container bolt seals.'],
                    ['name' => 'Cross-Docking & Distribution Service', 'sku' => 'PLG-SRV-03', 'price' => 380.00, 'cost' => 180.00, 'type' => 'service', 'cat' => 'Warehousing', 'desc' => 'Direct inbound to outbound transfer without intermediate long-term storage.'],
                    ['name' => 'Heavy Cargo Ratchet Tie-Down Strap (9m)', 'sku' => 'PLG-MAT-04', 'price' => 28.00, 'cost' => 15.00, 'type' => 'product', 'cat' => 'Cargo Equipment', 'desc' => '5000kg breaking strength heavy-duty polyester cargo lashing strap.'],
                ],
            ],
            [
                'name' => 'Quantum Health & Medical Devices',
                'email' => 'contact@quantumhealth.com',
                'phone' => '+1-555-0401',
                'address' => '350 BioTech Parkway, Building B',
                'city' => 'Boston',
                'zip' => '02115',
                'domain' => 'Medical Equipment, Diagnostics & Healthcare',
                'branches' => ['Main Innovation Hub', 'New England Logistics'],
                'departments' => ['Biomedical Engineering', 'Clinical Quality Assurance', 'Medical Sales', 'Technical Support'],
                'designations' => ['Lead Biomedical Engineer', 'Clinical Specialist', 'Medical Sales Representative', 'Quality Assurance Officer', 'Field Service Engineer'],
                'warehouses' => [
                    ['name' => 'Quantum Cleanroom Warehouse', 'city' => 'Boston', 'address' => '350 BioTech Parkway', 'zip' => '02115', 'phone' => '+1-555-0402'],
                    ['name' => 'Quantum East Coast Depot', 'city' => 'Cambridge', 'address' => '120 Innovation Way', 'zip' => '02142', 'phone' => '+1-555-0403'],
                ],
                'users' => [
                    ['name' => 'Dr. William Parker', 'email' => 'william@quantumhealth.com', 'role' => 'staff', 'phone' => '+1-555-0411', 'desig' => 'Lead Biomedical Engineer'],
                    ['name' => 'Charlotte Hughes', 'email' => 'charlotte@quantumhealth.com', 'role' => 'staff', 'phone' => '+1-555-0412', 'desig' => 'Clinical Specialist'],
                    ['name' => 'Daniel Kim', 'email' => 'daniel@quantumhealth.com', 'role' => 'staff', 'phone' => '+1-555-0413', 'desig' => 'Medical Sales Representative'],
                    ['name' => 'Harper Collins', 'email' => 'harper@quantumhealth.com', 'role' => 'staff', 'phone' => '+1-555-0414', 'desig' => 'Quality Assurance Officer'],
                    ['name' => 'Lucas Gray', 'email' => 'lucas.g@quantumhealth.com', 'role' => 'staff', 'phone' => '+1-555-0415', 'desig' => 'Field Service Engineer'],
                    ['name' => 'City General Hospital', 'email' => 'purchasing@citygeneralhospital.org', 'role' => 'client', 'phone' => '+1-555-0416', 'address' => '700 Health Blvd, Boston, MA'],
                    ['name' => 'Evergreen Medical Clinic', 'email' => 'admin@evergreenclinic.com', 'role' => 'client', 'phone' => '+1-555-0417', 'address' => '150 Medical Center Dr, Newton, MA'],
                ],
                'products' => [
                    ['name' => 'Multiparameter Patient Monitor 12-inch', 'sku' => 'QTM-MED-01', 'price' => 2400.00, 'cost' => 1650.00, 'type' => 'product', 'cat' => 'Diagnostic Devices', 'desc' => 'ECG, SpO2, NIBP, Respiration, Temperature ICU patient monitoring system.'],
                    ['name' => 'Digital Ultrasonic Diagnostic Machine', 'sku' => 'QTM-MED-02', 'price' => 8500.00, 'cost' => 6100.00, 'type' => 'product', 'cat' => 'Diagnostic Devices', 'desc' => 'Color Doppler ultrasound scanner with convex and linear array probes.'],
                    ['name' => 'Automated External Defibrillator (AED)', 'sku' => 'QTM-MED-03', 'price' => 1350.00, 'cost' => 920.00, 'type' => 'product', 'cat' => 'Emergency Equipment', 'desc' => 'Portable life-saving AED with voice prompts and adult/pediatric smart pads.'],
                    ['name' => 'Electric Hospital Bed with ICU Mattress', 'sku' => 'QTM-FURN-01', 'price' => 1950.00, 'cost' => 1300.00, 'type' => 'product', 'cat' => 'Hospital Furniture', 'desc' => '5-function motorized medical bed with anti-decubitus pressure relief mattress.'],
                    ['name' => 'Pulse Oximeter Fingertip Probe (Box of 10)', 'sku' => 'QTM-ACC-01', 'price' => 120.00, 'cost' => 60.00, 'type' => 'product', 'cat' => 'Consumables', 'desc' => 'High-accuracy OLED display digital fingertip pulse oxygen monitors.'],
                    ['name' => 'Medical Equipment Calibration Service', 'sku' => 'QTM-SRV-01', 'price' => 450.00, 'cost' => 180.00, 'type' => 'service', 'cat' => 'Maintenance', 'desc' => 'Certified biomedical electrical safety and measurement calibration report.'],
                    ['name' => 'Surgical LED Shadowless Operating Lamp', 'sku' => 'QTM-MED-04', 'price' => 3800.00, 'cost' => 2600.00, 'type' => 'product', 'cat' => 'Surgical Equipment', 'desc' => 'Dual ceiling-mounted cold light LED surgical theater illumination system.'],
                    ['name' => 'Hospital Syringe Infusion Pump', 'sku' => 'QTM-MED-05', 'price' => 850.00, 'cost' => 540.00, 'type' => 'product', 'cat' => 'Diagnostic Devices', 'desc' => 'High-precision micro-infusion syringe pump with multi-alarm safety system.'],
                    ['name' => 'Sterile Nitrile Medical Gloves (Case of 1000)', 'sku' => 'QTM-CON-02', 'price' => 85.00, 'cost' => 48.00, 'type' => 'product', 'cat' => 'Consumables', 'desc' => 'Powder-free medical grade examination gloves conforming to ASTM D6319.'],
                    ['name' => 'Quarterly Biomedical Equipment AMC', 'sku' => 'QTM-SRV-02', 'price' => 600.00, 'cost' => 220.00, 'type' => 'service', 'cat' => 'Maintenance', 'desc' => 'Comprehensive preventative maintenance agreement for hospital ICU equipment.'],
                ],
            ],
            [
                'name' => 'Vanguard Construction & Real Estate',
                'email' => 'build@vanguardrealty.com',
                'phone' => '+1-555-0501',
                'address' => '500 Skyline Drive, Tower One',
                'city' => 'Dallas',
                'zip' => '75201',
                'domain' => 'Commercial Construction & Architecture',
                'branches' => ['Dallas HQ', 'Fort Worth Project Site'],
                'departments' => ['Civil Engineering', 'Architecture & Design', 'Procurement', 'Safety & Compliance'],
                'designations' => ['Principal Architect', 'Structural Engineer', 'Site Safety Officer', 'Procurement Manager', 'Site Superintendent'],
                'warehouses' => [
                    ['name' => 'Vanguard Materials Depot - North', 'city' => 'Dallas', 'address' => '500 Skyline Dr', 'zip' => '75201', 'phone' => '+1-555-0502'],
                    ['name' => 'Vanguard Equipment Storage - South', 'city' => 'Fort Worth', 'address' => '1800 Industrial Park', 'zip' => '76102', 'phone' => '+1-555-0503'],
                ],
                'users' => [
                    ['name' => 'Marcus Sterling', 'email' => 'marcus@vanguardrealty.com', 'role' => 'staff', 'phone' => '+1-555-0511', 'desig' => 'Principal Architect'],
                    ['name' => 'Isabella Ross', 'email' => 'isabella@vanguardrealty.com', 'role' => 'staff', 'phone' => '+1-555-0512', 'desig' => 'Structural Engineer'],
                    ['name' => 'Gabriel Santos', 'email' => 'gabriel@vanguardrealty.com', 'role' => 'staff', 'phone' => '+1-555-0513', 'desig' => 'Site Superintendent'],
                    ['name' => 'Hannah Morgan', 'email' => 'hannah@vanguardrealty.com', 'role' => 'staff', 'phone' => '+1-555-0514', 'desig' => 'Procurement Manager'],
                    ['name' => 'Samuel Peterson', 'email' => 'samuel@vanguardrealty.com', 'role' => 'staff', 'phone' => '+1-555-0515', 'desig' => 'Site Safety Officer'],
                    ['name' => 'Oakwood Commercial Properties', 'email' => 'projects@oakwoodcommercial.com', 'role' => 'client', 'phone' => '+1-555-0516', 'address' => '1200 Main St, Dallas, TX'],
                    ['name' => 'Summit Hospitality Group', 'email' => 'development@summithg.com', 'role' => 'client', 'phone' => '+1-555-0517', 'address' => '400 Riverwalk Way, Austin, TX'],
                ],
                'products' => [
                    ['name' => 'Portland Cement Grade 43 (50kg Bag)', 'sku' => 'VNG-MAT-01', 'price' => 9.50, 'cost' => 6.20, 'type' => 'product', 'cat' => 'Building Materials', 'desc' => 'High-early strength general construction Portland composite cement.'],
                    ['name' => 'Deformed Steel Rebar 16mm (12m Length)', 'sku' => 'VNG-MAT-02', 'price' => 24.00, 'cost' => 17.50, 'type' => 'product', 'cat' => 'Building Materials', 'desc' => 'High yield strength grade 60 thermo-mechanically treated steel rebar.'],
                    ['name' => 'Heavy Duty Rotary Laser Level Kit', 'sku' => 'VNG-TLS-01', 'price' => 680.00, 'cost' => 450.00, 'type' => 'product', 'cat' => 'Tools & Equipment', 'desc' => 'Self-leveling 360-degree green beam rotary laser with tripod and receiver.'],
                    ['name' => 'Architectural 3D Concept Design Service', 'sku' => 'VNG-SRV-01', 'price' => 1500.00, 'cost' => 600.00, 'type' => 'service', 'cat' => 'Design & Engineering', 'desc' => 'Complete architectural floor plans, elevation renders, and BIM 3D models.'],
                    ['name' => 'Structural Engineering Calculation & Signoff', 'sku' => 'VNG-SRV-02', 'price' => 1200.00, 'cost' => 500.00, 'type' => 'service', 'cat' => 'Design & Engineering', 'desc' => 'Certified structural load-bearing calculation and safety documentation.'],
                    ['name' => 'Heavy Duty Construction Safety Helmet', 'sku' => 'VNG-PPE-01', 'price' => 25.00, 'cost' => 12.00, 'type' => 'product', 'cat' => 'Safety & PPE', 'desc' => 'ANSI Z89.1 Type 1 Class E certified high-impact vented safety hard hat.'],
                    ['name' => 'Industrial High-Pressure Concrete Pump Hire', 'sku' => 'VNG-SRV-03', 'price' => 950.00, 'cost' => 450.00, 'type' => 'service', 'cat' => 'Machinery Rental', 'desc' => 'Boom truck concrete pumping service per 8-hour shift with certified operator.'],
                    ['name' => 'Vitreous Heavy Duty Floor Tiles (Box 1.44m²)', 'sku' => 'VNG-MAT-03', 'price' => 32.00, 'cost' => 19.00, 'type' => 'product', 'cat' => 'Finishing', 'desc' => 'Non-slip 600x600mm glazed porcelain floor tiles for commercial spaces.'],
                    ['name' => 'Scaffolding Steel Frame Set (2m Height)', 'sku' => 'VNG-TLS-02', 'price' => 145.00, 'cost' => 95.00, 'type' => 'product', 'cat' => 'Tools & Equipment', 'desc' => 'Heavy galvanized modular scaffolding walk-through frame with cross braces.'],
                    ['name' => 'Site Soil & Geotechnical Test Report', 'sku' => 'VNG-SRV-04', 'price' => 800.00, 'cost' => 320.00, 'type' => 'service', 'cat' => 'Consulting', 'desc' => 'Core soil boring analysis and standard penetration test foundation report.'],
                ],
            ],
            [
                'name' => 'Zenith Automated Retail & POS',
                'email' => 'hello@zenithpos.com',
                'phone' => '+1-555-0601',
                'address' => '100 Innovation Boulevard, 5th Floor',
                'city' => 'Seattle',
                'zip' => '98101',
                'domain' => 'Smart Retail, POS & Payment Hardware',
                'branches' => ['Pacific Northwest HQ', 'Tech Distribution Hub'],
                'departments' => ['Product Development', 'Hardware Deployment', 'Software Support', 'Retail Sales'],
                'designations' => ['Lead Hardware Engineer', 'POS Deployment Specialist', 'Retail Account Executive', 'Technical Support Lead', 'Customer Success Manager'],
                'warehouses' => [
                    ['name' => 'Zenith West Coast Fulfilment', 'city' => 'Seattle', 'address' => '100 Innovation Blvd', 'zip' => '98101', 'phone' => '+1-555-0602'],
                    ['name' => 'Zenith Regional Depot - South', 'city' => 'Tacoma', 'address' => '420 Bayview Ave', 'zip' => '98402', 'phone' => '+1-555-0603'],
                ],
                'users' => [
                    ['name' => 'Oliver Mitchell', 'email' => 'oliver@zenithpos.com', 'role' => 'staff', 'phone' => '+1-555-0611', 'desig' => 'Lead Hardware Engineer'],
                    ['name' => 'Grace Kelly', 'email' => 'grace@zenithpos.com', 'role' => 'staff', 'phone' => '+1-555-0612', 'desig' => 'Retail Account Executive'],
                    ['name' => 'Jack Reynolds', 'email' => 'jack@zenithpos.com', 'role' => 'staff', 'phone' => '+1-555-0613', 'desig' => 'POS Deployment Specialist'],
                    ['name' => 'Lily Campbell', 'email' => 'lily@zenithpos.com', 'role' => 'staff', 'phone' => '+1-555-0614', 'desig' => 'Customer Success Manager'],
                    ['name' => 'Leo Edwards', 'email' => 'leo@zenithpos.com', 'role' => 'staff', 'phone' => '+1-555-0615', 'desig' => 'Technical Support Lead'],
                    ['name' => 'Urban Coffee Roasters', 'email' => 'operations@urbancoffee.com', 'role' => 'client', 'phone' => '+1-555-0616', 'address' => '312 Pike Street, Seattle, WA'],
                    ['name' => 'Northwest Gourmet Supermarket', 'email' => 'it@nwsupermarket.com', 'role' => 'client', 'phone' => '+1-555-0617', 'address' => '850 Pine Ave, Bellevue, WA'],
                ],
                'products' => [
                    ['name' => 'Zenith Touch Dual-Screen POS Terminal 15.6"', 'sku' => 'ZTH-POS-01', 'price' => 850.00, 'cost' => 580.00, 'type' => 'product', 'cat' => 'POS Terminals', 'desc' => 'All-in-one Intel i5 POS terminal with 15.6" capacitive touch & 11.6" customer display.'],
                    ['name' => 'Thermal Receipt Printer 80mm Auto-Cut', 'sku' => 'ZTH-PRN-01', 'price' => 135.00, 'cost' => 82.00, 'type' => 'product', 'cat' => 'Printers', 'desc' => 'High speed 250mm/s thermal printer with USB, Serial, and Ethernet connectivity.'],
                    ['name' => '2D Wireless Barcode Scanner & Cradle', 'sku' => 'ZTH-SCN-01', 'price' => 110.00, 'cost' => 65.00, 'type' => 'product', 'cat' => 'Scanners', 'desc' => 'Bluetooth 1D/2D QR code reader with 50m wireless range and drop-proof casing.'],
                    ['name' => 'Heavy Duty Steel Cash Drawer (5 Bill / 8 Coin)', 'sku' => 'ZTH-CSH-01', 'price' => 75.00, 'cost' => 45.00, 'type' => 'product', 'cat' => 'Cash Drawers', 'desc' => 'RJ11 interface automated opening metal cash drawer with lockable lid.'],
                    ['name' => 'Cloud POS Monthly Multi-Outlet Subscription', 'sku' => 'ZTH-SRV-01', 'price' => 65.00, 'cost' => 20.00, 'type' => 'service', 'cat' => 'Software & Cloud', 'desc' => 'Cloud inventory sync, employee management, CRM, and real-time sales reporting.'],
                    ['name' => 'On-Site Hardware Installation & Training', 'sku' => 'ZTH-SRV-02', 'price' => 250.00, 'cost' => 100.00, 'type' => 'service', 'cat' => 'Professional Services', 'desc' => 'Complete hardware setup, staff training, network configuration, and testing.'],
                    ['name' => 'Thermal Paper Rolls 80x80mm (Box of 50)', 'sku' => 'ZTH-SUP-01', 'price' => 42.00, 'cost' => 22.00, 'type' => 'product', 'cat' => 'Consumables', 'desc' => 'BPA-free premium quality high-contrast white thermal paper receipt rolls.'],
                    ['name' => 'Self-Service Payment Kiosk 21.5"', 'sku' => 'ZTH-POS-02', 'price' => 2200.00, 'cost' => 1500.00, 'type' => 'product', 'cat' => 'POS Terminals', 'desc' => 'Interactive customer self-ordering kiosk with built-in printer and card reader.'],
                    ['name' => 'Handheld Mobile Android POS Terminal', 'sku' => 'ZTH-POS-03', 'price' => 320.00, 'cost' => 210.00, 'type' => 'product', 'cat' => 'POS Terminals', 'desc' => '5.5" Android handheld with built-in thermal printer, 4G, and NFC payment support.'],
                    ['name' => 'Electronic Shelf Label (ESL) E-Ink Tag 2.9"', 'sku' => 'ZTH-ESL-01', 'price' => 14.50, 'cost' => 8.00, 'type' => 'product', 'cat' => 'Smart Retail', 'desc' => '3-color E-ink digital price tag with wireless zigbee base station update.'],
                ],
            ],
        ];

        foreach ($companiesData as $cIdx => $cData) {
            // 1. Create or Find Company User
            $company = User::firstOrCreate(
                ['email' => $cData['email']],
                [
                    'name' => $cData['name'],
                    'email_verified_at' => now(),
                    'password' => Hash::make('Automas1234#'),
                    'mobile_no' => $cData['phone'],
                    'type' => 'company',
                    'lang' => 'en',
                    'active_plan' => $activePlan?->id ?? 1,
                    'plan_expire_date' => now()->addYear()->format('Y-m-d'),
                    'total_user' => 100,
                    'storage_limit' => 10485800,
                    'creator_id' => $superAdmin->id,
                    'created_by' => $superAdmin->id,
                ]
            );

            // Assign company role
            if (!$company->hasRole('company')) {
                $company->assignRole('company');
            }

            // Setup Company Defaults
            User::CompanySetting($company->id);
            User::MakeRole($company->id);

            // Custom company settings
            setSetting('company_name', $cData['name'], $company->id);
            setSetting('company_email', $cData['email'], $company->id);
            setSetting('company_phone', $cData['phone'], $company->id);
            setSetting('company_telephone', $cData['phone'], $company->id);
            setSetting('company_address', $cData['address'] . ', ' . $cData['city'] . ' ' . $cData['zip'], $company->id);
            setSetting('template_color', ['#E9591C', '#0ea5e9', '#10b981', '#6366f1', '#f59e0b', '#8b5cf6'][$cIdx % 6], $company->id);

            // 2. Setup HRM Hierarchy (Branches, Departments, Designations)
            $branchModels = [];
            foreach ($cData['branches'] as $bName) {
                $branchModels[] = Branch::firstOrCreate(
                    ['branch_name' => $bName, 'creator_id' => $company->id],
                    ['created_by' => $company->id]
                );
            }
            $defaultBranch = $branchModels[0] ?? null;

            $deptModels = [];
            foreach ($cData['departments'] as $dName) {
                $deptModels[] = Department::firstOrCreate(
                    ['department_name' => $dName, 'creator_id' => $company->id],
                    [
                        'branch_id' => $defaultBranch?->id,
                        'emp_id_prefix' => strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $dName), 0, 3)),
                        'created_by' => $company->id
                    ]
                );
            }
            $defaultDept = $deptModels[0] ?? null;

            $desigModels = [];
            foreach ($cData['designations'] as $dsName) {
                $desigModels[$dsName] = Designation::firstOrCreate(
                    ['designation_name' => $dsName, 'creator_id' => $company->id],
                    [
                        'branch_id' => $defaultBranch?->id,
                        'department_id' => $defaultDept?->id,
                        'created_by' => $company->id
                    ]
                );
            }

            // 3. Create Company Warehouses (2-3 per company)
            $createdWarehouses = [];
            foreach ($cData['warehouses'] as $wData) {
                $createdWarehouses[] = Warehouse::firstOrCreate(
                    ['name' => $wData['name'], 'creator_id' => $company->id],
                    [
                        'address' => $wData['address'],
                        'city' => $wData['city'],
                        'zip_code' => $wData['zip'],
                        'phone' => $wData['phone'],
                        'email' => $cData['email'],
                        'is_active' => true,
                        'created_by' => $company->id,
                    ]
                );
            }
            $primaryWarehouse = $createdWarehouses[0] ?? null;

            // 4. Create Taxes, Units, and Categories for Products
            $taxStandard = ProductServiceTax::firstOrCreate(
                ['tax_name' => 'Standard VAT (5%)', 'creator_id' => $company->id],
                ['rate' => 5.00, 'created_by' => $company->id]
            );
            $taxGovt = ProductServiceTax::firstOrCreate(
                ['tax_name' => 'Govt Tax (10%)', 'creator_id' => $company->id],
                ['rate' => 10.00, 'created_by' => $company->id]
            );

            $unitPcs = ProductServiceUnit::firstOrCreate(
                ['unit_name' => 'Piece (Pcs)', 'creator_id' => $company->id],
                ['created_by' => $company->id]
            );
            $unitSet = ProductServiceUnit::firstOrCreate(
                ['unit_name' => 'Set / Unit', 'creator_id' => $company->id],
                ['created_by' => $company->id]
            );
            $unitMonth = ProductServiceUnit::firstOrCreate(
                ['unit_name' => 'Month', 'creator_id' => $company->id],
                ['created_by' => $company->id]
            );

            // 5. Create 10 to 15 Products/Services and Assign Warehouse Stock
            foreach ($cData['products'] as $pIdx => $prod) {
                $category = ProductServiceCategory::firstOrCreate(
                    ['name' => $prod['cat'], 'creator_id' => $company->id],
                    ['color' => '#E9591C', 'created_by' => $company->id]
                );

                $unit = ($prod['type'] === 'service') ? $unitMonth : $unitPcs;

                $productItem = ProductServiceItem::firstOrCreate(
                    ['sku' => $prod['sku'], 'creator_id' => $company->id],
                    [
                        'name' => $prod['name'],
                        'category_id' => $category->id,
                        'description' => $prod['desc'],
                        'sale_price' => $prod['price'],
                        'purchase_price' => $prod['cost'],
                        'unit' => $unit->id,
                        'type' => $prod['type'],
                        'is_active' => true,
                        'tax_ids' => [$taxStandard->id],
                        'created_by' => $company->id,
                    ]
                );

                // Assign stock to warehouses
                if ($prod['type'] === 'product') {
                    foreach ($createdWarehouses as $wIndex => $wh) {
                        WarehouseStock::updateOrCreate(
                            ['product_id' => $productItem->id, 'warehouse_id' => $wh->id],
                            ['quantity' => rand(25, 150) * ($wIndex + 1)]
                        );
                    }
                }
            }

            // 6. Create Multiple Users (Staff and Clients)
            $staffRole = Role::where('name', 'staff')->where('created_by', $company->id)->first()
                ?? Role::where('name', 'staff')->first();
            $clientRole = Role::where('name', 'client')->where('created_by', $company->id)->first()
                ?? Role::where('name', 'client')->first();

            $empCounter = 1;
            foreach ($cData['users'] as $uIndex => $uData) {
                $user = User::firstOrCreate(
                    ['email' => $uData['email']],
                    [
                        'name' => $uData['name'],
                        'email_verified_at' => now(),
                        'password' => Hash::make('Automas1234#'),
                        'mobile_no' => $uData['phone'] ?? null,
                        'type' => $uData['role'],
                        'lang' => 'en',
                        'is_enable_login' => 1,
                        'active_status' => 1,
                        'creator_id' => $company->id,
                        'created_by' => $company->id,
                    ]
                );

                if ($uData['role'] === 'staff') {
                    if ($staffRole && !$user->hasRole($staffRole)) {
                        $user->assignRole($staffRole);
                    }

                    // Create Employee record
                    $desigName = $uData['desig'] ?? ($cData['designations'][0] ?? null);
                    $desigObj = $desigModels[$desigName] ?? null;

                    Employee::firstOrCreate(
                        ['user_id' => $user->id],
                        [
                            'employee_id' => 'EMP' . str_pad($company->id, 2, '0', STR_PAD_LEFT) . str_pad($empCounter, 3, '0', STR_PAD_LEFT),
                            'date_of_birth' => '1990-05-15',
                            'gender' => ($uIndex % 2 === 0) ? 'Male' : 'Female',
                            'date_of_joining' => now()->subMonths(rand(3, 24))->format('Y-m-d'),
                            'employment_type' => 'Full-time',
                            'address_line_1' => $cData['address'],
                            'city' => $cData['city'],
                            'postal_code' => $cData['zip'],
                            'emergency_contact_name' => 'Emergency Contact',
                            'emergency_contact_relationship' => 'Spouse',
                            'emergency_contact_number' => $uData['phone'] ?? null,
                            'basic_salary' => rand(3500, 7500),
                            'branch_id' => $defaultBranch?->id,
                            'department_id' => $defaultDept?->id,
                            'designation_id' => $desigObj?->id,
                            'creator_id' => $company->id,
                            'created_by' => $company->id,
                        ]
                    );
                    $empCounter++;
                } elseif ($uData['role'] === 'client') {
                    if ($clientRole && !$user->hasRole($clientRole)) {
                        $user->assignRole($clientRole);
                    }

                    // Create Customer record in Account module
                    Customer::firstOrCreate(
                        ['user_id' => $user->id],
                        [
                            'company_name' => $uData['name'],
                            'contact_person_name' => $uData['name'],
                            'contact_person_email' => $uData['email'],
                            'contact_person_mobile' => $uData['phone'] ?? null,
                            'billing_address' => [
                                'address' => $uData['address'] ?? $cData['address'],
                                'city' => $cData['city'],
                                'zip_code' => $cData['zip'],
                            ],
                            'shipping_address' => [
                                'address' => $uData['address'] ?? $cData['address'],
                                'city' => $cData['city'],
                                'zip_code' => $cData['zip'],
                            ],
                            'same_as_billing' => true,
                            'creator_id' => $company->id,
                            'created_by' => $company->id,
                        ]
                    );
                }
            }
        }
    }
}

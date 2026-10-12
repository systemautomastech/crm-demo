<?php

namespace Automas\Lead\Database\Seeders;

use Illuminate\Database\Seeder;
use Automas\LandingPage\Models\MarketplaceSetting;
use Illuminate\Support\Facades\File;

class MarketplaceSettingSeeder extends Seeder
{
    public function run()
    {
        // Get all available screenshots from marketplace directory
        $marketplaceDir = __DIR__ . '/../../marketplace';
        $screenshots = [];

        if (File::exists($marketplaceDir)) {
            $files = File::files($marketplaceDir);
            foreach ($files as $file) {
                if (in_array($file->getExtension(), ['png', 'jpg', 'jpeg', 'gif', 'webp'])) {
                    $screenshots[] = '/packages/automas/Lead/src/marketplace/' . $file->getFilename();
                }
            }
        }

        sort($screenshots);

        MarketplaceSetting::firstOrCreate(['module' => 'Lead'], [
            'module' => 'Lead',
            'title' => 'Lead Module Marketplace',
            'subtitle' => 'Comprehensive CRM tools for your applications',
            'config_sections' => [
                'sections' => [
                    'hero' => [
                        'variant' => 'hero1',
                        'title' => 'CRM Module for Automas ERP',
                        'subtitle' => 'Streamline your CRM workflow with comprehensive tools and automated management.',
                        'primary_button_text' => 'Install CRM Module',
                        'primary_button_link' => '#install',
                        'secondary_button_text' => 'Learn More',
                        'secondary_button_link' => '#learn',
                        'image' => '/packages/automas/Lead/src/marketplace/hero.png'
                    ],
                    'modules' => [
                        'variant' => 'modules1',
                        'title' => 'CRM Module',
                        'subtitle' => 'Enhance your workflow with powerful CRM tools'
                    ],
                    'dedication' => [
                        'variant' => 'dedication1',
                        'title' => 'Dedicated CRM Features',
                        'description' => 'Our CRM module provides comprehensive capabilities for modern workflows.',
                        'subSections' => [
                            [
                                'title' => 'Lead Pipeline Management',
                                'description' => 'Advanced pipeline system with customizable stages for tracking leads through your sales process. Create multiple pipelines for different business units and manage lead progression with drag-and-drop functionality.',
                                'keyPoints' => ['Multiple pipeline support', 'Customizable lead stages', 'Drag-and-drop interface', 'Stage-based automation'],
                                'screenshot' => '/packages/automas/Lead/src/marketplace/image1.png'
                            ],
                            [
                                'title' => 'Deal Conversion & Tracking',
                                'description' => 'Seamlessly convert qualified leads into deals with comprehensive tracking and management. Monitor deal progression through dedicated stages with client assignment and product integration.',
                                'keyPoints' => ['Lead to deal conversion', 'Deal stage management', 'Client assignment', 'Product integration'],
                                'screenshot' => '/packages/automas/Lead/src/marketplace/image2.png'
                            ],
                            [
                                'title' => 'Communication Hub',
                                'description' => 'Centralized communication system with email integration, call logging, and discussion threads. Track all interactions with leads and deals in one place for better relationship management.',
                                'keyPoints' => ['Email integration', 'Call logging system', 'Discussion threads', 'Activity timeline'],
                                'screenshot' => '/packages/automas/Lead/src/marketplace/image3.png'
                            ],
                            [
                                'title' => 'Task & File Management',
                                'description' => 'Comprehensive task management with file attachments and team collaboration. Assign tasks to team members, set deadlines, and track progress with detailed activity logs.',
                                'keyPoints' => ['Task assignment', 'File attachments', 'Team collaboration', 'Progress tracking'],
                                'screenshot' => '/packages/automas/Lead/src/marketplace/image4.png'
                            ],
                            [
                                'title' => 'Analytics & Reporting',
                                'description' => 'Detailed analytics dashboard with comprehensive reporting on CRM performance, conversion rates, and team productivity. Generate custom reports to track business growth and identify opportunities.',
                                'keyPoints' => ['CRM analytics', 'Conversion tracking', 'Team performance', 'Custom reports'],
                                'screenshot' => '/packages/automas/Lead/src/marketplace/image5.png'
                            ]
                        ]
                    ],
                    'screenshots' => [
                        'variant' => 'screenshots1',
                        'title' => 'CRM Module in Action',
                        'subtitle' => 'See how our CRM tools improve your workflow',
                        'images' => $screenshots
                    ],
                    'why_choose' => [
                        'variant' => 'whychoose1',
                        'title' => 'Why Choose CRM Module?',
                        'subtitle' => 'Improve efficiency with comprehensive CRM management',
                        'benefits' => [
                            [
                                'title' => 'Lead Automation',
                                'description' => 'Automate lead assignment, follow-ups, and stage progression to maximize efficiency.',
                                'icon' => 'Play',
                                'color' => 'blue'
                            ],
                            [
                                'title' => 'Sales Analytics',
                                'description' => 'Track conversion rates, pipeline performance, and revenue forecasting.',
                                'icon' => 'FileText',
                                'color' => 'green'
                            ],
                            [
                                'title' => 'Team Collaboration',
                                'description' => 'Assign leads to team members and collaborate on deals effectively.',
                                'icon' => 'Users',
                                'color' => 'purple'
                            ],
                            [
                                'title' => 'CRM Integration',
                                'description' => 'Seamlessly integrate with existing CRM systems and workflows.',
                                'icon' => 'GitBranch',
                                'color' => 'red'
                            ],
                            [
                                'title' => 'Lead Qualification',
                                'description' => 'Advanced lead scoring and qualification with customizable criteria.',
                                'icon' => 'CheckCircle',
                                'color' => 'yellow'
                            ],
                            [
                                'title' => 'Performance Insights',
                                'description' => 'Monitor team performance and identify top-performing strategies.',
                                'icon' => 'Activity',
                                'color' => 'indigo'
                            ]
                        ]
                    ]
                ],
                'section_visibility' => [
                    'header' => true,
                    'hero' => true,
                    'modules' => true,
                    'dedication' => true,
                    'screenshots' => true,
                    'why_choose' => true,
                    'cta' => true,
                    'footer' => true
                ],
                'section_order' => ['header', 'hero', 'modules', 'dedication', 'screenshots', 'why_choose', 'cta', 'footer']
            ]
        ]);
    }
}

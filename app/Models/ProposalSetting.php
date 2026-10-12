<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProposalSetting extends Model
{
    protected $fillable = [
        'option',
        'value',
        'creator_id',
        'created_by',
    ];

    public static function getSettings($creatorId)
    {
        $defaults = [
            'proposal_prefix' => 'PRO',
            'proposal_starting_number' => '1',
            'default_validity_days' => '30',
            'logo_image' => '',
            'header_logo_align' => 'right',
            'background_image' => '',
            'template_color' => '#E9591C',
            'default_terms' => '<h2>Terms & Conditions</h2><p>1. Proposal is valid for 30 days from issuance.<br/>2. Payment terms: 50% deposit upon acceptance, 50% on project completion.</p>',
        ];

        $dbSettings = static::where('creator_id', $creatorId)->pluck('value', 'option')->toArray();

        return [...$defaults, ...$dbSettings];
    }

    public static function setSettings(array $settings, $creatorId)
    {
        foreach ($settings as $option => $value) {
            static::updateOrCreate(
                [
                    'creator_id' => $creatorId,
                    'option' => $option,
                ],
                [
                    'value' => is_array($value) ? json_encode($value) : (string) ($value ?? ''),
                    'created_by' => $creatorId,
                ]
            );
        }
    }
}

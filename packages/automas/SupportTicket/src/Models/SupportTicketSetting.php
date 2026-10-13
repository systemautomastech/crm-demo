<?php

namespace Automas\SupportTicket\Models;

use Illuminate\Database\Eloquent\Model;

class SupportTicketSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'created_by',
        'creator_id'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
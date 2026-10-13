<?php

namespace Automas\SupportTicket\Models;

use Illuminate\Database\Eloquent\Model;

class QuickLink extends Model
{
    protected $table = 'support_ticket_quick_links';

    protected $fillable = [
        'title',
        'icon',
        'link',
        'creator_id',
        'created_by'
    ];
}
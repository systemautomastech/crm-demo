<?php

namespace Automas\SupportTicket\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SupportTicketCustomPage extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'description',
        'contents',
        'is_editable',
        'enable_page_footer',
        'creator_id',
        'created_by',
    ];

    protected $casts = [
        'is_editable' => 'boolean',
    ];
}
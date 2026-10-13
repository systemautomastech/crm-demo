<?php

namespace Automas\SupportTicket\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KnowledgeBase extends Model
{
    protected $table = 'support_ticket_knowledge_bases';
    
    protected $fillable = [
        'title',
        'description',
        'category_id',
        'creator_id',
        'created_by'
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(KnowledgeBaseCategory::class, 'category_id');
    }
}
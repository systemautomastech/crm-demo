<?php

namespace Automas\SupportTicket\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Conversion extends Model
{
    protected $table = 'support_ticket_conversions';
    
    protected $fillable = [
        'ticket_id',
        'sender',
        'description',
        'attachments',
        'creator_id',
        'created_by'
    ];

    protected $casts = [
        'attachments' => 'json'
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class, 'ticket_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function replyBy()
    {
        if ($this->sender === 'admin') {
            $user = $this->creator;
            if (!$user && $this->creator_id) {
                $user = User::find($this->creator_id);
            }
            if (!$user && $this->created_by) {
                $user = User::find($this->created_by);
            }
            if ($user) {
                $roleName = method_exists($user, 'getRoleNames') ? $user->getRoleNames()->first() : null;
                $displayRole = $roleName ?: ($user->type ?? 'Staff');
                return (object)[
                    'name' => $user->name,
                    'role' => ucfirst(str_replace(['_', '-'], ' ', $displayRole)),
                    'type' => $user->type ?? 'staff',
                ];
            }
            return (object)['name' => 'Admin', 'role' => 'Admin', 'type' => 'admin'];
        } else {
            return (object)[
                'name' => $this->ticket ? $this->ticket->name : 'User',
                'role' => 'Customer',
                'type' => 'customer',
            ];
        }
    }

    public function getFormattedAttachmentsAttribute()
    {
        if (is_string($this->attributes['attachments'])) {
            $decoded = json_decode($this->attributes['attachments'], true);
            return is_array($decoded) ? $decoded : [];
        }
        return is_array($this->attachments) ? $this->attachments : [];
    }
}
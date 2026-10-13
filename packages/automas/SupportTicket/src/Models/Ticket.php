<?php

namespace Automas\SupportTicket\Models;

use App\Models\User;
use App\Models\UserGroup;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Ticket extends Model
{
    use HasFactory;
    protected $fillable = [
        'ticket_id',
        'name',
        'email',
        'phone_number',
        'user_id',
        'assigned_to',
        'team_id',
        'picked_at',
        'account_type',
        'category',
        'subject',
        'status',
        'description',
        'attachments',
        'note',
        'access_password',
        'creator_id',
        'created_by'
    ];

    protected $casts = [
        'attachments' => 'json',
        'picked_at' => 'datetime',
    ];

    public function getFormattedAttachmentsAttribute()
    {
        if (is_string($this->attributes['attachments'])) {
            $decoded = json_decode($this->attributes['attachments'], true);
            return is_array($decoded) ? $decoded : [];
        }
        return is_array($this->attachments) ? $this->attachments : [];
    }

    public function conversions(): HasMany
    {
        return $this->hasMany(Conversion::class, 'ticket_id')->orderBy('id');
    }

    public function tcategory(): BelongsTo
    {
        return $this->belongsTo(TicketCategory::class, 'category');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(UserGroup::class, 'team_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Generate ticket ID with prefix and starting number.
     */
    public static function generateTicketId($creatorId): string
    {
        return DB::transaction(function () use ($creatorId) {
            $prefix = SupportTicketSetting::where('created_by', $creatorId)
                ->where('key', 'ticket_prefix')
                ->value('value') ?? 'TCK-';

            $numberSetting = SupportTicketSetting::where('created_by', $creatorId)
                ->where('key', 'ticket_number')
                ->lockForUpdate()
                ->first();

            $currentNumber = $numberSetting ? (int) $numberSetting->value : 1001;

            // Ensure the generated ticket ID is unique and doesn't already exist in database
            $ticketId = "{$prefix}{$currentNumber}";
            while (self::where('ticket_id', $ticketId)->exists()) {
                $currentNumber++;
                $ticketId = "{$prefix}{$currentNumber}";
            }

            $nextNumber = $currentNumber + 1;
            if ($numberSetting) {
                $numberSetting->update(['value' => (string) $nextNumber]);
            } else {
                SupportTicketSetting::create([
                    'key' => 'ticket_number',
                    'value' => (string) $nextNumber,
                    'created_by' => $creatorId,
                ]);
            }

            return $ticketId;
        });
    }

    /**
     * Generate static access password format: {ticket_id}{last_4_digits_of_phone}
     */
    public static function generateAccessPassword(string $ticketId, ?string $phoneNumber = null): string
    {
        $phoneDigits = preg_replace('/\D/', '', (string) $phoneNumber);
        $last4 = strlen($phoneDigits) >= 4 ? substr($phoneDigits, -4) : $phoneDigits;
        return $ticketId . $last4;
    }
}
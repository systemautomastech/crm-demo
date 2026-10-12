<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Proposal extends Model
{
    protected $table = 'proposals';

    protected $fillable = [
        'proposal_number',
        'reference',
        'subject',
        'proposal_date',
        'due_date',
        'customer_id',
        'customer_name',
        'customer_email',
        'customer_phone',
        'customer_address',
        'warehouse_id',
        'type',
        'is_recurring',
        'is_prepaid',
        'is_tax_enabled',
        'otc_discount_type',
        'otc_discount_value',
        'mrc_discount_type',
        'mrc_discount_value',
        'payment_terms',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'status',
        'converted_to_sales_order',
        'sales_order_id',
        'converted_to_invoice',
        'converted_to_deal',
        'notes',
        'creator_id',
        'created_by'
    ];

    protected $casts = [
        'proposal_date' => 'date',
        'due_date' => 'date',
        'is_recurring' => 'boolean',
        'is_prepaid' => 'boolean',
        'is_tax_enabled' => 'boolean',
        'converted_to_sales_order' => 'boolean',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'type' => 'string'
    ];

    protected $appends = ['display_status'];

    public function items(): HasMany
    {
        return $this->hasMany(ProposalItem::class, 'proposal_id');
    }

    public function contents(): HasMany
    {
        return $this->hasMany(ProposalContent::class, 'proposal_id')->orderBy('order');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(SalesInvoice::class, 'converted_to_invoice');
    }

    public function isOverdue(): bool
    {
        return $this->due_date < now() && !in_array($this->status, ['accepted', 'rejected']);
    }

    public function getDisplayStatusAttribute(): string
    {
        if ($this->isOverdue()) {
            return 'overdue';
        }
        return $this->status;
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($proposal) {
            if (empty($proposal->proposal_number)) {
                $proposal->proposal_number = static::generateProposalNumber($proposal->proposal_date);
            }
        });
    }

    public static function generateProposalNumber($date = null): string
    {
        $creatorId = creatorId();
        $dateFormatted = $date ? date('Y-m-d', strtotime($date)) : date('Y-m-d');

        return DB::transaction(function () use ($creatorId, $dateFormatted) {
            $settings = ProposalSetting::getSettings($creatorId);

            $prefix = $settings['proposal_prefix'] ?? 'PRO';
            $startingNumber = (int) ($settings['proposal_starting_number'] ?? 1);

            $nextNumber = $startingNumber + 1;
            ProposalSetting::setSettings([
                'proposal_starting_number' => (string) $nextNumber,
            ], $creatorId);

            return "{$prefix}{$startingNumber}-{$dateFormatted}";
        });
    }
}

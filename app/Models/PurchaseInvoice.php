<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;
use App\Models\PurchaseInvoiceSetup;

class PurchaseInvoice extends Model
{
    protected $fillable = [
        'invoice_number',
        'invoice_date',
        'due_date',
        'vendor_id',
        'warehouse_id',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'paid_amount',
        'debit_note_applied',
        'balance_amount',
        'status',
        'payment_terms',
        'notes',
        'creator_id',
        'created_by'
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'debit_note_applied' => 'decimal:2',
        'balance_amount' => 'decimal:2'
    ];

    protected $appends = ['display_status'];

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseInvoiceItem::class, 'invoice_id');
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'vendor_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function purchaseReturns(): HasMany
    {
        return $this->hasMany(PurchaseReturn::class, 'original_invoice_id');
    }

    public function isOverdue(): bool
    {
        return $this->due_date < now() && $this->status !== 'paid';
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

        static::creating(function ($invoice) {
            if (empty($invoice->invoice_number)) {
                $invoice->invoice_number = static::generateInvoiceNumber();
            }
        });
    }

    public static function generateInvoiceNumber(): string
    {
        $creatorId = creatorId();
        $settings = PurchaseInvoiceSetup::getSettings($creatorId);
        $prefix = !empty($settings['purchase_invoice_prefix']) ? $settings['purchase_invoice_prefix'] : 'PI';
        $startNumberRaw = (string) ($settings['purchase_invoice_starting_number'] ?? '1');
        $startNumber = is_numeric($startNumberRaw) ? (int) $startNumberRaw : 1;
        $padLength = strlen(trim($startNumberRaw));

        $year = date('Y');
        $month = date('m');
        $day = date('d');

        return DB::transaction(function () use ($creatorId, $prefix, $startNumber, $padLength, $year, $month, $day) {
            $lastInvoice = static::where('invoice_number', 'like', "{$prefix}-%-{$year}-{$month}%")
                ->where('created_by', $creatorId)
                ->orderBy('id', 'desc')
                ->lockForUpdate()
                ->first();

            if ($lastInvoice) {
                $parts = explode('-', $lastInvoice->invoice_number);
                $lastNumStr = $parts[1] ?? '0';
                $lastNumber = is_numeric($lastNumStr) ? (int) $lastNumStr : 0;
                $nextNumber = max($lastNumber + 1, $startNumber);
            } else {
                $nextNumber = $startNumber;
            }

            $formattedNum = str_pad((string) $nextNumber, $padLength, '0', STR_PAD_LEFT);
            return "{$prefix}-{$formattedNum}-{$year}-{$month}-{$day}";
        });
    }
}

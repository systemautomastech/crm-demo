<?php

namespace App\Models;

use Automas\SalesOrder\Models\SalesOrder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use App\Models\SalesInvoiceSetup;

class SalesInvoice extends Model
{
    protected $fillable = [
        'invoice_number',
        'invoice_date',
        'due_date',
        'customer_id',
        'warehouse_id',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'discount_type',
        'total_amount',
        'paid_amount',
        'balance_amount',
        'status',
        'type',
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
        'balance_amount' => 'decimal:2'
    ];

    protected $appends = ['display_status', 'public_url'];

    public function items(): HasMany
    {
        return $this->hasMany(SalesInvoiceItem::class, 'invoice_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function customerDetails(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function salesReturns(): HasMany
    {
        return $this->hasMany(SalesInvoiceReturn::class, 'original_invoice_id');
    }

    public function salesOrder(): HasOne
    {
        return $this->hasOne(SalesOrder::class, 'invoice_id');
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

    public function getPublicUrlAttribute(): string
    {
        if (!empty($this->attributes['public_url'])) {
            return (string) $this->attributes['public_url'];
        }

        try {
            return route('sales-invoice.client.view', [
                'token' => Crypt::encryptString((string) $this->id),
            ]);
        } catch (\Throwable $e) {
            return '';
        }
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($invoice) {
            $creatorId = $invoice->created_by ?? creatorId();
            if (empty($invoice->invoice_number) || static::where('invoice_number', $invoice->invoice_number)->where('created_by', $creatorId)->exists()) {
                $invoice->invoice_number = static::generateInvoiceNumber($creatorId);
            }
        });

        static::deleting(function ($invoice) {
            // Reset linked Sales Orders
            if (class_exists(SalesOrder::class)) {
                SalesOrder::where('invoice_id', $invoice->id)->update([
                    'is_invoiced' => false,
                    'invoice_id' => null,
                ]);
            }

            // Reset linked Sales Quotations
            if (class_exists(\Automas\Quotation\Models\SalesQuotation::class)) {
                \Automas\Quotation\Models\SalesQuotation::where('invoice_id', $invoice->id)->update([
                    'converted_to_invoice' => false,
                    'invoice_id' => null,
                ]);
            }

            // Reset linked Sales Proposals if any
            if (class_exists(\App\Models\Proposal::class)) {
                \App\Models\Proposal::where('converted_to_invoice', $invoice->id)->update([
                    'converted_to_invoice' => null,
                ]);
            }
        });
    }

    public static function generateInvoiceNumber($createdBy = null): string
    {
        $creatorId = $createdBy ?? creatorId();
        $settings = SalesInvoiceSetup::getSettings($creatorId);
        $prefix = !empty($settings['sales_invoice_prefix']) ? $settings['sales_invoice_prefix'] : 'SI';
        $startNumberRaw = (string) ($settings['sales_invoice_starting_number'] ?? '1');
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
            $candidate = "{$prefix}-{$formattedNum}-{$year}-{$month}-{$day}";

            while (static::where('invoice_number', $candidate)->where('created_by', $creatorId)->exists()) {
                $nextNumber++;
                $formattedNum = str_pad((string) $nextNumber, $padLength, '0', STR_PAD_LEFT);
                $candidate = "{$prefix}-{$formattedNum}-{$year}-{$month}-{$day}";
            }

            return $candidate;
        });
    }
}

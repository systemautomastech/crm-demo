<?php

namespace Automas\SalesOrder\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SalesOrderDelivery extends Model
{
    use HasFactory;

    protected $table = 'sales_order_deliveries';

    const STATUS_CREATED   = 'created';
    const STATUS_ONGOING   = 'ongoing';
    const STATUS_POSTPONED = 'postponed';
    const STATUS_DELIVERED = 'delivered';
    const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'sales_order_id',
        'delivery_number',
        'delivery_date',
        'notes',
        'status',
        'creator_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'delivery_date' => 'date',
        ];
    }

    // ─── Number Generation ──────────────────────────────────────────────────

    public static function getLastDellivaryChallanId($createdBy = null): int
    {
        $createdBy = $createdBy ?? creatorId();

        $deliveryNumbers = static::where('created_by', $createdBy)
            ->whereNotNull('delivery_number')
            ->lockForUpdate()
            ->pluck('delivery_number');

        $max = 0;
        foreach ($deliveryNumbers as $num) {
            if (preg_match('/(\d+)/', $num, $matches)) {
                $val = (int) $matches[1];
                if ($val > $max) {
                    $max = $val;
                }
            }
        }

        return $max;
    }

    public static function generateDeliveryNumber($createdBy = null): string
    {
        $createdBy = $createdBy ?? creatorId();

        return DB::transaction(function () use ($createdBy) {
            $settings = SalesOrderSetting::getSettings($createdBy);
            $prefix   = $settings['dc_prefix'] ?? 'DC';
            $settingNumber = (int) ($settings['dc_starting_number'] ?? 1);

            $lastId = static::getLastDellivaryChallanId($createdBy);

            // Never go backwards: take the maximum of setting number and last number + 1
            $next = max($settingNumber, $lastId + 1);

            // Double check race condition loop to guarantee uniqueness
            $deliveryNumber = $prefix . str_pad($next, 5, '0', STR_PAD_LEFT);
            while (static::where('created_by', $createdBy)->where('delivery_number', $deliveryNumber)->exists()) {
                $next++;
                $deliveryNumber = $prefix . str_pad($next, 5, '0', STR_PAD_LEFT);
            }

            SalesOrderSetting::setSettings(
                ['dc_starting_number' => (string) ($next + 1)],
                $createdBy
            );

            return $deliveryNumber;
        });
    }

    // ─── Relationships ───────────────────────────────────────────────────────

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class, 'sales_order_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SalesOrderDeliveryItem::class, 'delivery_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ─── Lifecycle Hooks ────────────────────────────────────────────────────

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($delivery) {
            if (empty($delivery->delivery_number)) {
                $delivery->delivery_number = static::generateDeliveryNumber($delivery->created_by);
            }
            if (empty($delivery->status)) {
                $delivery->status = self::STATUS_CREATED;
            }
        });
    }
}

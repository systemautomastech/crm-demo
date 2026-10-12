<?php

namespace Automas\SalesOrder\Models;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\UserGroup;
use Illuminate\Support\Facades\DB;

class SalesOrder extends Model
{
    use HasFactory;

    protected $table = 'sales_orders';

    // Delivery status constants
    const DELIVERY_STATUS_PENDING  = 'pending';
    const DELIVERY_STATUS_PARTIAL  = 'partial';
    const DELIVERY_STATUS_FULL     = 'delivered';

    // Commercial status constants
    const STATUS_DRAFT      = 'draft';
    const STATUS_CONFIRMED  = 'confirmed';
    const STATUS_CANCELLED  = 'cancelled';

    // Assignment status constants
    const ASSIGNMENT_UNASSIGNED    = 'unassigned';
    const ASSIGNMENT_GROUP_ASSIGNED = 'group_assigned';
    const ASSIGNMENT_ACQUIRED       = 'acquired';

    protected $fillable = [
        'order_number',
        'name',
        'quotation_id',
        'proposal_id',
        'status',
        'delivery_status',
        'customer_id',
        'warehouse_id',
        'order_date',
        'expected_delivery_date',
        'billing_address',
        'shipping_address',
        'description',
        'notes',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'is_invoiced',
        'invoice_id',
        'confirmed_at',
        'assigned_group_id',
        'assignment_status',
        'acquired_by',
        'acquired_at',
        'creator_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'order_date'             => 'date',
            'expected_delivery_date' => 'date',
            'confirmed_at'           => 'datetime',
            'acquired_at'            => 'datetime',
            'subtotal'               => 'decimal:2',
            'tax_amount'             => 'decimal:2',
            'discount_amount'        => 'decimal:2',
            'total_amount'           => 'decimal:2',
            'is_invoiced'            => 'boolean',
            'billing_address'        => 'array',
            'shipping_address'       => 'array',
        ];
    }

    public static function getLastSalesOrderId($createdBy = null): int
    {
        $createdBy = $createdBy ?? creatorId();

        $orderNumbers = static::where('created_by', $createdBy)
            ->whereNotNull('order_number')
            ->lockForUpdate()
            ->pluck('order_number');

        $max = 0;
        foreach ($orderNumbers as $num) {
            if (preg_match('/(\d+)/', $num, $matches)) {
                $val = (int) $matches[1];
                if ($val > $max) {
                    $max = $val;
                }
            }
        }

        return $max;
    }

    public static function generateOrderNumber($createdBy = null): string
    {
        $createdBy = $createdBy ?? creatorId();

        return DB::transaction(function () use ($createdBy) {
            $settings = SalesOrderSetting::getSettings($createdBy);
            $prefix   = $settings['so_prefix'] ?? 'SO';
            $settingNumber = (int) ($settings['so_starting_number'] ?? 1);

            $lastId = static::getLastSalesOrderId($createdBy);

            // Never go backwards: take the maximum of setting number and last number + 1
            $next = max($settingNumber, $lastId + 1);

            // Double check race condition loop to guarantee uniqueness
            $orderNumber = $prefix . str_pad($next, 5, '0', STR_PAD_LEFT);
            while (static::where('created_by', $createdBy)->where('order_number', $orderNumber)->exists()) {
                $next++;
                $orderNumber = $prefix . str_pad($next, 5, '0', STR_PAD_LEFT);
            }

            SalesOrderSetting::setSettings(
                ['so_starting_number' => (string) ($next + 1)],
                $createdBy
            );

            return $orderNumber;
        });
    }

    public function scopeAccessible($query)
    {
        $user = auth()->user();

        if (!$user) {
            return $query->whereRaw('1 = 0');
        }

        if (in_array($user->type, ['company', 'superadmin', 'admin']) || $user->can('manage-any-sales-orders')) {
            return $query->where('sales_orders.created_by', creatorId());
        }

        if ($user->can('manage-own-sales-orders') || $user->can('manage-sales-orders')) {
            return $query->where('sales_orders.created_by', creatorId())
                ->where(function ($q) use ($user) {
                    $q->where('sales_orders.creator_id', $user->id)
                        ->orWhere('sales_orders.acquired_by', $user->id)
                        ->orWhereHas('assignedUsers', fn($sq) => $sq->where('users.id', $user->id))
                        ->orWhere(function ($gq) use ($user) {
                            $gq->where('sales_orders.assignment_status', self::ASSIGNMENT_GROUP_ASSIGNED)
                                ->whereHas('assignedGroup', function ($sq) use ($user) {
                                    $sq->whereHas('users', fn($uq) => $uq->where('users.id', $user->id));
                                });
                        });
                });
        }

        return $query->whereRaw('1 = 0');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SalesOrderItem::class, 'order_id');
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(SalesOrderDelivery::class, 'sales_order_id')
            ->where('status', '!=', 'cancelled');
    }

    public function allDeliveries(): HasMany
    {
        return $this->hasMany(SalesOrderDelivery::class, 'sales_order_id');
    }

    public function assignedUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'sales_order_users', 'sales_order_id', 'user_id')
            ->withTimestamps();
    }

    public function assignedGroup(): BelongsTo
    {
        return $this->belongsTo(UserGroup::class, 'assigned_group_id');
    }

    public function acquiredByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acquired_by');
    }

    public function quotation()
    {
        if (class_exists(\Automas\Quotation\Models\SalesQuotation::class)) {
            return $this->belongsTo(\Automas\Quotation\Models\SalesQuotation::class, 'quotation_id');
        }
        return null;
    }

    public function getTotal(): float
    {
        if ($this->total_amount > 0) {
            return (float) $this->total_amount;
        }
        if (!$this->relationLoaded('items')) {
            $this->load('items');
        }
        return (float) $this->items->sum('final_price');
    }

    public function recalculateDeliveryStatus(): void
    {
        $items = $this->items()->with([
            'deliveryItems' => fn($q) => $q->whereHas(
                'delivery',
                fn($dq) => $dq->where('status', \Automas\SalesOrder\Models\SalesOrderDelivery::STATUS_DELIVERED)
            )
        ])->get();

        $totalOrdered  = $items->sum('quantity');
        $totalDelivered = $items->sum(fn($item) => $item->deliveryItems->sum('quantity'));

        if ($totalDelivered <= 0) {
            $deliveryStatus = self::DELIVERY_STATUS_PENDING;
        } elseif ($totalDelivered >= $totalOrdered) {
            $deliveryStatus = self::DELIVERY_STATUS_FULL;
        } else {
            $deliveryStatus = self::DELIVERY_STATUS_PARTIAL;
        }

        $this->update(['delivery_status' => $deliveryStatus]);
    }

    /**
     * Check if there are any unallocated items remaining to be added to a new challan.
     * Considers all active deliveries (status != cancelled).
     */
    public function hasRemainingItemsToDeliver(): bool
    {
        $items = $this->items()->with([
            'deliveryItems' => function ($q) {
                $q->whereHas('delivery', fn($dq) => $dq->where('status', '!=', SalesOrderDelivery::STATUS_CANCELLED));
            }
        ])->get();

        if ($items->isEmpty()) {
            return false;
        }

        foreach ($items as $item) {
            $deliveredOrAllocated = $item->deliveryItems->sum('quantity');
            if ($item->quantity > $deliveredOrAllocated) {
                return true;
            }
        }

        return false;
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($order) {
            if (empty($order->order_number)) {
                $order->order_number = static::generateOrderNumber($order->created_by);
            }
            if (empty($order->delivery_status)) {
                $order->delivery_status = self::DELIVERY_STATUS_PENDING;
            }
        });
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $table = 'customers';

    protected $fillable = [
        'customer_code',
        'customer_name',
        'customer_email',
        'customer_phone',
        'contact_person_name',
        'contact_person_email',
        'contact_person_mobile',
        'tax_number',
        'payment_terms',
        'billing_address',
        'shipping_address',
        'same_as_billing',
        'other_informations',
        'notes',
        'is_active',
        'creator_id',
        'created_by',
    ];

    protected $casts = [
        'billing_address' => 'array',
        'shipping_address' => 'array',
        'same_as_billing' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function proposals(): HasMany
    {
        return $this->hasMany(Proposal::class, 'customer_id');
    }

    public function salesInvoices(): HasMany
    {
        return $this->hasMany(SalesInvoice::class, 'customer_id');
    }

    public function salesReturns(): HasMany
    {
        return $this->hasMany(SalesInvoiceReturn::class, 'customer_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
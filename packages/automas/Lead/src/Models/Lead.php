<?php

namespace Automas\Lead\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Automas\ProductService\Models\ProductServiceItem;
use Automas\Lead\Traits\TracksLeadActivity;

class Lead extends Model
{
    use HasFactory, TracksLeadActivity;

    protected $fillable = [
        'name',
        'email',
        'subject',
        'organization_type',
        'user_id',
        'pipeline_id',
        'stage_id',
        'sources',
        'products',
        'notes',
        'labels',
        'order',
        'phone',
        'is_active',
        'is_converted',
        'date',
        'creator_id',
        'created_by',
        'import_key',
        'lead_import_id',
    ];

    public function leadImport()
    {
        return $this->belongsTo(LeadImport::class, 'lead_import_id');
    }

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'pipeline_id' => 'integer',
            'stage_id' => 'integer',
            'is_active' => 'boolean',
            'date' => 'datetime',
            'creator_id' => 'integer'
        ];
    }

    public function stage()
    {
        return $this->belongsTo(LeadStage::class, 'stage_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function userLeads()
    {
        return $this->hasMany(UserLead::class, 'lead_id');
    }

    public function tasks()
    {
        return $this->hasMany(LeadTask::class, 'lead_id');
    }

    public function complete_tasks()
    {
        return $this->hasMany(LeadTask::class, 'lead_id')->where('status', '=', 'Complete');
    }

    public function emails()
    {
        return $this->hasMany(LeadEmail::class, 'lead_id');
    }

    public function discussions()
    {
        return $this->hasMany(LeadDiscussion::class, 'lead_id');
    }

    public function files()
    {
        return $this->hasMany(LeadFile::class, 'lead_id');
    }

    public function calls()
    {
        return $this->hasMany(LeadCall::class, 'lead_id');
    }

    public function activities()
    {
        return $this->hasMany('Automas\Lead\Models\LeadActivityLog', 'lead_id', 'id')->orderBy('id', 'desc');
    }

    public function pipeline()
    {
        return $this->belongsTo('Automas\Lead\Models\Pipeline', 'pipeline_id');
    }

    public function sources()
    {
        return $this->belongsTo(Source::class, 'sources');
    }

    public function products()
    {
        return $this->belongsTo(ProductServiceItem::class, 'products');
    }
}
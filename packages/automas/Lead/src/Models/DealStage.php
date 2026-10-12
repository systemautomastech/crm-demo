<?php

namespace Automas\Lead\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Automas\Lead\Models\Pipeline;

class DealStage extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'order',
        'pipeline_id',
        'is_won',
        'is_lost',
        'creator_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_won' => 'boolean',
            'is_lost' => 'boolean',
            'order' => 'integer',
            'pipeline_id' => 'integer',
        ];
    }



    public function pipeline()
    {
        return $this->belongsTo(Pipeline::class);
    }
}
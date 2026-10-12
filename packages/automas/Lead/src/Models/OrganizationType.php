<?php

namespace Automas\Lead\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class OrganizationType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'creator_id',
        'created_by',
    ];
}

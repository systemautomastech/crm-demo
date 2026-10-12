<?php

namespace Automas\Lead\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDealRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'          => 'required|string|max:255',
            'price'         => 'numeric|min:0',
            'pipeline_id'   => 'required|integer|exists:pipelines,id',
            'stage_id'      => 'required|integer|exists:deal_stages,id',
            'phone'         => 'nullable|string|regex:/^\+?\d{10,16}$/',
            'organization_type' => 'required|string|max:200',
            'sources'       => 'nullable|array',
            'sources.*'     => 'integer|exists:sources,id',
            'products'      => 'nullable|array',
            'notes'         => 'nullable|string',
            'clients'       => 'nullable|array',
            'clients.*'     => 'integer|exists:users,id',
        ];
        
    }
}

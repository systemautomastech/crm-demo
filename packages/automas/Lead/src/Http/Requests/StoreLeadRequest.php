<?php

namespace Automas\Lead\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|max:100',
            'email' => 'nullable|email',
            'subject' => 'required|max:200',
            'organization_type' => 'nullable|max:200',
            'phone' => 'nullable|string|regex:/^\+?\d{10,16}$/',
            'date' => 'nullable|date',
            'user_id' => 'required|exists:users,id',
            'sources' => 'nullable',
            'pipeline_id' => 'nullable|exists:pipelines,id',
            'stage_id' => 'nullable|exists:lead_stages,id',
            'notes' => 'nullable|string',
        ];
    }
}

<?php

namespace Automas\Lead\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLeadRequest extends FormRequest
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
            'user_id' => 'required|exists:users,id',
            'pipeline_id' => 'nullable|integer',
            'stage_id' => 'nullable|integer',
            'sources' => 'nullable|max:100',
            'products' => 'nullable|max:100',
            'notes' => 'nullable',
            'phone' => 'nullable|string|regex:/^\+?\d{10,16}$/',
            'date' => 'nullable|date',
            'labels' => 'nullable|array',
        ];
    }
}

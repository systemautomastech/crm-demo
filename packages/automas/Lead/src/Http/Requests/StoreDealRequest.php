<?php

namespace Automas\Lead\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDealRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|max:100',
            'price' => 'required|numeric|min:0',
            'phone' => 'required|string|regex:/^\+?\d{10,16}$/',
            'organization_type' => 'required|string|max:200',
            'clients' => 'nullable|array',
            'clients.*' => 'nullable|integer|exists:users,id',
        ];
    }
}

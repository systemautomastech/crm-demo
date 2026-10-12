<?php

namespace Automas\Lead\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConvertToDealRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $rules = [
            'name' => 'required|string|max:255',
            'price' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:Active,Won,Loss',
            'organization_type' => 'required|string|max:255',
            'client_check' => 'required|in:none,exist,new',
            'is_transfer' => 'nullable|array',
        ];

        if ($this->client_check === 'exist') {
            $rules['clients'] = 'required|email|exists:users,email';
        }

        if ($this->client_check === 'new') {
            $rules['client_name'] = 'required|string|max:255';
            $rules['client_email'] = 'required|email|unique:users,email';
            $rules['client_phone'] = 'nullable|string';
            $rules['client_password'] = 'nullable|string|min:6';
            $rules['client_address'] = 'nullable|string|max:255';
            $rules['client_city'] = 'nullable|string|max:255';
            $rules['client_state'] = 'nullable|string|max:255';
            $rules['client_country'] = 'nullable|string|max:255';
            $rules['client_zip_code'] = 'nullable|string|max:50';
        }

        return $rules;
    }
}

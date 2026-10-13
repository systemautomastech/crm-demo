<?php

namespace Automas\SupportTicket\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBrandSettingsRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'logo_dark' => 'nullable|string|max:255',
            'favicon' => 'nullable|string|max:255',
            'titleText' => 'required|string|max:255',
            'footerText' => 'required|string|max:500',
            'ticket_prefix' => 'nullable|string|max:50',
            'ticket_number' => 'nullable|numeric|min:1',
        ];
    }
}
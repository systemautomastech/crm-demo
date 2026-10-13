<?php

namespace Automas\SupportTicket\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Automas\SupportTicket\Rules\ValidPhoneNumber;

class StoreFrontendTicketRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'nullable|string|email|max:255',
            'phone_number' => ['required', 'string', new ValidPhoneNumber()],
            'category' => 'required|exists:ticket_categories,id',
            'subject' => 'required|string|max:255',
            'description' => 'required|string',
            'status' => 'nullable|string|in:In Progress,On Hold,Closed',
            'account_type' => 'required|string|in:custom',
            'attachments' => 'sometimes|array',
            'attachments.*' => 'sometimes|file|max:10240'
        ];
    }

    public function messages()
    {
        return [
            'phone_number.required' => __('Phone number is required.'),
        ];
    }
}
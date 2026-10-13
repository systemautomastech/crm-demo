<?php

namespace Automas\SupportTicket\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSupportTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255',
            'subject' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'category' => 'sometimes|exists:ticket_categories,id',
            'status' => 'sometimes|in:open,In Progress,Closed,On Hold',
            'account_type' => 'sometimes|in:custom,staff,client,vendor',
            'user_id' => 'nullable|exists:users,id',
            'assigned_to' => 'nullable|exists:users,id',
            'team_id' => 'nullable|exists:user_groups,id',
            'note' => 'nullable|string',
            'attachments' => 'nullable|array'
        ];
    }
}
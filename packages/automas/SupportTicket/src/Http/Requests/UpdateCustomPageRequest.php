<?php

namespace Automas\SupportTicket\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCustomPageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $customPageId = $this->route('id');
        
        return [
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:support_ticket_custom_pages,slug,' . $customPageId,
            'contents' => 'required|string',
            'description' => 'nullable|string|max:500',
            'enable_page_footer' => 'nullable|string|in:on,off',
        ];
    }
}
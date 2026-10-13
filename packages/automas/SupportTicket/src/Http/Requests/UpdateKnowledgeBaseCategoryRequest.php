<?php

namespace Automas\SupportTicket\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateKnowledgeBaseCategoryRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'title' => 'required|string|max:255',
        ];
    }
}
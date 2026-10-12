<?php

namespace Automas\Lead\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDealStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|max:100',
            'pipeline_id' => 'nullable|integer|exists:pipelines,id',
            'is_won' => 'nullable|boolean',
            'is_lost' => 'nullable|boolean',
            'win_loss_type' => 'nullable|string|in:none,won,lost',
        ];
    }
}
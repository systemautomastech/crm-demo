<?php

namespace Automas\SupportTicket\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSupportSettingsRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'settings' => 'required|array',
            'settings.fields' => 'nullable|array',
            'settings.fields.*.name' => 'required|string|max:255',
            'settings.fields.*.placeholder' => 'required|string|max:255',
            'settings.fields.*.type' => 'required|string|in:text,email,number,date,textarea,file,select',
            'settings.fields.*.width' => 'required|string|in:3,4,6,8,12',
            'settings.fields.*.is_required' => 'required|boolean',
            'settings.fields.*.order' => 'nullable|integer|min:0',
        ];
    }

    public function messages()
    {
        return [
            'settings.required' => __('Settings data is required.'),
            'settings.fields.*.name.required' => __('Field name is required.'),
            'settings.fields.*.name.max' => __('Field name must not exceed 255 characters.'),
            'settings.fields.*.placeholder.required' => __('Field placeholder is required.'),
            'settings.fields.*.placeholder.max' => __('Field placeholder must not exceed 255 characters.'),
            'settings.fields.*.type.required' => __('Field type is required.'),
            'settings.fields.*.type.in' => __('Field type must be one of: text, email, number, date, textarea, file, select.'),
            'settings.fields.*.width.required' => __('Field width is required.'),
            'settings.fields.*.width.in' => __('Field width must be one of: 3, 4, 6, 8, 12.'),
            'settings.fields.*.is_required.required' => __('Field required status is required.'),
            'settings.fields.*.is_required.boolean' => __('Field required status must be true or false.'),
            'settings.fields.*.order.integer' => __('Field order must be an integer.'),
            'settings.fields.*.order.min' => __('Field order must be at least 0.'),
        ];
    }
}

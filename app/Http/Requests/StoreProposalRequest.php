<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProposalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'subject' => 'required|string|max:255',
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:invoice_date',
            'customer_mode' => 'nullable|in:existing,new',
            'customer_id' => 'required_unless:customer_mode,new|nullable|integer|exists:customers,id',
            'customer_name' => 'required_if:customer_mode,new|nullable|string|max:255',
            'customer_email' => 'required_if:customer_mode,new|nullable|email|max:255',
            'customer_phone' => 'required_if:customer_mode,new|nullable|string|max:50',
            'customer_address' => 'required_if:customer_mode,new|nullable|string',
            'type' => 'required|in:product,service',
            'warehouse_id' => 'required_if:type,product|nullable|integer|exists:warehouses,id',
            'is_tax_enabled' => 'nullable|boolean',
            'is_prepaid' => 'nullable|boolean',
            'otc_discount_type' => 'nullable|in:percentage,fixed',
            'otc_discount_value' => 'nullable|numeric|min:0',
            'mrc_discount_type' => 'nullable|in:percentage,fixed',
            'mrc_discount_value' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|min:1',
            'items.*.section' => 'nullable|string|max:50',
            'items.*.product_type' => 'nullable|string|max:50',
            'items.*.description' => 'nullable|string',
            'items.*.product_description' => 'nullable|string',
            'items.*.quantity' => 'nullable|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_type' => 'nullable|string|in:percentage,fixed',
            'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.tax_percentage' => 'nullable|numeric|min:0|max:100',
            'items.*.taxes' => 'nullable|array',
            'items.*.taxes.*.tax_name' => 'required_with:items.*.taxes|string',
            'items.*.taxes.*.tax_rate' => 'required_with:items.*.taxes|numeric|min:0',
            'proposal_content' => 'nullable|array',
            'proposal_content.*.title' => 'nullable|string',
            'proposal_content.*.content' => 'nullable|string',
            'proposal_content.*.page_type' => 'nullable|string',
            'proposal_content.*.background_image' => 'nullable|string',
            'proposal_content.*.order' => 'nullable|integer',
        ];
    }

    public function messages(): array
    {
        return [
            'subject.required' => __('Please select a subject.'),
            'due_date.required' => __('Please select a due date.'),
            'due_date.after_or_equal' => __('Due date must be equal to or after the proposal date.'),
            'customer_id.exists' => __('Selected customer does not exist.'),
            'items.required' => __('At least one item is required.'),
            'items.*.product_id.min' => __('Please select a product for each item.'),
            'items.*.quantity.min' => __('Quantity must be at least 1.'),
            'items.*.unit_price.min' => __('Unit price must be 0 or greater.'),
            'items.*.discount_type.in' => __('Discount type must be percentage or fixed.'),
            'items.*.discount_percentage.max' => __('Discount percentage cannot exceed 100%.'),
            'items.*.discount_percentage.min' => __('Discount percentage must be 0 or greater.'),
            'items.*.discount_amount.min' => __('Discount amount must be 0 or greater.'),
            'proposal_content.array' => __('Proposal content must be a valid array.'),
            'proposal_content.*.string' => __('Each proposal content must be valid text.'),
        ];
    }
}

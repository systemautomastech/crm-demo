<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConvertSalesOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'order_name' => 'nullable|string|max:255',
            'customer_type' => 'required|in:existing,new',
            'customer_id' => 'required_if:customer_type,existing|nullable|exists:customers,id',
            
            // New Customer fields
            'customer_name' => 'required_if:customer_type,new|nullable|string|max:255',
            'customer_email' => 'required_if:customer_type,new|nullable|email|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'tax_number' => 'nullable|string|max:100',
            'payment_terms' => 'nullable|string|max:255',
            'billing_name' => 'nullable|string|max:255',
            'billing_address_line_1' => 'nullable|string|max:255',
            'billing_address_line_2' => 'nullable|string|max:255',
            'billing_city' => 'required_if:customer_type,new|nullable|string|max:255',
            'billing_state' => 'required_if:customer_type,new|nullable|string|max:255',
            'billing_country' => 'required_if:customer_type,new|nullable|string|max:255',
            'billing_zip_code' => 'required_if:customer_type,new|nullable|string|max:50',
            'same_as_billing' => 'nullable|boolean',
            'shipping_name' => 'nullable|string|max:255',
            'shipping_address_line_1' => 'nullable|string|max:255',
            'shipping_address_line_2' => 'nullable|string|max:255',
            'shipping_city' => 'required_if:same_as_billing,false|nullable|string|max:255',
            'shipping_state' => 'required_if:same_as_billing,false|nullable|string|max:255',
            'shipping_country' => 'required_if:same_as_billing,false|nullable|string|max:255',
            'shipping_zip_code' => 'required_if:same_as_billing,false|nullable|string|max:50',
            'notes' => 'nullable|string',

            // Assignment fields
            'assignment_check' => 'nullable|in:none,group,user',
            'assigned_group_id' => 'nullable|integer|exists:user_groups,id',
            'assigned_user_id' => 'nullable|integer|exists:users,id',
            'assigned_user_ids' => 'nullable|array',
            'assigned_user_ids.*' => 'integer|exists:users,id',

            // Items fields
            'items' => 'nullable|array',
            'items.*.product_id' => 'required_with:items|integer|exists:product_service_items,id',
            'items.*.product_type' => 'nullable|string|max:50',
            'items.*.quantity' => 'required_with:items|numeric|min:1',
            'items.*.unit_price' => 'required_with:items|numeric|min:0',
            'items.*.discount_type' => 'nullable|string|in:percentage,fixed',
            'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.tax_percentage' => 'nullable|numeric|min:0',
            'items.*.tax_amount' => 'nullable|numeric|min:0',
            'items.*.total_amount' => 'nullable|numeric|min:0',
            'items.*.description' => 'nullable|string',
            'items.*.taxes' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.required_if' => __('Please select a customer.'),
            'customer_id.exists' => __('Selected customer could not be found.'),
            'customer_name.required_if' => __('Customer name is required.'),
            'customer_email.required_if' => __('Customer email is required.'),
            'customer_email.email' => __('Please enter a valid email address.'),
            'billing_city.required_if' => __('City is required.'),
            'billing_state.required_if' => __('State or province is required.'),
            'billing_country.required_if' => __('Country is required.'),
            'billing_zip_code.required_if' => __('Zip/Postal code is required.'),
            'shipping_city.required_if' => __('Shipping city is required.'),
            'shipping_state.required_if' => __('Shipping state is required.'),
            'shipping_country.required_if' => __('Shipping country is required.'),
            'shipping_zip_code.required_if' => __('Shipping zip code is required.'),
            'items.*.quantity.min' => __('Quantity must be at least 1.'),
            'items.*.unit_price.min' => __('Price cannot be negative.'),
        ];
    }
}

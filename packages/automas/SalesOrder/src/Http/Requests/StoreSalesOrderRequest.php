<?php

namespace Automas\SalesOrder\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSalesOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'                   => 'required|string|max:255',
            'quotation_id'               => 'nullable|integer',
            'status'                 => 'nullable|string|in:draft,confirmed',
            'customer_id'            => 'required|exists:customers,id',
            'warehouse_id'           => 'nullable|exists:warehouses,id',
            'order_date'             => 'required|date',
            'expected_delivery_date' => 'nullable|date|after_or_equal:order_date',
            'billing_address'        => 'nullable|string|max:255',
            'shipping_address'       => 'nullable|string|max:255',
            'billing_city'           => 'nullable|string|max:255',
            'billing_state'          => 'nullable|string|max:255',
            'shipping_city'          => 'nullable|string|max:255',
            'shipping_state'         => 'nullable|string|max:255',
            'billing_country'        => 'nullable|string|max:255',
            'billing_postal_code'    => 'nullable|string|max:20',
            'shipping_country'       => 'nullable|string|max:255',
            'shipping_postal_code'   => 'nullable|string|max:20',
            'description'            => 'nullable|string',
            'notes'                  => 'nullable|string',
            'assigned_group_id'      => 'nullable|integer|exists:user_groups,id',
            'assign_user_id'         => 'nullable|integer|exists:users,id',
            'assigned_user_ids'      => 'nullable|array',
            'assigned_user_ids.*'    => 'integer|exists:users,id',
            'items'                  => 'required|array|min:1',
            'items.*.product_id'     => 'nullable|integer',
            'items.*.quantity'       => 'required|integer|min:1',
            'items.*.unit_price'     => 'required|numeric|min:0',
            'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'items.*.tax_percentage' => 'nullable|numeric|min:0',
            'items.*.taxes'          => 'nullable|array',
            'items.*.unit'           => 'nullable|string|max:50',
            'items.*.description'    => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.required_if'    => __('Please select an existing customer.'),
            'customer_name.required_if'  => __('Customer name is required for a new customer.'),
            'customer_email.required_if' => __('Customer email is required for a new customer.'),
            'customer_email.unique'      => __('This email address is already registered in the user list.'),
            'customer_email.email'       => __('Please enter a valid email address.'),
            'billing_address.required'   => __('Billing address is required.'),
            'shipping_address.required'  => __('Shipping address is required.'),
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $creatorId = creatorId();
        $customerId = $this->route('customer') ? ($this->route('customer')->id ?? $this->route('customer')) : null;

        return [
            'customer_name' => 'sometimes|required|string|max:255',
            'customer_email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('customers', 'customer_email')
                    ->where('created_by', $creatorId)
                    ->ignore($customerId),
            ],
            'customer_phone' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('customers', 'customer_phone')
                    ->where('created_by', $creatorId)
                    ->ignore($customerId),
            ],
            'contact_person_name' => 'nullable|string|max:255',
            'contact_person_email' => 'nullable|email|max:255',
            'contact_person_mobile' => 'nullable|string|max:255',
            'tax_number' => 'nullable|string|max:255',
            'payment_terms' => 'nullable|string|max:255',
            'billing_address' => 'sometimes|required|array',
            'billing_address.name' => 'nullable|string|max:255',
            'billing_address.address_line_1' => 'nullable|string|max:255',
            'billing_address.address_line_2' => 'nullable|string|max:255',
            'billing_address.city' => 'sometimes|required|string|max:255',
            'billing_address.state' => 'sometimes|required|string|max:255',
            'billing_address.country' => 'sometimes|required|string|max:255',
            'billing_address.zip_code' => 'sometimes|required|string|max:255',
            'shipping_address' => 'nullable|array',
            'shipping_address.name' => 'nullable|string|max:255',
            'shipping_address.address_line_1' => 'nullable|string|max:255',
            'shipping_address.address_line_2' => 'nullable|string|max:255',
            'shipping_address.city' => 'required_if:same_as_billing,false|nullable|string|max:255',
            'shipping_address.state' => 'required_if:same_as_billing,false|nullable|string|max:255',
            'shipping_address.country' => 'required_if:same_as_billing,false|nullable|string|max:255',
            'shipping_address.zip_code' => 'required_if:same_as_billing,false|nullable|string|max:255',
            'same_as_billing' => 'nullable|boolean',
            'other_informations' => 'nullable|string',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'customer_name.required' => __('Customer name is required.'),
            'customer_email.required' => __('Customer email is required.'),
            'customer_email.email' => __('Please provide a valid email address for customer.'),
            'customer_email.unique' => __('The customer email has already been taken.'),
            'customer_phone.required' => __('Customer phone is required.'),
            'customer_phone.unique' => __('The customer phone has already been taken.'),
            'contact_person_email.email' => __('Please provide a valid email address for contact person.'),
            'billing_address.city.required' => __('Billing city is required.'),
            'billing_address.state.required' => __('Billing state / province is required.'),
            'billing_address.country.required' => __('Billing country is required.'),
            'billing_address.zip_code.required' => __('Billing zip / postal code is required.'),
            'shipping_address.city.required_if' => __('Shipping city is required.'),
            'shipping_address.state.required_if' => __('Shipping state / province is required.'),
            'shipping_address.country.required_if' => __('Shipping country is required.'),
            'shipping_address.zip_code.required_if' => __('Shipping zip / postal code is required.'),
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'customer_name' => __('Customer Name'),
            'customer_email' => __('Customer Email'),
            'customer_phone' => __('Customer Phone'),
            'contact_person_name' => __('Contact Person Name'),
            'contact_person_email' => __('Contact Person Email'),
            'contact_person_mobile' => __('Contact Person Mobile'),
            'tax_number' => __('Tax Number'),
            'payment_terms' => __('Payment Terms'),
            'billing_address' => __('Billing Address'),
            'shipping_address' => __('Shipping Address'),
            'same_as_billing' => __('Same as Billing'),
            'other_informations' => __('Other Information'),
            'notes' => __('Notes'),
        ];
    }
}

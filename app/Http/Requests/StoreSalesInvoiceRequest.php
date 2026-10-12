<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSalesInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'invoice_number' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('sales_invoices', 'invoice_number')->where(function ($query) {
                    return $query->where('created_by', creatorId());
                }),
            ],
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:invoice_date',
            'customer_mode' => 'nullable|in:existing,new',
            'customer_id' => 'required_unless:customer_mode,new|nullable|integer|exists:customers,id',
            'customer_name' => 'required_if:customer_mode,new|nullable|string|max:255',
            'customer_email' => 'required_if:customer_mode,new|nullable|email|max:255',
            'customer_phone' => 'required_if:customer_mode,new|nullable|string|max:50',
            'customer_address' => 'required_if:customer_mode,new|nullable|string',
            'type' => 'nullable|in:product,service',
            'warehouse_id' => 'required_if:type,product|nullable|integer|exists:warehouses,id',
            'payment_terms' => 'nullable|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|min:1',
            'items.*.description' => 'nullable|string',
            'items.*.product_type' => 'nullable|string|max:50',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_type' => 'nullable|in:percentage,fixed',
            'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.tax_percentage' => 'nullable|numeric|min:0|max:100'
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.required_unless' => __('Please select a customer.'),
            'customer_id.exists' => __('Selected customer does not exist.'),
            'customer_name.required_if' => __('Customer name is required for new customers.'),
            'customer_email.required_if' => __('Customer email is required for new customers.'),
            'customer_phone.required_if' => __('Customer phone is required for new customers.'),
            'customer_address.required_if' => __('Customer address is required for new customers.'),
            'items.required' => __('At least one item is required.'),
            'items.*.product_id.min' => __('Please select a product for each item.'),
            'items.*.quantity.min' => __('Quantity must be at least 1.'),
            'items.*.unit_price.min' => __('Unit price must be 0 or greater.')
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $items = $this->input('items', []);
            $warehouseId = $this->input('warehouse_id');

            foreach ($items as $index => $itemData) {
                $productId = $itemData['product_id'] ?? null;
                $quantity = (int) ($itemData['quantity'] ?? 0);
                $productType = $itemData['product_type'] ?? 'product';

                if ($productId && $productType !== 'service') {
                    $product = \Automas\ProductService\Models\ProductServiceItem::with('warehouseStocks')->find($productId);
                    if ($product && $product->type !== 'service') {
                        $availableStock = $warehouseId
                            ? ($product->warehouseStocks->where('warehouse_id', $warehouseId)->first()?->quantity ?? 0)
                            : $product->warehouseStocks->sum('quantity');

                        if ($quantity > $availableStock) {
                            $validator->errors()->add(
                                "items.{$index}.quantity",
                                __("Requested quantity (:qty) exceeds available stock (:stock) for ':name'.", [
                                    'qty' => $quantity,
                                    'stock' => $availableStock,
                                    'name' => $product->name,
                                ])
                            );
                        }
                    }
                }
            }
        });
    }
}

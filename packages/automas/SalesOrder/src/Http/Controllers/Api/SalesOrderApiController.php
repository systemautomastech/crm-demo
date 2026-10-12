<?php

namespace Automas\SalesOrder\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Automas\SalesOrder\Models\SalesOrder;
use Automas\SalesOrder\Models\SalesOrderItem;
use Automas\SalesOrder\Models\SalesOrderItemTax;

class SalesOrderApiController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request)
    {
        try {
            if (!Auth::user()->can('manage-sales-orders')) {
                return $this->errorResponse('Permission denied', null, 403);
            }

            $query = SalesOrder::with(['customer', 'assignedUsers', 'items', 'warehouse'])
                ->accessible();

            if ($request->name) {
                $query->where(function ($sq) use ($request) {
                    $sq->where('name', 'like', '%' . $request->name . '%')
                        ->orWhere('order_number', 'like', '%' . $request->name . '%');
                });
            }

            if ($request->status) {
                $query->where('status', $request->status);
            }

            if ($request->delivery_status) {
                $query->where('delivery_status', $request->delivery_status);
            }

            if ($request->customer_id) {
                $query->where('customer_id', $request->customer_id);
            }

            $orders = $query->latest()
                ->paginate($request->per_page ?? 10)
                ->withQueryString();

            $orders->getCollection()->transform(function ($order) {
                return [
                    'id'                     => $order->id,
                    'order_number'           => $order->order_number,
                    'name'                   => $order->name,
                    'customer'               => $order->customer?->name,
                    'customer_id'            => $order->customer_id,
                    'warehouse'              => $order->warehouse?->name,
                    'warehouse_id'           => $order->warehouse_id,
                    'amount'                 => $order->getTotal(),
                    'subtotal'               => (float) $order->subtotal,
                    'tax_amount'             => (float) $order->tax_amount,
                    'discount_amount'        => (float) $order->discount_amount,
                    'total_amount'           => (float) $order->total_amount,
                    'order_date'             => $order->order_date?->format('Y-m-d'),
                    'expected_delivery_date' => $order->expected_delivery_date?->format('Y-m-d'),
                    'status'                 => $order->status,
                    'delivery_status'        => $order->delivery_status,
                    'assignment_status'      => $order->assignment_status,
                    'is_invoiced'            => (bool) $order->is_invoiced,
                    'created_at'             => $order->created_at?->toIso8601String(),
                ];
            });

            return $this->paginatedResponse($orders, 'Sales orders retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Something went wrong: ' . $e->getMessage());
        }
    }

    public function store(Request $request)
    {
        try {
            if (!Auth::user()->can('create-sales-orders')) {
                return $this->errorResponse('Permission denied', null, 403);
            }

            $validator = Validator::make($request->all(), [
                'name'                        => 'required|string|max:255',
                'quotation_id'                    => 'nullable|integer',
                'customer_id'                 => 'required|exists:customers,id',
                'warehouse_id'                => 'nullable|exists:warehouses,id',
                'status'                      => 'nullable|string|in:draft,confirmed',
                'order_date'                  => 'required|date',
                'expected_delivery_date'      => 'nullable|date',
                'billing_address'             => 'nullable|string',
                'shipping_address'            => 'nullable|string',
                'billing_city'                => 'nullable|string|max:255',
                'billing_state'               => 'nullable|string|max:255',
                'shipping_city'               => 'nullable|string|max:255',
                'shipping_state'              => 'nullable|string|max:255',
                'billing_country'             => 'nullable|string|max:255',
                'billing_postal_code'         => 'nullable|string|max:20',
                'shipping_country'            => 'nullable|string|max:255',
                'shipping_postal_code'        => 'nullable|string|max:20',
                'description'                 => 'nullable|string',
                'notes'                       => 'nullable|string',
                'items'                       => 'required|array|min:1',
                'items.*.product_id'          => 'nullable|integer',
                'items.*.quantity'            => 'required|integer|min:1',
                'items.*.unit_price'          => 'required|numeric|min:0',
                'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
                'items.*.tax_percentage'      => 'nullable|numeric|min:0',
                'items.*.unit'                => 'nullable|string|max:50',
                'items.*.description'         => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return $this->validationErrorResponse($validator->errors());
            }

            $validated = $validator->validated();
            $totals    = $this->calculateTotals($validated['items']);

            $order = DB::transaction(function () use ($validated, $totals) {
                $order = SalesOrder::create([
                    'name'                   => $validated['name'],
                    'quotation_id'               => $validated['quotation_id'] ?? null,
                    'customer_id'            => $validated['customer_id'],
                    'warehouse_id'           => $validated['warehouse_id'] ?? null,
                    'status'                 => $validated['status'] ?? SalesOrder::STATUS_DRAFT,
                    'delivery_status'        => SalesOrder::DELIVERY_STATUS_PENDING,
                    'order_date'             => $validated['order_date'],
                    'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,
                    'billing_address'        => $validated['billing_address'] ?? null,
                    'shipping_address'       => $validated['shipping_address'] ?? null,
                    'billing_city'           => $validated['billing_city'] ?? null,
                    'billing_state'          => $validated['billing_state'] ?? null,
                    'shipping_city'          => $validated['shipping_city'] ?? null,
                    'shipping_state'         => $validated['shipping_state'] ?? null,
                    'billing_country'        => $validated['billing_country'] ?? null,
                    'billing_postal_code'    => $validated['billing_postal_code'] ?? null,
                    'shipping_country'       => $validated['shipping_country'] ?? null,
                    'shipping_postal_code'   => $validated['shipping_postal_code'] ?? null,
                    'description'            => $validated['description'] ?? null,
                    'notes'                  => $validated['notes'] ?? null,
                    'subtotal'               => $totals['subtotal'],
                    'tax_amount'             => $totals['tax_amount'],
                    'discount_amount'        => $totals['discount_amount'],
                    'total_amount'           => $totals['total_amount'],
                    'creator_id'             => Auth::id(),
                    'created_by'             => creatorId(),
                ]);

                $this->createOrderItems($order->id, $validated['items']);

                return $order;
            });

            $order->load(['customer', 'items', 'warehouse']);

            return $this->successResponse($order, 'The sales order has been created successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse('Something went wrong: ' . $e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        try {
            if (!Auth::user()->can('edit-sales-orders')) {
                return $this->errorResponse('Permission denied', null, 403);
            }

            $order = SalesOrder::where('id', $id)
                ->where('created_by', creatorId())
                ->first();

            if (!$order) {
                return $this->errorResponse('Order not found', null, 404);
            }

            $validator = Validator::make($request->all(), [
                'name'                        => 'required|string|max:255',
                'customer_id'                 => 'required|exists:customers,id',
                'warehouse_id'                => 'nullable|exists:warehouses,id',
                'status'                      => 'nullable|string|in:draft,confirmed,cancelled',
                'order_date'                  => 'required|date',
                'expected_delivery_date'      => 'nullable|date',
                'billing_address'             => 'nullable|string',
                'shipping_address'            => 'nullable|string',
                'description'                 => 'nullable|string',
                'notes'                       => 'nullable|string',
                'items'                       => 'required|array|min:1',
                'items.*.product_id'          => 'nullable|integer',
                'items.*.quantity'            => 'required|integer|min:1',
                'items.*.unit_price'          => 'required|numeric|min:0',
                'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
                'items.*.tax_percentage'      => 'nullable|numeric|min:0',
            ]);

            if ($validator->fails()) {
                return $this->validationErrorResponse($validator->errors());
            }

            $validated = $validator->validated();
            $totals    = $this->calculateTotals($validated['items']);

            DB::transaction(function () use ($order, $validated, $totals) {
                $order->update([
                    'name'                   => $validated['name'],
                    'customer_id'            => $validated['customer_id'],
                    'warehouse_id'           => $validated['warehouse_id'] ?? null,
                    'status'                 => $validated['status'] ?? $order->status,
                    'order_date'             => $validated['order_date'],
                    'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,
                    'billing_address'        => $validated['billing_address'] ?? $order->billing_address,
                    'shipping_address'       => $validated['shipping_address'] ?? $order->shipping_address,
                    'description'            => $validated['description'] ?? $order->description,
                    'notes'                  => $validated['notes'] ?? $order->notes,
                    'subtotal'               => $totals['subtotal'],
                    'tax_amount'             => $totals['tax_amount'],
                    'discount_amount'        => $totals['discount_amount'],
                    'total_amount'           => $totals['total_amount'],
                ]);

                $order->items()->delete();
                $this->createOrderItems($order->id, $validated['items']);
            });

            $order->load(['customer', 'items', 'warehouse']);

            return $this->successResponse($order, 'The sales order details are updated successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse('Something went wrong: ' . $e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            if (!Auth::user()->can('delete-sales-orders')) {
                return $this->errorResponse('Permission denied', null, 403);
            }

            $order = SalesOrder::where('id', $id)
                ->where('created_by', creatorId())
                ->first();

            if (!$order) {
                return $this->errorResponse('Order not found', null, 404);
            }

            if ($order->delivery_status !== SalesOrder::DELIVERY_STATUS_PENDING) {
                return $this->errorResponse('Cannot delete a Sales Order with deliveries.', null, 422);
            }

            DB::transaction(function () use ($order) {
                $order->assignedUsers()->detach();
                $order->delete();
            });

            return $this->successResponse(null, 'The sales order has been deleted.');
        } catch (\Exception $e) {
            return $this->errorResponse('Something went wrong: ' . $e->getMessage());
        }
    }

    private function calculateTotals(array $items): array
    {
        $subtotal      = 0;
        $totalTax      = 0;
        $totalDiscount = 0;

        foreach ($items as $item) {
            $lineTotal      = ($item['quantity'] ?? 0) * ($item['unit_price'] ?? 0);
            $discountAmount = ($lineTotal * ($item['discount_percentage'] ?? 0)) / 100;
            $afterDiscount  = $lineTotal - $discountAmount;
            $taxAmount      = ($afterDiscount * ($item['tax_percentage'] ?? 0)) / 100;

            $subtotal      += $lineTotal;
            $totalDiscount += $discountAmount;
            $totalTax      += $taxAmount;
        }

        return [
            'subtotal'        => $subtotal,
            'tax_amount'      => $totalTax,
            'discount_amount' => $totalDiscount,
            'total_amount'    => $subtotal + $totalTax - $totalDiscount,
        ];
    }

    private function createOrderItems(int $orderId, array $items): void
    {
        foreach ($items as $itemData) {
            if (empty($itemData['quantity'])) {
                continue;
            }

            SalesOrderItem::create([
                'order_id'            => $orderId,
                'product_id'          => $itemData['product_id'] ?? null,
                'quantity'            => $itemData['quantity'],
                'unit_price'          => $itemData['unit_price'],
                'discount_percentage' => $itemData['discount_percentage'] ?? 0,
                'tax_percentage'      => $itemData['tax_percentage'] ?? 0,
                'unit'                => $itemData['unit'] ?? null,
                'description'         => $itemData['description'] ?? null,
                'creator_id'          => Auth::id(),
                'created_by'          => creatorId(),
            ]);
        }
    }
}

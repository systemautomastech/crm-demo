<?php

namespace Automas\SalesOrder\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Automas\SalesOrder\Models\SalesOrder;
use Automas\SalesOrder\Models\SalesOrderDelivery;
use Automas\SalesOrder\Models\SalesOrderDeliveryItem;
use Automas\SalesOrder\Models\SalesOrderSetting;
use Automas\SalesOrder\Events\CreateSalesOrderDelivery;
use Automas\SalesOrder\Events\CancelSalesOrderDelivery;
use Automas\SalesOrder\Http\Requests\StoreSalesOrderDeliveryRequest;

class SalesOrderDeliveryController extends Controller
{
    // ─── Delivery Challans Index ─────────────────────────────────────────────

    public function index(Request $request)
    {
        $authUser = Auth::user();
        if (!$authUser->can('manage-sales-order-deliveries') && !$authUser->can('view-sales-order-deliveries') && !$authUser->can('create-sales-order-deliveries')) {
            return back()->with('error', __('Permission denied'));
        }

        $deliveries = SalesOrderDelivery::with(['salesOrder.customer', 'creator', 'items.salesOrderItem'])
            ->where('created_by', creatorId())
            ->when($request->search, function ($q) use ($request) {
                $search = $request->search;
                $q->where(function ($sq) use ($search) {
                    $sq->where('delivery_number', 'like', "%{$search}%")
                        ->orWhereHas('salesOrder', function ($soq) use ($search) {
                            $soq->where('order_number', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%")
                                ->orWhereHas('customer', fn($cq) => $cq->where('name', 'like', "%{$search}%"));
                        });
                });
            })
            ->when($request->status && $request->status !== 'all', fn($q) => $q->where('status', $request->status))
            ->when($request->date_from, fn($q) => $q->whereDate('delivery_date', '>=', $request->date_from))
            ->when($request->date_to, fn($q) => $q->whereDate('delivery_date', '<=', $request->date_to))
            ->when($request->customer_id, function ($q) use ($request) {
                $q->whereHas('salesOrder', fn($soq) => $soq->where('customer_id', $request->customer_id));
            })
            ->when(!$authUser->can('manage-any-sales-orders') && !in_array($authUser->type, ['company', 'superadmin', 'admin']), function ($q) use ($authUser) {
                $q->where(function ($sq) use ($authUser) {
                    $sq->where('creator_id', $authUser->id)
                        ->orWhereHas('salesOrder', function ($soq) use ($authUser) {
                            $soq->where('creator_id', $authUser->id)
                                ->orWhere('acquired_by', $authUser->id)
                                ->orWhereHas('assignedUsers', fn($uq) => $uq->where('users.id', $authUser->id));
                        });
                });
            })
            ->when($request->sort, function ($q) use ($request) {
                $direction = $request->direction ?? 'asc';
                return $q->orderBy($request->sort, $direction);
            }, fn($q) => $q->latest())
            ->paginate($request->per_page ?? 10)
            ->withQueryString();

        return Inertia::render('SalesOrder/Deliveries/Index', [
            'deliveries' => $deliveries,
            'filters' => $request->only(['search', 'status', 'date_from', 'date_to', 'customer_id', 'sort', 'direction', 'per_page']),
        ]);
    }

    // ─── Create Delivery Form ────────────────────────────────────────────────

    public function create(SalesOrder $salesOrder)
    {
        if (!Auth::user()->can('create-sales-order-deliveries')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccessOrder($salesOrder)) {
            return back()->with('error', __('Access denied'));
        }
        if ($salesOrder->status !== SalesOrder::STATUS_CONFIRMED) {
            return back()->with('error', __('Only confirmed Sales Orders can receive deliveries.'));
        }
        if ($salesOrder->delivery_status === SalesOrder::DELIVERY_STATUS_FULL) {
            return back()->with('error', __('This Sales Order is already fully delivered.'));
        }
        if ($salesOrder->assignment_status !== SalesOrder::ASSIGNMENT_ACQUIRED) {
            return back()->with('error', __('You must acquire this Sales Order before creating a delivery.'));
        }
        $authUser = Auth::user();
        $isCompanyOrAdmin = in_array($authUser->type, ['company', 'superadmin', 'admin']);
        if ($salesOrder->acquired_by !== $authUser->id && !$isCompanyOrAdmin) {
            return back()->with('error', __('Only the user who acquired this Sales Order can create a delivery.'));
        }

        // Load items with delivered quantities
        $items = $salesOrder->items()->with([
            'product',
            'taxes',
            'deliveryItems' => function ($q) {
                $q->whereHas('delivery', fn($dq) => $dq->where('status', '!=', 'cancelled'));
            }
        ])->get()->map(function ($item) {
            $delivered = $item->deliveryItems->sum('quantity');
            $remaining = max(0, $item->quantity - $delivered);
            return [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product?->name ?? null,
                'product' => $item->product,
                'quantity' => $item->quantity,
                'delivered_quantity' => $delivered,
                'remaining_quantity' => $remaining,
                'unit' => $item->unit,
                'description' => $item->description,
            ];
        })->filter(fn($i) => $i['remaining_quantity'] > 0)->values();

        if ($items->isEmpty()) {
            return back()->with('error', __('No items remain for new Challan.'));
        }

        return Inertia::render('SalesOrder/SalesOrders/Deliver', [
            'salesOrder' => $salesOrder->load('customer'),
            'items' => $items,
        ]);
    }

    // ─── Store Delivery ──────────────────────────────────────────────────────

    public function store(StoreSalesOrderDeliveryRequest $request, SalesOrder $salesOrder)
    {
        if (!Auth::user()->can('create-sales-order-deliveries')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccessOrder($salesOrder)) {
            return back()->with('error', __('Access denied'));
        }
        if ($salesOrder->status !== SalesOrder::STATUS_CONFIRMED) {
            return back()->with('error', __('Only confirmed Sales Orders can receive deliveries.'));
        }
        if ($salesOrder->delivery_status === SalesOrder::DELIVERY_STATUS_FULL || !$salesOrder->hasRemainingItemsToDeliver()) {
            return back()->with('error', __('No items remain for new Challan.'));
        }
        if ($salesOrder->assignment_status !== SalesOrder::ASSIGNMENT_ACQUIRED) {
            return back()->with('error', __('You must acquire this Sales Order before creating a delivery.'));
        }
        $authUser = Auth::user();
        $isCompanyOrAdmin = in_array($authUser->type, ['company', 'superadmin', 'admin']);
        if ($salesOrder->acquired_by !== $authUser->id && !$isCompanyOrAdmin) {
            return back()->with('error', __('Only the user who acquired this Sales Order can create a delivery.'));
        }

        $delivery = DB::transaction(function () use ($request, $salesOrder) {
            // Validate quantities against remaining with row locking
            $orderItems = $salesOrder->items()
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($request->items as $deliveryItemData) {
                $itemId = $deliveryItemData['sales_order_item_id'];
                $orderItem = $orderItems->get($itemId);

                if (!$orderItem || $orderItem->order_id !== $salesOrder->id) {
                    throw new \InvalidArgumentException(__('Invalid order item.'));
                }

                $delivered = SalesOrderDeliveryItem::whereHas(
                    'delivery',
                    fn($q) => $q->where('sales_order_id', $salesOrder->id)->where('status', '!=', 'cancelled')
                )->where('sales_order_item_id', $itemId)->sum('quantity');

                $remaining = $orderItem->quantity - $delivered;

                if ($deliveryItemData['quantity'] > $remaining) {
                    throw new \InvalidArgumentException(
                        __('Delivery quantity (:qty) exceeds remaining quantity (:rem) for item :id.', [
                            'qty' => $deliveryItemData['quantity'],
                            'rem' => $remaining,
                            'id' => $itemId,
                        ])
                    );
                }
                if ($deliveryItemData['quantity'] <= 0) {
                    throw new \InvalidArgumentException(__('Delivery quantity must be greater than 0.'));
                }
            }

            // Create delivery record
            $delivery = SalesOrderDelivery::create([
                'sales_order_id' => $salesOrder->id,
                'delivery_date' => $request->delivery_date,
                'notes' => $request->notes ?? null,
                'status' => $request->status ?? SalesOrderDelivery::STATUS_CREATED,
                'creator_id' => Auth::id(),
                'created_by' => creatorId(),
            ]);

            // Create delivery items
            foreach ($request->items as $deliveryItemData) {
                $orderItem = $orderItems->get($deliveryItemData['sales_order_item_id']);
                SalesOrderDeliveryItem::create([
                    'delivery_id' => $delivery->id,
                    'sales_order_item_id' => $deliveryItemData['sales_order_item_id'],
                    'product_id' => $orderItem->product_id,
                    'quantity' => $deliveryItemData['quantity'],
                    'notes' => $deliveryItemData['notes'] ?? null,
                ]);
            }

            // Recalculate Sales Order delivery status
            $salesOrder->refresh();
            $salesOrder->recalculateDeliveryStatus();

            return $delivery;
        });

        CreateSalesOrderDelivery::dispatch($delivery);

        return redirect()
            ->route('salesorder.orders.show', $salesOrder)
            ->with('success', __('Delivery :num created successfully.', ['num' => $delivery->delivery_number]));
    }

    // ─── Show Delivery ───────────────────────────────────────────────────────

    public function show(SalesOrderDelivery $delivery)
    {
        if (!Auth::user()->can('view-sales-order-deliveries')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccessDelivery($delivery)) {
            return back()->with('error', __('Access denied'));
        }

        $delivery->load(['salesOrder.customer', 'items.salesOrderItem.product', 'creator']);
        $authUser = Auth::user();
        $isCompanyOrAdmin = in_array($authUser->type, ['company', 'superadmin', 'admin']);
        $salesOrder = $delivery->salesOrder;

        return Inertia::render('SalesOrder/Deliveries/Show', [
            'delivery' => $delivery,
            'settings' => SalesOrderSetting::getSettings(),
            'canEdit' => ($authUser->can('create-sales-order-deliveries') || $authUser->can('manage-sales-order-deliveries')) && !in_array($delivery->status, [SalesOrderDelivery::STATUS_DELIVERED, SalesOrderDelivery::STATUS_CANCELLED]),
            'canCancel' => $authUser->can('cancel-sales-order-deliveries') && !in_array($delivery->status, [SalesOrderDelivery::STATUS_DELIVERED, SalesOrderDelivery::STATUS_CANCELLED]),
            'canUpdateStatus' => ($authUser->can('manage-sales-order-deliveries') || $authUser->can('create-sales-order-deliveries')) && !in_array($delivery->status, [SalesOrderDelivery::STATUS_DELIVERED, SalesOrderDelivery::STATUS_CANCELLED]),
            'canRelease' => ($authUser->can('release-sales-orders') || $authUser->can('manage-sales-orders') || $isCompanyOrAdmin) && $salesOrder && $salesOrder->assignment_status === SalesOrder::ASSIGNMENT_ACQUIRED && $salesOrder->delivery_status !== SalesOrder::DELIVERY_STATUS_FULL,
            'canPrint' => $authUser->can('print-sales-orders') || $authUser->can('view-sales-order-deliveries') || $authUser->can('manage-sales-order-deliveries') || $isCompanyOrAdmin,
        ]);
    }

    // ─── Edit Delivery ───────────────────────────────────────────────────────

    public function edit(SalesOrderDelivery $delivery)
    {
        if (!Auth::user()->can('create-sales-order-deliveries') && !Auth::user()->can('manage-sales-order-deliveries')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccessDelivery($delivery)) {
            return back()->with('error', __('Access denied'));
        }
        if (in_array($delivery->status, [SalesOrderDelivery::STATUS_DELIVERED, SalesOrderDelivery::STATUS_CANCELLED])) {
            return back()->with('error', __('Finalized delivery challans cannot be edited.'));
        }

        $delivery->load(['salesOrder.customer', 'items.salesOrderItem.product']);

        return Inertia::render('SalesOrder/Deliveries/Edit', [
            'delivery' => $delivery,
        ]);
    }

    // ─── Update Delivery ─────────────────────────────────────────────────────

    public function update(Request $request, SalesOrderDelivery $delivery)
    {
        if (!Auth::user()->can('create-sales-order-deliveries') && !Auth::user()->can('manage-sales-order-deliveries')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccessDelivery($delivery)) {
            return back()->with('error', __('Access denied'));
        }
        if (in_array($delivery->status, [SalesOrderDelivery::STATUS_DELIVERED, SalesOrderDelivery::STATUS_CANCELLED])) {
            return back()->with('error', __('Finalized delivery challans cannot be edited.'));
        }

        $request->validate([
            'delivery_date' => 'required|date',
            'notes' => 'nullable|string',
            'status' => 'required|string|in:created,ongoing,postponed',
            'items' => 'required|array|min:1',
            'items.*.sales_order_item_id' => 'required|integer',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.notes' => 'nullable|string',
        ]);

        DB::transaction(function () use ($request, $delivery) {
            $delivery->update([
                'delivery_date' => $request->delivery_date,
                'status' => $request->status,
                'notes' => $request->notes,
            ]);

            $existingDeliveryItems = $delivery->items()->get()->keyBy('sales_order_item_id');

            foreach ($request->items as $itemData) {
                $itemId = $itemData['sales_order_item_id'];
                $deliveryItem = $existingDeliveryItems->get($itemId);

                if ($deliveryItem) {
                    $deliveryItem->update([
                        'quantity' => $itemData['quantity'],
                        'notes' => $itemData['notes'] ?? null,
                    ]);
                }
            }

            $delivery->salesOrder->recalculateDeliveryStatus();
        });

        return redirect()
            ->route('salesorder.deliveries.show', $delivery->id)
            ->with('success', __('Delivery Challan updated successfully.'));
    }

    // ─── Cancel Delivery ─────────────────────────────────────────────────────

    public function cancel(SalesOrderDelivery $delivery)
    {
        if (!Auth::user()->can('cancel-sales-order-deliveries')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccessDelivery($delivery)) {
            return back()->with('error', __('Access denied'));
        }
        if ($delivery->status === SalesOrderDelivery::STATUS_CANCELLED) {
            return back()->with('error', __('Delivery is already cancelled.'));
        }

        DB::transaction(function () use ($delivery) {
            $delivery->update(['status' => SalesOrderDelivery::STATUS_CANCELLED]);
            $delivery->salesOrder->recalculateDeliveryStatus();
        });

        CancelSalesOrderDelivery::dispatch($delivery);

        return back()->with('success', __('Delivery cancelled. Quantities have been restored.'));
    }

    public function updateStatus(Request $request, SalesOrderDelivery $delivery)
    {
        if (!Auth::user()->can('manage-sales-order-deliveries') && !Auth::user()->can('create-sales-order-deliveries') && !Auth::user()->can('cancel-sales-order-deliveries')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccessDelivery($delivery)) {
            return back()->with('error', __('Access denied'));
        }

        $validated = $request->validate([
            'status' => 'required|string|in:created,ongoing,postponed,delivered,cancelled',
        ]);

        $newStatus = $validated['status'];

        DB::transaction(function () use ($delivery, $newStatus) {
            $delivery->update(['status' => $newStatus]);
            $delivery->salesOrder->recalculateDeliveryStatus();
        });

        if ($newStatus === SalesOrderDelivery::STATUS_CANCELLED && class_exists(\Automas\SalesOrder\Events\CancelSalesOrderDelivery::class)) {
            CancelSalesOrderDelivery::dispatch($delivery);
        }

        return back()->with('success', __('Delivery status updated to :status.', ['status' => ucfirst($newStatus)]));
    }

    // ─── Delivery Challan ────────────────────────────────────────────────────

    public function challan(SalesOrderDelivery $delivery)
    {
        if (!Auth::user()->can('print-delivery-challans')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccessDelivery($delivery)) {
            return back()->with('error', __('Access denied'));
        }

        $delivery->load(['salesOrder.customer', 'salesOrder.warehouse', 'items.salesOrderItem.product', 'creator']);
        $settings = SalesOrderSetting::getSettings();

        if (request()->has('blade')) {
            return view('salesorder::print_challan', [
                'delivery' => $delivery,
                'salesOrderSetting' => $settings,
            ]);
        }

        $quotation = null;
        if ($delivery->salesOrder?->quotation_id && class_exists(\Automas\Quotation\Models\SalesQuotation::class)) {
            $quotation = \Automas\Quotation\Models\SalesQuotation::find($delivery->salesOrder->quotation_id);
        }

        // return Inertia::render('SalesOrder/Deliveries/Challan', [
        //     'delivery' => $delivery,
        //     'settings' => $settings,
        //     'quotation' => $quotation,
        //     'autoPrint' => false,
        // ]);

        return view('salesorder::print_challan', [
            'delivery' => $delivery,
            'settings' => $settings,
            'quotation' => $quotation,
            'autoPrint' => false,
        ]);
    }

    // public function challanPdf(SalesOrderDelivery $delivery)
    // {
    //     if (!Auth::user()->can('print-delivery-challans')) {
    //         return back()->with('error', __('Permission denied'));
    //     }
    //     if (!$this->canAccessDelivery($delivery)) {
    //         return back()->with('error', __('Access denied'));
    //     }

    //     $delivery->load(['salesOrder.customer', 'items.salesOrderItem.product', 'creator']);
    //     $settings = SalesOrderSetting::getSettings();

    //     return Inertia::render('SalesOrder/Deliveries/Challan', [
    //         'delivery' => $delivery,
    //         'settings' => $settings,
    //         'quotation' => null,
    //         'autoPrint' => true,
    //     ]);
    // }

    // ─── Private Helpers ─────────────────────────────────────────────────────

    private function canAccessOrder(SalesOrder $salesOrder): bool
    {
        $user = Auth::user();
        if (in_array($user->type, ['company', 'superadmin', 'admin']) || $user->can('manage-any-sales-orders')) {
            return $salesOrder->created_by == creatorId();
        }
        if ($user->can('manage-own-sales-orders') || $user->can('manage-sales-orders')) {
            if ($salesOrder->created_by != creatorId()) {
                return false;
            }
            if ($salesOrder->creator_id == $user->id || $salesOrder->acquired_by == $user->id) {
                return true;
            }
            if ($salesOrder->assignedUsers()->where('users.id', $user->id)->exists()) {
                return true;
            }
            if ($salesOrder->assignment_status === SalesOrder::ASSIGNMENT_GROUP_ASSIGNED && $salesOrder->assigned_group_id) {
                return \App\Models\UserGroup::where('id', $salesOrder->assigned_group_id)
                    ->where('is_active', true)
                    ->whereHas('users', fn($q) => $q->where('users.id', $user->id))
                    ->exists();
            }
        }
        return false;
    }

    private function canAccessDelivery(SalesOrderDelivery $delivery): bool
    {
        $user = Auth::user();
        if (in_array($user->type, ['company', 'superadmin', 'admin']) || $user->can('manage-any-sales-orders')) {
            return $delivery->created_by == creatorId();
        }
        if ($delivery->created_by != creatorId()) {
            return false;
        }
        if ($delivery->creator_id == $user->id) {
            return true;
        }
        if (!$delivery->salesOrder) {
            return $delivery->created_by == creatorId();
        }
        return $this->canAccessOrder($delivery->salesOrder);
    }
}

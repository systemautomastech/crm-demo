<?php

namespace Automas\SalesOrder\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\SalesInvoice;
use App\Models\SalesInvoiceItem;
use App\Models\SalesInvoiceItemTax;
use Automas\ProductService\Models\ProductServiceItem;
use Automas\SalesOrder\Models\SalesOrderDelivery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Automas\SalesOrder\Models\SalesOrder;
use Automas\SalesOrder\Models\SalesOrderItem;
use Automas\SalesOrder\Models\SalesOrderItemTax;
use Automas\SalesOrder\Models\SalesOrderSetting;
use Automas\SalesOrder\Http\Requests\StoreSalesOrderRequest;
use Automas\SalesOrder\Http\Requests\UpdateSalesOrderRequest;
use Automas\SalesOrder\Events\CreateSalesOrder;
use Automas\SalesOrder\Events\UpdateSalesOrder;
use Automas\SalesOrder\Events\DestroySalesOrder;
use App\Models\User;
use App\Models\UserGroup;
use App\Models\Warehouse;
use App\Models\Customer;
use App\Services\CustomerService;
use Automas\Quotation\Models\SalesQuotation;

class SalesOrderController extends Controller
{
    public function __construct(protected CustomerService $customerService)
    {
    }

    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-sales-orders')) {
            return back()->with('error', __('Permission denied'));
        }

        $salesOrders = SalesOrder::with([
            'customer',
            'warehouse',
            'assignedUsers',
            'assignedGroup',
            'acquiredByUser',
            'items.product.warehouseStocks',
        ])
            ->accessible()
            ->when($request->name, fn($q) => $q->where(function ($sq) use ($request) {
                $sq->where('name', 'like', '%' . $request->name . '%')
                    ->orWhere('order_number', 'like', '%' . $request->name . '%');
            }))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->delivery_status, fn($q) => $q->where('delivery_status', $request->delivery_status))
            ->when($request->assignment_status, fn($q) => $q->where('assignment_status', $request->assignment_status))
            ->when($request->assigned_group_id, fn($q) => $q->where('assigned_group_id', $request->assigned_group_id))
            ->when($request->my_acquired, fn($q) => $q->where('acquired_by', Auth::id()))
            ->when($request->available_to_me, function ($q) {
                $q->where('assignment_status', SalesOrder::ASSIGNMENT_GROUP_ASSIGNED)
                    ->whereHas('assignedGroup', fn($sq) => $sq->whereHas('users', fn($uq) => $uq->where('users.id', Auth::id())));
            })
            ->when($request->customer_id, fn($q) => $q->where('customer_id', $request->customer_id))
            ->when($request->assigned_user_id, fn($q) => $q->whereHas('assignedUsers', fn($sq) => $sq->where('users.id', $request->assigned_user_id)))
            ->when($request->date_from, fn($q) => $q->whereDate('order_date', '>=', $request->date_from))
            ->when($request->date_to, fn($q) => $q->whereDate('order_date', '<=', $request->date_to))
            ->when($request->sort, function ($q) use ($request) {
                $direction = $request->direction ?? 'asc';
                if ($request->sort === 'amount') {
                    return $q->orderBy('total_amount', $direction);
                }
                return $q->orderBy($request->sort, $direction);
            }, fn($q) => $q->latest())
            ->paginate($request->per_page ?? 10)
            ->withQueryString();

        $authUser = Auth::user();
        $isCompanyOrAdmin = in_array($authUser->type, ['company', 'superadmin', 'admin']);
        $userGroupIds = UserGroup::where('is_active', true)
            ->whereHas('users', fn($q) => $q->where('users.id', $authUser->id))
            ->pluck('id')
            ->toArray();

        $salesOrders->getCollection()->transform(function ($order) use ($authUser, $isCompanyOrAdmin, $userGroupIds) {
            $order->amount = $order->getTotal();
            $isGroupMember = $order->assigned_group_id && in_array($order->assigned_group_id, $userGroupIds);
            $isAssignedUser = $order->assignedUsers->contains('id', $authUser->id);

            $order->can_deliver = $order->status === SalesOrder::STATUS_CONFIRMED
                && $order->delivery_status !== SalesOrder::DELIVERY_STATUS_FULL
                && $order->assignment_status === SalesOrder::ASSIGNMENT_ACQUIRED
                && ($order->acquired_by === $authUser->id || $isCompanyOrAdmin)
                && $order->hasRemainingItemsToDeliver();

            $order->can_acquire = $order->delivery_status !== SalesOrder::DELIVERY_STATUS_FULL
                && $order->assignment_status !== SalesOrder::ASSIGNMENT_ACQUIRED
                && (
                    $isCompanyOrAdmin
                    || ($order->assignment_status === SalesOrder::ASSIGNMENT_GROUP_ASSIGNED && $isGroupMember)
                    || ($order->assignment_status === SalesOrder::ASSIGNMENT_UNASSIGNED)
                    || $authUser->can('acquire-sales-orders')
                );

            $orderWarehouseId = $order->warehouse_id;
            $order->items = $order->items->map(function ($it) use ($orderWarehouseId) {
                $p = $it->product;
                $isService = ($p?->type ?? 'product') === 'service';
                $stock = 0;
                if ($isService) {
                    $stock = 999999;
                } elseif ($p && $p->relationLoaded('warehouseStocks')) {
                    $stock = $orderWarehouseId
                        ? (float) ($p->warehouseStocks->where('warehouse_id', $orderWarehouseId)->first()?->quantity ?? 0)
                        : (float) $p->warehouseStocks->sum('quantity');
                }
                $it->stock_quantity = $stock;
                $it->is_service = $isService;
                $it->hasStock = $isService || ($stock >= $it->quantity);
                return $it;
            });

            return $order;
        });

        $customers = $this->customerService->getCustomers();
        $users = $this->getWorkspaceUsers();
        $settings = SalesOrderSetting::getSettings();
        $userGroups = UserGroup::where('created_by', creatorId())
            ->active()
            ->select('id', 'name')
            ->get();

        return Inertia::render('SalesOrder/SalesOrders/Index', [
            'salesOrders' => $salesOrders,
            'customers' => $customers,
            'users' => $users,
            'userGroups' => $userGroups,
            'settings' => $settings,
            'filters' => $request->only(['name', 'status', 'delivery_status', 'assignment_status', 'assigned_group_id', 'customer_id', 'assigned_user_id', 'date_from', 'date_to', 'my_acquired', 'available_to_me']),
        ]);
    }

    public function create(Request $request)
    {
        if (!Auth::user()->can('create-sales-orders')) {
            return back()->with('error', __('Permission denied'));
        }

        $settings = SalesOrderSetting::getSettings();
        $userGroups = UserGroup::where('created_by', creatorId())
            ->active()
            ->select('id', 'name')
            ->get();

        return Inertia::render('SalesOrder/SalesOrders/Create', [
            'customers' => $this->customerService->getCustomers(),
            'users' => $this->getWorkspaceUsers(),
            'userGroups' => $userGroups,
            'warehouses' => $this->getWarehouses(),
            'quotes' => $this->getQuotations(),
            'settings' => $settings,
            'fromQuote' => $request->quotation_id ? $this->getQuoteData($request->quotation_id) : null,
        ]);
    }

    public function store(StoreSalesOrderRequest $request)
    {
        if (!Auth::user()->can('create-sales-orders')) {
            return back()->with('error', __('Permission denied'));
        }

        $validated = $request->validated();

        // Convert addresses to JSON
        $billingAddress = [
            'billing_address' => $validated['billing_address'] ?? null,
            'billing_city' => $validated['billing_city'] ?? null,
            'billing_state' => $validated['billing_state'] ?? null,
            'billing_country' => $validated['billing_country'] ?? null,
            'billing_postal_code' => $validated['billing_postal_code'] ?? null,
        ];

        $shippingAddress = [
            'shipping_address' => $validated['shipping_address'] ?? null,
            'shipping_city' => $validated['shipping_city'] ?? null,
            'shipping_state' => $validated['shipping_state'] ?? null,
            'shipping_country' => $validated['shipping_country'] ?? null,
            'shipping_postal_code' => $validated['shipping_postal_code'] ?? null,
        ];

        $salesOrder = DB::transaction(function () use ($validated, $billingAddress, $shippingAddress, $request) {
            $customerId = $this->resolveCustomer($validated, $request);
            $totals = $this->calculateTotals($validated['items']);

            $assignedGroupId = !empty($validated['assigned_group_id']) ? (int) $validated['assigned_group_id'] : null;
            $userUserIds = [];
            if (!empty($validated['assigned_user_ids'])) {
                $userUserIds = $this->validateWorkspaceUsers($validated['assigned_user_ids']);
            } elseif (!empty($validated['assign_user_id'])) {
                $userUserIds = $this->validateWorkspaceUsers([(int) $validated['assign_user_id']]);
            }

            if ($assignedGroupId) {
                $assignmentStatus = SalesOrder::ASSIGNMENT_GROUP_ASSIGNED;
                $userUserIds = [];
            } elseif (!empty($userUserIds)) {
                $assignmentStatus = SalesOrder::ASSIGNMENT_ACQUIRED;
                $assignedGroupId = null;
            } else {
                $assignmentStatus = SalesOrder::ASSIGNMENT_UNASSIGNED;
                $assignedGroupId = null;
            }

            $status = $validated['status'] ?? SalesOrder::STATUS_DRAFT;
            $salesOrder = SalesOrder::create([
                'name' => $validated['name'],
                'quotation_id' => $validated['quotation_id'] ?? null,
                'status' => $status,
                'confirmed_at' => $status === SalesOrder::STATUS_CONFIRMED ? now() : null,
                'delivery_status' => SalesOrder::DELIVERY_STATUS_PENDING,
                'assigned_group_id' => $assignedGroupId,
                'assignment_status' => $assignmentStatus,
                'customer_id' => $customerId,
                'warehouse_id' => $validated['warehouse_id'] ?? null,
                'order_date' => $validated['order_date'],
                'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,
                'billing_address' => $billingAddress,
                'shipping_address' => $shippingAddress,
                'description' => $validated['description'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'discount_amount' => $totals['discount_amount'],
                'total_amount' => $totals['total_amount'],
                'creator_id' => Auth::id(),
                'created_by' => creatorId(),
            ]);

            $this->createOrderItems($salesOrder->id, $validated['items']);

            $syncUserIds = [];
            if ($assignedGroupId) {
                $group = UserGroup::find($assignedGroupId);
                if ($group) {
                    $syncUserIds = $group->users()->pluck('users.id')->toArray();
                }
            } elseif (!empty($userUserIds)) {
                $syncUserIds = $userUserIds;
            }
            $salesOrder->assignedUsers()->sync($syncUserIds);

            return $salesOrder;
        });

        CreateSalesOrder::dispatch($request, $salesOrder);

        return redirect()
            ->route('salesorder.orders.show', $salesOrder)
            ->with('success', __('The sales order has been created successfully.'));
    }

    public function show(SalesOrder $salesOrder)
    {
        if (!Auth::user()->can('view-sales-orders')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccess($salesOrder)) {
            return redirect()->route('salesorder.orders.index')->with('error', __('Access denied'));
        }

        $salesOrder->load(['customer', 'warehouse', 'assignedUsers', 'allDeliveries.items.salesOrderItem', 'assignedGroup', 'acquiredByUser']);

        $warehouseId = $salesOrder->warehouse_id;

        $items = $salesOrder->items()->with([
            'product' => function ($pq) use ($warehouseId) {
                if ($warehouseId) {
                    $pq->with(['warehouseStocks' => fn($sq) => $sq->where('warehouse_id', $warehouseId)]);
                } else {
                    $pq->with('warehouseStocks');
                }
            },
            'taxes',
            'deliveryItems' => function ($q) {
                $q->whereHas('delivery', fn($dq) => $dq->where('status', SalesOrderDelivery::STATUS_DELIVERED));
            }
        ])->get()->map(function ($item) use ($warehouseId) {
            $lineTotal = $item->quantity * $item->unit_price;
            $discountAmt = ($lineTotal * ($item->discount_percentage ?? 0)) / 100;
            $afterDiscount = $lineTotal - $discountAmt;
            $taxAmt = ($afterDiscount * ($item->tax_percentage ?? 0)) / 100;
            $delivered = $item->deliveryItems->sum('quantity');
            $remaining = max(0, $item->quantity - $delivered);

            $product = $item->product;
            $isService = ($product?->type ?? 'product') === 'service';
            $stockQuantity = 0;
            if ($isService) {
                $stockQuantity = 999999;
            } elseif ($product && $product->relationLoaded('warehouseStocks')) {
                $stockQuantity = $warehouseId
                    ? (float) ($product->warehouseStocks->first()?->quantity ?? 0)
                    : (float) $product->warehouseStocks->sum('quantity');
            }

            return [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product?->name ?? null,
                'product' => $item->product,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'discount_percentage' => $item->discount_percentage ?? 0,
                'discount_amount' => $discountAmt,
                'tax_percentage' => $item->tax_percentage ?? 0,
                'tax_amount' => $taxAmt,
                'total_amount' => $afterDiscount + $taxAmt,
                'delivered_quantity' => $delivered,
                'remaining_quantity' => $remaining,
                'stock_quantity' => $stockQuantity,
                'is_service' => $isService,
                'hasStock' => $isService || ($stockQuantity >= $item->quantity),
                'unit' => $item->unit,
                'description' => $item->description,
                'taxes' => $item->taxes->map(fn($t) => ['tax_name' => $t->tax_name, 'tax_rate' => (float) $t->tax_rate])->toArray(),
            ];
        });

        $salesOrder->amount = $salesOrder->getTotal();

        $quotation = null;
        if ($salesOrder->quotation_id && class_exists(SalesQuotation::class)) {
            $quotation = SalesQuotation::find($salesOrder->quotation_id);
        }

        $settings = SalesOrderSetting::getSettings();

        $authUser = Auth::user();
        $userGroups = UserGroup::where('created_by', creatorId())
            ->active()
            ->select('id', 'name')
            ->withCount('users')
            ->get();

        $isGroupMember = $salesOrder->assigned_group_id
            ? UserGroup::where('id', $salesOrder->assigned_group_id)
                ->where('is_active', true)
                ->whereHas('users', fn($q) => $q->where('users.id', $authUser->id))
                ->exists()
            : false;

        $isCompanyOrAdmin = in_array($authUser->type, ['company', 'superadmin', 'admin']);
        $isAssignedUser = $salesOrder->assignedUsers->contains('id', $authUser->id);

        return Inertia::render('SalesOrder/SalesOrders/Show', [
            'salesOrder' => $salesOrder,
            'orderItems' => $items,
            'quotation' => $quotation,
            'deliveries' => $salesOrder->allDeliveries->load(['items.salesOrderItem', 'creator']),
            'settings' => $settings,
            'userGroups' => $userGroups,
            'users' => $this->getWorkspaceUsers(),
            'canConfirm' => $salesOrder->status === SalesOrder::STATUS_DRAFT,
            'canCancel' => in_array($salesOrder->status, [SalesOrder::STATUS_DRAFT, SalesOrder::STATUS_CONFIRMED])
                && $salesOrder->delivery_status === SalesOrder::DELIVERY_STATUS_PENDING,
            'canDeliver' => $salesOrder->status === SalesOrder::STATUS_CONFIRMED
                && $salesOrder->delivery_status !== SalesOrder::DELIVERY_STATUS_FULL
                && $salesOrder->assignment_status === SalesOrder::ASSIGNMENT_ACQUIRED
                && ($salesOrder->acquired_by === $authUser->id || $isCompanyOrAdmin)
                && $salesOrder->hasRemainingItemsToDeliver(),
            'canAssignGroup' => ($authUser->can('assign-group-sales-orders') || $authUser->can('reassign-sales-orders') || $authUser->can('edit-sales-orders') || $isCompanyOrAdmin),
            'canAcquire' => $salesOrder->delivery_status !== SalesOrder::DELIVERY_STATUS_FULL
                && $salesOrder->assignment_status !== SalesOrder::ASSIGNMENT_ACQUIRED
                && (
                    $isCompanyOrAdmin
                    || ($salesOrder->assignment_status === SalesOrder::ASSIGNMENT_GROUP_ASSIGNED && $isGroupMember)
                    || ($salesOrder->assignment_status === SalesOrder::ASSIGNMENT_UNASSIGNED)
                    || $authUser->can('acquire-sales-orders')
                ),
            'canRelease' => $authUser->can('release-sales-orders')
                && $salesOrder->assignment_status === SalesOrder::ASSIGNMENT_ACQUIRED
                && $salesOrder->delivery_status !== SalesOrder::DELIVERY_STATUS_FULL
                && ($salesOrder->acquired_by === $authUser->id || $authUser->can('reassign-sales-orders') || $isCompanyOrAdmin),
            'canReassign' => ($authUser->can('reassign-sales-orders') || $authUser->can('assign-group-sales-orders') || $isCompanyOrAdmin)
                && $salesOrder->status === SalesOrder::STATUS_CONFIRMED,
            'canConvertToInvoice' => !$salesOrder->is_invoiced
                && $salesOrder->status === SalesOrder::STATUS_CONFIRMED
                && in_array($salesOrder->delivery_status, [SalesOrder::DELIVERY_STATUS_PENDING, SalesOrder::DELIVERY_STATUS_FULL])
                && ($authUser->can('convert-sales-orders') || $authUser->can('create-sales-invoices')),
            'canEdit' => !$salesOrder->is_invoiced
                && $salesOrder->delivery_status === SalesOrder::DELIVERY_STATUS_PENDING
                && $salesOrder->status !== SalesOrder::STATUS_CANCELLED
                && $authUser->can('edit-sales-orders'),
        ]);
    }

    public function edit(SalesOrder $salesOrder)
    {
        if (!Auth::user()->can('edit-sales-orders')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccess($salesOrder)) {
            return back()->with('error', __('Access denied'));
        }
        if ($salesOrder->is_invoiced) {
            return back()->with('error', __('Cannot edit a Sales Order that has already been converted to an invoice.'));
        }
        if ($salesOrder->delivery_status !== SalesOrder::DELIVERY_STATUS_PENDING) {
            return back()->with('error', __('Cannot edit a Sales Order once deliveries have been created or completed.'));
        }
        if ($salesOrder->status === SalesOrder::STATUS_CANCELLED) {
            return back()->with('error', __('Cannot edit a cancelled Sales Order.'));
        }

        $salesOrder->load(['items.taxes', 'items.product', 'assignedUsers', 'assignedGroup']);
        $salesOrder->items->transform(function ($item) {
            $product = $item->product;
            if (!$product && $item->product_id && class_exists(ProductServiceItem::class)) {
                $product = ProductServiceItem::find($item->product_id);
            }

            $lineTotal = $item->quantity * $item->unit_price;
            $discountAmt = ($lineTotal * ($item->discount_percentage ?? 0)) / 100;
            $afterDiscount = $lineTotal - $discountAmt;
            $taxAmt = ($afterDiscount * ($item->tax_percentage ?? 0)) / 100;
            return [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $product?->name ?? null,
                'product' => $product,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'discount_percentage' => $item->discount_percentage ?? 0,
                'discount_amount' => $discountAmt,
                'tax_percentage' => $item->tax_percentage ?? 0,
                'tax_amount' => $taxAmt,
                'total_amount' => $afterDiscount + $taxAmt,
                'unit' => $item->unit,
                'description' => $item->description,
                'taxes' => $item->taxes->map(fn($t) => ['tax_name' => $t->tax_name, 'tax_rate' => $t->tax_rate])->toArray(),
            ];
        });

        $userGroups = UserGroup::where('created_by', creatorId())
            ->active()
            ->select('id', 'name')
            ->get();

        return Inertia::render('SalesOrder/SalesOrders/Edit', [
            'order' => $salesOrder,
            'customers' => $this->customerService->getCustomers(),
            'users' => $this->getWorkspaceUsers(),
            'userGroups' => $userGroups,
            'warehouses' => $this->getWarehouses(),
            'quotes' => $this->getQuotations($salesOrder->quotation_id),
            'settings' => SalesOrderSetting::getSettings(),
        ]);
    }

    public function update(UpdateSalesOrderRequest $request, SalesOrder $salesOrder)
    {
        if (!Auth::user()->can('edit-sales-orders')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccess($salesOrder)) {
            return redirect()->route('salesorder.orders.index')->with('error', __('Access denied'));
        }
        if ($salesOrder->is_invoiced) {
            return back()->with('error', __('Cannot edit a Sales Order that has already been converted to an invoice.'));
        }
        if ($salesOrder->delivery_status !== SalesOrder::DELIVERY_STATUS_PENDING) {
            return back()->with('error', __('Cannot edit a Sales Order once deliveries have been created or completed.'));
        }
        if ($salesOrder->status === SalesOrder::STATUS_CANCELLED) {
            return back()->with('error', __('Cannot edit a cancelled Sales Order.'));
        }

        $validated = $request->validated();

        DB::transaction(function () use ($validated, $salesOrder, $request) {
            $customerId = $this->resolveCustomer($validated, $request, $salesOrder->customer_id);
            $totals = $this->calculateTotals($validated['items']);

            $assignedGroupId = !empty($validated['assigned_group_id']) ? (int) $validated['assigned_group_id'] : null;

            $userUserIds = [];
            if (!empty($validated['assigned_user_ids'])) {
                $userUserIds = $this->validateWorkspaceUsers($validated['assigned_user_ids']);
            } elseif (!empty($validated['assign_user_id'])) {
                $userUserIds = $this->validateWorkspaceUsers([(int) $validated['assign_user_id']]);
            }

            if ($assignedGroupId) {
                $assignmentStatus = SalesOrder::ASSIGNMENT_GROUP_ASSIGNED;
                $userUserIds = [];
            } elseif (!empty($userUserIds)) {
                $assignmentStatus = SalesOrder::ASSIGNMENT_ACQUIRED;
                $assignedGroupId = null;
            } else {
                $assignmentStatus = SalesOrder::ASSIGNMENT_UNASSIGNED;
                $assignedGroupId = null;
            }

            $billingAddress = [
                'billing_address' => $validated['billing_address'] ?? null,
                'billing_city' => $validated['billing_city'] ?? null,
                'billing_state' => $validated['billing_state'] ?? null,
                'billing_country' => $validated['billing_country'] ?? null,
                'billing_postal_code' => $validated['billing_postal_code'] ?? null,
            ];

            $shippingAddress = [
                'shipping_address' => $validated['shipping_address'] ?? null,
                'shipping_city' => $validated['shipping_city'] ?? null,
                'shipping_state' => $validated['shipping_state'] ?? null,
                'shipping_country' => $validated['shipping_country'] ?? null,
                'shipping_postal_code' => $validated['shipping_postal_code'] ?? null,
            ];

            $status = $validated['status'] ?? $salesOrder->status;
            $confirmedAt = $salesOrder->confirmed_at;
            if ($status === SalesOrder::STATUS_CONFIRMED && !$confirmedAt) {
                $confirmedAt = now();
            } elseif ($status === SalesOrder::STATUS_DRAFT) {
                $confirmedAt = null;
            }

            $salesOrder->update([
                'name' => $validated['name'],
                'quotation_id' => $validated['quotation_id'] ?? null,
                'status' => $status,
                'confirmed_at' => $confirmedAt,
                'customer_id' => $customerId,
                'warehouse_id' => $validated['warehouse_id'] ?? null,
                'assigned_group_id' => $assignedGroupId,
                'assignment_status' => $assignmentStatus,
                'order_date' => $validated['order_date'],
                'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,
                'billing_address' => $billingAddress,
                'shipping_address' => $shippingAddress,
                'description' => $validated['description'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'discount_amount' => $totals['discount_amount'],
                'total_amount' => $totals['total_amount'],
            ]);

            $salesOrder->items()->delete();
            $this->createOrderItems($salesOrder->id, $validated['items']);

            $syncUserIds = [];
            if ($assignedGroupId) {
                $group = UserGroup::find($assignedGroupId);
                if ($group) {
                    $syncUserIds = $group->users()->pluck('users.id')->toArray();
                }
            } elseif (!empty($userUserIds)) {
                $syncUserIds = $userUserIds;
            }
            $salesOrder->assignedUsers()->sync($syncUserIds);

            UpdateSalesOrder::dispatch($request, $salesOrder);
        });

        return redirect()
            ->route('salesorder.orders.show', $salesOrder)
            ->with('success', __('The sales order has been updated successfully.'));
    }

    public function destroy(SalesOrder $salesOrder)
    {
        if (!Auth::user()->can('delete-sales-orders')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccess($salesOrder)) {
            return back()->with('error', __('Access denied'));
        }

        DestroySalesOrder::dispatch($salesOrder);

        DB::transaction(function () use ($salesOrder) {
            $salesOrder->load(['allDeliveries.items', 'items.taxes']);
            foreach ($salesOrder->allDeliveries as $delivery) {
                $delivery->items()->delete();
                $delivery->delete();
            }

            foreach ($salesOrder->items as $item) {
                $item->taxes()->delete();
                if (method_exists($item, 'deliveryItems')) {
                    $item->deliveryItems()->delete();
                }
                $item->delete();
            }

            $salesOrder->assignedUsers()->detach();

            if ($salesOrder->quotation_id && class_exists(SalesQuotation::class)) {
                SalesQuotation::where('id', $salesOrder->quotation_id)
                    ->orWhere('sales_order_id', $salesOrder->id)
                    ->update(['sales_order_id' => null]);
            }

            if (function_exists('deleteCustomFieldValues')) {
                deleteCustomFieldValues($salesOrder, 'Sales', 'Sales Orders');
            }

            $salesOrder->delete();
        });

        return redirect()->route('salesorder.orders.index')
            ->with('success', __('The sales order and all related items, taxes, and delivery challans have been deleted successfully.'));
    }

    public function confirm(SalesOrder $salesOrder)
    {
        if (!Auth::user()->can('edit-sales-orders')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccess($salesOrder)) {
            return back()->with('error', __('Access denied'));
        }
        if ($salesOrder->status !== SalesOrder::STATUS_DRAFT) {
            return back()->with('error', __('Only draft Sales Orders can be confirmed.'));
        }

        $salesOrder->update([
            'status' => SalesOrder::STATUS_CONFIRMED,
            'confirmed_at' => now(),
        ]);

        return back()->with('success', __('Sales Order confirmed successfully.'));
    }

    public function cancel(SalesOrder $salesOrder)
    {
        if (!Auth::user()->can('edit-sales-orders')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccess($salesOrder)) {
            return back()->with('error', __('Access denied'));
        }
        if ($salesOrder->status === SalesOrder::STATUS_CANCELLED) {
            return back()->with('error', __('This Sales Order is already cancelled.'));
        }
        if ($salesOrder->delivery_status !== SalesOrder::DELIVERY_STATUS_PENDING) {
            return back()->with('error', __('Cannot cancel a Sales Order once deliveries have been created or completed.'));
        }

        $salesOrder->update(['status' => SalesOrder::STATUS_CANCELLED]);

        return back()->with('success', __('Sales Order cancelled successfully.'));
    }

    public function assignGroup(Request $request, SalesOrder $salesOrder)
    {
        if (!Auth::user()->can('assign-group-sales-orders')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccess($salesOrder)) {
            return back()->with('error', __('Access denied'));
        }
        if ($salesOrder->status !== SalesOrder::STATUS_CONFIRMED) {
            return back()->with('error', __('Only confirmed Sales Orders can be group-assigned.'));
        }
        if ($salesOrder->assignment_status === SalesOrder::ASSIGNMENT_ACQUIRED) {
            return back()->with('error', __('Order is already acquired. Release it before reassigning to a group.'));
        }

        $request->validate([
            'assigned_group_id' => 'required|integer|exists:user_groups,id',
        ]);

        $group = UserGroup::where('id', $request->assigned_group_id)
            ->where('created_by', creatorId())
            ->where('is_active', true)
            ->first();

        if (!$group) {
            return back()->with('error', __('Invalid or inactive user group.'));
        }

        $groupUserIds = $group->users()->pluck('users.id')->toArray();
        $salesOrder->update([
            'assigned_group_id' => $group->id,
            'assignment_status' => SalesOrder::ASSIGNMENT_GROUP_ASSIGNED,
        ]);
        $salesOrder->assignedUsers()->sync($groupUserIds);

        return back()->with('success', __('Sales Order assigned to group ":group".', ['group' => $group->name]));
    }

    public function acquire(SalesOrder $salesOrder)
    {
        if (!Auth::user()->can('acquire-sales-orders')) {
            return back()->with('error', __('Permission denied'));
        }

        $user = Auth::user();

        try {
            DB::transaction(function () use ($salesOrder, $user) {
                $locked = SalesOrder::lockForUpdate()->findOrFail($salesOrder->id);

                if ($locked->created_by != creatorId()) {
                    throw new \InvalidArgumentException(__('Access denied'));
                }
                if ($locked->delivery_status === SalesOrder::DELIVERY_STATUS_FULL) {
                    throw new \InvalidArgumentException(__('Cannot acquire a Sales Order that is fully delivered.'));
                }
                if (!in_array($locked->assignment_status, [SalesOrder::ASSIGNMENT_GROUP_ASSIGNED, SalesOrder::ASSIGNMENT_UNASSIGNED])) {
                    throw new \InvalidArgumentException(__('This order is not available for acquisition.'));
                }
                if ($locked->status !== SalesOrder::STATUS_CONFIRMED) {
                    throw new \InvalidArgumentException(__('Only confirmed orders can be acquired.'));
                }

                if ($locked->assignment_status === SalesOrder::ASSIGNMENT_GROUP_ASSIGNED && !in_array($user->type, ['company', 'superadmin', 'admin'])) {
                    $isMember = UserGroup::where('id', $locked->assigned_group_id)
                        ->where('is_active', true)
                        ->whereHas('users', fn($q) => $q->where('users.id', $user->id))
                        ->exists();

                    if (!$isMember) {
                        throw new \InvalidArgumentException(__('You are not an active member of the assigned group.'));
                    }
                }

                $locked->update([
                    'assignment_status' => SalesOrder::ASSIGNMENT_ACQUIRED,
                    'acquired_by' => $user->id,
                    'acquired_at' => now(),
                ]);

                $locked->assignedUsers()->sync([$user->id]);
            });
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', __('You have acquired this Sales Order.'));
    }

    public function release(SalesOrder $salesOrder)
    {
        if (!Auth::user()->can('release-sales-orders')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccess($salesOrder)) {
            return back()->with('error', __('Access denied'));
        }
        if ($salesOrder->delivery_status === SalesOrder::DELIVERY_STATUS_FULL) {
            return back()->with('error', __('Cannot release a Sales Order that is fully delivered.'));
        }
        if ($salesOrder->assignment_status !== SalesOrder::ASSIGNMENT_ACQUIRED) {
            return back()->with('error', __('This order is not currently acquired.'));
        }

        $user = Auth::user();
        $isCompanyOrAdmin = in_array($user->type, ['company', 'superadmin', 'admin']) || $user->can('manage-any-sales-orders');
        if ($salesOrder->acquired_by !== $user->id && !$user->can('reassign-sales-orders') && !$isCompanyOrAdmin) {
            return back()->with('error', __('Only the acquirer or a manager can release this order.'));
        }

        $nextAssignmentStatus = $salesOrder->assigned_group_id
            ? SalesOrder::ASSIGNMENT_GROUP_ASSIGNED
            : SalesOrder::ASSIGNMENT_UNASSIGNED;

        $salesOrder->update([
            'assignment_status' => $nextAssignmentStatus,
            'acquired_by' => null,
            'acquired_at' => null,
        ]);

        return back()->with('success', __('Sales Order released back to the queue.'));
    }

    public function reassign(Request $request, SalesOrder $salesOrder)
    {
        if (!Auth::user()->can('reassign-sales-orders')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccess($salesOrder)) {
            return back()->with('error', __('Access denied'));
        }

        $assignmentCheck = $request->input('assignment_check', $request->has('assigned_group_id') && !empty($request->input('assigned_group_id')) ? 'group' : 'user');

        if ($assignmentCheck === 'group' || ($request->filled('assigned_group_id') && !$request->filled('assigned_user_id') && !$request->filled('assigned_user_ids'))) {
            $request->validate([
                'assigned_group_id' => 'required|integer|exists:user_groups,id',
            ]);

            $group = UserGroup::where('id', $request->assigned_group_id)
                ->where('created_by', creatorId())
                ->where('is_active', true)
                ->first();

            if (!$group) {
                return back()->with('error', __('Invalid or inactive user group.'));
            }

            $groupUserIds = $group->users()->pluck('users.id')->toArray();
            $salesOrder->update([
                'assigned_group_id' => $group->id,
                'assignment_status' => SalesOrder::ASSIGNMENT_GROUP_ASSIGNED,
                'acquired_by' => null,
                'acquired_at' => null,
            ]);
            $salesOrder->assignedUsers()->sync($groupUserIds);

            return back()->with('success', __('Sales Order reassigned to group ":group".', ['group' => $group->name]));
        } else {
            $userIds = $request->input('assigned_user_ids', []);
            if (empty($userIds) && $request->filled('assigned_user_id')) {
                $userIds = [(int) $request->input('assigned_user_id')];
            }

            if (empty($userIds)) {
                return back()->with('error', __('Please select at least one user to reassign.'));
            }

            $validIds = $this->validateWorkspaceUsers($userIds);
            if (empty($validIds)) {
                return back()->with('error', __('Selected user(s) are invalid or not in your workspace.'));
            }

            $acquiredBy = count($validIds) === 1 ? $validIds[0] : null;

            $salesOrder->update([
                'assigned_group_id' => null,
                'assignment_status' => $acquiredBy ? SalesOrder::ASSIGNMENT_ACQUIRED : SalesOrder::ASSIGNMENT_GROUP_ASSIGNED,
                'acquired_by' => $acquiredBy,
                'acquired_at' => $acquiredBy ? now() : null,
            ]);
            $salesOrder->assignedUsers()->sync($validIds);

            return back()->with('success', __('Sales Order reassigned successfully.'));
        }
    }

    public function duplicate(SalesOrder $salesOrder)
    {
        if (!Auth::user()->can('create-sales-orders')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccess($salesOrder)) {
            return back()->with('error', __('Access denied'));
        }

        DB::transaction(function () use ($salesOrder) {
            $newOrder = $salesOrder->replicate();
            $newOrder->order_number = null;
            $newOrder->status = SalesOrder::STATUS_DRAFT;
            $newOrder->delivery_status = SalesOrder::DELIVERY_STATUS_PENDING;
            $newOrder->confirmed_at = null;
            $newOrder->is_invoiced = false;
            $newOrder->invoice_id = null;
            $newOrder->assigned_group_id = null;
            $newOrder->assignment_status = SalesOrder::ASSIGNMENT_UNASSIGNED;
            $newOrder->acquired_by = null;
            $newOrder->acquired_at = null;
            $newOrder->creator_id = Auth::id();
            $newOrder->created_by = creatorId();
            $newOrder->save();

            foreach ($salesOrder->items as $item) {
                $newItem = $item->replicate();
                $newItem->order_id = $newOrder->id;
                $newItem->save();
                foreach ($item->taxes as $tax) {
                    $newTax = $tax->replicate();
                    $newTax->item_id = $newItem->id;
                    $newTax->save();
                }
            }
        });

        return back()->with('success', __('Sales Order duplicated successfully.'));
    }

    public function print(SalesOrder $salesOrder)
    {
        if (!Auth::user()->can('print-sales-orders')) {
            return back()->with('error', __('Permission denied'));
        }
        if (!$this->canAccess($salesOrder)) {
            return back()->with('error', __('Access denied'));
        }

        $salesOrder->load(['customer', 'warehouse', 'assignedUsers', 'items.taxes', 'items.product']);
        $settings = SalesOrderSetting::getSettings();

        if (request()->has('blade')) {
            return view('salesorder::print_salesorder', [
                'salesOrder' => $salesOrder,
                'order' => $salesOrder,
                'salesOrderSetting' => $settings,
            ]);
        }

        return view('salesorder::print_salesorder', [
            'salesOrder' => $salesOrder,
            'settings' => $settings,
            'autoPrint' => false,
        ]);
    }

    public function convertFromQuotation(Request $request, CustomerService $customerService)
    {
        if (!Auth::user()->can('convert-quotation-to-sales-order')) {
            return back()->with('error', __('Permission denied'));
        }
        $request->validate(['quotation_id' => 'required|integer']);

        if (!module_is_active('Quotation')) {
            return back()->with('error', __('Quotation module is not active.'));
        }

        $quotation = SalesQuotation::where('created_by', creatorId())
            ->findOrFail($request->quotation_id);

        if ($quotation->sales_order_id) {
            return back()->with('error', __('This quotation has already been converted to a Sales Order.'));
        }


        try {
            $salesOrder = DB::transaction(function () use ($quotation, $request, $customerService) {
                if ($request->input('customer_type') === 'new' && $request->filled('customer_name')) {
                    $customer = $customerService->createCustomer([
                        'customer_name' => $request->input('customer_name') ?? $quotation->customer_name,
                        'customer_email' => $request->input('customer_email') ?? $quotation->customer_email,
                        'customer_phone' => $request->input('customer_phone') ?? $quotation->customer_phone,
                        'address' => $request->input('customer_address') ?? $quotation->address,
                        'city' => $request->input('customer_city'),
                        'state' => $request->input('customer_state'),
                        'zip_code' => $request->input('customer_zip_code'),
                        'country' => $request->input('customer_country'),
                    ]);
                } elseif ($request->input('customer_type') === 'existing' && $request->filled('customer_id')) {
                    $customer = Customer::where('created_by', creatorId())
                        ->where('user_id', $request->input('customer_id'))->first();
                    if (!$customer) {
                        throw new \Exception(__('Customer not found.'));
                    }
                } else {
                    throw new \Exception(__('Please select a customer or create a new one.'));
                }

                $items = $quotation->items()->with('taxes')->get();
                $totals = $this->calculateTotals($items->map(fn($i) => [
                    'quantity' => $i->quantity,
                    'unit_price' => $i->unit_price,
                    'discount_percentage' => $i->discount_percentage ?? 0,
                    'tax_percentage' => $i->tax_percentage ?? 0,
                    'taxes' => $i->taxes->map(fn($t) => ['tax_name' => $t->tax_name, 'tax_rate' => $t->tax_rate])->toArray(),
                ])->toArray());

                $assignedGroupId = null;
                $assignmentStatus = SalesOrder::ASSIGNMENT_UNASSIGNED;
                if ($request->filled('assigned_group_id')) {
                    $assignedGroupId = (int) $request->input('assigned_group_id');
                    $assignmentStatus = SalesOrder::ASSIGNMENT_GROUP_ASSIGNED;
                }

                $salesOrder = SalesOrder::create([
                    'name' => $quotation->subject ?: ($quotation->quotation_number ?? 'From Quotation'),
                    'quotation_id' => $quotation->id,
                    'status' => SalesOrder::STATUS_CONFIRMED,
                    'delivery_status' => SalesOrder::DELIVERY_STATUS_PENDING,
                    'assignment_status' => $assignmentStatus,
                    'assigned_group_id' => $assignedGroupId,
                    'customer_id' => $customer->user_id ?? $quotation->customer->user_id ?? null,
                    'warehouse_id' => $quotation->warehouse_id,
                    'order_date' => now()->toDateString(),
                    'billing_address' => $customer->billing_address ?? null,
                    'shipping_address' => $customer->shipping_address ?? null,
                    'notes' => $quotation->notes ?? null,
                    'subtotal' => $totals['subtotal'],
                    'tax_amount' => $totals['tax_amount'],
                    'discount_amount' => $totals['discount_amount'],
                    'total_amount' => $totals['total_amount'],
                    'creator_id' => Auth::id(),
                    'created_by' => creatorId(),
                ]);

                foreach ($items as $item) {
                    $newItem = SalesOrderItem::create([
                        'order_id' => $salesOrder->id,
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'discount_percentage' => $item->discount_percentage ?? 0,
                        'tax_percentage' => $item->tax_percentage ?? 0,
                        'unit' => $item->unit ?? null,
                        'description' => $item->description ?? null,
                        'creator_id' => Auth::id(),
                        'created_by' => creatorId(),
                    ]);
                    foreach ($item->taxes as $tax) {
                        SalesOrderItemTax::create([
                            'item_id' => $newItem->id,
                            'tax_name' => $tax->tax_name,
                            'tax_rate' => $tax->tax_rate,
                        ]);
                    }
                }

                // Sync user assignments or group members
                if (!empty($assignedGroupId)) {
                    $group = UserGroup::find($assignedGroupId);
                    if ($group) {
                        $groupUserIds = $group->users()->pluck('users.id')->toArray();
                        $salesOrder->assignedUsers()->sync($groupUserIds);
                    }
                } elseif ($request->has('assigned_user_ids') && is_array($request->input('assigned_user_ids'))) {
                    $validIds = $this->validateWorkspaceUsers($request->input('assigned_user_ids'));
                    $salesOrder->assignedUsers()->sync($validIds);
                } elseif ($request->filled('assigned_user_id')) {
                    $validIds = $this->validateWorkspaceUsers([(int) $request->input('assigned_user_id')]);
                    $salesOrder->assignedUsers()->sync($validIds);
                }

                $quotation->update(['sales_order_id' => $salesOrder->id]);

                return $salesOrder;
            });

            return redirect()
                ->route('salesorder.orders.show', $salesOrder->id)
                ->with('success', __('Quotation converted to Sales Order successfully.'));
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function convertToSalesInvoice(Request $request, SalesOrder $salesOrder)
    {
        if (!Auth::user()->can('convert-sales-orders') && !Auth::user()->can('create-sales-invoices')) {
            return back()->with('error', __('Permission denied'));
        }

        if ($salesOrder->is_invoiced) {
            return back()->with('error', __('This Sales Order has already been converted to an invoice.'));
        }

        if ($salesOrder->delivery_status === SalesOrder::DELIVERY_STATUS_PARTIAL) {
            return back()->with('error', __('Cannot convert to invoice while delivery is partially in progress. Please complete all deliveries or convert before starting delivery.'));
        }

        if (!class_exists(SalesInvoice::class)) {
            return back()->with('error', __('Sales Invoice module is not available.'));
        }

        $warehouseId = $salesOrder->warehouse_id;
        $salesOrder->load([
            'customer',
            'warehouse',
            'items.taxes',
            'items.product' => function ($pq) use ($warehouseId) {
                if ($warehouseId) {
                    $pq->with(['warehouseStocks' => fn($sq) => $sq->where('warehouse_id', $warehouseId)]);
                } else {
                    $pq->with('warehouseStocks');
                }
            }
        ]);

        // Optional customized quantities per item from modal: items => [ [id => 12, quantity => 5], ... ]
        $customQuantities = [];
        if ($request->has('items') && is_array($request->input('items'))) {
            foreach ($request->input('items') as $reqItem) {
                if (isset($reqItem['id']) && isset($reqItem['quantity'])) {
                    $customQuantities[$reqItem['id']] = max(1, (float) $reqItem['quantity']);
                }
            }
        }

        // Validate stock availability for products (services excluded)
        $insufficientItems = [];
        foreach ($salesOrder->items as $item) {
            $qtyToInvoice = isset($customQuantities[$item->id]) ? $customQuantities[$item->id] : (float) $item->quantity;
            $product = $item->product;
            if (!$product || ($product->type ?? 'product') === 'service') {
                continue;
            }
            $availableStock = $warehouseId
                ? (float) ($product->warehouseStocks->first()?->quantity ?? 0)
                : (float) $product->warehouseStocks->sum('quantity');

            if ($availableStock < $qtyToInvoice) {
                $insufficientItems[] = [
                    'name' => $product->name ?? $item->description ?? 'Item #' . $item->id,
                    'required' => $qtyToInvoice,
                    'available' => $availableStock,
                ];
            }
        }

        if (!empty($insufficientItems)) {
            $msgDetails = collect($insufficientItems)->map(function ($i) {
                return "{$i['name']} (Required: {$i['required']}, Stock: {$i['available']})";
            })->join(', ');
            return back()->with('error', __('Cannot convert to invoice. Insufficient stock: ') . $msgDetails);
        }

        try {
            $invoice = DB::transaction(function () use ($salesOrder, $customQuantities) {
                $customer = $salesOrder->customer;

                $invoice = new SalesInvoice();
                $invoice->invoice_date = now()->toDateString();
                $invoice->due_date = $salesOrder->expected_delivery_date
                    ? $salesOrder->expected_delivery_date->toDateString()
                    : now()->addDays(30)->toDateString();
                $invoice->customer_id = $salesOrder->customer_id;
                $invoice->customer_name = $customer->customer_name ?? null;
                $invoice->customer_email = $customer->customer_email ?? null;
                $invoice->customer_phone = $customer->customer_phone ?? null;
                $billingAddress = $salesOrder->billing_address;
                if (is_array($billingAddress)) {
                    $invoice->customer_address = $billingAddress['address'] ?? ($billingAddress['billing_address'] ?? json_encode($billingAddress));
                } else {
                    $invoice->customer_address = $billingAddress ?? (is_array($customer->billing_address ?? null) ? json_encode($customer->billing_address) : ($customer->billing_address ?? null));
                }
                $invoice->warehouse_id = $salesOrder->warehouse_id ?: null;
                $invoice->type = 'product';
                $invoice->notes = $salesOrder->notes;
                $invoice->subtotal = 0;
                $invoice->tax_amount = 0;
                $invoice->discount_amount = 0;
                $invoice->discount_type = 'percentage';
                $invoice->total_amount = 0;
                $invoice->paid_amount = 0;
                $invoice->balance_amount = 0;
                $invoice->status = 'draft';
                $invoice->creator_id = Auth::id() ?: ($salesOrder->creator_id ?: creatorId());
                $invoice->created_by = creatorId();
                $invoice->save();

                $calculatedSubtotal = 0;
                $calculatedDiscount = 0;
                $calculatedTax = 0;

                foreach ($salesOrder->items as $item) {
                    $qty = isset($customQuantities[$item->id]) ? $customQuantities[$item->id] : (float) $item->quantity;

                    $invoiceItem = new SalesInvoiceItem();
                    $invoiceItem->invoice_id = $invoice->id;
                    $invoiceItem->product_id = $item->product_id;
                    $invoiceItem->description = $item->description;
                    $invoiceItem->product_type = $item->product_type ?? ($item->product?->type ?? 'product');
                    $invoiceItem->quantity = $qty;
                    $invoiceItem->unit_price = $item->unit_price;
                    $invoiceItem->discount_type = $item->discount_type ?? 'percentage';
                    $invoiceItem->discount_percentage = $item->discount_percentage ?? 0;
                    $invoiceItem->discount_amount = $item->discount_amount ?? 0;
                    $invoiceItem->tax_percentage = $item->tax_percentage ?? 0;
                    $invoiceItem->tax_amount = $item->tax_amount ?? 0;
                    $invoiceItem->creator_id = $invoice->creator_id;
                    $invoiceItem->created_by = $invoice->created_by;

                    $lineSubtotal = ($qty * $item->unit_price);
                    $lineDiscount = ($lineSubtotal * ($item->discount_percentage ?? 0)) / 100;
                    $lineAfterDiscount = $lineSubtotal - $lineDiscount;
                    $lineTax = ($lineAfterDiscount * ($item->tax_percentage ?? 0)) / 100;
                    $lineTotal = max(0, $lineAfterDiscount + $lineTax);

                    $invoiceItem->total_amount = $lineTotal;
                    $invoiceItem->save();

                    $calculatedSubtotal += $lineSubtotal;
                    $calculatedDiscount += $lineDiscount;
                    $calculatedTax += $lineTax;

                    if (!empty($item->taxes)) {
                        foreach ($item->taxes as $tax) {
                            $invoiceTax = new SalesInvoiceItemTax();
                            $invoiceTax->item_id = $invoiceItem->id;
                            $invoiceTax->tax_name = $tax->tax_name;
                            $invoiceTax->tax_rate = $tax->tax_rate ?? 0;
                            $invoiceTax->save();
                        }
                    }
                }

                $finalTotal = max(0, $calculatedSubtotal - $calculatedDiscount + $calculatedTax);
                $invoice->update([
                    'subtotal' => $calculatedSubtotal,
                    'discount_amount' => $calculatedDiscount,
                    'tax_amount' => $calculatedTax,
                    'total_amount' => $finalTotal,
                    'balance_amount' => $finalTotal,
                ]);

                $salesOrder->update([
                    'is_invoiced' => true,
                    'invoice_id' => $invoice->id,
                ]);

                return $invoice;
            });

            if (\Route::has('sales-invoices.show') && Auth::user()->can('view-sales-invoices')) {
                return redirect()->route('sales-invoices.show', $invoice->id)
                    ->with('success', __('Sales Order converted to invoice successfully.'));
            }

            return back()->with('success', __('Sales Order converted to invoice successfully.'));
        } catch (\Throwable $th) {
            \Log::error('Sales Order convertToSalesInvoice error: ' . $th->getMessage(), [
                'sales_order_id' => $salesOrder->id,
                'exception' => $th,
            ]);
            return back()->with('error', __('Failed to convert Sales Order to invoice: ') . $th->getMessage());
        }
    }

    // ─── AJAX Helpers ────────────────────────────────────────────────────────

    public function getCustomerDetails(int $customerId)
    {
        if (!Auth::user()->can('create-sales-orders') && !Auth::user()->can('edit-sales-orders')) {
            return response()->json(['error' => 'Permission denied'], 403);
        }

        $customer = Customer::where('id', $customerId)
            ->where(fn($q) => $q->where('created_by', creatorId())->orWhere('id', $customerId))
            ->first();

        if (!$customer) {
            return response()->json(['error' => 'Customer not found'], 404);
        }

        return response()->json([
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->customer_name,
                'email' => $customer->customer_email,
                'mobile_no' => $customer->customer_phone,
                'billing_address' => $customer->billing_address ?? null,
                'shipping_address' => $customer->shipping_address ?? $customer->billing_address ?? null,
            ],
        ]);
    }

    public function getWarehouseProducts(Request $request)
    {
        if (!Auth::user()->can('create-sales-orders') && !Auth::user()->can('edit-sales-orders')) {
            return response()->json([], 403);
        }

        $warehouseId = $request->warehouse_id ? (int) $request->warehouse_id : null;

        if (class_exists(WarehouseService::class)) {
            $products = app(WarehouseService::class)->getWarehouseProducts($warehouseId);
            return response()->json($products);
        }

        if (!class_exists(ProductServiceItem::class)) {
            return response()->json([]);
        }

        $query = ProductServiceItem::with('unitRelation:id,unit_name')
            ->where('is_active', true)
            ->where('created_by', creatorId());

        if ($warehouseId) {
            $query->where(function ($q) use ($warehouseId) {
                $q->where('type', 'service')
                    ->orWhereHas('warehouseStocks', fn($sub) => $sub->where('warehouse_id', $warehouseId));
            })->with([
                        'warehouseStocks' => fn($sub) => $sub->where('warehouse_id', $warehouseId),
                    ]);
        }

        $products = $query->get();

        return response()->json(
            $products->map(function ($p) {
                $stockQuantity = $p->relationLoaded('warehouseStocks') && $p->warehouseStocks->isNotEmpty()
                    ? $p->warehouseStocks->first()->quantity
                    : 0;

                $unitName = $p->unitRelation?->unit_name
                    ?? (is_numeric($p->unit) ? '' : ($p->unit ?? ''));

                $itemTaxes = $p->taxes ? $p->taxes->map(fn($t) => [
                    'id' => $t->id,
                    'tax_name' => $t->tax_name ?? $t->name ?? 'Tax',
                    'tax_rate' => (float) ($t->rate ?? $t->tax_rate ?? 0),
                    'rate' => (float) ($t->rate ?? $t->tax_rate ?? 0),
                ])->values()->toArray() : [];

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'sku' => $p->sku ?? '',
                    'description' => $p->description ?? '',
                    'long_description' => $p->long_description ?? '',
                    'sale_price' => (float) ($p->sale_price ?? 0),
                    'unit' => $p->unit ?? '',
                    'unit_name' => $unitName,
                    'type' => $p->type ?? 'product',
                    'stock_quantity' => $stockQuantity,
                    'taxes' => $itemTaxes,
                ];
            })
        );
    }


    // ─── Private Helpers ─────────────────────────────────────────────────────

    private function resolveCustomer(array $validated, Request $request, ?int $defaultCustomerId = null): ?int
    {
        $customerType = $validated['customer_type'] ?? 'existing';

        if ($customerType === 'new') {
            $customerService = app(CustomerService::class);
            $customer = $customerService->createCustomer([
                'customer_name' => $validated['customer_name'] ?? null,
                'customer_email' => $validated['customer_email'] ?? null,
                'customer_phone' => $validated['customer_phone'] ?? null,
                'billing_address' => [
                    'address_line_1' => $validated['billing_address'] ?? null,
                    'city' => $validated['billing_city'] ?? null,
                    'state' => $validated['billing_state'] ?? null,
                    'country' => $validated['billing_country'] ?? null,
                    'zip_code' => $validated['billing_postal_code'] ?? null,
                ],
                'shipping_address' => [
                    'address_line_1' => $validated['shipping_address'] ?? null,
                    'city' => $validated['shipping_city'] ?? null,
                    'state' => $validated['shipping_state'] ?? null,
                    'country' => $validated['shipping_country'] ?? null,
                    'zip_code' => $validated['shipping_postal_code'] ?? null,
                ],
            ]);

            return $customer->id;
        }

        return !empty($validated['customer_id']) ? (int) $validated['customer_id'] : $defaultCustomerId;
    }

    private function canAccess(SalesOrder $salesOrder): bool
    {
        $user = Auth::user();
        if ($user->can('manage-any-sales-orders')) {
            return $salesOrder->created_by == creatorId();
        }
        if ($user->can('manage-own-sales-orders')) {
            return $salesOrder->created_by == creatorId()
                && ($salesOrder->creator_id == $user->id
                    || $salesOrder->assignedUsers()->where('users.id', $user->id)->exists());
        }
        return false;
    }

    private function getWorkspaceUsers(): \Illuminate\Database\Eloquent\Collection
    {
        return User::emp()
            ->where('created_by', creatorId())
            ->select('id', 'name')
            ->get();
    }

    private function getWarehouses(): \Illuminate\Database\Eloquent\Collection
    {
        return Warehouse::where('is_active', true)
            ->where('created_by', creatorId())
            ->select('id', 'name', 'address')
            ->get();
    }

    private function getQuotations(?int $currentQuotationId = null): array
    {
        if (!class_exists(SalesQuotation::class)) {
            return [];
        }

        $query = SalesQuotation::where('created_by', creatorId());

        if ($currentQuotationId) {
            $query->where(function ($q) use ($currentQuotationId) {
                $q->where(function ($sub) {
                    $sub->where('status', 'accepted')
                        ->whereNull('sales_order_id');
                })->orWhere('id', $currentQuotationId);
            });
        } else {
            $query->where('status', 'accepted')
                ->whereNull('sales_order_id');
        }

        return $query->select('id', 'quotation_number', 'subject', 'customer_id', 'warehouse_id', 'notes')
            ->get()
            ->map(fn($q) => [
                'id' => $q->id,
                'name' => $q->subject,
                'quotation_number' => $q->quotation_number,
                'customer_id' => $q->customer_id,
                'warehouse_id' => $q->warehouse_id,
                'notes' => $q->notes,
            ])
            ->toArray();
    }

    public function getQuotationDetails($quotationId)
    {
        if (!class_exists(SalesQuotation::class)) {
            return response()->json(['error' => __('Quotation module not available')], 404);
        }

        $q = SalesQuotation::with(['items.taxes', 'customer', 'items.product'])
            ->where('created_by', creatorId())
            ->find($quotationId);

        if (!$q) {
            return response()->json(['error' => __('Quotation not found')], 404);
        }

        $descriptionHtml = $q->notes ?? '';

        $items = $q->items->map(function ($item) {
            $product = $item->product;
            if (!$product && $item->product_id && class_exists(\Automas\ProductService\Models\ProductServiceItem::class)) {
                $product = \Automas\ProductService\Models\ProductServiceItem::find($item->product_id);
            }

            $lineTotal = $item->quantity * $item->unit_price;
            $discountAmt = ($lineTotal * ($item->discount_percentage ?? 0)) / 100;
            $afterDiscount = $lineTotal - $discountAmt;
            $taxAmt = ($afterDiscount * ($item->tax_percentage ?? 0)) / 100;

            return [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $product?->name ?? null,
                'product' => $product,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'discount_percentage' => (float) ($item->discount_percentage ?? 0),
                'discount_amount' => (float) $discountAmt,
                'tax_percentage' => (float) ($item->tax_percentage ?? 0),
                'tax_amount' => (float) $taxAmt,
                'total_amount' => (float) ($afterDiscount + $taxAmt),
                'unit' => $item->unit ?? 'pcs',
                'description' => $item->description ?? $item->product_description ?? $product?->description ?? '',
                'taxes' => $item->taxes->map(fn($t) => ['tax_name' => $t->tax_name, 'tax_rate' => (float) $t->tax_rate])->toArray(),
            ];
        })->toArray();

        return response()->json([
            'id' => $q->id,
            'quotation_number' => $q->quotation_number,
            'subject' => $q->subject,
            'customer_id' => $q->customer_id,
            'customer' => $q->customer,
            'customer_name' => $q->customer_name,
            'customer_email' => $q->customer_email,
            'customer_phone' => $q->customer_phone,
            'customer_address' => $q->customer_address,
            'warehouse_id' => $q->warehouse_id,
            'description' => $descriptionHtml,
            'notes' => $q->notes,
            'items' => $items,
        ]);
    }

    private function validateWorkspaceUsers(array $userIds): array
    {
        return User::whereIn('id', $userIds)
            ->where('created_by', creatorId())
            ->pluck('id')
            ->toArray();
    }

    private function calculateTotals(array $items): array
    {
        $subtotal = 0;
        $totalTax = 0;
        $totalDiscount = 0;

        foreach ($items as $item) {
            $lineTotal = ($item['quantity'] ?? 0) * ($item['unit_price'] ?? 0);
            $discountAmt = ($lineTotal * ($item['discount_percentage'] ?? 0)) / 100;
            $afterDiscount = $lineTotal - $discountAmt;
            $taxAmt = ($afterDiscount * ($item['tax_percentage'] ?? 0)) / 100;

            $subtotal += $lineTotal;
            $totalDiscount += $discountAmt;
            $totalTax += $taxAmt;
        }

        return [
            'subtotal' => $subtotal,
            'tax_amount' => $totalTax,
            'discount_amount' => $totalDiscount,
            'total_amount' => $subtotal + $totalTax - $totalDiscount,
        ];
    }

    private function createOrderItems(int $orderId, array $items): void
    {
        foreach ($items as $itemData) {
            if (empty($itemData['product_id']) && empty($itemData['quantity'])) {
                continue;
            }

            $taxPct = (float) ($itemData['tax_percentage'] ?? 0);

            $item = SalesOrderItem::create([
                'order_id' => $orderId,
                'product_id' => $itemData['product_id'] ?? null,
                'quantity' => $itemData['quantity'],
                'unit_price' => $itemData['unit_price'],
                'discount_percentage' => $itemData['discount_percentage'] ?? 0,
                'tax_percentage' => $taxPct,
                'unit' => $itemData['unit'] ?? null,
                'description' => $itemData['description'] ?? null,
                'creator_id' => Auth::id(),
                'created_by' => creatorId(),
            ]);

            if (!empty($itemData['taxes']) && is_array($itemData['taxes'])) {
                foreach ($itemData['taxes'] as $tax) {
                    SalesOrderItemTax::create([
                        'item_id' => $item->id,
                        'tax_name' => $tax['tax_name'] ?? $tax['name'] ?? 'Tax',
                        'tax_rate' => (float) ($tax['tax_rate'] ?? $tax['rate'] ?? 0),
                    ]);
                }
            } elseif ($taxPct > 0) {
                SalesOrderItemTax::create([
                    'item_id' => $item->id,
                    'tax_name' => 'Tax',
                    'tax_rate' => $taxPct,
                ]);
            }
        }
    }

    private function getQuoteData(?int $quoteId): ?array
    {
        if (!$quoteId || !class_exists(SalesQuotation::class)) {
            return null;
        }
        $q = SalesQuotation::with(['items.taxes', 'customer', 'contents'])
            ->where('created_by', creatorId())
            ->find($quoteId);
        if (!$q)
            return null;

        $descriptionHtml = '';
        if ($q->contents && $q->contents->count() > 0) {
            $descriptionHtml = $q->contents->map(function ($c) {
                $part = '';
                if ($c->title) {
                    $part .= '<h3>' . e($c->title) . '</h3>';
                }
                if ($c->content) {
                    $part .= $c->content;
                }
                return $part;
            })->filter()->join('<br/>');
        }
        if (empty($descriptionHtml)) {
            $descriptionHtml = $q->notes ?? '';
        }

        return [
            'id' => $q->id,
            'quotation_number' => $q->quotation_number,
            'subject' => $q->subject,
            'customer_id' => $q->customer_id,
            'warehouse_id' => $q->warehouse_id,
            'description' => $descriptionHtml,
            'notes' => $q->notes,
            'items' => $q->items->map(function ($i) {
                $lineTotal = ($i->quantity ?? 0) * ($i->unit_price ?? 0);
                $discountAmt = ($lineTotal * ($i->discount_percentage ?? 0)) / 100;
                $afterDiscount = $lineTotal - $discountAmt;
                $taxAmt = ($afterDiscount * ($i->tax_percentage ?? 0)) / 100;

                return [
                    'product_id' => $i->product_id,
                    'quantity' => (int) $i->quantity,
                    'unit_price' => (float) $i->unit_price,
                    'discount_percentage' => (float) ($i->discount_percentage ?? 0),
                    'discount_amount' => (float) $discountAmt,
                    'tax_percentage' => (float) ($i->tax_percentage ?? 0),
                    'tax_amount' => (float) $taxAmt,
                    'total_amount' => (float) ($afterDiscount + $taxAmt),
                    'unit' => $i->unit ?? 'pcs',
                    'description' => $i->description ?? $i->product_description ?? $i->product?->description ?? '',
                    'taxes' => $i->taxes->map(fn($t) => ['tax_name' => $t->tax_name, 'tax_rate' => (float) $t->tax_rate])->toArray(),
                ];
            })->toArray(),
        ];
    }
}

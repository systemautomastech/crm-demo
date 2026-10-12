<?php

namespace Automas\SalesOrder\Http\Controllers;

use App\Http\Controllers\Controller;
use Automas\SalesOrder\Models\SalesOrder;
use Automas\SalesOrder\Models\SalesOrderDelivery;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SalesOrderDashboardController extends Controller
{
    /**
     * Main Dashboard Router
     * Checks permissions and directs users to either Company or User Dashboard
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        abort_unless(
            $user->can('manage-sales-orders') ||
                $user->can('view-sales-orders') ||
                $user->can('manage-sales-order-dashboard') ||
                $user->can('manage-own-sales-orders') ||
                $user->can('manage-any-sales-orders') ||
                in_array($user->type, ['company', 'superadmin', 'admin']),
            403,
            'You do not have permission to view Sales Order Dashboard.'
        );

        if ($user->type != 'company' || $request->get('view') === 'user') {
            return $this->userDashboard($request);
        }

        return $this->companyDashboard($request);
    }

    /**
     * Dedicated Company Dashboard
     * Displays macro-level metrics, delivery charts, and global schedules
     */
    public function companyDashboard(Request $request)
    {
        $user = Auth::user();

        abort_unless(
            $user->can('manage-sales-orders') ||
                $user->can('view-sales-orders') ||
                $user->can('manage-sales-order-dashboard') ||
                $user->can('manage-any-sales-orders') ||
                in_array($user->type, ['company', 'superadmin', 'admin']),
            403,
            'You do not have permission to view Company Sales Order Dashboard.'
        );

        $creatorId = creatorId();
        [$start, $end] = $this->getDateRange($request);

        // ── 1. Stat Summaries ──────────────────────────────────────────────
        $baseSoQuery = SalesOrder::accessible();

        // Total Sales Orders
        $totalSoCount = (clone $baseSoQuery)->count();
        $totalSoValue = (float) ((clone $baseSoQuery)->sum('total_amount') ?? 0);

        // Period Filtered Sales Orders
        $thisMonthSoCount = (clone $baseSoQuery)
            ->whereBetween('order_date', [$start, $end])
            ->count();
        $thisMonthSoValue = (float) ((clone $baseSoQuery)
            ->whereBetween('order_date', [$start, $end])
            ->sum('total_amount') ?? 0);

        if ($thisMonthSoCount == 0 && !$request->has('period')) {
            $thisMonthSoCount = $totalSoCount;
            $thisMonthSoValue = $totalSoValue;
        }

        // Pending Sales Orders
        $pendingSoCount = (clone $baseSoQuery)
            ->where('delivery_status', SalesOrder::DELIVERY_STATUS_PENDING)
            ->where('status', '!=', SalesOrder::STATUS_CANCELLED)
            ->count();
        $pendingSoValue = (float) ((clone $baseSoQuery)
            ->where('delivery_status', SalesOrder::DELIVERY_STATUS_PENDING)
            ->where('status', '!=', SalesOrder::STATUS_CANCELLED)
            ->sum('total_amount') ?? 0);

        // Partially Delivered Sales Orders
        $partialSoCount = (clone $baseSoQuery)
            ->where('delivery_status', SalesOrder::DELIVERY_STATUS_PARTIAL)
            ->count();
        $partialSoValue = (float) ((clone $baseSoQuery)
            ->where('delivery_status', SalesOrder::DELIVERY_STATUS_PARTIAL)
            ->sum('total_amount') ?? 0);

        // ── 2. Delivery Challan Chart Data (Last 15 Days Trend) ─────────────
        $challanChartData = [];
        for ($i = 14; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->format('Y-m-d');
            $dateLabel = Carbon::now()->subDays($i)->format('M d');

            $totalDeliveries = SalesOrderDelivery::where('created_by', $creatorId)
                ->whereDate('delivery_date', $date)
                ->count();

            $completedDeliveries = SalesOrderDelivery::where('created_by', $creatorId)
                ->whereDate('delivery_date', $date)
                ->where('status', SalesOrderDelivery::STATUS_DELIVERED)
                ->count();

            $challanChartData[] = [
                'date' => $dateLabel,
                'full_date' => $date,
                'total' => $totalDeliveries,
                'delivered' => $completedDeliveries,
            ];
        }

        // ── 3. Last 5 Sales Orders ─────────────────────────────────────────
        $last5SO = SalesOrder::accessible()
            ->with(['customer:id,customer_name', 'warehouse:id,name'])
            ->latest('order_date')
            ->latest('id')
            ->limit(5)
            ->get()
            ->map(function ($so) {
                return [
                    'id' => $so->id,
                    'order_number' => $so->order_number,
                    'customer_name' => $so->customer?->customer_name ?? ($so->customer?->name ?? ''),
                    'warehouse_name' => $so->warehouse?->name ?? '',
                    'order_date' => $so->order_date ? $so->order_date->format('M d, Y') : '',
                    'expected_delivery_date' => $so->expected_delivery_date ? $so->expected_delivery_date->format('M d, Y') : '',
                    'status' => $so->status,
                    'delivery_status' => $so->delivery_status,
                    'total_amount' => (float) $so->total_amount,
                ];
            });

        // ── 4. Last 5 Delivery Challans ──────────────────────────────────
        $last5DC = SalesOrderDelivery::where('created_by', $creatorId)
            ->with(['salesOrder:id,order_number,customer_id,warehouse_id', 'salesOrder.customer:id,customer_name', 'salesOrder.warehouse:id,name'])
            ->latest('delivery_date')
            ->latest('id')
            ->limit(5)
            ->get()
            ->map(function ($dc) {
                return [
                    'id' => $dc->id,
                    'challan_number' => $dc->delivery_number,
                    'sales_order_number' => $dc->salesOrder?->order_number ?? '',
                    'customer_name' => $dc->salesOrder?->customer?->customer_name ?? ($dc->salesOrder?->customer?->name ?? ''),
                    'warehouse_name' => $dc->salesOrder?->warehouse?->name ?? '',
                    'delivery_date' => $dc->delivery_date ? $dc->delivery_date->format('M d, Y') : '',
                    'status' => $dc->status,
                    'delivered_by' => $dc->creator?->name ?? '',
                ];
            });

        // ── 5. Calendar Schedule Events ───────────────────────────────────
        $calendarEvents = [];
        $deliveries = SalesOrderDelivery::where('created_by', $creatorId)
            ->whereNotNull('delivery_date')
            ->with(['salesOrder.customer:id,customer_name'])
            ->get();

        foreach ($deliveries as $del) {
            $customerName = $del->salesOrder?->customer?->customer_name ?? ($del->salesOrder?->customer?->name ?? 'Customer');
            $calendarEvents[] = [
                'id' => 'dc_' . $del->id,
                'title' => 'Delivery: ' . $del->delivery_number,
                'startDate' => $del->delivery_date->format('Y-m-d'),
                'time' => '10:00 AM',
                'description' => 'Delivery Challan #' . $del->delivery_number . ' for ' . $customerName,
                'type' => 'Delivery Challan',
                'color' => '#10b981',
            ];
        }

        $ordersWithExpected = SalesOrder::accessible()
            ->whereNotNull('expected_delivery_date')
            ->get();

        foreach ($ordersWithExpected as $ord) {
            $calendarEvents[] = [
                'id' => 'so_' . $ord->id,
                'title' => 'SO Expected: ' . $ord->order_number,
                'startDate' => $ord->expected_delivery_date->format('Y-m-d'),
                'time' => '02:00 PM',
                'description' => 'Expected Delivery for ' . $ord->order_number,
                'type' => 'Sales Order',
                'color' => '#3b82f6',
            ];
        }

        return Inertia::render('SalesOrder/Dashboard/CompanyDashboard', [
            'stats' => [
                'total_so' => ['count' => $totalSoCount, 'value' => $totalSoValue],
                'this_month' => ['count' => $thisMonthSoCount, 'value' => $thisMonthSoValue],
                'pending' => ['count' => $pendingSoCount, 'value' => $pendingSoValue],
                'partially_delivered' => ['count' => $partialSoCount, 'value' => $partialSoValue],
            ],
            'challanChartData' => $challanChartData,
            'last5SO' => $last5SO,
            'last5DC' => $last5DC,
            'calendarEvents' => $calendarEvents,
        ]);
    }

    /**
     * Dedicated User Dashboard
     * Displays personal sales pipeline, execution KPIs, velocity cards, and action queues
     */
    public function userDashboard(Request $request)
    {
        $user = Auth::user();
        $companyCreatorId = creatorId();

        $canManageAny = in_array($user->type, ['company', 'superadmin', 'admin']) || $user->can('manage-any-sales-orders');
        $canManageOwn = $user->can('manage-own-sales-orders') || $user->can('manage-sales-orders');

        abort_unless($canManageAny || $canManageOwn, 403, 'Permission denied.');

        $scope = $canManageAny ? 'all' : 'own';
        $scopeLabel = $canManageAny ? __('All Company Orders') : __('My Assigned Orders');
        $permissionScope = [
            'canManageAny' => $canManageAny,
            'canManageOwn' => $canManageOwn,
            'scope' => $scope,
            'scopeLabel' => $scopeLabel,
        ];

        // Base Sales Orders query according to permissions
        $soBase = SalesOrder::where('sales_orders.created_by', $companyCreatorId);

        if (!$canManageAny) {
            $soBase->where(function ($q) use ($user) {
                $q->where('sales_orders.creator_id', $user->id)
                    ->orWhere('sales_orders.acquired_by', $user->id)
                    ->orWhereHas('assignedUsers', fn($sq) => $sq->where('users.id', $user->id))
                    ->orWhere(function ($gq) use ($user) {
                        $gq->where('sales_orders.assignment_status', SalesOrder::ASSIGNMENT_GROUP_ASSIGNED)
                            ->whereHas('assignedGroup', function ($sq) use ($user) {
                                $sq->whereHas('users', fn($uq) => $uq->where('users.id', $user->id));
                            });
                    });
            });
        }

        $permittedSoIds = (clone $soBase)->pluck('sales_orders.id')->toArray();

        // ── 1. Top Deck / Cockpit Summary ──────────────────────────────────
        $totalOrdersCount = (clone $soBase)->count();
        $totalOrdersValue = (float) ((clone $soBase)->sum('total_amount') ?? 0);

        // Active Orders (Confirmed & not fully delivered)
        $activeOrdersQuery = (clone $soBase)
            ->where('status', SalesOrder::STATUS_CONFIRMED)
            ->where('delivery_status', '!=', SalesOrder::DELIVERY_STATUS_FULL);
        $activeOrdersCount = (clone $activeOrdersQuery)->count();
        $activeOrdersValue = (float) ((clone $activeOrdersQuery)->sum('total_amount') ?? 0);

        // Fulfilled / Delivered this month
        $fulfilledOrdersQuery = (clone $soBase)
            ->where('delivery_status', SalesOrder::DELIVERY_STATUS_FULL)
            ->whereMonth('updated_at', now()->month)
            ->whereYear('updated_at', now()->year);
        $fulfilledOrdersCount = (clone $fulfilledOrdersQuery)->count();
        $fulfilledOrdersValue = (float) ((clone $fulfilledOrdersQuery)->sum('total_amount') ?? 0);

        // Deliveries query
        $deliveriesBase = SalesOrderDelivery::where('created_by', $companyCreatorId)
            ->whereIn('sales_order_id', $permittedSoIds);

        $todayDeliveriesCount = (clone $deliveriesBase)->whereDate('delivery_date', today())->count();
        $monthlyDeliveriesCount = (clone $deliveriesBase)->whereMonth('delivery_date', now()->month)->whereYear('delivery_date', now()->year)->count();
        $completedDeliveriesCount = (clone $deliveriesBase)
            ->where('status', SalesOrderDelivery::STATUS_DELIVERED)
            ->whereMonth('delivery_date', now()->month)
            ->whereYear('delivery_date', now()->year)
            ->count();
        $ongoingDeliveriesCount = (clone $deliveriesBase)
            ->whereIn('status', [SalesOrderDelivery::STATUS_CREATED, SalesOrderDelivery::STATUS_ONGOING])
            ->count();

        // Overdue Orders (expected_delivery_date in past and not fully delivered and not cancelled)
        $overdueOrdersBase = (clone $soBase)
            ->whereNotNull('expected_delivery_date')
            ->whereDate('expected_delivery_date', '<', today())
            ->where('delivery_status', '!=', SalesOrder::DELIVERY_STATUS_FULL)
            ->where('status', '!=', SalesOrder::STATUS_CANCELLED);
        $overdueOrdersCount = (clone $overdueOrdersBase)->count();

        // ── 2. Comparative Performance Velocity ─────────────────────────────
        // Today
        $todayOrdersCount = (clone $soBase)->whereDate('order_date', today())->count();
        $todayOrdersValue = (float) ((clone $soBase)->whereDate('order_date', today())->sum('total_amount') ?? 0);
        $todayDeliveredOrders = (clone $soBase)->whereDate('order_date', today())->where('delivery_status', SalesOrder::DELIVERY_STATUS_FULL)->count();
        $todayFulfillmentRate = $todayOrdersCount > 0 ? round(($todayDeliveredOrders / $todayOrdersCount) * 100, 1) : 0;

        // Yesterday
        $yesterdayOrdersCount = (clone $soBase)->whereDate('order_date', today()->subDay())->count();
        $yesterdayOrdersValue = (float) ((clone $soBase)->whereDate('order_date', today()->subDay())->sum('total_amount') ?? 0);
        $yesterdayDeliveredOrders = (clone $soBase)->whereDate('order_date', today()->subDay())->where('delivery_status', SalesOrder::DELIVERY_STATUS_FULL)->count();
        $yesterdayFulfillmentRate = $yesterdayOrdersCount > 0 ? round(($yesterdayDeliveredOrders / $yesterdayOrdersCount) * 100, 1) : 0;

        // This Month
        $thisMonthOrdersCount = (clone $soBase)->whereMonth('order_date', now()->month)->whereYear('order_date', now()->year)->count();
        $thisMonthOrdersValue = (float) ((clone $soBase)->whereMonth('order_date', now()->month)->whereYear('order_date', now()->year)->sum('total_amount') ?? 0);
        $thisMonthDeliveredOrders = (clone $soBase)->whereMonth('order_date', now()->month)->whereYear('order_date', now()->year)->where('delivery_status', SalesOrder::DELIVERY_STATUS_FULL)->count();
        $thisMonthFulfillmentRate = $thisMonthOrdersCount > 0 ? round(($thisMonthDeliveredOrders / $thisMonthOrdersCount) * 100, 1) : 0;

        // Previous Month
        $prevStart = now()->subMonth()->startOfMonth();
        $prevEnd = now()->subMonth()->endOfMonth();
        $prevMonthOrdersCount = (clone $soBase)->whereBetween('order_date', [$prevStart, $prevEnd])->count();
        $prevMonthOrdersValue = (float) ((clone $soBase)->whereBetween('order_date', [$prevStart, $prevEnd])->sum('total_amount') ?? 0);
        $prevMonthDeliveredOrders = (clone $soBase)->whereBetween('order_date', [$prevStart, $prevEnd])->where('delivery_status', SalesOrder::DELIVERY_STATUS_FULL)->count();
        $prevMonthFulfillmentRate = $prevMonthOrdersCount > 0 ? round(($prevMonthDeliveredOrders / $prevMonthOrdersCount) * 100, 1) : 0;

        // ── 3. Needs Attention Section ─────────────────────────────────────
        // 3.1 Overdue Orders List
        $overdueOrdersList = (clone $overdueOrdersBase)
            ->with(['customer:id,customer_name', 'warehouse:id,name'])
            ->orderBy('expected_delivery_date', 'asc')
            ->limit(8)
            ->get()
            ->map(function ($so) {
                $expected = Carbon::parse($so->expected_delivery_date);
                $daysOverdue = max(1, (int) $expected->diffInDays(today()));
                return [
                    'id' => $so->id,
                    'order_number' => $so->order_number,
                    'customer_name' => $so->customer?->customer_name ?? ($so->customer?->name ?? ''),
                    'expected_delivery_date' => $expected->format('M d, Y'),
                    'days_overdue' => $daysOverdue,
                    'total_amount' => (float) $so->total_amount,
                    'delivery_status' => $so->delivery_status,
                    'warehouse_name' => $so->warehouse?->name ?? '',
                ];
            });

        // 3.2 Pending Dispatch List (Confirmed, delivery_status = pending)
        $pendingDispatchQuery = (clone $soBase)
            ->where('status', SalesOrder::STATUS_CONFIRMED)
            ->where('delivery_status', SalesOrder::DELIVERY_STATUS_PENDING);
        $pendingDispatchCount = (clone $pendingDispatchQuery)->count();
        $pendingDispatchList = (clone $pendingDispatchQuery)
            ->with(['customer:id,customer_name', 'warehouse:id,name'])
            ->latest('order_date')
            ->limit(8)
            ->get()
            ->map(fn($so) => [
                'id' => $so->id,
                'order_number' => $so->order_number,
                'customer_name' => $so->customer?->customer_name ?? ($so->customer?->name ?? ''),
                'order_date' => $so->order_date ? $so->order_date->format('M d, Y') : '',
                'expected_delivery_date' => $so->expected_delivery_date ? $so->expected_delivery_date->format('M d, Y') : null,
                'total_amount' => (float) $so->total_amount,
                'warehouse_name' => $so->warehouse?->name ?? '',
            ]);

        // 3.3 Available Group Pool List (Group assigned, not yet acquired)
        $availablePoolQuery = SalesOrder::where('sales_orders.created_by', $companyCreatorId)
            ->where('assignment_status', SalesOrder::ASSIGNMENT_GROUP_ASSIGNED)
            ->whereNull('acquired_by')
            ->whereHas('assignedGroup', function ($sq) use ($user) {
                $sq->whereHas('users', fn($uq) => $uq->where('users.id', $user->id));
            });
        $availablePoolCount = (clone $availablePoolQuery)->count();
        $availablePoolList = (clone $availablePoolQuery)
            ->with(['customer:id,customer_name', 'assignedGroup:id,name'])
            ->latest('order_date')
            ->limit(8)
            ->get()
            ->map(fn($so) => [
                'id' => $so->id,
                'order_number' => $so->order_number,
                'customer_name' => $so->customer?->customer_name ?? ($so->customer?->name ?? ''),
                'group_name' => $so->assignedGroup?->name ?? '',
                'order_date' => $so->order_date ? $so->order_date->format('M d, Y') : '',
                'total_amount' => (float) $so->total_amount,
            ]);

        // 3.4 Un-invoiced Delivered Orders List
        $uninvoicedQuery = (clone $soBase)
            ->where('delivery_status', SalesOrder::DELIVERY_STATUS_FULL)
            ->where(fn($q) => $q->whereNull('is_invoiced')->orWhere('is_invoiced', 0));
        $uninvoicedCount = (clone $uninvoicedQuery)->count();
        $uninvoicedList = (clone $uninvoicedQuery)
            ->with(['customer:id,customer_name'])
            ->latest('updated_at')
            ->limit(8)
            ->get()
            ->map(fn($so) => [
                'id' => $so->id,
                'order_number' => $so->order_number,
                'customer_name' => $so->customer?->customer_name ?? ($so->customer?->name ?? 'N/A'),
                'total_amount' => (float) $so->total_amount,
                'delivered_at' => $so->updated_at ? $so->updated_at->format('M d, Y') : 'N/A',
            ]);

        // ── 4. Order Breakdowns ─────────────────────────────────────────────
        $statusBreakdown = [
            'draft' => (clone $soBase)->where('status', SalesOrder::STATUS_DRAFT)->count(),
            'confirmed' => (clone $soBase)->where('status', SalesOrder::STATUS_CONFIRMED)->count(),
            'cancelled' => (clone $soBase)->where('status', SalesOrder::STATUS_CANCELLED)->count(),
        ];

        $deliveryBreakdown = [
            'pending' => (clone $soBase)->where('delivery_status', SalesOrder::DELIVERY_STATUS_PENDING)->count(),
            'partial' => (clone $soBase)->where('delivery_status', SalesOrder::DELIVERY_STATUS_PARTIAL)->count(),
            'delivered' => (clone $soBase)->where('delivery_status', SalesOrder::DELIVERY_STATUS_FULL)->count(),
        ];

        // ── 5. Recent Activity Portfolios ──────────────────────────────────
        $recentOrders = (clone $soBase)
            ->with(['customer:id,customer_name', 'warehouse:id,name', 'assignedUsers:id,name'])
            ->latest('order_date')
            ->latest('id')
            ->limit(8)
            ->get()
            ->map(fn($so) => [
                'id' => $so->id,
                'order_number' => $so->order_number,
                'customer_name' => $so->customer?->customer_name ?? ($so->customer?->name ?? ''),
                'warehouse_name' => $so->warehouse?->name ?? '',
                'order_date' => $so->order_date ? $so->order_date->format('M d, Y') : '',
                'expected_delivery_date' => $so->expected_delivery_date ? $so->expected_delivery_date->format('M d, Y') : null,
                'status' => $so->status,
                'delivery_status' => $so->delivery_status,
                'is_invoiced' => (bool) $so->is_invoiced,
                'total_amount' => (float) $so->total_amount,
            ]);

        $recentDeliveries = (clone $deliveriesBase)
            ->with(['salesOrder:id,order_number,customer_id', 'salesOrder.customer:id,customer_name', 'creator:id,name'])
            ->latest('delivery_date')
            ->latest('id')
            ->limit(8)
            ->get()
            ->map(fn($dc) => [
                'id' => $dc->id,
                'challan_number' => $dc->delivery_number,
                'sales_order_id' => $dc->sales_order_id,
                'sales_order_number' => $dc->salesOrder?->order_number ?? 'N/A',
                'customer_name' => $dc->salesOrder?->customer?->customer_name ?? ($dc->salesOrder?->customer?->name ?? 'N/A'),
                'delivery_date' => $dc->delivery_date ? $dc->delivery_date->format('M d, Y') : 'N/A',
                'status' => $dc->status,
                'driver_or_creator' => $dc->creator?->name ?? 'N/A',
            ]);

        // ── 6. Calendar Events (Dual: Expected Deliveries & Challans) ─────────
        $calendarEvents = [];

        // 6.1 Expected Deliveries
        $expectedOrders = (clone $soBase)
            ->whereNotNull('expected_delivery_date')
            ->with(['customer:id,customer_name'])
            ->get();

        foreach ($expectedOrders as $eo) {
            $isOverdue = Carbon::parse($eo->expected_delivery_date)->isPast() && $eo->delivery_status !== SalesOrder::DELIVERY_STATUS_FULL;
            $customerName = $eo->customer?->customer_name ?? ($eo->customer?->name ?? 'Customer');
            $calendarEvents[] = [
                'id' => 'so_exp_' . $eo->id,
                'title' => 'SO Expected: ' . $eo->order_number,
                'startDate' => Carbon::parse($eo->expected_delivery_date)->format('Y-m-d'),
                'time' => '10:00 AM',
                'description' => 'Expected delivery for ' . $eo->order_number . ' (' . $customerName . ') - Total: BDT ' . number_format($eo->total_amount, 2),
                'type' => 'Expected Delivery',
                'color' => $isOverdue ? '#ef4444' : '#3b82f6',
            ];
        }

        // 6.2 Delivery Challans
        $challanEvents = (clone $deliveriesBase)
            ->whereNotNull('delivery_date')
            ->with(['salesOrder.customer:id,customer_name'])
            ->get();

        foreach ($challanEvents as $ce) {
            $color = match ($ce->status) {
                SalesOrderDelivery::STATUS_DELIVERED => '#10b981',
                SalesOrderDelivery::STATUS_ONGOING   => '#06b6d4',
                SalesOrderDelivery::STATUS_POSTPONED => '#f59e0b',
                default                              => '#8b5cf6',
            };

            $customerName = $ce->salesOrder?->customer?->customer_name ?? ($ce->salesOrder?->customer?->name ?? 'Customer');
            $calendarEvents[] = [
                'id' => 'dc_' . $ce->id,
                'title' => 'Challan: ' . $ce->delivery_number,
                'startDate' => Carbon::parse($ce->delivery_date)->format('Y-m-d'),
                'time' => '02:00 PM',
                'description' => 'Delivery Challan #' . $ce->delivery_number . ' for ' . $customerName . ' (SO #' . ($ce->salesOrder?->order_number ?? 'N/A') . ')',
                'type' => 'Delivery Challan',
                'color' => $color,
            ];
        }

        return Inertia::render('SalesOrder/Dashboard/UserDashboard', [
            'permissionScope' => $permissionScope,
            'stats' => [
                'totalOrders' => $totalOrdersCount,
                'totalOrdersValue' => $totalOrdersValue,
                'activeOrders' => $activeOrdersCount,
                'activeOrdersValue' => $activeOrdersValue,
                'fulfilledRevenue' => $fulfilledOrdersValue,
                'fulfilledCount' => $fulfilledOrdersCount,
                'todayDeliveries' => $todayDeliveriesCount,
                'monthlyDeliveries' => $monthlyDeliveriesCount,
                'completedDeliveries' => $completedDeliveriesCount,
                'ongoingDeliveries' => $ongoingDeliveriesCount,
                'overdueOrders' => $overdueOrdersCount,

                // Velocity
                'todayOrders' => $todayOrdersCount,
                'todayOrdersValue' => $todayOrdersValue,
                'todayFulfillmentRate' => $todayFulfillmentRate,

                'yesterdayOrders' => $yesterdayOrdersCount,
                'yesterdayOrdersValue' => $yesterdayOrdersValue,
                'yesterdayFulfillmentRate' => $yesterdayFulfillmentRate,

                'thisMonthOrders' => $thisMonthOrdersCount,
                'thisMonthOrdersValue' => $thisMonthOrdersValue,
                'thisMonthFulfillmentRate' => $thisMonthFulfillmentRate,

                'prevMonthOrders' => $prevMonthOrdersCount,
                'prevMonthOrdersValue' => $prevMonthOrdersValue,
                'prevMonthFulfillmentRate' => $prevMonthFulfillmentRate,
            ],
            'needsAttention' => [
                'overdueOrders' => $overdueOrdersCount,
                'overdueList' => $overdueOrdersList,

                'pendingDispatch' => $pendingDispatchCount,
                'pendingDispatchList' => $pendingDispatchList,

                'availablePool' => $availablePoolCount,
                'availablePoolList' => $availablePoolList,

                'uninvoicedOrders' => $uninvoicedCount,
                'uninvoicedList' => $uninvoicedList,
            ],
            'statusBreakdown' => $statusBreakdown,
            'deliveryBreakdown' => $deliveryBreakdown,
            'recentOrders' => $recentOrders,
            'recentDeliveries' => $recentDeliveries,
            'calendarEvents' => $calendarEvents,
        ]);
    }

    public function userDashboardView(Request $request)
    {
        return $this->userDashboard($request);
    }

    private function getDateRange(Request $request)
    {
        $period = $request->get('period', 'this_month');
        $now = Carbon::now();

        switch ($period) {
            case 'prev_month':
                $start = $now->copy()->subMonth()->startOfMonth();
                $end = $now->copy()->subMonth()->endOfMonth();
                break;
            case 'last_3_months':
                $start = $now->copy()->subMonths(3)->startOfDay();
                $end = $now->copy()->endOfDay();
                break;
            case 'last_6_months':
                $start = $now->copy()->subMonths(6)->startOfDay();
                $end = $now->copy()->endOfDay();
                break;
            case 'custom':
                if ($request->filled('start_date') && $request->filled('end_date')) {
                    $start = Carbon::parse($request->get('start_date'))->startOfDay();
                    $end = Carbon::parse($request->get('end_date'))->endOfDay();
                } else {
                    $start = $now->copy()->startOfMonth();
                    $end = $now->copy()->endOfMonth();
                }
                break;
            case 'this_month':
            default:
                $start = $now->copy()->startOfMonth();
                $end = $now->copy()->endOfMonth();
                break;
        }

        return [$start, $end];
    }
}

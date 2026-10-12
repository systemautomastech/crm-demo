<?php

namespace App\Http\Controllers;

use App\Models\SalesInvoice;
use App\Models\SalesInvoiceItem;
use App\Models\SalesInvoiceItemTax;
use App\Models\Warehouse;
use App\Http\Requests\StoreSalesInvoiceRequest;
use App\Http\Requests\UpdateSalesInvoiceRequest;
use Automas\ProductService\Models\ProductServiceItem;
use Automas\SalesOrder\Models\SalesOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Events\PostSalesInvoice;
use App\Models\SalesInvoiceSetup;
use App\Models\EmailTemplate;
use App\Models\Customer;
use App\Services\CustomerService;
use App\Services\WarehouseService;
use Spatie\LaravelPdf\Facades\Pdf;

class SalesInvoiceController extends Controller
{
    public function __construct(
        protected CustomerService $customerService,
        protected WarehouseService $warehouseService
    ) {}

    private function checkInvoiceAccess(SalesInvoice $salesInvoice): bool
    {
        $user = Auth::user();

        if ($user->can('manage-any-sales-invoices')) {
            return true;
        }

        if ($user->can('manage-own-sales-invoices') || $user->can('manage-sales-orders') || $user->can('view-sales-orders')) {
            if ($salesInvoice->creator_id == $user->id || $salesInvoice->customer_id == $user->id) {
                return true;
            }

                $salesOrder = SalesOrder::where('invoice_id', $salesInvoice->id)->first();
                if ($salesOrder) {
                    if ($salesOrder->acquired_by == $user->id || $salesOrder->creator_id == $user->id) {
                        return true;
                    }
                    if ($salesOrder->assignedUsers()->where('users.id', $user->id)->exists()) {
                        return true;
                    }
                }
        }

        return false;
    }

    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-sales-invoices')) {
            return back()->with('error', __('Permission denied'));
        }

        $baseQuery = SalesInvoice::with(['customer', 'items'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-sales-invoices')) {
                    $q->where('created_by', creatorId());
                } elseif (Auth::user()->can('manage-own-sales-invoices')) {
                    $q->where(function ($sq) {
                        $sq->where('creator_id', Auth::id());
                        if (class_exists(SalesOrder::class)) {
                            $sq->orWhereHas('salesOrder', function ($soq) {
                                $soq->where('acquired_by', Auth::id())
                                    ->orWhere('creator_id', Auth::id())
                                    ->orWhereHas('assignedUsers', fn($auq) => $auq->where('users.id', Auth::id()));
                            });
                        }
                    });
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

        // Filters that apply to both the list and the status/value breakdown
        if ($request->filled('customer_id')) {
            $baseQuery->where('customer_id', $request->customer_id);
        }
        if ($request->filled('warehouse_id')) {
            $baseQuery->where('warehouse_id', $request->warehouse_id);
        }
        if ($request->filled('search')) {
            $baseQuery->where(function ($q) use ($request) {
                $q->where('invoice_number', 'like', '%' . $request->search . '%')
                    ->orWhereHas('customer', function ($cq) use ($request) {
                        $cq->where('customer_name', 'like', '%' . $request->search . '%')
                           ->orWhere('name', 'like', '%' . $request->search . '%');
                    });
            });
        }
        if ($request->filled('date_range')) {
            $dates = explode(' - ', $request->date_range);
            if (count($dates) === 2) {
                $baseQuery->whereBetween('invoice_date', [$dates[0], $dates[1]]);
            }
        }

        // Breakdown by status
        $statusBreakdown = (clone $baseQuery)
            ->select('status', DB::raw('COUNT(*) as count'), DB::raw('SUM(total_amount) as total'))
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $today = now()->startOfDay();
        $dueSoonEnd = $today->copy()->addDays(7);
        $overdue30Start = $today->copy()->subDays(30);

        $stats = [
            'total_count' => (clone $baseQuery)->count(),
            'total_value' => (clone $baseQuery)->sum('total_amount'),
            'outstanding_count' => (clone $baseQuery)->whereIn('status', ['posted', 'partial'])->count(),
            'outstanding_value' => (clone $baseQuery)->whereIn('status', ['posted', 'partial'])->sum('balance_amount'),
            'collected_value' => (clone $baseQuery)->sum('paid_amount'),
            'overdue_count' => (clone $baseQuery)->where('due_date', '<', $today)->whereIn('status', ['posted', 'partial'])->where('balance_amount', '>', 0)->count(),
            'overdue_value' => (clone $baseQuery)->where('due_date', '<', $today)->whereIn('status', ['posted', 'partial'])->where('balance_amount', '>', 0)->sum('balance_amount'),
        ];
        foreach (['draft', 'posted', 'partial', 'paid'] as $status) {
            $stats["{$status}_count"] = (int) ($statusBreakdown[$status]->count ?? 0);
            $stats["{$status}_value"] = $statusBreakdown[$status]->total ?? 0;
        }

        // AR-aging buckets
        $agingFilters = [
            'current' => fn($q) => $q->where('due_date', '>', $dueSoonEnd),
            'due_soon' => fn($q) => $q->where('due_date', '>=', $today)->where('due_date', '<=', $dueSoonEnd),
            'overdue_1_30' => fn($q) => $q->where('due_date', '<', $today)->where('due_date', '>=', $overdue30Start),
            'overdue_30_plus' => fn($q) => $q->where('due_date', '<', $overdue30Start),
        ];

        $query = clone $baseQuery;
        if ($request->filled('status')) {
            if ($request->status === 'overdue') {
                $query->where('due_date', '<', $today)
                    ->whereIn('status', ['posted', 'partial'])
                    ->where('balance_amount', '>', 0);
            } elseif ($request->status === 'outstanding') {
                $query->whereIn('status', ['posted', 'partial']);
            } elseif (isset($agingFilters[$request->status])) {
                $query->whereIn('status', ['posted', 'partial']);
                $agingFilters[$request->status]($query);
            } else {
                $query->where('status', $request->status);
            }
        }

        // Apply sorting
        $sortField = $request->get('sort', 'created_at');
        $sortDirection = $request->get('direction', 'desc');

        $allowedSortFields = ['invoice_number', 'invoice_date', 'due_date', 'subtotal', 'tax_amount', 'total_amount', 'balance_amount', 'status', 'created_at'];
        if (!in_array($sortField, $allowedSortFields) || empty($sortField)) {
            $sortField = 'created_at';
        }

        $query->orderBy($sortField, $sortDirection);

        $perPage = $request->get('per_page', 10);
        $invoices = $query->paginate($perPage);

        // Encrypt invoice id for public url
        $invoices->getCollection()->transform(function ($invoice) {
            return $invoice->setAttribute(
                'public_url',
                route('sales-invoice.client.view', [
                    'token' => Crypt::encryptString((string) $invoice->id),
                ])
            );
        });

        $customers = $this->customerService->getCustomers();
        $warehouses = Warehouse::where('is_active', true)->select('id', 'name')->where('created_by', creatorId())->get();

        $customerSummaries = collect();
        if (Auth::user()->can('manage-any-sales-invoices')) {
            $customerSummaries = (clone $baseQuery)
                ->selectRaw('customer_id')
                ->selectRaw('COUNT(*) as invoice_count')
                ->selectRaw("SUM(CASE WHEN status IN ('posted', 'partial') THEN balance_amount ELSE 0 END) as outstanding")
                ->selectRaw(
                    "MAX(CASE WHEN status IN ('posted', 'partial') AND due_date < ? AND balance_amount > 0 THEN DATEDIFF(?, due_date) END) as oldest_overdue_days",
                    [$today->toDateString(), $today->toDateString()]
                )
                ->groupBy('customer_id')
                ->havingRaw("SUM(CASE WHEN status IN ('posted', 'partial') THEN balance_amount ELSE 0 END) > 0")
                ->orderByDesc('oldest_overdue_days')
                ->orderByDesc('outstanding')
                ->limit(20)
                ->get();

            $customerModels = Customer::whereIn('id', $customerSummaries->pluck('customer_id'))
                ->get()
                ->keyBy('id');

            $customerSummaries = $customerSummaries->map(function ($row) use ($customerModels) {
                $customer = $customerModels->get($row->customer_id);
                return [
                    'customer' => $customer ? [
                        'id' => $customer->id,
                        'name' => $customer->customer_name,
                        'email' => $customer->customer_email,
                        'avatar' => null,
                    ] : null,
                    'invoice_count' => (int) $row->invoice_count,
                    'outstanding' => $row->outstanding,
                    'oldest_overdue_days' => $row->oldest_overdue_days !== null ? (int) $row->oldest_overdue_days : null,
                ];
            })->values();
        }

        return Inertia::render('Sales/Index', [
            'invoices' => $invoices,
            'customers' => $customers,
            'warehouses' => $warehouses,
            'stats' => $stats,
            'customerSummaries' => $customerSummaries,
            'filters' => $request->only(['customer_id', 'warehouse_id', 'status', 'search', 'date_range'])
        ]);
    }

    public function create()
    {
        if (!Auth::user()->can('create-sales-invoices')) {
            return back()->with('error', __('Permission denied'));
        }

        return Inertia::render('Sales/Create', [
            'customers' => $this->customerService->getCustomers(),
            'products' => $this->warehouseService->getWarehouseProducts(),
            'warehouses' => $this->warehouseService->getActiveWarehouses(),
            'invoice_settings' => SalesInvoiceSetup::getSettings(creatorId()),
            'invoice_number' => SalesInvoice::generateInvoiceNumber(),
        ]);
    }

    public function store(StoreSalesInvoiceRequest $request)
    {
        if (!Auth::user()->can('create-sales-invoices')) {
            return redirect()->route('sales-invoices.index')->with('error', __('Permission denied'));
        }

        $validatedData = $request->validated();
        $items = $request->items ?? [];
        $totals = $this->calculateTotals($items);

        $invoice = DB::transaction(function () use ($validatedData, $items, $totals) {
            $invoiceData = array_merge($validatedData, [
                'type' => $validatedData['type'] ?? 'product',
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'discount_amount' => $totals['discount_amount'],
                'total_amount' => $totals['total_amount'],
                'balance_amount' => $totals['total_amount'],
                'creator_id' => Auth::id(),
                'created_by' => creatorId(),
            ]);

            $invoice = SalesInvoice::create($invoiceData);
            $this->createInvoiceItems($invoice->id, $items);

            return $invoice;
        });

        try {
            if (company_setting('Sales Invoice') == 'on') {
                $customerEmail = $invoice->customer?->customer_email ?? $invoice->customer?->email ?? $invoice->customer_email;
                $customerName = $invoice->customer?->customer_name ?? $invoice->customer?->name ?? $invoice->customer_name;
                $emailData = [
                    'invoice_number' => $invoice->invoice_number ?? null,
                    'sales_customer_name' => $customerName ?? null,
                    'warehouse_name' => $invoice->warehouse->name ?? null,
                    'total_amount' => $totals['total_amount'] ?? null,
                    'discount_amount' => $totals['discount_amount'] ?? null,
                ];
                if ($customerEmail) {
                    EmailTemplate::sendEmailTemplate('Sales Invoice', [$customerEmail], $emailData, $invoice->created_by);
                }
            }
        } catch (\Exception $e) {
            \Log::error('Sales invoice mail failed: ' . $e->getMessage());
        }

        return redirect()->route('sales-invoices.index')->with('success', __('The sales invoice created successfully.'));
    }

    public function show(SalesInvoice $salesInvoice)
    {
        if (!Auth::user()->can('view-sales-invoices') || !$this->checkInvoiceAccess($salesInvoice)) {
            return back()->with('error', __('Permission denied'));
        }

        $salesInvoice->load([
            'customer',
            'customerDetails',
            'items.product.unitRelation',
            'items.taxes',
            'warehouse',
        ]);

        return Inertia::render('Sales/View', [
            'invoice' => $salesInvoice,
        ]);
    }

    public function edit(SalesInvoice $salesInvoice)
    {
        if (!Auth::user()->can('edit-sales-invoices') || $salesInvoice->created_by != creatorId()) {
            return redirect()->route('sales-invoices.index')->with('error', __('Permission denied'));
        }

        if ($salesInvoice->status != 'draft') {
            return redirect()->route('sales-invoices.index')->with('error', __('Cannot edit posted invoice.'));
        }

        $salesInvoice->load(['items.taxes', 'items.product.unitRelation']);
        $warehouseId = $salesInvoice->warehouse_id;
        return Inertia::render('Sales/Edit', [
            'invoice' => $salesInvoice,
            'customers' => $this->customerService->getCustomers(),
            'products' => $this->warehouseService->getWarehouseProducts($warehouseId),
            'warehouses' => $this->warehouseService->getActiveWarehouses(),
        ]);
    }

    public function update(UpdateSalesInvoiceRequest $request, SalesInvoice $salesInvoice)
    {
        if (!Auth::user()->can('edit-sales-invoices') || $salesInvoice->created_by != creatorId()) {
            return redirect()->route('sales-invoices.index')->with('error', __('Permission denied'));
        }

        if ($salesInvoice->status != 'draft') {
            return redirect()->route('sales-invoices.index')->with('error', __('Cannot update posted invoice.'));
        }

        $validatedData = $request->validated();
        $items = $request->items ?? [];
        $totals = $this->calculateTotals($items);

        DB::transaction(function () use ($salesInvoice, $validatedData, $items, $totals) {
            $salesInvoice->update(array_merge($validatedData, [
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'discount_amount' => $totals['discount_amount'],
                'total_amount' => $totals['total_amount'],
                'balance_amount' => $totals['total_amount'],
            ]));

            // Recreate invoice items
            $salesInvoice->items()->delete();
            $this->createInvoiceItems($salesInvoice->id, $items);
        });

        return redirect()->route('sales-invoices.index')->with('success', __('The sales invoice details are updated successfully.'));
    }

    public function destroy(SalesInvoice $salesInvoice)
    {
        if (!Auth::user()->can('delete-sales-invoices')) {
            return redirect()->route('sales-invoices.index')->with('error', __('Permission denied'));
        }

        if ($salesInvoice->status === 'posted') {
            return back()->withErrors(['error' => __('Cannot delete posted invoice.')]);
        }

        $salesInvoice->delete();

        return redirect()->route('sales-invoices.index')->with('success', __('The sales invoice has been deleted.'));
    }

    public function clientInvoice($token)
    {
        try {
            $invoiceId = Crypt::decryptString($token);
        } catch (\Exception $e) {
            $invoiceId = $token;
        }

        $salesInvoice = SalesInvoice::with([
            'customer',
            'customerDetails',
            'items.product.unitRelation',
            'items.taxes',
            'warehouse',
        ])->find($invoiceId);

        if (!$salesInvoice) {
            abort(404, __('Invoice not found'));
        }

        $creatorId = $salesInvoice->created_by ?? creatorId();
        $salesInvoiceSetting = SalesInvoiceSetup::getSettings($creatorId);

        return view('sales.public_invoice', [
            'invoice' => $salesInvoice,
            'salesInvoiceSetting' => $salesInvoiceSetting,
        ]);
    }

    private function calculateTotals(array $items): array
    {
        $subtotal = 0;
        $totalDiscount = 0;
        $totalTax = 0;

        foreach ($items as $item) {
            $lineTotal = ($item['quantity'] ?? 0) * ($item['unit_price'] ?? 0);
            $discType = $item['discount_type'] ?? 'percentage';
            if ($discType === 'fixed') {
                $discountAmount = min(max((float) ($item['discount_amount'] ?? 0), 0), $lineTotal);
            } else {
                $discountAmount = ($lineTotal * (float) ($item['discount_percentage'] ?? 0)) / 100;
            }
            $afterDiscount = max(0, $lineTotal - $discountAmount);
            $taxAmount = ($afterDiscount * (float) ($item['tax_percentage'] ?? 0)) / 100;

            $subtotal += $lineTotal;
            $totalDiscount += $discountAmount;
            $totalTax += $taxAmount;
        }

        return [
            'subtotal' => $subtotal,
            'tax_amount' => $totalTax,
            'discount_amount' => $totalDiscount,
            'total_amount' => max(0, $subtotal + $totalTax - $totalDiscount)
        ];
    }

    private function createInvoiceItems($invoiceId, array $items): void
    {
        foreach ($items as $itemData) {
            $lineTotal = (float) ($itemData['quantity'] ?? 0) * (float) ($itemData['unit_price'] ?? 0);
            $discType = $itemData['discount_type'] ?? 'percentage';

            if ($discType === 'fixed') {
                $discAmt = min(max((float) ($itemData['discount_amount'] ?? 0), 0), $lineTotal);
                $discPercent = $lineTotal > 0 ? round(($discAmt / $lineTotal) * 100, 4) : 0;
            } else {
                $discPercent = $itemData['discount_percentage'] ?? 0;
                $discAmt = ($lineTotal * (float) $discPercent) / 100;
            }

            $item = SalesInvoiceItem::create([
                'invoice_id' => $invoiceId,
                'product_id' => $itemData['product_id'],
                'description' => $itemData['description'] ?? null,
                'product_type' => $itemData['product_type'] ?? 'product',
                'quantity' => $itemData['quantity'],
                'unit_price' => $itemData['unit_price'],
                'discount_type' => $discType,
                'discount_amount' => $discAmt,
                'discount_percentage' => $discPercent,
                'tax_percentage' => $itemData['tax_percentage'] ?? 0,
            ]);

            // Store individual taxes
            if (isset($itemData['taxes']) && is_array($itemData['taxes'])) {
                foreach ($itemData['taxes'] as $tax) {
                    SalesInvoiceItemTax::create([
                        'item_id' => $item->id,
                        'tax_name' => $tax['tax_name'],
                        'tax_rate' => $tax['tax_rate'] ?? $tax['rate'] ?? 0,
                    ]);
                }
            }
        }
    }

    public function post(SalesInvoice $salesInvoice)
    {
        if (!Auth::user()->can('post-sales-invoices')) {
            return back()->with('error', __('Permission denied'));
        }

        if ($salesInvoice->status !== 'draft') {
            return back()->withErrors(['error' => __('Only draft invoices can be posted.')]);
        }

        try {
            PostSalesInvoice::dispatch($salesInvoice);
        } catch (\Throwable $th) {
            return back()->with('error', $th->getMessage());
        }

        $salesInvoice->update(['status' => 'posted']);

        return back()->with('success', __('The sales invoice has been posted successfully.'));
    }

    public function getWarehouseProducts(Request $request)
    {
        if (Auth::user()->can('create-sales-invoices') || Auth::user()->can('edit-sales-invoices')) {
            $warehouseId = $request->warehouse_id ? (int) $request->warehouse_id : null;
            $products = $this->warehouseService->getWarehouseProducts($warehouseId);
            return response()->json($products);
        }

        return response()->json([], 403);
    }

    public function getServices(Request $request)
    {
        if (Auth::user()->can('create-sales-invoices') || Auth::user()->can('edit-sales-invoices')) {
            $services = ProductServiceItem::select('id', 'name', 'sku', 'sale_price', 'tax_ids', 'unit', 'type')
                ->where('is_active', true)
                ->where('type', 'service')
                ->where('created_by', creatorId())
                ->get()
                ->map(function ($service) {
                    return [
                        'id' => $service->id,
                        'name' => $service->name,
                        'sku' => $service->sku,
                        'sale_price' => $service->sale_price,
                        'unit' => $service->unit,
                        'type' => $service->type,
                        'taxes' => $service->taxes->map(function ($tax) {
                            return [
                                'id' => $tax->id,
                                'tax_name' => $tax->tax_name,
                                'rate' => $tax->rate
                            ];
                        })
                    ];
                });
            return response()->json($services);
        }

        return response()->json([], 403);
    }

    public function print(SalesInvoice $salesInvoice)
    {
        if (!Auth::user()->can('print-sales-invoices') || !$this->checkInvoiceAccess($salesInvoice)) {
            return back()->with('error', __('Permission denied'));
        }

        $salesInvoice->load([
            'customer',
            'customerDetails',
            'items.product.unitRelation',
            'items.taxes',
            'warehouse',
        ]);

        $customer = $salesInvoice->customer ?? $salesInvoice->customerDetails;
        $billingAddr = $customer?->billing_address ?? [];
        $billTo = [
            'name' => $customer?->customer_name ?? $salesInvoice->customer_name ?? '',
            'email' => $customer?->customer_email ?? $salesInvoice->customer_email ?? '',
            'phone' => $customer?->customer_phone ?? $salesInvoice->customer_phone ?? '',
            'address_line_1' => $billingAddr['address'] ?? $billingAddr['address_line_1'] ?? ($salesInvoice->customer_address ?? ''),
            'address_line_2' => $billingAddr['address_line_2'] ?? '',
            'city' => $billingAddr['city'] ?? '',
            'state' => $billingAddr['state'] ?? '',
            'country' => $billingAddr['country'] ?? '',
            'zip' => $billingAddr['zip_code'] ?? '',
        ];

        $same_as_billing = $salesInvoice->customerDetails?->same_as_billing ?? true;
        $shipTo = [];

        if (!$same_as_billing && $salesInvoice->customerDetails?->shipping_address) {
            $shippingAddr = $salesInvoice->customerDetails->shipping_address;
            $shipTo = [
                'name' => $shippingAddr['name'] ?? $billTo['name'] ?? '',
                'email' => $shippingAddr['email'] ?? $billTo['email'] ?? '',
                'phone' => $shippingAddr['phone'] ?? $billTo['phone'] ?? '',
                'address_line_1' => $shippingAddr['address_line_1'] ?? $billTo['address_line_1'] ?? '',
                'address_line_2' => $shippingAddr['address_line_2'] ?? $billTo['address_line_2'] ?? '',
                'city' => $shippingAddr['city'] ?? $billTo['city'] ?? '',
                'state' => $shippingAddr['state'] ?? $billTo['state'] ?? '',
                'country' => $shippingAddr['country'] ?? $billTo['country'] ?? '',
                'zip' => $shippingAddr['zip_code'] ?? $billTo['zip'] ?? '',
            ];
        }

        $creatorId = $salesInvoice->created_by ?? creatorId();
        $salesInvoiceSetting = SalesInvoiceSetup::getSettings($creatorId);

        return view('sales.print', [
            'invoice' => $salesInvoice,
            'billTo' => $billTo,
            'shipTo' => $shipTo,
            'same_as_billing' => $same_as_billing,
            'salesInvoiceSetting' => $salesInvoiceSetting,
        ]);
    }

    public function downloadPdf(SalesInvoice $salesInvoice)
    {
        if (!Auth::user()->can('print-sales-invoices') || !$this->checkInvoiceAccess($salesInvoice)) {
            return back()->with('error', __('Permission denied'));
        }

        $salesInvoice->load([
            'customer',
            'customerDetails',
            'items.product.unitRelation',
            'items.taxes',
            'warehouse',
        ]);

        $creatorId = $salesInvoice->created_by ?? creatorId();
        $salesInvoiceSetting = SalesInvoiceSetup::getSettings($creatorId);
        $filename = "Invoice_{$salesInvoice->invoice_number}.pdf";

        return Pdf::view('sales.print', [
            'invoice' => $salesInvoice,
            'salesInvoiceSetting' => $salesInvoiceSetting,
            'isServerPdf' => true,
        ])
            ->format('a4')
            ->margins(0, 0, 0, 0)
            ->download($filename);
    }

    public function setup()
    {
        if (!Auth::user()->can('manage-sales-invoice-setup')) {
            return redirect()->route('dashboard')->with('error', __('Permission denied'));
        }

        return Inertia::render('Sales/SystemSetup/Index', [
            'settings' => SalesInvoiceSetup::getSettings(creatorId()),
        ]);
    }

    public function updateSetup(Request $request)
    {
        if (!Auth::user()->can('manage-sales-invoice-setup')) {
            return redirect()->back()->with('error', __('Permission denied'));
        }

        $settings = $request->input('settings', $request->except(['_token', '_method']));
        SalesInvoiceSetup::setSettings($settings, creatorId());
        return redirect()->back()->with('success', __('Sales Invoice setup updated successfully.'));
    }
}

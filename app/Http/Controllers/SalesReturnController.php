<?php

namespace App\Http\Controllers;

use App\Models\SalesInvoiceReturn;
use App\Models\SalesInvoiceReturnItem;
use App\Models\SalesInvoiceReturnItemTax;
use App\Models\SalesInvoice;
use App\Models\Warehouse;
use App\Events\CompleteSalesReturn;
use Illuminate\Http\Request;
use App\Http\Requests\StoreSalesReturnRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Services\CustomerService;
use App\Models\EmailTemplate;

class SalesReturnController extends Controller
{
    public function __construct(protected CustomerService $customerService)
    {
    }

    private function checkReturnAccess(SalesInvoiceReturn $salesReturn): bool
    {
        if (Auth::user()->can('manage-any-sales-return-invoices')) {
            return true;
        }

        if (Auth::user()->can('manage-own-sales-return-invoices')) {
            return $salesReturn->creator_id == Auth::id();
        }

        return false;
    }

    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-sales-return-invoices')) {
            return back()->with('error', __('Permission denied'));
        }

        $query = SalesInvoiceReturn::with(['customer', 'originalInvoice', 'items.product', 'warehouse'])
            ->where(function ($q) {
                if (Auth::user()->can('manage-any-sales-return-invoices')) {
                    $q->where('created_by', creatorId());
                } elseif (Auth::user()->can('manage-own-sales-return-invoices')) {
                    $q->where('creator_id', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            });

        // Filters
        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }
        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('return_number', 'like', '%' . $request->search . '%')
                    ->orWhereHas('customer', function ($cq) use ($request) {
                        $cq->where('customer_name', 'like', '%' . $request->search . '%')
                           ->orWhere('name', 'like', '%' . $request->search . '%');
                    });
            });
        }
        if ($request->filled('date_range')) {
            $dates = explode(' - ', $request->date_range);
            if (count($dates) === 2) {
                $query->whereBetween('return_date', [$dates[0], $dates[1]]);
            }
        }

        // Apply sorting
        $sortField = $request->get('sort', 'created_at');
        $sortDirection = $request->get('direction', 'desc');

        $allowedSortFields = ['return_number', 'return_date', 'total_amount', 'status', 'created_at'];
        if (!in_array($sortField, $allowedSortFields) || empty($sortField)) {
            $sortField = 'created_at';
        }

        $query->orderBy($sortField, $sortDirection);

        $perPage = $request->get('per_page', 10);
        $returns = $query->paginate($perPage);

        $customers = $this->customerService->getCustomers();
        $warehouses = Warehouse::where('is_active', true)->select('id', 'name')->where('created_by', creatorId())->get();

        return Inertia::render('SalesReturns/Index', [
            'returns' => $returns,
            'customers' => $customers,
            'warehouses' => $warehouses,
            'filters' => $request->only(['customer_id', 'warehouse_id', 'status', 'search', 'date_range'])
        ]);
    }

    public function create()
    {
        if (!Auth::user()->can('create-sales-return-invoices')) {
            return back()->with('error', __('Permission denied'));
        }

        $invoices = SalesInvoice::with(['customer', 'warehouse', 'items.product', 'items.taxes', 'salesReturns.items'])
            ->where('created_by', creatorId())
            ->where('type', 'product')
            ->where('status', '!=', 'draft')
            ->get();

        // Calculate available quantities for each item
        foreach ($invoices as $invoice) {
            foreach ($invoice->items as $item) {
                $totalReturned = $invoice->salesReturns
                    ->where('status', '!=', 'cancelled')
                    ->flatMap->items
                    ->where('original_invoice_item_id', $item->id)
                    ->sum('return_quantity');

                $item->available_quantity = $item->quantity - $totalReturned;
            }
        }

        $warehouses = Warehouse::where('created_by', creatorId())->where('is_active', true)->get();

        return Inertia::render('SalesReturns/Create', [
            'invoices' => $invoices,
            'warehouses' => $warehouses
        ]);
    }

    public function store(StoreSalesReturnRequest $request)
    {
        if (!Auth::user()->can('create-sales-return-invoices')) {
            return redirect()->route('sales-returns.index')->with('error', __('Permission denied'));
        }

        $totals = $this->calculateReturnTotals($request->items, $request->original_invoice_id);

        $return = DB::transaction(function () use ($request, $totals) {
            $return = SalesInvoiceReturn::create([
                'return_date' => $request->return_date,
                'customer_id' => $request->customer_id,
                'warehouse_id' => $request->warehouse_id ?? null,
                'original_invoice_id' => $request->original_invoice_id,
                'reason' => $request->reason,
                'notes' => $request->notes,
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'discount_amount' => $totals['discount_amount'],
                'total_amount' => $totals['total_amount'],
                'status' => 'draft',
                'creator_id' => Auth::id(),
                'created_by' => creatorId(),
            ]);

            // Create return items
            $this->createReturnItems($return->id, $request->items, $request->original_invoice_id);

            return $return;
        });

        try {
            // Send sales invoice return mail
            if (company_setting('Sales Invoice Return') == 'on') {
                $emailData = [
                    'return_number' => $return->return_number ?? null,
                    'return_date' => $request->return_date ?? null,
                    'sales_customer_name' => $return->customer?->customer_name ?? $return->customer?->name ?? null,
                    'warehouse_name' => $return->warehouse?->name ?? null,
                    'reason' => $request->reason ?? null,
                    'total_amount' => $totals['total_amount'] ?? null,
                ];
                $customerEmail = $return->customer?->customer_email ?? $return->customer?->email;
                $message = $customerEmail ? EmailTemplate::sendEmailTemplate('Sales Invoice Return', [$customerEmail], $emailData) : ['is_success' => true];
                if ($message['is_success'] == false && !empty($message['error'])) {
                    return back()
                        ->with('success', __('The sales return has been created successfully.'))
                        ->with('error', $message['error']);
                }
            }
        } catch (\Throwable $th) {
            return back()->with('error', $th->getMessage());
        }

        return redirect()->route('sales-returns.index')->with('success', __('The sales return has been created successfully.'));
    }

    public function show(SalesInvoiceReturn $salesReturn)
    {
        if (!Auth::user()->can('view-sales-return-invoices') || $salesReturn->created_by != creatorId()) {
            return redirect()->route('sales-returns.index')->with('error', __('Permission denied'));
        }

        if (!$this->checkReturnAccess($salesReturn)) {
            return redirect()->route('sales-returns.index')->with('error', __('Permission denied'));
        }

        $salesReturn->load(['customer', 'warehouse', 'customerDetails', 'originalInvoice', 'items.product']);

        return Inertia::render('SalesReturns/View', [
            'return' => $salesReturn
        ]);
    }

    public function approve(SalesInvoiceReturn $salesReturn)
    {
        if (!Auth::user()->can('approve-sales-returns-invoices')) {
            return redirect()->route('sales-returns.index')->with('error', __('Permission denied'));
        }

        if ($salesReturn->status !== 'draft') {
            return redirect()->back()->with('error', __('Only draft returns can be approved.'));
        }

        $salesReturn->update(['status' => 'approved']);

        return redirect()->route('sales-returns.index')->with('success', __('The sales return has been approved successfully. Credit note has been created automatically.'));
    }

    public function complete(SalesInvoiceReturn $salesReturn)
    {
        if (!Auth::user()->can('complete-sales-returns-invoices')) {
            return redirect()->route('sales-returns.index')->with('error', __('Permission denied'));
        }

        if ($salesReturn->status !== 'approved') {
            return redirect()->back()->with('error', __('Only approved returns can be completed.'));
        }

        CompleteSalesReturn::dispatch($salesReturn);

        $salesReturn->update(['status' => 'completed']);

        return redirect()->route('sales-returns.index')->with('success', __('The sales return has been completed successfully.'));
    }

    public function destroy(SalesInvoiceReturn $salesReturn)
    {
        if (!Auth::user()->can('delete-sales-return-invoices')) {
            return redirect()->route('sales-returns.index')->with('error', __('Permission denied'));
        }

        if ($salesReturn->status !== 'draft') {
            return redirect()->back()->with('error', __('Only draft returns can be deleted.'));
        }

        $salesReturn->delete();

        return redirect()->route('sales-returns.index')->with('success', __('The sales return has been deleted.'));
    }

    private function calculateReturnTotals(array $items, $originalInvoiceId): array
    {
        $originalInvoice = SalesInvoice::with(['items.taxes'])->find($originalInvoiceId);

        $subtotal = 0;
        $totalTax = 0;
        $totalDiscount = 0;

        foreach ($items as $item) {
            $originalItem = $originalInvoice?->items->where('id', $item['original_invoice_item_id'])->first();

            $lineTotal = ($item['return_quantity'] ?? 0) * ($item['unit_price'] ?? 0);
            $discountPercentage = $originalItem ? $originalItem->discount_percentage : 0;
            $discountAmount = ($lineTotal * $discountPercentage) / 100;
            $afterDiscount = $lineTotal - $discountAmount;
            $taxPercentage = $originalItem ? $originalItem->tax_percentage : 0;
            $taxAmount = ($afterDiscount * $taxPercentage) / 100;

            $subtotal += $lineTotal;
            $totalDiscount += $discountAmount;
            $totalTax += $taxAmount;
        }

        return [
            'subtotal' => $subtotal,
            'tax_amount' => $totalTax,
            'discount_amount' => $totalDiscount,
            'total_amount' => $subtotal + $totalTax - $totalDiscount
        ];
    }

    private function createReturnItems($returnId, array $items, $originalInvoiceId): void
    {
        $originalInvoice = SalesInvoice::with(['items.taxes'])->find($originalInvoiceId);

        foreach ($items as $itemData) {
            $originalItem = $originalInvoice?->items->where('id', $itemData['original_invoice_item_id'])->first();

            $lineTotal = ($itemData['return_quantity'] ?? 0) * ($itemData['unit_price'] ?? 0);
            $discountPercentage = $originalItem ? $originalItem->discount_percentage : 0;
            $discountAmount = ($lineTotal * $discountPercentage) / 100;
            $afterDiscount = $lineTotal - $discountAmount;
            $taxPercentage = $originalItem ? $originalItem->tax_percentage : 0;
            $taxAmount = ($afterDiscount * $taxPercentage) / 100;
            $totalAmount = $afterDiscount + $taxAmount;

            $item = SalesInvoiceReturnItem::create([
                'return_id' => $returnId,
                'product_id' => $itemData['product_id'],
                'original_invoice_item_id' => $itemData['original_invoice_item_id'],
                'original_quantity' => $originalItem ? $originalItem->quantity : 0,
                'return_quantity' => $itemData['return_quantity'],
                'unit_price' => $itemData['unit_price'],
                'discount_percentage' => $discountPercentage,
                'discount_amount' => $discountAmount,
                'tax_percentage' => $taxPercentage,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'reason' => $itemData['reason'] ?? null,
            ]);

            // Store individual taxes
            if ($originalItem && $originalItem->taxes) {
                foreach ($originalItem->taxes as $tax) {
                    SalesInvoiceReturnItemTax::create([
                        'item_id' => $item->id,
                        'tax_name' => $tax->tax_name,
                        'tax_rate' => $tax->tax_rate,
                    ]);
                }
            }
        }
    }
}

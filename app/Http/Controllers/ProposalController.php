<?php

namespace App\Http\Controllers;

use App\Http\Requests\ConvertSalesOrderRequest;
use App\Http\Requests\StoreProposalRequest;
use App\Http\Requests\UpdateProposalRequest;
use App\Models\Proposal;
use App\Models\ProposalSetting;
use App\Models\ProposalSubject;
use App\Models\User;
use App\Models\UserGroup;
use App\Services\CustomerService;
use App\Services\ProposalService;
use App\Services\WarehouseService;
use Automas\ProductService\Models\ProductServiceItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Inertia\Inertia;
use Spatie\LaravelPdf\Facades\Pdf;

class ProposalController extends Controller
{
    public function __construct(
        protected ProposalService $proposalService,
        protected CustomerService $customerService,
        protected WarehouseService $warehouseService
    ) {
    }

    /**
     * Display proposal list & board view.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        if (!$user->can('manage-sales-proposals')) {
            return back()->with('error', __('Permission denied'));
        }

        $creatorId = creatorId();

        $query = Proposal::with(['customer', 'author', 'items.product.warehouseStocks', 'items.taxes']);

        if (
            $user->type === 'superadmin' ||
            $user->type === 'company' ||
            $user->can('manage-any-sales-proposals')
        ) {
            $query->where('created_by', $creatorId);
        } elseif ($user->can('manage-own-sales-proposals')) {
            $query->where('created_by', $creatorId)
                ->where('creator_id', $user->id);
        } else {
            $query->whereRaw('1 = 0');
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($query) use ($search) {
                $query->where('proposal_number', 'like', "%{$search}%")
                    ->orWhere('reference', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($query) use ($search) {
                        $query->where('customer_name', 'like', "%{$search}%")
                            ->orWhere('customer_email', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('date_range')) {
            $dates = explode(' - ', $request->date_range);

            if (count($dates) === 2) {
                $query->whereBetween('proposal_date', $dates);
            }
        }

        $stats = $this->proposalService->getStats($query);

        $proposals = clone $query;

        if ($request->filled('status')) {
            if ($request->status === 'expired') {
                $proposals->where('due_date', '<', now())
                    ->whereNotIn('status', ['accepted', 'rejected']);
            } else {
                $proposals->where('status', $request->status);
            }
        }

        $allowedSorts = [
            'proposal_number',
            'reference',
            'subject',
            'proposal_date',
            'due_date',
            'subtotal',
            'tax_amount',
            'total_amount',
            'status',
            'created_at',
        ];

        $sort = in_array($request->sort, $allowedSorts)
            ? $request->sort
            : 'created_at';

        $direction = $request->input('direction', 'desc');

        $proposals = $proposals
            ->orderBy($sort, $direction)
            ->paginate($request->input('per_page', 10))
            ->through(function ($proposal) {
                $proposal->public_print_url = route(
                    'sales-proposals.public-print',
                    Crypt::encryptString($proposal->id)
                );

                return $proposal;
            });

        $boardData = null;

        if ($request->input('view', 'board') !== 'list') {
            $boardData = $this->proposalService->getBoardData($query);

            if (is_array($boardData)) {
                foreach ($boardData as $items) {
                    if (!is_iterable($items)) {
                        continue;
                    }

                    foreach ($items as $proposal) {
                        $proposal->public_print_url = route(
                            'sales-proposals.public-print',
                            Crypt::encryptString($proposal->id)
                        );
                    }
                }
            }
        }

        $customers = $this->customerService->getCustomers();

        $users = User::where('created_by', $creatorId)
            ->emp()
            ->select('id', 'name', 'email')
            ->get();

        $userGroups = UserGroup::where('created_by', $creatorId)
            ->active()
            ->select('id', 'name')
            ->get();

        return Inertia::render('Proposal/Index', [
            'proposals' => $proposals,
            'customers' => $customers,
            'users' => $users,
            'userGroups' => $userGroups,
            'stats' => $stats,
            'boardData' => $boardData,
            'filters' => $request->only([
                'customer_id',
                'status',
                'search',
                'date_range',
            ]),
        ]);
    }

    /**
     * Show create proposal form.
     */
    public function create()
    {
        if (!Auth::user()->can('create-sales-proposals')) {
            return back()->with('error', __('Permission denied'));
        }

        $customers = $this->customerService->getCustomers();
        $warehouses = $this->warehouseService->getActiveWarehouses();
        $pages = $this->proposalService->getActivePages(Auth::id());
        $proposalSetting = ProposalSetting::getSettings(creatorId());
        $subjects = ProposalSubject::where('created_by', creatorId())
            ->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Proposal/Create', [
            'customers' => $customers,
            'warehouses' => $warehouses,
            'pages' => $pages,
            'proposalSetting' => $proposalSetting,
            'subjects' => $subjects,
        ]);
    }

    /**
     * Store newly created proposal.
     */
    public function store(StoreProposalRequest $request)
    {
        if (!Auth::user()->can('create-sales-proposals')) {
            return redirect()->route('sales-proposals.index')->with('error', __('Permission denied'));
        }

        $validatedData = $request->validated();
        $proposal = $this->proposalService->createProposal($validatedData);

        $status = $proposal ? 'success' : 'error';
        $message = $proposal ? __('Proposal created successfully.') : __('Failed to create proposal');

        return redirect()->route('sales-proposals.index')->with($status, $message);
    }

    /**
     * Show single proposal view.
     */
    public function show(Proposal $proposal)
    {
        if (!Auth::user()->can('view-sales-proposals') || !$this->proposalService->hasProposalAccess($proposal)) {
            return redirect()->route('sales-proposals.index')->with('error', __('Permission denied'));
        }

        $proposal->load($this->proposalService->getRelations());
        $customers = $this->customerService->getCustomers();
        $users = User::where('created_by', creatorId())
            ->emp()
            ->select('id', 'name', 'email')
            ->get();
        $userGroups = UserGroup::where('created_by', creatorId())
            ->active()
            ->select('id', 'name')
            ->get();

        return Inertia::render('Proposal/View', [
            'proposal' => $proposal,
            'customers' => $customers,
            'users' => $users,
            'userGroups' => $userGroups,
        ]);
    }

    /**
     * Show edit proposal form.
     */
    public function edit(Proposal $proposal)
    {
        if (!Auth::user()->can('edit-sales-proposals') || !$this->proposalService->hasProposalAccess($proposal)) {
            return redirect()->route('sales-proposals.index')->with('error', __('Permission denied'));
        }

        if ($proposal->converted_to_invoice) {
            return redirect()->route('sales-proposals.index')->with('error', __('Cannot update converted proposal.'));
        }

        if ($proposal->status === 'accepted' || $proposal->converted_to_invoice) {
            return redirect()->route('sales-proposals.index')->with('error', __('Cannot edit an accepted or converted proposal.'));
        }

        $proposal->load($this->proposalService->getRelations());
        $customers = $this->customerService->getCustomers();
        $warehouses = $this->warehouseService->getActiveWarehouses();
        $proposalSetting = ProposalSetting::getSettings(creatorId());
        $pages = $this->proposalService->getActivePages(Auth::id());
        $products = $this->warehouseService->getWarehouseProducts($proposal->warehouse_id);
        $subjects = ProposalSubject::where('created_by', creatorId())->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Proposal/Edit', [
            'proposal' => $proposal,
            'customers' => $customers,
            'warehouses' => $warehouses,
            'products' => $products,
            'pages' => $pages,
            'proposalSetting' => $proposalSetting,
            'subjects' => $subjects,
        ]);
    }

    /**
     * Update specified proposal.
     */
    public function update(UpdateProposalRequest $request, Proposal $proposal)
    {
        if (!Auth::user()->can('edit-sales-proposals') || !$this->proposalService->hasProposalAccess($proposal)) {
            return redirect()->route('sales-proposals.index')->with('error', __('Permission denied'));
        }

        if ($proposal->status === 'accepted' || $proposal->converted_to_invoice) {
            return redirect()->route('sales-proposals.index')->with('error', __('Cannot update an accepted or converted proposal.'));
        }

        $validatedData = $request->validated();
        $updatedProposal = $this->proposalService->updateProposal($proposal, $validatedData);
        $status = $updatedProposal ? 'success' : 'error';
        $message = $updatedProposal ? __('Proposal updated successfully.') : __('Failed to update proposal');

        return redirect()->route('sales-proposals.index')->with($status, $message);
    }

    /**
     * Remove specified proposal.
     */
    public function destroy(Proposal $proposal)
    {
        if (!Auth::user()->can('delete-sales-proposals') || !$this->proposalService->hasProposalAccess($proposal)) {
            return redirect()->route('sales-proposals.index')
                ->with('error', __('Permission denied'));
        }

        if ($proposal->converted_to_invoice) {
            return back()->withErrors([
                'error' => __('Cannot delete converted proposal.')
            ]);
        }

        $deleted = $proposal->delete();
        $status = $deleted ? 'success' : 'error';
        $message = $deleted ? __('Proposal deleted successfully.') :
            __('Failed to delete proposal');

        return redirect()->route('sales-proposals.index')->with($status, $message);
    }

    /**
     * Duplicate existing proposal record.
     */
    public function duplicate(Proposal $proposal)
    {
        if (!Auth::user()->can('create-sales-proposals') || !$this->proposalService->hasProposalAccess($proposal)) {
            return back()->with('error', __('Permission denied'));
        }

        $newProposal = $this->proposalService->duplicateProposal($proposal);
        $status = $newProposal ? 'success' : 'error';
        $message = $newProposal ? __('Proposal duplicated successfully.') :
            __('Failed to duplicate proposal');

        if ($newProposal) {
            return redirect()->route('sales-proposals.edit', $newProposal->id)
                ->with($status, $message);
        }

        return back()->with($status, $message);
    }

    /**
     * Mark proposal as sent and notify customer.
     */
    public function sent(Proposal $proposal)
    {
        if (!Auth::user()->can('sent-sales-proposals') || !$this->proposalService->hasProposalAccess($proposal)) {
            return back()->with('error', __('Permission denied'));
        }

        if (!in_array($proposal->status, ['draft', 'sent'])) {
            return back()->with('error', __('Only draft or sent proposals can be sent.'));
        }

        $notification = $this->proposalService->notifyCustomerOnStatusChange($proposal, 'Proposal Sent');

        if (isset($notification) && $notification['is_success'] === false && !empty($notification['error'])) {
            $proposal->update(['status' => 'sent']);

            return back()
                ->with('success', __('Proposal sent successfully.'))
                ->with('error', $notification['error']);
        }
        $proposal->update(['status' => 'sent']);

        return back()->with('success', __('Proposal sent successfully.'));
    }

    /**
     * Mark proposal as accepted.
     */
    public function accept(Proposal $proposal)
    {
        if (!Auth::user()->can('accept-sales-proposals') || !$this->proposalService->hasProposalAccess($proposal)) {
            return back()->with('error', __('Permission denied'));
        }

        if ($proposal->status !== 'sent') {
            return back()->with('error', __('Only sent proposals can be accepted.'));
        }

        $notification = $this->proposalService->notifyCustomerOnStatusChange($proposal, 'Proposal Approved', 'Accepted');

        if (isset($notification) && $notification['is_success'] === false && !empty($notification['error'])) {
            $proposal->update(['status' => 'accepted']);

            return back()
                ->with('success', __('Proposal accepted successfully.'))
                ->with('error', $notification['error']);
        }

        $proposal->update(['status' => 'accepted']);

        return back()->with('success', __('Proposal accepted successfully.'));
    }

    /**
     * Mark proposal as rejected.
     */
    public function reject(Proposal $proposal)
    {
        if (!Auth::user()->can('reject-sales-proposals') || !$this->proposalService->hasProposalAccess($proposal)) {
            return back()->with('error', __('Permission denied'));
        }

        if ($proposal->status !== 'sent') {
            return back()->with('error', __('Only sent proposals can be rejected.'));
        }

        $notification = $this->proposalService->notifyCustomerOnStatusChange($proposal, 'Proposal Approved', 'Rejected');

        if (isset($notification) && $notification['is_success'] === false && !empty($notification['error'])) {
            $proposal->update(['status' => 'rejected']);

            return back()
                ->with('success', __('Proposal rejected successfully.'))
                ->with('error', $notification['error']);
        }

        $proposal->update(['status' => 'rejected']);

        return back()->with('success', __('Proposal rejected successfully.'));
    }

    /**
     * Convert proposal to sales order.
     */
    public function convertToSalesOrder(ConvertSalesOrderRequest $request, Proposal $proposal)
    {
        if (!Auth::user()->can('convert-sales-proposals') || !$this->proposalService->hasProposalAccess($proposal)) {
            return back()->with('error', __('Permission denied'));
        }

        if ($proposal->status !== 'accepted') {
            return back()->with('error', __('Only accepted proposals can be converted to sales order.'));
        }

        if ($proposal->converted_to_sales_order || $proposal->sales_order_id) {
            return back()->with('error', __('Proposal has already been converted to sales order.'));
        }

        try {
            $customItems = $request->has('items') ? $request->input('items') : null;
            $warehouseId = $request->input('warehouse_id') ? (int) $request->input('warehouse_id') : null;
            $salesOrder = $this->proposalService->convertProposalToSalesOrder($proposal, $customItems, $warehouseId, $request->validated());

            if (\Route::has('salesorder.orders.show')) {
                return redirect()->route('salesorder.orders.show', $salesOrder->id)->with('success', __('Proposal successfully converted to sales order.'));
            }

            return back()->with('success', __('Proposal successfully converted to sales order.'));
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Convert proposal to invoice (products only).
     */
    public function convertToInvoice(Request $request, Proposal $proposal)
    {
        if (!Auth::user()->can('convert-sales-proposals') || !$this->proposalService->hasProposalAccess($proposal)) {
            return back()->with('error', __('Permission denied'));
        }

        if ($proposal->status !== 'accepted') {
            return back()->with('error', __('Only accepted proposals can be converted to invoice.'));
        }

        if ($proposal->converted_to_invoice) {
            return back()->with('error', __('Proposal has already been converted to invoice.'));
        }

        try {
            $customItems = $request->has('items') ? $request->input('items') : null;
            $warehouseId = $request->input('warehouse_id') ? (int) $request->input('warehouse_id') : null;

            $invoice = $this->proposalService->convertProposalToInvoice($proposal, $customItems, $warehouseId);

            return redirect()->route('sales-invoices.show', $invoice->id)->with('success', __('Proposal successfully converted to invoice.'));
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Get proposal conversion details (items with product relations and warehouse products).
     */
    public function convertDetails(Proposal $proposal)
    {
        if (!Auth::user()->can('convert-sales-proposals') || !$this->proposalService->hasProposalAccess($proposal)) {
            return response()->json(['error' => __('Permission denied')], 403);
        }

        $proposal->load(['customer', 'warehouse', 'items.product.unitRelation', 'items.taxes']);

        $warehouseId = $proposal->warehouse_id;
        $products = $this->warehouseService->getWarehouseProducts($warehouseId);

        return response()->json([
            'proposal' => $proposal,
            'products' => $products,
        ]);
    }

    /**
     * Print proposal view.
     */
    public function print(Proposal $proposal)
    {
        if (!Auth::user()->can('print-sales-proposals') || !$this->proposalService->hasProposalAccess($proposal)) {
            return back()->with('error', __('Permission denied'));
        }

        $proposal->load($this->proposalService->getRelations());
        $authorId = $proposal->creator_id ?? Auth::id();
        $pages = $this->proposalService->getActivePages($authorId, $proposal->created_by);
        $proposalSetting = ProposalSetting::getSettings(creatorId());

        return inertia('Proposal/Print', [
            'proposal' => $proposal,
            'pages' => $pages,
            'proposalSetting' => $proposalSetting,
        ]);
    }

    /**
     * Public print proposal view via encrypted token.
     */
    public function publicPrint(string $token)
    {
        $id = null;
        try {
            $id = Crypt::decryptString($token);
        } catch (\Throwable $e) {
            try {
                $id = Crypt::decryptString(urldecode($token));
            } catch (\Throwable $e2) {
                if (is_numeric($token)) {
                    $id = $token;
                }
            }
        }

        if (!$id) {
            abort(404, 'Invalid or expired link.');
        }

        $proposal = Proposal::findOrFail($id);

        $proposal->load($this->proposalService->getRelations());
        $authorId = $proposal->creator_id ?? $proposal->created_by;
        $pages = $this->proposalService->getActivePages($authorId, $proposal->created_by);
        $proposalSetting = array_merge(
            ProposalSetting::getSettings($proposal->created_by) ?? [],
            array_filter(ProposalSetting::getSettings($proposal->creator_id) ?? [])
        );

        return inertia('Proposal/Print', [
            'proposal' => $proposal,
            'pages' => $pages,
            'proposalSetting' => $proposalSetting,
        ]);
    }

    /**
     * Download PDF version of proposal.
     */
    public function downloadPdf(Proposal $proposal)
    {
        if (!Auth::user()->can('print-sales-proposals') || !$this->proposalService->hasProposalAccess($proposal)) {
            return back()->with('error', __('Permission denied'));
        }

        $proposal->load($this->proposalService->getRelations());
        $authorId = $proposal->creator_id ?? Auth::id();
        $pages = $this->proposalService->getActivePages($authorId);
        $proposalSetting = ProposalSetting::getSettings(creatorId());

        $fileName = "Proposal For_{$proposal->subject}_({$proposal->proposal_number}).pdf";

        return Pdf::view('sales-proposals.print', [
            'proposal' => $proposal,
            'pages' => $pages,
            'proposalSetting' => $proposalSetting,
            'isServerPdf' => true,
        ])
            ->format('a4')
            ->margins(0, 0, 0, 0)
            ->download($fileName);
    }

    /**
     * AJAX endpoint for warehouse products.
     */
    public function getWarehouseProducts(Request $request)
    {
        if (!Auth::user()->can('create-sales-proposals') && !Auth::user()->can('edit-sales-proposals') && !Auth::user()->can('convert-sales-proposals') && !Auth::user()->can('view-sales-proposals')) {
            return response()->json([], 403);
        }

        $warehouseId = $request->warehouse_id ? (int) $request->warehouse_id : null;
        $products = $this->warehouseService->getWarehouseProducts($warehouseId);

        return response()->json($products);
    }

    /**
     * AJAX endpoint for services.
     */
    public function getServices(Request $request)
    {
        if (!Auth::user()->can('create-sales-proposals') && !Auth::user()->can('edit-sales-proposals') && !Auth::user()->can('convert-sales-proposals') && !Auth::user()->can('view-sales-proposals')) {
            return response()->json([], 403);
        }

        $services = ProductServiceItem::with('unitRelation:id,unit_name')
            ->select('id', 'name', 'sku', 'description', 'long_description', 'sale_price', 'tax_ids', 'unit', 'type')
            ->where('is_active', true)
            ->where('type', 'service')
            ->where(function ($q) {
                $q->where('created_by', creatorId())
                    ->orWhere('creator_id', creatorId());
            })
            ->get()
            ->map(function ($service) {
                $unitName = $service->unitRelation?->unit_name ?? (is_numeric($service->unit) ? '' : ($service->unit ?? ''));

                return [
                    'id' => $service->id,
                    'name' => $service->name,
                    'description' => $service->description,
                    'long_description' => $service->long_description,
                    'sku' => $service->sku,
                    'sale_price' => $service->sale_price,
                    'unit' => $service->unit,
                    'unit_name' => $unitName,
                    'type' => $service->type,
                    'taxes' => $service->taxes->map(fn($tax) => [
                        'id' => $tax->id,
                        'tax_name' => $tax->tax_name,
                        'rate' => $tax->rate,
                    ]),
                ];
            });

        return response()->json($services);
    }
}

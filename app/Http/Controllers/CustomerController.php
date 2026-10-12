<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Models\Customer;
use App\Services\CustomerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CustomerController extends Controller
{
    protected CustomerService $customerService;

    public function __construct(CustomerService $customerService)
    {
        $this->customerService = $customerService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        if (!Auth::user()->can('manage-customers') && !Auth::user()->can('manage-users')) {
            return back()->with('error', __('Permission denied'));
        }

        $customers = Customer::query()
            ->with(['creator:id,name,email'])
            ->withCount(['proposals', 'salesInvoices', 'salesReturns'])
            ->where('created_by', creatorId())
            ->when($request->filled('customer_name'), fn($q) => $q
                ->where('customer_name', 'like', '%' . $request->customer_name . '%'))
            ->when($request->filled('customer_code'), fn($q) => $q
                ->where('customer_code', 'like', '%' . $request->customer_code . '%'))
            ->when($request->filled('search'), fn($q) => $q->where(function ($sub) use ($request) {
                $s = $request->search;
                $sub->where('customer_name', 'like', "%{$s}%")
                    ->orWhere('customer_code', 'like', "%{$s}%")
                    ->orWhere('customer_email', 'like', "%{$s}%")
                    ->orWhere('customer_phone', 'like', "%{$s}%")
                    ->orWhere('contact_person_name', 'like', "%{$s}%")
                    ->orWhere('contact_person_email', 'like', "%{$s}%");
            }))
            ->when($request->filled('sort'), fn($q) => $q->orderBy($request->sort, $request->get('direction', 'asc')), fn($q) => $q->latest())
            ->paginate($request->get('per_page', 10), ['*'], 'customers_page')
            ->withQueryString();

        return Inertia::render('customers/index', [
            'customers' => $customers,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreCustomerRequest $request)
    {
        if (!Auth::user()->can('create-users') && !Auth::user()->can('manage-customers')) {
            return back()->with('error', __('Permission denied'));
        }

        $validatedData = $request->validated();
        $customer = $this->customerService->createCustomer($validatedData);

        $status = $customer ? 'success' : 'error';
        $message = $customer ? __('Customer created successfully.') :
            __('Failed to create customer.');

        return redirect()->back()->with($status, $message);
    }

    /**
     * Display the specified resource.
     */
    public function show(Customer $customer)
    {
        if ($customer->created_by !== creatorId()) {
            return back()->with('error', __('Permission denied'));
        }

        $customer->load(['creator:id,name,email', 'company:id,name,email'])
            ->loadCount(['proposals', 'salesInvoices', 'salesReturns']);

        return response()->json($customer);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCustomerRequest $request, Customer $customer)
    {
        if (!Auth::user()->can('edit-users') && !Auth::user()->can('manage-customers')) {
            return back()->with('error', __('Permission denied'));
        }
        if ($customer->created_by !== creatorId()) {
            return back()->with('error', __('Permission denied'));
        }

        $validatedData = $request->validated();
        $updated = $this->customerService->updateCustomer($customer, $validatedData);

        $status = $updated ? 'success' : 'error';
        $message = $updated ? __('Customer updated successfully.') :
            __('Failed to update customer.');

        return redirect()->back()->with($status, $message);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Customer $customer)
    {
        if (!Auth::user()->can('delete-users') && !Auth::user()->can('manage-customers')) {
            return back()->with('error', __('Permission denied'));
        }
        if ($customer->created_by !== creatorId()) {
            return back()->with('error', __('Permission denied'));
        }

        $deleted = $this->customerService->deleteCustomer($customer);

        $status = $deleted ? 'success' : 'error';
        $message = $deleted ? __('Customer deleted successfully.') :
            __('Failed to delete customer.');

        return redirect()->back()->with($status, $message);
    }
}

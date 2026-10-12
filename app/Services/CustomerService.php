<?php

namespace App\Services;

use App\Models\Customer;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CustomerService
{
    public function getCustomers()
    {
        return Customer::where('created_by', creatorId())->get();
    }

    public function getActiveCustomers()
    {
        return Customer::where('created_by', creatorId())
            ->where('is_active', 1)
            ->get();
    }

    public function getInActiveCustomers()
    {
        return Customer::where('created_by', creatorId())
            ->where('is_active', 0)
            ->get();
    }

    public function createCustomer(array $data): Customer
    {
        $creatorId = creatorId();
        $customerCode = $this->generateCustomerCode($creatorId);

        $data = array_merge($data, [
            'customer_code' => $customerCode,
            'creator_id' => Auth::id() ?? $creatorId,
            'created_by' => $creatorId,
        ]);

        return Customer::create($data);
    }

    public function updateCustomer(Customer $customer, array $data): Customer
    {
        if (!empty($data['same_as_billing']) && isset($data['billing_address'])) {
            $data['shipping_address'] = $data['billing_address'];
        }
        $customer->update($data);

        return $customer;
    }

    public function deleteCustomer(Customer $customer): bool
    {
        return (bool) $customer->delete();
    }

    /**
     * Generate next customer code (e.g., CUST-0001)
     */
    public function generateCustomerCode(?int $creatorId = null): string
    {
        $creatorId = $creatorId ?? creatorId();
        $latestCustomer = Customer::where('created_by', $creatorId)->latest('id')->first();
        $nextNumber = 1;
        if ($latestCustomer && preg_match('/CUST-(\d+)/i', $latestCustomer->customer_code, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return 'CUST-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }
}


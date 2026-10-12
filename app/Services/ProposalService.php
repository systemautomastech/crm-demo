<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\EmailTemplate;
use App\Models\ProposalPage;
use App\Models\SalesInvoice;
use App\Models\SalesInvoiceItem;
use App\Models\SalesInvoiceItemTax;
use App\Models\Proposal;
use App\Models\ProposalContent;
use App\Models\ProposalItem;
use App\Models\ProposalItemTax;
use App\Models\User;
use App\Models\UserGroup;
use Automas\ProductService\Models\ProductServiceItem;
use Automas\SalesOrder\Models\SalesOrder;
use Automas\SalesOrder\Models\SalesOrderItem;
use Automas\SalesOrder\Models\SalesOrderItemTax;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;

class ProposalService
{
    public function __construct(
        protected WarehouseService $warehouseService
    ) {
    }

    public function getRelations(): array
    {
        return [
            'customer',
            'warehouse',
            'items.product.unitRelation',
            'items.product.warehouseStocks',
            'items.taxes',
            'contents'
        ];
    }

    public function hasProposalAccess(Proposal $proposal): bool
    {
        if ($proposal->created_by != creatorId()) {
            return false;
        }

        $user = Auth::user();

        if ($user->type === 'superadmin' || $user->type === 'company' || $user->can('manage-any-sales-proposals')) {
            return true;
        }

        if ($user->can('manage-own-sales-proposals')) {
            return $proposal->creator_id == $user->id;
        }

        return false;
    }

    public function getActivePages(int $authorId)
    {
        return ProposalPage::where('created_by', creatorId())
            ->where('creator_id', $authorId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'title', 'content', 'page_type', 'background_image', 'sort_order', 'creator_id', 'created_by']);
    }

    public function notifyCustomerOnStatusChange(Proposal $proposal, string $templateName, ?string $statusLabel = null): ?array
    {
        $recipient = null;

        if ($templateName === 'Proposal Sent') {
            $recipient = $proposal->customer?->email ?: $proposal->customer_email;
        } elseif ($templateName === 'Proposal Approved') {
            $author = User::find($proposal->creator_id);
            $recipient = company_setting('company_email', $proposal->created_by) ?: $author?->email;
        }

        if (empty($recipient) || company_setting($templateName) !== 'on') {
            return null;
        }

        $data = [
            'proposal_number' => $proposal->proposal_number ?? null,
            'sales_customer_name' => $proposal->customer?->customer_name ?: ($proposal->customer?->name ?: ($proposal->customer_name ?: 'Customer')),
            'total_amount' => $proposal->total_amount ?? null,
            'discount_amount' => $proposal->discount_amount ?? null,
        ];

        if ($statusLabel) {
            $data['status'] = $statusLabel;
        }

        return EmailTemplate::sendEmailTemplate($templateName, [$recipient], $data);
    }

    public function getStats($query): array
    {
        $stats = (clone $query)->withoutEagerLoads()
            ->selectRaw('
                COUNT(*) as total_count,
                SUM(total_amount) as total_value,
                SUM(CASE WHEN due_date < ? AND status NOT IN ("accepted", "rejected") THEN 1 ELSE 0 END) as overdue_count,
                SUM(CASE WHEN status = "accepted" AND converted_to_invoice IS NULL THEN 1 ELSE 0 END) as accepted_active_count,
                SUM(CASE WHEN status = "draft" THEN 1 ELSE 0 END) as draft_count,
                SUM(CASE WHEN status = "draft" THEN total_amount ELSE 0 END) as draft_value,
                SUM(CASE WHEN status = "sent" THEN 1 ELSE 0 END) as sent_count,
                SUM(CASE WHEN status = "sent" THEN total_amount ELSE 0 END) as sent_value,
                SUM(CASE WHEN status = "accepted" THEN 1 ELSE 0 END) as accepted_count,
                SUM(CASE WHEN status = "accepted" THEN total_amount ELSE 0 END) as accepted_value,
                SUM(CASE WHEN status = "rejected" THEN 1 ELSE 0 END) as rejected_count,
                SUM(CASE WHEN status = "rejected" THEN total_amount ELSE 0 END) as rejected_value
            ', [now()])
            ->first();

        return [
            'total_count' => (int) ($stats->total_count ?? 0),
            'total_value' => (float) ($stats->total_value ?? 0),
            'overdue_count' => (int) ($stats->overdue_count ?? 0),
            'accepted_active_count' => (int) ($stats->accepted_active_count ?? 0),
            'draft_count' => (int) ($stats->draft_count ?? 0),
            'draft_value' => (float) ($stats->draft_value ?? 0),
            'sent_count' => (int) ($stats->sent_count ?? 0),
            'sent_value' => (float) ($stats->sent_value ?? 0),
            'accepted_count' => (int) ($stats->accepted_count ?? 0),
            'accepted_value' => (float) ($stats->accepted_value ?? 0),
            'rejected_count' => (int) ($stats->rejected_count ?? 0),
            'rejected_value' => (float) ($stats->rejected_value ?? 0),
        ];
    }

    public function getBoardData($query): array
    {
        $boardData = [];
        $baseQuery = (clone $query)->withoutEagerLoads()->with(['customer', 'author']);

        foreach (['draft', 'sent', 'accepted', 'rejected'] as $status) {
            $queryStatus = (clone $baseQuery)->where('status', $status);
            if ($status === 'accepted') {
                $queryStatus->whereNull('converted_to_invoice');
            }
            $boardData[$status] = $queryStatus->orderBy('created_at', 'desc')->limit(8)->get();
        }
        return $boardData;
    }

    public function hasRecurringBillingItems(?array $items): bool
    {
        if (empty($items)) {
            return false;
        }

        foreach ($items as $item) {
            if (($item['section'] ?? '') === 'mrc' && !empty($item['product_id'])) {
                return true;
            }
        }

        return false;
    }

    public function calculateProposalTotals(?array $items, bool $isTaxEnabled = true, array $options = []): array
    {
        $subtotal = 0.0;
        $tax = 0.0;
        $itemDiscountTotal = 0.0;

        $otcSubtotal = 0.0;
        $mrcSubtotal = 0.0;

        if (!empty($items)) {
            foreach ($items as $item) {
                if (empty($item['product_id']) || (int) $item['product_id'] <= 0) {
                    continue;
                }

                $qty = max(1, (int) ($item['quantity'] ?? 1));
                $price = max(0, (float) ($item['unit_price'] ?? 0));
                $lineTotal = $qty * $price;

                $discType = $item['discount_type'] ?? 'percentage';
                if ($discType === 'fixed') {
                    $discAmount = min($lineTotal, max(0, (float) ($item['discount_amount'] ?? 0)));
                } else {
                    $discRate = max(0, min(100, (float) ($item['discount_percentage'] ?? 0)));
                    $discAmount = ($lineTotal * $discRate) / 100;
                }

                $taxRate = 0.0;
                if ($isTaxEnabled) {
                    $taxRate = (float) ($item['tax_percentage'] ?? 0);
                    if (!empty($item['taxes']) && is_array($item['taxes'])) {
                        $taxRate = array_reduce($item['taxes'], fn($sum, $t) => $sum + (float) ($t['tax_rate'] ?? $t['rate'] ?? 0), 0.0);
                    }
                }

                $netTotal = $lineTotal - $discAmount;
                $taxAmount = ($netTotal * $taxRate) / 100;

                $subtotal += $lineTotal;
                $itemDiscountTotal += $discAmount;
                $tax += $taxAmount;

                $section = strtolower($item['section'] ?? 'otc');
                if ($section === 'mrc') {
                    $mrcSubtotal += $lineTotal;
                } else {
                    $otcSubtotal += $lineTotal;
                }
            }
        }

        // Section level discount calculations if provided
        $otcDiscount = 0.0;
        $otcDiscType = $options['otc_discount_type'] ?? 'percentage';
        $otcDiscVal = max(0, (float) ($options['otc_discount_value'] ?? 0));
        if ($otcDiscVal > 0) {
            $otcDiscount = $otcDiscType === 'percentage'
                ? ($otcSubtotal * min(100, $otcDiscVal)) / 100
                : min($otcSubtotal, $otcDiscVal);
        }

        $mrcDiscount = 0.0;
        $mrcDiscType = $options['mrc_discount_type'] ?? 'percentage';
        $mrcDiscVal = max(0, (float) ($options['mrc_discount_value'] ?? 0));
        if ($mrcDiscVal > 0) {
            $mrcDiscount = $mrcDiscType === 'percentage'
                ? ($mrcSubtotal * min(100, $mrcDiscVal)) / 100
                : min($mrcSubtotal, $mrcDiscVal);
        }

        $sectionDiscountTotal = $otcDiscount + $mrcDiscount;
        $finalDiscount = $sectionDiscountTotal > 0 ? $sectionDiscountTotal : $itemDiscountTotal;

        return [
            'subtotal' => round($subtotal, 2),
            'tax_amount' => round($tax, 2),
            'discount_amount' => round($finalDiscount, 2),
            'total_amount' => round(max(0, $subtotal + $tax - $finalDiscount), 2)
        ];
    }

    public function createProposal(array $data): Proposal
    {
        return DB::transaction(function () use ($data) {
            $isTaxEnabled = filter_var($data['is_tax_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $items = $data['items'] ?? [];
            $totals = $this->calculateProposalTotals($items, $isTaxEnabled, $data);

            $hasRecurring = $this->hasRecurringBillingItems($items);
            $isRecurring = $hasRecurring ? 1 : 0;
            $isPrepaid = ($hasRecurring && filter_var($data['is_prepaid'] ?? false, FILTER_VALIDATE_BOOLEAN)) ? 1 : 0;

            $date = $data['invoice_date'] ?? $data['proposal_date'] ?? now()->toDateString();
            $mode = $data['customer_mode'] ?? 'existing';

            $proposalData = array_merge($data, [
                'proposal_number' => Proposal::generateProposalNumber($date),
                'proposal_date' => $date,
                'due_date' => $data['due_date'] ?? $date,
                'status' => 'draft',
                'customer_id' => $mode === 'new' ? null : ($data['customer_id'] ?? null),
                'customer_name' => $mode === 'new' ? ($data['customer_name'] ?? null) : null,
                'customer_email' => $mode === 'new' ? ($data['customer_email'] ?? null) : null,
                'customer_phone' => $mode === 'new' ? ($data['customer_phone'] ?? null) : null,
                'customer_address' => $mode === 'new' ? ($data['customer_address'] ?? null) : null,
                'warehouse_id' => ($data['type'] ?? 'product') === 'product' ? ($data['warehouse_id'] ?? null) : null,
                'is_recurring' => $isRecurring,
                'is_prepaid' => $isPrepaid,
                'is_tax_enabled' => $isTaxEnabled ? 1 : 0,
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'discount_amount' => $totals['discount_amount'],
                'total_amount' => $totals['total_amount'],
                'creator_id' => Auth::id(),
                'created_by' => creatorId(),
            ]);

            $proposal = Proposal::create($proposalData);

            $this->saveProposalItems($proposal->id, $items, $isTaxEnabled);
            $this->saveProposalPageContents($proposal->id, $data['proposal_content'] ?? null);

            return $proposal;
        });
    }

    public function updateProposal(Proposal $proposal, array $data): Proposal
    {
        return DB::transaction(function () use ($proposal, $data) {
            $isTaxEnabled = filter_var($data['is_tax_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $items = $data['items'] ?? [];
            $totals = $this->calculateProposalTotals($items, $isTaxEnabled, $data);

            $hasRecurring = $this->hasRecurringBillingItems($items);
            $isRecurring = $hasRecurring ? 1 : 0;
            $isPrepaid = ($hasRecurring && filter_var($data['is_prepaid'] ?? false, FILTER_VALIDATE_BOOLEAN)) ? 1 : 0;

            $date = $data['invoice_date'] ?? $data['proposal_date'] ?? $proposal->proposal_date;
            $mode = $data['customer_mode'] ?? 'existing';
            $type = $data['type'] ?? $proposal->type ?? 'product';

            $updateData = array_merge($data, [
                'type' => $type,
                'proposal_date' => $date,
                'due_date' => $data['due_date'] ?? $proposal->due_date,
                'customer_id' => $mode === 'new' ? null : ($data['customer_id'] ?? null),
                'customer_name' => $mode === 'new' ? ($data['customer_name'] ?? null) : null,
                'customer_email' => $mode === 'new' ? ($data['customer_email'] ?? null) : null,
                'customer_phone' => $mode === 'new' ? ($data['customer_phone'] ?? null) : null,
                'customer_address' => $mode === 'new' ? ($data['customer_address'] ?? null) : null,
                'warehouse_id' => $type === 'product' ? ($data['warehouse_id'] ?? null) : null,
                'is_recurring' => $isRecurring,
                'is_prepaid' => $isPrepaid,
                'is_tax_enabled' => $isTaxEnabled ? 1 : 0,
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'discount_amount' => $totals['discount_amount'],
                'total_amount' => $totals['total_amount'],
            ]);

            $proposal->update($updateData);

            $proposal->items()->delete();
            $this->saveProposalItems($proposal->id, $items, $isTaxEnabled);
            $this->saveProposalPageContents($proposal->id, $data['proposal_content'] ?? null);

            return $proposal;
        });
    }

    public function duplicateProposal(Proposal $proposal): Proposal
    {
        return DB::transaction(function () use ($proposal) {
            $newProposal = $proposal->replicate();
            $newProposal->proposal_number = Proposal::generateProposalNumber($proposal->proposal_date);
            $newProposal->status = 'draft';
            $newProposal->converted_to_sales_order = false;
            $newProposal->sales_order_id = null;
            $newProposal->converted_to_invoice = null;
            $newProposal->converted_to_deal = null;
            $newProposal->creator_id = Auth::id();
            $newProposal->created_by = creatorId();
            $newProposal->save();

            $items = $proposal->items()->with('taxes')->get();
            foreach ($items as $item) {
                $newItem = $item->replicate();
                $newItem->proposal_id = $newProposal->id;
                $newItem->save();

                foreach ($item->taxes as $tax) {
                    $newTax = $tax->replicate();
                    $newTax->item_id = $newItem->id;
                    $newTax->save();
                }
            }

            if (Schema::hasTable('proposal_contents')) {
                $contents = ProposalContent::where('proposal_id', $proposal->id)->get();
                foreach ($contents as $content) {
                    $newContent = $content->replicate();
                    $newContent->proposal_id = $newProposal->id;
                    $newContent->creator_id = Auth::id();
                    $newContent->created_by = creatorId();
                    $newContent->save();
                }
            }

            return $newProposal;
        });
    }

    public function convertProposalToSalesOrder(Proposal $proposal, ?array $customItems = null, ?int $warehouseId = null, array $options = []): SalesOrder
    {
        return DB::transaction(function () use ($proposal, $customItems, $warehouseId, $options) {
            $targetWarehouseId = $warehouseId ?: $proposal->warehouse_id;

            // Handle Customer resolution (existing or new)
            $customerId = $proposal->customer_id;
            $billingAddress = $proposal->customer_address;
            $shippingAddress = $proposal->customer_address;

            if (!empty($options['customer_type'])) {
                if ($options['customer_type'] === 'new' && !empty($options['customer_name'])) {
                    $customerService = app(CustomerService::class);
                    $data = [
                        'customer_name' => $options['customer_name'],
                        'contact_person_name' => $options['customer_name'],
                        'customer_email' => $options['customer_email'] ?? $proposal->customer_email,
                        'contact_person_email' => $options['customer_email'] ?? $proposal->customer_email,
                        'customer_phone' => $options['customer_phone'] ?? $proposal->customer_phone,
                        'contact_person_mobile' => $options['customer_phone'] ?? $proposal->customer_phone,
                        'tax_number' => $options['tax_number'] ?? null,
                        'payment_terms' => $options['payment_terms'] ?? null,
                        'billing_address' => [
                            'name' => $options['billing_name'] ?? $options['customer_name'],
                            'address_line_1' => $options['billing_address_line_1'] ?? $options['billing_address'] ?? $options['customer_address'] ?? $proposal->customer_address,
                            'address_line_2' => $options['billing_address_line_2'] ?? null,
                            'city' => $options['billing_city'] ?? $options['customer_city'] ?? null,
                            'state' => $options['billing_state'] ?? $options['customer_state'] ?? null,
                            'zip_code' => $options['billing_zip_code'] ?? $options['billing_postal_code'] ?? $options['customer_zip_code'] ?? null,
                            'country' => $options['billing_country'] ?? $options['customer_country'] ?? null,
                        ],
                        'shipping_address' => [
                            'name' => $options['shipping_name'] ?? $options['customer_name'],
                            'address_line_1' => $options['shipping_address_line_1'] ?? $options['shipping_address'] ?? $options['customer_address'] ?? $proposal->customer_address,
                            'address_line_2' => $options['shipping_address_line_2'] ?? null,
                            'city' => $options['shipping_city'] ?? $options['customer_city'] ?? null,
                            'state' => $options['shipping_state'] ?? $options['customer_state'] ?? null,
                            'zip_code' => $options['shipping_zip_code'] ?? $options['shipping_postal_code'] ?? $options['customer_zip_code'] ?? null,
                            'country' => $options['shipping_country'] ?? $options['customer_country'] ?? null,
                        ],
                        'same_as_billing' => !empty($options['same_as_billing']),
                        'notes' => $options['notes'] ?? null,
                    ];

                    $newCustomer = $customerService->createCustomer($data);
                    $customerId = $newCustomer->id;
                    $billingAddress = $newCustomer->billing_address ?? $billingAddress;
                    $shippingAddress = $newCustomer->shipping_address ?? $shippingAddress;
                } elseif ($options['customer_type'] === 'existing' && !empty($options['customer_id'])) {
                    $customerId = (int) $options['customer_id'];
                    $customerObj = Customer::find($customerId);
                    if ($customerObj) {
                        $billingAddress = $customerObj->billing_address ?? $billingAddress;
                        $shippingAddress = $customerObj->shipping_address ?? $customerObj->billing_address ?? $shippingAddress;
                    }
                }
            }

            if (empty($customerId)) {
                throw new \Exception(__('Please select or create a new customer.'));
            }
            if ($customItems !== null) {
                $productItems = array_values(array_filter($customItems, function ($item) {
                    return !empty($item['product_id']) && (int) $item['product_id'] > 0;
                }));
            } else {
                $dbItems = $proposal->items()->with(['taxes', 'product'])->get();
                foreach ($dbItems as $item) {
                    $type = $item->product_type ?: ($item->product?->type ?? 'product');
                    $productItems[] = [
                        'product_id' => $item->product_id,
                        'product_type' => $type,
                        'description' => $item->description,
                        'quantity' => (int) ($item->quantity ?? 1),
                        'unit_price' => (float) ($item->unit_price ?? 0),
                        'discount_type' => $item->discount_type ?? 'percentage',
                        'discount_percentage' => (float) ($item->discount_percentage ?? 0),
                        'discount_amount' => (float) ($item->discount_amount ?? 0),
                        'tax_percentage' => (float) ($item->tax_percentage ?? 0),
                        'tax_amount' => (float) ($item->tax_amount ?? 0),
                        'total_amount' => (float) ($item->total_amount ?? 0),
                        'taxes' => $item->taxes ? $item->taxes->map(fn($t) => [
                            'tax_name' => $t->tax_name,
                            'tax_rate' => $t->tax_rate,
                        ])->toArray() : [],
                    ];
                }
            }

            if (empty($productItems)) {
                throw new \Exception(__('No products/items for sales order.'));
            }

            $subtotal = 0.0;
            $taxAmount = 0.0;
            $discountAmount = 0.0;

            foreach ($productItems as &$pItem) {
                $qty = max(1, (int) ($pItem['quantity'] ?? 1));
                $price = max(0, (float) ($pItem['unit_price'] ?? 0));
                $lineTotal = $qty * $price;

                $discType = $pItem['discount_type'] ?? 'percentage';
                if ($discType === 'fixed') {
                    $dAmount = min($lineTotal, max(0, (float) ($pItem['discount_amount'] ?? 0)));
                    $dPct = $lineTotal > 0 ? ($dAmount / $lineTotal) * 100 : 0;
                } else {
                    $dPct = max(0, min(100, (float) ($pItem['discount_percentage'] ?? 0)));
                    $dAmount = ($lineTotal * $dPct) / 100;
                }

                $taxRate = (float) ($pItem['tax_percentage'] ?? 0);
                if (!empty($pItem['taxes']) && is_array($pItem['taxes'])) {
                    $taxRate = array_reduce($pItem['taxes'], fn($sum, $t) => $sum + (float) ($t['tax_rate'] ?? $t['rate'] ?? 0), 0.0);
                }

                $afterDisc = max(0, $lineTotal - $dAmount);
                $tAmount = ($afterDisc * $taxRate) / 100;
                $totAmount = max(0, $afterDisc + $tAmount);

                $pItem['quantity'] = $qty;
                $pItem['unit_price'] = $price;
                $pItem['discount_type'] = $discType;
                $pItem['discount_percentage'] = round($dPct, 4);
                $pItem['discount_amount'] = round($dAmount, 2);
                $pItem['tax_percentage'] = round($taxRate, 4);
                $pItem['tax_amount'] = round($tAmount, 2);
                $pItem['total_amount'] = round($totAmount, 2);

                $subtotal += $lineTotal;
                $discountAmount += $dAmount;
                $taxAmount += $tAmount;
            }
            unset($pItem);

            $totalAmount = max(0, $subtotal + $taxAmount - $discountAmount);

            // Assignment handling
            $assignedGroupId = null;
            $assignmentStatus = SalesOrder::ASSIGNMENT_UNASSIGNED;
            if (!empty($options['assigned_group_id'])) {
                $assignedGroupId = (int) $options['assigned_group_id'];
                $assignmentStatus = SalesOrder::ASSIGNMENT_GROUP_ASSIGNED;
            }

            $salesOrder = SalesOrder::create([
                'name' => !empty($options['order_name']) ? $options['order_name'] : ($proposal->subject ?: ($proposal->proposal_number ?? 'From Proposal')),
                'proposal_id' => $proposal->id,
                'status' => SalesOrder::STATUS_CONFIRMED,
                'delivery_status' => SalesOrder::DELIVERY_STATUS_PENDING,
                'assignment_status' => $assignmentStatus,
                'assigned_group_id' => $assignedGroupId,
                'customer_id' => $customerId,
                'warehouse_id' => $targetWarehouseId,
                'order_date' => now()->toDateString(),
                'expected_delivery_date' => $proposal->due_date ? $proposal->due_date->format('Y-m-d') : now()->addDays(15)->format('Y-m-d'),
                'billing_address' => $billingAddress,
                'shipping_address' => $shippingAddress,
                'description' => $proposal->subject,
                'notes' => $proposal->notes,
                'subtotal' => round($subtotal, 2),
                'tax_amount' => round($taxAmount, 2),
                'discount_amount' => round($discountAmount, 2),
                'total_amount' => round($totalAmount, 2),
                'confirmed_at' => now(),
                'creator_id' => Auth::id() ?: ($proposal->creator_id ?: creatorId()),
                'created_by' => creatorId(),
            ]);

            foreach ($productItems as $item) {
                $orderItem = SalesOrderItem::create([
                    'order_id' => $salesOrder->id,
                    'product_id' => $item['product_id'],
                    'product_type' => $item['product_type'] ?? 'product',
                    'quantity' => $item['quantity'] ?? 1,
                    'unit_price' => $item['unit_price'] ?? 0,
                    'discount_type' => $item['discount_type'] ?? 'percentage',
                    'discount_percentage' => $item['discount_percentage'] ?? 0,
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_percentage' => $item['tax_percentage'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'final_price' => $item['total_amount'] ?? 0,
                    'total_amount' => $item['total_amount'] ?? 0,
                    'description' => $item['description'] ?? null,
                    'creator_id' => $salesOrder->creator_id,
                    'created_by' => $salesOrder->created_by,
                ]);

                if (!empty($item['taxes']) && is_array($item['taxes'])) {
                    foreach ($item['taxes'] as $tax) {
                        SalesOrderItemTax::create([
                            'item_id' => $orderItem->id,
                            'tax_name' => $tax['tax_name'] ?? $tax['name'] ?? 'Tax',
                            'tax_rate' => (float) ($tax['tax_rate'] ?? $tax['rate'] ?? 0),
                        ]);
                    }
                }
            }

            // Sync user assignments or group members
            if (!empty($assignedGroupId)) {
                $group = UserGroup::find($assignedGroupId);
                if ($group) {
                    $groupUserIds = $group->users()->pluck('users.id')->toArray();
                    $salesOrder->assignedUsers()->sync($groupUserIds);
                }
            } elseif (!empty($options['assigned_user_ids']) && is_array($options['assigned_user_ids'])) {
                $validIds = User::whereIn('id', $options['assigned_user_ids'])
                    ->where('created_by', creatorId())
                    ->pluck('id')
                    ->toArray();
                $salesOrder->assignedUsers()->sync($validIds);
            } elseif (!empty($options['assigned_user_id'])) {
                $validIds = User::whereIn('id', [(int) $options['assigned_user_id']])
                    ->where('created_by', creatorId())
                    ->pluck('id')
                    ->toArray();
                $salesOrder->assignedUsers()->sync($validIds);
            }

            $proposal->update([
                'converted_to_sales_order' => true,
                'sales_order_id' => $salesOrder->id,
            ]);

            return $salesOrder;
        });
    }

    public function convertProposalToInvoice(Proposal $proposal, ?array $customItems = null, ?int $warehouseId = null): SalesInvoice
    {
        return DB::transaction(function () use ($proposal, $customItems, $warehouseId) {
            $targetWarehouseId = $warehouseId ?: $proposal->warehouse_id;

            $productItems = [];
            if ($customItems !== null) {
                $productItems = array_values(array_filter($customItems, function ($item) {
                    return !empty($item['product_id']) && (int) $item['product_id'] > 0;
                }));
            } else {
                $dbItems = $proposal->items()->with(['taxes', 'product'])->get();
                foreach ($dbItems as $item) {
                    $type = $item->product_type ?: ($item->product?->type ?? 'product');
                    $productItems[] = [
                        'product_id' => $item->product_id,
                        'product_type' => $type,
                        'description' => $item->description,
                        'quantity' => (int) ($item->quantity ?? 1),
                        'unit_price' => (float) ($item->unit_price ?? 0),
                        'discount_type' => $item->discount_type ?? 'percentage',
                        'discount_percentage' => (float) ($item->discount_percentage ?? 0),
                        'discount_amount' => (float) ($item->discount_amount ?? 0),
                        'tax_percentage' => (float) ($item->tax_percentage ?? 0),
                        'tax_amount' => (float) ($item->tax_amount ?? 0),
                        'total_amount' => (float) ($item->total_amount ?? 0),
                        'taxes' => $item->taxes ? $item->taxes->map(fn($t) => [
                            'tax_name' => $t->tax_name,
                            'tax_rate' => $t->tax_rate,
                        ])->toArray() : [],
                    ];
                }
            }

            if (empty($productItems)) {
                throw new \Exception(__('Proposal does not have any items to convert to invoice.'));
            }

            // Validate stock only for physical product items (services have unlimited quantity)
            foreach ($productItems as $index => $item) {
                $productId = (int) $item['product_id'];
                $qty = (int) ($item['quantity'] ?? 1);
                $product = ProductServiceItem::with('warehouseStocks')->find($productId);

                $isService = ($item['product_type'] ?? '') === 'service' || ($product && $product->type === 'service');

                if ($product && !$isService) {
                    $availableStock = $targetWarehouseId
                        ? ($product->warehouseStocks->where('warehouse_id', $targetWarehouseId)->first()?->quantity ?? 0)
                        : $product->warehouseStocks->sum('quantity');

                    if ($qty > $availableStock) {
                        throw new \Exception(__("Requested quantity (:qty) exceeds available stock (:stock) for ':name'.", [
                            'qty' => $qty,
                            'stock' => $availableStock,
                            'name' => $product->name,
                        ]));
                    }
                }
            }

            $subtotal = 0.0;
            $taxAmount = 0.0;
            $discountAmount = 0.0;

            foreach ($productItems as &$pItem) {
                $qty = max(1, (int) ($pItem['quantity'] ?? 1));
                $price = max(0, (float) ($pItem['unit_price'] ?? 0));
                $lineTotal = $qty * $price;

                $discType = $pItem['discount_type'] ?? 'percentage';
                if ($discType === 'fixed') {
                    $dAmount = min($lineTotal, max(0, (float) ($pItem['discount_amount'] ?? 0)));
                    $dPct = $lineTotal > 0 ? ($dAmount / $lineTotal) * 100 : 0;
                } else {
                    $dPct = max(0, min(100, (float) ($pItem['discount_percentage'] ?? 0)));
                    $dAmount = ($lineTotal * $dPct) / 100;
                }

                $taxRate = (float) ($pItem['tax_percentage'] ?? 0);
                if (!empty($pItem['taxes']) && is_array($pItem['taxes'])) {
                    $taxRate = array_reduce($pItem['taxes'], fn($sum, $t) => $sum + (float) ($t['tax_rate'] ?? $t['rate'] ?? 0), 0.0);
                }

                $afterDisc = max(0, $lineTotal - $dAmount);
                $tAmount = ($afterDisc * $taxRate) / 100;
                $totAmount = max(0, $afterDisc + $tAmount);

                $pItem['quantity'] = $qty;
                $pItem['unit_price'] = $price;
                $pItem['discount_type'] = $discType;
                $pItem['discount_percentage'] = round($dPct, 4);
                $pItem['discount_amount'] = round($dAmount, 2);
                $pItem['tax_percentage'] = round($taxRate, 4);
                $pItem['tax_amount'] = round($tAmount, 2);
                $pItem['total_amount'] = round($totAmount, 2);

                $subtotal += $lineTotal;
                $discountAmount += $dAmount;
                $taxAmount += $tAmount;
            }
            unset($pItem);

            $totalAmount = max(0, $subtotal + $taxAmount - $discountAmount);

            $invoice = new SalesInvoice();
            $invoice->invoice_date = now()->format('Y-m-d');
            $invoice->due_date = $proposal->due_date ? $proposal->due_date->format('Y-m-d') : now()->addDays(15)->format('Y-m-d');
            $invoice->customer_id = $proposal->customer_id;
            $invoice->customer_name = $proposal->customer_name;
            $invoice->customer_email = $proposal->customer_email;
            $invoice->customer_phone = $proposal->customer_phone;
            $invoice->customer_address = $proposal->customer_address;
            $invoice->warehouse_id = $targetWarehouseId;
            $invoice->type = 'product';
            $invoice->payment_terms = $proposal->payment_terms;
            $invoice->notes = $proposal->notes;
            $invoice->subtotal = round($subtotal, 2);
            $invoice->tax_amount = round($taxAmount, 2);
            $invoice->discount_amount = round($discountAmount, 2);
            $invoice->discount_type = 'percentage';
            $invoice->total_amount = round($totalAmount, 2);
            $invoice->paid_amount = 0;
            $invoice->balance_amount = round($totalAmount, 2);
            $invoice->status = 'draft';
            $invoice->creator_id = Auth::id() ?: ($proposal->creator_id ?: creatorId());
            $invoice->created_by = creatorId();
            $invoice->save();

            foreach ($productItems as $item) {
                $invoiceItem = new SalesInvoiceItem();
                $invoiceItem->invoice_id = $invoice->id;
                $invoiceItem->product_id = $item['product_id'];
                $invoiceItem->description = $item['description'] ?? null;
                $invoiceItem->product_type = $item['product_type'] ?? 'product';
                $invoiceItem->quantity = $item['quantity'] ?? 1;
                $invoiceItem->unit_price = $item['unit_price'] ?? 0;
                $invoiceItem->discount_type = $item['discount_type'] ?? 'percentage';
                $invoiceItem->discount_percentage = $item['discount_percentage'] ?? 0;
                $invoiceItem->discount_amount = $item['discount_amount'] ?? 0;
                $invoiceItem->tax_percentage = $item['tax_percentage'] ?? 0;
                $invoiceItem->tax_amount = $item['tax_amount'] ?? 0;
                $invoiceItem->total_amount = $item['total_amount'] ?? 0;
                $invoiceItem->creator_id = $invoice->creator_id;
                $invoiceItem->created_by = $invoice->created_by;
                $invoiceItem->save();

                if (!empty($item['taxes']) && is_array($item['taxes'])) {
                    foreach ($item['taxes'] as $tax) {
                        $invoiceTax = new SalesInvoiceItemTax();
                        $invoiceTax->item_id = $invoiceItem->id;
                        $invoiceTax->tax_name = $tax['tax_name'] ?? $tax['name'] ?? '';
                        $invoiceTax->tax_rate = (float) ($tax['tax_rate'] ?? $tax['rate'] ?? 0);
                        $invoiceTax->save();
                    }
                }
            }

            $proposal->update([
                'converted_to_invoice' => true,
            ]);

            return $invoice;
        });
    }

    public function saveProposalItems(int $proposalId, ?array $items, bool $isTaxEnabled = true): void
    {
        if (empty($items)) {
            return;
        }

        foreach ($items as $item) {
            if (empty($item['product_id']) || (int) $item['product_id'] <= 0) {
                continue;
            }

            $qty = max(1, (int) ($item['quantity'] ?? 1));
            $price = max(0, (float) ($item['unit_price'] ?? 0));
            $discType = $item['discount_type'] ?? 'percentage';
            $lineTotal = $qty * $price;

            if ($discType === 'fixed') {
                $discAmt = min($lineTotal, max(0, (float) ($item['discount_amount'] ?? 0)));
                $discRate = $lineTotal > 0 ? round(($discAmt / $lineTotal) * 100, 4) : 0;
            } else {
                $discRate = max(0, min(100, (float) ($item['discount_percentage'] ?? 0)));
                $discAmt = ($lineTotal * $discRate) / 100;
            }

            $taxRate = 0.0;
            if ($isTaxEnabled) {
                $taxRate = (float) ($item['tax_percentage'] ?? 0);
                if (!empty($item['taxes']) && is_array($item['taxes'])) {
                    $taxRate = array_reduce($item['taxes'], fn($sum, $t) => $sum + (float) ($t['tax_rate'] ?? $t['rate'] ?? 0), 0.0);
                }
            }

            $afterDisc = max(0, $lineTotal - $discAmt);
            $taxAmt = $isTaxEnabled ? (($afterDisc * $taxRate) / 100) : 0;
            $totalAmt = max(0, $afterDisc + $taxAmt);

            $proposalItem = new ProposalItem();
            $proposalItem->proposal_id = $proposalId;
            $proposalItem->product_id = $item['product_id'];
            $proposalItem->section = $item['section'] ?? 'otc';
            $proposalItem->product_type = $item['product_type'] ?? 'product';
            $proposalItem->description = $item['description'] ?? $item['product_description'] ?? null;
            $proposalItem->quantity = $qty;
            $proposalItem->unit_price = $price;
            $proposalItem->discount_type = $discType;
            $proposalItem->discount_percentage = $discRate;
            $proposalItem->discount_amount = $discAmt;
            $proposalItem->tax_percentage = $taxRate;
            $proposalItem->tax_amount = $taxAmt;
            $proposalItem->total_amount = $totalAmt;
            $proposalItem->save();

            if ($isTaxEnabled && !empty($item['taxes']) && is_array($item['taxes'])) {
                foreach ($item['taxes'] as $tax) {
                    $itemTax = new ProposalItemTax();
                    $itemTax->item_id = $proposalItem->id;
                    $itemTax->tax_name = $tax['tax_name'] ?? 'Tax';
                    $itemTax->tax_rate = (float) ($tax['tax_rate'] ?? $tax['rate'] ?? 0);
                    $itemTax->save();
                }
            }
        }
    }

    public function saveProposalPageContents(int $proposalId, $contents): void
    {
        if (!Schema::hasTable('proposal_contents')) {
            return;
        }

        try {
            if (Schema::hasColumn('proposal_contents', 'proposal_id')) {
                ProposalContent::where('proposal_id', $proposalId)->delete();
            }
        } catch (\Throwable $th) {
            // Silently catch
        }

        if (empty($contents)) {
            return;
        }

        $items = is_string($contents) ? json_decode($contents, true) : $contents;
        if (!is_array($items)) {
            return;
        }

        $proposal = Proposal::find($proposalId);
        $authorUserId = $proposal?->creator_id ?? Auth::id();
        $authorUser = $authorUserId ? User::find($authorUserId) : null;

        $userShortcodes = [
            'user_name' => $authorUser?->name ?? '',
            'creator_name' => $authorUser?->name ?? '',
            'user_email' => $authorUser?->email ?? '',
            'creator_email' => $authorUser?->email ?? '',
            'user_phone' => $authorUser?->mobile_no ?? $authorUser?->phone ?? '',
            'creator_phone' => $authorUser?->mobile_no ?? $authorUser?->phone ?? '',
            'user_id' => $authorUser?->id ? (string) $authorUser->id : '',
            'creator_designation' => $authorUser?->designation ?? '',
            'user_designation' => $authorUser?->designation ?? '',
        ];

        $replaceUserCodes = function ($text) use ($userShortcodes) {
            if (empty($text) || !is_string($text)) {
                return $text;
            }
            foreach ($userShortcodes as $k => $v) {
                if ($v !== '') {
                    $text = preg_replace('/\{\s*' . preg_quote($k, '/') . '\s*\}/i', $v, $text);
                }
            }
            return $text;
        };

        $index = 1;
        foreach ($items as $item) {
            if (is_array($item)) {
                $pageType = $item['page_type'] ?? 'content';
                $order = isset($item['order']) ? (int) $item['order'] : $index;
                $title = $item['title'] ?? null;
                $html = $item['content'] ?? null;
                $bg = $item['background_image'] ?? null;
                $serialized = json_encode($item);
            } else {
                $order = $index;
                $title = null;
                $html = (string) $item;
                $pageType = 'content';
                $bg = null;
                $serialized = (string) $item;
            }

            if ($title !== null) {
                $title = $replaceUserCodes($title);
            }
            if ($html !== null) {
                $html = $replaceUserCodes($html);
            }

            ProposalContent::create([
                'proposal_id' => $proposalId,
                'title' => $title,
                'content' => is_array($item) ? ($html ?? '') : ($html ?? $serialized),
                'page_type' => $pageType,
                'background_image' => $bg,
                'order' => $order,
                'creator_id' => Auth::id(),
                'created_by' => creatorId(),
            ]);
            $index++;
        }
    }
}

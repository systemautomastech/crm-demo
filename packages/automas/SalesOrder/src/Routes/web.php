<?php

use Illuminate\Support\Facades\Route;
use Automas\SalesOrder\Http\Controllers\SalesOrderController;
use Automas\SalesOrder\Http\Controllers\SalesOrderDeliveryController;
use Automas\SalesOrder\Http\Controllers\SalesOrderSettingController;
use Automas\SalesOrder\Http\Controllers\SalesOrderDashboardController;

Route::middleware(['web', 'auth', 'verified'])->group(function () {

    Route::get('/sales-orders/dashboard', [SalesOrderDashboardController::class, 'index'])->name('salesorder.dashboard');
    Route::get('/sales-orders/company-dashboard', [SalesOrderDashboardController::class, 'companyDashboard'])->name('salesorder.company.dashboard');
    Route::get('/sales-orders/user-dashboard', [SalesOrderDashboardController::class, 'userDashboardView'])->name('salesorder.user.dashboard');

    // ─── Sales Orders ──────────────────────────────────────────────────────
    Route::prefix('sales-orders')->name('salesorder.orders.')->group(function () {
        Route::get('/', [SalesOrderController::class, 'index'])->name('index');
        Route::get('/create', [SalesOrderController::class, 'create'])->name('create');
        Route::post('/', [SalesOrderController::class, 'store'])->name('store');

        // AJAX helpers (must be before /{salesOrder} to avoid route conflicts)
        Route::get('/products', [SalesOrderController::class, 'getWarehouseProducts'])->name('products');
        Route::get('/customer/{customerId}/details', [SalesOrderController::class, 'getCustomerDetails'])->name('customer-details');
        Route::get('/quotation/{quotationId}/details', [SalesOrderController::class, 'getQuotationDetails'])->name('quotation-details');

        // Quotation → Sales Order conversion
        Route::post('/convert-from-quotation', [SalesOrderController::class, 'convertFromQuotation'])->name('convert-from-quotation');

        Route::get('/{salesOrder}', [SalesOrderController::class, 'show'])->name('show');
        Route::get('/{salesOrder}/edit', [SalesOrderController::class, 'edit'])->name('edit');
        Route::put('/{salesOrder}', [SalesOrderController::class, 'update'])->name('update');
        Route::delete('/{salesOrder}', [SalesOrderController::class, 'destroy'])->name('destroy');
        Route::post('/{salesOrder}/confirm', [SalesOrderController::class, 'confirm'])->name('confirm');
        Route::post('/{salesOrder}/cancel', [SalesOrderController::class, 'cancel'])->name('cancel');
        Route::post('/{salesOrder}/duplicate', [SalesOrderController::class, 'duplicate'])->name('duplicate');
        Route::get('/{salesOrder}/print', [SalesOrderController::class, 'print'])->name('print');
        Route::get('/{salesOrder}/pdf', [SalesOrderController::class, 'pdf'])->name('pdf');

        // Group Assignment & Acquisition
        Route::post('/{salesOrder}/assign-group', [SalesOrderController::class, 'assignGroup'])->name('assign-group');
        Route::post('/{salesOrder}/acquire', [SalesOrderController::class, 'acquire'])->name('acquire');
        Route::post('/{salesOrder}/release', [SalesOrderController::class, 'release'])->name('release');
        Route::post('/{salesOrder}/reassign', [SalesOrderController::class, 'reassign'])->name('reassign');

        // Deliveries (nested under a sales order)
        Route::get('/{salesOrder}/deliveries/create', [SalesOrderDeliveryController::class, 'create'])->name('deliveries.create');
        Route::post('/{salesOrder}/deliveries', [SalesOrderDeliveryController::class, 'store'])->name('deliveries.store');

        Route::post('/{salesOrder}/convert-to-invoice', [SalesOrderController::class, 'convertToSalesInvoice'])->name('convert');
    });

    // ─── Deliveries (standalone access for index/show/cancel/challan) ───────
    Route::prefix('sales-order-deliveries')->name('salesorder.deliveries.')->group(function () {
        Route::get('/', [SalesOrderDeliveryController::class, 'index'])->name('index');
        Route::get('/{delivery}', [SalesOrderDeliveryController::class, 'show'])->name('show');
        Route::get('/{delivery}/edit', [SalesOrderDeliveryController::class, 'edit'])->name('edit');
        Route::put('/{delivery}', [SalesOrderDeliveryController::class, 'update'])->name('update');
        Route::post('/{delivery}/cancel', [SalesOrderDeliveryController::class, 'cancel'])->name('cancel');
        Route::post('/{delivery}/status', [SalesOrderDeliveryController::class, 'updateStatus'])->name('update-status');
        Route::get('/{delivery}/challan', [SalesOrderDeliveryController::class, 'challan'])->name('challan');
        Route::get('/{delivery}/challan/pdf', [SalesOrderDeliveryController::class, 'challanPdf'])->name('challan.pdf');
    });

    // ─── Settings ─────────────────────────────────────────────────────────
    Route::prefix('sales-order-settings')->name('salesorder.settings.')->group(function () {
        Route::get('/', [SalesOrderSettingController::class, 'show'])->name('show');
        Route::post('/', [SalesOrderSettingController::class, 'update'])->name('update');
    });
});
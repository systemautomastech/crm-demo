<?php

use Illuminate\Support\Facades\Route;
use Automas\SupportTicket\Http\Controllers\ContactController;
use Automas\SupportTicket\Http\Controllers\CustomPageController;
use Automas\SupportTicket\Http\Controllers\DashboardController;
use Automas\SupportTicket\Http\Controllers\FaqController;
use Automas\SupportTicket\Http\Controllers\FrontendController;
use Automas\SupportTicket\Http\Controllers\KnowledgebaseCategoryController;
use Automas\SupportTicket\Http\Controllers\KnowledgeController;
use Automas\SupportTicket\Http\Controllers\SupportTicketController;
use Automas\SupportTicket\Http\Controllers\TicketCategoryController;
use Automas\SupportTicket\Http\Controllers\Company\SettingsController;
use Automas\SupportTicket\Http\Controllers\SupportTicketSettingController;
use Automas\SupportTicket\Http\Controllers\TitleSectionController;
use Automas\SupportTicket\Http\Controllers\CtaSectionController;
use Automas\SupportTicket\Http\Controllers\QuickLinkController;
use Automas\SupportTicket\Http\Controllers\SupportInformationController;
use Automas\SupportTicket\Http\Controllers\ContactInformationController;
use Automas\SupportTicket\Http\Middleware\SupportTicketSharedDataMiddleware;
use Automas\SupportTicket\Http\Middleware\EnsureTicketAccess;

// Frontend Routes (Public)
Route::middleware(['web', SupportTicketSharedDataMiddleware::class])->prefix('{slug}/public-support')->name('support-ticket.')->group(function () {
    Route::get('/', [FrontendController::class, 'index'])->name('index');
    Route::post('/store', [FrontendController::class, 'store'])->name('store');
    Route::get('/search', [FrontendController::class, 'search'])->name('search');
    Route::post('/search', [FrontendController::class, 'searchTicket'])->name('search.post');
    Route::get('/show/{ticket_id}', [FrontendController::class, 'showByTicketId'])->middleware(EnsureTicketAccess::class)->name('show.ticket');
    Route::get('show-ticket/{id}', [FrontendController::class, 'show'])->name('show');
    Route::get('/my-ticket', [FrontendController::class, 'myTicket'])->name('my-ticket');
    Route::post('/my-ticket/auth', [FrontendController::class, 'authenticateTicketAccess'])->name('my-ticket.auth');
    Route::post('/my-ticket/logout', [FrontendController::class, 'logoutTicketAccess'])->name('my-ticket.logout');
    Route::get('/knowledge', [FrontendController::class, 'knowledge'])->name('knowledge');
    Route::get('/knowledge/{id}', [FrontendController::class, 'knowledgeArticle'])->name('knowledge.article');
    Route::get('/faq', [FrontendController::class, 'faq'])->name('faq');
    Route::get('/contact', [FrontendController::class, 'contact'])->name('contact');
    Route::post('/contact', [FrontendController::class, 'storeContact'])->name('contact.store');
    Route::get('/page/{pageSlug}', [FrontendController::class, 'customPage'])->name('custom-page');
    Route::post('/{ticketId}/send-conversion', [FrontendController::class, 'storeReply'])->middleware(EnsureTicketAccess::class)->name('send-conversion.store');
    Route::get('/{ticketId}/conversions', [FrontendController::class, 'getConversions'])->middleware(EnsureTicketAccess::class)->name('conversions.load');
});

// Admin Routes
Route::middleware(['web', 'auth', 'verified', 'PlanModuleCheck:SupportTicket'])->prefix('support-ticket')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('support-ticket.dashboard');

    // Tickets Management
    Route::prefix('tickets')->name('support-tickets.')->group(function () {
        Route::get('/', [SupportTicketController::class, 'index'])->name('index');
        Route::get('/create', [SupportTicketController::class, 'create'])->name('create');
        Route::post('/', [SupportTicketController::class, 'store'])->name('store');
        Route::get('/{support_ticket}/edit', [SupportTicketController::class, 'edit'])->name('edit');
        Route::put('/{support_ticket}', [SupportTicketController::class, 'update'])->name('update');
        Route::delete('/{support_ticket}', [SupportTicketController::class, 'destroy'])->name('destroy');
        Route::get('/{support_ticket}', [SupportTicketController::class, 'show'])->name('show');
        Route::get('/list/search/{status?}', [SupportTicketController::class, 'index'])->name('search');

        Route::post('/{id}/note', [SupportTicketController::class, 'storeNote'])->name('note.store');
        Route::post('/{id}/pick', [SupportTicketController::class, 'pickTicket'])->name('pick');
        Route::post('/{id}/transfer', [SupportTicketController::class, 'transferTicket'])->name('transfer');
        Route::post('/{ticketId}/send-conversion', [SupportTicketController::class, 'storeconverison'])->name('admin-send-conversion.store');
        Route::get('/{id}/conversions', [SupportTicketController::class, 'getConversions'])->name('conversions.load');
    });

    // FAQ Management
    Route::prefix('faq')->name('support-ticket-faq.')->group(function () {
        Route::get('/', [FaqController::class, 'index'])->name('index');
        Route::post('/', [FaqController::class, 'store'])->name('store');
        Route::put('/{support_ticket_faq}', [FaqController::class, 'update'])->name('update');
        Route::delete('/{support_ticket_faq}', [FaqController::class, 'destroy'])->name('destroy');
    });

    // Knowledge Base Management
    Route::prefix('knowledge')->name('support-ticket-knowledge.')->group(function () {
        Route::get('/', [KnowledgeController::class, 'index'])->name('index');
        Route::post('/', [KnowledgeController::class, 'store'])->name('store');
        Route::put('/{support_ticket_knowledge}', [KnowledgeController::class, 'update'])->name('update');
        Route::delete('/{support_ticket_knowledge}', [KnowledgeController::class, 'destroy'])->name('destroy');
    });

    // Contact Management
    Route::prefix('contact')->name('support-ticket-contact.')->group(function () {
        Route::get('/', [ContactController::class, 'index'])->name('index');
        Route::post('/', [ContactController::class, 'store'])->name('store');
        Route::get('/{support_ticket_contact}', [ContactController::class, 'show'])->name('show');
        Route::delete('/{support_ticket_contact}', [ContactController::class, 'destroy'])->name('destroy');
    });

    // System Setup Routes
    Route::prefix('system-setup')->name('support-ticket.system-setup.')->group(function () {

        // Ticket Categories Management
        Route::prefix('ticket-categories')->name('ticket-category.')->group(function () {
            Route::get('/', [TicketCategoryController::class, 'index'])->name('index');
            Route::post('/', [TicketCategoryController::class, 'store'])->name('store');
            Route::put('/{category}', [TicketCategoryController::class, 'update'])->name('update');
            Route::delete('/{category}', [TicketCategoryController::class, 'destroy'])->name('destroy');
        });

        // Knowledge Base Categories Management
        Route::prefix('knowledge-categories')->name('knowledge-category.')->group(function () {
            Route::get('/', [KnowledgebaseCategoryController::class, 'index'])->name('index');
            Route::post('/', [KnowledgebaseCategoryController::class, 'store'])->name('store');
            Route::put('/{knowledgeBaseCategory}', [KnowledgebaseCategoryController::class, 'update'])->name('update');
            Route::delete('/{knowledgeBaseCategory}', [KnowledgebaseCategoryController::class, 'destroy'])->name('destroy');
        });

        // Brand Settings
        Route::get('/brand-settings', [SupportTicketSettingController::class, 'brandSettings'])->name('brand-settings.index');
        Route::post('/brand-settings', [SupportTicketSettingController::class, 'updateBrandSettings'])->name('brand-settings.store');

        // Custom Pages
        Route::prefix('custom-pages')->name('custom-pages.')->group(function () {
            Route::get('/', [CustomPageController::class, 'index'])->name('index');
            Route::post('/', [CustomPageController::class, 'store'])->name('store');
            Route::put('/{id}', [CustomPageController::class, 'update'])->name('update');
            Route::delete('/{id}', [CustomPageController::class, 'destroy'])->name('destroy');
        });

        // Title Sections
        Route::prefix('title-sections')->name('title-sections.')->group(function () {
            Route::get('/', [TitleSectionController::class, 'index'])->name('index');
            Route::post('/', [TitleSectionController::class, 'store'])->name('store');
        });

        // CTA Sections
        Route::prefix('cta-sections')->name('cta-sections.')->group(function () {
            Route::get('/', [CtaSectionController::class, 'index'])->name('index');
            Route::post('/', [CtaSectionController::class, 'store'])->name('store');
        });

        // Quick Links
        Route::prefix('quick-links')->name('quick-links.')->group(function () {
            Route::get('/', [QuickLinkController::class, 'index'])->name('index');
            Route::post('/', [QuickLinkController::class, 'store'])->name('store');
            Route::put('/{id}', [QuickLinkController::class, 'update'])->name('update');
            Route::delete('/{id}', [QuickLinkController::class, 'destroy'])->name('destroy');
        });

        // Support Information
        Route::prefix('support-information')->name('support-information.')->group(function () {
            Route::get('/', [SupportInformationController::class, 'index'])->name('index');
            Route::post('/', [SupportInformationController::class, 'store'])->name('store');
        });

        // Contact Information
        Route::prefix('contact-information')->name('contact-information.')->group(function () {
            Route::get('/', [ContactInformationController::class, 'index'])->name('index');
            Route::post('/', [ContactInformationController::class, 'store'])->name('store');
        });

        // Support Team (User Groups & Ticket Default Behavior)
        Route::get('/support-team', [SupportTicketSettingController::class, 'supportTeam'])->name('support-team.index');
        Route::post('/support-team', [SupportTicketSettingController::class, 'updateSupportTeam'])->name('support-team.store');
    });

    // Settings Routes
    Route::post('/settings/update', [SettingsController::class, 'update'])->name('support-ticket.settings.update');
    Route::get('/fields/get', [SettingsController::class, 'getFields'])->name('support-ticket.fields.get');
});

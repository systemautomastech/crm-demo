<?php

namespace Automas\SupportTicket\Http\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Automas\SupportTicket\Models\SupportTicketCustomPage;
use Automas\SupportTicket\Http\Requests\StoreCustomPageRequest;
use Automas\SupportTicket\Http\Requests\UpdateCustomPageRequest;
use Automas\SupportTicket\Events\CreateCustomPage;
use Automas\SupportTicket\Events\UpdateCustomPage;
use Automas\SupportTicket\Events\DestroyCustomPage;

class CustomPageController extends Controller
{
    public function index()
    {
        if (Auth::user()->can('manage-support-ticket-custom-pages')) {
            $custompages = SupportTicketCustomPage::where('created_by', creatorId())->get();

            return Inertia::render('SupportTicket/SystemSetup/CustomPages/Index', [
                'custompages' => $custompages
            ]);
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function store(StoreCustomPageRequest $request)
    {
        if (Auth::user()->can('create-support-ticket-custom-pages')) {
            $validated = $request->validated();

            $custompage = new SupportTicketCustomPage();
            $custompage->title = $validated['title'];
            $custompage->slug = $validated['slug'];
            $custompage->contents = $validated['contents'];
            $custompage->description = $validated['description'];
            $custompage->enable_page_footer = $validated['enable_page_footer'] ?? 'off';
            $custompage->creator_id = Auth::id();
            $custompage->created_by = creatorId();
            $custompage->save();

            CreateCustomPage::dispatch($request, $custompage);

            return redirect()->route('support-ticket.system-setup.custom-pages.index')->with('success', __('The custom page has been created successfully.'));
        } else {
            return redirect()->route('support-ticket.system-setup.custom-pages.index')->with('error', __('Permission denied'));
        }
    }

    public function update(UpdateCustomPageRequest $request, $id)
    {
        if (Auth::user()->can('edit-support-ticket-custom-pages')) {
            $custompage = SupportTicketCustomPage::findOrFail($id);
            $validated = $request->validated();

            $custompage->title = $validated['title'];
            if ($custompage->is_editable) {
                $custompage->slug = $validated['slug'];
            }
            $custompage->contents = $validated['contents'];
            $custompage->description = $validated['description'];
            $custompage->enable_page_footer = $validated['enable_page_footer'] ?? 'off';
            $custompage->save();

            UpdateCustomPage::dispatch($request, $custompage);

            return redirect()->route('support-ticket.system-setup.custom-pages.index')->with('success', __('The custom page details are updated successfully.'));
        } else {
            return redirect()->route('support-ticket.system-setup.custom-pages.index')->with('error', __('Permission denied'));
        }
    }

    public function destroy($id)
    {
        if (Auth::user()->can('delete-support-ticket-custom-pages')) {
            $custompage = SupportTicketCustomPage::findOrFail($id);
            
            DestroyCustomPage::dispatch($custompage);
            $custompage->delete();

            return redirect()->route('support-ticket.system-setup.custom-pages.index')->with('success', __('The custom page has been deleted.'));
        } else {
            return redirect()->route('support-ticket.system-setup.custom-pages.index')->with('error', __('Permission denied'));
        }
    }
}
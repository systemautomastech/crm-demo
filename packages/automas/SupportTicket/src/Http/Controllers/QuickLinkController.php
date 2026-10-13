<?php

namespace Automas\SupportTicket\Http\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Automas\SupportTicket\Models\QuickLink;
use Automas\SupportTicket\Http\Requests\StoreQuickLinkRequest;
use Automas\SupportTicket\Http\Requests\UpdateQuickLinkRequest;
use Automas\SupportTicket\Events\CreateQuickLink;
use Automas\SupportTicket\Events\UpdateQuickLink;
use Automas\SupportTicket\Events\DestroyQuickLink;

class QuickLinkController extends Controller
{
    public function index()
    {
        if (Auth::user()->can('manage-support-ticket-quick-links')) {
            $quickLinks = QuickLink::where('created_by', creatorId())->get();

            return Inertia::render('SupportTicket/SystemSetup/QuickLinks/Index', [
                'quickLinks' => $quickLinks
            ]);
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function store(StoreQuickLinkRequest $request)
    {
        if (Auth::user()->can('create-support-ticket-quick-links')) {
            $validated = $request->validated();

            $quickLink = new QuickLink();
            $quickLink->title = $validated['title'];
            $quickLink->icon = $validated['icon'];
            $quickLink->link = $validated['link'];
            $quickLink->creator_id = Auth::id();
            $quickLink->created_by = creatorId();
            $quickLink->save();

            CreateQuickLink::dispatch($request, $quickLink);

            return redirect()->back()->with('success', __('The quick link has been created successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function update(UpdateQuickLinkRequest $request, $id)
    {
        if (Auth::user()->can('edit-support-ticket-quick-links')) {
            $quickLink = QuickLink::where('created_by', creatorId())->find($id);
            
            if (!$quickLink) {
                return back()->with('error', __('Quick link not found'));
            }
            
            $validated = $request->validated();
            
            $quickLink->title = $validated['title'];
            $quickLink->icon = $validated['icon'];
            $quickLink->link = $validated['link'];
            $quickLink->save();

            UpdateQuickLink::dispatch($request, $quickLink);

            return back()->with('success', __('The quick link details are updated successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function destroy($id)
    {
        if (Auth::user()->can('delete-support-ticket-quick-links')) {
            $quickLink = QuickLink::where('created_by', creatorId())->find($id);
            
            if (!$quickLink) {
                return back()->with('error', __('Quick link not found'));
            }
            
            DestroyQuickLink::dispatch($quickLink);
            
            $quickLink->delete();

            return back()->with('success', __('The quick link has been deleted.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }
}
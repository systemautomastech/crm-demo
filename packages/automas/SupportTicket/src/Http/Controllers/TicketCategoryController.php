<?php

namespace Automas\SupportTicket\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Automas\SupportTicket\Models\Ticket;
use Automas\SupportTicket\Models\TicketCategory;
use Automas\SupportTicket\Http\Requests\StoreTicketCategoryRequest;
use Automas\SupportTicket\Http\Requests\UpdateTicketCategoryRequest;
use Automas\SupportTicket\Events\CreateTicketCategory;
use Automas\SupportTicket\Events\UpdateTicketCategory;
use Automas\SupportTicket\Events\DestroyTicketCategory;

class TicketCategoryController extends Controller
{
    public function index()
    {
        if (Auth::user()->can('manage-ticket-categories')) {
            $user = Auth::user();
            $categories = TicketCategory::select('id', 'name', 'color', 'created_at')
                ->where(function ($q) use ($user) {
                    if ($user->can('manage-any-ticket-categories')) {
                        $q->where('created_by', creatorId());
                    }elseif ($user->can('manage-own-ticket-categories')) {
                        $q->where('creator_id', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                })
                ->latest()
                ->get();

            return Inertia::render('SupportTicket/SystemSetup/Categories/Index', [
                'categories' => $categories
            ]);
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function store(StoreTicketCategoryRequest $request)
    {
        if (Auth::user()->can('create-ticket-categories')) {
            $validated = $request->validated();
            
            $ticketCategory = new TicketCategory();
            $ticketCategory->name = $validated['name'];
            $ticketCategory->color = $validated['color'];
            $ticketCategory->creator_id = Auth::id();
            $ticketCategory->created_by = creatorId();
            $ticketCategory->save();

            CreateTicketCategory::dispatch($request, $ticketCategory);

            return redirect()->route('support-ticket.system-setup.ticket-category.index')->with('success', __('The category has been created successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function update(UpdateTicketCategoryRequest $request, TicketCategory $category)
    {
        if (Auth::user()->can('edit-ticket-categories')) {
            $validated = $request->validated();
            $category->name = $validated['name'];
            $category->color = $validated['color'];
            $category->save();

            UpdateTicketCategory::dispatch($request, $category);

            return back()->with('success', __('The category details are updated successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function destroy(TicketCategory $category)
    {
        try {
            if (Auth::user()->can('delete-ticket-categories')) {
                DestroyTicketCategory::dispatch($category);
                $category->delete();
                return back()->with('success', __('The category has been deleted.'));
            } else {
                return back()->with('error', __('Permission denied'));
            }
        } catch (\Exception $e) {
            return back()->with('error', __('Category not found'));
        }
    }
}
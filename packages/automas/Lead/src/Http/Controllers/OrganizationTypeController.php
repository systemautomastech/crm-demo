<?php

namespace Automas\Lead\Http\Controllers;

use Automas\Lead\Models\OrganizationType;
use Automas\Lead\Http\Requests\StoreOrganizationTypeRequest;
use Automas\Lead\Http\Requests\UpdateOrganizationTypeRequest;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Automas\Lead\Events\CreateOrganizationType;
use Automas\Lead\Events\UpdateOrganizationType;
use Automas\Lead\Events\DestroyOrganizationType;

class OrganizationTypeController extends Controller
{
    public function index()
    {
        if (Auth::user()->can('manage-organization-types') || Auth::user()->can('manage-subjects')) {
            $organizationTypes = OrganizationType::select('id', 'name', 'created_at')
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-organization-types')) {
                        $q->where('created_by', creatorId());
                    } elseif (Auth::user()->can('manage-own-organization-types')) {
                        $q->where('creator_id', Auth::id());
                    } else {
                        $q->where('created_by', creatorId());
                    }
                })
                ->latest()
                ->get();

            if (request()->wantsJson() && !request()->header('X-Inertia')) {
                return response()->json($organizationTypes);
            }

            return Inertia::render('Lead/SystemSetup/OrganizationTypes/Index', [
                'organizationTypes' => $organizationTypes,
            ]);
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function store(StoreOrganizationTypeRequest $request)
    {
        if (Auth::user()->can('create-organization-types') || Auth::user()->can('create-subjects') || Auth::user()->can('create-leads')) {
            $validated = $request->validated();

            $organizationType             = new OrganizationType();
            $organizationType->name       = $validated['name'];
            $organizationType->creator_id = Auth::id();
            $organizationType->created_by = creatorId();
            $organizationType->save();

            CreateOrganizationType::dispatch($request, $organizationType);

            if (!$request->header('X-Inertia') && ($request->wantsJson() || $request->ajax())) {
                return response()->json([
                    'success' => true,
                    'message' => __('The organization type has been created successfully.'),
                    'data' => $organizationType,
                ]);
            }

            return redirect()->route('lead.organization-types.index')->with('success', __('The organization type has been created successfully.'));
        } else {
            if (!$request->header('X-Inertia') && ($request->wantsJson() || $request->ajax())) {
                return response()->json(['error' => __('Permission denied')], 403);
            }
            return redirect()->route('lead.organization-types.index')->with('error', __('Permission denied'));
        }
    }

    public function update(UpdateOrganizationTypeRequest $request, OrganizationType $organizationType)
    {
        if (Auth::user()->can('edit-organization-types') || Auth::user()->can('edit-subjects')) {
            $validated = $request->validated();

            $organizationType->name = $validated['name'];
            $organizationType->save();

            UpdateOrganizationType::dispatch($request, $organizationType);

            if (!$request->header('X-Inertia') && ($request->wantsJson() || $request->ajax())) {
                return response()->json([
                    'success' => true,
                    'message' => __('The organization type details are updated successfully.'),
                    'data' => $organizationType,
                ]);
            }

            return back()->with('success', __('The organization type details are updated successfully.'));
        } else {
            if (!$request->header('X-Inertia') && ($request->wantsJson() || $request->ajax())) {
                return response()->json(['error' => __('Permission denied')], 403);
            }
            return back()->with('error', __('Permission denied'));
        }
    }

    public function destroy(OrganizationType $organizationType)
    {
        if (Auth::user()->can('delete-organization-types') || Auth::user()->can('delete-subjects')) {
            DestroyOrganizationType::dispatch($organizationType);
            $organizationType->delete();

            return back()->with('success', __('The organization type has been deleted.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }
}

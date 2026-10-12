<?php

namespace Automas\Lead\Http\Controllers;

use Automas\Lead\Models\LeadSubject;
use Automas\Lead\Http\Requests\StoreLeadSubjectRequest;
use Automas\Lead\Http\Requests\UpdateLeadSubjectRequest;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Automas\Lead\Events\CreateLeadSubject;
use Automas\Lead\Events\UpdateLeadSubject;
use Automas\Lead\Events\DestroyLeadSubject;

class LeadSubjectController extends Controller
{
    public function index()
    {
        if (Auth::user()->can('manage-subjects')) {
            $subjects = LeadSubject::select('id', 'name', 'created_at')
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-subjects')) {
                        $q->where('created_by', creatorId());
                    } elseif (Auth::user()->can('manage-own-subjects')) {
                        $q->where('creator_id', Auth::id());
                    } else {
                        $q->where('created_by', creatorId());
                    }
                })
                ->latest()
                ->get();

            return Inertia::render('Lead/SystemSetup/Subjects/Index', [
                'subjects' => $subjects,
            ]);
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function store(StoreLeadSubjectRequest $request)
    {
        if (Auth::user()->can('create-subjects')) {
            $validated = $request->validated();

            $subject             = new LeadSubject();
            $subject->name       = $validated['name'];
            $subject->creator_id = Auth::id();
            $subject->created_by = creatorId();
            $subject->save();

            CreateLeadSubject::dispatch($request, $subject);

            if (!$request->header('X-Inertia') && ($request->wantsJson() || $request->ajax())) {
                return response()->json([
                    'success' => true,
                    'message' => __('The subject has been created successfully.'),
                    'data' => $subject,
                ]);
            }

            return redirect()->route('lead.subjects.index')->with('success', __('The subject has been created successfully.'));
        } else {
            if (!$request->header('X-Inertia') && ($request->wantsJson() || $request->ajax())) {
                return response()->json(['error' => __('Permission denied')], 403);
            }
            return redirect()->route('lead.subjects.index')->with('error', __('Permission denied'));
        }
    }

    public function update(UpdateLeadSubjectRequest $request, LeadSubject $subject)
    {
        if (Auth::user()->can('edit-subjects')) {
            $validated = $request->validated();

            $subject->name = $validated['name'];
            $subject->save();

            UpdateLeadSubject::dispatch($request, $subject);

            return back()->with('success', __('The subject details are updated successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function destroy(LeadSubject $subject)
    {
        if (Auth::user()->can('delete-subjects')) {
            DestroyLeadSubject::dispatch($subject);
            $subject->delete();

            return back()->with('success', __('The subject has been deleted.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }
}

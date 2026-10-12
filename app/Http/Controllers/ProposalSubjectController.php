<?php

namespace App\Http\Controllers;

use App\Models\ProposalSubject;
use App\Http\Requests\StoreProposalSubjectRequest;
use App\Http\Requests\UpdateProposalSubjectRequest;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ProposalSubjectController extends Controller
{
    public function index()
    {
        if (!Auth::user()->can('manage-proposal-system-setup') && !Auth::user()->can('manage-subjects')) {
            return redirect()->route('dashboard')->with('error', __('Permission denied'));
        }

        $creatorId = creatorId();
        $subjects = ProposalSubject::where('created_by', $creatorId)
            ->latest()
            ->get();

        if (request()->wantsJson()) {
            return response()->json(['subjects' => $subjects]);
        }

        return Inertia::render('ProposalSetup/Subjects/Index', [
            'subjects' => $subjects,
        ]);
    }

    public function store(StoreProposalSubjectRequest $request)
    {
        $userType = Auth::user()->type ?? '';
        if (!in_array($userType, ['company', 'superadmin'])) {
            if ($request->wantsJson()) {
                return response()->json(['error' => __('Permission denied. Only company can create subjects.')], 403);
            }
            return back()->with('error', __('Permission denied. Only company can create subjects.'));
        }

        if (!Auth::user()->can('manage-proposal-system-setup') && !Auth::user()->can('create-subjects')) {
            if ($request->wantsJson()) {
                return response()->json(['error' => __('Permission denied')], 403);
            }
            return back()->with('error', __('Permission denied'));
        }

        $validatedData = $request->validated();

        $subject = ProposalSubject::create(array_merge($validatedData, [
            'creator_id' => Auth::id(),
            'created_by' => creatorId(),
        ]));

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => __('The subject has been created successfully.'),
                'subject' => $subject,
            ]);
        }

        return back()->with('success', __('The subject has been created successfully.'));
    }

    public function update(UpdateProposalSubjectRequest $request, ProposalSubject $subject)
    {
        $userType = Auth::user()->type ?? '';
        if (!in_array($userType, ['company', 'superadmin'])) {
            if ($request->wantsJson()) {
                return response()->json(['error' => __('Permission denied. Only company can update subjects.')], 403);
            }
            return back()->with('error', __('Permission denied. Only company can update subjects.'));
        }

        if (!Auth::user()->can('manage-proposal-system-setup') && !Auth::user()->can('edit-subjects')) {
            if ($request->wantsJson()) {
                return response()->json(['error' => __('Permission denied')], 403);
            }
            return back()->with('error', __('Permission denied'));
        }

        if ($subject->created_by != creatorId()) {
            if ($request->wantsJson()) {
                return response()->json(['error' => __('Unauthorized access.')], 403);
            }
            return back()->with('error', __('Unauthorized access.'));
        }

        $validatedData = $request->validated();
        $subject->update($validatedData);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => __('The subject details are updated successfully.'),
                'subject' => $subject,
            ]);
        }

        return back()->with('success', __('The subject details are updated successfully.'));
    }

    public function destroy(ProposalSubject $subject)
    {
        $userType = Auth::user()->type ?? '';
        if (!in_array($userType, ['company', 'superadmin'])) {
            if (request()->wantsJson()) {
                return response()->json(['error' => __('Permission denied. Only company can delete subjects.')], 403);
            }
            return back()->with('error', __('Permission denied. Only company can delete subjects.'));
        }

        if (!Auth::user()->can('manage-proposal-system-setup') && !Auth::user()->can('delete-subjects')) {
            if (request()->wantsJson()) {
                return response()->json(['error' => __('Permission denied')], 403);
            }
            return back()->with('error', __('Permission denied'));
        }

        if ($subject->created_by != creatorId()) {
            if (request()->wantsJson()) {
                return response()->json(['error' => __('Unauthorized access.')], 403);
            }
            return back()->with('error', __('Unauthorized access.'));
        }

        $subject->delete();

        if (request()->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => __('The subject has been deleted.'),
            ]);
        }

        return back()->with('success', __('The subject has been deleted.'));
    }
}

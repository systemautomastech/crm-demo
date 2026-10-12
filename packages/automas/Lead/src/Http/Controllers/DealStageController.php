<?php

namespace Automas\Lead\Http\Controllers;

use Automas\Lead\Models\DealStage;
use Automas\Lead\Http\Requests\StoreDealStageRequest;
use Automas\Lead\Http\Requests\UpdateDealStageRequest;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Automas\Lead\Models\Pipeline;
use Automas\Lead\Events\CreateDealStage;
use Automas\Lead\Events\UpdateDealStage;
use Automas\Lead\Events\DestroyDealStage;

class DealStageController extends Controller
{
    public function index()
    {
        if (Auth::user()->can('manage-deal-stages')) {
            $dealstages = DealStage::select('id', 'name', 'order', 'pipeline_id', 'is_won', 'is_lost', 'created_at')
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-deal-stages')) {
                        $q->where('created_by', creatorId());
                    } elseif (Auth::user()->can('manage-own-deal-stages')) {
                        $q->where('creator_id', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                })
                ->latest()
                ->get();

            return Inertia::render('Lead/SystemSetup/DealStages/Index', [
                'dealstages' => $dealstages,
                'pipelines' => Pipeline::where('created_by', creatorId())->select('id', 'name')->orderBy('id', 'desc')->get(),
            ]);
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function store(StoreDealStageRequest $request)
    {
        if (Auth::user()->can('create-deal-stages')) {
            $validated = $request->validated();

            $maxOrder = DealStage::where('pipeline_id', $validated['pipeline_id'])
                ->where('created_by', creatorId())
                ->max('order') ?? 0;

            $isWon = false;
            $isLost = false;

            if (isset($validated['win_loss_type'])) {
                $isWon = $validated['win_loss_type'] === 'won';
                $isLost = $validated['win_loss_type'] === 'lost';
            } elseif (isset($validated['is_won']) || isset($validated['is_lost'])) {
                $isWon = (bool)($validated['is_won'] ?? false);
                $isLost = (bool)($validated['is_lost'] ?? false);
            }

            if ($isWon) {
                DealStage::where('pipeline_id', $validated['pipeline_id'])
                    ->where('created_by', creatorId())
                    ->update(['is_won' => false]);
                $isLost = false;
            } elseif ($isLost) {
                DealStage::where('pipeline_id', $validated['pipeline_id'])
                    ->where('created_by', creatorId())
                    ->update(['is_lost' => false]);
            }

            $dealstage              = new DealStage();
            $dealstage->name        = $validated['name'];
            $dealstage->pipeline_id = $validated['pipeline_id'];
            $dealstage->order       = $maxOrder + 1;
            $dealstage->is_won      = $isWon;
            $dealstage->is_lost     = $isLost;
            $dealstage->creator_id  = Auth::id();
            $dealstage->created_by  = creatorId();
            $dealstage->save();

            CreateDealStage::dispatch($request, $dealstage);

            return redirect()->route('lead.deal-stages.index')->with('success', __('The deal stage has been created successfully.'));
        } else {
            return redirect()->route('lead.deal-stages.index')->with('error', __('Permission denied'));
        }
    }

    public function setWon(DealStage $dealstage)
    {
        if (Auth::user()->can('edit-deal-stages') && $dealstage->created_by == creatorId()) {
            if ($dealstage->is_won) {
                $dealstage->is_won = false;
                $dealstage->save();

                return back()->with('success', __('Won stage removed.'));
            }

            DealStage::where('pipeline_id', $dealstage->pipeline_id)
                ->where('created_by', creatorId())
                ->update(['is_won' => false]);

            $dealstage->is_lost = false;
            $dealstage->is_won = true;
            $dealstage->save();

            return back()->with('success', __('Won stage updated successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function setLost(DealStage $dealstage)
    {
        if (Auth::user()->can('edit-deal-stages') && $dealstage->created_by == creatorId()) {
            if ($dealstage->is_lost) {
                $dealstage->is_lost = false;
                $dealstage->save();

                return back()->with('success', __('Lost stage removed.'));
            }

            DealStage::where('pipeline_id', $dealstage->pipeline_id)
                ->where('created_by', creatorId())
                ->update(['is_lost' => false]);

            $dealstage->is_won = false;
            $dealstage->is_lost = true;
            $dealstage->save();

            return back()->with('success', __('Lost stage updated successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function update(UpdateDealStageRequest $request, DealStage $dealstage)
    {
        if (Auth::user()->can('edit-deal-stages')) {
            $validated = $request->validated();

            $oldPipelineId = $dealstage->pipeline_id;
            $newPipelineId = $validated['pipeline_id'];
            $oldOrder = $dealstage->order;

            if ($oldPipelineId != $newPipelineId) {
                $maxOrder = DealStage::where('pipeline_id', $newPipelineId)
                    ->where('created_by', creatorId())
                    ->max('order') ?? 0;

                $dealstage->order = $maxOrder + 1;

                DealStage::where('pipeline_id', $oldPipelineId)
                    ->where('created_by', creatorId())
                    ->where('order', '>', $oldOrder)
                    ->decrement('order');
            }

            if (isset($validated['win_loss_type'])) {
                $isWon = $validated['win_loss_type'] === 'won';
                $isLost = $validated['win_loss_type'] === 'lost';
            } else {
                $isWon = isset($validated['is_won']) ? (bool)$validated['is_won'] : $dealstage->is_won;
                $isLost = isset($validated['is_lost']) ? (bool)$validated['is_lost'] : $dealstage->is_lost;
            }

            if ($isWon) {
                DealStage::where('pipeline_id', $newPipelineId)
                    ->where('created_by', creatorId())
                    ->where('id', '!=', $dealstage->id)
                    ->update(['is_won' => false]);
                $isLost = false;
            } elseif ($isLost) {
                DealStage::where('pipeline_id', $newPipelineId)
                    ->where('created_by', creatorId())
                    ->where('id', '!=', $dealstage->id)
                    ->update(['is_lost' => false]);
            }

            $dealstage->name        = $validated['name'];
            $dealstage->pipeline_id = $newPipelineId;
            $dealstage->is_won      = $isWon;
            $dealstage->is_lost     = $isLost;
            $dealstage->save();

            UpdateDealStage::dispatch($request, $dealstage);

            return back()->with('success', __('The deal stage details are updated successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function destroy(DealStage $dealstage)
    {
        if (Auth::user()->can('delete-deal-stages')) {

            DestroyDealStage::dispatch($dealstage);
            $dealstage->delete();

            return back()->with('success', __('The deal stage has been deleted.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function updateOrder(Request $request)
    {
        if (Auth::user()->can('edit-deal-stages')) {
            $request->validate([
                'stage_ids' => 'required|array',
                'pipeline_id' => 'required|integer'
            ]);

            foreach ($request->stage_ids as $index => $stageId) {
                DealStage::where('id', $stageId)
                    ->where('pipeline_id', $request->pipeline_id)
                    ->where('created_by', creatorId())
                    ->update(['order' => $index + 1]);
            }
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }
}
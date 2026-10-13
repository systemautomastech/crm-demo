<?php

namespace Automas\SupportTicket\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Automas\SupportTicket\Models\KnowledgeBaseCategory;
use Automas\SupportTicket\Events\CreateKnowledgeBaseCategory;
use Automas\SupportTicket\Events\DestroyKnowledgeBaseCategory;
use Automas\SupportTicket\Events\UpdateKnowledgeBaseCategory;
use Automas\SupportTicket\Http\Requests\StoreKnowledgeBaseCategoryRequest;
use Automas\SupportTicket\Http\Requests\UpdateKnowledgeBaseCategoryRequest;

class KnowledgebaseCategoryController extends Controller
{
    public function index()
    {
        if (Auth::user()->can('manage-knowledge-base')) {
            $categories = KnowledgeBaseCategory::select('id', 'title', 'created_at')
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-knowledge-base')) {
                        $q->where('created_by', creatorId());
                    } elseif (Auth::user()->can('manage-own-knowledge-base')) {
                        $q->where('creator_id', Auth::id());
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                })
                ->latest()
                ->get();

            return Inertia::render('SupportTicket/SystemSetup/KnowledgeCategories/Index', [
                'categories' => $categories
            ]);
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function store(StoreKnowledgeBaseCategoryRequest $request)
    {
        if (Auth::user()->can('create-knowledge-base')) {
            $validated = $request->validated();
            
            $knowledgeBaseCategory = new KnowledgeBaseCategory();
            $knowledgeBaseCategory->title = $validated['title'];
            $knowledgeBaseCategory->creator_id = Auth::id();
            $knowledgeBaseCategory->created_by = creatorId();
            $knowledgeBaseCategory->save();

            CreateKnowledgeBaseCategory::dispatch($request, $knowledgeBaseCategory);

            return back()->with('success', __('The knowledge category has been created successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function update(UpdateKnowledgeBaseCategoryRequest $request, KnowledgeBaseCategory $knowledgeBaseCategory)
    {
        if (Auth::user()->can('edit-knowledge-base')) {
            if (!$this->canAccessCategory($knowledgeBaseCategory)) {
                return back()->with('error', __('Permission denied'));
            }

            $validated = $request->validated();
            $knowledgeBaseCategory->title = $validated['title'];
            $knowledgeBaseCategory->save();

            UpdateKnowledgeBaseCategory::dispatch($request, $knowledgeBaseCategory);

            return back()->with('success', __('The knowledge category details are updated successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function destroy(KnowledgeBaseCategory $knowledgeBaseCategory)
    {
        if (Auth::user()->can('delete-knowledge-base')) {
            if (!$this->canAccessCategory($knowledgeBaseCategory)) {
                return back()->with('error', __('Permission denied'));
            }

            DestroyKnowledgeBaseCategory::dispatch($knowledgeBaseCategory);
            $knowledgeBaseCategory->delete();

            return back()->with('success', __('The knowledge category has been deleted.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    private function canAccessCategory(KnowledgeBaseCategory $category)
    {
        if (Auth::user()->can('manage-any-knowledge-base')) {
            return $category->created_by == creatorId();
        } elseif (Auth::user()->can('manage-own-knowledge-base')) {
            return $category->creator_id == Auth::id();
        } else {
            return false;
        }
    }
}

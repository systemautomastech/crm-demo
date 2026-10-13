<?php

namespace Automas\SupportTicket\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Automas\SupportTicket\Models\KnowledgeBase;
use Automas\SupportTicket\Models\KnowledgeBaseCategory;
use Automas\SupportTicket\Events\CreateKnowledgeBase;
use Automas\SupportTicket\Events\UpdateKnowledgeBase;
use Automas\SupportTicket\Events\DestroyKnowledgeBase;
use Automas\SupportTicket\Http\Requests\StoreKnowledgeBaseRequest;
use Automas\SupportTicket\Http\Requests\UpdateKnowledgeBaseRequest;


class KnowledgeController extends Controller
{
    public function index()
    {
        if (Auth::user()->can('manage-knowledge-base')) {
            $knowledge = KnowledgeBase::with(['category'])
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-knowledge-base')) {
                        $q->where('support_ticket_knowledge_bases.created_by', creatorId());
                    } elseif (Auth::user()->can('manage-own-knowledge-base')) {
                        $q->where(function ($query) {
                            $query->where('support_ticket_knowledge_bases.creator_id', Auth::id());
                        });
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                })
                ->when(request('title'), fn($q) => $q->where('support_ticket_knowledge_bases.title', 'like', '%' . request('title') . '%'))
                ->when(request('category_id'), fn($q) => $q->where('support_ticket_knowledge_bases.category_id', request('category_id')))
                ->when(request('sort'), function ($q) {
                    $sort = request('sort');
                    $direction = request('direction', 'asc');

                    if ($sort === 'category') {
                        return $q->join('knowledge_base_categories', 'support_ticket_knowledge_bases.category_id', '=', 'knowledge_base_categories.id')
                            ->orderBy('knowledge_base_categories.title', $direction)
                            ->select('support_ticket_knowledge_bases.*');
                    }

                    return $q->orderBy($sort, $direction);
                }, fn($q) => $q->latest())
                ->paginate(request('per_page', 10))
                ->withQueryString();

            $categories = $this->getFilteredCategories();

            return Inertia::render('SupportTicket/Knowledge/Index', [
                'knowledge' => $knowledge,
                'categories' => $categories,
            ]);
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function store(StoreKnowledgeBaseRequest $request)
    {
        if (Auth::user()->can('create-knowledge-base')) {
            $validated = $request->validated();
            $knowledgeBase = new KnowledgeBase();
            $knowledgeBase->title = $validated['title'];
            $knowledgeBase->description = $validated['description'];
            $knowledgeBase->category_id = $validated['category_id'];
            $knowledgeBase->creator_id = Auth::id();
            $knowledgeBase->created_by = creatorId();
            $knowledgeBase->save();

            CreateKnowledgeBase::dispatch($request, $knowledgeBase);

            return back()->with('success', __('The knowledge base has been created successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }
    
    public function update(UpdateKnowledgeBaseRequest $request, KnowledgeBase $supportTicketKnowledge)
    {
        if (Auth::user()->can('edit-knowledge-base')) {
            if (!$this->canAccessKnowledge($supportTicketKnowledge)) {
                return back()->with('error', __('Permission denied'));
            }

            $validated = $request->validated();
            $supportTicketKnowledge->title = $validated['title'];
            $supportTicketKnowledge->description = $validated['description'];
            $supportTicketKnowledge->category_id = $validated['category_id'];
            $supportTicketKnowledge->save();

            UpdateKnowledgeBase::dispatch($request, $supportTicketKnowledge);

            return back()->with('success', __('The knowledge base details are updated successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function destroy(KnowledgeBase $supportTicketKnowledge)
    {
        if (Auth::user()->can('delete-knowledge-base')) {
            if (!$this->canAccessKnowledge($supportTicketKnowledge)) {
                return back()->with('error', __('Permission denied'));
            }

            DestroyKnowledgeBase::dispatch($supportTicketKnowledge);
            $supportTicketKnowledge->delete();

            return back()->with('success', __('The knowledge base has been deleted.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    private function canAccessKnowledge(KnowledgeBase $knowledge)
    {
        if (Auth::user()->can('manage-any-knowledge-base')) {
            return $knowledge->created_by == creatorId();
        } elseif (Auth::user()->can('manage-own-knowledge-base')) {
            return $knowledge->creator_id == Auth::id();
        } else {
            return false;
        }
    }

    private function getFilteredCategories()
    {
        return KnowledgeBaseCategory::where('created_by', creatorId())
            ->when(!Auth::user()->can('manage-any-knowledge-base'), function ($q) {
                if (Auth::user()->can('manage-own-knowledge-base')) {
                    $q->where('creator_id', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })
            ->select('id', 'title')->get();
    }

    // IMPORT FUNCTIONALITY - COMMENTED OUT
    // public function fileImport(Request $request)
    // {
    //     $html = '';
    //
    //     if ($request->file && $request->file->getClientOriginalName() != '') {
    //         $file_array = explode(".", $request->file->getClientOriginalName());
    //         $extension = end($file_array);
    //         if ($extension == 'csv') {
    //             $file_data = fopen($request->file->getRealPath(), 'r');
    //             $file_header = fgetcsv($file_data);
    //             $html .= '<table class="table table-bordered"><tr>';
    //             for ($count = 0; $count < count($file_header); $count++) {
    //                 $html .= '<th>' . $file_header[$count] . '</th>';
    //             }
    //             $html .= '</tr>';
    //             $limit = 0;
    //             while (($row = fgetcsv($file_data)) !== FALSE) {
    //                 $limit++;
    //                 $html .= '<tr>';
    //                 for ($count = 0; $count < count($row); $count++) {
    //                     $html .= '<td>' . $row[$count] . '</td>';
    //                 }
    //                 $html .= '</tr>';
    //                 if ($limit >= 10) {
    //                     break;
    //                 }
    //             }
    //             $html .= '</table>';
    //             $array = ['html' => $html, 'status' => true];
    //         } else {
    //             $array = ['error' => __('Please select csv file'), 'status' => false];
    //         }
    //     } else {
    //         $array = ['error' => __('Please select file'), 'status' => false];
    //     }
    //     return response()->json($array);
    // }
    //
    // public function knowledgeImportdata(Request $request)
    // {
    //     try {
    //         $file_data = fopen($request->file->getRealPath(), 'r');
    //         $file_header = fgetcsv($file_data);
    //         $imported = 0;
    //         
    //         while (($row = fgetcsv($file_data)) !== FALSE) {
    //             $knowledge = array();
    //             for ($count = 0; $count < count($file_header); $count++) {
    //                 $knowledge[$file_header[$count]] = $row[$count];
    //             }
    //             
    //             if (!empty($knowledge['title']) && !empty($knowledge['description'])) {
    //                 $newKnowledge = new KnowledgeBase();
    //                 $newKnowledge->title = $knowledge['title'];
    //                 $newKnowledge->description = $knowledge['description'];
    //                 $newKnowledge->category_id = $knowledge['category_id'] ?? null;
    //                 $newKnowledge->creator_id = Auth::id();
    //                 $newKnowledge->created_by = creatorId();
    //                 $newKnowledge->save();
    //                 $imported++;
    //             }
    //         }
    //         
    //         return response()->json([
    //             'success' => true,
    //             'message' => __('Knowledge base imported successfully. :count items imported.', ['count' => $imported])
    //         ]);
    //     } catch (\Exception $e) {
    //         return response()->json([
    //             'success' => false,
    //             'message' => __('Import failed: :error', ['error' => $e->getMessage()])
    //         ], 500);
    //     }
    // }
}
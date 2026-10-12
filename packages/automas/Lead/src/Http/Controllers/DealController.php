<?php

namespace Automas\Lead\Http\Controllers;

use App\Models\EmailTemplate;
use Automas\Lead\Models\Deal;
use Automas\Lead\Http\Requests\StoreDealRequest;
use Automas\Lead\Http\Requests\UpdateDealRequest;
use Automas\Lead\Models\OrganizationType;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Automas\Lead\Models\Pipeline;
use App\Models\User;
use Illuminate\Http\Request;
use Automas\Lead\Models\ClientDeal;
use Automas\Lead\Models\DealStage;
use Automas\Lead\Models\Label;
use Automas\Lead\Models\UserDeal;
use Automas\Lead\Models\DealEmail;
use Automas\Lead\Models\DealDiscussion;
use Automas\Lead\Models\DealCall;
use Automas\Lead\Models\DealFile;
use Automas\Lead\Http\Requests\StoreDealCallRequest;
use Automas\Lead\Http\Requests\UpdateDealCallRequest;
use Automas\Lead\Http\Requests\StoreDealEmailRequest;
use Automas\Lead\Http\Requests\StoreDealDiscussionRequest;
use Automas\Lead\Models\DealActivityLog;
use Automas\Lead\Models\DealTask;
use Automas\Lead\Models\Lead;
use Automas\ProductService\Models\ProductServiceItem;
use Automas\Lead\Events\CreateDeal;
use Automas\Lead\Events\UpdateDeal;
use Automas\Lead\Events\DestroyDeal;
use Automas\Lead\Events\DealMoved;
use Automas\Lead\Events\DealAddUser;
use Automas\Lead\Events\DestroyUserDeal;
use Automas\Lead\Events\DealAddClient;
use Automas\Lead\Events\DestroyDealClient;
use Automas\Lead\Events\DealAddProduct;
use Automas\Lead\Events\DestroyDealProduct;
use Automas\Lead\Events\DealUploadFile;
use Automas\Lead\Events\DestroyDealFile;
use Automas\Lead\Events\DealSourceUpdate;
use Automas\Lead\Events\DestroyDealSource;
use Automas\Lead\Events\DealAddDiscussion;
use Automas\Lead\Events\DealAddCall;
use Automas\Lead\Events\DealCallUpdate;
use Automas\Lead\Events\DestroyDealCall;
use Automas\Lead\Events\DealAddEmail;
use Automas\Lead\Models\Source;
use \Spatie\MediaLibrary\MediaCollections\Models\Media;

class DealController extends Controller
{
    public function index()
    {
        if (Auth::user()->can('manage-deals')) {
            $usr = Auth::user();

            $deals = Deal::select('id', 'name', 'price', 'pipeline_id', 'stage_id', 'phone', 'status', 'sources', 'products', 'notes', 'labels', 'created_at')
                ->with(['pipeline:id,name', 'stage:id,name', 'creator:id,name', 'users:id,name,avatar', 'clientDeals:id,deal_id,client_id', 'clientDeals.client:id,name,avatar'])
                ->withCount(['tasks', 'complete_tasks'])
                ->where(function ($q) {
                    if (Auth::user()->can('manage-any-deals')) {
                        $q->where('created_by', creatorId());
                    } elseif (Auth::user()->can('manage-own-deals')) {
                        $q->where(function ($subQ) {
                            $subQ->where('creator_id', Auth::id())
                                ->orWhereHas('userDeals', function ($dealQ) {
                                    $dealQ->where('user_id', Auth::id());
                                });
                        });
                    } else {
                        $q->whereRaw('1 = 0');
                    }
                })
                ->when(request('name'), fn($q) => $q->where('name', 'like', '%' . request('name') . '%'))
                ->when(request('pipeline_id') && request('pipeline_id') !== '' && request('pipeline_id') !== 'all', fn($q) => $q->where('pipeline_id', request('pipeline_id')))
                ->when(request('stage_id') && request('stage_id') !== '', fn($q) => $q->where('stage_id', request('stage_id')))
                ->when(request('status') !== null && request('status') !== '', function ($q) {
                    $st = request('status');
                    if ($st === 'active' || $st === 'open') {
                        $q->whereNotIn('status', ['Won', 'Loss']);
                    } else {
                        $q->where('status', $st);
                    }
                })
                ->when(request('created_from'), fn($q) => $q->whereDate('created_at', '>=', request('created_from')))
                ->when(request('created_to'), fn($q) => $q->whereDate('created_at', '<=', request('created_to')))
                ->when(request('filter') === 'inactive' || request('inactive') === '1', function ($q) {
                    $q->whereNotIn('status', ['Won', 'Loss'])->where('updated_at', '<', now()->subDays(14));
                })
                ->when(request('filter') === 'overdue_followup' || request('overdue') === '1', function ($q) {
                    $q->whereHas('tasks', fn($taskQ) => $taskQ->where('date', '<', today())->where('status', 0));
                })
                ->when(request('filter') === 'followup_today' || request('followup_today') === '1', function ($q) {
                    $q->whereHas('tasks', fn($taskQ) => $taskQ->whereDate('date', today()));
                })
                ->when(request('sort'), fn($q) => $q->orderBy(request('sort'), request('direction', 'asc')), fn($q) => $q->latest())
                ->paginate(request('per_page', 10))
                ->withQueryString();

            $pipelines = Pipeline::where('created_by', creatorId())->orderBy('id', 'desc')->get(['id', 'name']);
            $activePipelineId = (request('pipeline_id') && request('pipeline_id') !== 'all') ? request('pipeline_id') : null;
            $stages = DealStage::where('created_by', creatorId())
                ->when($activePipelineId, fn($q) => $q->where('pipeline_id', $activePipelineId))
                ->orderBy('order', 'asc')
                ->get(['id', 'name', 'pipeline_id', 'order']);
            $users = User::where('created_by', creatorId())->where('type', 'client')->where('is_disable', 0)->get(['id', 'name']);
            $sources = Source::where('created_by', creatorId())->get(['id', 'name']);
            $products = Module_is_active('ProductService') ? ProductServiceItem::where('created_by', creatorId())->get(['id', 'name']) : [];
            $labels = Label::with('pipeline')->where('created_by', creatorId())->select('id', 'name', 'color', 'pipeline_id')->get();
            $organizationTypes = OrganizationType::where('created_by', creatorId())->get(['id', 'name']);

            return Inertia::render('Lead/Deals/Index', [
                'deals' => $deals,
                'pipelines' => $pipelines,
                'stages' => $stages,
                'users' => $users,
                'sources' => $sources,
                'products' => $products,
                'labels' => $labels,
                'organizationTypes' => $organizationTypes,
                'currentPipelineId' => $activePipelineId,
                'pbxModuleActive' => module_is_active('Pbx'),
            ]);
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function store(StoreDealRequest $request)
    {
        if (Auth::user()->can('create-deals')) {
            $validated = $request->validated();
            $usr = Auth::user();
            $pipeline = null;
            if ($usr->default_pipeline) {
                $pipeline = Pipeline::where('created_by', '=', creatorId())->where('id', '=', $usr->default_pipeline)->first();
            }
            if (!$pipeline) {
                $pipeline = Pipeline::where('created_by', '=', creatorId())->where('is_default', '=', true)->first();
            }
            if (!$pipeline) {
                $pipeline = Pipeline::where('created_by', '=', creatorId())->first();
            }
            $stage = DealStage::where('pipeline_id', '=', $pipeline->id)->orderBy('order', 'asc')->first();
            if (empty($stage)) {
                return redirect()->route('lead.deals.index')->with('error', __('Please create stage for this pipeline.'));
            } else {

                $deal              = new Deal();
                $deal->name        = $validated['name'];
                $deal->price       = $validated['price'] ?? 0;
                $deal->pipeline_id = $pipeline->id;
                $deal->stage_id    = $stage->id;
                $deal->phone       = $validated['phone'];
                $deal->organization_type = $validated['organization_type'] ?? null;
                if ($stage->is_won) {
                    $deal->status = 'Won';
                    $deal->is_active = false;
                } elseif ($stage->is_lost) {
                    $deal->status = 'Loss';
                    $deal->is_active = false;
                } else {
                    $deal->status = 'Active';
                    $deal->is_active = true;
                }
                $deal->creator_id  = Auth::id();
                $deal->created_by  = creatorId();
                $deal->save();

                $clients = User::whereIN('id', array_filter($validated['clients']))->get()->pluck('email', 'id')->toArray();
                foreach (array_keys($clients) as $client) {
                    ClientDeal::create(
                        [
                            'deal_id' => $deal->id,
                            'client_id' => $client,
                        ]
                    );
                }

                // Create user deals
                if (Auth::user()->type == 'company') {
                    $usrDeals = [
                        creatorId()
                    ];
                } else {
                    $usrDeals = [
                        creatorId(),
                        Auth::user()->id,
                    ];
                }

                foreach ($usrDeals as $usrDeal) {
                    UserDeal::create(
                        [
                            'user_id' => $usrDeal,
                            'deal_id' => $deal->id,
                        ]
                    );
                }
                // Dispatch event for packages to handle their fields
                CreateDeal::dispatch($request, $deal);

                if (company_setting('Deal Assign') == 'on') {
                    $emailData = [
                        'deal_name'     => $deal->name,
                        'deal_pipeline' => $pipeline->name,
                        'deal_stage'    => $stage->name,
                        'deal_status'   => $deal->status,
                        'deal_price'    => $deal->price,
                    ];
                    $allRecipients = array_merge(
                        $clients,
                        User::whereIn('id', $usrDeals)->get()->pluck('email', 'id')->toArray()
                    );

                    $message = EmailTemplate::sendEmailTemplate('Deal Assign', $allRecipients, $emailData);
                    if ($message['is_success'] == false && !empty($message['error'])) {
                        return back()
                            ->with('success', __('The deal has been created successfully.'))
                            ->with('error', $message['error']);
                    }
                }
                return redirect()->route('lead.deals.index')->with('success', __('The deal has been created successfully.'));
            }
        } else {
            return redirect()->route('lead.deals.index')->with('error', __('Permission denied'));
        }
    }

    public function show(Deal $deal)
    {
        if (Auth::user()->can('view-deals') && $deal->created_by == creatorId()) {
            $deal = Deal::with([
                'pipeline',
                'stage',
                'creator',
                'tasks',
                'userDeals' => function ($query) {
                    $query->with('user:id,name,avatar');
                },
                'emails',
                'discussions.creator:id,name,avatar',
                'calls',
                'files',
                'activities.user:id,name',
                'clientDeals.client:id,name,avatar'
            ])->find($deal->id);

            $assignedUserIds = $deal->userDeals->pluck('user_id')->toArray();
            $availableUsers = User::where('created_by', creatorId())
                ->where('is_disable', 0)
                ->whereNotIn('id', $assignedUserIds)
                ->get(['id', 'name']);
            $availableProducts = module_is_active('ProductService') ? ProductServiceItem::where('created_by', creatorId())->get(['id', 'name']) : [];
            $availableSources = Source::where('created_by', creatorId())->get(['id', 'name']);
            $assignedClientIds = $deal->clientDeals->pluck('client_id')->toArray();
            $availableClients = User::where('created_by', creatorId())
                ->where('type', 'client')
                ->where('is_disable', 0)
                ->whereNotIn('id', $assignedClientIds)
                ->get(['id', 'name']);

            $labels = Label::with('pipeline')->where('created_by', creatorId())->select('id', 'name', 'color', 'pipeline_id')->get();

            return Inertia::render('Lead/Deals/Show', [
                'deal' => $deal,
                'availableUsers' => $availableUsers,
                'availableProducts' => $availableProducts,
                'availableSources' => $availableSources,
                'availableClients' => $availableClients,
                'labels' => $labels,
            ]);
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function update(UpdateDealRequest $request, Deal $deal)
    {
        if (Auth::user()->can('edit-deals')) {
            $validated = $request->validated();

            $deal->name        = $validated['name'];
            $deal->price       = $validated['price'];
            $deal->pipeline_id = $validated['pipeline_id'];
            $deal->stage_id    = $validated['stage_id'];
            $stage             = DealStage::find($validated['stage_id']);
            if ($stage) {
                if ($stage->is_won) {
                    $deal->status = 'Won';
                } elseif ($stage->is_lost) {
                    $deal->status = 'Loss';
                } else {
                    $deal->status = 'Active';
                }
            }
            $deal->phone       = $validated['phone'];
            $deal->organization_type = $validated['organization_type'] ?? $deal->organization_type;
            $deal->sources     = isset($validated['sources']) && !empty($validated['sources']) ? array_filter($validated['sources']) : null;
            $deal->products    = isset($validated['products']) && !empty($validated['products']) ? array_filter($validated['products']) : null;
            $deal->notes       = $validated['notes'] ?? '';
            $deal->save();

            // Sync clients
            if (isset($validated['clients'])) {
                ClientDeal::where('deal_id', $deal->id)->delete();
                foreach (array_filter($validated['clients']) as $clientId) {
                    ClientDeal::firstOrCreate([
                        'deal_id'   => $deal->id,
                        'client_id' => $clientId,
                    ]);
                }
            }

            // Dispatch event for packages to handle their fields
            UpdateDeal::dispatch($request, $deal);

            return back()->with('success', __('The deal details are updated successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function destroy(Deal $deal)
    {
        try {
            if (Auth::user()->can('delete-deals') && $deal->created_by == creatorId()) {
                DestroyDeal::dispatch($deal);

                DealDiscussion::where('deal_id', '=', $deal->id)->delete();
                $dealfiles = DealFile::where('deal_id', '=', $deal->id)->get();
                foreach ($dealfiles as $dealfile) {

                    delete_file($dealfile->file_path);
                    $dealfile->delete();
                }
                ClientDeal::where('deal_id', '=', $deal->id)->delete();
                UserDeal::where('deal_id', '=', $deal->id)->delete();
                DealTask::where('deal_id', '=', $deal->id)->delete();
                DealActivityLog::where('deal_id', '=', $deal->id)->delete();
                $lead = Lead::where(['is_converted' => $deal->id])->update(['is_converted' => 0]);

                $deal->delete();
                return back()->with('success', __('The deal has been deleted.'));
            } else {
                return back()->with('error', __('Permission denied'));
            }
        } catch (\Exception $e) {
            return back()->with('error', __('Deal not found'));
        }
    }

    public function updateNotes(Request $request, $id)
    {
        if (Auth::user()->can('edit-deals')) {
            $deal = Deal::find($id);
            if ($deal->created_by == creatorId()) {
                $deal->notes = $request->notes;
                $deal->save();
                return redirect()->back()->with('success', __('The notes are updated successfully.'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission denied'));
        }
    }

    public function updateLabels(Request $request, $id)
    {
        if (Auth::user()->can('edit-deals')) {
            $deal = Deal::find($id);
            if ($deal->created_by == creatorId()) {
                if ($request->labels) {
                    $deal->labels = is_array($request->labels) ? implode(',', $request->labels) : $request->labels;
                } else {
                    $deal->labels = $request->labels;
                }
                $deal->save();
                return redirect()->back()->with('success', __('The label details are updated successfully.'));
            }
        } else {
            return redirect()->back()->with('error', __('Permission denied'));
        }
    }

    public function assignUsers(Request $request, Deal $deal)
    {
        if (Auth::user()->can('create-deal-users')) {
            $userIds = $request->input('user_ids', []);
            $users = User::whereIn('id', array_filter($userIds))->get()->pluck('email', 'id')->toArray();

            foreach (array_keys($users) as $userId) {
                UserDeal::create([
                    'deal_id' => $deal->id,
                    'user_id' => $userId
                ]);
                DealAddUser::dispatch($request, $deal);
            }

            if (company_setting('Deal Assign') == true) {
                $emailData = [
                    'deal_name'     => $deal->name,
                    'deal_pipeline' => $deal->pipeline->name,
                    'deal_stage'    => $deal->stage->name,
                    'deal_status'   => $deal->status,
                    'deal_price'    => $deal->price,
                ];
                if (!empty($emailData)) {
                    $message = EmailTemplate::sendEmailTemplate('Deal Assign', $users, $emailData);
                    if ($message['is_success'] == false && !empty($message['error'])) {
                        return back()
                            ->with('success', __('Users have been updated successfully.'))
                            ->with('error', $message['error']);
                    }
                }
            }

            if (!empty($users) && !empty($userIds)) {
                return back()->with('success', __('Users have been updated successfully.'));
            } else {
                return back()->with('error', __('Please select valid user.'));
            }
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function removeUser(Deal $deal, User $user)
    {
        if (Auth::user()->can('delete-deal-users')) {
            DestroyUserDeal::dispatch($deal);
            UserDeal::where('deal_id', $deal->id)->where('user_id', $user->id)->delete();
            return back()->with('success', __('The user has been deleted.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function assignProducts(Request $request, Deal $deal)
    {
        if (Auth::user()->can('create-deal-products')) {
            $usr = Auth::user();

            $existingIds = is_array($deal->products) ? $deal->products : [];
            $newIds = array_merge($existingIds, $request->product_ids);
            $uniqueIds = array_unique(array_filter($newIds));
            $deal->products = $uniqueIds;
            $deal->save();
            DealAddProduct::dispatch($request, $deal);
            $objProduct = [];
            if (Module_is_active('ProductService')) {
                $objProduct = ProductServiceItem::whereIN('id', $uniqueIds)->get()->pluck('name', 'id')->toArray();
            }

            DealActivityLog::create(
                [
                    'user_id' => $usr->id,
                    'deal_id' => $deal->id,
                    'log_type' => 'Add Product',
                    'remark' => json_encode(['title' => implode(",", $objProduct)]),
                ]
            );
            return back()->with('success', __('The products have been assigned successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function getAvailableProducts(Deal $deal)
    {
        if (Auth::user()->can('manage-deal-products')) {
            $assignedIds = is_array($deal->products)
                ? array_filter($deal->products)
                : array_filter(array_map('trim', explode(',', $deal->products ?? '')));

            $products = module_is_active('ProductService')
                ? ProductServiceItem::where('created_by', creatorId())
                ->when(!empty($assignedIds), fn($q) => $q->whereNotIn('id', $assignedIds))
                ->select('id', 'name')
                ->get()
                : collect([]);

            return response()->json($products);
        } else {
            return response()->json(['error' => __('Permission denied')], 403);
        }
    }

    public function removeProduct(Deal $deal, $productId)
    {
        if (Auth::user()->can('delete-deal-products')) {
            $products = $deal->products ?: [];
            $products = array_filter($products, fn($id) => $id != $productId);
            $deal->products = array_values($products);
            $deal->save();
            DestroyDealProduct::dispatch($deal);
            return back()->with('success', __('The product has been deleted.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function assignSources(Request $request, Deal $deal)
    {
        if (Auth::user()->can('create-deal-sources')) {
            $usr = Auth::user();

            $existingIds = is_array($deal->sources) ? $deal->sources : [];
            $newIds = array_merge($existingIds, $request->source_ids);
            $uniqueIds = array_unique(array_filter($newIds));
            $deal->sources = $uniqueIds;
            $deal->save();
            DealSourceUpdate::dispatch($request, $deal);
            DealActivityLog::create(
                [
                    'user_id' => $usr->id,
                    'deal_id' => $deal->id,
                    'log_type' => 'Update Sources',
                    'remark' => json_encode(['title' => 'Update Sources']),
                ]
            );
            return back()->with('success', __('The sources have been assigned successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function removeSource(Deal $deal, $sourceId)
    {
        if (Auth::user()->can('delete-deal-sources')) {
            $sources = $deal->sources ?: [];
            $sources = array_filter($sources, fn($id) => $id != $sourceId);
            $deal->sources = array_values($sources);
            $deal->save();
            DestroyDealSource::dispatch($deal);
            return back()->with('success', __('The source has been deleted.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function storeEmail(StoreDealEmailRequest $request, Deal $deal)
    {
        if (Auth::user()->can('edit-deals')) {
            $usr = Auth::user();
            $validated = $request->validated();

            $deal_email = DealEmail::create([
                'deal_id' => $deal->id,
                'to' => $validated['to'],
                'subject' => $validated['subject'],
                'description' => $validated['description'],
            ]);
            DealAddEmail::dispatch($request, $deal, $deal_email);

            DealActivityLog::create(
                [
                    'user_id' => $usr->id,
                    'deal_id' => $deal->id,
                    'log_type' => 'Create Deal Email',
                    'remark' => json_encode(['title' => 'Create new Deal Email']),
                ]
            );

            if (company_setting('Deal Emails')  == 'on') {
                $lead_users[] = $validated['to'];
                $emailData = [
                    'deal_name' => $deal->name,
                    'deal_email_subject' => $validated['subject'],
                    'deal_email_description' => $validated['description'],
                ];

                // Send Email
                $message = EmailTemplate::sendEmailTemplate('Deal Emails', $lead_users, $emailData);

                if ($message['is_success'] == false && !empty($message['error'])) {
                    return back()
                        ->with('success', __('The email has been created successfully.'))
                        ->with('error', $message['error']);
                }
            }
            return back()->with('success', __('The email has been created successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function storeDiscussion(StoreDealDiscussionRequest $request, Deal $deal)
    {
        if (Auth::user()->can('edit-deals')) {
            $validated = $request->validated();

            DealDiscussion::create([
                'deal_id' => $deal->id,
                'comment' => $validated['message'],
                'creator_id' => Auth::id(),
                'created_by' => creatorId(),
            ]);
            DealAddDiscussion::dispatch($request, $deal);

            return back()->with('success', __('The discussion has been created successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function assignClients(Request $request, Deal $deal)
    {
        if (Auth::user()->can('create-deal-clients')) {
            $clientIds = $request->input('client_ids', []);
            $clients = User::whereIn('id', array_filter($clientIds))->get()->pluck('email', 'id')->toArray();

            foreach (array_keys($clients) as $clientId) {
                ClientDeal::firstOrCreate([
                    'deal_id' => $deal->id,
                    'client_id' => $clientId
                ]);
                DealAddClient::dispatch($request, $deal);
            }

            if (company_setting('Deal Assign') == 'on') {
                $emailData = [
                    'deal_name'     => $deal->name,
                    'deal_pipeline' => $deal->pipeline->name,
                    'deal_stage'    => $deal->stage->name,
                    'deal_status'   => $deal->status,
                    'deal_price'    => $deal->price,
                ];
                if (!empty($emailData)) {
                    $message = EmailTemplate::sendEmailTemplate('Deal Assign', $clients, $emailData);
                    if ($message['is_success'] == false && !empty($message['error'])) {
                        return back()
                            ->with('success', __('The clients have been assigned successfully.'))
                            ->with('error', $message['error']);
                    }
                }
            }

            if (!empty($clients) && !empty($clientIds)) {
                return back()->with('success', __('The clients have been assigned successfully.'));
            } else {
                return back()->with('error', __('Please select valid client.'));
            }
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function removeClient(Deal $deal, User $client)
    {
        if (Auth::user()->can('delete-deal-clients')) {
            ClientDeal::where('deal_id', $deal->id)->where('client_id', $client->id)->delete();
            DestroyDealClient::dispatch($deal);
            return back()->with('success', __('The client has been deleted.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function callStore(StoreDealCallRequest $request)
    {
        if (Auth::user()->can('create-deal-calls')) {
            $usr = Auth::user();
            $deal = Deal::find($request->deal_id);

            $call              = new DealCall();
            $call->deal_id     = $request->deal_id;
            $call->subject     = $request->subject;
            $call->call_type   = $request->call_type;
            $call->duration    = $request->duration;
            $call->user_id     = $request->assignee;
            $call->description = $request->description;
            $call->call_result = $request->call_result;
            $call->save();
            DealAddCall::dispatch($request, $deal);

            DealActivityLog::create([
                'user_id' => $usr->id,
                'deal_id' => $request->deal_id,
                'log_type' => 'Create Deal Call',
                'remark' => json_encode(['title' => 'Create new Deal Call']),
            ]);

            return back()->with('success', __('The call has been created successfully.'))->with('status', 'calls');
        } else {
            return back()->with('error', __('Permission denied'))->with('status', 'calls');
        }
    }

    public function callUpdate(UpdateDealCallRequest $request, $callId)
    {
        if (Auth::user()->can('edit-deal-calls')) {
            $call = DealCall::find($callId);
            $call->subject     = $request->subject;
            $call->call_type   = $request->call_type;
            $call->duration    = $request->duration;
            $call->user_id     = $request->assignee;
            $call->description = $request->description;
            $call->call_result = $request->call_result;
            $call->save();
            DealCallUpdate::dispatch($request, $call);

            return back()->with('success', __('The call details are updated successfully.'))->with('status', 'calls');
        } else {
            return back()->with('error', __('Permission denied'))->with('status', 'calls');
        }
    }

    public function callDestroy($callId)
    {
        if (Auth::user()->can('delete-deal-calls')) {
            $call = DealCall::find($callId);
            DestroyDealCall::dispatch($call);
            $call->delete();

            return back()->with('success', __('The call has been deleted.'))->with('status', 'calls');
        } else {
            return back()->with('error', __('Permission denied'))->with('status', 'calls');
        }
    }

    public function storeFile(Request $request, Deal $deal)
    {
        if (Auth::user()->can('create-deal-files')) {
            $request->validate([
                'images' => 'required|array',
                'images.*' => 'string'
            ]);

            foreach ($request->images as $filePath) {
                $mediaFile = Media::where('file_name', basename($filePath))->first();
                $fileName = basename($filePath);
                DealFile::create([
                    'deal_id'   => $deal->id,
                    'file_name' => $mediaFile ? $mediaFile->name : $fileName,
                    'file_path' => $fileName,
                ]);
                DealUploadFile::dispatch($request, $deal);
            }

            DealActivityLog::create([
                'user_id' => Auth::user()->id,
                'deal_id' => $deal->id,
                'log_type' => 'Upload File',
                'remark' => json_encode(['title' => 'File Upload - ' . count($request->images) . ' file(s) uploaded']),
            ]);

            return back()->with('success', __('Files have been uploaded successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function deleteFile(Deal $deal, $fileId)
    {
        if (Auth::user()->can('delete-deal-files')) {
            $file = DealFile::where('id', $fileId)->where('deal_id', $deal->id)->first();
            if ($file) {
                DestroyDealFile::dispatch($deal);
                $file->delete();
            }

            return back()->with('success', __('The file has been deleted.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function order(Request $request)
    {
        try {
            if (Auth::user()->can('deal-move')) {
                $usr = Auth::user();
                $post = $request->all();
                $deal = Deal::find($post['deal_id']);
                $clients    = ClientDeal::select('client_id')->where('deal_id', '=', $deal->id)->get()->pluck('client_id')->toArray();
                $deal_users = $deal->users->pluck('id')->toArray();
                $usrs       = User::whereIN('id', array_merge($deal_users, $clients))->get()->pluck('email', 'id')->toArray();

                if ($deal->stage_id != $post['stage_id']) {
                    $newStage     = DealStage::find($post['stage_id']);
                    $oldStage     = $deal->stage;

                    DealActivityLog::create([
                        'user_id'  => Auth::user()->id,
                        'deal_id'  => $deal->id,
                        'log_type' => 'Move',
                        'remark'   => json_encode([
                            'title'      => $deal->name,
                            'old_status' => $oldStage->name,
                            'new_status' => $newStage->name,
                        ]),
                    ]);

                    if (company_setting('Deal Move') == 'on') {
                        $emailData = [
                            'deal_name'      => $deal->name,
                            'deal_pipeline'  => $deal->pipeline->name,
                            'deal_status'    => $deal->status,
                            'deal_price'     => $deal->price,
                            'deal_old_stage' => $oldStage->name,
                            'deal_new_stage' => $newStage->name,
                        ];
                        $message = EmailTemplate::sendEmailTemplate('Deal Move', $usrs, $emailData);
                        if ($message['is_success'] == false && !empty($message['error'])) {
                            return back()
                                ->with('success', __('The deal moved successfully.'))
                                ->with('error', $message['error']);
                        }
                    }
                }
                $targetStage = DealStage::find($post['stage_id']);
                foreach ($post['order'] as $key => $item) {
                    $deal           = Deal::find($item);
                    if ($deal) {
                        $deal->order    = $key;
                        $deal->stage_id = $post['stage_id'];
                        if ($targetStage) {
                            if ($targetStage->is_won) {
                                $deal->status = 'Won';
                            } elseif ($targetStage->is_lost) {
                                $deal->status = 'Loss';
                            } else {
                                $deal->status = 'Active';
                            }
                        }
                        $deal->save();
                    }
                }
                DealMoved::dispatch($request, $deal, $oldStage);
                return back()->with('success', __('The deal moved successfully.'));
            } else {
                return back()->with('error', __('Permission denied.'));
            }
        } catch (\Throwable $th) {
            return back()->with('error', __('Something went wrong.'));
        }
    }

    public function changeStatus(Request $request, Deal $deal)
    {
        if (Auth::user()->can('edit-deals')) {
            $deal->status = $request->deal_status;
            $deal->save();
            return back()->with('success', __('The deal status updated successfully.'));
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function saveDefaultPipeline(Request $request)
    {
        $user = Auth::user();
        $user->default_pipeline = $request->pipeline_id;
        $user->save();

        return response()->json(['success' => true]);
    }
}

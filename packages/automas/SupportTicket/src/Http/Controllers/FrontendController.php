<?php

namespace Automas\SupportTicket\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\EmailTemplate;
use App\Models\User;
use Automas\SupportTicket\Events\CreateTicket;
use Automas\SupportTicket\Events\ReplyTicket;
use Automas\SupportTicket\Http\Requests\StoreFrontendContactRequest;
use Automas\SupportTicket\Http\Requests\StoreFrontendTicketRequest;
use Automas\SupportTicket\Http\Requests\StoreTicketReplyRequest;
use Automas\SupportTicket\Models\Contact;
use Automas\SupportTicket\Models\Conversion;
use Automas\SupportTicket\Models\Faq;
use Automas\SupportTicket\Models\KnowledgeBase;
use Automas\SupportTicket\Models\KnowledgeBaseCategory;
use Automas\SupportTicket\Models\QuickLink;
use Automas\SupportTicket\Models\SupportTicketCustomPage;
use Automas\SupportTicket\Models\SupportTicketSetting;
use Automas\SupportTicket\Models\Ticket;
use Automas\SupportTicket\Models\TicketCategory;
use Automas\SupportTicket\Models\TicketField;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;

class FrontendController extends Controller
{
    private function getUserIdFromRequest(Request $request)
    {
        $userSlug = $request->route('slug');
        if ($userSlug) {
            $user = User::where('slug', $userSlug)->first();
            if ($user) {
                return $user->id;
            }
        }
        abort(404, 'Support ticket page not found');
    }

    private function getQuickLinks($userId): array
    {
        try {
            return QuickLink::where('created_by', $userId)
                ->orderBy('order')
                ->get(['title', 'icon', 'link'])
                ->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getTicketCategories($userId): array
    {
        try {
            return TicketCategory::where('created_by', $userId)->get()->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    private function getTicketFields($userId): array
    {
        try {
            $allFields = TicketField::where('created_by', $userId)
                ->where('status', true)
                ->orderBy('order')
                ->get();

            // Ensure default fields exist
            if ($allFields->count() < 1) {
                $allFields = TicketField::where('created_by', $userId)
                    ->where('status', true)
                    ->orderBy('order')
                    ->get();
            }

            return [
                'all_fields' => $allFields->toArray(),
                'custom_fields' => $allFields->where('custom_id', '>', '6')->values()->toArray(),
            ];
        } catch (\Exception $e) {
            return ['all_fields' => [], 'custom_fields' => []];
        }
    }

    public function index(Request $request)
    {
        $userId = $this->getUserIdFromRequest($request);
        $userSlug = $request->route('slug');
        $categories = $this->getTicketCategories($userId);
        $ticketFields = $this->getTicketFields($userId);
        $quickLinks = $this->getQuickLinks($userId);

        return Inertia::render('SupportTicket/Frontend/CreateTicket', [
            'title' => "Create Support Ticket | {$userSlug} | Support Center",
            'categories' => $categories,
            'allFields' => $ticketFields['all_fields'],
            'customFields' => $ticketFields['custom_fields'],
            'quickLinks' => $quickLinks,
        ]);
    }

    public function store(StoreFrontendTicketRequest $request)
    {
        $userId = $this->getUserIdFromRequest($request);
        $userSlug = $request->route('slug');

        try {
            $validated = $request->validated();

            $result = \DB::transaction(function () use ($request, $validated, $userId, &$rawPassword) {
                $ticketId = Ticket::generateTicketId($userId);
                $ticket = new Ticket;
                $ticket->ticket_id = $ticketId;
                $ticket->name = $validated['name'];
                $ticket->email = $validated['email'] ?? null;
                $ticket->phone_number = $validated['phone_number'] ?? null;
                $ticket->category = $validated['category'];
                $ticket->subject = $validated['subject'];
                $ticket->description = $validated['description'];
                $ticket->status = $validated['status'] ?? 'In Progress';
                $ticket->account_type = 'custom';
                $rawPassword = Ticket::generateAccessPassword($ticketId, $validated['phone_number'] ?? null);
                $ticket->access_password = Hash::make($rawPassword);
                $ticket->creator_id = $userId;
                $ticket->created_by = $userId;
                $ticket->save();

                $attachments = [];
                if ($request->hasFile('attachments')) {
                    foreach ($request->file('attachments') as $index => $file) {
                        $filenameWithExt = $file->getClientOriginalName();
                        $filename = pathinfo($filenameWithExt, PATHINFO_FILENAME);
                        $extension = $file->getClientOriginalExtension();
                        $fileNameToStore = $filename . '_' . uniqid() . '.' . $extension;

                        // Create a temporary request with single file
                        $tempRequest = new Request;
                        $tempRequest->files->set('attachment', $file);

                        $upload = upload_file($tempRequest, 'attachment', $fileNameToStore, 'support-ticket/' . $ticket->ticket_id);

                        if ($upload['flag'] == 1) {
                            $attachments[] = [
                                'name' => $filenameWithExt,
                                'path' => $upload['url'],
                            ];
                        } else {
                            throw new \Exception($upload['msg']);
                        }
                    }
                }

                $ticket->attachments = json_encode($attachments);
                $ticket->save();

                // Auto-assign to group members
                $autoAssignSetting = SupportTicketSetting::where('created_by', $userId)
                    ->where('key', 'enable_auto_assign')
                    ->value('value');

                if ($autoAssignSetting === '1') {
                    $settingGroupIds = SupportTicketSetting::where('created_by', $userId)
                        ->where('key', 'support_user_group_ids')
                        ->value('value');

                    $allowedGroupIds = [];
                    if ($settingGroupIds) {
                        $parsed = json_decode($settingGroupIds, true);
                        if (is_array($parsed)) {
                            $allowedGroupIds = array_map('intval', $parsed);
                        }
                    }

                    if (!empty($allowedGroupIds)) {
                        $groupUserIds = \DB::table('user_group_users')
                            ->whereIn('user_group_id', $allowedGroupIds)
                            ->pluck('user_id')
                            ->map('intval')
                            ->unique()
                            ->values()
                            ->all();

                        if (!empty($groupUserIds)) {
                            sort($groupUserIds); // Consistent sorted list of users

                            // Get last assigned user setting with lock
                            $lastAssignedSetting = SupportTicketSetting::where('created_by', $userId)
                                ->where('key', 'last_auto_assigned_user_id')
                                ->lockForUpdate()
                                ->first();

                            $lastAssignedUserId = (int) ($lastAssignedSetting?->value ?? 0);

                            $nextUserId = null;
                            if ($lastAssignedUserId > 0) {
                                $currentIndex = array_search($lastAssignedUserId, $groupUserIds);
                                if ($currentIndex !== false && isset($groupUserIds[$currentIndex + 1])) {
                                    $nextUserId = $groupUserIds[$currentIndex + 1];
                                } else {
                                    $nextUserId = $groupUserIds[0]; // Loop back to start
                                }
                            } else {
                                $nextUserId = $groupUserIds[0];
                            }

                            if ($nextUserId) {
                                // Find primary team_id for nextUserId
                                $primaryTeamId = \DB::table('user_group_users')
                                    ->where('user_id', $nextUserId)
                                    ->whereIn('user_group_id', $allowedGroupIds)
                                    ->value('user_group_id');

                                $ticket->assigned_to = $nextUserId;
                                $ticket->team_id = $primaryTeamId ?: null;
                                $ticket->save();

                                // Update last assigned user ID setting
                                SupportTicketSetting::updateOrCreate(
                                    ['key' => 'last_auto_assigned_user_id', 'created_by' => $userId],
                                    ['value' => (string) $nextUserId]
                                );
                            }
                        }
                    }
                }

                // Save custom field data
                if ($request->has('fields') && !empty($request->fields)) {
                    TicketField::saveData($ticket, $request->fields);
                }

                return $ticket;
            });

            $encryptedId = Crypt::encrypt($result->id);

            // Send email notification for new ticket to customer
            if (!empty(company_setting('New Ticket', $userId)) && company_setting('New Ticket', $userId) == true) {
                $uArr = [
                    'ticket_name' => $result->name,
                    'email' => $result->email,
                    'ticket_id' => $result->ticket_id,
                    'ticket_password' => $rawPassword,
                    'ticket_url' => route('support-ticket.show.ticket', [$userSlug, $encryptedId]),
                ];
                EmailTemplate::sendEmailTemplate('New Ticket', [$result->email], $uArr, $userId);
            }

            // Store ticket authorization in session for instant access
            session(['ticket_access_' . $result->id => true]);

            // Dispatch event
            CreateTicket::dispatch($request, $result, $rawPassword);

            $ticketLink = route('support-ticket.show.ticket', [$userSlug, $encryptedId]);

            return redirect()->route('support-ticket.index', $userSlug)
                ->with('success', __('The Ticket has been created successfully. Your Ticket Number is ') . '<b>' . $result->ticket_id . '</b>' . __(' and Password is ') . '<b>' . $rawPassword . '</b>. <a href="' . $ticketLink . '"><b>' . __('Click here to view your ticket.') . '</b></a>');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage() ?: __('Failed to create ticket. Please try again.'));
        }
    }

    public function search(Request $request)
    {
        $userId = $this->getUserIdFromRequest($request);
        $userSlug = $request->route('slug');

        $searchQuery = trim($request->input('q', $request->input('search_query', $request->input('ticket_id', ''))));

        if (empty($searchQuery)) {
            return Inertia::render('SupportTicket/Frontend/SearchTicket', [
                'title' => "Search Ticket | {$userSlug} | Support Center",
                'searchQuery' => '',
            ]);
        }

        try {
            $hasOnlyPhoneChars = preg_match('/^\+?[0-9\s\-]+$/', $searchQuery);
            $digitCount = strlen(preg_replace('/\D/', '', $searchQuery));

            if ($hasOnlyPhoneChars && $digitCount >= 6) {
                $digits = preg_replace('/\D/', '', $searchQuery);

                $tickets = Ticket::where('created_by', $userId)
                    ->where(function ($q) use ($searchQuery, $digits) {
                        $q->where('phone_number', $searchQuery)
                            ->orWhereRaw("REGEXP_REPLACE(phone_number, '[^0-9]', '') LIKE ?", ["%{$digits}%"]);
                    })
                    ->with(['tcategory', 'assignedTo'])
                    ->latest()
                    ->get();

                if ($tickets->isEmpty()) {
                    return Inertia::render('SupportTicket/Frontend/SearchTicket', [
                        'title' => "Search Ticket | {$userSlug} | Support Center",
                        'searchQuery' => $searchQuery,
                        'errorMessage' => __('No tickets found for this phone number.')
                    ]);
                }

                $mappedTickets = $tickets->map(function ($ticket) {
                    return [
                        'id' => $ticket->id,
                        'encrypted_id' => Crypt::encrypt($ticket->id),
                        'ticket_id' => $ticket->ticket_id,
                        'subject' => $ticket->subject,
                        'name' => $ticket->name,
                        'phone_number' => $ticket->phone_number,
                        'status' => $ticket->status,
                        'category' => $ticket->tcategory?->name ?? 'N/A',
                        'support_person' => $ticket->assignedTo?->name ?? null,
                        'created_at' => $ticket->created_at->format('Y-m-d H:i:s'),
                    ];
                })->toArray();

                return Inertia::render('SupportTicket/Frontend/SearchTicket', [
                    'title' => "Search Ticket | {$userSlug} | Support Center",
                    'tickets' => $mappedTickets,
                    'searchQuery' => $searchQuery,
                ]);
            } else {
                // Strict Ticket Number Search ONLY (exact match on ticket_id column)
                $ticket = Ticket::where('created_by', $userId)
                    ->where('ticket_id', $searchQuery)
                    ->with(['tcategory', 'assignedTo'])
                    ->first();

                if (!$ticket) {
                    return Inertia::render('SupportTicket/Frontend/SearchTicket', [
                        'title' => "Search Ticket | {$userSlug} | Support Center",
                        'searchQuery' => $searchQuery,
                        'errorMessage' => __('Ticket not found. Please check your Ticket ID or Phone Number.')
                    ]);
                }

                $searchResult = [
                    'id' => $ticket->id,
                    'encrypted_id' => Crypt::encrypt($ticket->id),
                    'ticket_id' => $ticket->ticket_id,
                    'subject' => $ticket->subject,
                    'name' => $ticket->name,
                    'phone_number' => $ticket->phone_number,
                    'status' => $ticket->status,
                    'category' => $ticket->tcategory?->name ?? 'N/A',
                    'support_person' => $ticket->assignedTo?->name ?? null,
                    'created_at' => $ticket->created_at->format('Y-m-d H:i:s'),
                ];

                return Inertia::render('SupportTicket/Frontend/SearchTicket', [
                    'title' => "Search Ticket | {$userSlug} | Support Center",
                    'searchResult' => $searchResult,
                    'searchQuery' => $searchQuery,
                ]);
            }
        } catch (\Exception $e) {
            return Inertia::render('SupportTicket/Frontend/SearchTicket', [
                'title' => "Search Ticket | {$userSlug} | Support Center",
                'searchQuery' => $searchQuery,
                'errorMessage' => __('Failed to search ticket. Please try again.')
            ]);
        }
    }

    public function searchTicket(Request $request)
    {
        $userSlug = $request->route('slug');
        $query = trim($request->input('search_query', $request->input('ticket_id', $request->input('q', ''))));

        return redirect()->route('support-ticket.search', [
            'slug' => $userSlug,
            'q' => $query
        ]);
    }

    public function myTicket(Request $request)
    {
        $userId = $this->getUserIdFromRequest($request);
        $userSlug = $request->route('slug');

        // Check for active ticket sessions
        $sessionKeys = array_keys(session()->all());
        $activeTicketIds = [];
        foreach ($sessionKeys as $key) {
            if (str_starts_with($key, 'ticket_access_') && session($key) === true) {
                $tId = (int) str_replace('ticket_access_', '', $key);
                if ($tId > 0) {
                    $activeTicketIds[] = $tId;
                }
            }
        }

        $authenticatedTickets = [];
        if (!empty($activeTicketIds)) {
            $tickets = Ticket::whereIn('id', $activeTicketIds)
                ->where('created_by', $userId)
                ->with('tcategory')
                ->latest()
                ->get();

            $authenticatedTickets = $tickets->map(function ($ticket) use ($userSlug) {
                $encryptedId = Crypt::encrypt($ticket->id);

                return [
                    'id' => $ticket->id,
                    'ticket_id' => $ticket->ticket_id,
                    'subject' => $ticket->subject,
                    'status' => $ticket->status,
                    'category' => $ticket->tcategory?->name ?? 'N/A',
                    'created_at' => $ticket->created_at->format('Y-m-d H:i:s'),
                    'url' => route('support-ticket.show.ticket', [$userSlug, $encryptedId]),
                ];
            })->toArray();
        }

        return Inertia::render('SupportTicket/Frontend/MyTicket', [
            'title' => "My Ticket | {$userSlug} | Support Center",
            'authenticatedTickets' => $authenticatedTickets,
            'initialTicketId' => $request->query('ticket_id', ''),
        ]);
    }

    public function authenticateTicketAccess(Request $request)
    {
        $userId = $this->getUserIdFromRequest($request);
        $userSlug = $request->route('slug');

        $request->validate([
            'ticket_id' => 'required|string',
            'password' => 'required|string',
        ]);

        $ticket = Ticket::where('ticket_id', trim($request->ticket_id))
            ->where('created_by', $userId)
            ->first();

        if (!$ticket) {
            return back()->with('error', __('Invalid Access Credentials.'));
        }

        $inputPassword = trim($request->password);
        $expectedStaticPass = Ticket::generateAccessPassword($ticket->ticket_id, $ticket->phone_number);

        $isValid = (!empty($ticket->access_password) && Hash::check($inputPassword, $ticket->access_password))
            || ($inputPassword === $expectedStaticPass);

        if (!$isValid) {
            return back()->with('error', __('Invalid Access Credentials.'));
        }

        if (empty($ticket->access_password) || !Hash::check($expectedStaticPass, $ticket->access_password)) {
            $ticket->access_password = Hash::make($expectedStaticPass);
            $ticket->save();
        }

        // Store ticket authorization in session
        session(['ticket_access_' . $ticket->id => true]);

        $encryptedId = Crypt::encrypt($ticket->id);

        return redirect()->route('support-ticket.show.ticket', [$userSlug, $encryptedId])
            ->with('success', __('Authenticated successfully.'));
    }

    public function logoutTicketAccess(Request $request)
    {
        $userSlug = $request->route('slug');
        $ticketId = $request->input('ticket_id');

        if ($ticketId) {
            session()->forget('ticket_access_' . $ticketId);
        } else {
            // Clear all ticket access sessions
            foreach (array_keys(session()->all()) as $key) {
                if (str_starts_with($key, 'ticket_access_')) {
                    session()->forget($key);
                }
            }
        }

        return redirect()->route('support-ticket.my-ticket', [$userSlug])
            ->with('success', __('Logged out from ticket session successfully.'));
    }

    public function knowledge(Request $request)
    {
        $userId = $this->getUserIdFromRequest($request);
        $userSlug = $request->route('slug');

        try {
            $categories = KnowledgeBaseCategory::where('created_by', $userId)->get();
            $knowledgeItems = KnowledgeBase::with('category')
                ->where('created_by', $userId)
                ->get();
        } catch (\Exception $e) {
            $knowledgeItems = collect();
            $categories = collect();
        }

        return Inertia::render('SupportTicket/Frontend/Knowledge', [
            'title' => "Knowledge Base | {$userSlug} | Support Center",
            'knowledgeItems' => $knowledgeItems,
            'categories' => $categories,
        ]);
    }

    public function faq(Request $request)
    {
        $userId = $this->getUserIdFromRequest($request);
        $userSlug = $request->route('slug');

        try {
            $faqs = Faq::where('created_by', $userId)->get();
        } catch (\Exception $e) {
            $faqs = collect();
        }

        return Inertia::render('SupportTicket/Frontend/Faq', [
            'title' => "FAQ | {$userSlug} | Support Center",
            'faqs' => $faqs,
        ]);
    }

    public function knowledgeArticle(Request $request, $userSlug, $id)
    {
        $userId = $this->getUserIdFromRequest($request);

        try {
            $article = KnowledgeBase::with('category')
                ->where('id', $id)
                ->where('created_by', $userId)
                ->firstOrFail();

            $relatedArticles = KnowledgeBase::where('created_by', $userId)
                ->where('id', '!=', $id)
                ->when($article->category_id, function ($query) use ($article) {
                    $query->where('category_id', $article->category_id);
                })
                ->limit(3)
                ->get(['id', 'title', 'description', 'created_at']);

            if ($relatedArticles->count() < 3) {
                $additionalArticles = KnowledgeBase::where('created_by', $userId)
                    ->where('id', '!=', $id)
                    ->when($article->category_id, function ($query) use ($article) {
                        $query->where('category_id', '!=', $article->category_id);
                    })
                    ->limit(3 - $relatedArticles->count())
                    ->get(['id', 'title', 'description', 'created_at']);

                $relatedArticles = $relatedArticles->merge($additionalArticles);
            }

            return Inertia::render('SupportTicket/Frontend/KnowledgeArticle', [
                'title' => "{$article->title} | {$userSlug} | Support Center",
                'article' => $article,
                'relatedArticles' => $relatedArticles,
            ]);
        } catch (\Exception $e) {
            return redirect()->route('support-ticket.knowledge', htmlspecialchars($userSlug, ENT_QUOTES, 'UTF-8'))->with('error', __('Article not found.'));
        }
    }

    public function contact(Request $request)
    {
        $userSlug = $request->route('slug');

        return Inertia::render('SupportTicket/Frontend/Contact', [
            'title' => "Contact Us | {$userSlug} | Support Center",
        ]);
    }

    public function storeContact(StoreFrontendContactRequest $request)
    {
        $userId = $this->getUserIdFromRequest($request);

        try {
            $validated = $request->validated();

            $contact = new Contact;
            $contact->first_name = $validated['firstName'];
            $contact->last_name = $validated['lastName'];
            $contact->email = $validated['email'];
            $contact->subject = $validated['subject'];
            $contact->message = $validated['message'];
            $contact->creator_id = $userId;
            $contact->created_by = $userId;
            $contact->save();

            return back()->with('success', __('The contact has been added successfully.'));
        } catch (\Exception $e) {
            return back()->with('error', __('Failed to send message. Please try again.'));
        }
    }

    public function showByTicketId($slug, $ticket_id)
    {
        $user = User::where('slug', $slug)->first();
        if (!$user) {
            abort(404, 'Support ticket page not found');
        }
        $userId = $user->id;

        try {
            $decrypted_id = Crypt::decrypt($ticket_id);
            $ticket = Ticket::where('id', $decrypted_id)
                ->where('created_by', $userId)
                ->firstOrFail();

            $hasAccess = session()->has('ticket_access_' . $ticket->id) && session('ticket_access_' . $ticket->id) === true;

            if (!$hasAccess) {
                return Inertia::render('SupportTicket/Frontend/Show', [
                    'title' => "Protected Ticket | {$slug} | Support Center",
                    'ticket' => [
                        'id' => $ticket->id,
                        'ticket_id' => $ticket->ticket_id,
                        'name' => '',
                        'email' => '',
                        'subject' => '',
                        'status' => '',
                        'description' => '',
                        'created_at' => '',
                        'attachments' => [],
                        'total_conversions' => 0,
                        'has_more_conversions' => false,
                        'conversions' => [],
                    ],
                    'requiresPassword' => true,
                    'ticketNumber' => $ticket->ticket_id,
                    'encryptedTicketId' => $ticket_id,
                ]);
            }

            if ($ticket->attachments) {
                $ticket->attachments = json_decode($ticket->attachments, true) ?: [];
            }

            $totalConversions = Conversion::where('ticket_id', $ticket->id)->count();
            // Fetch latest 10 messages from DB, then reverse to chronological order (oldest -> newest)
            $initialConversions = Conversion::with('creator')
                ->where('ticket_id', $ticket->id)
                ->orderBy('id', 'desc')
                ->take(10)
                ->get()
                ->reverse()
                ->values();

            $hasMoreConversions = false;
            if ($initialConversions->isNotEmpty()) {
                $oldestId = $initialConversions->first()->id;
                $hasMoreConversions = Conversion::where('ticket_id', $ticket->id)->where('id', '<', $oldestId)->exists();
            }
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Ticket not found'));
        }

        $companyName = company_setting('company_name', $userId);
        $ticketData = [
            'id' => $ticket->id,
            'ticket_id' => $ticket->ticket_id,
            'name' => $ticket->name,
            'email' => $ticket->email,
            'subject' => $ticket->subject,
            'status' => $ticket->status,
            'description' => $ticket->description,
            'created_at' => $ticket->created_at->toISOString(),
            'attachments' => $ticket->formatted_attachments,
            'total_conversions' => $totalConversions,
            'has_more_conversions' => $hasMoreConversions,
            'conversions' => $initialConversions->map(function ($conversation) use ($ticket, $companyName) {
                $replyByName = 'User';
                if ($conversation->sender === 'admin') {
                    $replyByName = $conversation->replyBy()?->name ?: ($companyName ?: 'Admin');
                } else {
                    $replyByName = $ticket->name;
                }

                return [
                    'id' => $conversation->id,
                    'description' => html_entity_decode($conversation->description),
                    'sender' => $conversation->sender,
                    'created_at' => $conversation->created_at ? $conversation->created_at->toISOString() : null,
                    'attachments' => $conversation->formatted_attachments,
                    'replyBy' => ['name' => $replyByName],
                ];
            }),
        ];

        return Inertia::render('SupportTicket/Frontend/Show', [
            'title' => "Ticket #{$ticket->ticket_id} | {$slug} | Support Center",
            'ticket' => $ticketData,
        ]);
    }

    /**
     * Public Load More conversions endpoint.
     */
    public function getConversions(Request $request, $slug, $ticketId)
    {
        $user = User::where('slug', $slug)->first();
        if (!$user) {
            return response()->json(['error' => __('Not found')], 404);
        }
        $userId = $user->id;

        try {
            $decrypted_id = is_numeric($ticketId) ? $ticketId : Crypt::decrypt($ticketId);
            $ticket = Ticket::where('id', $decrypted_id)
                ->where('created_by', $userId)
                ->firstOrFail();

            // Check session authentication
            if (!session()->has('ticket_access_' . $ticket->id) && !Auth::check()) {
                return response()->json(['error' => __('Unauthorized')], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => __('Ticket not found')], 404);
        }

        $query = Conversion::with('creator')->where('ticket_id', $ticket->id);
        if ($request->filled('before_id')) {
            $query->where('id', '<', $request->before_id);
        }

        $conversions = $query->orderBy('id', 'desc')->take(10)->get()->reverse()->values();
        $hasMore = false;
        if ($conversions->isNotEmpty()) {
            $oldestId = $conversions->first()->id;
            $hasMore = Conversion::where('ticket_id', $ticket->id)->where('id', '<', $oldestId)->exists();
        }

        $companyName = company_setting('company_name', $userId);
        $formatted = $conversions->map(function ($conversation) use ($ticket, $companyName) {
            $replyByName = 'User';
            if ($conversation->sender === 'admin') {
                $replyByName = $conversation->replyBy()?->name ?: ($companyName ?: 'Admin');
            } else {
                $replyByName = $ticket->name;
            }

            return [
                'id' => $conversation->id,
                'description' => html_entity_decode($conversation->description),
                'sender' => $conversation->sender,
                'created_at' => $conversation->created_at ? $conversation->created_at->toISOString() : null,
                'attachments' => $conversation->formatted_attachments,
                'replyBy' => ['name' => $replyByName],
            ];
        });

        return response()->json([
            'conversions' => $formatted,
            'has_more' => $hasMore,
        ]);
    }

    public function customPage(Request $request, $userSlug, $pageSlug)
    {
        $userId = $this->getUserIdFromRequest($request);

        $customPage = SupportTicketCustomPage::where('slug', $pageSlug)
            ->where('created_by', $userId)
            ->firstOrFail();

        return Inertia::render('SupportTicket/Frontend/CustomPage', [
            'title' => "{$customPage->title} | {$userSlug} | Support Center",
            'customPage' => $customPage,
        ]);
    }

    public function privacyPolicy(Request $request)
    {
        $userId = $this->getUserIdFromRequest($request);
        $userSlug = $request->route('slug');

        $privacyPage = SupportTicketCustomPage::where('slug', 'privacy-policy')
            ->where('created_by', $userId)
            ->first();

        return Inertia::render('SupportTicket/Frontend/PrivacyPolicy', [
            'title' => "Privacy Policy | {$userSlug} | Support Center",
            'privacyPolicy' => $privacyPage ? ['content' => $privacyPage->contents, 'enabled' => $privacyPage->enable_page_footer === 'on'] : null,
        ]);
    }

    public function termsConditions(Request $request)
    {
        $userId = $this->getUserIdFromRequest($request);
        $userSlug = $request->route('slug');

        $termsPage = SupportTicketCustomPage::where('slug', 'terms-conditions')
            ->where('created_by', $userId)
            ->first();

        return Inertia::render('SupportTicket/Frontend/TermsConditions', [
            'title' => "Terms & Conditions | {$userSlug} | Support Center",
            'termsConditions' => $termsPage ? ['content' => $termsPage->contents, 'enabled' => $termsPage->enable_page_footer === 'on'] : null,
        ]);
    }

    public function storeReply(StoreTicketReplyRequest $request, $slug, $ticketId)
    {
        $userId = $this->getUserIdFromRequest($request);
        try {
            $decrypted_id = Crypt::decrypt($ticketId);
            $ticket = Ticket::where('id', $decrypted_id)
                ->where('created_by', $userId)
                ->firstOrFail();
        } catch (\Exception $e) {
            return back()->with('error', __('Ticket not found'));
        }

        if (in_array(strtolower($ticket->status), ['closed', 'resolved'], true)) {
            return back()->with('error', __('This ticket is already closed. You cannot send further replies.'));
        }

        // Handle file attachments
        $attachments = [];
        if ($request->hasFile('attachments')) {
            try {
                foreach ($request->file('attachments') as $file) {
                    $filenameWithExt = $file->getClientOriginalName();
                    $filename = pathinfo($filenameWithExt, PATHINFO_FILENAME);
                    $extension = $file->getClientOriginalExtension();
                    $fileNameToStore = $filename . '_' . uniqid() . '.' . $extension;

                    $tempRequest = new Request;
                    $tempRequest->files->set('attachment', $file);

                    $upload = upload_file($tempRequest, 'attachment', $fileNameToStore, 'support-ticket/' . $ticket->ticket_id);

                    if ($upload['flag'] == 1) {
                        $attachments[] = [
                            'name' => $filenameWithExt,
                            'path' => $upload['url'],
                        ];
                    } else {
                        return back()->with('error', $upload['msg']);
                    }
                }
            } catch (\Exception $e) {
                return back()->with('error', __('Failed to upload attachments. Please try again.'));
            }
        }

        // Create conversation
        $conversion = new Conversion;
        $conversion->ticket_id = $ticket->id;
        $conversion->description = $request->description;
        $conversion->sender = 'user';
        $conversion->attachments = $attachments;
        $conversion->creator_id = $userId;
        $conversion->created_by = $userId;
        $conversion->save();

        // Dispatch reply event
        ReplyTicket::dispatch($request, $conversion, $ticket);

        // Send email notification if enabled
        if (!empty(company_setting('New Ticket Reply', $userId)) && company_setting('New Ticket Reply', $userId) == true) {
            $user = User::find($userId);

            $uArr = [
                'ticket_name' => $ticket->name,
                'ticket_id' => $ticket->ticket_id,
                'email' => $ticket->email,
                'reply_description' => $request->description,
            ];
            try {
                EmailTemplate::sendEmailTemplate('New Ticket Reply', [$user->email], $uArr, $userId);
            } catch (\Exception $e) {
                return redirect()->back()->with('error', __('Ticket not found'));
            }
        }

        return back()->with('success', __('The reply has been added successfully'));
    }

    public function show(Request $request, $id)
    {
        $userId = $this->getUserIdFromRequest($request);
        $userSlug = $request->route('slug');

        try {
            if ($id) {
                $decryptedId = Crypt::decrypt($id);
                $ticket = Ticket::find($decryptedId);
            } else {
                return redirect()->route('support-tickets.index')->with('error', __('Invalid ticket ID'));
            }
        } catch (\Exception $e) {
            $ticket = null;
        }

        if (!$ticket) {
            return redirect()->route('support-tickets.index')->with('error', __('Ticket not found'));
        }

        // Load category
        $category = null;
        if ($ticket->category) {
            $category = TicketCategory::find($ticket->category);
        }

        $totalConversions = Conversion::where('ticket_id', $ticket->id)->count();
        $initialConversions = Conversion::with('creator')
            ->where('ticket_id', $ticket->id)
            ->orderBy('id', 'desc')
            ->take(10)
            ->get()
            ->reverse()
            ->values();

        $hasMoreConversions = false;
        if ($initialConversions->isNotEmpty()) {
            $oldestId = $initialConversions->first()->id;
            $hasMoreConversions = Conversion::where('ticket_id', $ticket->id)
                ->where('id', '<', $oldestId)
                ->exists();
        }

        $companyName = company_setting('company_name', $userId);
        $ticketData = [
            'id' => $ticket->id,
            'ticket_id' => $ticket->ticket_id,
            'name' => $ticket->name,
            'email' => $ticket->email,
            'user_id' => $ticket->user_id,
            'account_type' => $ticket->account_type,
            'category' => $ticket->category,
            'subject' => $ticket->subject,
            'status' => $ticket->status,
            'description' => $ticket->description,
            'note' => $ticket->note,
            'attachments' => $ticket->formatted_attachments,
            'total_conversions' => $totalConversions,
            'has_more_conversions' => $hasMoreConversions,

            'category_info' => $category ? [
                'id' => $category->id,
                'name' => $category->name,
                'color' => $category->color ?? '#000000',
            ] : null,
            'conversions' => $initialConversions->map(function ($conversation) use ($ticket, $companyName) {
                $replyByName = 'User';
                if ($conversation->sender === 'admin') {
                    $replyByName = $conversation->replyBy()?->name ?: ($companyName ?: 'Admin');
                } else {
                    $replyByName = $ticket->name;
                }

                return [
                    'id' => $conversation->id,
                    'ticket_id' => $conversation->ticket_id,
                    'description' => html_entity_decode($conversation->description),
                    'sender' => $conversation->sender,
                    'attachments' => $conversation->formatted_attachments,
                    'created_at' => $conversation->created_at ? $conversation->created_at->toISOString() : null,
                    'replyBy' => ['name' => $replyByName],
                ];
            }),
            'created_at' => $ticket->created_at ? $ticket->created_at->toISOString() : null,
            'updated_at' => $ticket->updated_at ? $ticket->updated_at->toISOString() : null,
        ];

        return Inertia::render('SupportTicket/Frontend/Show', [
            'title' => "Ticket #{$ticket->ticket_id} | {$userSlug} | Support Center",
            'ticket' => $ticketData,
        ]);
    }
}

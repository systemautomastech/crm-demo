<?php

namespace Automas\SupportTicket\Http\Controllers;

use App\Models\User;
use App\Models\UserGroup;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Models\EmailTemplate;
use Automas\SupportTicket\Events\CreateTicket;
use Automas\SupportTicket\Events\CreateTicketConversion;
use Automas\SupportTicket\Events\DestroyTicket;
use Automas\SupportTicket\Events\UpdateTicket;
use Automas\SupportTicket\Http\Requests\StoreSupportTicketRequest;
use Automas\SupportTicket\Http\Requests\UpdateSupportTicketRequest;
use Automas\SupportTicket\Http\Requests\StoreConversionRequest;
use Automas\SupportTicket\Models\Ticket;
use Automas\SupportTicket\Models\TicketCategory;
use Automas\SupportTicket\Models\Conversion;
use Automas\SupportTicket\Models\TicketField;
use Automas\SupportTicket\Models\SupportTicketSetting;


class SupportTicketController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $userId = $user->id;
        $creatorId = creatorId();

        if (!$user->can('manage-support-tickets')) {
            return back()->with('error', __('Permission denied'));
        }

        $settings = SupportTicketSetting::query()
            ->where('created_by', $creatorId)
            ->whereIn('key', [
                'support_user_group_ids',
                'enable_group_assignment',
                'allow_ticket_pickup',
                'allow_ticket_forward',
                'allow_user_assign',
                'allow_unpicked_ticket_edit',
                'enable_auto_assign',
                'allow_ticket_delete',
            ])
            ->pluck('value', 'key');

        $allowedGroupIds = [];

        if (!empty($settings['support_user_group_ids'])) {
            $groupIds = json_decode($settings['support_user_group_ids'], true);

            if (is_array($groupIds)) {
                $allowedGroupIds = array_map('intval', $groupIds);
            }
        }

        $userGroupIds = \DB::table('user_group_users')
            ->where('user_id', $userId)
            ->pluck('user_group_id')
            ->map(fn($id) => (int) $id)
            ->all();

        $supportGroups = array_values(
            array_intersect($userGroupIds, $allowedGroupIds)
        );

        $isSupportGroupUser = !empty($supportGroups);

        $groupId = $supportGroups[0]
            ?? $userGroupIds[0]
            ?? null;

        $query = Ticket::query()
            ->with([
                'tcategory',
                'assignedTo',
                'team',
                'creator',
            ])
            ->where('created_by', $creatorId);

        $isCompanyOrAdmin = in_array($user->type ?? '', ['company', 'super admin'], true) || $user->hasRole('company');

        if (!$isCompanyOrAdmin) {
            $query->where(function ($q) use ($userId, $userGroupIds) {
                // User's own assigned tickets
                $q->where('assigned_to', $userId)
                    ->orWhere(function ($sub) use ($userGroupIds) {
                        // Unpicked tickets
                        $sub->whereNull('assigned_to')
                            ->whereNotIn('status', ['Closed', 'closed', 'Resolved', 'resolved'])
                            ->where(function ($g) use ($userGroupIds) {
                                if (!empty($userGroupIds)) {
                                    $g->whereIn('team_id', $userGroupIds)
                                        ->orWhereNull('team_id');
                                } else {
                                    $g->whereNull('team_id');
                                }
                            });
                    });
            });
        }

        if ($request->filled('search')) {
            $search = $request->input('search');

            $query->where(function ($q) use ($search) {
                $q->where('ticket_id', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('account_type')) {
            $query->where('account_type', $request->input('account_type'));
        }

        $allowedSortFields = [
            'ticket_id',
            'name',
            'email',
            'subject',
            'status',
            'created_at',
        ];

        $sortField = $request->input('sort');
        $sortDirection = strtolower($request->input('direction', 'asc'));

        if (
            in_array($sortField, $allowedSortFields, true) &&
            in_array($sortDirection, ['asc', 'desc'], true)
        ) {
            $query->orderBy($sortField, $sortDirection);
        } else {
            $query->latest('created_at');
        }

        $perPage = (int) $request->input('per_page', 10);
        $perPage = max(1, min($perPage, 100));

        $tickets = $query->paginate($perPage);

        $allowPickup = ($settings['allow_ticket_pickup'] ?? '1') === '1';
        $allowForward = ($settings['allow_ticket_forward'] ?? '1') === '1';
        $allowUserAssignment = ($settings['allow_user_assign'] ?? '1') === '1';
        $allowUnpickedTicketEdit = ($settings['allow_unpicked_ticket_edit'] ?? '0') === '1';
        $enableAutoAssign = ($settings['enable_auto_assign'] ?? '0') === '1';
        $allowDelete = ($settings['allow_ticket_delete'] ?? '1') === '1';

        $tickets->getCollection()->transform(function ($ticket) use ($user, $groupId, $userGroupIds, $isCompanyOrAdmin, $allowPickup, $allowUserAssignment, $allowUnpickedTicketEdit, $allowDelete) {
            $isTeamMemberOrAdmin = $isCompanyOrAdmin || (empty($ticket->team_id) || in_array((int)$ticket->team_id, $userGroupIds, true));
            return [
                'id' => $ticket->id,
                'encrypted_id' => Crypt::encrypt($ticket->id),
                'ticket_id' => $ticket->ticket_id,
                'name' => $ticket->name,
                'email' => $ticket->email,
                'phone_number' => $ticket->phone_number,
                'account_type' => $ticket->account_type,
                'subject' => $ticket->subject,
                'status' => $ticket->status,
                'assigned_to' => $ticket->assigned_to,
                'team_id' => $ticket->team_id,
                'assigned_to_name' => $ticket->assignedTo?->name ?? '',
                'team_name' => $ticket->team?->name ?? '',
                'can_pick' => empty($ticket->assigned_to) && !in_array(strtolower($ticket->status), ['closed', 'resolved'], true) && ($allowPickup || $isCompanyOrAdmin) && $isTeamMemberOrAdmin,
                'can_edit' => in_array(strtolower($ticket->status), ['closed', 'resolved'], true)
                    ? $isCompanyOrAdmin
                    : (!empty($ticket->assigned_to)
                        ? ($ticket->assigned_to == $user->id || $isCompanyOrAdmin)
                        : (($isCompanyOrAdmin || $allowUnpickedTicketEdit) && $isTeamMemberOrAdmin)),
                'can_delete' => in_array(strtolower($ticket->status), ['closed', 'resolved'], true)
                    ? $isCompanyOrAdmin
                    : ($isCompanyOrAdmin || $allowDelete),
                'can_assign_user' => $isCompanyOrAdmin || $allowUserAssignment,
                'user_primary_team_id' => $groupId,
                'category' => [
                    'name' => $ticket->tcategory?->name ?? 'No Category',
                    'color' => $ticket->tcategory?->color ?? '#6B7280',
                ],
                'user_slug' => $ticket->creator?->slug,
                'created_at' => $ticket->created_at->toISOString(),
                'updated_at' => $ticket->updated_at->toISOString(),
                'formatted_created_at' => $ticket->created_at->format('Y-m-d H:i:s'),
            ];
        });

        $categories = TicketCategory::query()
            ->when(
                $user->can('manage-any-ticket-categories'),
                fn($q) => $q->where('created_by', $creatorId)
            )
            ->when(
                !$user->can('manage-any-ticket-categories') &&
                $user->can('manage-own-ticket-categories'),
                fn($q) => $q->where('creator_id', $userId)
            )
            ->when(
                !$user->can('manage-any-ticket-categories') &&
                !$user->can('manage-own-ticket-categories'),
                fn($q) => $q->whereRaw('1 = 0')
            )
            ->get();

        $supportTeams = UserGroup::where('created_by', $creatorId)
            ->where('is_active', true)
            ->whereIn('id', $allowedGroupIds)
            ->select('id', 'name')
            ->get();

        $groupUserIds = \DB::table('user_group_users')
            ->whereIn('user_group_id', $allowedGroupIds)
            ->pluck('user_id')
            ->unique()
            ->all();

        $supportUsers = User::where('created_by', $creatorId)
            ->where('is_disable', 0)
            ->whereIn('id', $groupUserIds)
            ->select('id', 'name', 'email')
            ->get();

        $ticketQuery = Ticket::query()->where('created_by', $creatorId);

        $stats = [];
        if ($isCompanyOrAdmin) {
            $stats = [
                'total_tickets' => (clone $ticketQuery)->count(),
                'todays_tickets' => (clone $ticketQuery)->whereDate('created_at', now()->today())->count(),
                'on_process' => (clone $ticketQuery)->whereIn('status', ['In Progress', 'in progress', 'open', 'Open'])->count(),
                'unpicked' => (clone $ticketQuery)->whereNull('assigned_to')->count(),
                'overdue' => (clone $ticketQuery)->whereNotIn('status', ['Closed', 'closed'])->where('created_at', '<=', now()->subHours(24))->count(),
                'closed_tickets' => (clone $ticketQuery)->whereIn('status', ['Closed', 'closed', 'Resolved', 'resolved'])->count(),
            ];
        } else {
            $avgTimeMinutes = (int) (clone $ticketQuery)
                ->where('assigned_to', $userId)
                ->whereNotNull('picked_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, created_at, picked_at)) as avg_diff')
                ->value('avg_diff') ?? 0;

            $avgPickFormatted = $avgTimeMinutes > 60 
                ? round($avgTimeMinutes / 60, 1) . ' hrs'
                : ($avgTimeMinutes > 0 ? $avgTimeMinutes . ' mins' : 'N/A');

            $avgCloseMinutes = (int) (clone $ticketQuery)
                ->where('assigned_to', $userId)
                ->whereIn('status', ['Closed', 'closed', 'Resolved', 'resolved'])
                ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as avg_close_diff')
                ->value('avg_close_diff') ?? 0;

            $avgCloseFormatted = $avgCloseMinutes > 60 
                ? round($avgCloseMinutes / 60, 1) . ' hrs'
                : ($avgCloseMinutes > 0 ? $avgCloseMinutes . ' mins' : 'N/A');

            $stats = [
                'picked_today' => (clone $ticketQuery)->where('assigned_to', $userId)->whereDate('picked_at', now()->today())->count(),
                'on_process' => (clone $ticketQuery)->where('assigned_to', $userId)->whereIn('status', ['In Progress', 'in progress', 'open', 'Open'])->count(),
                'overdue' => (clone $ticketQuery)->where('assigned_to', $userId)->whereNotIn('status', ['Closed', 'closed'])->where('created_at', '<=', now()->subHours(24))->count(),
                'avg_pick_time' => $avgPickFormatted,
                'avg_close_time' => $avgCloseFormatted,
            ];
        }

        return Inertia::render('SupportTicket/Tickets/Index', [
            'tickets' => $tickets,
            'categories' => $categories,
            'supportUsers' => $supportUsers,
            'supportTeams' => $supportTeams,
            'stats' => $stats,
            'teamSettings' => [
                'enable_group_assignment' => ($settings['enable_group_assignment'] ?? '1') === '1',
                'allow_ticket_pickup' => $allowPickup,
                'allow_ticket_forward' => $allowForward,
                'allow_user_assign' => $allowUserAssignment,
                'allow_unpicked_ticket_edit' => $allowUnpickedTicketEdit,
                'enable_auto_assign' => $enableAutoAssign,
                'allow_ticket_delete' => $allowDelete,
            ],
        ]);
    }

    public function pickTicket($id)
    {
        if (!Auth::user()->can('manage-support-tickets')) {
            return back()->with('error', __('Permission denied'));
        }

        return \DB::transaction(function () use ($id) {
            $ticket = Ticket::where('id', $id)->lockForUpdate()->first();

            if (!$ticket) {
                return back()->with('error', __('Ticket not found'));
            }

            if (in_array(strtolower($ticket->status), ['closed', 'resolved'], true)) {
                return back()->with('error', __('Cannot pick a closed ticket.'));
            }

            if (!empty($ticket->assigned_to)) {
                return back()->with('error', __('Ticket has already been picked by another user.'));
            }

            $allowPickup = SupportTicketSetting::where('key', 'allow_ticket_pickup')
                ->where('created_by', creatorId())
                ->value('value') !== '0';

            $isCompanyOrAdmin = in_array(Auth::user()->type ?? '', ['company', 'super admin'], true) || Auth::user()->hasRole('company');

            if (!$allowPickup && !$isCompanyOrAdmin) {
                return back()->with('error', __('Ticket pickup is currently disabled.'));
            }

            // Get user's primary support group ID
            $settingGroupIds = SupportTicketSetting::where('key', 'support_user_group_ids')
                ->where('created_by', creatorId())
                ->value('value');
            $allowedGroupIds = [];
            if ($settingGroupIds) {
                $parsed = json_decode($settingGroupIds, true);
                if (is_array($parsed)) {
                    $allowedGroupIds = array_map('intval', $parsed);
                }
            }

            $userGroupIds = \DB::table('user_group_users')
                ->where('user_id', Auth::id())
                ->pluck('user_group_id')
                ->map('intval')
                ->toArray();

            if (!empty($ticket->team_id) && !$isCompanyOrAdmin) {
                if (!in_array((int)$ticket->team_id, $userGroupIds, true)) {
                    return back()->with('error', __('You can only pick tickets assigned to your user group.'));
                }
            }

            $userSupportGroupIds = array_intersect($userGroupIds, $allowedGroupIds);
            $finalTeamId = !empty($ticket->team_id) 
                ? $ticket->team_id 
                : (reset($userSupportGroupIds) ?: (reset($userGroupIds) ?: null));
            $affected = Ticket::where('id', $id)
                ->whereNull('assigned_to')
                ->update([
                    'assigned_to' => Auth::id(),
                    'team_id' => $finalTeamId,
                    'picked_at' => now(),
                    'status' => ($ticket->status === 'Open' || $ticket->status === 'open') ? 'In Progress' : $ticket->status,
                    'updated_at' => now(),
                ]);

            if ($affected === 0) {
                return back()->with('error', __('Ticket has already been picked by another user.'));
            }

            return back()->with('success', __('Ticket picked successfully.'));
        });
    }

    public function transferTicket(Request $request, $id)
    {
        if (!Auth::user()->can('manage-support-tickets')) {
            return back()->with('error', __('Permission denied'));
        }

        $request->validate([
            'assigned_to' => 'nullable|exists:users,id',
            'team_id' => 'nullable|exists:user_groups,id',
        ]);

        $ticket = Ticket::find($id);
        if (!$ticket) {
            return back()->with('error', __('Ticket not found'));
        }

        if (in_array(strtolower($ticket->status), ['closed', 'resolved'], true)) {
            return back()->with('error', __('Cannot transfer or assign a closed ticket.'));
        }

        $user = Auth::user();
        $isCompanyOrAdmin = in_array($user->type ?? '', ['company', 'super admin'], true) || $user->hasRole('company');

        $assignedTo = $request->input('assigned_to') ?: null;
        $teamId = $request->input('team_id') ?: null;

        if (!$assignedTo && !$teamId) {
            return back()->with('error', __('Please select a user or a team group to transfer the ticket.'));
        }

        $settings = SupportTicketSetting::query()
            ->where('created_by', creatorId())
            ->whereIn('key', ['allow_ticket_forward', 'allow_user_assign', 'support_user_group_ids'])
            ->pluck('value', 'key');

        $allowForward = ($settings['allow_ticket_forward'] ?? '1') === '1';
        $allowUserAssignment = ($settings['allow_user_assign'] ?? '1') === '1';

        if (!empty($ticket->assigned_to) && !$allowForward && !$isCompanyOrAdmin) {
            return back()->with('error', __('Ticket forwarding is currently disabled by system settings.'));
        }

        if ($assignedTo && !$allowUserAssignment && !$isCompanyOrAdmin) {
            return back()->with('error', __('Direct user assignment is currently disabled by system.'));
        }

        if ($assignedTo && !$teamId) {
            $userGroupIds = \DB::table('user_group_users')
                ->where('user_id', $assignedTo)
                ->pluck('user_group_id')
                ->map('intval')
                ->toArray();

            if (!empty($userGroupIds)) {
                $settingGroupIds = $settings['support_user_group_ids'] ?? null;
                $allowedGroupIds = [];
                if ($settingGroupIds) {
                    $parsed = json_decode($settingGroupIds, true);
                    if (is_array($parsed)) {
                        $allowedGroupIds = array_map('intval', $parsed);
                    }
                }

                $userSupportGroupIds = array_intersect($userGroupIds, $allowedGroupIds);
                $teamId = reset($userSupportGroupIds) ?: reset($userGroupIds);
            }
        }

        if ($assignedTo) {
            $ticket->picked_at = now();
        }

        $ticket->assigned_to = $assignedTo;
        $ticket->team_id = $teamId;
        $ticket->save();

        return back()->with('success', __('Ticket transferred successfully.'));
    }

    public function create()
    {
        if (Auth::user()->can('create-support-tickets')) {
            $categories = TicketCategory::where(function ($q) {
                if (Auth::user()->can('manage-any-ticket-categories')) {
                    $q->where('created_by', creatorId());
                } elseif (Auth::user()->can('manage-own-ticket-categories')) {
                    $q->where('creator_id', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->get();
            $staff = User::where('created_by', creatorId())
                ->where('type', 'staff')
                ->where('is_disable', 0)
                ->select('id', 'name', 'email')
                ->get();
            $clients = User::where('created_by', creatorId())
                ->where('type', 'client')
                ->where('is_disable', 0)
                ->select('id', 'name', 'email')
                ->get();
            $vendors = User::where('created_by', creatorId())
                ->where('type', 'vendor')
                ->where('is_disable', 0)
                ->select('id', 'name', 'email')
                ->get();

            // Get all fields (default + custom) ordered by 'order' field
            $allFields = TicketField::where('created_by', creatorId())
                ->where('status', true)
                ->orderBy('order')
                ->get();

            if ($allFields->count() < 1) {
                $allFields = TicketField::where('created_by', creatorId())
                    ->where('status', true)
                    ->orderBy('order')
                    ->get();
            }

            // Get custom fields (custom_id > 6) ordered by 'order' field
            $customFields = TicketField::where('created_by', creatorId())
                ->where('custom_id', '>', '6')
                ->where('status', true)
                ->orderBy('order')
                ->get();

            $supportTeams = UserGroup::where('created_by', creatorId())
                ->where('is_active', true)
                ->select('id', 'name')
                ->withCount('users')
                ->get();

            $supportUsers = User::emp()
                ->where('created_by', creatorId())
                ->select('id', 'name', 'email')
                ->orderBy('name')
                ->get();

            return Inertia::render('SupportTicket/Tickets/Create', [
                'categories' => $categories,
                'staff' => $staff,
                'clients' => $clients,
                'vendors' => $vendors,
                'allFields' => $allFields,
                'customFields' => $customFields,
                'supportUsers' => $supportUsers,
                'supportTeams' => $supportTeams,
            ]);
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    public function store(StoreSupportTicketRequest $request)
    {
        if (Auth::user()->can('create-support-tickets')) {
            $validated = $request->validated();

            $ticket = new Ticket();
            $ticket->ticket_id = Ticket::generateTicketId(creatorId());
            $ticket->name = $validated['name'] ?? '';
            $ticket->email = $validated['email'] ?? '';
            $ticket->phone_number = $validated['phone_number'] ?? '';
            $ticket->user_id = $validated['user_id'] ?? null;
            $ticket->account_type = $validated['account_type'] ?? 'custom';
            $ticket->category = $validated['category'] ?? null;
            $ticket->subject = $validated['subject'] ?? '';
            $ticket->status = $validated['status'] ?? 'In Progress';
            $ticket->description = $validated['description'] ?? '';
            $ticket->note = $validated['note'] ?? null;
            if ($validated['account_type'] == 'staff' || $validated['account_type'] == 'client' || $validated['account_type'] == 'vendor') {
                $user = User::find($validated['user_id']);
                if ($user) {
                    $ticket->name = $user->name;
                    $ticket->email = $user->email;
                    $ticket->phone_number = $validated['phone_number'] ?? ($user->phone_number ?? ($user->phone ?? ''));
                } else {
                    return redirect()->back()->with('error', __('User not found'));
                }
            }

            $rawPassword = Ticket::generateAccessPassword($ticket->ticket_id, $ticket->phone_number);
            $ticket->access_password = Hash::make($rawPassword);
            $ticket->creator_id = Auth::id();
            $ticket->created_by = creatorId();

            if (!empty($validated['attachments'])) {
                $attachmentPaths = is_array($validated['attachments']) ? $validated['attachments'] : json_decode($validated['attachments'], true);
                if (is_array($attachmentPaths)) {
                    $attachments = [];
                    foreach ($attachmentPaths as $filePath) {
                        if (!empty($filePath) && $filePath !== 'logo_dark' && $filePath !== 'favicon') {
                            $filename = basename($filePath);
                            $attachments[] = [
                                'name' => $filename,
                                'path' => $filename
                            ];
                        }
                    }
                    $ticket->attachments = json_encode($attachments);
                } else {
                    $ticket->attachments = '[]';
                }
            } else {
                $ticket->attachments = '[]';
            }

            $ticket->save();

            if (!empty($validated['assigned_to'])) {
                $ticket->assigned_to = $validated['assigned_to'];
              
                if (!empty($validated['team_id'])) {
                    $ticket->team_id = $validated['team_id'];
                } else {
                    $userTeamId = \DB::table('user_group_users')
                        ->where('user_id', $validated['assigned_to'])
                        ->value('user_group_id');
                    $ticket->team_id = $userTeamId ?: null;
                }
                $ticket->save();
            } elseif (!empty($validated['team_id'])) {
                $ticket->team_id = $validated['team_id'];
                $ticket->assigned_to = null;
                $ticket->save();
            } else {
                // Auto-assign to group members equally & sequentially (Fair Round-Robin)
                $autoAssignSetting = SupportTicketSetting::where('created_by', creatorId())
                    ->where('key', 'enable_auto_assign')
                    ->value('value');

                if ($autoAssignSetting === '1') {
                    $settingGroupIds = SupportTicketSetting::where('created_by', creatorId())
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

                            // Get last assigned user setting
                            $lastAssignedUserId = (int) (SupportTicketSetting::where('created_by', creatorId())
                                ->where('key', 'last_auto_assigned_user_id')
                                ->value('value') ?? 0);

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
                                    ['key' => 'last_auto_assigned_user_id', 'created_by' => creatorId()],
                                    ['value' => (string) $nextUserId]
                                );
                            }
                        }
                    }
                }
            }

            // Save custom field data
            if ($request->has('fields') && !empty($request->fields)) {
                TicketField::saveData($ticket, $request->fields);
            }

            CreateTicket::dispatch($request, $ticket, $rawPassword);

            // Send email notification for new ticket
            if (!empty(company_setting('New Ticket')) && company_setting('New Ticket') == true) {
                $uArr = [
                    'ticket_name' => $ticket->name,
                    'email' => $ticket->email,
                    'ticket_id' => $ticket->ticket_id,
                    'ticket_password' => $rawPassword,
                    'ticket_url' => route('support-ticket.show', [Auth::user()->slug, Crypt::encrypt($ticket->id)])
                ];
                try {
                    EmailTemplate::sendEmailTemplate('New Ticket', [$ticket->email], $uArr);
                } catch (\Exception $e) {
                    return redirect()->back()->with('error', __('Ticket not found'));
                }
            }

            return redirect()->route('support-tickets.index')
                ->with('success', __('The ticket has been created successfully.'));
        } else {
            return redirect()->route('support-tickets.index')->with('error', __('Permission denied'));
        }
    }

    public function edit($id)
    {
        if (Auth::user()->can('edit-support-tickets')) {
            $ticket = Ticket::with(['tcategory'])->find($id);

            if (!$ticket) {
                return redirect()->route('support-tickets.index')->with('error', __('Ticket not found'));
            }

            $totalConversions = Conversion::where('ticket_id', $ticket->id)->count();
            // Fetch latest 10 (oldest -> newest)
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

            $isCompanyOrAdmin = $this->isCompanyOrAdminUser(Auth::user());

            if (in_array(strtolower($ticket->status), ['closed', 'resolved'], true) && !$isCompanyOrAdmin) {
                return redirect()->route('support-tickets.index')->with('error', __('Closed tickets cannot be edited.'));
            }

            $settingVal = SupportTicketSetting::where('created_by', creatorId())
                ->where('key', 'allow_unpicked_ticket_edit')
                ->value('value');
            $allowUnpickedEdit = ($settingVal ?? '0') === '1';

            $userGroupIds = \DB::table('user_group_users')
                ->where('user_id', Auth::id())
                ->pluck('user_group_id')
                ->map('intval')
                ->toArray();

            // If ticket has team_id and no assigned user yet, only members of that team (or admin) can access
            if (!empty($ticket->team_id) && empty($ticket->assigned_to) && !$isCompanyOrAdmin) {
                if (!in_array((int)$ticket->team_id, $userGroupIds, true)) {
                    return redirect()->route('support-tickets.index')->with('error', __('Permission denied'));
                }
            }

            if (!empty($ticket->assigned_to)) {
                if ($ticket->assigned_to != Auth::id() && !$isCompanyOrAdmin) {
                    return redirect()->route('support-tickets.index')->with('error', __('Permission denied'));
                }
            } else {
                if (!$isCompanyOrAdmin && !$allowUnpickedEdit) {
                    return redirect()->route('support-tickets.index')->with('error', __('You must pick this ticket before editing/replying.'));
                }
            }

            $categories = TicketCategory::where(function ($q) {
                if (Auth::user()->can('manage-any-ticket-categories')) {
                    $q->where('created_by', creatorId());
                } elseif (Auth::user()->can('manage-own-ticket-categories')) {
                    $q->where('creator_id', Auth::id());
                } else {
                    $q->whereRaw('1 = 0');
                }
            })->get();
            $staff = User::where('created_by', creatorId())
                ->where('type', 'staff')
                ->where('is_disable', 0)
                ->select('id', 'name', 'email')
                ->get();
            $clients = User::where('created_by', creatorId())
                ->where('type', 'client')
                ->where('is_disable', 0)
                ->select('id', 'name', 'email')
                ->get();
            $vendors = User::where('created_by', creatorId())
                ->where('type', 'vendor')
                ->where('is_disable', 0)
                ->select('id', 'name', 'email')
                ->get();

            // Get all fields (default + custom) ordered by 'order' field
            $allFields = TicketField::where('created_by', creatorId())
                ->where('status', true)
                ->orderBy('order')
                ->get();

            if ($allFields->count() < 1) {
                $allFields = TicketField::where('created_by', creatorId())
                    ->where('status', true)
                    ->orderBy('order')
                    ->get();
            }

            // Get custom fields (custom_id > 6) ordered by 'order' field
            $customFields = TicketField::where('created_by', creatorId())
                ->where('custom_id', '>', '6')
                ->where('status', true)
                ->orderBy('order')
                ->get();

            // Get existing field data
            $existingFieldData = TicketField::getData($ticket);

            // Process ticket attachments
            $ticketAttachments = $this->parseAttachments($ticket->attachments);

            $supportTeams = UserGroup::where('created_by', creatorId())
                ->where('is_active', true)
                ->select('id', 'name')
                ->withCount('users')
                ->get();

            $supportUsers = User::emp()
                ->where('created_by', creatorId())
                ->select('id', 'name', 'email')
                ->orderBy('name')
                ->get();

            $ticketData = [
                'id' => $ticket->id,
                'ticket_id' => $ticket->ticket_id,
                'name' => $ticket->name,
                'email' => $ticket->email,
                'user_id' => $ticket->user_id,
                'account_type' => $ticket->account_type ?: 'custom',
                'category' => $ticket->category,
                'subject' => $ticket->subject,
                'status' => $ticket->status,
                'assigned_to' => $ticket->assigned_to,
                'team_id' => $ticket->team_id,
                'assigned_to_name' => $ticket->assignedTo?->name ?? '',
                'team_name' => $ticket->team?->name ?? '',
                'description' => $ticket->description,
                'note' => $ticket->note,
                'attachments' => $ticketAttachments,
                'fields' => $existingFieldData,
                'category_info' => $ticket->tcategory ? [
                    'id' => $ticket->tcategory->id,
                    'name' => $ticket->tcategory->name,
                    'color' => $ticket->tcategory->color
                ] : null,
                'total_conversions' => $totalConversions,
                'has_more_conversions' => $hasMoreConversions,
                'conversions' => $initialConversions->map(function ($conversation) {
                    return [
                        'id' => $conversation->id,
                        'ticket_id' => $conversation->ticket_id,
                        'description' => $conversation->description,
                        'sender' => $conversation->sender,
                        'attachments' => $this->parseAttachments($conversation->attachments),
                        'created_at' => $conversation->created_at ? $conversation->created_at->toISOString() : null,
                        'replyBy' => [
                            'name' => $conversation->replyBy()->name ?? 'User',
                            'role' => $conversation->replyBy()->role ?? 'Staff',
                        ],
                    ];
                }),
                'created_at' => $ticket->created_at ? $ticket->created_at->toISOString() : null,
                'updated_at' => $ticket->updated_at ? $ticket->updated_at->toISOString() : null,
            ];

            return Inertia::render('SupportTicket/Tickets/EditReply', [
                'ticket' => $ticketData,
                'categories' => $categories,
                'staff' => $staff,
                'clients' => $clients,
                'vendors' => $vendors,
                'allFields' => $allFields,
                'customFields' => $customFields,
                'supportUsers' => $supportUsers,
                'supportTeams' => $supportTeams,
                'slug' => Auth::user()->slug
            ]);
        }
        return redirect()->route('support-tickets.index')->with('error', __('Permission denied'));
    }

    public function show($id)
    {
        $user = Auth::user();
        if ($user->can('manage-support-tickets') || $user->can('edit-support-tickets') || $user->can('view-support-tickets')) {
            $ticket = Ticket::with([
                'tcategory',
                'assignedTo',
                'team',
                'creator'
            ])->find($id);

            if (!$ticket) {
                return redirect()->route('support-tickets.index')->with('error', __('Ticket not found'));
            }

            $isCompanyOrAdmin = in_array($user->type ?? '', ['company', 'super admin'], true) || $user->hasRole('company');

            // If ticket is assigned to a specific group, non-members cannot view unless already assigned to them or company admin
            if (!empty($ticket->team_id) && !$isCompanyOrAdmin && $ticket->assigned_to != $user->id) {
                $userGroupIds = \DB::table('user_group_users')
                    ->where('user_id', $user->id)
                    ->pluck('user_group_id')
                    ->map('intval')
                    ->toArray();

                if (!in_array((int)$ticket->team_id, $userGroupIds, true)) {
                    return redirect()->route('support-tickets.index')->with('error', __('Permission denied'));
                }
            }

            $totalConversions = Conversion::where('ticket_id', $ticket->id)->count();
            // Fetch latest 10 messages (oldest -> newest)
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

            $settingVal = SupportTicketSetting::where('created_by', creatorId())
                ->where('key', 'allow_unpicked_ticket_edit')
                ->value('value');
            $allowUnpickedEdit = ($settingVal ?? '0') === '1';

            $canEdit = $user->can('edit-support-tickets') && (
                in_array(strtolower($ticket->status), ['closed', 'resolved'], true)
                    ? $isCompanyOrAdmin
                    : (!empty($ticket->assigned_to)
                        ? ($ticket->assigned_to == $user->id || $isCompanyOrAdmin)
                        : ($isCompanyOrAdmin || $allowUnpickedEdit))
            );

            $ticketAttachments = $this->parseAttachments($ticket->attachments);

            $ticketData = [
                'id' => $ticket->id,
                'ticket_id' => $ticket->ticket_id,
                'name' => $ticket->name,
                'email' => $ticket->email,
                'phone_number' => $ticket->phone_number,
                'user_id' => $ticket->user_id,
                'account_type' => $ticket->account_type ?: 'custom',
                'category' => $ticket->category,
                'subject' => $ticket->subject,
                'status' => $ticket->status,
                'description' => $ticket->description,
                'note' => $ticket->note,
                'can_edit' => $canEdit,
                'attachments' => $ticketAttachments,
                'assigned_to_name' => $ticket->assignedTo?->name ?? '',
                'team_name' => $ticket->team?->name ?? '',
                'category_info' => $ticket->tcategory ? [
                    'id' => $ticket->tcategory->id,
                    'name' => $ticket->tcategory->name,
                    'color' => $ticket->tcategory->color
                ] : null,
                'total_conversions' => $totalConversions,
                'has_more_conversions' => $hasMoreConversions,
                'conversions' => $initialConversions->map(function ($conversation) {
                    return [
                        'id' => $conversation->id,
                        'ticket_id' => $conversation->ticket_id,
                        'description' => $conversation->description,
                        'sender' => $conversation->sender,
                        'attachments' => $this->parseAttachments($conversation->attachments),
                        'created_at' => $conversation->created_at ? $conversation->created_at->toISOString() : null,
                        'replyBy' => [
                            'name' => $conversation->replyBy()->name ?? 'User',
                            'role' => $conversation->replyBy()->role ?? 'Staff',
                        ],
                    ];
                }),
                'created_at' => $ticket->created_at ? $ticket->created_at->toISOString() : null,
                'updated_at' => $ticket->updated_at ? $ticket->updated_at->toISOString() : null,
                'formatted_created_at' => $ticket->created_at ? $ticket->created_at->format('Y-m-d H:i:s') : '',
                'picked_at' => $ticket->picked_at ? $ticket->picked_at->toISOString() : null,
                'formatted_picked_at' => $ticket->picked_at ? $ticket->picked_at->format('Y-m-d H:i:s') : null,
                'closed_at' => in_array(strtolower($ticket->status), ['closed', 'resolved'], true) ? ($ticket->updated_at ? $ticket->updated_at->toISOString() : null) : null,
                'formatted_closed_at' => in_array(strtolower($ticket->status), ['closed', 'resolved'], true) ? ($ticket->updated_at ? $ticket->updated_at->format('Y-m-d H:i:s') : null) : null,
            ];

            return Inertia::render('SupportTicket/Tickets/Show', [
                'ticket' => $ticketData,
            ]);
        }
        return redirect()->route('support-tickets.index')->with('error', __('Permission denied'));
    }

    public function update(UpdateSupportTicketRequest $request, $id)
    {
        if (Auth::user()->can('edit-support-tickets')) {
            $ticket = Ticket::find($id);

            if (!$ticket) {
                return redirect()->route('support-tickets.index')->with('error', __('Ticket not found'));
            }

            $isCompanyOrAdmin = $this->isCompanyOrAdminUser(Auth::user());

            $settingVal = SupportTicketSetting::where('created_by', creatorId())
                ->where('key', 'allow_unpicked_ticket_edit')
                ->value('value');
            $allowUnpickedEdit = ($settingVal ?? '0') === '1';

            if (!empty($ticket->assigned_to)) {
                if ($ticket->assigned_to != Auth::id() && !$isCompanyOrAdmin) {
                    return redirect()->route('support-tickets.index')->with('error', __('Permission denied'));
                }
            } else {
                if (!$isCompanyOrAdmin && !$allowUnpickedEdit) {
                    return redirect()->route('support-tickets.index')->with('error', __('You must pick this ticket before editing/replying.'));
                }
            }

            $validated = $request->validated();

            $ticket->name = $validated['name'] ?? '';
            $ticket->email = $validated['email'] ?? '';
            $ticket->account_type = $validated['account_type'] ?? 'custom';
            $ticket->category = $validated['category'] ?? null;
            $ticket->subject = $validated['subject'] ?? '';
            $ticket->status = $validated['status'] ?? 'In Progress';
            $ticket->description = $validated['description'] ?? '';
            $ticket->note = $validated['note'] ?? null;
            $ticket->user_id = null;

            if (array_key_exists('assigned_to', $validated)) {
                $ticket->assigned_to = $validated['assigned_to'] ?: null;
                if (!empty($ticket->assigned_to) && empty($validated['team_id'])) {
                    $userTeamId = \DB::table('user_group_users')
                        ->where('user_id', $ticket->assigned_to)
                        ->value('user_group_id');
                    $ticket->team_id = $userTeamId ?: $ticket->team_id;
                }
            }

            if (array_key_exists('team_id', $validated)) {
                $ticket->team_id = $validated['team_id'] ?: null;
                if (!empty($validated['team_id']) && empty($validated['assigned_to'])) {
                    $ticket->assigned_to = null;
                }
            }

            if (isset($validated['account_type']) && $validated['account_type'] !== 'custom' && !empty($validated['user_id'])) {
                $user = User::find($validated['user_id']);
                if ($user) {
                    $ticket->name = $user->name;
                    $ticket->email = $user->email;
                    $ticket->user_id = $user->id;
                }
            }

            if (isset($validated['attachments']) && !empty($validated['attachments'])) {
                $attachmentPaths = json_decode($validated['attachments'], true);
                if (is_array($attachmentPaths)) {
                    $attachments = $this->formatAttachmentList($attachmentPaths);
                    $ticket->attachments = json_encode($attachments);
                }
            }

            $ticket->save();

            // Save custom field data
            if ($request->has('fields') && !empty($request->fields)) {
                TicketField::saveData($ticket, $request->fields);
            }

            UpdateTicket::dispatch($request, $ticket);

            return redirect()->back()->with('success', __('The ticket details are updated successfully.'));
        }
        return redirect()->route('support-tickets.index')->with('error', __('Permission denied'));
    }

    public function destroy($id)
    {
        if (Auth::user()->can('delete-support-tickets')) {
            $isCompanyOrAdmin = $this->isCompanyOrAdminUser(Auth::user());
            $allowDelete = SupportTicketSetting::where('created_by', creatorId())
                ->where('key', 'allow_ticket_delete')
                ->value('value') !== '0';

            if (!$allowDelete && !$isCompanyOrAdmin) {
                return back()->with('error', __('Ticket deletion is currently disabled by system settings.'));
            }
            $ticket = Ticket::find($id);

            if (!$ticket) {
                return redirect()->route('support-tickets.index')->with('error', __('Ticket not found'));
            }

            if (in_array(strtolower($ticket->status), ['closed', 'resolved'], true) && !$isCompanyOrAdmin) {
                return back()->with('error', __('Closed tickets cannot be deleted.'));
            }

            Conversion::where('ticket_id', $ticket->id)->delete();

            delete_folder('support-ticket/' . $ticket->ticket_id);

            DestroyTicket::dispatch($ticket);

            $ticket->delete();

            return back()->with('success', __('The ticket has been deleted.'));
        }
        return back()->with('error', __('Permission denied'));
    }

    public function storeNote(Request $request, $id)
    {
        if (Auth::user()->can('edit-support-tickets')) {
            $request->validate([
                'note' => 'required|string'
            ]);

            $ticket = Ticket::find($id);

            if (!$ticket) {
                return back()->with('error', __('Ticket not found'));
            }

            $ticket->note = $request->note;
            $ticket->save();

            return redirect()->back()->with('success', __('Note saved successfully'));
        }

        return back()->with('error', __('Permission denied'));
    }

    public function storeconverison(StoreConversionRequest $request, $ticketId)
    {
        if (Auth::user()->can('reply-support-tickets')) {
            $ticket = Ticket::find($ticketId);

            if (!$ticket) {
                return redirect()->back()->with('error', __('Ticket not found'));
            }

            $validated = $request->validated();
            $attachments = [];
            if (!empty($validated['attachments'])) {
                $attachmentPaths = is_array($validated['attachments']) ? $validated['attachments'] : json_decode($validated['attachments'], true);
                if (is_array($attachmentPaths)) {
                    $attachments = $this->formatAttachmentList($attachmentPaths);
                }
            }

            $conversion = new Conversion();
            $conversion->ticket_id = $ticket->id;
            $conversion->description = $validated['description'];
            $conversion->sender = 'admin';
            $conversion->attachments = $attachments;
            $conversion->creator_id = Auth::id();
            $conversion->created_by = creatorId();
            $conversion->save();

            if ($request->has('status') && in_array($request->status, ['open', 'In Progress', 'Closed', 'On Hold'])) {
                $ticket->status = $request->status;
                $ticket->save();
            }

            CreateTicketConversion::dispatch($request, $ticket, $conversion);

            // Send email notification for reply
            if (!empty(company_setting('New Ticket Reply')) && company_setting('New Ticket Reply') == true) {
                $uArr = [
                    'ticket_name' => $ticket->name,
                    'ticket_id' => $ticket->ticket_id,
                    'email' => $ticket->email,
                    'reply_description' => $request->description,
                ];
                try {
                    EmailTemplate::sendEmailTemplate('New Ticket Reply', [$ticket->email], $uArr);
                } catch (\Exception $e) {
                    // Log error but don't fail the reply
                }
            }

            return redirect()->back()->with('success', __('Reply added successfully'));
        }

        return redirect()->back()->with('error', __('Permission denied'));
    }

    /**
     * Fetch paginated previous conversions for a ticket (for Load More).
     */
    public function getConversions(Request $request, $id)
    {
        $ticket = Ticket::find($id);
        if (!$ticket) {
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

        $formatted = $conversions->map(function ($conversation) {
            return [
                'id' => $conversation->id,
                'ticket_id' => $conversation->ticket_id,
                'description' => $conversation->description,
                'sender' => $conversation->sender,
                'attachments' => $this->parseAttachments($conversation->attachments),
                'created_at' => $conversation->created_at ? $conversation->created_at->toISOString() : null,
                'replyBy' => [
                    'name' => $conversation->replyBy()->name ?? 'User',
                    'role' => $conversation->replyBy()->role ?? 'Staff',
                ],
            ];
        });

        return response()->json([
            'conversions' => $formatted,
            'has_more' => $hasMore,
        ]);
    }

    /**
     * Check if the user has company or super admin privileges.
     */
    private function isCompanyOrAdminUser($user): bool
    {
        if (!$user) {
            return false;
        }
        return in_array($user->type ?? '', ['company', 'super admin'], true) || $user->hasRole('company');
    }

    /**
     * Parse raw attachment data into an array.
     */
    private function parseAttachments($raw): array
    {
        if (empty($raw)) {
            return [];
        }
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Format a list of uploaded file paths into standard attachment objects.
     */
    private function formatAttachmentList(array $filePaths): array
    {
        $attachments = [];
        foreach ($filePaths as $filePath) {
            if (!empty($filePath) && $filePath !== 'logo_dark' && $filePath !== 'favicon') {
                $filename = basename($filePath);
                $attachments[] = [
                    'name' => $filename,
                    'path' => $filename
                ];
            }
        }
        return $attachments;
    }
}

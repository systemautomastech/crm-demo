<?php

namespace Automas\SupportTicket\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Automas\SupportTicket\Models\TicketCategory;
use Automas\SupportTicket\Models\Ticket;
use Automas\SupportTicket\Models\Conversion;
use Carbon\Carbon;

class DashboardController extends Controller
{
    private function getDateRange(Request $request)
    {
        $period = $request->get('period', 'this_month');
        $now = Carbon::now();

        switch ($period) {
            case 'prev_month':
                $start = $now->copy()->subMonth()->startOfMonth();
                $end = $now->copy()->subMonth()->endOfMonth();
                break;
            case 'last_3_months':
                $start = $now->copy()->subMonths(3)->startOfDay();
                $end = $now->copy()->endOfDay();
                break;
            case 'last_6_months':
                $start = $now->copy()->subMonths(6)->startOfDay();
                $end = $now->copy()->endOfDay();
                break;
            case 'custom':
                if ($request->filled('start_date') && $request->filled('end_date')) {
                    $start = Carbon::parse($request->get('start_date'))->startOfDay();
                    $end = Carbon::parse($request->get('end_date'))->endOfDay();
                } else {
                    $start = $now->copy()->startOfMonth();
                    $end = $now->copy()->endOfMonth();
                }
                break;
            case 'this_month':
            default:
                $start = $now->copy()->startOfMonth();
                $end = $now->copy()->endOfMonth();
                break;
        }

        return [$start, $end];
    }

    public function index(Request $request)
    {
        $user = Auth::user();

        if ($user->can('manage-dashboard-support-ticket')) {
            switch ($user->type) {
                case 'client':
                    return $this->clientDashboard($request);
                case 'vendor':
                    return $this->vendorDashboard($request);
                case 'company':
                    return $this->companyDashboard($request);
                default:
                    return $this->staffDashboard($request);
            }
        } else {
            return back()->with('error', __('Permission denied'));
        }
    }

    private function companyDashboard(Request $request)
    {
        $creatorId = creatorId();

        return Inertia::render('SupportTicket/Dashboard/CompanyDashboard', [
            'stats' => $this->getStats('company', $creatorId, $request),
            'monthlyData' => $this->getMonthlyData('company', $creatorId),
            'recentTickets' => $this->getRecentTickets('company', $creatorId),
            'statusData' => $this->getStatusData('company', $creatorId),
            'categoryData' => $this->getCategoryData('company', $creatorId, $request),
            'topPerformers' => $this->getTopPerformers($creatorId),
            'supportUrl' => $this->getSupportUrl($creatorId)
        ]);
    }

    public function clientDashboard(Request $request)
    {
        $user = Auth::user();

        return Inertia::render('SupportTicket/Dashboard/ClientDashboard', [
            'stats' => $this->getStats('client', $user->id, $request),
            'monthlyData' => $this->getMonthlyData('client', $user->id),
            'recentTickets' => $this->getRecentTickets('client', $user->id),
            'statusData' => $this->getStatusData('client', $user->id),
            'categoryData' => $this->getCategoryData('client', $user->id, $request),
            'topPerformers' => $this->getTopPerformers(creatorId()),
            'supportUrl' => $this->getSupportUrl(creatorId())
        ]);
    }

    public function vendorDashboard(Request $request)
    {
        $user = Auth::user();

        return Inertia::render('SupportTicket/Dashboard/VendorDashboard', [
            'stats' => $this->getStats('vendor', $user->id, $request),
            'monthlyData' => $this->getMonthlyData('vendor', $user->id),
            'recentTickets' => $this->getRecentTickets('vendor', $user->id),
            'statusData' => $this->getStatusData('vendor', $user->id),
            'categoryData' => $this->getCategoryData('vendor', $user->id, $request),
            'topPerformers' => $this->getTopPerformers(creatorId()),
            'supportUrl' => $this->getSupportUrl(creatorId())
        ]);
    }

    public function staffDashboard(Request $request)
    {
        $user = Auth::user();

        return Inertia::render('SupportTicket/Dashboard/StaffDashboard', [
            'stats' => $this->getStats('staff', $user->id, $request),
            'monthlyData' => $this->getMonthlyData('staff', $user->id),
            'recentTickets' => $this->getRecentTickets('staff', $user->id),
            'statusData' => $this->getStatusData('staff', $user->id),
            'categoryData' => $this->getCategoryData('staff', $user->id, $request),
            'topPerformers' => $this->getTopPerformers(creatorId()),
            'supportUrl' => $this->getSupportUrl(creatorId())
        ]);
    }

    private function getStats($type, $id, Request $request = null)
    {
        $user = Auth::user();
        $query = Ticket::query();
        
        switch ($type) {
            case 'company':
                $query->where('created_by', $id);
                break;
            case 'client':
            case 'vendor':
                $query->where('user_id', $id);
                break;
            default:
                if (!$user->can('manage-support-tickets')) {
                    return [
                        'totalTickets' => 0,
                        'openTickets' => 0,
                        'closedTickets' => 0,
                        'todayTickets' => 0,
                        'resolutionRate' => 0,
                        'canViewTickets' => false,
                    ];
                }
                
                if ($user->can('manage-any-support-tickets')) {
                    $query->where('created_by', $user->created_by);
                } elseif ($user->can('manage-own-support-tickets')) {
                    $query->where(function ($q) use ($id) {
                        $q->where('creator_id', $id)->orWhere('user_id', $id);
                    });
                } else {
                    $query->whereRaw('1 = 0');
                }
                break;
        }

        if ($request && $request->has('period')) {
            [$start, $end] = $this->getDateRange($request);
            $query->whereBetween('created_at', [$start, $end]);
        }

        $ticketStats = $query->selectRaw('
            COUNT(*) as total_tickets,
            SUM(CASE WHEN status = "In Progress" THEN 1 ELSE 0 END) as open_tickets,
            SUM(CASE WHEN status = "Closed" THEN 1 ELSE 0 END) as closed_tickets,
            SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_tickets,
            AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_response_time
        ')->first();

        $categories = TicketCategory::where('created_by', creatorId())->count();
        $totalTickets = $ticketStats->total_tickets ?? 0;
        $closedTickets = $ticketStats->closed_tickets ?? 0;
        $resolutionRate = $totalTickets > 0 ? round(($closedTickets / $totalTickets) * 100) : 0;

        return [
            'totalTickets' => (int) $totalTickets,
            'categories' => (int) $categories,
            'openTickets' => (int) ($ticketStats->open_tickets ?? 0),
            'closedTickets' => (int) $closedTickets,
            'todayTickets' => (int) ($ticketStats->today_tickets ?? 0),
            'avgResponseTime' => round($ticketStats->avg_response_time ?? 0, 1),
            'resolutionRate' => (int) $resolutionRate,
            'canViewTickets' => true,
        ];
    }

    private function getMonthlyData($type, $id)
    {
        $monthlyData = [];
        $user = Auth::user();

        for ($i = 5; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            $monthKey = $month->format('M Y');
            
            $query = Ticket::whereYear('created_at', $month->year)
                           ->whereMonth('created_at', $month->month);
            
            switch ($type) {
                case 'company':
                    $query->where('created_by', $id);
                    break;
                case 'client':
                case 'vendor':
                    $query->where('user_id', $id);
                    break;
                default:
                    if ($user->can('manage-any-support-tickets')) {
                        $query->where('created_by', $user->created_by);
                    } elseif ($user->can('manage-own-support-tickets')) {
                        $query->where(function ($q) use ($id) {
                            $q->where('creator_id', $id)->orWhere('user_id', $id);
                        });
                    } else {
                        $query->whereRaw('1 = 0');
                    }
                    break;
            }
            
            $monthlyData[$monthKey] = $query->count();
        }

        return $monthlyData;
    }

    private function getRecentTickets($type, $id)
    {
        $user = Auth::user();
        $query = Ticket::with(['tcategory', 'user']);

        switch ($type) {
            case 'company':
                $query->where('created_by', $id);
                break;
            case 'client':
            case 'vendor':
                $query->where('user_id', $id);
                break;
            default:
                if ($user->can('manage-any-support-tickets')) {
                    $query->where('created_by', $user->created_by);
                } elseif ($user->can('manage-own-support-tickets')) {
                    $query->where(function ($q) use ($id) {
                        $q->where('creator_id', $id)->orWhere('user_id', $id);
                    });
                } else {
                    $query->whereRaw('1 = 0');
                }
                break;
        }

        return $query->latest()
            ->limit(5)
            ->get()
            ->map(function ($ticket) {
                return [
                    'id' => $ticket->id,
                    'ticket_id' => $ticket->ticket_id,
                    'name' => $ticket->user->name ?? 'Guest',
                    'email' => $ticket->user->email ?? 'N/A',
                    'subject' => $ticket->subject,
                    'status' => $ticket->status,
                    'category' => $ticket->tcategory->name ?? 'Uncategorized',
                    'created_at' => $ticket->created_at ? $ticket->created_at->format('M d, Y H:i') : ''
                ];
            });
    }

    private function getStatusData($type, $id)
    {
        $user = Auth::user();
        $query = Ticket::query();

        switch ($type) {
            case 'company':
                $query->where('created_by', $id);
                break;
            case 'client':
            case 'vendor':
                $query->where('user_id', $id);
                break;
            default:
                if ($user->can('manage-any-support-tickets')) {
                    $query->where('created_by', $user->created_by);
                } elseif ($user->can('manage-own-support-tickets')) {
                    $query->where(function ($q) use ($id) {
                        $q->where('creator_id', $id)->orWhere('user_id', $id);
                    });
                } else {
                    $query->whereRaw('1 = 0');
                }
                break;
        }

        $statusCounts = $query->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $colors = [
            'In Progress' => '#3b82f6',
            'Closed' => '#10b981',
            'On Hold' => '#f59e0b',
            'Open' => '#8b5cf6',
        ];

        $statusData = [];
        foreach ($statusCounts as $status => $count) {
            $statusData[] = [
                'name' => $status,
                'value' => $count,
                'color' => $colors[$status] ?? '#6b7280'
            ];
        }

        return $statusData;
    }

    private function getSupportUrl($creatorId)
    {
        $user = User::find($creatorId);
        if ($user && $user->slug) {
            return route('support-ticket.index', $user->slug);
        }
        return '';
    }

    private function getCategoryData($type, $id, Request $request = null)
    {
        $user = Auth::user();
        $query = Ticket::query();

        switch ($type) {
            case 'company':
                $query->where('created_by', $id);
                break;
            case 'client':
            case 'vendor':
                $query->where('user_id', $id);
                break;
            default:
                if ($user->can('manage-any-support-tickets')) {
                    $query->where('created_by', $user->created_by);
                } elseif ($user->can('manage-own-support-tickets')) {
                    $query->where(function ($q) use ($id) {
                        $q->where('creator_id', $id)->orWhere('user_id', $id);
                    });
                }
                break;
        }

        if ($request && $request->has('period')) {
            [$start, $end] = $this->getDateRange($request);
            $query->whereBetween('created_at', [$start, $end]);
        }

        $allCategories = TicketCategory::where('created_by', creatorId())->get();
        $colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#14b8a6'];

        $categoryData = [];
        $index = 0;
        foreach ($allCategories as $cat) {
            $count = (clone $query)->where('category', $cat->id)->count();
            $categoryData[] = [
                'id' => $cat->id,
                'name' => $cat->name,
                'value' => $count,
                'color' => $colors[$index % count($colors)],
            ];
            $index++;
        }

        $uncategorized = (clone $query)->whereNull('category')->count();
        if ($uncategorized > 0 || empty($categoryData)) {
            $categoryData[] = [
                'id' => 0,
                'name' => 'General Support',
                'value' => $uncategorized > 0 ? $uncategorized : (clone $query)->count(),
                'color' => '#94a3b8',
            ];
        }

        usort($categoryData, fn($a, $b) => $b['value'] <=> $a['value']);

        return $categoryData;
    }

    private function getTopPerformers($creatorId)
    {
        $users = User::where('created_by', $creatorId)
            ->orWhere('id', $creatorId)
            ->select('id', 'name', 'email', 'avatar', 'type')
            ->get();

        $performers = [];
        foreach ($users as $u) {
            $assignedCount = Ticket::where('created_by', $creatorId)
                ->where('assigned_to', $u->id)
                ->count();

            $resolvedCount = Ticket::where('created_by', $creatorId)
                ->where('assigned_to', $u->id)
                ->where('status', 'Closed')
                ->count();

            $repliesCount = Conversion::whereHas('ticket', fn($q) => $q->where('created_by', $creatorId))
                ->where('creator_id', $u->id)
                ->count();

            $score = ($resolvedCount * 3) + ($assignedCount * 2) + $repliesCount;

            if ($score > 0 || $assignedCount > 0 || $repliesCount > 0) {
                $performers[] = [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'avatar' => $u->avatar,
                    'type' => $u->type ?? 'Staff',
                    'assignedTickets' => $assignedCount,
                    'resolvedTickets' => $resolvedCount,
                    'repliesCount' => $repliesCount,
                    'score' => $score,
                    'resolutionRate' => $assignedCount > 0 ? round(($resolvedCount / $assignedCount) * 100) : ($resolvedCount > 0 ? 100 : 0),
                ];
            }
        }

        usort($performers, fn($a, $b) => $b['score'] <=> $a['score']);

        if (count($performers) < 3) {
            foreach ($users as $u) {
                if (count($performers) >= 3) break;
                if (!collect($performers)->pluck('id')->contains($u->id)) {
                    $performers[] = [
                        'id' => $u->id,
                        'name' => $u->name,
                        'email' => $u->email,
                        'avatar' => $u->avatar,
                        'type' => $u->type ?? 'Staff',
                        'assignedTickets' => 0,
                        'resolvedTickets' => 0,
                        'repliesCount' => 0,
                        'score' => 0,
                        'resolutionRate' => 0,
                    ];
                }
            }
        }

        return array_slice($performers, 0, 3);
    }
}
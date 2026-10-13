<?php

namespace Automas\SupportTicket\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Automas\SupportTicket\Models\TicketCategory;
use Automas\SupportTicket\Models\Ticket;

class DashboardApiController extends Controller
{
    use ApiResponseTrait;
    public function index()
    {
        $user = Auth::user();

        if ($user->can('manage-dashboard-support-ticket')) {
            switch ($user->type) {
                case 'client':
                    return $this->clientDashboard();
                case 'vendor':
                    return $this->vendorDashboard();
                case 'company':
                    return $this->companyDashboard();
                default:
                    return $this->staffDashboard();
            }
        } else {
            return $this->errorResponse('Permission denied');
        }
    }

    private function companyDashboard(): JsonResponse
    {
        $creatorId = creatorId();

        return $this->successResponse([
            'stats'         => $this->getStats('company', $creatorId),
            'monthlyData'   => $this->getMonthlyData('company', $creatorId),
            'recentTickets' => $this->getRecentTickets('company', $creatorId),
            'statusData'    => $this->getStatusData('company', $creatorId),
            'supportUrl'    => $this->getSupportUrl($creatorId)
        ]);
    }

    public function clientDashboard(): JsonResponse
    {
        $user = Auth::user();

        return $this->successResponse([
            'stats'         => $this->getStats('client', $user->id),
            'monthlyData'   => $this->getMonthlyData('client', $user->id),
            'recentTickets' => $this->getRecentTickets('client', $user->id),
            'statusData'    => $this->getStatusData('client', $user->id),
            'supportUrl'    => $this->getSupportUrl(creatorId())
        ]);
    }

    public function vendorDashboard(): JsonResponse
    {
        $user = Auth::user();

        return $this->successResponse([
            'stats'         => $this->getStats('vendor', $user->id),
            'monthlyData'   => $this->getMonthlyData('vendor', $user->id),
            'recentTickets' => $this->getRecentTickets('vendor', $user->id),
            'statusData'    => $this->getStatusData('vendor', $user->id),
            'supportUrl'    => $this->getSupportUrl(creatorId())
        ]);
    }

    public function staffDashboard(): JsonResponse
    {
        $user = Auth::user();

        return $this->successResponse([
            'stats'         => $this->getStats('staff', $user->id),
            'monthlyData'   => $this->getMonthlyData('staff', $user->id),
            'recentTickets' => $this->getRecentTickets('staff', $user->id),
            'statusData'    => $this->getStatusData('staff', $user->id),
            'supportUrl'    => $this->getSupportUrl(creatorId())
        ]);
    }

    private function getStats($type, $id)
    {
        $user  = Auth::user();
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
                        'totalTickets'   => 0,
                        'openTickets'    => 0,
                        'closedTickets'  => 0,
                        'todayTickets'   => 0,
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

        $ticketStats = $query->selectRaw('
            COUNT(*) as total_tickets,
            SUM(CASE WHEN status = "In Progress" THEN 1 ELSE 0 END) as open_tickets,
            SUM(CASE WHEN status = "Closed" THEN 1 ELSE 0 END) as closed_tickets,
            SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_tickets,
            AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_response_time
        ')->first();

        $result = [
            'totalTickets'   => $ticketStats->total_tickets ?? 0,
            'openTickets'    => $ticketStats->open_tickets ?? 0,
            'closedTickets'  => $ticketStats->closed_tickets ?? 0,
            'todayTickets'   => $ticketStats->today_tickets ?? 0,
            'resolutionRate' => $ticketStats->total_tickets > 0 ? round(($ticketStats->closed_tickets / $ticketStats->total_tickets) * 100, 1) : 0,
        ];

        if ($type === 'company') {
            $result['categories']      = TicketCategory::where('created_by', $id)->count();
            $result['avgResponseTime'] = round($ticketStats->avg_response_time ?? 0, 1);
        }

        if ($user->can('manage-support-tickets')) {
            $result['canViewTickets'] = true;
        }

        return $result;
    }

    private function getMonthlyData($type, $id)
    {
        $query = Ticket::selectRaw('MONTH(created_at) as month, count(*) as total')
            ->where('created_at', '>', now()->subYear());

        switch ($type) {
            case 'company':
                $query->where('created_by', $id);
                break;
            case 'client':
            case 'vendor':
                $query->where('user_id', $id);
                break;
            default:
                $user = Auth::user();
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

        $monthlyData = $query->groupBy('month')->pluck('total', 'month')->toArray();
        $months      = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        $result      = [];
        foreach ($months as $index => $month) {
            $result[$month] = $monthlyData[$index + 1] ?? 0;
        }
        return $result;
    }

    private function getRecentTickets($type, $id)
    {
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
                $user = Auth::user();
                if ($user->can('manage-any-support-tickets')) {
                    $query->where('created_by', $user->created_by);
                } elseif ($user->can('manage-own-support-tickets')) {
                    $query->where(function ($q) use ($id) {
                        $q->where('creator_id', $id)->orWhere('user_id', $id);
                    });
                } else {
                    return [];
                }
                break;
        }

        return $query->with(['tcategory:id,name,color'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['id', 'ticket_id', 'name', 'email', 'subject', 'status', 'category', 'created_at'])
            ->map(function ($ticket) {
                return [
                    'id'         => $ticket->id,
                    'ticket_id'  => $ticket->ticket_id,
                    'name'       => $ticket->name,
                    'email'      => $ticket->email,
                    'subject'    => $ticket->subject,
                    'status'     => $ticket->status,
                    'category'   => $ticket->tcategory ? $ticket->tcategory->name : 'No Category',
                    'created_at' => $ticket->created_at->format('M d, Y H:i')
                ];
            });
    }

    private function getStatusData($type, $id)
    {
        $query = Ticket::select('status', DB::raw('count(*) as count'));

        switch ($type) {
            case 'company':
                $query->where('created_by', $id);
                break;
            case 'client':
            case 'vendor':
                $query->where('user_id', $id);
                break;
            default:
                $user = Auth::user();
                if ($user->can('manage-any-support-tickets')) {
                    $query->where('created_by', $user->created_by);
                } elseif ($user->can('manage-own-support-tickets')) {
                    $query->where(function ($q) use ($id) {
                        $q->where('creator_id', $id)->orWhere('user_id', $id);
                    });
                } else {
                    return [];
                }
                break;
        }

        $statusData = $query->groupBy('status')->get();
        $colors     = [
            'In Progress' => '#F59E0B',
            'On Hold'     => '#EF4444',
            'Closed'      => '#10B981'
        ];

        return $statusData->map(function ($item) use ($colors) {
            return [
                'name'  => $item->status,
                'value' => $item->count,
                'color' => $colors[$item->status] ?? '#6B7280'
            ];
        })->toArray();
    }

    private function getSupportUrl(int $userId): ?string
    {
        $user = User::select('slug')->find($userId);
        return $user?->slug ? route('support-ticket.index', ['slug' => $user->slug]) : null;
    }
}

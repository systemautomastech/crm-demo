<?php

namespace Automas\Lead\Http\Controllers;

use App\Models\User;
use Automas\Lead\Models\ClientDeal;
use Automas\Lead\Models\Deal;
use Automas\Lead\Models\DealCall;
use Automas\Lead\Models\DealStage;
use Automas\Lead\Models\DealTask;
use Automas\Lead\Models\Lead;
use Automas\Lead\Models\LeadCall;
use Automas\Lead\Models\LeadStage;
use Automas\Lead\Models\LeadTask;
use Automas\Lead\Models\Pipeline;
use Automas\Lead\Models\Source;
use Automas\Lead\Models\UserDeal;
use Automas\Lead\Models\UserLead;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DashboardController extends Controller
{
    private function getDateRange(Request $request)
    {
        $period = $request->get('period', 'this_month');
        $now = \Carbon\Carbon::now();

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
                    $start = \Carbon\Carbon::parse($request->get('start_date'))->startOfDay();
                    $end = \Carbon\Carbon::parse($request->get('end_date'))->endOfDay();
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
        if (!Auth::user()->can('manage-crm-dashboard')) {
            return back()->with('error', __('Permission denied'));
        }

        $user = Auth::user();

        if ($user->type == 'client') {
            return $this->clientDashboard($request);
        }

        if ($user->type != 'company' || $request->get('view') === 'user') {
            return $this->userDashboard($request);
        }

        return $this->companyDashboard($request);
    }

    private function companyDashboard(Request $request)
    {
        $companyCreatorId = creatorId();
        [$start, $end] = $this->getDateRange($request);

        $deal = Deal::where('created_by', $companyCreatorId);
        $lead = Lead::where('created_by', $companyCreatorId);

            // 1. Top Cards Data (Filtered by selected date range, defaults to This Month)
            $totalLeads = (clone $lead)->whereBetween('created_at', [$start, $end])->count();
            $monthLeads = $totalLeads;
            $daysCount = max(1, $start->diffInDays(now()->lt($end) ? now() : $end) + 1);
            $avgDailyLeads = round($monthLeads / $daysCount, 1);

            // Lead Stats (Today, Yesterday, This Month, Prev Month)
            $todayLeads = (clone $lead)->whereDate('created_at', today())->count();
            $yesterdayLeads = (clone $lead)->whereDate('created_at', today()->subDay())->count();
            $thisMonthLeads = (clone $lead)->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->count();
            $prevMonthLeads = (clone $lead)->whereMonth('created_at', now()->subMonth()->month)->whereYear('created_at', now()->subMonth()->year)->count();

            // Deal Stats (Today, Yesterday, This Month, Prev Month)
            $todayDeals = (clone $deal)->whereDate('created_at', today())->count();
            $yesterdayDeals = (clone $deal)->whereDate('created_at', today()->subDay())->count();
            $thisMonthDeals = (clone $deal)->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->count();
            $prevMonthDeals = (clone $deal)->whereMonth('created_at', now()->subMonth()->month)->whereYear('created_at', now()->subMonth()->year)->count();

            // Daily Lead Trend (Past 14 days)
            $dailyLeadTrend = [];
            for ($i = 13; $i >= 0; $i--) {
                $dt = today()->subDays($i);
                $cnt = (clone $lead)->whereDate('created_at', $dt->toDateString())->count();
                $dailyLeadTrend[] = [
                    'date' => $dt->format('M d'),
                    'leads' => $cnt,
                ];
            }

            // Open / Active Deals (deals that are currently open in the pipeline, not Won or Loss)
            $activeDealsQuery = Deal::where('created_by', $companyCreatorId)->whereNotIn('status', ['Won', 'Loss']);
            if ($request->has('period')) {
                $activeDealsQuery->whereBetween('created_at', [$start, $end]);
            }
            $activeDeals = (clone $activeDealsQuery)->count();
            $openDealValue = (float) (clone $activeDealsQuery)->sum('price');

            // Won Deals & Amount filtered by date range (defaults to This Month)
            $wonDealAmount = (float) (clone $deal)->where('status', 'Won')->whereBetween('updated_at', [$start, $end])->sum('price');
            $wonDealsThisMonth = (clone $deal)->where('status', 'Won')->whereBetween('updated_at', [$start, $end])->count();

            // Calls today / period
            $dealCallsToday = DealCall::whereHas('deal', fn($q) => $q->where('created_by', $companyCreatorId))->whereBetween('created_at', [$start, $end])->get();
            $leadCallsToday = LeadCall::whereHas('lead', fn($q) => $q->where('created_by', $companyCreatorId))->whereBetween('created_at', [$start, $end])->get();
            $callsToday = $dealCallsToday->count() + $leadCallsToday->count();
            $connectedCallsToday = $dealCallsToday->where('call_result', '!=', 'missed')->count() + $leadCallsToday->where('call_result', '!=', 'missed')->count();
            $missedCallsToday = $dealCallsToday->where('call_result', 'missed')->count() + $leadCallsToday->where('call_result', 'missed')->count();

            // Follow-ups today & overdue tasks (considering both leads.date and LeadTask)
            $finalRejectedStageIds = LeadStage::where('created_by', $companyCreatorId)->where('is_final_rejected', 1)->pluck('id')->toArray();
            $finalAcceptedStageIds = LeadStage::where('created_by', $companyCreatorId)->where('is_final_accepted', 1)->pluck('id')->toArray();

            $dealTasksToday = DealTask::whereHas('deal', fn($q) => $q->where('created_by', $companyCreatorId))->whereDate('date', today())->get();
            $leadTasksToday = LeadTask::whereHas('lead', fn($q) => $q->where('created_by', $companyCreatorId))->whereDate('date', today())->get();
            
            $leadsFollowupTodayCount = Lead::where('created_by', $companyCreatorId)
                ->whereNotNull('date')
                ->whereDate('date', today())
                ->where(fn($q) => $q->whereNull('is_converted')->orWhere('is_converted', 0))
                ->whereNotIn('stage_id', $finalRejectedStageIds)
                ->count();

            $followupDealsToday = $dealTasksToday->count();
            $followupLeadsToday = $leadTasksToday->count() + $leadsFollowupTodayCount;
            $followupsToday = $followupDealsToday + $followupLeadsToday;

            $overdueDealTasks = DealTask::whereHas('deal', fn($q) => $q->where('created_by', $companyCreatorId))->where('date', '<', today())->where('status', 0)->count();
            $overdueLeadTasksFromTask = LeadTask::whereHas('lead', fn($q) => $q->where('created_by', $companyCreatorId))->where('date', '<', today())->where('status', 0)->count();

            $overdueLeadsCount = Lead::where('created_by', $companyCreatorId)
                ->whereNotNull('date')
                ->whereDate('date', '<', today())
                ->where(fn($q) => $q->whereNull('is_converted')->orWhere('is_converted', 0))
                ->whereNotIn('stage_id', $finalRejectedStageIds)
                ->whereNotIn('stage_id', $finalAcceptedStageIds)
                ->count();

            $overdueLeadTasks = $overdueLeadTasksFromTask + $overdueLeadsCount;
            $overdueTasks = $overdueDealTasks + $overdueLeadTasks;

            // 2. Lead Overview (Pipeline wise - filtered by date range)
            $allPipelines = Pipeline::where('created_by', $companyCreatorId)->get();
            $leadOverview = [];
            foreach ($allPipelines as $pipe) {
                $cnt = Lead::where('created_by', $companyCreatorId)->where('pipeline_id', $pipe->id)->whereBetween('created_at', [$start, $end])->count();
                $leadOverview[] = [
                    'id' => $pipe->id,
                    'name' => $pipe->name,
                    'count' => $cnt,
                ];
            }
            if (array_sum(array_column($leadOverview, 'count')) === 0 && !$request->has('period')) {
                $leadOverview = [];
                foreach ($allPipelines as $pipe) {
                    $cnt = Lead::where('created_by', $companyCreatorId)->where('pipeline_id', $pipe->id)->count();
                    $leadOverview[] = [
                        'id' => $pipe->id,
                        'name' => $pipe->name,
                        'count' => $cnt,
                    ];
                }
            }
            usort($leadOverview, fn($a, $b) => $b['count'] <=> $a['count']);

            // 3. Deal Pipeline (Pipeline wise - filtered by date range)
            $dealPipeline = [];
            foreach ($allPipelines as $pipe) {
                $dDeals = Deal::where('created_by', $companyCreatorId)->where('pipeline_id', $pipe->id)->whereBetween('created_at', [$start, $end])->get();
                $dealPipeline[] = [
                    'id' => $pipe->id,
                    'name' => $pipe->name,
                    'deals' => $dDeals->count(),
                    'amount' => (float) $dDeals->sum('price'),
                ];
            }
            if (array_sum(array_column($dealPipeline, 'amount')) === 0 && !$request->has('period')) {
                $dealPipeline = [];
                foreach ($allPipelines as $pipe) {
                    $dDeals = Deal::where('created_by', $companyCreatorId)->where('pipeline_id', $pipe->id)->get();
                    $dealPipeline[] = [
                        'id' => $pipe->id,
                        'name' => $pipe->name,
                        'deals' => $dDeals->count(),
                        'amount' => (float) $dDeals->sum('price'),
                    ];
                }
            }
            usort($dealPipeline, fn($a, $b) => $b['amount'] <=> $a['amount']);

            // 4. Top Performers (Filtered by date range)
            $teamUsers = User::where('created_by', $companyCreatorId)->orWhere('id', $companyCreatorId)->select('id', 'name', 'avatar')->get();
            $teamPerformance = [];
            foreach ($teamUsers as $tUser) {
                $userWonDeals = Deal::whereHas('users', fn($q) => $q->where('users.id', $tUser->id))
                    ->where('status', 'Won')
                    ->whereBetween('updated_at', [$start, $end])
                    ->get();
                if ($userWonDeals->isEmpty() && !$request->has('period')) {
                    $userWonDeals = Deal::whereHas('users', fn($q) => $q->where('users.id', $tUser->id))->where('status', 'Won')->get();
                }
                $userCalls = DealCall::where('user_id', $tUser->id)->whereBetween('created_at', [$start, $end])->count()
                    + LeadCall::where('user_id', $tUser->id)->whereBetween('created_at', [$start, $end])->count();
                $userOverdue = DealTask::whereHas('deal.users', fn($q) => $q->where('users.id', $tUser->id))->where('date', '<', today())->where('status', 0)->count()
                    + LeadTask::whereHas('lead.userLeads', fn($q) => $q->where('user_id', $tUser->id))->where('date', '<', today())->where('status', 0)->count();

                if ($userWonDeals->count() > 0 || $userCalls > 0 || (float)$userWonDeals->sum('price') > 0) {
                    $teamPerformance[] = [
                        'id' => $tUser->id,
                        'name' => $tUser->name,
                        'avatar' => $tUser->avatar,
                        'connectedCalls' => $userCalls,
                        'wonDeals' => $userWonDeals->count(),
                        'wonAmount' => (float) $userWonDeals->sum('price'),
                        'overdue' => $userOverdue,
                    ];
                }
            }
            usort($teamPerformance, fn($a, $b) => $b['wonAmount'] <=> $a['wonAmount']);
            $teamPerformance = array_slice($teamPerformance, 0, 5);

            // 5. Upcoming Follow-ups
            $upcomingFollowups = [];
            $upcomingLeadTasks = LeadTask::whereHas('lead', fn($q) => $q->where('created_by', $companyCreatorId))
                ->with(['lead'])
                ->whereDate('date', '>=', today())
                ->orderBy('date', 'asc')
                ->take(4)
                ->get();
            foreach ($upcomingLeadTasks as $lt) {
                $upcomingFollowups[] = [
                    'id' => 'lead_task_' . $lt->id,
                    'type' => 'LEAD',
                    'title' => $lt->name,
                    'subtitle' => ($lt->lead?->name ?? 'Lead') . ($lt->lead?->subject ? ' · ' . $lt->lead->subject : ''),
                    'time' => $lt->time ? (is_string($lt->time) ? date('h:i A', strtotime($lt->time)) : $lt->time->format('h:i A')) : '10:00 AM',
                ];
            }
            if (count($upcomingFollowups) < 4) {
                $neededCount = 4 - count($upcomingFollowups);
                $upcomingLeads = Lead::where('created_by', $companyCreatorId)
                    ->whereNotNull('date')
                    ->whereDate('date', '>=', today())
                    ->where(fn($q) => $q->whereNull('is_converted')->orWhere('is_converted', 0))
                    ->whereNotIn('stage_id', $finalRejectedStageIds)
                    ->orderBy('date', 'asc')
                    ->take($neededCount)
                    ->get();
                foreach ($upcomingLeads as $ul) {
                    $upcomingFollowups[] = [
                        'id' => 'lead_' . $ul->id,
                        'type' => 'LEAD',
                        'title' => $ul->subject ? $ul->subject : $ul->name,
                        'subtitle' => $ul->name . ($ul->organization_type ? ' · ' . $ul->organization_type : ''),
                        'time' => $ul->date ? (is_string($ul->date) ? date('h:i A', strtotime($ul->date)) : $ul->date->format('h:i A')) : '10:00 AM',
                    ];
                }
            }
            $upcomingDealTasks = DealTask::whereHas('deal', fn($q) => $q->where('created_by', $companyCreatorId))
                ->with(['deal'])
                ->whereDate('date', '>=', today())
                ->orderBy('date', 'asc')
                ->take(4)
                ->get();
            foreach ($upcomingDealTasks as $dt) {
                $upcomingFollowups[] = [
                    'id' => 'deal_' . $dt->id,
                    'type' => 'DEAL',
                    'title' => $dt->name,
                    'subtitle' => ($dt->deal?->name ?? 'Deal'),
                    'time' => $dt->time ? (is_string($dt->time) ? date('h:i A', strtotime($dt->time)) : $dt->time->format('h:i A')) : '11:00 AM',
                ];
            }

            // 6. Top Products (Filtered by date range)
            $topProducts = [];
            if (class_exists(\Automas\ProductService\Models\ProductServiceItem::class)) {
                $products = \Automas\ProductService\Models\ProductServiceItem::where('created_by', $companyCreatorId)->get();
                $wonDeals = Deal::where('created_by', $companyCreatorId)->where('status', 'Won')->whereBetween('updated_at', [$start, $end])->get();
                if ($wonDeals->isEmpty() && !$request->has('period')) {
                    $wonDeals = Deal::where('created_by', $companyCreatorId)->where('status', 'Won')->get();
                }

                foreach ($products as $prod) {
                    $wonValue = 0;
                    $wonDealsCount = 0;
                    foreach ($wonDeals as $wDeal) {
                        $rawProducts = $wDeal->products;
                        if (is_numeric($rawProducts)) {
                            $pList = [(int) $rawProducts];
                        } elseif (is_string($rawProducts)) {
                            $decoded = json_decode($rawProducts, true);
                            if (is_array($decoded)) {
                                $pList = $decoded;
                            } elseif (is_numeric($decoded)) {
                                $pList = [(int) $decoded];
                            } else {
                                $pList = array_filter(array_map('trim', explode(',', $rawProducts)));
                            }
                        } elseif (is_array($rawProducts)) {
                            $pList = $rawProducts;
                        } else {
                            $pList = [];
                        }
                        $pList = array_values(array_filter((array) $pList));

                        if (!empty($pList) && (in_array($prod->id, $pList) || in_array((string)$prod->id, $pList) || in_array($prod->name, $pList))) {
                            $wonValue += (float) $wDeal->price;
                            $wonDealsCount++;
                        }
                    }
                    if ($wonValue > 0) {
                        $topProducts[] = [
                            'id' => $prod->id,
                            'name' => $prod->name,
                            'wonValue' => $wonValue,
                            'wonDeals' => $wonDealsCount,
                        ];
                    }
                }
                usort($topProducts, fn($a, $b) => $b['wonValue'] <=> $a['wonValue']);
                $topProducts = array_slice($topProducts, 0, 5);
            }

            // 6.b Top Sellers in Product Category metadata options (lightweight options for filters)
            $productCategories = [];
            if (class_exists(\Automas\ProductService\Models\ProductServiceCategory::class)) {
                $productCategories = \Automas\ProductService\Models\ProductServiceCategory::where('created_by', $companyCreatorId)
                    ->get(['id', 'name', 'color'])
                    ->toArray();
            }

            $sellerUsersQuery = User::where('created_by', $companyCreatorId)
                ->whereNotIn('type', ['client', 'vendor', 'Client', 'Vendor', 'superadmin', 'Super Admin', 'company', 'Company', 'hr', 'HR']);

            if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'is_disable')) {
                $sellerUsersQuery->where(function ($sq) {
                    $sq->whereNull('is_disable')->orWhere('is_disable', '!=', 1);
                });
            }

            $sellerUsersList = $sellerUsersQuery->get(['id', 'name', 'avatar'])->toArray();
            $categorySellers = [];

            // 8. Sales Performance Trend (Filter-wise: <= 60 days -> Day-wise, > 60 days -> Month-wise)
            $buildSalesPerf = function ($sDate, $eDate) use ($companyCreatorId) {
                $result = [];
                $dDays = (int) ceil(abs($eDate->timestamp - $sDate->timestamp) / 86400);
                if ($dDays <= 60) {
                    $curr = $sDate->copy();
                    while ($curr->lte($eDate)) {
                        $dLabel = $curr->format('d M');
                        $dVal = Deal::where('created_by', $companyCreatorId)
                            ->where('status', 'Won')
                            ->where(function ($q) use ($curr) {
                                $q->whereDate('updated_at', $curr->format('Y-m-d'))
                                  ->orWhereDate('created_at', $curr->format('Y-m-d'));
                            })
                            ->sum('price');
                        $result[] = [
                            'month' => $dLabel,
                            'value' => (float) $dVal,
                        ];
                        $curr->addDay();
                    }
                } else {
                    $curr = $sDate->copy()->startOfMonth();
                    $endMonth = $eDate->copy()->endOfMonth();
                    while ($curr->lte($endMonth)) {
                        $mLabel = $curr->format('M Y');
                        $mVal = Deal::where('created_by', $companyCreatorId)
                            ->where('status', 'Won')
                            ->where(function ($q) use ($curr) {
                                $q->where(function ($q2) use ($curr) {
                                    $q2->whereYear('updated_at', $curr->year)->whereMonth('updated_at', $curr->month);
                                })->orWhere(function ($q2) use ($curr) {
                                    $q2->whereYear('created_at', $curr->year)->whereMonth('created_at', $curr->month);
                                });
                            })
                            ->sum('price');
                        $result[] = [
                            'month' => $mLabel,
                            'value' => (float) $mVal,
                        ];
                        $curr->addMonth();
                    }
                }
                return $result;
            };

            $salesPerformance = $buildSalesPerf($start, $end);

            if (array_sum(array_column($salesPerformance, 'value')) == 0 && !$request->has('period')) {
                $fallbackStart = now()->subMonths(5)->startOfMonth();
                $fallbackEnd = now()->endOfMonth();
                $salesPerformance = $buildSalesPerf($fallbackStart, $fallbackEnd);
            }

            $dbSources = Source::where('created_by', $companyCreatorId)->get();

            // Query the exact same leads as $totalLeads for the selected period
            $leadsForSources = Lead::where('created_by', $companyCreatorId)
                ->whereBetween('created_at', [$start, $end])
                ->get(['id', 'sources']);

            if ($leadsForSources->isEmpty() && !$request->has('period')) {
                $leadsForSources = Lead::where('created_by', $companyCreatorId)->get(['id', 'sources']);
            }

            $palette = [
                '#3b82f6',
                '#10b981',
                '#f59e0b',
                '#a855f7',
                '#ec4899',
                '#06b6d4',
                '#6366f1',
                '#f43f5e',
                '#8b5cf6',
                '#64748b'
            ];

            $sourceCountsMap = [];
            foreach ($dbSources as $source) {
                $sourceIdStr = (string) $source->id;
                $sourceName = trim($source->name);

                if (!isset($sourceCountsMap[$sourceName])) {
                    $sourceCountsMap[$sourceName] = [
                        'name' => $sourceName,
                        'count' => 0,
                        'source_ids' => [],
                    ];
                }
                $sourceCountsMap[$sourceName]['source_ids'][] = $sourceIdStr;
            }

            $assignedLeadIds = [];
            foreach ($leadsForSources as $lead) {
                if (empty($lead->sources)) {
                    continue;
                }
                $leadSourceItems = array_map('trim', explode(',', (string) $lead->sources));
                $matched = false;

                // Match lead to its primary source and break to ensure 1 lead = 1 count in chart sum
                foreach ($leadSourceItems as $item) {
                    foreach ($sourceCountsMap as $name => &$data) {
                        if (in_array($item, $data['source_ids'], true) || strcasecmp($item, $name) === 0) {
                            $data['count']++;
                            $matched = true;
                            break 2;
                        }
                    }
                }

                if ($matched) {
                    $assignedLeadIds[$lead->id] = true;
                }
            }
            unset($data);

            $otherCount = 0;
            foreach ($leadsForSources as $lead) {
                if (!isset($assignedLeadIds[$lead->id])) {
                    $otherCount++;
                }
            }

            $leadSources = [];
            $colorIdx = 0;
            foreach ($sourceCountsMap as $data) {
                if ($data['count'] > 0) {
                    $leadSources[] = [
                        'name' => $data['name'],
                        'count' => $data['count'],
                        'color' => $palette[$colorIdx % count($palette)],
                    ];
                    $colorIdx++;
                }
            }

            usort($leadSources, fn($a, $b) => $b['count'] <=> $a['count']);

            if ($otherCount > 0 || empty($leadSources)) {
                $leadSources[] = [
                    'name' => 'Other / Unassigned',
                    'count' => $otherCount,
                    'color' => '#94a3b8',
                ];
            }

            // 10. Win rate & Needs attention metrics (Filtered strictly by date range, defaults to This Month)
            $totalWonCount = Deal::where('created_by', $companyCreatorId)->where('status', 'Won')->where(function ($q) use ($start, $end) {
                $q->whereBetween('updated_at', [$start, $end])->orWhereBetween('created_at', [$start, $end]);
            })->count();
            $totalLostCount = Deal::where('created_by', $companyCreatorId)->where('status', 'Loss')->where(function ($q) use ($start, $end) {
                $q->whereBetween('updated_at', [$start, $end])->orWhereBetween('created_at', [$start, $end]);
            })->count();
            $totalPeriodDeals = Deal::where('created_by', $companyCreatorId)->whereBetween('created_at', [$start, $end])->count();

            $totalClosedCount = $totalWonCount + $totalLostCount;
            $denominator = $totalPeriodDeals > 0 ? $totalPeriodDeals : ($totalClosedCount > 0 ? $totalClosedCount : 0);
            $winRate = $denominator > 0 ? (int) round(($totalWonCount / $denominator) * 100) : 0;

            $uncontactedLeads = Lead::where('created_by', $companyCreatorId)
                ->where(fn($q) => $q->whereNull('is_converted')->orWhere('is_converted', 0))
                ->whereDoesntHave('calls')
                ->count();
            $unassignedLeads = Lead::where('created_by', $companyCreatorId)
                ->where(fn($q) => $q->whereNull('user_id')->orWhere('user_id', 0))
                ->count();
            $inactiveDeals = Deal::where('created_by', $companyCreatorId)
                ->whereNotIn('status', ['Won', 'Loss'])
                ->where('updated_at', '<', now()->subDays(14))
                ->count();

            $needsAttention = [
                'uncontactedLeads' => $uncontactedLeads,
                'unassignedLeads' => $unassignedLeads,
                'inactiveDeals' => $inactiveDeals,
                'followupLeadsToday' => $followupLeadsToday,
                'overdueLeadTasks' => $overdueLeadTasks,
                'overdueDealTasks' => $overdueDealTasks,
                'followupDealsToday' => $followupDealsToday,
            ];

            $winRateStats = [
                'winRate' => $winRate,
                'wonCount' => $totalWonCount,
                'lostCount' => $totalLostCount,
                'totalDeals' => max($totalPeriodDeals, $totalClosedCount),
            ];

            $pipelines = Pipeline::where('created_by', $companyCreatorId)->get(['id', 'name']);

            return Inertia::render('Lead/Dashboard/CompanyDashboard', [
                'stats' => [
                    'totalLeads' => $totalLeads,
                    'monthLeads' => $monthLeads,
                    'todayLeads' => $todayLeads,
                    'yesterdayLeads' => $yesterdayLeads,
                    'thisMonthLeads' => $thisMonthLeads,
                    'prevMonthLeads' => $prevMonthLeads,
                    'todayDeals' => $todayDeals,
                    'yesterdayDeals' => $yesterdayDeals,
                    'thisMonthDeals' => $thisMonthDeals,
                    'prevMonthDeals' => $prevMonthDeals,
                    'avgDailyLeads' => $avgDailyLeads,
                    'activeDeals' => $activeDeals,
                    'openDealValue' => (float) $openDealValue,
                    'wonDealAmount' => (float) $wonDealAmount,
                    'wonDealsThisMonth' => $wonDealsThisMonth,
                    'callsToday' => $callsToday,
                    'connectedCallsToday' => $connectedCallsToday,
                    'missedCallsToday' => $missedCallsToday,
                    'followupsToday' => $followupsToday,
                    'followupLeadsToday' => $followupLeadsToday,
                    'followupDealsToday' => $followupDealsToday,
                    'overdueTasks' => $overdueTasks,
                    'overdueLeadTasks' => $overdueLeadTasks,
                ],
                'leadOverview' => $leadOverview,
                'dealPipeline' => $dealPipeline,
                'dailyLeadTrend' => $dailyLeadTrend,
                'teamPerformance' => $teamPerformance,
                'upcomingFollowups' => $upcomingFollowups,
                'topProducts' => $topProducts,
                'categoryLeaderboard' => null,
                'categorySellers' => $categorySellers,
                'productCategories' => $productCategories,
                'sellerUsers' => $sellerUsersList,
                'salesPerformance' => $salesPerformance,
                'leadSources' => $leadSources,
                'winRateStats' => $winRateStats,
                'needsAttention' => $needsAttention,
                'organizationTypeConversion' => $this->getOrganizationTypeConversion($companyCreatorId),
                'pipelines' => $pipelines,
                'message' => __('Lead Dashboard - Manage your leads and deals efficiently.'),
            ]);
    }


    private function clientDashboard(Request $request)
    {
        $user = Auth::user();

        // Get assigned deals for client
        $assignedDealIds = ClientDeal::where('client_id', $user->id)->pluck('deal_id');
        $deals = Deal::whereIn('id', $assignedDealIds);

        // Get all stats from deals
        $totalDeals = $deals->count();
        $activeDealCount = $deals->where('status', 'Active')->count();
        $wonDealCount = $deals->where('status', 'Won')->count();
        $lossDealCount = $deals->where('status', 'Loss')->count();
        $totalDealValue = $deals->sum('price');

        // Recent deals assigned to client
        $recentDeals = $deals->with('stage')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        // Deal status chart
        $dealStatusChart = [
            ['name' => 'Active', 'value' => $activeDealCount],
            ['name' => 'Won', 'value' => $wonDealCount],
            ['name' => 'Loss', 'value' => $lossDealCount],
        ];

        // Calendar events from assigned deal tasks and lead tasks
        $calendarEvents = [];
        $clientDeals = ClientDeal::where('client_id', $user->id)->with('deal.tasks')->get();
        foreach ($clientDeals as $clientDeal) {
            if (!$clientDeal->deal || !$clientDeal->deal->tasks) continue;
            foreach ($clientDeal->deal->tasks as $task) {
                $dStr = $task->date ? $task->date->format('Y-m-d') : now()->format('Y-m-d');
                $calendarEvents[] = [
                    'id' => 'deal_' . $task->id,
                    'title' => $task->name,
                    'startDate' => $dStr,
                    'endDate' => $dStr,
                    'time' => $task->time ? (is_string($task->time) ? $task->time : $task->time->format('H:i')) : '09:00',
                    'status' => $task->status ? 'completed' : 'pending',
                    'name' => $clientDeal->deal->name,
                    'color' => $task->status ? '#10b981' : '#f59e0b',
                    'type' => 'Deal Task',
                ];
            }
        }

        return Inertia::render('Lead/Dashboard/ClientDashboard', [
            'stats' => [
                'total_deals' => $totalDeals,
                'active_deals' => $activeDealCount,
                'won_deals' => $wonDealCount,
                'total_value' => $totalDealValue,
            ],
            'recentDeals' => $recentDeals,
            'calendarEvents' => $calendarEvents,
            'dealStatusChart' => $dealStatusChart,
            'message' => __('Client Dashboard - View your assigned deals.'),
        ]);
    }

    private function userDashboard(Request $request)
    {
        $user = Auth::user();
        $companyCreatorId = creatorId();

        [$start, $end] = $this->getDateRange($request);

        // 1. Permission Scoping (all / any / own)
        $canManageAnyLeads = $user->can('manage-any-leads') || ($user->can('manage-leads') && !$user->can('manage-own-leads'));
        $canManageAnyDeals = $user->can('manage-any-deals') || ($user->can('manage-deals') && !$user->can('manage-own-deals'));

        // Lead base query scoped by permission
        $leadBase = Lead::where('created_by', $companyCreatorId);
        if (!$canManageAnyLeads) {
            $leadBase->where(function ($subQ) use ($user) {
                $subQ->where('user_id', $user->id)
                    ->orWhere('creator_id', $user->id)
                    ->orWhereHas('userLeads', fn($lq) => $lq->where('user_id', $user->id));
            });
        }

        // Deal base query scoped by permission
        $dealBase = Deal::where('created_by', $companyCreatorId);
        if (!$canManageAnyDeals) {
            $dealBase->where(function ($subQ) use ($user) {
                $subQ->where('creator_id', $user->id)
                    ->orWhereHas('userDeals', fn($dq) => $dq->where('user_id', $user->id));
            });
        }

        $permittedDealIds = (clone $dealBase)->pluck('id');
        $permittedLeadIds = (clone $leadBase)->pluck('id');

        // 2. Lead Performance Stats (Today, Yesterday, This Month, Prev Month)
        $todayLeads = (clone $leadBase)->whereDate('created_at', today())->count();
        $yesterdayLeads = (clone $leadBase)->whereDate('created_at', today()->subDay())->count();
        $thisMonthLeads = (clone $leadBase)->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->count();
        $prevMonthLeads = (clone $leadBase)->whereMonth('created_at', now()->subMonth()->month)->whereYear('created_at', now()->subMonth()->year)->count();
        $monthlyLeads = (clone $leadBase)->whereBetween('created_at', [$start, $end])->count();
        $totalLeads = (clone $leadBase)->count();
        $avgDailyLeads = round($thisMonthLeads / max(1, now()->day), 1);

        // 3. Deal Performance Stats (Today, Yesterday, This Month, Prev Month)
        $todayDeals = (clone $dealBase)->whereDate('created_at', today())->count();
        $yesterdayDeals = (clone $dealBase)->whereDate('created_at', today()->subDay())->count();
        $thisMonthDeals = (clone $dealBase)->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->count();
        $prevMonthDeals = (clone $dealBase)->whereMonth('created_at', now()->subMonth()->month)->whereYear('created_at', now()->subMonth()->year)->count();

        // Active & Closed Deals
        $activeDealsQuery = (clone $dealBase)->whereNotIn('status', ['Won', 'Loss']);
        if ($request->has('period')) {
            $activeDealsQuery->whereBetween('created_at', [$start, $end]);
        }
        $activeDeals = (clone $activeDealsQuery)->count();
        $openDealValue = (float) (clone $activeDealsQuery)->sum('price');

        if ($activeDeals === 0 && !$request->has('period')) {
            $allActiveDealsQuery = (clone $dealBase)->whereNotIn('status', ['Won', 'Loss']);
            $activeDeals = (clone $allActiveDealsQuery)->count();
            $openDealValue = (float) (clone $allActiveDealsQuery)->sum('price');
        }

        $wonDealsQuery = (clone $dealBase)->where('status', 'Won');
        $wonDeals = (clone $wonDealsQuery)->count();
        $wonDealAmount = (float) (clone $wonDealsQuery)->whereBetween('updated_at', [$start, $end])->sum('price');
        if ($wonDealAmount === 0.0 && !$request->has('period')) {
            $wonDealAmount = (float) (clone $wonDealsQuery)->sum('price');
        }
        $wonDealsThisMonth = (clone $dealBase)->where('status', 'Won')->whereMonth('updated_at', now()->month)->whereYear('updated_at', now()->year)->count();
        $lostDeals = (clone $dealBase)->where('status', 'Loss')->count();
        $convertedDeals = (clone $leadBase)->where('is_converted', '>', 0)->count();
        $totalAmount = (float) (clone $dealBase)->sum('price');

        // 4. Calls
        $dealCalls = DealCall::whereIn('deal_id', $permittedDealIds);
        $leadCalls = LeadCall::whereIn('lead_id', $permittedLeadIds);
        $todayCalls = (clone $dealCalls)->whereDate('created_at', today())->count() + (clone $leadCalls)->whereDate('created_at', today())->count();
        $yesterdayCalls = (clone $dealCalls)->whereDate('created_at', today()->subDay())->count() + (clone $leadCalls)->whereDate('created_at', today()->subDay())->count();
        $monthlyCalls = (clone $dealCalls)->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->count() + (clone $leadCalls)->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->count();
        $totalCalls = (clone $dealCalls)->count() + (clone $leadCalls)->count();

        // 5. Tasks
        $completedTasks = DealTask::whereIn('deal_id', $permittedDealIds)->where('status', 1)->count() +
            LeadTask::whereIn('lead_id', $permittedLeadIds)->where('status', 1)->count();
        $pendingTasks = DealTask::whereIn('deal_id', $permittedDealIds)->where('status', 0)->count() +
            LeadTask::whereIn('lead_id', $permittedLeadIds)->where('status', 0)->count();

        // 6. Needs Attention (Scoped to user)
        $finalRejectedStageIds = LeadStage::where('created_by', $companyCreatorId)->where('is_final_rejected', 1)->pluck('id')->toArray();
        $finalAcceptedStageIds = LeadStage::where('created_by', $companyCreatorId)->where('is_final_accepted', 1)->pluck('id')->toArray();

        $leadsFollowupTodayCount = (clone $leadBase)
            ->whereNotNull('date')
            ->whereDate('date', today())
            ->where(fn($q) => $q->whereNull('is_converted')->orWhere('is_converted', 0))
            ->whereNotIn('stage_id', $finalRejectedStageIds)
            ->count();
        $leadTasksTodayCount = LeadTask::whereIn('lead_id', $permittedLeadIds)->whereDate('date', today())->count();
        $dealTasksTodayCount = DealTask::whereIn('deal_id', $permittedDealIds)->whereDate('date', today())->count();

        $followupLeadsToday = $leadsFollowupTodayCount + $leadTasksTodayCount;
        $followupDealsToday = $dealTasksTodayCount;
        $followupsToday = $followupLeadsToday + $followupDealsToday;

        $overdueLeadsCount = (clone $leadBase)
            ->whereNotNull('date')
            ->whereDate('date', '<', today())
            ->where(fn($q) => $q->whereNull('is_converted')->orWhere('is_converted', 0))
            ->whereNotIn('stage_id', $finalRejectedStageIds)
            ->whereNotIn('stage_id', $finalAcceptedStageIds)
            ->count();
        $overdueLeadTasksFromTask = LeadTask::whereIn('lead_id', $permittedLeadIds)->whereDate('date', '<', today())->where('status', 0)->count();
        $overdueDealTasks = DealTask::whereIn('deal_id', $permittedDealIds)->where('date', '<', today())->where('status', 0)->count();

        $overdueLeadTasks = $overdueLeadsCount + $overdueLeadTasksFromTask;
        $overdueTasks = $overdueLeadTasks + $overdueDealTasks;

        $uncontactedLeads = (clone $leadBase)
            ->where(fn($q) => $q->whereNull('is_converted')->orWhere('is_converted', 0))
            ->whereDoesntHave('calls')
            ->count();

        $unassignedLeads = $canManageAnyLeads
            ? Lead::where('created_by', $companyCreatorId)->where(fn($q) => $q->whereNull('user_id')->orWhere('user_id', 0))->count()
            : 0;

        $inactiveDeals = (clone $dealBase)
            ->whereNotIn('status', ['Won', 'Loss'])
            ->where('updated_at', '<', now()->subDays(14))
            ->count();

        $needsAttention = [
            'followupLeadsToday' => $followupLeadsToday,
            'overdueLeadTasks' => $overdueLeadTasks,
            'overdueDealTasks' => $overdueDealTasks,
            'followupDealsToday' => $followupDealsToday,
            'uncontactedLeads' => $uncontactedLeads,
            'unassignedLeads' => $unassignedLeads,
            'inactiveDeals' => $inactiveDeals,
        ];

        // 7. Recent Deals & Leads
        $recentDeals = (clone $dealBase)
            ->with(['stage:id,name', 'creator:id,name'])
            ->orderBy('created_at', 'desc')
            ->take(6)
            ->get();

        $recentLeads = (clone $leadBase)
            ->with(['stage:id,name', 'user:id,name'])
            ->orderBy('created_at', 'desc')
            ->take(6)
            ->get();

        // 8. Follow-up Calendar Events (both from leads.date and tasks)
        $followupEvents = [];

        // A. Leads with scheduled follow-up dates
        $scheduledLeads = (clone $leadBase)
            ->whereNotNull('date')
            ->where(fn($q) => $q->whereNull('is_converted')->orWhere('is_converted', 0))
            ->whereNotIn('stage_id', $finalRejectedStageIds)
            ->orderBy('date', 'asc')
            ->get();

        foreach ($scheduledLeads as $sl) {
            $dStr = date('Y-m-d', strtotime($sl->date));
            $isOverdue = strtotime($dStr) < strtotime(today()->toDateString());
            $isToday = $dStr === today()->toDateString();
            $color = $isOverdue ? '#f43f5e' : ($isToday ? '#6366f1' : '#10b981');
            $statusLabel = $isOverdue ? 'Overdue' : ($isToday ? 'Today' : 'Upcoming');

            $followupEvents[] = [
                'id' => 'lead_f_' . $sl->id,
                'title' => 'LEAD: ' . ($sl->subject ? $sl->subject : $sl->name),
                'startDate' => $dStr,
                'endDate' => $dStr,
                'date' => $dStr,
                'time' => $sl->date ? date('h:i A', strtotime($sl->date)) : '10:00 AM',
                'color' => $color,
                'status' => $statusLabel,
                'type' => 'Lead Follow-up',
                'subtitle' => $sl->name . ($sl->organization_type ? ' · ' . $sl->organization_type : ''),
                'customer' => $sl->name,
                'phone' => $sl->phone,
            ];
        }

        // B. Lead Tasks
        $upcomingLeadTasks = LeadTask::whereIn('lead_id', $permittedLeadIds)
            ->with('lead')
            ->orderBy('date', 'asc')
            ->get();
        foreach ($upcomingLeadTasks as $lt) {
            $dStr = $lt->date ? (is_string($lt->date) ? date('Y-m-d', strtotime($lt->date)) : $lt->date->format('Y-m-d')) : now()->format('Y-m-d');
            $isOverdue = strtotime($dStr) < strtotime(today()->toDateString()) && !$lt->status;
            $isToday = $dStr === today()->toDateString();
            $color = $isOverdue ? '#f43f5e' : ($lt->status ? '#10b981' : ($isToday ? '#6366f1' : '#3b82f6'));

            $followupEvents[] = [
                'id' => 'lead_task_f_' . $lt->id,
                'title' => 'TASK: ' . $lt->name,
                'startDate' => $dStr,
                'endDate' => $dStr,
                'date' => $dStr,
                'time' => $lt->time ? (is_string($lt->time) ? $lt->time : $lt->time->format('h:i A')) : '10:00 AM',
                'color' => $color,
                'status' => $lt->status ? 'Completed' : ($isOverdue ? 'Overdue' : 'Pending'),
                'type' => 'Lead Task',
                'subtitle' => $lt->lead?->name ? $lt->lead->name : 'Lead Task',
                'customer' => $lt->lead?->name,
            ];
        }

        // C. Deal Tasks
        $upcomingDealTasks = DealTask::whereIn('deal_id', $permittedDealIds)
            ->with('deal')
            ->orderBy('date', 'asc')
            ->get();
        foreach ($upcomingDealTasks as $dt) {
            $dStr = $dt->date ? (is_string($dt->date) ? date('Y-m-d', strtotime($dt->date)) : $dt->date->format('Y-m-d')) : now()->format('Y-m-d');
            $isOverdue = strtotime($dStr) < strtotime(today()->toDateString()) && !$dt->status;
            $isToday = $dStr === today()->toDateString();
            $color = $isOverdue ? '#f43f5e' : ($dt->status ? '#10b981' : ($isToday ? '#f59e0b' : '#8b5cf6'));

            $followupEvents[] = [
                'id' => 'deal_task_f_' . $dt->id,
                'title' => 'DEAL: ' . $dt->name,
                'startDate' => $dStr,
                'endDate' => $dStr,
                'date' => $dStr,
                'time' => $dt->time ? (is_string($dt->time) ? $dt->time : $dt->time->format('h:i A')) : '11:00 AM',
                'color' => $color,
                'status' => $dt->status ? 'Completed' : ($isOverdue ? 'Overdue' : 'Pending'),
                'type' => 'Deal Task',
                'subtitle' => $dt->deal?->name ? $dt->deal->name : 'Deal Task',
                'customer' => $dt->deal?->name,
            ];
        }

        // 9. Dedicated Tasks Calendar Events
        $calendarEvents = [];
        foreach ($upcomingLeadTasks as $task) {
            $dStr = $task->date ? (is_string($task->date) ? date('Y-m-d', strtotime($task->date)) : $task->date->format('Y-m-d')) : now()->format('Y-m-d');
            $calendarEvents[] = [
                'id' => 'lt_' . $task->id,
                'title' => $task->name,
                'startDate' => $dStr,
                'endDate' => $dStr,
                'date' => $dStr,
                'time' => $task->time ? (is_string($task->time) ? $task->time : $task->time->format('h:i A')) : '09:00 AM',
                'status' => $task->status ? 'completed' : 'pending',
                'subtitle' => 'Lead: ' . ($task->lead?->name ?? 'N/A'),
                'color' => $task->status ? '#10b981' : '#3b82f6',
                'type' => 'Lead Task',
            ];
        }
        foreach ($upcomingDealTasks as $task) {
            $dStr = $task->date ? (is_string($task->date) ? date('Y-m-d', strtotime($task->date)) : $task->date->format('Y-m-d')) : now()->format('Y-m-d');
            $calendarEvents[] = [
                'id' => 'dt_' . $task->id,
                'title' => $task->name,
                'startDate' => $dStr,
                'endDate' => $dStr,
                'date' => $dStr,
                'time' => $task->time ? (is_string($task->time) ? $task->time : $task->time->format('h:i A')) : '09:00 AM',
                'status' => $task->status ? 'completed' : 'pending',
                'subtitle' => 'Deal: ' . ($task->deal?->name ?? 'N/A'),
                'color' => $task->status ? '#10b981' : '#f59e0b',
                'type' => 'Deal Task',
            ];
        }

        return Inertia::render('Lead/Dashboard/UserDashboard', [
            'stats' => [
                'todayLeads' => $todayLeads,
                'yesterdayLeads' => $yesterdayLeads,
                'thisMonthLeads' => $thisMonthLeads,
                'prevMonthLeads' => $prevMonthLeads,
                'avgDailyLeads' => $avgDailyLeads,
                'monthlyLeads' => $monthlyLeads,
                'totalLeads' => $totalLeads,

                'todayDeals' => $todayDeals,
                'yesterdayDeals' => $yesterdayDeals,
                'thisMonthDeals' => $thisMonthDeals,
                'prevMonthDeals' => $prevMonthDeals,

                'convertedDeals' => $convertedDeals,
                'activeDeals' => $activeDeals,
                'openDealValue' => $openDealValue,
                'wonDeals' => $wonDeals,
                'wonDealAmount' => $wonDealAmount,
                'wonDealsThisMonth' => $wonDealsThisMonth,
                'lostDeals' => $lostDeals,
                'totalAmount' => $totalAmount,

                'todayCalls' => $todayCalls,
                'yesterdayCalls' => $yesterdayCalls,
                'monthlyCalls' => $monthlyCalls,
                'totalCalls' => $totalCalls,

                'completedTasks' => $completedTasks,
                'pendingTasks' => $pendingTasks,
                'followupsToday' => $followupsToday,
                'followupLeadsToday' => $followupLeadsToday,
                'followupDealsToday' => $followupDealsToday,
                'overdueTasks' => $overdueTasks,
                'overdueLeadTasks' => $overdueLeadTasks,
            ],
            'needsAttention' => $needsAttention,
            'permissionScope' => [
                'canManageAnyLeads' => $canManageAnyLeads,
                'canManageAnyDeals' => $canManageAnyDeals,
                'scopeLabel' => ($canManageAnyLeads && $canManageAnyDeals)
                    ? 'All Company Records'
                    : (($canManageAnyLeads || $canManageAnyDeals) ? 'Partial Company & Own Records' : 'My Assigned Portfolio'),
            ],
            'recentDeals' => $recentDeals,
            'recentLeads' => $recentLeads,
            'calendarEvents' => $calendarEvents,
            'followupEvents' => $followupEvents,
            'organizationTypeConversion' => $this->getOrganizationTypeConversion($companyCreatorId),
            'message' => __('User Dashboard - View your assigned leads and deals.'),
        ]);
    }

    /**
     * Lazy loading endpoint for Top Sellers in Product Category Leaderboard
     */
    public function getCategoryLeaderboardData(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $period = $request->input('period', 'this_month');

        if ($period === 'today') {
            $start = today()->startOfDay();
            $end = today()->endOfDay();
        } elseif ($period === 'yesterday') {
            $start = yesterday()->startOfDay();
            $end = yesterday()->endOfDay();
        } elseif ($period === 'prev_month' || $period === 'last_month') {
            $start = now()->subMonth()->startOfMonth();
            $end = now()->subMonth()->endOfMonth();
        } elseif ($period === 'custom' && $startDate && $endDate) {
            $start = \Carbon\Carbon::parse($startDate)->startOfDay();
            $end = \Carbon\Carbon::parse($endDate)->endOfDay();
        } else {
            $start = now()->startOfMonth();
            $end = now()->endOfMonth();
        }

        $companyCreatorId = creatorId();

        $sellerUsersQuery = User::where(function ($q) use ($companyCreatorId) {
            $q->where('created_by', $companyCreatorId)->orWhere('id', $companyCreatorId);
        })
            ->whereNotIn('type', ['client', 'vendor', 'Client', 'Vendor', 'superadmin', 'Super Admin', 'company', 'Company', 'hr', 'HR']);

        if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'is_disable')) {
            $sellerUsersQuery->where(function ($sq) {
                $sq->whereNull('is_disable')->orWhere('is_disable', '!=', 1);
            });
        }

        $sellerUsersList = $sellerUsersQuery->get(['id', 'name', 'avatar'])->toArray();
        $sellerUsersMap = collect($sellerUsersList)->keyBy('id');

        $wonDealsCategory = Deal::where('created_by', $companyCreatorId)
            ->where('status', 'Won')
            ->whereBetween('updated_at', [$start, $end])
            ->with(['users'])
            ->get();
        if ($wonDealsCategory->isEmpty() && !$request->has('period')) {
            $wonDealsCategory = Deal::where('created_by', $companyCreatorId)
                ->where('status', 'Won')
                ->with(['users'])
                ->get();
        }

        $productItemsMap = [];
        $productNamesMap = [];
        if (class_exists(\Automas\ProductService\Models\ProductServiceItem::class)) {
            $productItems = \Automas\ProductService\Models\ProductServiceItem::where('created_by', $companyCreatorId)
                ->with('category')
                ->get();
            $productItemsMap = $productItems->keyBy('id');
            $productNamesMap = $productItems->keyBy(function ($item) {
                return strtolower(trim($item->name));
            });
        }

        $matrixSellers = [];
        $categoryTotals = [];
        $distinctCategories = [];
        $totalProductsSold = 0;
        $totalSalesValue = 0;
        $activeSellersSet = [];
        $categorySellersMap = [];

        foreach ($wonDealsCategory as $wDeal) {
            $dealPrice = (float) $wDeal->price;
            $totalSalesValue += $dealPrice;

            $dealUsers = $wDeal->users->count() > 0 ? $wDeal->users : collect([$sellerUsersMap[$wDeal->created_by] ?? User::find($wDeal->created_by)]);
            $dealUsers = $dealUsers->filter();

            $rawProducts = $wDeal->products;
            if (is_numeric($rawProducts)) {
                $pList = [(int) $rawProducts];
            } elseif (is_string($rawProducts)) {
                $decoded = json_decode($rawProducts, true);
                if (is_array($decoded)) {
                    $pList = $decoded;
                } elseif (is_numeric($decoded)) {
                    $pList = [(int) $decoded];
                } else {
                    $pList = array_filter(array_map('trim', explode(',', $rawProducts)));
                }
            } elseif (is_array($rawProducts)) {
                $pList = $rawProducts;
            } else {
                $pList = [];
            }
            $pList = array_values(array_filter((array) $pList));

            if (empty($pList)) {
                $pCategories = [['id' => 0, 'name' => 'General', 'color' => '#6366f1', 'prodName' => 'General Item']];
            } else {
                $pCategories = [];
                foreach ($pList as $pId) {
                    $pObj = is_numeric($pId) ? ($productItemsMap[$pId] ?? null) : null;
                    if (!$pObj && is_string($pId)) {
                        $pObj = $productNamesMap[strtolower(trim($pId))] ?? null;
                    }
                    $cId = $pObj ? ($pObj->category_id ?? 0) : 0;
                    $cName = ($pObj && $pObj->category) ? $pObj->category->name : 'General';
                    $cColor = ($pObj && $pObj->category && $pObj->category->color) ? $pObj->category->color : '#6366f1';
                    $prodName = $pObj ? $pObj->name : (is_string($pId) && !is_numeric($pId) ? $pId : 'Product #' . $pId);
                    $pCategories[] = ['id' => $cId, 'name' => $cName, 'color' => $cColor, 'prodName' => $prodName];
                }
            }

            $prodCount = max(1, count($pCategories));
            $amountPerProd = $dealPrice / $prodCount;

            foreach ($dealUsers as $u) {
                if (!$u) continue;
                $activeSellersSet[$u->id] = true;

                if (!isset($matrixSellers[$u->id])) {
                    $nameParts = explode(' ', trim($u->name));
                    $initials = '';
                    foreach ($nameParts as $np) {
                        if (!empty($np)) $initials .= strtoupper($np[0]);
                    }
                    $matrixSellers[$u->id] = [
                        'id' => $u->id,
                        'name' => $u->name,
                        'avatar' => substr($initials, 0, 2) ?: 'U',
                        'avatarImage' => $u->avatar,
                        'values' => [],
                        'amounts' => [],
                        'totalAmount' => 0,
                        'totalUnits' => 0,
                    ];
                }

                foreach ($pCategories as $catInfo) {
                    $cName = $catInfo['name'];
                    $distinctCategories[$cName] = true;
                    $totalProductsSold += 1;

                    if (!isset($matrixSellers[$u->id]['values'][$cName])) {
                        $matrixSellers[$u->id]['values'][$cName] = 0;
                        $matrixSellers[$u->id]['amounts'][$cName] = 0;
                    }
                    $matrixSellers[$u->id]['values'][$cName] += 1;
                    $matrixSellers[$u->id]['amounts'][$cName] += $amountPerProd;
                    $matrixSellers[$u->id]['totalUnits'] += 1;
                    $matrixSellers[$u->id]['totalAmount'] += $amountPerProd;

                    if (!isset($categoryTotals[$cName])) {
                        $categoryTotals[$cName] = [
                            'totalAmount' => 0,
                            'totalUnits' => 0,
                            'sellers' => [],
                        ];
                    }
                    $categoryTotals[$cName]['totalAmount'] += $amountPerProd;
                    $categoryTotals[$cName]['totalUnits'] += 1;

                    if (!isset($categoryTotals[$cName]['sellers'][$u->id])) {
                        $categoryTotals[$cName]['sellers'][$u->id] = [
                            'name' => $u->name,
                            'units' => 0,
                            'amount' => 0,
                        ];
                    }
                    $categoryTotals[$cName]['sellers'][$u->id]['units'] += 1;
                    $categoryTotals[$cName]['sellers'][$u->id]['amount'] += $amountPerProd;

                    $key = $u->id . '_' . $catInfo['id'] . '_' . $cName;
                    if (!isset($categorySellersMap[$key])) {
                        $categorySellersMap[$key] = [
                            'userId' => $u->id,
                            'userName' => $u->name,
                            'userAvatar' => $u->avatar,
                            'categoryId' => $catInfo['id'],
                            'categoryName' => $cName,
                            'categoryColor' => $catInfo['color'],
                            'productName' => $catInfo['prodName'],
                            'dealsCount' => 0,
                            'totalAmount' => 0,
                        ];
                    }
                    $categorySellersMap[$key]['dealsCount'] += 1;
                    $categorySellersMap[$key]['totalAmount'] += $amountPerProd;
                }
            }
        }

        $sellersList = array_values($matrixSellers);
        usort($sellersList, fn($a, $b) => $b['totalAmount'] <=> $a['totalAmount'] ?: $b['totalUnits'] <=> $a['totalUnits']);

        $badgeColors = ['bg-amber-400 text-white', 'bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200', 'bg-amber-600 text-white'];
        $avatarColors = ['bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300', 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300', 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300', 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300', 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'];

        foreach ($sellersList as $idx => &$sRow) {
            $sRow['rank'] = $idx + 1;
            $sRow['badgeColor'] = $badgeColors[$idx] ?? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
            $sRow['avatarColor'] = $avatarColors[$idx % count($avatarColors)];
        }

        $categoriesList = array_keys($distinctCategories);
        if (empty($categoriesList) && class_exists(\Automas\ProductService\Models\ProductServiceCategory::class)) {
            $categoriesList = \Automas\ProductService\Models\ProductServiceCategory::where('created_by', creatorId())->pluck('name')->toArray();
        }

        $categoryLeadersList = [];
        foreach ($categoryTotals as $catName => $cData) {
            $sMap = array_values($cData['sellers']);
            usort($sMap, fn($a, $b) => $b['units'] <=> $a['units'] ?: $b['amount'] <=> $a['amount']);
            $topLeader = $sMap[0] ?? null;

            if ($topLeader) {
                $categoryLeadersList[] = [
                    'category' => $catName,
                    'leader' => $topLeader['name'],
                    'units' => $topLeader['units'] . ' units',
                    'amount' => (float) $topLeader['amount'],
                ];
            }
        }

        $categoryLeaderboard = [
            'categories' => $categoriesList,
            'sellers' => $sellersList,
            'leaders' => $categoryLeadersList,
            'summary' => [
                'totalProductsSold' => $totalProductsSold,
                'totalSalesValue' => (float) $totalSalesValue,
                'activeSellersCount' => count($activeSellersSet),
                'productCategoriesCount' => count($categoriesList),
            ],
        ];

        $categorySellers = array_values($categorySellersMap);
        usort($categorySellers, fn($a, $b) => $b['dealsCount'] <=> $a['dealsCount'] ?: $b['totalAmount'] <=> $a['totalAmount']);

        return response()->json([
            'categoryLeaderboard' => $categoryLeaderboard,
            'categorySellers' => $categorySellers,
        ]);
    }

    private function getOrganizationTypeConversion($companyCreatorId)
    {
        $definedOrgTypes = \Automas\Lead\Models\OrganizationType::where('created_by', $companyCreatorId)->pluck('name')->toArray();
        $leadOrgTypes = Lead::where('created_by', $companyCreatorId)->whereNotNull('organization_type')->where('organization_type', '!=', '')->pluck('organization_type')->toArray();
        $dealOrgTypes = Deal::where('created_by', $companyCreatorId)->whereNotNull('organization_type')->where('organization_type', '!=', '')->pluck('organization_type')->toArray();

        $allOrgTypes = array_values(array_unique(array_merge($definedOrgTypes, $leadOrgTypes, $dealOrgTypes)));

        $result = [];
        foreach ($allOrgTypes as $orgTypeName) {
            $totalLeads = Lead::where('created_by', $companyCreatorId)
                ->where('organization_type', $orgTypeName)
                ->count();

            $convertedLeadsCount = Lead::where('created_by', $companyCreatorId)
                ->where('organization_type', $orgTypeName)
                ->whereNotNull('is_converted')
                ->where('is_converted', '!=', 0)
                ->count();

            $totalDeals = Deal::where('created_by', $companyCreatorId)
                ->where('organization_type', $orgTypeName)
                ->count();

            $convertedCount = max($convertedLeadsCount, $totalDeals);

            $wonDeals = Deal::where('created_by', $companyCreatorId)
                ->where('organization_type', $orgTypeName)
                ->where('status', 'Won')
                ->count();

            $totalValue = (float) Deal::where('created_by', $companyCreatorId)
                ->where('organization_type', $orgTypeName)
                ->sum('price');

            $conversionRate = $totalLeads > 0 ? round(($convertedCount / $totalLeads) * 100, 1) : ($convertedCount > 0 ? 100.0 : 0.0);

            $result[] = [
                'name' => $orgTypeName,
                'total_leads' => $totalLeads,
                'converted_deals' => $convertedCount,
                'won_deals' => $wonDeals,
                'conversion_rate' => $conversionRate,
                'total_value' => $totalValue,
            ];
        }

        usort($result, function ($a, $b) {
            if ($b['converted_deals'] === $a['converted_deals']) {
                if ($b['conversion_rate'] === $a['conversion_rate']) {
                    return $b['total_leads'] <=> $a['total_leads'];
                }
                return $b['conversion_rate'] <=> $a['conversion_rate'];
            }
            return $b['converted_deals'] <=> $a['converted_deals'];
        });

        return $result;
    }
}

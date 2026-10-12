<?php

namespace App\Http\Controllers;

use App\Models\ProposalPage;
use App\Models\ProposalSetting;
use App\Models\ProposalSubject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ProposalSetupController extends Controller
{
    public function index()
    {
        if (!Auth::user()->can('manage-proposal-system-setup')) {
            return redirect()->route('dashboard')->with('error', __('Permission denied'));
        }

        $creatorId = creatorId();
        $this->syncFixedPages($creatorId);

        $settings = ProposalSetting::getSettings($creatorId);

        $pages = ProposalPage::with('authorUser:id,name,email')
            ->where('created_by', $creatorId)
            ->where(function ($query) use ($creatorId) {
                $query->where('creator_id', Auth::id())
                    ->orWhere('creator_id', $creatorId);
            })
            ->orderBy('sort_order')
            ->get();

        $subjects = ProposalSubject::where('created_by', $creatorId)
            ->latest()
            ->get();

        return Inertia::render('ProposalSetup/Index', [
            'settings' => $settings,
            'pages' => $pages,
            'subjects' => $subjects,
        ]);
    }

    public function updateSettings(Request $request)
    {
        if (!Auth::user()->can('manage-proposal-system-setup')) {
            return back()->with('error', __('Permission denied'));
        }

        $data = $request->input('settings', $request->except(['_token', '_method']));
        $saved = ProposalSetting::setSettings($data, creatorId());

        $status = $saved ? 'success' : 'error';
        $message = $saved ? __('Settings saved successfully.')
            : __('Failed to save settings.');

        return redirect()->back()->with($status, $message);
    }

    private function syncFixedPages(int $creatorId): void
    {
        if (!$creatorId)
            return;

        $otc = ProposalPage::where('created_by', $creatorId)
            ->where('page_type', 'otc')
            ->first();

        if (!$otc) {
            $maxOrder = ProposalPage::where('created_by', $creatorId)
                ->max('sort_order') ?? 0;

            ProposalPage::create([
                'title' => 'One-Time Charges (OTC)',
                'content' => '',
                'page_type' => 'otc',
                'sort_order' => $maxOrder + 1,
                'is_active' => true,
                'created_by' => $creatorId,
                'creator_id' => $creatorId,
            ]);
        }

        $mrc = ProposalPage::where('created_by', $creatorId)
            ->where('page_type', 'mrc')
            ->first();

        if (!$mrc) {
            $maxOrder = ProposalPage::where('created_by', $creatorId)
                ->max('sort_order') ?? 0;
                
            ProposalPage::create([
                'title' => 'Monthly Recurring Charges (MRC)',
                'content' => '',
                'page_type' => 'mrc',
                'sort_order' => $maxOrder + 1,
                'is_active' => true,
                'created_by' => $creatorId,
                'creator_id' => $creatorId,
            ]);
        }
    }
}

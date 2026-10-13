<?php

namespace Automas\SupportTicket\Http\Controllers;

use App\Models\UserGroup;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Automas\SupportTicket\Models\SupportTicketSetting;
use Automas\SupportTicket\Http\Requests\StoreBrandSettingsRequest;
use Automas\SupportTicket\Events\UpdateBrandSettings;
use Illuminate\Http\Request;

class SupportTicketSettingController extends Controller
{
    public function brandSettings()
    {
        if (Auth::user()->can('manage-support-ticket-brand-settings')) {
            $supportTicketSettings = SupportTicketSetting::where('created_by', creatorId())
                ->pluck('value', 'key')
                ->toArray();

            return Inertia::render('SupportTicket/SystemSetup/BrandSettings/Index', [
                'settings' => $supportTicketSettings
            ]);
        }
        return back()->with('error', __('Permission denied'));
    }

    public function updateBrandSettings(StoreBrandSettingsRequest $request)
    {
        if (Auth::user()->can('edit-support-ticket-brand-settings')) {
            $settings = $request->all();

            if (isset($settings['logo_dark'])) {
                $settings['logo_dark'] = basename($settings['logo_dark']);
            }

            if (isset($settings['favicon'])) {
                $settings['favicon'] = basename($settings['favicon']);
            }

            foreach ($settings as $key => $value) {
                SupportTicketSetting::updateOrCreate(
                    ['key' => $key, 'created_by' => creatorId()],
                    ['value' => $value]
                );
            }

            UpdateBrandSettings::dispatch($request, $settings);

            return redirect()->back()->with('success', __('The brand setting details are saved successfully.'));
        } else {
            return redirect()->back()->with('error', __('Permission denied'));
        }
    }

    public function supportTeam()
    {
        if (Auth::user()->can('manage-support-ticket-team')) {
            $userGroups = UserGroup::where('created_by', creatorId())
                ->where('is_active', true)
                ->withCount('users')
                ->get();

            $settings = SupportTicketSetting::where('created_by', creatorId())
                ->pluck('value', 'key')
                ->toArray();

            return Inertia::render('SupportTicket/SystemSetup/SupportTeam/Index', [
                'userGroups' => $userGroups,
                'settings'   => $settings,
            ]);
        }
        return back()->with('error', __('Permission denied'));
    }

    public function updateSupportTeam(Request $request)
    {
        if (Auth::user()->can('manage-support-ticket-team')) {
            $data = $request->validate([
                'enable_group_assignment'         => 'required|boolean',
                'allow_ticket_pickup'             => 'required|boolean',
                'allow_ticket_forward'            => 'required|boolean',
                'allow_user_assign'               => 'required|boolean',
                'allow_unpicked_ticket_edit'     => 'required|boolean',
                'enable_auto_assign'              => 'required|boolean',
                'allow_ticket_delete'             => 'required|boolean',
                'support_user_group_ids'          => 'nullable|array',
            ]);

            SupportTicketSetting::updateOrCreate(
                ['key' => 'enable_group_assignment', 'created_by' => creatorId()],
                ['value' => $data['enable_group_assignment'] ? '1' : '0']
            );

            SupportTicketSetting::updateOrCreate(
                ['key' => 'allow_ticket_pickup', 'created_by' => creatorId()],
                ['value' => $data['allow_ticket_pickup'] ? '1' : '0']
            );

            SupportTicketSetting::updateOrCreate(
                ['key' => 'allow_ticket_forward', 'created_by' => creatorId()],
                ['value' => $data['allow_ticket_forward'] ? '1' : '0']
            );

            SupportTicketSetting::updateOrCreate(
                ['key' => 'allow_user_assign', 'created_by' => creatorId()],
                ['value' => $data['allow_user_assign'] ? '1' : '0']
            );

            SupportTicketSetting::updateOrCreate(
                ['key' => 'allow_unpicked_ticket_edit', 'created_by' => creatorId()],
                ['value' => $data['allow_unpicked_ticket_edit'] ? '1' : '0']
            );

            SupportTicketSetting::updateOrCreate(
                ['key' => 'enable_auto_assign', 'created_by' => creatorId()],
                ['value' => $data['enable_auto_assign'] ? '1' : '0']
            );

            SupportTicketSetting::updateOrCreate(
                ['key' => 'allow_ticket_delete', 'created_by' => creatorId()],
                ['value' => $data['allow_ticket_delete'] ? '1' : '0']
            );

            SupportTicketSetting::updateOrCreate(
                ['key' => 'support_user_group_ids', 'created_by' => creatorId()],
                ['value' => json_encode($data['support_user_group_ids'] ?? [])]
            );

            return redirect()->back()->with('success', __('Support team settings updated successfully.'));
        }
        return back()->with('error', __('Permission denied'));
    }
}

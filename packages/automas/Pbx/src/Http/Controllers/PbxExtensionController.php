<?php

namespace Automas\Pbx\Http\Controllers;

use App\Models\User;
use Automas\Pbx\Models\PbxExtension;
use Automas\Pbx\Models\PbxSetting;
use Automas\Pbx\Rules\ValidPbxExtension;
use Automas\Pbx\Services\PbxLiveStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PbxExtensionController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();

        if (
            !$user->can('manage extensions') &&
            !$user->can('view all extensions') &&
            !$user->can('view own extensions') &&
            !$user->can('edit extensions')
        ) {
            return redirect()
                ->back()
                ->with('error', __('Permission denied.'));
        }

        $query = PbxExtension::query()
            ->with('user');

        $canViewAll = $user->can('view all extensions') ||
            $user->can('manage extensions') ||
            $user->type === 'company' ||
            $user->type === 'superadmin';

        if ($canViewAll) {
            $creatorId = (int) creatorId();
            $query->where('created_by', $creatorId);
        } else {
            $query->where('user_id', $user->id);
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();

            $query->where(function ($query) use ($search) {
                $query
                    ->where('extension', 'like', '%' . $search . '%')
                    ->orWhere('caller_id', 'like', '%' . $search . '%')
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery
                            ->where('name', 'like', '%' . $search . '%')
                            ->orWhere('email', 'like', '%' . $search . '%');
                    });
            });
        }

        $allowedSortFields = [
            'extension',
            'caller_id',
            'is_active',
            'created_at',
        ];

        $sortField = $request->get('sort', 'created_at');

        if (!in_array($sortField, $allowedSortFields, true)) {
            $sortField = 'created_at';
        }

        $sortDirection = $request->get('direction', 'desc');

        if (!in_array($sortDirection, ['asc', 'desc'], true)) {
            $sortDirection = 'desc';
        }

        $query->orderBy($sortField, $sortDirection);

        $perPage = (int) $request->get('per_page', 10);

        if (!in_array($perPage, [10, 15, 25, 50, 100], true)) {
            $perPage = 10;
        }

        $extensions = $query
            ->paginate($perPage)
            ->withQueryString();

        $setting = PbxSetting::query()->where('created_by', creatorId())->first();

        $canCreateExtension = $setting !== null
            && $extensions->total() < (int) $setting->max_extensions;

        return Inertia::render('Pbx/extensions/Index', [
            'extensions' => $extensions,
            'setting' => $setting,
            'canCreateExtension' => $canCreateExtension,
        ]);
    }

    public function liveStatus(Request $request, PbxLiveStatusService $liveStatusService): JsonResponse
    {
        $user = Auth::user();

        if (!$user->can('manage extensions') && !$user->can('view all extensions') && !$user->can('view own extensions')) {
            return response()->json([
                'success' => false,
                'message' => __('Permission denied.'),
            ], 403);
        }

        $creatorId = (int) creatorId();

        $query = PbxExtension::query();

        if ($user->can('view all extensions') || $user->can('manage extensions')) {
            $query->where('created_by', $creatorId);
        } elseif ($user->can('view own extensions')) {
            $query->where('created_by', $creatorId)
                ->where('user_id', $user->id);
        } else {
            $query->where('created_by', $creatorId);
        }

        if ($request->filled('ids')) {
            $ids = is_array($request->input('ids'))
                ? $request->input('ids')
                : explode(',', (string) $request->input('ids'));
            $ids = array_filter(array_map('intval', $ids));
            if (!empty($ids)) {
                $query->whereIn('id', $ids);
            }
        }

        $extensions = $query->get();

        $statuses = $liveStatusService->getStatuses($extensions);

        return response()->json([
            'success' => true,
            'extensions' => $statuses,
        ]);
    }

    public function directory(Request $request)
    {
        $creatorId = (int) creatorId();

        $query = PbxExtension::query()
            ->where('created_by', $creatorId)
            ->where('is_active', true)
            ->with('user:id,name,email');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();

            $query->where(function ($q) use ($search) {
                $q->where('extension', 'like', '%' . $search . '%')
                    ->orWhere('caller_id', 'like', '%' . $search . '%')
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', '%' . $search . '%')
                            ->orWhere('email', 'like', '%' . $search . '%');
                    });
            });
        }

        $extensions = $query->get()
            ->map(function ($ext) {
                return [
                    'id' => $ext->id,
                    'extension' => (string) $ext->extension,
                    'caller_id' => $ext->caller_id,
                    'user_name' => $ext->user ? $ext->user->name : null,
                    'user_email' => $ext->user ? $ext->user->email : null,
                    'label' => ($ext->user ? $ext->user->name . ' (' . $ext->extension . ')' : 'Ext ' . $ext->extension),
                ];
            });

        return response()->json([
            'extensions' => $extensions,
        ]);
    }

    public function create(): Response|RedirectResponse
    {
        $user = Auth::user();

        if (!$user->can('manage extensions') && !$user->can('create extensions')) {
            return redirect()
                ->back()
                ->with('error', __('Permission denied.'));
        }

        $creatorId = (int) creatorId();

        $setting = PbxSetting::query()
            ->forCreator($creatorId)
            ->first();

        if (!$setting) {
            return redirect()
                ->route('pbx.settings.index')
                ->with('error', __('Configure PBX settings before managing extensions.'));
        }

        if (!$this->canAddExtension($creatorId)) {
            return redirect()
                ->route('pbx.extensions.index')
                ->with(
                    'error',
                    __('Maximum extensions limit reached for this workspace.')
                );
        }

        return Inertia::render('Pbx/extensions/Create', [
            'users' => $this->getAvailableUsers($creatorId),
            'setting' => $setting,
            'assignedUserIds' => $this->getAssignedUserIds($creatorId),
            'assignedExtensions' => $this->getAssignedExtensions($creatorId),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();

        if (!$user->can('manage extensions') && !$user->can('create extensions')) {
            return redirect()
                ->back()
                ->with('error', __('Permission denied.'));
        }

        $creatorId = (int) creatorId();

        if (!$this->canAddExtension($creatorId)) {
            return redirect()
                ->back()
                ->withInput()
                ->with(
                    'error',
                    __('Maximum extensions limit reached for this workspace.')
                );
        }

        $validated = $this->validateExtension(
            $request,
            $creatorId
        );

        PbxExtension::query()->create([
            'created_by' => $creatorId,
            'user_id' => $validated['user_id'],
            'extension' => $validated['extension'],
            'sip_secret' => !empty($validated['sip_secret'])
                ? $validated['sip_secret']
                : Str::random(16),
            'caller_id' => $validated['caller_id'] ?? null,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()
            ->route('pbx.extensions.index')
            ->with(
                'success',
                __('Extension created successfully.')
            );
    }

    public function edit(PbxExtension $extension): Response|RedirectResponse
    {
        $user = Auth::user();

        if (!$user->can('manage extensions') && !$user->can('edit extensions')) {
            return redirect()
                ->back()
                ->with('error', __('Permission denied.'));
        }

        $this->authorizeWorkspace($extension);

        $canViewAll = $user->can('view all extensions') ||
            $user->can('manage extensions') ||
            $user->type === 'company' ||
            $user->type === 'superadmin';

        if (!$canViewAll && (int) $extension->user_id !== (int) $user->id) {
            return redirect()
                ->back()
                ->with('error', __('Permission denied. You can only edit your own extension.'));
        }

        $creatorId = (int) creatorId();

        $setting = PbxSetting::query()
            ->forCreator($creatorId)
            ->first();

        if (!$setting) {
            return redirect()
                ->route('pbx.settings.index')
                ->with(
                    'error',
                    __('Configure PBX settings before managing extensions.')
                );
        }

        $extension->load([
            'user:id,name,email',
        ]);

        return Inertia::render('Pbx/extensions/Edit', [
            'extension' => $extension,
            'users' => $this->getAvailableUsers(
                $creatorId,
                $extension->user_id
            ),
            'setting' => $setting,
            'assignedUserIds' => $this->getAssignedUserIds(
                $creatorId,
                $extension->id
            ),
            'assignedExtensions' => $this->getAssignedExtensions(
                $creatorId,
                $extension->id
            ),
        ]);
    }

    public function update(Request $request, PbxExtension $extension): RedirectResponse
    {
        $user = Auth::user();

        if (!$user->can('manage extensions') && !$user->can('edit extensions')) {
            return redirect()
                ->back()
                ->with('error', __('Permission denied.'));
        }

        $this->authorizeWorkspace($extension);

        $canViewAll = $user->can('view all extensions') ||
            $user->can('manage extensions') ||
            $user->type === 'company' ||
            $user->type === 'superadmin';

        if (!$canViewAll && (int) $extension->user_id !== (int) $user->id) {
            return redirect()
                ->back()
                ->with('error', __('Permission denied. You can only edit your own extension.'));
        }

        $creatorId = (int) creatorId();

        $validated = $this->validateExtension(
            $request,
            $creatorId,
            $extension->id
        );

        $data = [
            'user_id' => $validated['user_id'],
            'extension' => $validated['extension'],
            'caller_id' => $validated['caller_id'] ?? null,
            'is_active' => $request->boolean('is_active', true),
        ];

        if (!empty($validated['sip_secret'])) {
            $data['sip_secret'] = $validated['sip_secret'];
        }

        $extension->update($data);

        return redirect()
            ->route('pbx.extensions.index')
            ->with(
                'success',
                __('Extension updated successfully.')
            );
    }

    public function destroy(PbxExtension $extension): RedirectResponse
    {
        $user = Auth::user();

        if (!$user->can('manage extensions') && !$user->can('delete extensions')) {
            return redirect()
                ->back()
                ->with('error', __('Permission denied.'));
        }

        $this->authorizeWorkspace($extension);

        $canViewAll = $user->can('view all extensions') ||
            $user->can('manage extensions') ||
            $user->type === 'company' ||
            $user->type === 'superadmin';

        if (!$canViewAll && (int) $extension->user_id !== (int) $user->id) {
            return redirect()
                ->back()
                ->with('error', __('Permission denied. You can only delete your own extension.'));
        }

        $extension->delete();

        return redirect()
            ->route('pbx.extensions.index')
            ->with(
                'success',
                __('Extension deleted successfully.')
            );
    }

    protected function validateExtension(Request $request, int $creatorId, ?int $ignoreId = null): array
    {
        return $request->validate([
            'user_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')
                    ->where(function ($query) use ($creatorId) {
                        $query
                            ->where('created_by', $creatorId);
                    }),
                Rule::unique('pbx_extensions', 'user_id')
                    ->where(function ($query) use ($creatorId) {
                        $query->where('created_by', $creatorId);
                    })
                    ->ignore($ignoreId),
            ],

            'extension' => [
                'required',
                'string',
                'max:20',
                new ValidPbxExtension(
                    $creatorId,
                    $ignoreId
                ),
            ],

            'sip_secret' => [
                'nullable',
                'string',
                'min:6',
                'max:100',
            ],

            'caller_id' => [
                'nullable',
                'string',
                'max:50',
            ],

            'is_active' => [
                'nullable',
                'boolean',
            ],
        ]);
    }

    protected function canAddExtension(int $creatorId): bool
    {
        $setting = PbxSetting::query()
            ->forCreator($creatorId)
            ->first();

        if (!$setting) {
            return false;
        }

        $extensionCount = PbxExtension::query()
            ->forCreator($creatorId)
            ->count();

        return $extensionCount < (int) $setting->max_extensions;
    }

    protected function authorizeWorkspace(PbxExtension $extension): void
    {
        if (
            (int) $extension->created_by !==
            (int) creatorId()
        ) {
            abort(403, __('Permission denied.'));
        }
    }

    protected function getAvailableUsers(int $creatorId, ?int $currentUserId = null)
    {
        $assignedUserIds = PbxExtension::query()
            ->forCreator($creatorId)
            ->when(
                $currentUserId,
                fn($query) => $query->where(
                    'user_id',
                    '!=',
                    $currentUserId
                )
            )
            ->pluck('user_id');

        return User::query()
            ->select(['id', 'name', 'email'])->emp()
            ->where('created_by', $creatorId)
            ->where(function ($query) use ($assignedUserIds, $currentUserId) {
                $query->whereNotIn('id', $assignedUserIds);

                if ($currentUserId) {
                    $query->orWhere('id', $currentUserId);
                }
            })
            ->orderBy('name')
            ->get();
    }

    protected function getAssignedUserIds(int $creatorId, ?int $ignoreExtensionId = null): array
    {
        return PbxExtension::query()
            ->forCreator($creatorId)
            ->when(
                $ignoreExtensionId,
                fn($query) => $query->where(
                    'id',
                    '!=',
                    $ignoreExtensionId
                )
            )
            ->pluck('user_id')
            ->map(fn($id) => (int) $id)
            ->values()
            ->all();
    }

    protected function getAssignedExtensions(
        int $creatorId,
        ?int $ignoreExtensionId = null
    ): array {
        return PbxExtension::query()
            ->forCreator($creatorId)
            ->when(
                $ignoreExtensionId,
                fn($query) => $query->where(
                    'id',
                    '!=',
                    $ignoreExtensionId
                )
            )
            ->pluck('extension')
            ->map(fn($extension) => (string) $extension)
            ->values()
            ->all();
    }
}

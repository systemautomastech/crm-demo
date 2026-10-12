<?php

namespace App\Http\Controllers;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class RoleController extends Controller
{
    public function index()
    {
        if(Auth::user()->can('manage-roles')){
            $roles = Role::select('id', 'name', 'label','editable')
                ->where('created_by', creatorId())
                ->when(request('name'), fn($q) => $q->where('name', 'like', '%' . request('name') . '%'))
                ->when(request('sort'), fn($q) => $q->orderBy(request('sort'), request('direction', 'asc')))
                ->with(['users' => function($query) {
                    $query->select('id', 'name')->limit(5);
                }])
                ->withCount('permissions')
                ->paginate(request('per_page', 10))
                ->withQueryString();

            return Inertia::render('roles/index', [
                'roles' => $roles,
            ]);
        }
        else{
            return back()->with('error', __('Permission denied'));
        }
    }

    public function create()
    {
        if(Auth::user()->can('create-roles')){
            $allPermissions = Auth::user()->getAllPermissions()->select('id', 'name', 'label', 'add_on', 'module');
            $permissions = $allPermissions->groupBy('add_on')
                ->filter(function ($addOnPermissions, $addOn) {
                    return $addOn === 'general' || Module_is_active($addOn);
                })
                ->map(function ($addOnPermissions) {
                    return $addOnPermissions->groupBy('module');
                });
            return Inertia::render('roles/create', ['permissions' => $permissions]);
        }
        else{
            return back()->with('error', __('Permission denied'));
        }
    }

    public function store(StoreRoleRequest $request)
    {
        if(Auth::user()->can('create-roles')){
            $role = new Role();
            $role->name = $request->name;
            $role->label = $request->label;
            $role->created_by = creatorId();
            $role->save();
            $role->syncPermissions($request->permissions ?? []);
            return redirect()->route('roles.index')->with('success', __('The role has been created successfully.'));
        }
        else{
            return redirect()->route('roles.index')->with('error', __('Permission denied'));
        }
    }

    public function edit(Role $role)
    {
        if(Auth::user()->can('edit-roles')){
            $allPermissions = Auth::user()->getAllPermissions()->select('id', 'name', 'label', 'add_on', 'module','editable');
            $permissions = $allPermissions->groupBy('add_on')
                ->filter(function ($addOnPermissions, $addOn) {
                    return $addOn === 'general' || Module_is_active($addOn);
                })
                ->map(function ($addOnPermissions) {
                    return $addOnPermissions->groupBy('module');
                });
            $rolePermissions = $role->permissions->pluck('name')->toArray();
            return Inertia::render('roles/edit', [
                'role' => $role,
                'permissions' => $permissions,
                'rolePermissions' => $rolePermissions
            ]);
        }
        else{
            return back()->with('error', __('Permission denied'));
        }
    }

    public function update(UpdateRoleRequest $request, Role $role)
    {
        if(Auth::user()->can('edit-roles')){
            $role->update([
                'name' => $request->name,
                'label' => $request->label
            ]);
            $role->syncPermissions($request->permissions ?? []);
            return redirect()->route('roles.index')->with('success', __('The role details are updated successfully.'));
        }
        else{
            return redirect()->route('roles.index')->with('error', __('Permission denied'));
        }
    }

    public function destroy(Role $role)
    {
        if(Auth::user()->can('delete-roles')){
            $role->delete();
            return redirect()->route('roles.index')->with('success', __('The role has been deleted.'));
        }
        else{
            return redirect()->route('roles.index')->with('error', __('Permission denied'));
        }
    }

    public function duplicate(Role $role)
    {
        if (!Auth::user()->can('create-roles')) {
            return redirect()->route('roles.index')->with('error', __('Permission denied'));
        }

        $creatorId = creatorId();

        $newName = $this->generateUniqueRoleName($role->name, $creatorId);
        $newLabel = $this->generateUniqueRoleLabel($role->label ?? $role->name, $creatorId);

        $newRole = new Role();
        $newRole->name = $newName;
        $newRole->label = $newLabel;
        $newRole->created_by = $creatorId;
        $newRole->guard_name = $role->guard_name ?? 'web';
        $newRole->editable = true;
        $newRole->save();

        $permissions = $role->permissions->pluck('name')->toArray();
        $newRole->syncPermissions($permissions);

        return redirect()->route('roles.index')->with('success', __('Role duplicated successfully as ":name".', ['name' => $newLabel]));
    }

    private function generateUniqueRoleName(string $baseName, int $creatorId): string
    {
        $candidate = $baseName . '-copy';
        if (!Role::where('created_by', $creatorId)->where('name', $candidate)->exists()) {
            return $candidate;
        }

        $i = 1;
        while (true) {
            $candidate = $baseName . '-copy(' . $i . ')';
            if (!Role::where('created_by', $creatorId)->where('name', $candidate)->exists()) {
                return $candidate;
            }
            $i++;
        }
    }

    private function generateUniqueRoleLabel(string $baseLabel, int $creatorId): string
    {
        $candidate = $baseLabel . '-copy';
        if (!Role::where('created_by', $creatorId)->where('label', $candidate)->exists()) {
            return $candidate;
        }

        $i = 1;
        while (true) {
            $candidate = $baseLabel . '-copy(' . $i . ')';
            if (!Role::where('created_by', $creatorId)->where('label', $candidate)->exists()) {
                return $candidate;
            }
            $i++;
        }
    }
}

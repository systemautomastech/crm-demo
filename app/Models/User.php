<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Permission\Models\Permission as ModelsPermission;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasRoles, HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
            'name',
            'email',
            'mobile_no',
            'email_verified_at',
            'password',
            'type',
            'avatar',
            'lang',
            'layout_direction',
            'active_plan',
            'plan_expire_date',
            'is_trial_done',
            'total_user',
            'commission_amount',
            'storage_limit',
            'is_disable',
            'is_enable_login',
            'creator_id',
            'created_by',
            'active_status',
            'last_seen_at',
            'slug',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_trial_done' => 'integer',
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($user) {
            if (empty($user->slug)) {
                $user->slug = static::generateUniqueSlug($user->name);
            }
        });
    }

    public static function generateUniqueSlug($name)
    {
        $slug = Str::slug($name);
        $originalSlug = $slug;
        $counter = 1;

        while (static::where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    public static $superadmin_activated_module = [
        'LandingPage',
    ];

    public  $not_emp_type = [
        'superadmin',
        'company',
        'doctor',
        'student',
        'parent',
        'tenant',
        'salesagent',
        'driver',
        'farmer',
        'gym member',
        'gym trainer',
        'resident',
        'hr',
        'construction-partner',
        'driving student',
        'advocate',
        'case initiator'
    ];

    public function scopeActive($query)
    {
        return $query->where('is_disable', 0);
    }

    public function scopeEmp($query, $additionalTypes = [], $includeTypes = [], $includeDisabled = false)
    {
        $excludeTypes = array_diff(array_merge($this->not_emp_type, $additionalTypes), $includeTypes);
        $query = $query->whereNotIn('type', $excludeTypes);
        if (!$includeDisabled) {
            $query->where('is_disable', 0);
        }
        return $query;
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function userGroups(): BelongsToMany
    {
        return $this->belongsToMany(UserGroup::class, 'user_group_users', 'user_id', 'user_group_id')
                    ->withPivot('created_at');
    }

    public static function CompanySetting($user_id)
    {
        $company_settings = [
            // Brand Settings
            'logo_light' => admin_setting('logo_light'),
            'logo_dark' => admin_setting('logo_dark'),
            'favicon' => admin_setting('favicon'),
            'titleText' => admin_setting('titleText'),
            'footerText' => admin_setting('footerText'),
            'sidebarVariant' => admin_setting('sidebarVariant'),
            'sidebarStyle' => admin_setting('sidebarStyle'), 
            'themeMode' => admin_setting('themeMode'),
            'themeColor' => admin_setting('themeColor'),
            'customColor' => admin_setting('customColor'),

            // System Settings
            'defaultLanguage' => admin_setting('defaultLanguage'),
            'dateFormat' => admin_setting('dateFormat'),
            'timeFormat' => admin_setting('timeFormat'),
            'calendarStartDay' => admin_setting('calendarStartDay'),

            // Currency Settings
            'defaultCurrency' => admin_setting('defaultCurrency'),
            'currencySymbol' => admin_setting('currencySymbol'),
            'currency_format' => admin_setting('currency_format'),
            'decimalFormat' => admin_setting('decimalFormat'),
            'decimalSeparator' => admin_setting('decimalSeparator'),
            'thousandsSeparator' => admin_setting('thousandsSeparator'),
            'floatNumber' => admin_setting('floatNumber'),
            'currencySymbolSpace' => admin_setting('currencySymbolSpace'),
            'currencySymbolPosition' => admin_setting('currencySymbolPosition'),
        ];
        foreach($company_settings as $key => $value){
            if (!company_setting($key,$user_id)) {
                setSetting($key, $value, $user_id);
            }
        }
    }

    public static function MakeRole($userId)
    {
        // Create staff role
        $staffRole = Role::where('name','staff')->where('created_by',$userId)->where('guard_name','web')->first();
        if(empty($staffRole))
        {
            $staffRole                   = new Role();
            $staffRole->name             = 'staff';
            $staffRole->guard_name       = 'web';
            $staffRole->label            = 'Staff';
            $staffRole->editable         = false;
            $staffRole->created_by       = $userId;
            $staffRole->save();

            $permissions = ModelsPermission::whereIn('name', [
                'manage-dashboard',
                'manage-media',
                'manage-own-media',
                'create-media',
                'download-media',
                'delete-media',
                'manage-media-directories',
                'manage-own-media-directories',
                'create-media-directories',
                'edit-media-directories',
                'delete-media-directories',
                'manage-profile',
                'edit-profile',
                'change-password-profile',
                'manage-messenger',
                'send-messages',
                'view-messages',
                'toggle-favorite-messages',
                'toggle-pinned-messages'
            ])->get();

            $staffRole->givePermissionTo($permissions);
        }
    }
}

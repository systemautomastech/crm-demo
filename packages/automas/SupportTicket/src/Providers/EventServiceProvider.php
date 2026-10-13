<?php

namespace Automas\SupportTicket\Providers;

use App\Events\GivePermissionToRole;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use App\Events\DefaultData;
use Automas\SupportTicket\Listeners\DataDefault;
use Automas\SupportTicket\Listeners\GiveRoleToPermission;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        DefaultData::class => [
            DataDefault::class,
        ],
          GivePermissionToRole::class => [
            GiveRoleToPermission::class,
        ],

    ];
}
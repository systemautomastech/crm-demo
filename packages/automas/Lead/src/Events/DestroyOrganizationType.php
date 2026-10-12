<?php

namespace Automas\Lead\Events;

use Automas\Lead\Models\OrganizationType;
use Illuminate\Foundation\Events\Dispatchable;

class DestroyOrganizationType
{
    use Dispatchable;

    public function __construct(
        public OrganizationType $organizationType
    ) {}
}

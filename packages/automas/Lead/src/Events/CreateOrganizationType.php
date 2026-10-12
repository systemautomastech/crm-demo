<?php

namespace Automas\Lead\Events;

use Automas\Lead\Models\OrganizationType;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Http\Request;

class CreateOrganizationType
{
    use Dispatchable;

    public function __construct(
        public Request $request,
        public OrganizationType $organizationType
    ) {}
}

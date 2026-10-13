<?php

namespace Automas\SupportTicket\Listeners;

use App\Events\DefaultData;
use Automas\SupportTicket\Models\TicketField;
use Automas\SupportTicket\Models\SupportUtility;

class DataDefault
{
    public function handle(DefaultData $event)
    {
        $company_id = $event->company_id;
        $user_module = $event->user_module ? explode(',', $event->user_module) : [];
        
        if (!empty($user_module) && in_array("SupportTicket", $user_module)) {
            TicketField::defaultdata($company_id);
            SupportUtility::defaultdata($company_id);
        }
    }
}
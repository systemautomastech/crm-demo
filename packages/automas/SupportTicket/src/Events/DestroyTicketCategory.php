<?php

namespace Automas\SupportTicket\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Automas\SupportTicket\Models\TicketCategory;

class DestroyTicketCategory
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public TicketCategory $ticketCategory
    ) {}
}
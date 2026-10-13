<?php

namespace Automas\SupportTicket\Listeners;

use Automas\SupportTicket\Events\CreateTicket;
use App\Models\EmailTemplate;
use Illuminate\Support\Facades\Crypt;

class SendTicketCreatedEmail
{
    public function handle(CreateTicket $event)
    {
        if (Module_is_active('SupportTicket')) {
            $ticket = $event->ticket;

            $obj = [
                'ticket_name' => $ticket->name,
                'email' => $ticket->email,
                'ticket_id' => $ticket->ticket_id,
                'ticket_url' => route('support-tickets.show', Crypt::encrypt($ticket->id)),
            ];

            EmailTemplate::sendEmailTemplate('New Ticket', [$ticket->email], $obj, $ticket->created_by);
        }
    }
}

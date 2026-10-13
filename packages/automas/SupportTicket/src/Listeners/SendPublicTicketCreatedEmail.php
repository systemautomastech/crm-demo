<?php

namespace Automas\SupportTicket\Listeners;

use Automas\SupportTicket\Events\CreateTicket;
use App\Models\EmailTemplate;

class SendPublicTicketCreatedEmail
{
    public function handle(CreateTicket $event)
    {
        if (Module_is_active('SupportTicket')) {
            $ticket = $event->ticket;
            
            $obj = [
                'ticket_name' => $ticket->name,
                'email' => $ticket->email,
                'ticket_id' => $ticket->ticket_id,
                'ticket_password' => $event->password ?? '',
                'ticket_url' => route('support-ticket.show.ticket', [$ticket->created_by, $ticket->ticket_id]),
            ];

            EmailTemplate::sendEmailTemplate('New Ticket', [$ticket->email], $obj, $ticket->created_by);
        }
    }
}
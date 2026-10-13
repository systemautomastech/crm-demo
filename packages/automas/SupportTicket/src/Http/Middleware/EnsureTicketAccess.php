<?php

namespace Automas\SupportTicket\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Automas\SupportTicket\Models\Ticket;
use App\Models\User;

class EnsureTicketAccess
{
    /**
     * Handle an incoming request.
     * Checks if the user is authenticated to view the ticket.
     * If not authenticated and password is required, redirects to password verification.
     */
    public function handle(Request $request, Closure $next)
    {
        $slug = $request->route('slug');
        $encryptedTicketId = $request->route('ticket_id') ?? $request->route('ticketId') ?? $request->route('id');

        if (!$slug || !$encryptedTicketId) {
            return $next($request);
        }

        $user = User::where('slug', $slug)->first();
        if (!$user) {
            abort(404, 'Support ticket page not found');
        }

        try {
            $decryptedId = is_numeric($encryptedTicketId) ? $encryptedTicketId : Crypt::decrypt($encryptedTicketId);
            $ticket = Ticket::where('id', $decryptedId)
                ->where('created_by', $user->id)
                ->first();

            if (!$ticket) {
                return redirect()->route('support-ticket.my-ticket', [$slug])
                    ->with('error', __('Ticket not found.'));
            }

            // Strictly require ticket session access for public ticket view
            $sessionKey = 'ticket_access_' . $ticket->id;
            $hasSessionAccess = session()->has($sessionKey) && session($sessionKey) === true;

            if (!$hasSessionAccess) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'error' => __('Please enter your Ticket Number and Password to access this conversation.')
                    ], 403);
                }

                return redirect()->route('support-ticket.my-ticket', [
                    'slug' => $slug,
                    'ticket_id' => $ticket->ticket_id
                ])->with('error', __('Please enter your password to access this ticket.'));
            }
        } catch (\Exception $e) {
            if ($request->expectsJson()) {
                return response()->json(['error' => __('Invalid ticket reference.')], 404);
            }
            return redirect()->route('support-ticket.my-ticket', [$slug])
                ->with('error', __('Invalid ticket reference.'));
        }

        return $next($request);
    }
}

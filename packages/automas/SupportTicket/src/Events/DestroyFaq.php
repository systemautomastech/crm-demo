<?php

namespace Automas\SupportTicket\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Automas\SupportTicket\Models\Faq;

class DestroyFaq
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Faq $faq
    ) {}
}
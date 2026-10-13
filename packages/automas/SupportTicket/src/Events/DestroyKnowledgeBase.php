<?php

namespace Automas\SupportTicket\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Automas\SupportTicket\Models\KnowledgeBase;

class DestroyKnowledgeBase
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public KnowledgeBase $knowledgeBase
    ) {}
}
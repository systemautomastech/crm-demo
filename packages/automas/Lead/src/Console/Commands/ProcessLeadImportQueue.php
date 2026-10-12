<?php

namespace Automas\Lead\Console\Commands;

use Automas\Lead\Jobs\FinalizeLeadImport;
use Automas\Lead\Jobs\ImportLeadChunk;
use Automas\Lead\Jobs\PrepareLeadImport;
use Automas\Lead\Models\LeadImport;
use Automas\Lead\Models\LeadImportChunk;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class ProcessLeadImportQueue extends Command
{
    protected $signature = 'lead-import:process-queue';

    protected $description = 'Process queued lead imports safely and recover any stalled tasks.';

    public function handle(): int
    {
        $this->info('Starting lead import queue processor...');

        // 1. Process any imports in status 'pending' or 'preparing'
        $pendingImports = LeadImport::query()
            ->whereIn('status', ['pending', 'preparing'])
            ->get();

        foreach ($pendingImports as $import) {
            try {
                if ($import->total_chunks <= 0) {
                    $this->info("Preparing import ID: {$import->id}");
                    (new PrepareLeadImport($import->id))->handle();
                }
            } catch (\Throwable $e) {
                Log::error("Failed to prepare lead import {$import->id}: " . $e->getMessage());
                $import->update([
                    'status' => 'failed',
                    'failure_message' => $e->getMessage(),
                ]);
            }
        }

        // 2. Process any pending / processing chunks directly
        $pendingChunks = LeadImportChunk::query()
            ->whereIn('status', ['pending', 'processing'])
            ->orderBy('chunk_number')
            ->get();

        foreach ($pendingChunks as $chunk) {
            try {
                $this->info("Processing chunk ID: {$chunk->id} (Chunk #{$chunk->chunk_number})");
                (new ImportLeadChunk($chunk->id))->handle();
            } catch (\Throwable $e) {
                Log::error("Failed to process lead import chunk {$chunk->id}: " . $e->getMessage());
            }
        }

        // 3. Finalize any completed imports
        $readyToFinalize = LeadImport::query()
            ->whereIn('status', ['queued', 'preparing', 'processing'])
            ->get();

        foreach ($readyToFinalize as $import) {
            if ($import->total_chunks > 0 && $import->completed_chunks >= $import->total_chunks) {
                try {
                    $this->info("Finalizing import ID: {$import->id}");
                    (new FinalizeLeadImport($import->id))->handle();
                } catch (\Throwable $e) {
                    Log::error("Failed to finalize lead import {$import->id}: " . $e->getMessage());
                }
            }
        }

        // 4. Fallback trigger queue worker for generic queue driver items if enabled
        try {
            Artisan::call('queue:work', [
                '--queue' => 'lead-imports,default',
                '--stop-when-empty' => true,
                '--tries' => 3,
                '--timeout' => 300,
            ]);
        } catch (\Throwable $e) {
            // Ignore worker invocation errors if CLI fails
        }

        return 0;
    }
}

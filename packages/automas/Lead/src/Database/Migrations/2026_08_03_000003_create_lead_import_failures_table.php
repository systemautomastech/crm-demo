<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_import_failures', function (Blueprint $table) {
            $table->id();

            $table->foreignId('lead_import_id')
                ->constrained('lead_imports')
                ->cascadeOnDelete();

            $table->foreignId('lead_import_chunk_id')
                ->nullable()
                ->constrained('lead_import_chunks')
                ->nullOnDelete();

            $table->unsignedInteger('row_number');

            // Original CSV values
            $table->json('row_data')->nullable();

            // Example: ["Phone is required", "Name is required"]
            $table->json('errors');

            $table->timestamps();

            $table->index([
                'lead_import_id',
                'row_number',
            ], 'lead_import_failure_row_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_import_failures');
    }
};
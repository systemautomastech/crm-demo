<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_import_chunks', function (Blueprint $table) {
            $table->id();

            $table->foreignId('lead_import_id')
                ->constrained('lead_imports')
                ->cascadeOnDelete();

            $table->unsignedInteger('chunk_number');
            $table->string('stored_path');

            /*
             * pending
             * processing
             * completed
             * failed
             * cancelled
             */
            $table->string('status', 30)->default('pending')->index();

            $table->unsignedInteger('first_row_number')->default(0);
            $table->unsignedInteger('last_row_number')->default(0);
            $table->unsignedInteger('total_rows')->default(0);

            $table->unsignedInteger('processed_rows')->default(0);
            $table->unsignedInteger('inserted_rows')->default(0);
            $table->unsignedInteger('updated_rows')->default(0);
            $table->unsignedInteger('duplicate_rows')->default(0);
            $table->unsignedInteger('skipped_rows')->default(0);
            $table->unsignedInteger('failed_rows')->default(0);

            $table->unsignedTinyInteger('attempts')->default(0);
            $table->text('failure_message')->nullable();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            $table->unique([
                'lead_import_id',
                'chunk_number',
            ], 'lead_import_chunk_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_import_chunks');
    }
};
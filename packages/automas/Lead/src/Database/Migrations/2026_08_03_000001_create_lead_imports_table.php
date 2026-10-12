<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_imports', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            /*
             * ownership
             *
             * creator_id:
             * Main company/account owner.
             *
             * created_by:
             * Logged-in user who uploaded the CSV.
             */
            $table->foreignId('creator_id')
                ->nullable()
                ->index()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('created_by')
                ->nullable()
                ->index()
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('original_filename');
            $table->string('stored_path');
            $table->unsignedBigInteger('file_size')->default(0);

            $table->string('mode', 30)->default('preview');

            $table->string('status', 50)
                ->default('uploaded')
                ->index();

            $table->string('duplicate_strategy', 30)
                ->default('skip');

            $table->json('column_mapping')->nullable();
            $table->json('default_values')->nullable();
            $table->json('options')->nullable();

            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('total_chunks')->default(0);
            $table->unsignedInteger('completed_chunks')->default(0);

            $table->unsignedInteger('processed_rows')->default(0);
            $table->unsignedInteger('inserted_rows')->default(0);
            $table->unsignedInteger('updated_rows')->default(0);
            $table->unsignedInteger('duplicate_rows')->default(0);
            $table->unsignedInteger('skipped_rows')->default(0);
            $table->unsignedInteger('failed_rows')->default(0);

            $table->string('error_file_path')->nullable();
            $table->text('failure_message')->nullable();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            $table->timestamps();

            $table->index(
                ['creator_id', 'created_by', 'status'],
                'lead_import_owner_status_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_imports');
    }
};

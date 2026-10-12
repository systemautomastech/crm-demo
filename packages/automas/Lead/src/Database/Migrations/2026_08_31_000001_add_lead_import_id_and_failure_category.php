<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('lead_import_failures') && !Schema::hasColumn('lead_import_failures', 'category')) {
            Schema::table('lead_import_failures', function (Blueprint $table) {
                $table->string('category', 50)
                    ->nullable()
                    ->default('validation_error')
                    ->after('row_number')
                    ->index();
            });
        }

        if (Schema::hasTable('leads')) {
            if (!Schema::hasColumn('leads', 'lead_import_id')) {
                Schema::table('leads', function (Blueprint $table) {
                    $table->foreignId('lead_import_id')
                        ->nullable()
                        ->after('import_key')
                        ->index()
                        ->constrained('lead_imports')
                        ->nullOnDelete();
                });
            }

            if (Schema::hasColumn('leads', 'import_key')) {
                Schema::table('leads', function (Blueprint $table) {
                    $table->string('import_key', 100)->nullable()->change();
                });
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('lead_import_failures') && Schema::hasColumn('lead_import_failures', 'category')) {
            Schema::table('lead_import_failures', function (Blueprint $table) {
                $table->dropIndex(['category']);
                $table->dropColumn('category');
            });
        }

        if (Schema::hasTable('leads') && Schema::hasColumn('leads', 'lead_import_id')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->dropForeign(['lead_import_id']);
                $table->dropColumn('lead_import_id');
            });
        }
    }
};

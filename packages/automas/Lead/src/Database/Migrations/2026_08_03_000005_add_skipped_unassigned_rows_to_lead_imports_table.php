<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_imports', function (Blueprint $table) {
            $table->unsignedInteger('skipped_unassigned_rows')
                ->default(0)
                ->after('skipped_rows');
        });
    }

    public function down(): void
    {
        Schema::table('lead_imports', function (Blueprint $table) {
            $table->dropColumn('skipped_unassigned_rows');
        });
    }
};
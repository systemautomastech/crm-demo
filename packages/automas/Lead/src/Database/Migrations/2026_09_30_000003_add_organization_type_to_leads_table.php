<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('leads') && !Schema::hasColumn('leads', 'organization_type')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->string('organization_type')->nullable()->after('subject');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('leads') && Schema::hasColumn('leads', 'organization_type')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->dropColumn('organization_type');
            });
        }
    }
};

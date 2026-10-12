<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('deals')) {
            Schema::table('deals', function (Blueprint $table) {
                if (!Schema::hasColumn('deals', 'organization_type')) {
                    $table->string('organization_type')->nullable()->after('status');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('deals')) {
            Schema::table('deals', function (Blueprint $table) {
                if (Schema::hasColumn('deals', 'organization_type')) {
                    $table->dropColumn('organization_type');
                }
            });
        }
    }
};

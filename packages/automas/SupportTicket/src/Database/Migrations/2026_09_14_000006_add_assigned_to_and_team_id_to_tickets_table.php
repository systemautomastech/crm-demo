<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('tickets')) {
            Schema::table('tickets', function (Blueprint $table) {
                if (!Schema::hasColumn('tickets', 'assigned_to')) {
                    $table->foreignId('assigned_to')->nullable()->after('user_id')->index();
                    $table->foreign('assigned_to')->references('id')->on('users')->onDelete('set null');
                }

                if (!Schema::hasColumn('tickets', 'team_id')) {
                    $table->foreignId('team_id')->nullable()->after('assigned_to')->index();
                    $table->foreign('team_id')->references('id')->on('user_groups')->onDelete('set null');
                }

                if (!Schema::hasColumn('tickets', 'picked_at')) {
                    $table->timestamp('picked_at')->nullable()->after('created_by');
                }

                if (!Schema::hasColumn('tickets', 'access_password')) {
                    $table->string('access_password')->nullable()->after('picked_at');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('tickets')) {
            Schema::table('tickets', function (Blueprint $table) {
                if (Schema::hasColumn('tickets', 'access_password')) {
                    $table->dropColumn('access_password');
                }

                if (Schema::hasColumn('tickets', 'picked_at')) {
                    $table->dropColumn('picked_at');
                }

                if (Schema::hasColumn('tickets', 'team_id')) {
                    $table->dropForeign(['team_id']);
                    $table->dropColumn('team_id');
                }

                if (Schema::hasColumn('tickets', 'assigned_to')) {
                    $table->dropForeign(['assigned_to']);
                    $table->dropColumn('assigned_to');
                }
            });
        }
    }
};

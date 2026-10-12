<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('deal_stages')) {
            Schema::table('deal_stages', function (Blueprint $table) {
                if (!Schema::hasColumn('deal_stages', 'is_won')) {
                    $table->boolean('is_won')->default(false)->after('pipeline_id');
                }
                if (!Schema::hasColumn('deal_stages', 'is_lost')) {
                    $table->boolean('is_lost')->default(false)->after('is_won');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('deal_stages')) {
            Schema::table('deal_stages', function (Blueprint $table) {
                if (Schema::hasColumn('deal_stages', 'is_won')) {
                    $table->dropColumn('is_won');
                }
                if (Schema::hasColumn('deal_stages', 'is_lost')) {
                    $table->dropColumn('is_lost');
                }
            });
        }
    }
};

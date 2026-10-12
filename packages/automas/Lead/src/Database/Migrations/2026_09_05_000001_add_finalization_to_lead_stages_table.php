<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if(Schema::hasTable('lead_stages'))
        {
            Schema::table('lead_stages', function (Blueprint $table) {
                if (!Schema::hasColumn('lead_stages', 'is_final_accepted')) {
                    $table->boolean('is_final_accepted')->default(false)->after('pipeline_id');
                }
                if (!Schema::hasColumn('lead_stages', 'is_final_rejected')) {
                    $table->boolean('is_final_rejected')->default(false)->after('is_final_accepted');
                }   
            });
        }
    }

    public function down()
    {
         Schema::table('lead_stages', function (Blueprint $table) {
            if (Schema::hasColumn('lead_stages', 'is_final_accepted')) {
                $table->dropColumn('is_final_accepted');
            }
            if (Schema::hasColumn('lead_stages', 'is_final_rejected')) {
                $table->dropColumn('is_final_rejected');
            }
        });
    }
};

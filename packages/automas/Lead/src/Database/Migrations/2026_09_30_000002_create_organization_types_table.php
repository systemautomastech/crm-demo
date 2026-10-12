<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('organization_types')) {
            Schema::create('organization_types', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->integer('creator_id')->default(0);
                $table->integer('created_by')->default(0);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_types');
    }
};

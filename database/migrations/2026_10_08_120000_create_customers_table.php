<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('customers')) {
            Schema::create('customers', function (Blueprint $table) {
                $table->id();
                $table->string('customer_code')->unique();
                $table->string('customer_name');
                $table->string('customer_email');
                $table->string('customer_phone');
                $table->string('contact_person_name')->nullable();
                $table->string('contact_person_email')->nullable();
                $table->string('contact_person_mobile')->nullable();
                $table->string('tax_number')->nullable();
                $table->string('payment_terms')->nullable();
                $table->longText('billing_address')->nullable();
                $table->longText('shipping_address')->nullable();
                $table->boolean('same_as_billing')->default(false);
                $table->longText('other_informations')->nullable();
                $table->text('notes')->nullable();
                $table->boolean('is_active')->default(true);
                $table->foreignId('creator_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('created_by')->nullable()->constrained('users')->cascadeOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};

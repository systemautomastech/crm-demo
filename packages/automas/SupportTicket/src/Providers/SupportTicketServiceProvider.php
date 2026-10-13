<?php

namespace Automas\SupportTicket\Providers;

use Illuminate\Support\ServiceProvider;

class SupportTicketServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $routesPath = __DIR__.'/../Routes/web.php';
        if (file_exists($routesPath)) {
            $this->loadRoutesFrom($routesPath);
        }
        $apiRoutesPath = __DIR__.'/../Routes/api.php';
        if (file_exists($apiRoutesPath)) {
            $this->loadRoutesFrom($apiRoutesPath);
        }

        $migrationsPath = __DIR__.'/../Database/Migrations';
        if (is_dir($migrationsPath)) {
            $this->loadMigrationsFrom($migrationsPath);
        }
    }

    public function register(): void
    {
        $this->app->register(EventServiceProvider::class);
    }
    public function registerTranslations()
    {
        // Load from main app lang folder (all languages)
        $mainLangPath = resource_path('lang');
        if (is_dir($mainLangPath)) {
            $this->loadJsonTranslationsFrom($mainLangPath);
        }

        // Load from package lang folder (fallback)
        $packageLangPath = __DIR__.'/../Resources/lang';
        if (is_dir($packageLangPath)) {
            $this->loadJsonTranslationsFrom($packageLangPath);
        }
    }
}

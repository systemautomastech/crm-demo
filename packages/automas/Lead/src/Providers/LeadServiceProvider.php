<?php

namespace Automas\Lead\Providers;

use Illuminate\Support\ServiceProvider;

class LeadServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->registerTranslations();
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

        if ($this->app->runningInConsole()) {
            $this->commands([
                \Automas\Lead\Console\Commands\CleanExpiredLeadImportFiles::class,
                \Automas\Lead\Console\Commands\ProcessLeadImportQueue::class,
            ]);
        }

        $this->registerCommandSchedules();
    }

    protected function registerCommandSchedules(): void
    {
        $this->app->booted(function () {
            $schedule = $this->app->make(\Illuminate\Console\Scheduling\Schedule::class);

            $schedule->command('lead-import:clean-expired-files')
                ->daily()
                ->withoutOverlapping();

            $schedule->command('lead-import:process-queue')
                ->everyMinute()
                ->withoutOverlapping(10);
        });
    }

    public function register(): void
    {
        $this->app->register(EventServiceProvider::class);
    }
    /**
     * Register translations.
     *
     * @return void
     */
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
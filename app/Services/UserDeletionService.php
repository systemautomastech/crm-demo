<?php

namespace App\Services;

use App\Models\User;
use App\Models\Customer;
use App\Models\MediaDirectory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class UserDeletionService
{
    /**
     * Delete a user along with their related records (Media files, tokens)
     * while preserving records created by the user.
     *
     * @param User $user
     * @return void
     */
    public function deleteUser(User $user): void
    {
        DB::transaction(function () use ($user) {

            // Delete user's own media files & avatar
            $this->deleteUserMediaFiles($user);

            // Delete Sanctum API tokens if applicable
            if (method_exists($user, 'tokens')) {
                $user->tokens()->delete();
            }

            // Delete the User model instance
            $user->delete();
        });
    }

    /**
     * Delete customer record associated with the user
     *
     * @param Customer $customer
     * @return void
     */
    protected function deleteCustomer(Customer $customer): void
    {
        Customer::where('customer_email', $customer->customer_email)
            ->orWhere('created_by', $customer->id)
            ->delete();
    }

    /**
     * Delete user profile avatar, media files, and media directories created by the user
     *
     * @param User $user
     * @return void
     */
    protected function deleteUserMediaFiles(User $user): void
    {
        // 1. Delete user avatar image if set and not default avatar
        if (!empty($user->avatar) && strpos($user->avatar, 'avatar.png') === false && function_exists('delete_file')) {
            delete_file($user->avatar);
        }

        // 2. Delete media library files created by or attached to user
        if (class_exists(Media::class)) {
            $mediaItems = Media::where('creator_id', $user->id)
                ->orWhere(function ($query) use ($user) {
                    $query->where('model_type', User::class)->where('model_id', $user->id);
                })
                ->get();

            foreach ($mediaItems as $media) {
                try {
                    if (!empty($media->file_name) && function_exists('delete_file')) {
                        delete_file($media->file_name);
                    } elseif (!empty($media->disk) && !empty($media->file_name)) {
                        Storage::disk($media->disk)->delete('media/' . $media->file_name);
                    }
                } catch (\Exception $e) {
                    Log::warning("Could not delete media file: {$media->file_name}. Error: {$e->getMessage()}");
                }
                $media->delete();
            }
        }

        // 3. Delete media directories created by the user
        if (class_exists(MediaDirectory::class)) {
            MediaDirectory::where('creator_id', $user->id)
                ->orWhere('created_by', $user->id)
                ->delete();
        }
    }
}

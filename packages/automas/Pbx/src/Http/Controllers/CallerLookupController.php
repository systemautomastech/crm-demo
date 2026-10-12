<?php

namespace Automas\Pbx\Http\Controllers;

use App\Models\User;
use Automas\Lead\Models\Deal;
use Automas\Lead\Models\Lead;
use Automas\Pbx\Models\PbxExtension;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CallerLookupController extends Controller
{
    public function lookup(Request $request): JsonResponse
    {
        // if (! Auth::user()?->can('use dialer')) {
        //     return response()->json([
        //         'found' => false,
        //         'message' => 'You do not have permission to use the dialer.',
        //     ], 403);
        // }

        $validated = $request->validate([
            'number' => ['required', 'string', 'max:50'],
        ]);

        $phoneNumber = trim($validated['number']);
        $creatorId = (int) creatorId();
        $digits = $this->normalizeNumber($phoneNumber);
        $digitLength = strlen($digits);

        if ($digits === '') {
            return response()->json([
                'found' => false,
                'number' => $phoneNumber,
                'message' => 'Invalid phone number.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Extension lookup
        |--------------------------------------------------------------------------
        |
        | Any number shorter than 9 digits is treated only as an extension.
        | It will not search users, leads or deals.
        |
        */
        if ($digitLength < 9) {
            $extensionUser = $this->findUserByExtension(
                extension: $digits,
                creatorId: $creatorId,
            );

            if ($extensionUser) {
                return $this->userResponse(
                    user: $extensionUser,
                    creatorId: $creatorId,
                    source: 'extension',
                    extension: $digits,
                );
            }

            return response()->json([
                'found' => false,
                'number' => $phoneNumber,
                'lookup_type' => 'extension',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Unsupported nine-digit number
        |--------------------------------------------------------------------------
        |
        | Phone-number searching starts from 10 digits.
        |
        */
        if ($digitLength === 9) {
            return response()->json([
                'found' => false,
                'number' => $phoneNumber,
                'message' => 'The number must contain at least 10 digits.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Phone lookup
        |--------------------------------------------------------------------------
        |
        | Numbers containing 10 or more digits are searched in this order:
        |
        | 1. Users
        | 2. Leads
        | 3. Deals
        |
        */
        $phoneVariants = $this->getPhoneVariants($digits);
        $last10 = substr($digits, -10);

        /*
        |--------------------------------------------------------------------------
        | 1. Search users
        |--------------------------------------------------------------------------
        */
        $user = $this->findUserByPhone(
            creatorId: $creatorId,
            phoneVariants: $phoneVariants,
            last10: $last10,
        );

        if ($user) {
            return $this->userResponse(
                user: $user,
                creatorId: $creatorId,
                source: 'mobile',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | 2. Search leads
        |--------------------------------------------------------------------------
        */
        if (class_exists(Lead::class)) {
            $lead = $this->findLead(
                creatorId: $creatorId,
                phoneVariants: $phoneVariants,
                last10: $last10,
            );

            if ($lead) {
                return $this->foundResponse([
                    'type' => 'lead',
                    'id' => $lead->id,
                    'name' => $lead->name,
                    'phone' => $lead->phone,
                    'email' => $lead->email,
                    'organization' => null,
                    'extra' => [
                        'record_type' => 'lead',
                        'lead_stage' => $lead->stage?->name,
                        'lead_subject' => $lead->subject,
                        'lead_created_at' => $lead->created_at?->diffForHumans(),
                        'lead_link' => route('lead.leads.show', $lead->id),
                    ],
                ]);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | 3. Search deals
        |--------------------------------------------------------------------------
        */
        if (class_exists(Deal::class)) {
            $deal = $this->findDeal(
                creatorId: $creatorId,
                phoneVariants: $phoneVariants,
                last10: $last10,
            );

            if ($deal) {
                return $this->foundResponse([
                    'type' => 'deal',
                    'id' => $deal->id,
                    'name' => $deal->name,
                    'phone' => $deal->phone,
                    'email' => null,
                    'organization' => null,
                    'extra' => [
                        'record_type' => 'deal',
                        'deal_stage' => $deal->stage?->name,
                        'deal_link' => route('deal.deals.show', $deal->id),
                    ],
                ]);
            }
        }

        return response()->json([
            'found' => false,
            'number' => $phoneNumber,
            'lookup_type' => 'phone',
        ]);
    }

    /**
     * Find the user assigned to an active PBX extension.
     */
    private function findUserByExtension(
        string $extension,
        int $creatorId,
    ): ?User {
        $pbxExtension = PbxExtension::query()
            ->select([
                'id',
                'user_id',
                'extension',
                'caller_id',
            ])
            ->with([
                'user' => function ($query): void {
                    $query->select([
                        'id',
                        'name',
                        'email',
                        'mobile_no',
                        'type',
                        'created_by',
                    ]);
                },
            ])
            ->where('created_by', $creatorId)
            ->where('extension', $extension)
            ->where('is_active', true)
            ->first();

        if (!$pbxExtension?->user) {
            return null;
        }

        $user = $pbxExtension->user;

        /*
         * Protect SaaS data and exclude system-level users.
         */
        if (
            (int) $user->created_by !== $creatorId ||
            $this->isExcludedUserType($user->type)
        ) {
            return null;
        }

        /*
         * Add extension information without another database query.
         */
        $user->setAttribute(
            'pbx_extension',
            $pbxExtension->extension,
        );

        $user->setAttribute(
            'pbx_caller_id',
            $pbxExtension->caller_id,
        );

        return $user;
    }

    /**
     * Find any allowed user by users.mobile_no.
     */
    private function findUserByPhone(
        int $creatorId,
        array $phoneVariants,
        string $last10,
    ): ?User {
        /*
         * Fast exact indexed lookup first.
         */
        $user = User::query()
            ->select([
                'id',
                'name',
                'email',
                'mobile_no',
                'type',
                'created_by',
            ])
            ->where('created_by', $creatorId)
            ->whereNotIn('type', $this->excludedUserTypes())
            ->whereIn('mobile_no', $phoneVariants)
            ->first();

        if ($user) {
            return $user;
        }

        /*
         * Fallback for formatted numbers.
         */
        return User::query()
            ->select([
                'id',
                'name',
                'email',
                'mobile_no',
                'type',
                'created_by',
            ])
            ->where('created_by', $creatorId)
            ->whereNotIn('type', $this->excludedUserTypes())
            ->where(function (Builder $query) use ($phoneVariants, $last10): void {
                $this->applyNormalizedPhoneSearch(
                    query: $query,
                    column: 'mobile_no',
                    phoneVariants: $phoneVariants,
                    last10: $last10,
                );
            })
            ->first();
    }

    /**
     * Build the user response and include employee details when available.
     */
    private function userResponse(
        User $user,
        int $creatorId,
        string $source,
        ?string $extension = null,
    ) {
        $resolvedExtension = $extension
            ?? $user->getAttribute('pbx_extension');

        return $this->foundResponse([
            'type' => 'user',
            'id' => $user->id,
            'name' => $user->name,
            'phone' => $user->mobile_no,
            'email' => $user->email,
            'organization' => null,
            'extra' => [
                'record_type' => 'user',
                'user_type' => $user->type,
                'lookup_source' => $source,
                'extension' => $resolvedExtension,
                'caller_id' => $user->getAttribute('pbx_caller_id'),
                'employee_id' => null,
                'department' => null,
                'designation' => $user->designation ?? null,
                'branch' => null,
            ],
        ]);
    }

    /**
     * Find a lead by phone number.
     */
    private function findLead(
        int $creatorId,
        array $phoneVariants,
        string $last10,
    ): ?Lead {
        $columns = [
            'id',
            'name',
            'phone',
            'email',
            'subject',
            'stage_id',
            'created_at',
        ];

        /*
         * Exact search first for better index usage.
         */
        $lead = Lead::query()
            ->select($columns)
            ->with('stage:id,name')
            ->where('created_by', $creatorId)
            ->whereIn('phone', $phoneVariants)
            ->first();

        if ($lead) {
            return $lead;
        }

        return Lead::query()
            ->select($columns)
            ->with('stage:id,name')
            ->where('created_by', $creatorId)
            ->where(function (Builder $query) use ($phoneVariants, $last10): void {
                $this->applyNormalizedPhoneSearch(
                    query: $query,
                    column: 'phone',
                    phoneVariants: $phoneVariants,
                    last10: $last10,
                );
            })
            ->first();
    }

    /**
     * Find a deal by phone number.
     */
    private function findDeal(
        int $creatorId,
        array $phoneVariants,
        string $last10,
    ): ?Deal {
        $columns = [
            'id',
            'name',
            'phone',
            'stage_id',
        ];

        /*
         * Exact search first for better index usage.
         */
        $deal = Deal::query()
            ->select($columns)
            ->with('stage:id,name')
            ->where('created_by', $creatorId)
            ->whereIn('phone', $phoneVariants)
            ->first();

        if ($deal) {
            return $deal;
        }

        return Deal::query()
            ->select($columns)
            ->with('stage:id,name')
            ->where('created_by', $creatorId)
            ->where(function (Builder $query) use ($phoneVariants, $last10): void {
                $this->applyNormalizedPhoneSearch(
                    query: $query,
                    column: 'phone',
                    phoneVariants: $phoneVariants,
                    last10: $last10,
                );
            })
            ->first();
    }

    /**
     * Search a formatted phone column using normalized values.
     */
    private function applyNormalizedPhoneSearch(
        Builder $query,
        string $column,
        array $phoneVariants,
        string $last10,
    ): void {
        $normalizedColumn = $this->normalizedSqlColumn($column);

        $normalizedVariants = array_values(
            array_unique(
                array_filter(
                    array_map(
                        fn($number): string => $this->normalizeNumber(
                            (string) $number,
                        ),
                        $phoneVariants,
                    ),
                ),
            ),
        );

        $query->where(function (Builder $phoneQuery) use ($normalizedColumn, $normalizedVariants, $last10): void {
            foreach ($normalizedVariants as $variant) {
                $phoneQuery->orWhereRaw(
                    "{$normalizedColumn} = ?",
                    [$variant],
                );
            }

            if (strlen($last10) === 10) {
                $phoneQuery->orWhereRaw(
                    "RIGHT({$normalizedColumn}, 10) = ?",
                    [$last10],
                );
            }
        });
    }

    /**
     * Generate supported Bangladeshi phone-number formats.
     */
    private function getPhoneVariants(string $digits): array
    {
        $variants = [$digits];

        /*
         * International format:
         * 8801733490080
         */
        if (
            str_starts_with($digits, '880') &&
            strlen($digits) === 13
        ) {
            $nationalNumber = substr($digits, 3);

            $variants[] = $nationalNumber;
            $variants[] = '0' . $nationalNumber;
            $variants[] = '+' . $digits;
        }

        /*
         * Local format:
         * 01733490080
         */
        if (
            str_starts_with($digits, '0') &&
            strlen($digits) === 11
        ) {
            $withoutZero = substr($digits, 1);

            $variants[] = $withoutZero;
            $variants[] = '880' . $withoutZero;
            $variants[] = '+880' . $withoutZero;
        }

        /*
         * National format without leading zero:
         * 1733490080
         */
        if (
            str_starts_with($digits, '1') &&
            strlen($digits) === 10
        ) {
            $variants[] = '0' . $digits;
            $variants[] = '880' . $digits;
            $variants[] = '+880' . $digits;
        }

        return array_values(
            array_unique(
                array_filter($variants),
            ),
        );
    }

    /**
     * User types that must not be returned by caller lookup.
     */
    private function excludedUserTypes(): array
    {
        return [
            'company',
            'super admin',
            'superadmin',
            'super-admin',
        ];
    }

    /**
     * Check whether a user type is excluded.
     */
    private function isExcludedUserType(?string $type): bool
    {
        $normalizedType = strtolower(
            trim((string) $type),
        );

        return in_array(
            $normalizedType,
            $this->excludedUserTypes(),
            true,
        );
    }

    /**
     * Generate a normalized SQL expression for phone searching.
     */
    private function normalizedSqlColumn(string $column): string
    {
        if (!in_array($column, ['mobile_no', 'phone'], true)) {
            throw new \InvalidArgumentException(
                'Invalid phone lookup column.',
            );
        }

        return "
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                REPLACE(
                                    COALESCE({$column}, ''),
                                    ' ',
                                    ''
                                ),
                                '-',
                                ''
                            ),
                            '(',
                            ''
                        ),
                        ')',
                        ''
                    ),
                    '+',
                    ''
                ),
                '.',
                ''
            )
        ";
    }

    /**
     * Remove every non-digit character from a number.
     */
    private function normalizeNumber(string $phone): string
    {
        return preg_replace('/\D+/', '', $phone) ?? '';
    }

    /**
     * Return a successful caller-lookup response.
     */
    private function foundResponse(array $match): JsonResponse
    {
        return response()->json([
            'found' => true,
            'type' => $match['type'],
            'id' => $match['id'],
            'name' => $match['name'],
            'phone' => $match['phone'] ?? null,
            'email' => $match['email'] ?? null,
            'organization' => $match['organization'] ?? null,
            'extra' => $match['extra'] ?? [],
        ]);
    }
}
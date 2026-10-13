<?php

namespace Automas\SupportTicket\Rules;

use Illuminate\Contracts\Validation\ValidationRule;
use Closure;

class ValidPhoneNumber implements ValidationRule
{
    /**
     * Country dial codes to regex pattern map.
     * Pattern matches the local number part after the dial code.
     */
    protected static array $countryPatterns = [
        '+880' => '/^0?1[3-9]\d{8}$/',             // Bangladesh (10 digits starting with 13-19, optional leading 0)
        '+91'  => '/^[6-9]\d{9}$/',                 // India (10 digits starting with 6-9)
        '+92'  => '/^3\d{9}$/',                     // Pakistan (10 digits starting with 3)
        '+1'   => '/^[2-9]\d{9}$/',                 // USA / Canada (10 digits starting with 2-9)
        '+44'  => '/^7\d{9}$/',                     // UK mobile (10 digits starting with 7)
        '+971' => '/^5[0-9]\d{7}$/',                // UAE (9 digits starting with 5)
        '+966' => '/^5\d{8}$/',                     // Saudi Arabia (9 digits starting with 5)
        '+974' => '/^[3567]\d{7}$/',                // Qatar (8 digits)
        '+965' => '/^[569]\d{7}$/',                 // Kuwait (8 digits)
        '+968' => '/^[79]\d{7}$/',                  // Oman (8 digits)
        '+973' => '/^[36]\d{7}$/',                  // Bahrain (8 digits)
        '+60'  => '/^1[0-9]\d{7,8}$/',              // Malaysia (9-10 digits)
        '+65'  => '/^[89]\d{7}$/',                  // Singapore (8 digits)
        '+61'  => '/^4\d{8}$/',                     // Australia (9 digits starting with 4)
        '+81'  => '/^[789]0\d{8}$/',                // Japan (10 digits)
        '+86'  => '/^1[3-9]\d{9}$/',                // China (11 digits)
        '+49'  => '/^1[567]\d{8,9}$/',              // Germany (10-11 digits)
        '+33'  => '/^[67]\d{8}$/',                  // France (9 digits)
        '+39'  => '/^3\d{9}$/',                     // Italy (10 digits)
    ];

    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (empty($value) || !is_string($value)) {
            $fail(__('The :attribute is required.'));
            return;
        }

        $trimmed = trim($value);

        // Normalize: if number doesn't start with +, but starts with 01[3-9] (standard BD local number)
        if (!str_starts_with($trimmed, '+')) {
            if (preg_match('/^01[3-9]\d{8}$/', $trimmed)) {
                return; // Valid BD local number
            }
            // General digits check
            if (!preg_match('/^\d{7,15}$/', $trimmed)) {
                $fail(__('Please enter a valid phone number.'));
                return;
            }
            return;
        }

        // It starts with +
        // Try to match with known country dial codes sorted by length descending (+880, +971, +91, +1, etc.)
        $matchedDial = null;
        $restNumber = '';

        // Sort dial codes by length descending so +880 matches before +88 (if any)
        $dialCodes = array_keys(static::$countryPatterns);
        usort($dialCodes, fn($a, $b) => strlen($b) - strlen($a));

        foreach ($dialCodes as $dial) {
            if (str_starts_with($trimmed, $dial)) {
                $matchedDial = $dial;
                $restNumber = substr($trimmed, strlen($dial));
                break;
            }
        }

        if ($matchedDial && isset(static::$countryPatterns[$matchedDial])) {
            $pattern = static::$countryPatterns[$matchedDial];
            if (!preg_match($pattern, $restNumber)) {
                $fail(__('Please enter a valid phone number for the selected country code (:dial).', ['dial' => $matchedDial]));
                return;
            }
            return;
        }

        // For any other country code not explicitly mapped in $countryPatterns,
        // enforce valid international E.164 phone format (+ followed by 7 to 15 digits)
        if (!preg_match('/^\+[1-9]\d{6,14}$/', $trimmed)) {
            $fail(__('Please enter a valid international phone number with country code.'));
            return;
        }
    }
}

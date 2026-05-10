<?php

declare(strict_types=1);

namespace App;

/**
 * Validadores de input para el flujo conversacional.
 * Usados por el Flow Engine para validar datos del prospecto.
 */
final class InputValidator
{
    /**
     * Valida que el input sea exactamente 10 dígitos numéricos.
     * Se eliminan TODOS los espacios (no solo trim) antes de validar.
     */
    public static function validateTelefono(string $input): bool
    {
        $stripped = preg_replace('/\s/', '', $input);
        return (bool) preg_match('/^\d{10}$/', $stripped);
    }

    /**
     * Valida que el input tenga formato de correo electrónico (usuario@dominio.ext).
     */
    public static function validateCorreo(string $input): bool
    {
        return (bool) preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $input);
    }

    /**
     * Valida que el input sea exactamente 5 dígitos numéricos.
     * Se hace trim antes de validar.
     */
    public static function validateCodigoPostal(string $input): bool
    {
        return (bool) preg_match('/^\d{5}$/', trim($input));
    }
}

<?php

declare(strict_types=1);

namespace App;

final class Seed
{
    private const array NOMBRES = [
        'Carlos', 'María', 'José', 'Ana', 'Luis', 'Guadalupe', 'Juan', 'Patricia',
        'Miguel', 'Rosa', 'Fernando', 'Claudia', 'Ricardo', 'Verónica', 'Alejandro',
        'Leticia', 'Roberto', 'Adriana', 'Francisco', 'Gabriela', 'Daniel', 'Silvia',
        'Jorge', 'Teresa', 'Eduardo', 'Laura', 'Arturo', 'Mónica', 'Sergio', 'Diana',
    ];

    private const array APELLIDOS = [
        'García', 'Hernández', 'López', 'Martínez', 'González', 'Rodríguez', 'Pérez',
        'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz',
        'Morales', 'Reyes', 'Gutiérrez', 'Ortiz', 'Ramos', 'Castillo', 'Mendoza',
        'Vargas', 'Chávez', 'Romero', 'Jiménez', 'Aguilar', 'Medina', 'Castro', 'Ruiz',
    ];

    private const array DOMINIOS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com.mx', 'prodigy.net.mx'];

    /**
     * Generate a single agent with optional fixed segmento and ramo.
     *
     * @return array<string, mixed>
     */
    public static function generateAgent(?string $segmento = null, ?string $ramo = null): array
    {
        $segmentos = array_keys(Constants::NSE_PRIMA_RANGES);

        $nombre = self::randomItem(self::NOMBRES);
        $apellidoPaterno = self::randomItem(self::APELLIDOS);
        $apellidoMaterno = self::randomItem(self::APELLIDOS);
        $nombreCompleto = "$nombre $apellidoPaterno $apellidoMaterno";

        $segmento = $segmento ?? self::randomItem($segmentos);
        $ramo = $ramo ?? self::randomItem(Constants::RAMOS);

        [$primaMin, $primaMax] = Constants::NSE_PRIMA_RANGES[$segmento];
        $prima = $primaMin + (mt_rand() / mt_getrandmax()) * ($primaMax - $primaMin);

        $nombreNorm = strtolower(self::removeDiacritics($nombre));
        $apellidoNorm = strtolower(self::removeDiacritics($apellidoPaterno));
        $correo = $nombreNorm . '.' . $apellidoNorm . mt_rand(0, 99) . '@' . self::randomItem(self::DOMINIOS);

        return [
            'id_agente' => self::randomAlphanumeric(10),
            'nombre_completo' => $nombreCompleto,
            'telefono' => '+52' . self::randomDigits(10),
            'correo' => $correo,
            'domicilio_estado' => self::randomItem(Constants::ESTADOS_MEXICO),
            'ramo_especialidad' => $ramo,
            'segmento_cartera' => $segmento,
            'prima_promedio_poliza' => round($prima * 100) / 100,
        ];
    }

    /**
     * Generate multiple agents ensuring coverage of all segmento×ramo combinations.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function generateAgents(int $count = 54): array
    {
        $agents = [];
        $segmentos = array_keys(Constants::NSE_PRIMA_RANGES);

        // Ensure coverage: one agent per (segmento, ramo) combination = 7 × 3 = 21
        foreach ($segmentos as $segmento) {
            foreach (Constants::RAMOS as $ramo) {
                $agents[] = self::generateAgent($segmento, $ramo);
            }
        }

        // Fill remaining slots randomly
        $remaining = max(0, $count - count($agents));
        for ($i = 0; $i < $remaining; $i++) {
            $agents[] = self::generateAgent();
        }

        return $agents;
    }

    /**
     * Remove diacritical marks from a string.
     */
    private static function removeDiacritics(string $str): string
    {
        $normalized = \Normalizer::normalize($str, \Normalizer::FORM_D);
        if ($normalized === false) {
            return $str;
        }
        return preg_replace('/[\x{0300}-\x{036f}]/u', '', $normalized);
    }

    /**
     * Pick a random item from an array.
     *
     * @template T
     * @param array<T> $arr
     * @return T
     */
    private static function randomItem(array $arr): mixed
    {
        return $arr[array_rand($arr)];
    }

    /**
     * Generate a random alphanumeric string of given length.
     */
    private static function randomAlphanumeric(int $length): string
    {
        $chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        $result = '';
        for ($i = 0; $i < $length; $i++) {
            $result .= $chars[mt_rand(0, strlen($chars) - 1)];
        }
        return $result;
    }

    /**
     * Generate a string of random digits of given length.
     */
    private static function randomDigits(int $length): string
    {
        $result = '';
        for ($i = 0; $i < $length; $i++) {
            $result .= (string) mt_rand(0, 9);
        }
        return $result;
    }
}

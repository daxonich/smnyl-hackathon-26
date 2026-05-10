<?php

declare(strict_types=1);

namespace App;

final class NSEClassifier
{
    /**
     * Classifies a monthly income into the corresponding NSE level.
     * Iterates NSE_TABLE from highest to lowest; returns the first level
     * where $income >= entry's ingresoMin.
     */
    public static function classify(int $income): string
    {
        foreach (Constants::NSE_TABLE as $entry) {
            if ($income >= $entry['ingresoMin']) {
                return $entry['nivel'];
            }
        }

        return 'E';
    }

    /**
     * Returns the expected prima range [primaMin, primaMax] for a given NSE level.
     *
     * @param string $nse The NSE level (e.g., 'A/B', 'C+', 'C', 'C−', 'D+', 'D', 'E')
     * @return array{0: int, 1: int} [primaMin, primaMax]
     * @throws \InvalidArgumentException If the NSE level is not found
     */
    public static function getPrimaRange(string $nse): array
    {
        if (!isset(Constants::NSE_PRIMA_RANGES[$nse])) {
            throw new \InvalidArgumentException("Nivel NSE no válido: {$nse}");
        }

        return Constants::NSE_PRIMA_RANGES[$nse];
    }
}

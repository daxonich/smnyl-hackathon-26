<?php

declare(strict_types=1);

namespace App;

final class AssignmentEngine
{
    /** Ordered NSE levels from highest to lowest */
    private const array NSE_LEVELS = ['A/B', 'C+', 'C', 'C−', 'D+', 'D', 'E'];

    /**
     * Main assignment function. Finds the best agent for a prospect profile.
     *
     * @param array $profile Prospect profile with keys: nombreCompleto, telefono, correo, estado, ciudad, colonia, codigoPostal, ingresoMensual, nse, ramoSeguro
     * @param array $agents Array of agent arrays with keys: id_agente, nombre_completo, telefono, correo, domicilio_estado, ramo_especialidad, segmento_cartera, prima_promedio_poliza
     * @return array|null Returns ['agent' => array, 'scores' => array, 'justification' => string] or null
     */
    public function assignAgent(array $profile, array $agents): ?array
    {
        $nse = $profile['nse'] ?? (
            isset($profile['ingresoMensual']) && $profile['ingresoMensual']
                ? NSEClassifier::classify($this->parseIncome($profile['ingresoMensual']))
                : null
        );

        // Phase 1: Filter by ramo (always required)
        $candidates = array_filter($agents, function (array $agent) use ($profile): bool {
            return $agent['ramo_especialidad'] === $profile['ramoSeguro'];
        });

        if (empty($candidates)) {
            return null;
        }

        // Phase 2: Score all candidates
        $scored = array_map(function (array $agent) use ($profile, $nse): array {
            return $this->calculateScore($agent, $profile, $nse);
        }, array_values($candidates));

        // Phase 3: Sort by total score descending, tiebreak by prima distance ascending
        usort($scored, function (array $a, array $b) use ($nse): int {
            if ($b['totalScore'] !== $a['totalScore']) {
                return $b['totalScore'] <=> $a['totalScore'];
            }
            return $this->primaDistance($a['agente'], $nse) <=> $this->primaDistance($b['agente'], $nse);
        });

        $best = $scored[0];

        // Phase 4: Generate justification
        $justification = $this->generateJustification($best, $profile);

        return [
            'agent' => $best['agente'],
            'scores' => $best,
            'justification' => $justification,
        ];
    }

    /**
     * Calculates the full score for an agent against a prospect profile.
     *
     * @param array $agent Agent array
     * @param array $profile Prospect profile array
     * @param string|null $nse NSE level
     * @return array Score breakdown
     */
    public function calculateScore(array $agent, array $profile, ?string $nse): array
    {
        $scoreEspecialidad = $agent['ramo_especialidad'] === $profile['ramoSeguro'] ? 1.0 : 0.0;
        $scoreSegmento = $this->calculateSegmentoScore($agent['segmento_cartera'], $nse);
        $scoreGeografia = strtolower($agent['domicilio_estado']) === strtolower($profile['estado']) ? 1.0 : 0.0;
        $scorePrima = $this->calculatePrimaScore($agent, $nse);

        $weights = Constants::DEFAULT_WEIGHTS;
        $totalScore =
            ($scoreEspecialidad * $weights['especialidad']) +
            ($scoreSegmento * $weights['segmento']) +
            ($scoreGeografia * $weights['geografia']);

        return [
            'agente' => $agent,
            'scoreEspecialidad' => $scoreEspecialidad,
            'scoreSegmento' => $scoreSegmento,
            'scoreGeografia' => $scoreGeografia,
            'scorePrima' => $scorePrima,
            'totalScore' => $totalScore,
        ];
    }

    /**
     * Calculates the segmento score based on NSE distance.
     * - Match exacto: 1.0
     * - 1 nivel de distancia: 0.7
     * - 2 niveles: 0.4
     * - 3+ niveles: 0.1
     */
    private function calculateSegmentoScore(string $agentSegmento, ?string $prospectNSE): float
    {
        if ($prospectNSE === null) {
            return 0.0;
        }

        $agentIdx = array_search($agentSegmento, self::NSE_LEVELS, true);
        $prospectIdx = array_search($prospectNSE, self::NSE_LEVELS, true);

        if ($agentIdx === false || $prospectIdx === false) {
            return 0.0;
        }

        $distance = abs($agentIdx - $prospectIdx);

        return match (true) {
            $distance === 0 => 1.0,
            $distance === 1 => 0.7,
            $distance === 2 => 0.4,
            default => 0.1,
        };
    }

    /**
     * Calculates the prima score: how close the agent's prima_promedio_poliza
     * is to the midpoint of the expected prima range for the prospect's NSE.
     * Returns a value between 0.0 and 1.0 (1.0 = exact match with midpoint).
     */
    private function calculatePrimaScore(array $agent, ?string $nse): float
    {
        if ($nse === null) {
            return 0.0;
        }

        if (!isset(Constants::NSE_PRIMA_RANGES[$nse])) {
            return 0.0;
        }

        [$primaMin, $primaMax] = Constants::NSE_PRIMA_RANGES[$nse];
        $midpoint = ($primaMin + $primaMax) / 2;
        $maxDistance = ($primaMax - $primaMin) / 2;

        if ($maxDistance === 0.0) {
            return 1.0;
        }

        $distance = abs($agent['prima_promedio_poliza'] - $midpoint);
        $score = max(0.0, 1.0 - $distance / $maxDistance);

        return $score;
    }

    /**
     * Calculates the absolute distance of an agent's prima to the NSE midpoint.
     * Used for tiebreaking.
     */
    private function primaDistance(array $agent, ?string $nse): float
    {
        if ($nse === null) {
            return PHP_FLOAT_MAX;
        }

        if (!isset(Constants::NSE_PRIMA_RANGES[$nse])) {
            return PHP_FLOAT_MAX;
        }

        [$primaMin, $primaMax] = Constants::NSE_PRIMA_RANGES[$nse];
        $midpoint = ($primaMin + $primaMax) / 2;

        return abs($agent['prima_promedio_poliza'] - $midpoint);
    }

    /**
     * Generates a human-readable justification text explaining why the agent was selected.
     */
    private function generateJustification(array $scores, array $profile): string
    {
        $reasons = [];

        if ($scores['scoreGeografia'] === 1.0) {
            $reasons[] = "comparte tu ubicación en {$profile['estado']}";
        }

        if ($scores['scoreSegmento'] >= 0.7) {
            $reasons[] = 'tiene experiencia con clientes de perfil similar al tuyo';
        } elseif ($scores['scoreSegmento'] >= 0.4) {
            $reasons[] = 'atiende clientes con un perfil cercano al tuyo';
        }

        if ($scores['scoreEspecialidad'] === 1.0) {
            $reasons[] = "es especialista en {$profile['ramoSeguro']}";
        }

        if (empty($reasons)) {
            return "{$scores['agente']['nombre_completo']} es especialista en {$profile['ramoSeguro']} y está disponible para atenderte.";
        }

        if (count($reasons) === 1) {
            $joined = $reasons[0];
        } else {
            $joined = implode(', ', array_slice($reasons, 0, -1)) . ', y ' . end($reasons);
        }

        return "Tu agente {$joined}.";
    }

    /**
     * Parses an income string like "$5,600-$15,100" or "$78,700 o más"
     * and returns the lower bound as a number.
     */
    private function parseIncome(string $incomeStr): int
    {
        $cleaned = str_replace(['$', ','], '', $incomeStr);
        if (preg_match('/(\d+)/', $cleaned, $matches)) {
            return (int) $matches[1];
        }
        return 0;
    }
}

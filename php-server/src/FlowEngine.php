<?php

declare(strict_types=1);

namespace App;

/**
 * Conversation state machine for the insurance agent assignment chatbot.
 * Pure logic — no database access, no side effects.
 */
final class FlowEngine
{
    /** @var string[] Income range options generated from NSE_TABLE */
    private const array INGRESO_OPTIONS = [
        '78,700 - o más',
        '41,200 - 78,700',
        '31,800 - 41,200',
        '21,500 - 31,800',
        '15,100 - 21,500',
        '5,600 - 15,100',
        '0 - 5,600',
    ];

    /** @var string[] Available ramo options */
    private const array RAMO_OPTIONS = ['VidaProtección', 'GMM', 'VidaAhorro'];

    /** @var array<string, string> Descriptions for each ramo */
    private const array RAMO_DESCRIPTIONS = [
        'VidaProtección' => 'Protege económicamente a tu familia ante cualquier eventualidad.',
        'GMM' => 'Cubre gastos médicos mayores para ti y tu familia.',
        'VidaAhorro' => 'Combina protección con un componente de ahorro para el futuro.',
    ];

    /** @var array<string, string> Maps Spanish field names to profile keys */
    private const array CORRECTION_FIELD_MAP = [
        'nombre' => 'nombreCompleto',
        'telefono' => 'telefono',
        'teléfono' => 'telefono',
        'correo' => 'correo',
        'email' => 'correo',
        'estado' => 'estado',
        'ciudad' => 'ciudad',
        'colonia' => 'colonia',
        'código postal' => 'codigoPostal',
        'codigo postal' => 'codigoPostal',
        'cp' => 'codigoPostal',
        'ingreso' => 'ingresoMensual',
        'ramo' => 'ramoSeguro',
    ];

    /**
     * Returns the initial welcome message for the chatbot.
     */
    public function getWelcomeMessage(): string
    {
        return '¡Hola! 👋 Soy tu asistente virtual de seguros. Estoy aquí para ayudarte a encontrar al agente de seguros ideal para ti. Para eso, necesito hacerte algunas preguntas sobre tus datos y necesidades. ¿Te gustaría comenzar?';
    }

    /**
     * Main flow engine: processes a user message given the current step and profile,
     * returning the next step, updated profile, response message, and optional options.
     *
     * @param ConversationStep $step Current conversation step
     * @param string $input User's message
     * @param array $profile Current prospect profile
     * @return array{message: string, step: ConversationStep, profile: array, options?: string[]}
     */
    public function processMessage(ConversationStep $step, string $input, array $profile): array
    {
        $trimmed = trim($input);
        $updatedProfile = $profile;

        switch ($step) {
            case ConversationStep::WELCOME:
                return [
                    'message' => '¡Perfecto! Comencemos. ¿Cuál es tu nombre completo?',
                    'step' => ConversationStep::NOMBRE,
                    'profile' => $updatedProfile,
                ];

            case ConversationStep::NOMBRE:
                if ($trimmed === '') {
                    return [
                        'message' => 'Necesito tu nombre completo para continuar. ¿Podrías proporcionármelo?',
                        'step' => ConversationStep::NOMBRE,
                        'profile' => $updatedProfile,
                    ];
                }
                $updatedProfile['nombreCompleto'] = $trimmed;
                return [
                    'message' => "Gracias, {$trimmed}. ¿Cuál es tu número de teléfono? (10 dígitos)",
                    'step' => ConversationStep::TELEFONO,
                    'profile' => $updatedProfile,
                ];

            case ConversationStep::TELEFONO:
                $cleaned = preg_replace('/\s/', '', $trimmed);
                if (!InputValidator::validateTelefono($cleaned)) {
                    return [
                        'message' => 'El número de teléfono debe tener exactamente 10 dígitos. Por favor, inténtalo de nuevo.',
                        'step' => ConversationStep::TELEFONO,
                        'profile' => $updatedProfile,
                    ];
                }
                $updatedProfile['telefono'] = $cleaned;
                return [
                    'message' => '¡Gracias! Ahora, ¿cuál es tu dirección de correo electrónico?',
                    'step' => ConversationStep::CORREO,
                    'profile' => $updatedProfile,
                ];

            case ConversationStep::CORREO:
                if (!InputValidator::validateCorreo($trimmed)) {
                    return [
                        'message' => 'El formato del correo no parece correcto. ¿Podrías verificarlo?',
                        'step' => ConversationStep::CORREO,
                        'profile' => $updatedProfile,
                    ];
                }
                $updatedProfile['correo'] = $trimmed;
                return [
                    'message' => '¿En qué estado de la República Mexicana resides?',
                    'step' => ConversationStep::ESTADO,
                    'profile' => $updatedProfile,
                ];

            case ConversationStep::ESTADO:
                $estado = $this->findEstado($trimmed);
                if ($estado === null) {
                    return [
                        'message' => 'No reconozco ese estado. Por favor, proporciona un estado válido de la República Mexicana.',
                        'step' => ConversationStep::ESTADO,
                        'profile' => $updatedProfile,
                    ];
                }
                $updatedProfile['estado'] = $estado;
                return [
                    'message' => "{$estado}, ¡excelente! ¿Cuál es tu ciudad o municipio?",
                    'step' => ConversationStep::CIUDAD,
                    'profile' => $updatedProfile,
                ];

            case ConversationStep::CIUDAD:
                if ($trimmed === '') {
                    return [
                        'message' => 'Necesito saber tu ciudad o municipio. ¿Podrías indicármelo?',
                        'step' => ConversationStep::CIUDAD,
                        'profile' => $updatedProfile,
                    ];
                }
                $updatedProfile['ciudad'] = $trimmed;
                return [
                    'message' => '¿Cuál es tu colonia y código postal? (formato: Colonia, 12345)',
                    'step' => ConversationStep::COLONIA_CP,
                    'profile' => $updatedProfile,
                ];

            case ConversationStep::COLONIA_CP:
                $parsed = $this->parseColoniaCP($trimmed);
                if ($parsed === null) {
                    return [
                        'message' => 'Por favor, proporciona tu colonia y código postal en el formato: Colonia, 12345',
                        'step' => ConversationStep::COLONIA_CP,
                        'profile' => $updatedProfile,
                    ];
                }
                [$colonia, $cp] = $parsed;
                if (!InputValidator::validateCodigoPostal($cp)) {
                    return [
                        'message' => 'El código postal debe tener exactamente 5 dígitos. Por favor, inténtalo de nuevo con el formato: Colonia, 12345',
                        'step' => ConversationStep::COLONIA_CP,
                        'profile' => $updatedProfile,
                    ];
                }
                $updatedProfile['colonia'] = $colonia;
                $updatedProfile['codigoPostal'] = $cp;
                return [
                    'message' => '¿Cuál es tu ingreso mensual aproximado? Selecciona una de las opciones, o escribe "no" si prefieres no proporcionarlo.',
                    'step' => ConversationStep::INGRESO,
                    'profile' => $updatedProfile,
                    'options' => self::INGRESO_OPTIONS,
                ];

            case ConversationStep::INGRESO:
                if ($this->isIngresoSkip($trimmed)) {
                    $updatedProfile['ingresoMensual'] = null;
                    $updatedProfile['nse'] = null;
                    $ramoMsg = $this->buildRamoMessage();
                    return [
                        'message' => 'Entendido, continuaremos sin ese dato. ' . $ramoMsg,
                        'step' => ConversationStep::RAMO,
                        'profile' => $updatedProfile,
                        'options' => self::RAMO_OPTIONS,
                    ];
                }
                $matched = $this->matchIngresoOption($trimmed);
                if ($matched === null) {
                    return [
                        'message' => 'No pude identificar el rango de ingreso. Por favor, selecciona una de las opciones proporcionadas.',
                        'step' => ConversationStep::INGRESO,
                        'profile' => $updatedProfile,
                        'options' => self::INGRESO_OPTIONS,
                    ];
                }
                $updatedProfile['ingresoMensual'] = $matched['rangeLabel'];
                $updatedProfile['nse'] = $matched['nse'];
                $ramoMsg = $this->buildRamoMessage();
                return [
                    'message' => '¡Gracias! ' . $ramoMsg,
                    'step' => ConversationStep::RAMO,
                    'profile' => $updatedProfile,
                    'options' => self::RAMO_OPTIONS,
                ];

            case ConversationStep::INGRESO_SKIP:
                $updatedProfile['ingresoMensual'] = null;
                $updatedProfile['nse'] = null;
                $ramoMsg = $this->buildRamoMessage();
                return [
                    'message' => $ramoMsg,
                    'step' => ConversationStep::RAMO,
                    'profile' => $updatedProfile,
                    'options' => self::RAMO_OPTIONS,
                ];

            case ConversationStep::RAMO:
                if ($this->isRamoUnknown($trimmed)) {
                    return [
                        'message' => "No te preocupes, te ayudo a identificarlo. ¿Cuál es tu principal preocupación?\n\n• Proteger a mi familia\n• Cubrir gastos médicos\n• Ahorrar para el futuro",
                        'step' => ConversationStep::RAMO_INFERIR,
                        'profile' => $updatedProfile,
                    ];
                }
                $ramo = $this->matchRamo($trimmed);
                if ($ramo === null) {
                    return [
                        'message' => 'No reconozco esa opción. Por favor, selecciona uno de los ramos disponibles: VidaProtección, GMM o VidaAhorro.',
                        'step' => ConversationStep::RAMO,
                        'profile' => $updatedProfile,
                        'options' => self::RAMO_OPTIONS,
                    ];
                }
                $updatedProfile['ramoSeguro'] = $ramo;
                $summary = $this->generateSummary($updatedProfile);
                return [
                    'message' => "{$summary}\n\n¿Los datos son correctos? Escribe \"sí\" para confirmar o indica qué dato deseas corregir.",
                    'step' => ConversationStep::RESUMEN,
                    'profile' => $updatedProfile,
                ];

            case ConversationStep::RAMO_INFERIR:
                $inferred = $this->inferRamo($trimmed);
                if ($inferred === null) {
                    return [
                        'message' => 'No pude identificar tu necesidad. ¿Podrías indicarme si te preocupa más proteger a tu familia, cubrir gastos médicos o ahorrar para el futuro?',
                        'step' => ConversationStep::RAMO_INFERIR,
                        'profile' => $updatedProfile,
                    ];
                }
                $updatedProfile['ramoSeguro'] = $inferred;
                $summary = $this->generateSummary($updatedProfile);
                return [
                    'message' => "Basándome en tu respuesta, te recomiendo *{$inferred}*.\n\n{$summary}\n\n¿Los datos son correctos? Escribe \"sí\" para confirmar o indica qué dato deseas corregir.",
                    'step' => ConversationStep::RESUMEN,
                    'profile' => $updatedProfile,
                ];

            case ConversationStep::RESUMEN:
                if ($this->isConfirmation($trimmed)) {
                    return [
                        'message' => '¡Perfecto! Buscando al agente ideal para ti...',
                        'step' => ConversationStep::ASIGNACION,
                        'profile' => $updatedProfile,
                    ];
                }
                if ($this->isCorrection($trimmed)) {
                    return [
                        'message' => '¿Qué dato deseas corregir? Escribe el campo y el nuevo valor, por ejemplo: "nombre: Juan Pérez"',
                        'step' => ConversationStep::CORRECCION,
                        'profile' => $updatedProfile,
                    ];
                }
                // Try to parse as a direct correction
                $directCorrection = $this->parseCorrection($trimmed, $updatedProfile);
                if ($directCorrection !== null) {
                    $updatedProfile[$directCorrection['field']] = $directCorrection['value'];
                    $summary = $this->generateSummary($updatedProfile);
                    return [
                        'message' => "Dato actualizado.\n\n{$summary}\n\n¿Los datos son correctos ahora?",
                        'step' => ConversationStep::RESUMEN,
                        'profile' => $updatedProfile,
                    ];
                }
                return [
                    'message' => 'Por favor, confirma tus datos escribiendo "sí" o indica qué dato deseas corregir.',
                    'step' => ConversationStep::RESUMEN,
                    'profile' => $updatedProfile,
                ];

            case ConversationStep::CORRECCION:
                $correction = $this->parseCorrection($trimmed, $updatedProfile);
                if ($correction === null) {
                    return [
                        'message' => 'No pude identificar el campo a corregir. Por favor, escribe el campo y el nuevo valor, por ejemplo: "nombre: Juan Pérez"',
                        'step' => ConversationStep::CORRECCION,
                        'profile' => $updatedProfile,
                    ];
                }
                $updatedProfile[$correction['field']] = $correction['value'];
                $summary = $this->generateSummary($updatedProfile);
                return [
                    'message' => "Dato actualizado.\n\n{$summary}\n\n¿Los datos son correctos ahora?",
                    'step' => ConversationStep::RESUMEN,
                    'profile' => $updatedProfile,
                ];

            // These steps are handled by the API layer, not the flow engine directly.
            case ConversationStep::ASIGNACION:
            case ConversationStep::RESULTADO:
            case ConversationStep::SIN_AGENTE:
            case ConversationStep::REASIGNACION:
            case ConversationStep::CIERRE:
                return [
                    'message' => '',
                    'step' => $step,
                    'profile' => $updatedProfile,
                ];

            default:
                return [
                    'message' => 'Ocurrió un error inesperado. Por favor, intenta de nuevo.',
                    'step' => $step,
                    'profile' => $updatedProfile,
                ];
        }
    }

    /**
     * Generates a readable summary of the prospect's profile data.
     */
    public function generateSummary(array $profile): string
    {
        $lines = ['📋 *Resumen de tus datos:*'];

        if (!empty($profile['nombreCompleto'])) {
            $lines[] = "• Nombre: {$profile['nombreCompleto']}";
        }
        if (!empty($profile['telefono'])) {
            $lines[] = "• Teléfono: {$profile['telefono']}";
        }
        if (!empty($profile['correo'])) {
            $lines[] = "• Correo: {$profile['correo']}";
        }
        if (!empty($profile['estado'])) {
            $lines[] = "• Estado: {$profile['estado']}";
        }
        if (!empty($profile['ciudad'])) {
            $lines[] = "• Ciudad: {$profile['ciudad']}";
        }
        if (!empty($profile['colonia'])) {
            $lines[] = "• Colonia: {$profile['colonia']}";
        }
        if (!empty($profile['codigoPostal'])) {
            $lines[] = "• Código Postal: {$profile['codigoPostal']}";
        }
        if (array_key_exists('ingresoMensual', $profile)) {
            $lines[] = '• Ingreso mensual: ' . ($profile['ingresoMensual'] ?? 'No proporcionado');
        }
        if (!empty($profile['ramoSeguro'])) {
            $lines[] = "• Tipo de seguro: {$profile['ramoSeguro']}";
        }

        return implode("\n", $lines);
    }

    /**
     * Finds the matching Mexican state from ESTADOS_MEXICO (case-insensitive).
     */
    private function findEstado(string $input): ?string
    {
        $normalized = mb_strtolower(trim($input));
        foreach (Constants::ESTADOS_MEXICO as $estado) {
            if (mb_strtolower($estado) === $normalized) {
                return $estado;
            }
        }
        return null;
    }

    /**
     * Parses "colonia, CP" format from user input.
     * Returns [colonia, codigoPostal] or null if parsing fails.
     */
    private function parseColoniaCP(string $input): ?array
    {
        $parts = array_map('trim', explode(',', $input));
        if (count($parts) >= 2) {
            $cp = array_pop($parts);
            $colonia = trim(implode(', ', $parts));
            if ($colonia !== '' && $cp !== '') {
                return [$colonia, $cp];
            }
        }
        return null;
    }

    /**
     * Checks if user input indicates they don't want to provide income.
     */
    private function isIngresoSkip(string $input): bool
    {
        $lower = mb_strtolower(trim($input));
        return $lower === 'no'
            || str_contains($lower, 'prefiero no')
            || str_contains($lower, 'no deseo')
            || str_contains($lower, 'no quiero')
            || str_contains($lower, 'omitir')
            || str_contains($lower, 'saltar');
    }

    /**
     * Checks if user input indicates they don't know which ramo to choose.
     */
    private function isRamoUnknown(string $input): bool
    {
        $lower = mb_strtolower(trim($input));
        return str_contains($lower, 'no sé')
            || str_contains($lower, 'no se')
            || str_contains($lower, 'no lo sé')
            || str_contains($lower, 'no estoy seguro')
            || str_contains($lower, 'no conozco');
    }

    /**
     * Infers the ramo from user's concerns about their needs.
     */
    private function inferRamo(string $input): ?string
    {
        $lower = mb_strtolower($input);

        if (str_contains($lower, 'familia') || str_contains($lower, 'proteger')
            || str_contains($lower, 'protección') || str_contains($lower, 'fallecimiento')) {
            return 'VidaProtección';
        }
        if (str_contains($lower, 'médico') || str_contains($lower, 'medico')
            || str_contains($lower, 'hospital') || str_contains($lower, 'salud')
            || str_contains($lower, 'gastos médicos') || str_contains($lower, 'enfermedad')) {
            return 'GMM';
        }
        if (str_contains($lower, 'ahorro') || str_contains($lower, 'ahorrar')
            || str_contains($lower, 'futuro') || str_contains($lower, 'inversión')
            || str_contains($lower, 'inversion') || str_contains($lower, 'retiro')) {
            return 'VidaAhorro';
        }

        return null;
    }

    /**
     * Matches an income option string to the NSE_TABLE entry.
     * Returns ['rangeLabel' => string, 'nse' => string] or null.
     */
    private function matchIngresoOption(string $input): ?array
    {
        $lower = strtolower(preg_replace('/[\s,$]/', '', $input));

        foreach (Constants::NSE_TABLE as $range) {
            $ingresoMin = $range['ingresoMin'];
            $ingresoMax = $range['ingresoMax'];

            $maxStr = ($ingresoMax === PHP_INT_MAX)
                ? 'o más'
                : number_format($ingresoMax, 0, '.', ',');
            $optionStr = number_format($ingresoMin, 0, '.', ',') . ' - ' . $maxStr;
            $optionLower = strtolower(preg_replace('/[\s,$]/', '', $optionStr));

            if ($lower === $optionLower || str_contains($lower, (string) $ingresoMin)) {
                $label = number_format($ingresoMin, 0, '.', ',') . ' - ' . $maxStr;
                $midpoint = ($ingresoMax === PHP_INT_MAX)
                    ? $ingresoMin
                    : (int) (($ingresoMin + $ingresoMax) / 2);
                return [
                    'rangeLabel' => $label,
                    'nse' => NSEClassifier::classify($midpoint),
                ];
            }
        }

        return null;
    }

    /**
     * Checks if user confirms (e.g., "sí", "confirmar", "correcto").
     */
    private function isConfirmation(string $input): bool
    {
        $lower = mb_strtolower(trim($input));
        return in_array($lower, [
            'sí', 'si', 'confirmar', 'confirmo', 'correcto', 'ok', 'está bien', 'esta bien', 'todo bien',
        ], true);
    }

    /**
     * Checks if user wants to correct something in the summary.
     */
    private function isCorrection(string $input): bool
    {
        $lower = mb_strtolower(trim($input));
        return $lower === 'no'
            || str_contains($lower, 'corregir')
            || str_contains($lower, 'cambiar')
            || str_contains($lower, 'modificar')
            || str_contains($lower, 'incorrecto')
            || str_contains($lower, 'mal');
    }

    /**
     * Parses a correction request to identify the field and new value.
     * Expected formats: "nombre: Juan Pérez" or "corregir nombre Juan Pérez"
     * Returns ['field' => string, 'value' => string] or null.
     */
    private function parseCorrection(string $input, array $profile): ?array
    {
        // Try "field: value" format
        if (preg_match('/^(.+?):\s*(.+)$/u', $input, $matches)) {
            $fieldKey = mb_strtolower(trim($matches[1]));
            $value = trim($matches[2]);
            if (isset(self::CORRECTION_FIELD_MAP[$fieldKey]) && $value !== '') {
                return [
                    'field' => self::CORRECTION_FIELD_MAP[$fieldKey],
                    'value' => $value,
                ];
            }
        }

        // Try to find a known field name in the input
        foreach (self::CORRECTION_FIELD_MAP as $keyword => $profileField) {
            if (str_contains(mb_strtolower($input), $keyword)) {
                // Extract value after the keyword
                $idx = mb_strpos(mb_strtolower($input), $keyword);
                $afterKeyword = mb_substr($input, $idx + mb_strlen($keyword));
                $afterKeyword = ltrim($afterKeyword, " \t\n\r\0\x0B:");
                $afterKeyword = trim($afterKeyword);
                if ($afterKeyword !== '') {
                    return [
                        'field' => $profileField,
                        'value' => $afterKeyword,
                    ];
                }
            }
        }

        return null;
    }

    /**
     * Matches a ramo option from user input.
     */
    private function matchRamo(string $input): ?string
    {
        $lower = mb_strtolower(trim($input));

        foreach (Constants::RAMOS as $ramo) {
            if ($lower === mb_strtolower($ramo) || str_contains($lower, mb_strtolower($ramo))) {
                return $ramo;
            }
        }

        // Also match partial/common names
        if (str_contains($lower, 'vida') && str_contains($lower, 'protec')) {
            return 'VidaProtección';
        }
        if (str_contains($lower, 'gmm') || str_contains($lower, 'gastos')
            || str_contains($lower, 'médicos') || str_contains($lower, 'medicos')) {
            return 'GMM';
        }
        if (str_contains($lower, 'vida') && str_contains($lower, 'ahorro')) {
            return 'VidaAhorro';
        }

        return null;
    }

    /**
     * Builds the ramo selection message with descriptions.
     */
    private function buildRamoMessage(): string
    {
        $lines = ["¿Qué tipo de seguro estás buscando?\n"];
        foreach (Constants::RAMOS as $ramo) {
            $lines[] = "• *{$ramo}*: " . self::RAMO_DESCRIPTIONS[$ramo];
        }
        return implode("\n", $lines);
    }
}

<?php
declare(strict_types=1);

error_log("XKS - REQUEST_URI: " . ($_SERVER['REQUEST_URI'] ?? 'NOT SET'));
error_log("XKS - REQUEST_METHOD: " . ($_SERVER['REQUEST_METHOD'] ?? 'NOT SET'));



// Load .env if it exists
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with($line, '#')) continue;
        putenv($line);
    }
}


require __DIR__ . '/../vendor/autoload.php';

use App\Router;
use App\Database;
use App\SessionManager;
use App\FlowEngine;
use App\AssignmentEngine;
use App\ConversationStep;
use function App\jsonResponse;
use function App\corsHeaders;
use function App\parseRequestBody;

try {
    $router = new Router();
    $sessionManager = new SessionManager();
    $flowEngine = new FlowEngine();
    $assignmentEngine = new AssignmentEngine();
    $db = Database::getInstance();

    // ─────────────────────────────────────────────────────────────────────────
    // POST /app/api/chat/start
    // ─────────────────────────────────────────────────────────────────────────
    $router->addRoute('POST', '/app/api/chat/start', function (array $params) use ($sessionManager, $flowEngine): void {
        $session = $sessionManager->create();

        jsonResponse([
            'sessionId' => $session['id'],
            'message' => $flowEngine->getWelcomeMessage(),
            'step' => ConversationStep::WELCOME->value,
        ]);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // POST /app/api/chat/message
    // ─────────────────────────────────────────────────────────────────────────
    $router->addRoute('POST', '/app/api/chat/message', function (array $params) use ($sessionManager, $flowEngine, $assignmentEngine, $db): void {
        $body = parseRequestBody();
        $sessionId = $body['sessionId'] ?? null;
        $text = $body['text'] ?? null;

        if (!$sessionId) {
            jsonResponse(['error' => 'Se requiere un ID de sesión.'], 400);
        }

        if (!array_key_exists('text', $body)) {
            jsonResponse(['error' => 'Se requiere un mensaje.'], 400);
        }

        // Check expired first (410), then not found (404)
        if ($sessionManager->isExpired($sessionId)) {
            jsonResponse(['error' => 'Tu sesión ha expirado. Inicia una nueva conversación.'], 410);
        }

        $session = $sessionManager->get($sessionId);
        if ($session === null) {
            jsonResponse(['error' => 'Sesión no encontrada. Inicia una nueva conversación.'], 404);
        }

        try {
            $step = $session['step'];
            $profile = $session['profile'];

            // ── ASIGNACION step ──────────────────────────────────────────────
            if ($step === ConversationStep::ASIGNACION->value) {
                handleAssignment($sessionId, $profile, $sessionManager, $assignmentEngine, $db);
                return;
            }

            // ── RESULTADO step ───────────────────────────────────────────────
            if ($step === ConversationStep::RESULTADO->value) {
                handleResultado($sessionId, (string) $text, $profile, $sessionManager, $assignmentEngine, $db);
                return;
            }

            // ── SIN_AGENTE step ──────────────────────────────────────────────
            if ($step === ConversationStep::SIN_AGENTE->value) {
                $sessionManager->update($sessionId, ['step' => ConversationStep::CIERRE->value]);
                jsonResponse([
                    'sessionId' => $sessionId,
                    'message' => 'Gracias por tu paciencia. Un coordinador se pondrá en contacto contigo pronto. ¡Que tengas un excelente día!',
                    'step' => ConversationStep::CIERRE->value,
                ]);
                return;
            }

            // ── CIERRE step ──────────────────────────────────────────────────
            if ($step === ConversationStep::CIERRE->value) {
                jsonResponse([
                    'sessionId' => $sessionId,
                    'message' => '¡Gracias por usar nuestro servicio! Si necesitas algo más, inicia una nueva conversación.',
                    'step' => ConversationStep::CIERRE->value,
                ]);
                return;
            }

            // ── Normal flow engine processing ────────────────────────────────
            $currentStep = ConversationStep::from($step);
            $flowResult = $flowEngine->processMessage($currentStep, (string) $text, $profile);

            $newStep = $flowResult['step'];
            $sessionManager->update($sessionId, [
                'step' => $newStep->value,
                'profile' => $flowResult['profile'],
            ]);

            // If flow engine moved to ASIGNACION, trigger assignment immediately
            if ($newStep === ConversationStep::ASIGNACION) {
                handleAssignment($sessionId, $flowResult['profile'], $sessionManager, $assignmentEngine, $db);
                return;
            }

            // Build response
            $response = [
                'sessionId' => $sessionId,
                'message' => $flowResult['message'],
                'step' => $newStep->value,
            ];

            if (!empty($flowResult['options'])) {
                $response['options'] = $flowResult['options'];
            }

            // Include summary when at RESUMEN step
            if ($newStep === ConversationStep::RESUMEN) {
                $response['summary'] = $flowResult['profile'];
            }

            jsonResponse($response);
        } catch (\PDOException $e) {
            error_log("Database error in /app/api/chat/message: " . $e->getMessage());
            jsonResponse(['error' => 'Nuestro sistema está temporalmente fuera de servicio.'], 503);
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // GET /app/api/chat/session/{id}
    // ─────────────────────────────────────────────────────────────────────────
    $router->addRoute('GET', '/app/api/chat/session/{id}', function (array $params) use ($sessionManager): void {
        $id = $params['id'];

        if ($sessionManager->isExpired($id)) {
            jsonResponse(['error' => 'Tu sesión ha expirado. Inicia una nueva conversación.'], 410);
        }

        $session = $sessionManager->get($id);
        if ($session === null) {
            jsonResponse(['error' => 'Sesión no encontrada. Inicia una nueva conversación.'], 404);
        }

        jsonResponse([
            'sessionId' => $session['id'],
            'step' => $session['step'],
            'profile' => $session['profile'],
        ]);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Dispatch the request
    // ─────────────────────────────────────────────────────────────────────────
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    $router->dispatch($method, $uri);

} catch (\Throwable $e) {
    error_log("Uncaught error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    jsonResponse(['error' => 'Nuestro sistema está temporalmente fuera de servicio.'], 503);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper functions for route handlers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handles the assignment logic when the profile is complete and confirmed.
 */
function handleAssignment(
    string $sessionId,
    array $profile,
    SessionManager $sessionManager,
    AssignmentEngine $assignmentEngine,
    Database $db,
): void {
    $agents = $db->getAgentsByRamo($profile['ramoSeguro']);
    $result = $assignmentEngine->assignAgent($profile, $agents);

    if ($result) {
        $prospectoId = $db->insertProspecto($profile);
        $db->insertAsignacion($prospectoId, $result['agent']['id_agente'], $result['scores'], $result['justification']);

        $sessionManager->update($sessionId, ['step' => ConversationStep::RESULTADO->value]);

        $response = [
            'sessionId' => $sessionId,
            'message' => "¡Encontramos al agente ideal para ti!\n\n" . $result['justification'],
            'step' => ConversationStep::RESULTADO->value,
            'agent' => $result['agent'],
            'justification' => $result['justification'],
        ];
        jsonResponse($response);
    } else {
        $sessionManager->update($sessionId, ['step' => ConversationStep::SIN_AGENTE->value]);

        jsonResponse([
            'sessionId' => $sessionId,
            'message' => 'No encontramos un agente especializado disponible en este momento. ¿Te gustaría dejar tus datos para que un coordinador te contacte?',
            'step' => ConversationStep::SIN_AGENTE->value,
        ]);
    }
}

/**
 * Handles the RESULTADO step: user accepts agent or requests reassignment.
 */
function handleResultado(
    string $sessionId,
    string $text,
    array $profile,
    SessionManager $sessionManager,
    AssignmentEngine $assignmentEngine,
    Database $db,
): void {
    $lower = mb_strtolower(trim($text));
    $acceptTerms = ['sí', 'si', 'acepto', 'ok', 'está bien', 'esta bien', 'confirmar', 'confirmo'];
    $isAccept = in_array($lower, $acceptTerms, true);

    if ($isAccept) {
        $sessionManager->update($sessionId, ['step' => ConversationStep::CIERRE->value]);
        jsonResponse([
            'sessionId' => $sessionId,
            'message' => '¡Excelente! Tu agente se pondrá en contacto contigo pronto. Gracias por confiar en nosotros. ¡Que tengas un excelente día!',
            'step' => ConversationStep::CIERRE->value,
        ]);
        return;
    }

    // User requests a different agent (REASIGNACION)
    $sessionManager->update($sessionId, ['step' => ConversationStep::REASIGNACION->value]);

    $agents = $db->getAgentsByRamo($profile['ramoSeguro']);
    $result = $assignmentEngine->assignAgent($profile, $agents);

    if ($result) {
        $sessionManager->update($sessionId, ['step' => ConversationStep::RESULTADO->value]);
        jsonResponse([
            'sessionId' => $sessionId,
            'message' => "Aquí tienes otra opción:\n\n" . $result['justification'],
            'step' => ConversationStep::RESULTADO->value,
            'agent' => $result['agent'],
            'justification' => $result['justification'],
        ]);
    } else {
        $sessionManager->update($sessionId, ['step' => ConversationStep::SIN_AGENTE->value]);
        jsonResponse([
            'sessionId' => $sessionId,
            'message' => 'No encontramos otro agente disponible en este momento. ¿Te gustaría dejar tus datos para que un coordinador te contacte?',
            'step' => ConversationStep::SIN_AGENTE->value,
        ]);
    }
}

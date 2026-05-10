<?php

declare(strict_types=1);

namespace App;

/**
 * Send a JSON response and terminate execution.
 *
 * @param array $data   The data to encode as JSON.
 * @param int   $status HTTP response code (default 200).
 */
function jsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    corsHeaders();
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Set CORS headers for cross-origin requests.
 */
function corsHeaders(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
}

/**
 * Parse the incoming JSON request body.
 *
 * @return array The decoded request body, or an empty array on failure.
 */
function parseRequestBody(): array
{
    $raw = file_get_contents('php://input');

    if ($raw === '' || $raw === false) {
        return [];
    }

    $decoded = json_decode($raw, true);

    if ($decoded === null) {
        return [];
    }

    return $decoded;
}

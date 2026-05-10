<?php

declare(strict_types=1);

namespace App;

final class Router
{
    private array $routes = [];

    public function addRoute(string $method, string $pattern, callable $handler): void
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'handler' => $handler,
        ];
    }

    public function dispatch(string $method, string $uri): void
    {
        $method = strtoupper($method);

        // Handle CORS preflight
        if ($method === 'OPTIONS') {
            corsHeaders();
            http_response_code(204);
            exit;
        }

        // Strip query string
        $path = parse_url($uri, PHP_URL_PATH);

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            $params = $this->matchPattern($route['pattern'], $path);
            if ($params !== null) {
                ($route['handler'])($params);
                return;
            }
        }

        // No route matched
        jsonResponse(['error' => 'Ruta no encontrada.'], 404);
    }

    private function matchPattern(string $pattern, string $path): ?array
    {
        // Convert {param} to named regex groups
        $regex = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $pattern);
        $regex = '#^' . $regex . '$#';

        if (preg_match($regex, $path, $matches)) {
            // Filter to only named captures
            return array_filter($matches, fn($key) => is_string($key), ARRAY_FILTER_USE_KEY);
        }

        return null;
    }
}

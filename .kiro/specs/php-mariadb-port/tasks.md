# Implementation Plan: PHP/MariaDB Port

## Overview

Port the existing Node.js/TypeScript/SQLite chat-based insurance agent assignment system to PHP 8.4/MariaDB 10.11/Nginx 1.22.1. The implementation follows a dependency-ordered approach: foundational modules first (constants, validators, NSE), then data layer (database, sessions), then business logic (flow engine, assignment engine), then routing/integration, and finally tests.

## Tasks

- [x] 1. Set up PHP project structure and dependencies
  - [x] 1.1 Create `php-server/composer.json` with project metadata and dependencies (phpunit/phpunit, giorgiosironi/eris)
    - Define autoload PSR-4 mapping: `"App\\": "src/"`
    - Include `ramsey/uuid` for UUID v4 generation
    - Set minimum PHP version to 8.4
    - _Requirements: 19.1_

  - [x] 1.2 Create `php-server/phpunit.xml` configuration file
    - Configure test directory as `tests/`
    - Set bootstrap to `vendor/autoload.php`
    - _Requirements: 19.1_

  - [x] 1.3 Create directory structure: `php-server/public/`, `php-server/src/`, `php-server/config/`, `php-server/scripts/`, `php-server/sql/`, `php-server/tests/`, `php-server/nginx/`
    - _Requirements: 19.1_

  - [x] 1.4 Run `composer install` to generate autoload files
    - _Requirements: 19.1_

- [x] 2. Implement Constants module
  - [x] 2.1 Create `php-server/src/Constants.php` with `ConversationStep` enum (backed string enum with all 17 cases) and `RamoSeguro` enum
    - Define NSE_TABLE as a class constant array with nivel, lectura, ingresoMin, ingresoMax, primaMin, primaMax
    - Define NSE_PRIMA_RANGES as associative array mapping NSE level to [primaMin, primaMax]
    - Define ESTADOS_MEXICO as array of 32 Mexican state names
    - Define RAMOS constant array
    - Define DEFAULT_WEIGHTS: especialidad=0.40, segmento=0.35, geografia=0.25
    - _Requirements: 19.2, 13.1_

- [x] 3. Implement InputValidator module
  - [x] 3.1 Create `php-server/src/InputValidator.php` with static validation methods
    - `validateTelefono(string $input): bool` — strips whitespace, checks exactly 10 digits
    - `validateCorreo(string $input): bool` — regex pattern matching `^[^\s@]+@[^\s@]+\.[^\s@]+$`
    - `validateCodigoPostal(string $input): bool` — trims, checks exactly 5 digits
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ]* 3.2 Write property tests for InputValidator (Properties 10, 11, 12)
    - **Property 10: Phone validator accepts exactly 10-digit strings**
    - **Property 11: Email validator accepts valid email format**
    - **Property 12: Postal code validator accepts exactly 5-digit strings**
    - **Validates: Requirements 12.1, 12.2, 12.3**

- [x] 4. Implement NSEClassifier module
  - [x] 4.1 Create `php-server/src/NSEClassifier.php` with static classification methods
    - `classify(int $income): string` — iterates NSE_TABLE from highest to lowest, returns first level where income ≥ ingresoMin
    - `getPrimaRange(string $nse): array` — returns [primaMin, primaMax] for given NSE level
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ]* 4.2 Write property tests for NSEClassifier (Properties 13, 14)
    - **Property 13: NSE classification correctness**
    - **Property 14: NSE classify-then-lookup round trip**
    - **Validates: Requirements 13.1, 13.2, 13.3**

- [x] 5. Implement Database module and MariaDB schema
  - [x] 5.1 Create `php-server/sql/schema.sql` with MariaDB DDL for all 4 tables (agentes, prospectos, asignaciones, sessions)
    - Include ENUM constraints, CHECK constraints, FOREIGN KEY constraints
    - Use InnoDB engine with utf8mb4 charset
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 5.2 Create `php-server/config/database.php` with environment-based connection parameters
    - Read DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS from environment variables with sensible defaults
    - _Requirements: 19.3_

  - [x] 5.3 Create `php-server/src/Database.php` singleton class
    - Implement `getInstance(): self` with lazy PDO initialization
    - Implement `getConnection(): PDO` returning the PDO instance
    - Implement `initSchema(): void` that executes schema.sql
    - Implement `getAgentsByRamo(string $ramo): array` with prepared statement
    - Implement `insertProspecto(array $profile): int` returning last insert ID
    - Implement `insertAsignacion(int $prospectoId, string $agenteId, array $scores, string $justificacion): int`
    - Implement `insertAgent(array $agent): void` for seeding
    - All queries use PDO prepared statements with named parameters
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 19.3_

- [x] 6. Implement SessionManager module
  - [x] 6.1 Create `php-server/src/SessionManager.php` with database-backed session management
    - Implement `create(): array` — generates UUID v4, inserts row with step=WELCOME, empty JSON profile
    - Implement `get(string $id): ?array` — returns null if not found or expired, refreshes last_activity
    - Implement `isExpired(string $id): bool` — checks if session exists but last_activity > 30 minutes
    - Implement `update(string $id, array $updates): ?array` — merges profile JSON, updates step and last_activity
    - Implement `cleanExpired(): int` — removes sessions inactive > 30 minutes
    - TTL constant: 1800 seconds
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 6.2 Write property test for SessionManager (Property 3)
    - **Property 3: Session expiration threshold**
    - **Validates: Requirements 6.2**

- [x] 7. Checkpoint - Ensure foundational modules work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement FlowEngine module
  - [x] 8.1 Create `php-server/src/FlowEngine.php` with conversation state machine
    - Implement `getWelcomeMessage(): string` returning the greeting
    - Implement `processMessage(ConversationStep $step, string $input, array $profile): array`
    - Implement `generateSummary(array $profile): string`
    - Handle all ConversationStep cases: WELCOME→NOMBRE→TELEFONO→CORREO→ESTADO→CIUDAD→COLONIA_CP→INGRESO→RAMO→RESUMEN→CORRECCION→ASIGNACION
    - Include RAMO_INFERIR logic for inferring insurance type from user concerns
    - Include income option matching and NSE classification
    - Include correction parsing (field:value format)
    - Include confirmation/rejection detection
    - Port all helper functions: findEstado, parseColoniaCP, isIngresoSkip, isRamoUnknown, inferRamo, matchIngresoOption, isConfirmation, isCorrection, parseCorrection, matchRamo
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4_

  - [ ]* 8.2 Write property tests for FlowEngine (Properties 4, 5, 6, 7, 8, 9)
    - **Property 4: Flow advances from WELCOME on any input**
    - **Property 5: Flow advances from NOMBRE/CIUDAD on non-empty input**
    - **Property 6: Flow advances from TELEFONO iff valid phone**
    - **Property 7: Flow advances from CORREO iff valid email**
    - **Property 8: Flow advances from ESTADO iff valid state**
    - **Property 9: Flow advances from COLONIA_CP iff valid format**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11**

- [x] 9. Implement AssignmentEngine module
  - [x] 9.1 Create `php-server/src/AssignmentEngine.php` with agent scoring and selection
    - Implement `assignAgent(array $profile, array $agents): ?array` — returns ['agent', 'scores', 'justification'] or null
    - Implement `calculateScore(array $agent, array $profile, ?string $nse): array` — returns score breakdown
    - Implement private helper `calculateSegmentoScore(string $agentSegmento, ?string $prospectNSE): float`
    - Implement private helper `calculatePrimaScore(array $agent, ?string $nse): float`
    - Implement private helper `primaDistance(array $agent, ?string $nse): float`
    - Implement private helper `generateJustification(array $scores, array $profile): string`
    - Filter candidates by ramo_especialidad, score all, sort by totalScore desc then prima distance asc
    - Return null if no candidates match ramo
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.2, 15.3, 15.4_

  - [ ]* 9.2 Write property tests for AssignmentEngine (Properties 15, 16, 17, 18)
    - **Property 15: Assignment scoring formula**
    - **Property 16: Assignment selects highest-scoring agent with prima tiebreaker**
    - **Property 17: Assignment returns null iff no ramo match**
    - **Property 18: Assignment justification is non-empty**
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.6, 15.1, 15.2, 15.3, 15.4**

- [x] 10. Implement seed script
  - [x] 10.1 Create `php-server/scripts/seed.php` to populate the agentes table
    - Generate at least 54 agents
    - Ensure coverage: one agent per (segmento × ramo) combination (7 × 3 = 21 minimum)
    - Generate valid prima_promedio_poliza within each agent's segmento range
    - Use random Mexican names, phone numbers, emails, states
    - Port the generateAgent() and generateAgents() logic from TypeScript seed.ts
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 10.2 Write property tests for seed generation (Properties 1, 2)
    - **Property 1: Seed coverage guarantees all ramo×segmento combinations**
    - **Property 2: Generated agents have valid prima within segmento range**
    - **Validates: Requirements 4.2, 4.3**

- [x] 11. Checkpoint - Ensure business logic modules work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement Router and helpers
  - [x] 12.1 Create `php-server/src/helpers.php` with utility functions
    - `jsonResponse(array $data, int $status = 200): void` — sets Content-Type, CORS headers, outputs JSON
    - `corsHeaders(): void` — sets Access-Control-Allow-Origin, Methods, Headers
    - `parseRequestBody(): array` — reads php://input and json_decodes
    - _Requirements: 17.4, 18.3, 20.1_

  - [x] 12.2 Create `php-server/src/Router.php` class
    - Implement `addRoute(string $method, string $pattern, callable $handler): void`
    - Implement `dispatch(string $method, string $uri): void`
    - Support named parameters in patterns (e.g., `/api/chat/session/{id}`)
    - Handle OPTIONS preflight with 204 + CORS headers
    - Return 404 JSON error for unmatched routes
    - _Requirements: 2.1, 20.2_

- [x] 13. Implement route handlers and front controller
  - [x] 13.1 Create `php-server/public/index.php` as the single entry point
    - Bootstrap: require autoload, load config, instantiate Database, Router
    - Register routes: POST /api/chat/start, POST /api/chat/message, GET /api/chat/session/{id}
    - Top-level try/catch for uncaught Throwable → 503 JSON response
    - Handle CORS preflight at router level
    - _Requirements: 5.1, 5.2, 7.1, 8.1, 17.1, 17.2, 17.3, 18.1, 18.2_

  - [x] 13.2 Implement POST `/api/chat/start` handler
    - Create session via SessionManager
    - Return JSON: sessionId, message (welcome), step
    - _Requirements: 5.1, 5.2, 5.3, 17.1_

  - [x] 13.3 Implement POST `/api/chat/message` handler
    - Validate sessionId and text presence (400 errors)
    - Check expired (410) then not found (404)
    - Process through FlowEngine for normal steps
    - Handle ASIGNACION step: run AssignmentEngine, persist prospect + assignment
    - Handle RESULTADO step: accept or reassign
    - Handle SIN_AGENTE step: advance to CIERRE
    - Handle CIERRE step: return closing message
    - Include options array when present, summary at RESUMEN step
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 15.5, 16.1, 16.2, 16.3, 16.4, 17.2_

  - [x] 13.4 Implement GET `/api/chat/session/{id}` handler
    - Check expired (410) then not found (404)
    - Return JSON: sessionId, step, profile
    - _Requirements: 8.1, 8.2, 8.3, 17.3_

- [x] 14. Create Nginx configuration
  - [x] 14.1 Create `php-server/nginx/site.conf` with server block
    - Serve static files from client/dist with SPA fallback (try_files → index.html)
    - Proxy /api/ requests to PHP-FPM via FastCGI socket
    - Pass required FastCGI params: SCRIPT_FILENAME, REQUEST_URI, REQUEST_METHOD, CONTENT_TYPE, CONTENT_LENGTH
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 15. Checkpoint - Ensure full integration works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Write PHPUnit unit tests
  - [ ]* 16.1 Create `php-server/tests/InputValidatorTest.php`
    - Test valid/invalid phone numbers (10 digits, with spaces, too short, too long, letters)
    - Test valid/invalid emails (standard format, missing @, missing domain)
    - Test valid/invalid postal codes (5 digits, too short, letters)
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ]* 16.2 Create `php-server/tests/NSEClassifierTest.php`
    - Test boundary values at each NSE threshold (78700, 41200, 31800, 21500, 15100, 5600, 0)
    - Test edge cases: income of 0, very large income
    - Test getPrimaRange returns valid tuples for all levels
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ]* 16.3 Create `php-server/tests/FlowEngineTest.php`
    - Test full conversation flow walkthrough (WELCOME through ASIGNACION)
    - Test validation error messages at each step
    - Test correction handling
    - Test ramo inference from user concerns
    - Test income skip path
    - _Requirements: 9.1–9.11, 10.1–10.5, 11.1–11.4_

  - [ ]* 16.4 Create `php-server/tests/AssignmentEngineTest.php`
    - Test scoring with known agents and expected scores
    - Test tiebreaker by prima distance
    - Test null return when no ramo match
    - Test justification contains agent name
    - _Requirements: 14.1–14.6, 15.1–15.4_

  - [ ]* 16.5 Create `php-server/tests/SessionManagerTest.php`
    - Test create/get/update lifecycle
    - Test expiration after 30 minutes
    - Test JSON profile persistence and merging
    - _Requirements: 6.1–6.5_

  - [ ]* 16.6 Create `php-server/tests/SeedTest.php`
    - Test seed produces at least 54 agents
    - Test all ramo×segmento combinations covered
    - Test prima values within valid ranges
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation language is PHP 8.4 as specified in the design document
- All database access uses PDO with prepared statements (no raw SQL interpolation)
- The existing React frontend (`client/dist/`) is served unchanged by Nginx

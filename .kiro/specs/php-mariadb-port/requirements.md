# Requirements Document

## Introduction

This document specifies the requirements for porting the existing chat-based intelligent insurance agent assignment system from Node.js/TypeScript/SQLite to PHP 8.4/MariaDB 10.11/Nginx 1.22.1. The port must maintain full feature parity with the existing application, preserving the same REST API contract so the existing React frontend can work with the new PHP backend without modification.

## Glossary

- **Chat_Backend**: The PHP 8.4 application that handles REST API requests, manages sessions, runs the conversation flow engine, and performs agent assignment logic.
- **MariaDB_Store**: The MariaDB 10.11 database that persists agents, prospects, and assignment records.
- **Nginx_Server**: The Nginx 1.22.1 web server that serves static frontend assets and proxies API requests to the PHP backend.
- **Flow_Engine**: The PHP module responsible for managing the multi-step conversational flow, validating inputs, and collecting prospect data.
- **Assignment_Engine**: The PHP module responsible for scoring and selecting the best insurance agent for a prospect based on weighted criteria.
- **Session_Manager**: The PHP module responsible for creating, retrieving, updating, and expiring chat sessions.
- **NSE_Classifier**: The PHP module that classifies a prospect's socioeconomic level (Nivel Socioeconómico) based on monthly income ranges.
- **Input_Validator**: The PHP module that validates prospect data fields (phone, email, postal code).
- **Prospect_Profile**: The data structure representing a prospect's collected personal information (name, phone, email, location, income, NSE, insurance type).
- **Agent**: A record representing an insurance agent with specialty, segment, location, and average premium.
- **Conversation_Step**: An enumerated value representing the current stage in the chat flow (WELCOME, NOMBRE, TELEFONO, CORREO, ESTADO, CIUDAD, COLONIA_CP, INGRESO, RAMO, RESUMEN, CORRECCION, ASIGNACION, RESULTADO, SIN_AGENTE, REASIGNACION, CIERRE).
- **NSE**: Nivel Socioeconómico — a classification of socioeconomic level (A/B, C+, C, C−, D+, D, E).
- **Ramo**: Insurance specialty type (VidaProtección, GMM, VidaAhorro).

## Requirements

### Requirement 1: Nginx Static Asset Serving

**User Story:** As a prospect, I want to access the chat interface through a web browser, so that I can interact with the insurance agent assignment system.

#### Acceptance Criteria

1. THE Nginx_Server SHALL serve the pre-built React frontend static files (HTML, CSS, JavaScript) from a configured document root directory.
2. WHEN a request path does not match a static file or an API route, THE Nginx_Server SHALL return the index.html file to support client-side routing.
3. WHEN a request path begins with `/api/`, THE Nginx_Server SHALL proxy the request to the Chat_Backend PHP application.

### Requirement 2: Nginx-to-PHP Proxying

**User Story:** As a frontend developer, I want API requests forwarded to the PHP backend transparently, so that the existing React client works without modification.

#### Acceptance Criteria

1. THE Nginx_Server SHALL forward all requests matching the path prefix `/api/` to the PHP-FPM process.
2. THE Nginx_Server SHALL pass the original request headers (Content-Type, Accept) to the Chat_Backend.
3. THE Nginx_Server SHALL return JSON responses from the Chat_Backend with the `Content-Type: application/json` header.

### Requirement 3: MariaDB Schema Creation

**User Story:** As a system administrator, I want the database schema created in MariaDB, so that the application can persist agents, prospects, and assignments.

#### Acceptance Criteria

1. THE MariaDB_Store SHALL contain an `agentes` table with columns: id_agente (VARCHAR(10) PRIMARY KEY), nombre_completo (VARCHAR(150) NOT NULL), telefono (VARCHAR(15) NOT NULL), correo (VARCHAR(255) NOT NULL), domicilio_estado (VARCHAR(100) NOT NULL), ramo_especialidad (ENUM('VidaProtección','GMM','VidaAhorro') NOT NULL), segmento_cartera (ENUM('A/B','C+','C','C−','D+','D','E') NOT NULL), prima_promedio_poliza (DECIMAL(12,2) NOT NULL CHECK between 12000 and 6000000).
2. THE MariaDB_Store SHALL contain a `prospectos` table with columns: id (INT AUTO_INCREMENT PRIMARY KEY), nombre_completo (VARCHAR(255) NOT NULL), telefono (VARCHAR(15) NOT NULL), correo (VARCHAR(255) NOT NULL), estado (VARCHAR(100) NOT NULL), ciudad (VARCHAR(255) NOT NULL), colonia (VARCHAR(255) NOT NULL), codigo_postal (CHAR(5) NOT NULL), ingreso_mensual (VARCHAR(100) NULL), nse (VARCHAR(10) NULL), ramo_seguro (VARCHAR(50) NOT NULL), created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP).
3. THE MariaDB_Store SHALL contain an `asignaciones` table with columns: id (INT AUTO_INCREMENT PRIMARY KEY), prospecto_id (INT NOT NULL FOREIGN KEY referencing prospectos.id), agente_id (VARCHAR(10) NOT NULL FOREIGN KEY referencing agentes.id_agente), score_total (DECIMAL(5,4) NOT NULL), score_especialidad (DECIMAL(5,4) NOT NULL), score_segmento (DECIMAL(5,4) NOT NULL), score_geografia (DECIMAL(5,4) NOT NULL), justificacion (TEXT NOT NULL), created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP).
4. THE MariaDB_Store SHALL contain a `sessions` table with columns: id (VARCHAR(36) PRIMARY KEY), step (VARCHAR(50) NOT NULL), profile (JSON NULL), created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP), last_activity (TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP).
5. THE MariaDB_Store SHALL enforce referential integrity between asignaciones.prospecto_id and prospectos.id.
6. THE MariaDB_Store SHALL enforce referential integrity between asignaciones.agente_id and agentes.id_agente.

### Requirement 4: Database Seeding

**User Story:** As a system administrator, I want to populate the agents table with test data, so that the assignment engine has agents to match against.

#### Acceptance Criteria

1. WHEN the seed script is executed, THE Chat_Backend SHALL insert at least 54 agent records into the agentes table.
2. THE Chat_Backend SHALL ensure at least one agent exists for each combination of ramo_especialidad and segmento_cartera (7 segments × 3 ramos = 21 minimum coverage records).
3. THE Chat_Backend SHALL generate agent records with valid prima_promedio_poliza values within the range defined by the agent's segmento_cartera.

### Requirement 5: Session Creation API

**User Story:** As a prospect, I want to start a new chat conversation, so that I can begin the agent assignment process.

#### Acceptance Criteria

1. WHEN a POST request is received at `/api/chat/start`, THE Chat_Backend SHALL create a new session with a unique UUID identifier, set the step to WELCOME, initialize an empty profile, and persist it to the sessions table in the MariaDB_Store.
2. WHEN a POST request is received at `/api/chat/start`, THE Chat_Backend SHALL return a JSON response containing sessionId, message (the welcome greeting), and step fields.
3. THE Chat_Backend SHALL store the session with a creation timestamp and last-activity timestamp in the MariaDB_Store.

### Requirement 6: Session Storage and Expiration

**User Story:** As a system operator, I want sessions stored in the database and inactive sessions to expire, so that session state survives process restarts and server resources are reclaimed.

#### Acceptance Criteria

1. THE Session_Manager SHALL store all session data (id, step, profile JSON, created_at, last_activity) in a `sessions` table in the MariaDB_Store.
2. WHILE a session has been inactive for more than 30 minutes, THE Session_Manager SHALL consider the session expired.
3. WHEN a request references an expired session, THE Chat_Backend SHALL return HTTP status 410 with an error message indicating the session has expired.
4. WHEN a request references a session ID that does not exist, THE Chat_Backend SHALL return HTTP status 404 with an error message indicating the session was not found.
5. WHEN a session is updated, THE Session_Manager SHALL persist the updated step, profile, and last_activity timestamp to the MariaDB_Store.

### Requirement 7: Message Processing API

**User Story:** As a prospect, I want to send messages in the chat, so that I can provide my information and progress through the conversation.

#### Acceptance Criteria

1. WHEN a POST request is received at `/api/chat/message` with a valid sessionId and text body, THE Chat_Backend SHALL process the message through the Flow_Engine and return the next step response.
2. IF the sessionId field is missing from the request body, THEN THE Chat_Backend SHALL return HTTP status 400 with an error message.
3. IF the text field is missing from the request body, THEN THE Chat_Backend SHALL return HTTP status 400 with an error message.
4. THE Chat_Backend SHALL update the session's last-activity timestamp on each successful message processing.
5. WHEN the response includes selectable options, THE Chat_Backend SHALL include an `options` array in the JSON response.
6. WHEN the conversation reaches the RESUMEN step, THE Chat_Backend SHALL include a `summary` object containing the full Prospect_Profile in the JSON response.

### Requirement 8: Session Retrieval API

**User Story:** As a prospect, I want to resume my conversation after a page reload, so that I do not lose my progress.

#### Acceptance Criteria

1. WHEN a GET request is received at `/api/chat/session/{id}`, THE Chat_Backend SHALL return the session's current step and profile data.
2. IF the session is expired, THEN THE Chat_Backend SHALL return HTTP status 410.
3. IF the session does not exist, THEN THE Chat_Backend SHALL return HTTP status 404.

### Requirement 9: Conversation Flow — Data Collection

**User Story:** As a prospect, I want to be guided through a structured conversation, so that I can provide all necessary information for agent matching.

#### Acceptance Criteria

1. WHEN the step is WELCOME and any message is received, THE Flow_Engine SHALL advance to NOMBRE and ask for the prospect's full name.
2. WHEN the step is NOMBRE and a non-empty name is provided, THE Flow_Engine SHALL store the name and advance to TELEFONO.
3. WHEN the step is TELEFONO and a valid 10-digit phone number is provided, THE Flow_Engine SHALL store the phone and advance to CORREO.
4. IF the phone number does not contain exactly 10 digits, THEN THE Flow_Engine SHALL remain at TELEFONO and return a validation error message.
5. WHEN the step is CORREO and a valid email format is provided, THE Flow_Engine SHALL store the email and advance to ESTADO.
6. IF the email format is invalid, THEN THE Flow_Engine SHALL remain at CORREO and return a validation error message.
7. WHEN the step is ESTADO and a valid Mexican state name is provided, THE Flow_Engine SHALL store the state and advance to CIUDAD.
8. IF the state name is not recognized, THEN THE Flow_Engine SHALL remain at ESTADO and return a validation error message.
9. WHEN the step is CIUDAD and a non-empty city name is provided, THE Flow_Engine SHALL store the city and advance to COLONIA_CP.
10. WHEN the step is COLONIA_CP and a valid "Colonia, 12345" format is provided with a 5-digit postal code, THE Flow_Engine SHALL store the colonia and postal code and advance to INGRESO.
11. IF the colonia/postal code format is invalid or the postal code is not 5 digits, THEN THE Flow_Engine SHALL remain at COLONIA_CP and return a validation error message.

### Requirement 10: Conversation Flow — Income and Insurance Type

**User Story:** As a prospect, I want to optionally provide my income and select an insurance type, so that the system can match me with an appropriate agent.

#### Acceptance Criteria

1. WHEN the step is INGRESO and the prospect selects a valid income range, THE Flow_Engine SHALL store the income range, classify the NSE using the NSE_Classifier, and advance to RAMO.
2. WHEN the step is INGRESO and the prospect declines to provide income, THE Flow_Engine SHALL set income and NSE to null and advance to RAMO.
3. WHEN the step is RAMO and a valid ramo is selected (VidaProtección, GMM, or VidaAhorro), THE Flow_Engine SHALL store the ramo and advance to RESUMEN.
4. WHEN the step is RAMO and the prospect indicates uncertainty, THE Flow_Engine SHALL advance to RAMO_INFERIR and ask about the prospect's primary concern.
5. WHEN the step is RAMO_INFERIR and the prospect describes a concern, THE Flow_Engine SHALL infer the appropriate ramo and advance to RESUMEN.

### Requirement 11: Conversation Flow — Summary and Confirmation

**User Story:** As a prospect, I want to review and correct my data before agent assignment, so that the matching is based on accurate information.

#### Acceptance Criteria

1. WHEN the step is RESUMEN and the prospect confirms the data, THE Flow_Engine SHALL advance to ASIGNACION.
2. WHEN the step is RESUMEN and the prospect requests a correction, THE Flow_Engine SHALL advance to CORRECCION.
3. WHEN the step is CORRECCION and a valid field:value correction is provided, THE Flow_Engine SHALL update the profile and return to RESUMEN with the updated summary.
4. IF the correction format cannot be parsed, THEN THE Flow_Engine SHALL remain at CORRECCION and ask for clarification.

### Requirement 12: Input Validation

**User Story:** As a system operator, I want prospect inputs validated, so that only well-formed data enters the system.

#### Acceptance Criteria

1. THE Input_Validator SHALL accept phone numbers containing exactly 10 numeric digits (whitespace stripped before validation).
2. THE Input_Validator SHALL accept email addresses matching the pattern: one or more non-whitespace non-@ characters, followed by @, followed by one or more non-whitespace non-@ characters, followed by a dot, followed by one or more non-whitespace non-@ characters.
3. THE Input_Validator SHALL accept postal codes containing exactly 5 numeric digits (whitespace trimmed before validation).

### Requirement 13: NSE Classification

**User Story:** As the system, I want to classify prospects by socioeconomic level, so that agent matching considers economic compatibility.

#### Acceptance Criteria

1. WHEN a monthly income value is provided, THE NSE_Classifier SHALL return the NSE level corresponding to the income range: A/B (≥78,700), C+ (41,200–78,699), C (31,800–41,199), C− (21,500–31,799), D+ (15,100–21,499), D (5,600–15,099), E (<5,600).
2. THE NSE_Classifier SHALL classify from highest to lowest, returning the first level where income ≥ ingresoMin.
3. FOR ALL valid income values, classifying the income and then looking up the prima range for the resulting NSE SHALL produce a valid prima range tuple.

### Requirement 14: Agent Scoring Algorithm

**User Story:** As the system, I want to score agents against a prospect profile, so that the best match is selected.

#### Acceptance Criteria

1. THE Assignment_Engine SHALL calculate a specialty score of 1.0 when the agent's ramo_especialidad matches the prospect's ramoSeguro, and 0.0 otherwise.
2. THE Assignment_Engine SHALL calculate a segment score based on NSE distance: 1.0 for exact match, 0.7 for 1 level distance, 0.4 for 2 levels distance, 0.1 for 3 or more levels distance.
3. THE Assignment_Engine SHALL calculate a geography score of 1.0 when the agent's domicilio_estado matches the prospect's estado (case-insensitive), and 0.0 otherwise.
4. THE Assignment_Engine SHALL calculate the total score as: (specialty × 0.40) + (segment × 0.35) + (geography × 0.25).
5. THE Assignment_Engine SHALL calculate a prima score measuring proximity of the agent's prima_promedio_poliza to the midpoint of the prospect's NSE prima range, normalized between 0.0 and 1.0.
6. WHEN multiple agents have the same total score, THE Assignment_Engine SHALL use prima distance (ascending) as a tiebreaker.

### Requirement 15: Agent Assignment with Relaxation

**User Story:** As a prospect, I want to be matched with the best available agent even if no perfect match exists, so that I always receive a recommendation when possible.

#### Acceptance Criteria

1. THE Assignment_Engine SHALL filter candidate agents by ramo_especialidad matching the prospect's ramoSeguro.
2. IF no agents match the required ramo_especialidad, THEN THE Assignment_Engine SHALL return null (no assignment possible).
3. WHEN candidates exist, THE Assignment_Engine SHALL score all candidates and select the one with the highest total score.
4. THE Assignment_Engine SHALL generate a human-readable justification explaining why the selected agent was chosen, referencing geography match, segment experience, and specialty.
5. WHEN an agent is successfully assigned, THE Chat_Backend SHALL persist the prospect record and assignment record to the MariaDB_Store.

### Requirement 16: Assignment Result Handling

**User Story:** As a prospect, I want to accept or request a different agent after seeing the assignment result, so that I have some control over the match.

#### Acceptance Criteria

1. WHEN the step is RESULTADO and the prospect accepts (confirms), THE Chat_Backend SHALL advance to CIERRE and display a closing message.
2. WHEN the step is RESULTADO and the prospect does not accept, THE Chat_Backend SHALL attempt reassignment by re-running the assignment algorithm.
3. WHEN no agent is available for assignment, THE Chat_Backend SHALL advance to SIN_AGENTE and offer to have a coordinator contact the prospect.
4. WHEN the step is SIN_AGENTE and the prospect responds, THE Chat_Backend SHALL advance to CIERRE with a closing message.

### Requirement 17: API Response Contract Compatibility

**User Story:** As a frontend developer, I want the PHP backend to return identical JSON response structures, so that the existing React frontend works without changes.

#### Acceptance Criteria

1. THE Chat_Backend SHALL return JSON responses for `/api/chat/start` containing: sessionId (string), message (string), step (string).
2. THE Chat_Backend SHALL return JSON responses for `/api/chat/message` containing: sessionId (string), message (string), step (string), and optionally: options (array of strings), summary (object), agent (object), justification (string).
3. THE Chat_Backend SHALL return JSON responses for `/api/chat/session/{id}` containing: sessionId (string), step (string), profile (object).
4. THE Chat_Backend SHALL use identical HTTP status codes as the existing Node.js backend: 200 for success, 400 for bad request, 404 for not found, 410 for expired, 503 for service unavailable.

### Requirement 18: Error Handling

**User Story:** As a prospect, I want graceful error messages when something goes wrong, so that I understand what happened and can try again.

#### Acceptance Criteria

1. IF an unexpected error occurs during message processing, THEN THE Chat_Backend SHALL return HTTP status 503 with a JSON error message indicating temporary unavailability.
2. IF a database operation fails, THEN THE Chat_Backend SHALL log the error and return HTTP status 503 to the client.
3. THE Chat_Backend SHALL return all error responses as JSON objects with an `error` field containing a user-friendly message in Spanish.

### Requirement 19: PHP Project Structure

**User Story:** As a developer, I want the PHP code organized in a maintainable structure, so that the codebase is easy to navigate and extend.

#### Acceptance Criteria

1. THE Chat_Backend SHALL organize source code into separate PHP files mirroring the logical modules: routing, flow engine, assignment engine, session management, NSE classification, input validation, database access, and constants.
2. THE Chat_Backend SHALL use PHP 8.4 features including typed properties, enums, match expressions, and named arguments where appropriate.
3. THE Chat_Backend SHALL use PDO with prepared statements for all database interactions to prevent SQL injection.

### Requirement 20: CORS Support

**User Story:** As a frontend developer, I want the API to handle cross-origin requests during development, so that the React dev server can communicate with the PHP backend.

#### Acceptance Criteria

1. THE Chat_Backend SHALL include appropriate CORS headers (Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers) in API responses.
2. WHEN an OPTIONS preflight request is received, THE Chat_Backend SHALL respond with HTTP status 204 and the appropriate CORS headers.

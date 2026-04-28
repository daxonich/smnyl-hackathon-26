# Plan de Implementación: Chat de Asignación Inteligente de Agentes

## Resumen

Implementación incremental de una aplicación web de chat conversacional (React + Express + TypeScript + SQLite) que perfila prospectos de seguros y los asigna al agente más adecuado mediante un motor de scoring ponderado. Cada tarea construye sobre las anteriores, integrando código progresivamente sin dejar componentes huérfanos.

## Tareas

- [x] 1. Inicializar estructura del proyecto y dependencias
  - Crear monorepo con dos carpetas: `client/` (React + Vite + TypeScript) y `server/` (Express + TypeScript)
  - Instalar dependencias del servidor: `express`, `better-sqlite3`, `uuid`, `cors` y sus tipos; `vitest`, `fast-check` como devDependencies
  - Instalar dependencias del cliente: `react`, `react-dom`, `vite`, `@vitejs/plugin-react` y sus tipos
  - Configurar `tsconfig.json` en ambos proyectos con `strict: true`
  - Configurar `vitest.config.ts` en el servidor
  - Crear script `dev` en ambos `package.json`
  - _Requerimientos: 1.1, 1.5_

- [x] 2. Definir modelos de datos, constantes NSE y base de datos
  - [x] 2.1 Crear interfaces TypeScript y constantes NSE
    - Crear `server/src/types.ts` con las interfaces: `ProspectProfile`, `Agent`, `AgentScore`, `AssignmentWeights`, `ChatSession`, `ChatResponse`, `NSERange`
    - Crear `server/src/constants.ts` con: enum `ConversationStep` (17 estados), tabla `NSE_TABLE`, mapa `NSE_PRIMA_RANGES`, array `ESTADOS_MEXICO` (32 estados), array `RAMOS`, pesos por defecto `DEFAULT_WEIGHTS`
    - _Requerimientos: 4.2, 8.1, 8.2_

  - [x] 2.2 Crear módulo de base de datos SQLite
    - Crear `server/src/database.ts` con función `initDatabase()` que cree las 3 tablas (`agentes`, `prospectos`, `asignaciones`) con sus restricciones CHECK según el diseño
    - Exportar funciones CRUD: `insertAgent`, `getAgentsByRamo`, `getAgentsByEstadoAndRamo`, `insertProspecto`, `insertAsignacion`
    - _Requerimientos: 8.1, 6.1_

  - [x] 2.3 Crear seed script para generar 50+ agentes
    - Crear `server/src/seed.ts` ejecutable con `ts-node`
    - Implementar generación de `id_agente` (10 chars alfanuméricos), `nombre_completo` (nombres y apellidos mexicanos), `telefono` (+52 + 10 dígitos), `correo`, `domicilio_estado` (estado real de México)
    - Distribuir agentes entre los 7 segmentos y 3 ramos, correlacionando `prima_promedio_poliza` con `segmento_cartera` según `NSE_PRIMA_RANGES`
    - Generar mínimo 50 registros
    - _Requerimientos: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 2.4 Escribir property tests para agentes generados (Propiedades 8 y 9)
    - **Propiedad 8: Agentes generados tienen campos válidos** — Verificar que cada agente tiene `id_agente` de 10 chars alfanuméricos, `telefono` con formato `+52` + 10 dígitos, `domicilio_estado` es un estado real, `ramo_especialidad` ∈ {VidaProtección, GMM, VidaAhorro}, `segmento_cartera` ∈ {A/B, C+, C, C−, D+, D, E}
    - **Valida: Requerimientos 8.1, 8.4, 8.5**
    - **Propiedad 9: Prima correlaciona con segmento** — Verificar que `prima_promedio_poliza` está dentro del rango definido para el `segmento_cartera` del agente
    - **Valida: Requerimiento 8.2**

- [x] 3. Implementar validadores y clasificación NSE
  - [x] 3.1 Crear módulo de validadores
    - Crear `server/src/validators.ts` con funciones: `validateTelefono` (exactamente 10 dígitos), `validateCorreo` (formato usuario@dominio.ext), `validateCodigoPostal` (5 dígitos)
    - _Requerimientos: 2.4, 2.5_

  - [x] 3.2 Crear función de clasificación NSE
    - Crear `server/src/nse.ts` con función `classifyNSE(ingreso: number): string` que mapee ingreso al nivel NSE según la tabla de referencia
    - Incluir función `getNSEPrimaRange(nse: string): [number, number]` para obtener el rango de prima esperado
    - _Requerimiento: 4.2_

  - [ ]* 3.3 Escribir property tests para validadores (Propiedades 1 y 12)
    - **Propiedad 1: Validación rechaza formatos inválidos** — Para cualquier cadena que no sea exactamente 10 dígitos, `validateTelefono` retorna false; para cualquier cadena sin formato correo, `validateCorreo` retorna false
    - **Valida: Requerimientos 2.4, 2.5**
    - **Propiedad 12: Input inválido mantiene el flujo en el mismo paso** — Para cualquier paso y cualquier input inválido, el estado no cambia
    - **Valida: Requerimiento 10.1**

  - [ ]* 3.4 Escribir property test para clasificación NSE (Propiedad 3)
    - **Propiedad 3: Clasificación NSE mapea ingreso al nivel correcto** — Para cualquier valor de ingreso ≥ 0, `classifyNSE` retorna el nivel correspondiente según los rangos de la tabla NSE
    - **Valida: Requerimiento 4.2**

- [x] 4. Checkpoint — Verificar que modelos, validadores y seed funcionan
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implementar el Flow Engine (máquina de estados conversacional)
  - [x] 5.1 Crear el motor de flujo conversacional
    - Crear `server/src/flow-engine.ts` con la máquina de estados que define las transiciones entre los 17 pasos del `ConversationStep`
    - Cada transición incluye: función `validate` (usa validadores del paso 3), función `extractData` (actualiza `ProspectProfile`), función `getMessage` (genera el texto de respuesta), y `options` opcionales (para pasos como INGRESO y RAMO)
    - Implementar lógica de RAMO_INFERIR para inferir ramo cuando el prospecto no sabe
    - Implementar lógica de CORRECCION para permitir editar un campo específico sin reiniciar el flujo
    - Implementar lógica de INGRESO_SKIP para continuar sin ingreso
    - _Requerimientos: 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 9.1, 9.2, 9.3, 9.4, 10.1_

  - [ ]* 5.2 Escribir property tests para el flujo conversacional (Propiedades 2 y 11)
    - **Propiedad 2: Input válido actualiza perfil correctamente** — Para cualquier paso y cualquier input válido, el campo correspondiente del perfil se actualiza y el flujo avanza
    - **Valida: Requerimientos 3.4, 5.3**
    - **Propiedad 11: Corrección preserva otros campos** — Para cualquier perfil completo y cualquier campo corregido, los demás campos permanecen sin cambios
    - **Valida: Requerimiento 9.4**

- [x] 6. Implementar el Motor de Asignación
  - [x] 6.1 Crear el motor de asignación con scoring ponderado
    - Crear `server/src/assignment-engine.ts` con función `assignAgent(profile, agents): AssignmentResult`
    - Implementar `calculateScore(agent, profile, nse)` con los tres criterios: especialidad (0.40, match binario), segmento (0.35, distancia NSE), geografía (0.25, match binario)
    - Implementar desempate por `prima_promedio_poliza` más cercana al punto medio del rango NSE
    - Implementar relajación de criterios: primero geografía, luego segmento, siempre mantener ramo
    - Implementar generación de texto de justificación mencionando criterios de afinidad
    - _Requerimientos: 6.1, 6.2, 6.3, 6.4, 7.2_

  - [ ]* 6.2 Escribir property tests para el motor de asignación (Propiedades 4, 5, 6 y 7)
    - **Propiedad 4: Scoring ponderado correcto** — Para cualquier perfil y conjunto de agentes, `totalScore = (scoreEspecialidad × 0.40) + (scoreSegmento × 0.35) + (scoreGeografia × 0.25)` y el agente seleccionado tiene el score más alto
    - **Valida: Requerimientos 6.1, 6.2**
    - **Propiedad 5: Desempate por prima** — Para agentes con score idéntico, se selecciona el de prima más cercana al punto medio del rango NSE
    - **Valida: Requerimiento 6.3**
    - **Propiedad 6: Ramo siempre coincide** — El agente asignado siempre tiene `ramo_especialidad` igual al tipo de seguro del prospecto
    - **Valida: Requerimiento 6.4**
    - **Propiedad 7: Respuesta contiene todos los datos requeridos** — La respuesta incluye nombre, teléfono, correo, ramo y justificación no vacía
    - **Valida: Requerimientos 7.1, 7.2**

- [x] 7. Checkpoint — Verificar flow engine y motor de asignación
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Crear API REST del backend
  - [x] 8.1 Implementar session manager y endpoints
    - Crear `server/src/session-manager.ts` con almacenamiento en memoria de `ChatSession`, TTL de 30 min, funciones `createSession`, `getSession`, `updateSession`, `cleanExpiredSessions`
    - Crear `server/src/routes.ts` con los 3 endpoints:
      - `POST /api/chat/start` — Crea sesión, retorna mensaje de bienvenida
      - `POST /api/chat/message` — Procesa mensaje del prospecto usando flow engine; cuando el perfil está completo y confirmado, invoca motor de asignación y guarda en BD
      - `GET /api/chat/session/:id` — Recupera estado de sesión para recargas de página
    - Crear `server/src/index.ts` como entry point con Express, cors, JSON body parser, inicialización de BD y montaje de rutas
    - _Requerimientos: 1.3, 1.4, 7.1, 7.3, 7.4, 10.2, 10.3, 10.4_

  - [ ]* 8.2 Escribir property test para sesiones (Propiedad 13)
    - **Propiedad 13: Round-trip de sesión** — Para cualquier sesión con paso y perfil parcial, `getSession(id)` retorna exactamente el mismo paso y perfil
    - **Valida: Requerimiento 10.4**

  - [ ]* 8.3 Escribir property test para resumen de perfil (Propiedad 10)
    - **Propiedad 10: Resumen contiene todos los campos** — Para cualquier perfil completo, el resumen incluye nombre, teléfono, correo, domicilio, ingreso (si proporcionado) y ramo
    - **Valida: Requerimiento 9.1**

- [x] 9. Checkpoint — Verificar API completa del backend
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implementar frontend React
  - [x] 10.1 Crear componentes base del chat
    - Crear `client/src/App.tsx` como layout principal que inicializa sesión llamando a `POST /api/chat/start`
    - Crear `client/src/components/ChatWindow.tsx` como contenedor del área de mensajes y barra de entrada
    - Crear `client/src/components/MessageList.tsx` que renderiza la lista de mensajes con scroll automático al último mensaje
    - Crear `client/src/components/MessageBubble.tsx` con alineación derecha (prospecto) e izquierda (sistema), diferenciadas visualmente con colores distintos
    - Crear `client/src/components/TypingIndicator.tsx` que muestra animación de "escribiendo..." antes de respuestas del sistema
    - _Requerimientos: 1.1, 1.2, 1.4_

  - [x] 10.2 Crear componentes de interacción y presentación
    - Crear `client/src/components/InputBar.tsx` con campo de texto y botón enviar
    - Crear `client/src/components/OptionSelector.tsx` con botones/chips para selección de opciones (rangos de ingreso, ramos de seguro)
    - Crear `client/src/components/AgentCard.tsx` que muestra tarjeta con datos del agente asignado (nombre, teléfono, correo, especialidad)
    - Crear `client/src/components/ProfileSummary.tsx` que muestra resumen de datos del prospecto para confirmación
    - _Requerimientos: 1.1, 4.1, 5.1, 7.1, 9.1_

  - [-] 10.3 Implementar lógica de comunicación con el backend
    - Crear `client/src/api.ts` con funciones: `startChat()`, `sendMessage(sessionId, text)`, `getSession(sessionId)` que llaman a los endpoints REST
    - Implementar retry automático (1 reintento) ante errores 503
    - Implementar almacenamiento de `sessionId` en `sessionStorage` para preservar estado ante recargas
    - Conectar el flujo completo: InputBar/OptionSelector → sendMessage → actualizar MessageList → mostrar TypingIndicator → mostrar respuesta
    - _Requerimientos: 1.4, 1.5, 10.2, 10.4_

  - [~] 10.4 Aplicar estilos responsivos
    - Crear estilos CSS para la interfaz de chat responsiva (desktop y móvil)
    - Estilizar burbujas de mensaje con colores diferenciados
    - Estilizar AgentCard y ProfileSummary como tarjetas visuales
    - Asegurar que el layout funcione en pantallas pequeñas (media queries)
    - _Requerimiento: 1.5_

- [ ] 11. Integración final y wiring
  - [~] 11.1 Configurar proxy de Vite y scripts de arranque
    - Configurar `vite.config.ts` con proxy de `/api` hacia el servidor Express
    - Crear script `dev` en raíz que arranque ambos servicios
    - Verificar flujo completo: frontend → backend → BD → respuesta
    - _Requerimientos: 1.1, 1.5_

  - [~] 11.2 Ejecutar seed script y verificar datos
    - Ejecutar el seed script para poblar la BD con 50+ agentes
    - Verificar que los datos generados cumplen las restricciones de la tabla
    - _Requerimientos: 8.1, 8.2, 8.3_

- [~] 12. Checkpoint final — Verificar que todos los tests pasan y la aplicación funciona
  - Ensure all tests pass, ask the user if questions arise.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requerimientos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los property tests validan propiedades universales de correctitud con fast-check (mínimo 100 iteraciones)
- Los unit tests validan ejemplos específicos y edge cases

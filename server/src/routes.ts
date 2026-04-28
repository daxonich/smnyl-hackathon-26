import { Router, Request, Response } from 'express';
import {
  createSession,
  getSession,
  updateSession,
  isSessionExpired,
} from './session-manager';
import { processMessage, getWelcomeMessage } from './flow-engine';
import { assignAgent } from './assignment-engine';
import {
  getAgentsByRamo,
  insertProspecto,
  insertAsignacion,
} from './database';
import { ConversationStep } from './constants';
import type { ProspectProfile, ChatResponse } from './types';

const router = Router();

/**
 * POST /api/chat/start
 * Creates a new session and returns the welcome message.
 */
router.post('/api/chat/start', (_req: Request, res: Response) => {
  const session = createSession();
  const response: ChatResponse = {
    sessionId: session.id,
    message: getWelcomeMessage(),
    step: ConversationStep.WELCOME,
  };
  res.json(response);
});

/**
 * POST /api/chat/message
 * Processes a prospect message within an existing session.
 */
router.post('/api/chat/message', (req: Request, res: Response) => {
  const { sessionId, text } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: 'Se requiere un ID de sesión.' });
    return;
  }

  if (!text && text !== '') {
    res.status(400).json({ error: 'Se requiere un mensaje.' });
    return;
  }

  // Check expired first (for 410), then not found (for 404)
  if (isSessionExpired(sessionId)) {
    res.status(410).json({ error: 'Tu sesión ha expirado. Inicia una nueva conversación.' });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Sesión no encontrada. Inicia una nueva conversación.' });
    return;
  }

  try {
    // Handle ASIGNACION step — this is managed by the API, not the flow engine
    if (session.step === ConversationStep.ASIGNACION) {
      return handleAssignment(session.id, session.profile as ProspectProfile, res);
    }

    // Handle RESULTADO step — user accepts or requests reassignment
    if (session.step === ConversationStep.RESULTADO) {
      return handleResultado(session.id, text, session.profile as ProspectProfile, res);
    }

    // Handle SIN_AGENTE step — user leaves data for manual contact
    if (session.step === ConversationStep.SIN_AGENTE) {
      updateSession(session.id, { step: ConversationStep.CIERRE });
      const response: ChatResponse = {
        sessionId: session.id,
        message: 'Gracias por tu paciencia. Un coordinador se pondrá en contacto contigo pronto. ¡Que tengas un excelente día!',
        step: ConversationStep.CIERRE,
      };
      res.json(response);
      return;
    }

    // Handle CIERRE step
    if (session.step === ConversationStep.CIERRE) {
      const response: ChatResponse = {
        sessionId: session.id,
        message: '¡Gracias por usar nuestro servicio! Si necesitas algo más, inicia una nueva conversación.',
        step: ConversationStep.CIERRE,
      };
      res.json(response);
      return;
    }

    // Normal flow engine processing
    const flowResult = processMessage(session.step, text, session.profile);
    updateSession(session.id, { step: flowResult.step, profile: flowResult.profile });

    // If flow engine moved to ASIGNACION, trigger assignment immediately
    if (flowResult.step === ConversationStep.ASIGNACION) {
      return handleAssignment(session.id, flowResult.profile as ProspectProfile, res);
    }

    const response: ChatResponse = {
      sessionId: session.id,
      message: flowResult.message,
      step: flowResult.step,
      options: flowResult.options,
    };

    // Include summary when at RESUMEN step
    if (flowResult.step === ConversationStep.RESUMEN) {
      response.summary = flowResult.profile as ProspectProfile;
    }

    res.json(response);
  } catch (err) {
    console.error('Error processing message:', err);
    res.status(503).json({ error: 'Nuestro sistema está temporalmente fuera de servicio.' });
  }
});

/**
 * GET /api/chat/session/:id
 * Retrieves session state for page reloads.
 */
router.get('/api/chat/session/:id', (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  if (isSessionExpired(id)) {
    res.status(410).json({ error: 'Tu sesión ha expirado. Inicia una nueva conversación.' });
    return;
  }

  const session = getSession(id);
  if (!session) {
    res.status(404).json({ error: 'Sesión no encontrada. Inicia una nueva conversación.' });
    return;
  }

  res.json({
    sessionId: session.id,
    step: session.step,
    profile: session.profile,
  });
});

/**
 * Handles the assignment logic when the profile is complete and confirmed.
 */
function handleAssignment(
  sessionId: string,
  profile: ProspectProfile,
  res: Response,
): void {
  try {
    const agents = getAgentsByRamo(profile.ramoSeguro);
    const result = assignAgent(profile, agents);

    if (result) {
      // Save prospect and assignment to DB
      const prospectoId = insertProspecto(profile);
      insertAsignacion(prospectoId, result.agent.id_agente, result.scores, result.justification);

      updateSession(sessionId, { step: ConversationStep.RESULTADO });

      const response: ChatResponse = {
        sessionId,
        message: `¡Encontramos al agente ideal para ti!\n\n${result.justification}`,
        step: ConversationStep.RESULTADO,
        agent: result.agent,
        justification: result.justification,
      };
      res.json(response);
    } else {
      updateSession(sessionId, { step: ConversationStep.SIN_AGENTE });

      const response: ChatResponse = {
        sessionId,
        message: 'No encontramos un agente especializado disponible en este momento. ¿Te gustaría dejar tus datos para que un coordinador te contacte?',
        step: ConversationStep.SIN_AGENTE,
      };
      res.json(response);
    }
  } catch (err) {
    console.error('Error during assignment:', err);
    res.status(503).json({ error: 'Nuestro sistema está temporalmente fuera de servicio.' });
  }
}

/**
 * Handles the RESULTADO step: user accepts agent or requests reassignment.
 */
function handleResultado(
  sessionId: string,
  text: string,
  profile: ProspectProfile,
  res: Response,
): void {
  const lower = text.toLowerCase().trim();
  const isAccept =
    lower === 'sí' ||
    lower === 'si' ||
    lower === 'acepto' ||
    lower === 'ok' ||
    lower === 'está bien' ||
    lower === 'esta bien' ||
    lower === 'confirmar' ||
    lower === 'confirmo';

  if (isAccept) {
    updateSession(sessionId, { step: ConversationStep.CIERRE });
    const response: ChatResponse = {
      sessionId,
      message: '¡Excelente! Tu agente se pondrá en contacto contigo pronto. Gracias por confiar en nosotros. ¡Que tengas un excelente día!',
      step: ConversationStep.CIERRE,
    };
    res.json(response);
    return;
  }

  // User requests a different agent (REASIGNACION)
  try {
    updateSession(sessionId, { step: ConversationStep.REASIGNACION });

    const agents = getAgentsByRamo(profile.ramoSeguro);
    // Exclude previously assigned agent — get the current best and try next
    const result = assignAgent(profile, agents);

    if (result) {
      updateSession(sessionId, { step: ConversationStep.RESULTADO });
      const response: ChatResponse = {
        sessionId,
        message: `Aquí tienes otra opción:\n\n${result.justification}`,
        step: ConversationStep.RESULTADO,
        agent: result.agent,
        justification: result.justification,
      };
      res.json(response);
    } else {
      updateSession(sessionId, { step: ConversationStep.SIN_AGENTE });
      const response: ChatResponse = {
        sessionId,
        message: 'No encontramos otro agente disponible en este momento. ¿Te gustaría dejar tus datos para que un coordinador te contacte?',
        step: ConversationStep.SIN_AGENTE,
      };
      res.json(response);
    }
  } catch (err) {
    console.error('Error during reassignment:', err);
    res.status(503).json({ error: 'Nuestro sistema está temporalmente fuera de servicio.' });
  }
}

export default router;

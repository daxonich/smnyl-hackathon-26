import { Message } from '../types';
import AgentCard from './AgentCard';
import ProfileSummary from './ProfileSummary';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.sender === 'user';

  const bubbleClass = `message-bubble ${isUser ? 'message-bubble--user' : 'message-bubble--system'}`;

  const agent = message.agent as {
    nombre_completo: string;
    telefono: string;
    correo: string;
    ramo_especialidad: string;
    justification?: string;
  } | undefined;

  const summary = message.summary as {
    nombreCompleto: string;
    telefono: string;
    correo: string;
    estado: string;
    ciudad: string;
    colonia: string;
    codigoPostal: string;
    ingresoMensual: string | null;
    ramoSeguro: string;
  } | undefined;

  return (
    <div className={bubbleClass}>
      <p>{message.text}</p>

      {agent && (
        <AgentCard
          agent={agent}
          justification={agent.justification}
        />
      )}

      {summary && <ProfileSummary profile={summary} />}
    </div>
  );
}

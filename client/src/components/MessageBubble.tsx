import { Message } from '../types';
import AgentCard from './AgentCard';
import ProfileSummary from './ProfileSummary';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.sender === 'user';

  const bubbleStyle: React.CSSProperties = {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: '12px',
    marginBottom: '8px',
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    backgroundColor: isUser ? '#0d9488' : '#f3f4f6',
    color: isUser ? '#ffffff' : '#1f2937',
    wordBreak: 'break-word',
  };

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
    <div style={bubbleStyle}>
      <p style={{ margin: 0, lineHeight: 1.5 }}>{message.text}</p>

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

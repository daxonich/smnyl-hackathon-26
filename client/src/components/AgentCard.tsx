interface AgentCardProps {
  agent: {
    nombre_completo: string;
    telefono: string;
    correo: string;
    ramo_especialidad: string;
  };
  justification?: string;
}

export default function AgentCard({ agent, justification }: AgentCardProps) {
  return (
    <div className="card">
      <h3 className="card__title">🧑‍💼 Agente Asignado</h3>

      <div className="card__fields">
        <div>
          <span className="card__label">Nombre: </span>
          <span className="card__value">{agent.nombre_completo}</span>
        </div>
        <div>
          <span className="card__label">Teléfono: </span>
          <a href={`tel:${agent.telefono}`} className="card__link">
            {agent.telefono}
          </a>
        </div>
        <div>
          <span className="card__label">Correo: </span>
          <a href={`mailto:${agent.correo}`} className="card__link">
            {agent.correo}
          </a>
        </div>
        <div>
          <span className="card__label">Especialidad: </span>
          <span className="card__value">{agent.ramo_especialidad}</span>
        </div>
      </div>

      {justification && (
        <p className="card__justification">{justification}</p>
      )}
    </div>
  );
}

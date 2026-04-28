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
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        marginTop: '8px',
        maxWidth: '100%',
      }}
    >
      <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#111827' }}>
        🧑‍💼 Agente Asignado
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
        <div>
          <span style={{ color: '#6b7280' }}>Nombre: </span>
          <span style={{ color: '#111827', fontWeight: 500 }}>{agent.nombre_completo}</span>
        </div>
        <div>
          <span style={{ color: '#6b7280' }}>Teléfono: </span>
          <a href={`tel:${agent.telefono}`} style={{ color: '#0d9488', textDecoration: 'none' }}>
            {agent.telefono}
          </a>
        </div>
        <div>
          <span style={{ color: '#6b7280' }}>Correo: </span>
          <a href={`mailto:${agent.correo}`} style={{ color: '#0d9488', textDecoration: 'none' }}>
            {agent.correo}
          </a>
        </div>
        <div>
          <span style={{ color: '#6b7280' }}>Especialidad: </span>
          <span style={{ color: '#111827' }}>{agent.ramo_especialidad}</span>
        </div>
      </div>

      {justification && (
        <p
          style={{
            marginTop: '12px',
            marginBottom: 0,
            padding: '10px',
            backgroundColor: '#f0fdfa',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#374151',
            lineHeight: 1.5,
          }}
        >
          {justification}
        </p>
      )}
    </div>
  );
}

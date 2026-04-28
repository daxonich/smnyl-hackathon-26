interface ProfileSummaryProps {
  profile: {
    nombreCompleto: string;
    telefono: string;
    correo: string;
    estado: string;
    ciudad: string;
    colonia: string;
    codigoPostal: string;
    ingresoMensual: string | null;
    ramoSeguro: string;
  };
}

export default function ProfileSummary({ profile }: ProfileSummaryProps) {
  const fields = [
    { label: 'Nombre', value: profile.nombreCompleto },
    { label: 'Teléfono', value: profile.telefono },
    { label: 'Correo', value: profile.correo },
    { label: 'Estado', value: profile.estado },
    { label: 'Ciudad', value: profile.ciudad },
    { label: 'Colonia', value: profile.colonia },
    { label: 'Código Postal', value: profile.codigoPostal },
    { label: 'Ingreso Mensual', value: profile.ingresoMensual ?? 'No proporcionado' },
    { label: 'Ramo de Seguro', value: profile.ramoSeguro },
  ];

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
        📋 Resumen de tu Perfil
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
        {fields.map(({ label, value }) => (
          <div key={label}>
            <span style={{ color: '#6b7280' }}>{label}: </span>
            <span style={{ color: '#111827', fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

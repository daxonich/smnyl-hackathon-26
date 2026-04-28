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
    <div className="card">
      <h3 className="card__title">📋 Resumen de tu Perfil</h3>

      <div className="card__fields">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <span className="card__label">{label}: </span>
            <span className="card__value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

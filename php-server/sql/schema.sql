-- MariaDB schema for Asignación de Agentes application
-- Requires: MariaDB 10.5+ (for JSON column type support)

CREATE TABLE IF NOT EXISTS agentes (
    id_agente VARCHAR(10) PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    correo VARCHAR(255) NOT NULL,
    domicilio_estado VARCHAR(100) NOT NULL,
    ramo_especialidad ENUM('VidaProtección','GMM','VidaAhorro') NOT NULL,
    segmento_cartera ENUM('A/B','C+','C','C−','D+','D','E') NOT NULL,
    prima_promedio_poliza DECIMAL(12,2) NOT NULL,
    CONSTRAINT chk_prima CHECK (prima_promedio_poliza BETWEEN 12000 AND 6000000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prospectos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    correo VARCHAR(255) NOT NULL,
    estado VARCHAR(100) NOT NULL,
    ciudad VARCHAR(255) NOT NULL,
    colonia VARCHAR(255) NOT NULL,
    codigo_postal CHAR(5) NOT NULL,
    ingreso_mensual VARCHAR(100) NULL,
    nse VARCHAR(10) NULL,
    ramo_seguro VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asignaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prospecto_id INT NOT NULL,
    agente_id VARCHAR(10) NOT NULL,
    score_total DECIMAL(5,4) NOT NULL,
    score_especialidad DECIMAL(5,4) NOT NULL,
    score_segmento DECIMAL(5,4) NOT NULL,
    score_geografia DECIMAL(5,4) NOT NULL,
    justificacion TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prospecto_id) REFERENCES prospectos(id),
    FOREIGN KEY (agente_id) REFERENCES agentes(id_agente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    step VARCHAR(50) NOT NULL,
    profile JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

<?php

declare(strict_types=1);

namespace App;

use PDO;
use PDOException;

final class Database
{
    private static ?self $instance = null;
    private ?PDO $pdo = null;

    private function __construct()
    {
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection(): PDO
    {
        if ($this->pdo === null) {
            $config = require __DIR__ . '/../config/database.php';

            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                $config['host'],
                $config['port'],
                $config['name']
            );

            $this->pdo = new PDO($dsn, $config['user'], $config['pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }

        return $this->pdo;
    }

    public function initSchema(): void
    {
        $schemaPath = __DIR__ . '/../sql/schema.sql';
        $sql = file_get_contents($schemaPath);
        $this->getConnection()->exec($sql);
    }

    public function getAgentsByRamo(string $ramo): array
    {
        $stmt = $this->getConnection()->prepare(
            'SELECT * FROM agentes WHERE ramo_especialidad = :ramo'
        );
        $stmt->execute([':ramo' => $ramo]);

        return $stmt->fetchAll();
    }

    public function insertProspecto(array $profile): int
    {
        $stmt = $this->getConnection()->prepare(
            'INSERT INTO prospectos (nombre_completo, telefono, correo, estado, ciudad, colonia, codigo_postal, ingreso_mensual, nse, ramo_seguro)
             VALUES (:nombreCompleto, :telefono, :correo, :estado, :ciudad, :colonia, :codigoPostal, :ingresoMensual, :nse, :ramoSeguro)'
        );
        $stmt->execute([
            ':nombreCompleto' => $profile['nombreCompleto'],
            ':telefono' => $profile['telefono'],
            ':correo' => $profile['correo'],
            ':estado' => $profile['estado'],
            ':ciudad' => $profile['ciudad'],
            ':colonia' => $profile['colonia'],
            ':codigoPostal' => $profile['codigoPostal'],
            ':ingresoMensual' => $profile['ingresoMensual'] ?? null,
            ':nse' => $profile['nse'] ?? null,
            ':ramoSeguro' => $profile['ramoSeguro'],
        ]);

        return (int) $this->getConnection()->lastInsertId();
    }

    public function insertAsignacion(int $prospectoId, string $agenteId, array $scores, string $justificacion): int
    {
        $stmt = $this->getConnection()->prepare(
            'INSERT INTO asignaciones (prospecto_id, agente_id, score_total, score_especialidad, score_segmento, score_geografia, justificacion)
             VALUES (:prospecto_id, :agente_id, :score_total, :score_especialidad, :score_segmento, :score_geografia, :justificacion)'
        );
        $stmt->execute([
            ':prospecto_id' => $prospectoId,
            ':agente_id' => $agenteId,
            ':score_total' => $scores['totalScore'],
            ':score_especialidad' => $scores['scoreEspecialidad'],
            ':score_segmento' => $scores['scoreSegmento'],
            ':score_geografia' => $scores['scoreGeografia'],
            ':justificacion' => $justificacion,
        ]);

        return (int) $this->getConnection()->lastInsertId();
    }

    public function insertAgent(array $agent): void
    {
        $stmt = $this->getConnection()->prepare(
            'INSERT INTO agentes (id_agente, nombre_completo, telefono, correo, domicilio_estado, ramo_especialidad, segmento_cartera, prima_promedio_poliza)
             VALUES (:id_agente, :nombre_completo, :telefono, :correo, :domicilio_estado, :ramo_especialidad, :segmento_cartera, :prima_promedio_poliza)'
        );
        $stmt->execute([
            ':id_agente' => $agent['id_agente'],
            ':nombre_completo' => $agent['nombre_completo'],
            ':telefono' => $agent['telefono'],
            ':correo' => $agent['correo'],
            ':domicilio_estado' => $agent['domicilio_estado'],
            ':ramo_especialidad' => $agent['ramo_especialidad'],
            ':segmento_cartera' => $agent['segmento_cartera'],
            ':prima_promedio_poliza' => $agent['prima_promedio_poliza'],
        ]);
    }
}

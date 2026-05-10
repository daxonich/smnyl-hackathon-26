<?php

declare(strict_types=1);

namespace App;

use Ramsey\Uuid\Uuid;

final class SessionManager
{
    private const TTL_SECONDS = 1800; // 30 minutes

    private Database $db;

    public function __construct(?Database $db = null)
    {
        $this->db = $db ?? Database::getInstance();
    }

    /**
     * Creates a new session with step=WELCOME and empty profile.
     */
    public function create(): array
    {
        $id = Uuid::uuid4()->toString();

        $stmt = $this->db->getConnection()->prepare(
            'INSERT INTO sessions (id, step, profile) VALUES (:id, :step, :profile)'
        );
        $stmt->execute([
            ':id' => $id,
            ':step' => 'WELCOME',
            ':profile' => '{}',
        ]);

        return ['id' => $id, 'step' => 'WELCOME', 'profile' => []];
    }

    /**
     * Returns a session by ID, or null if not found or expired.
     * Refreshes last_activity on successful read.
     */
    public function get(string $id): ?array
    {
        $stmt = $this->db->getConnection()->prepare(
            'SELECT * FROM sessions WHERE id = :id'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        // Check if expired using PHP time comparison
        if ((time() - strtotime($row['last_activity'])) > self::TTL_SECONDS) {
            return null;
        }

        // Refresh last_activity
        $updateStmt = $this->db->getConnection()->prepare(
            'UPDATE sessions SET last_activity = NOW() WHERE id = :id'
        );
        $updateStmt->execute([':id' => $id]);

        return [
            'id' => $row['id'],
            'step' => $row['step'],
            'profile' => json_decode($row['profile'], true) ?? [],
        ];
    }

    /**
     * Checks if a session exists but is expired.
     * Returns true only if the session exists AND is expired.
     */
    public function isExpired(string $id): bool
    {
        $stmt = $this->db->getConnection()->prepare(
            'SELECT id, last_activity FROM sessions WHERE id = :id'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        if (!$row) {
            return false;
        }

        return (time() - strtotime($row['last_activity'])) > self::TTL_SECONDS;
    }

    /**
     * Updates a session's step and/or profile, refreshing last_activity.
     * Merges profile data with existing profile.
     */
    public function update(string $id, array $updates): ?array
    {
        $stmt = $this->db->getConnection()->prepare(
            'SELECT * FROM sessions WHERE id = :id'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        $currentProfile = json_decode($row['profile'], true) ?? [];
        $merged = array_merge($currentProfile, $updates['profile'] ?? []);
        $newStep = $updates['step'] ?? $row['step'];

        $updateStmt = $this->db->getConnection()->prepare(
            'UPDATE sessions SET step = :step, profile = :profile, last_activity = NOW() WHERE id = :id'
        );
        $updateStmt->execute([
            ':step' => $newStep,
            ':profile' => json_encode($merged, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            ':id' => $id,
        ]);

        return ['id' => $id, 'step' => $newStep, 'profile' => $merged];
    }

    /**
     * Removes all sessions that have been inactive for longer than the TTL.
     * Returns the number of deleted sessions.
     */
    public function cleanExpired(): int
    {
        $stmt = $this->db->getConnection()->prepare(
            'DELETE FROM sessions WHERE TIMESTAMPDIFF(SECOND, last_activity, NOW()) > :ttl'
        );
        $stmt->execute([':ttl' => self::TTL_SECONDS]);

        return $stmt->rowCount();
    }
}

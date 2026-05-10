<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Database;
use App\Seed;

echo "Initializing database...\n";
$db = Database::getInstance();
$db->initSchema();

$agents = Seed::generateAgents(54);
echo "Inserting " . count($agents) . " agents...\n";

foreach ($agents as $agent) {
    $db->insertAgent($agent);
}

echo "Seed complete. " . count($agents) . " agents inserted.\n";

<?php
/**
 * API DEFINITIVA PARA KPI DASHBOARD
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');

// Credenciales
$db_host = 'localhost';
$db_name = 'u396112349_DBLeroy';
$db_user = 'u396112349_DBLeroy';
$db_pass = 'DBLeroyCont047';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    $pdo->exec("CREATE TABLE IF NOT EXISTS kpi_storage (
        id INT PRIMARY KEY DEFAULT 1,
        data_json LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        if (json_decode($input)) {
            $stmt = $pdo->prepare("INSERT INTO kpi_storage (id, data_json) VALUES (1, ?) ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)");
            $stmt->execute([$input]);
            echo json_encode(["status" => "success"]);
        } else {
            echo json_encode(["status" => "error", "message" => "JSON inválido"]);
        }
    } else {
        $stmt = $pdo->query("SELECT data_json FROM kpi_storage WHERE id = 1");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($result && !empty($result['data_json'])) {
            echo $result['data_json'];
        } else {
            // Estructura mínima segura para evitar errores en el frontend
            echo json_encode([
                "data" => new stdClass(),
                "completions" => new stdClass()
            ]);
        }
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error de BD", "details" => $e->getMessage()]);
}
?>
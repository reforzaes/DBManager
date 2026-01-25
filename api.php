<?php
/**
 * API PARA MANAGEMENT PERFORMANCE DASHBOARD 2026
 * DB: u396112349_dbmanager
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$db_host = 'localhost';
$db_name = 'u396112349_dbmanager';
$db_user = 'u396112349_dbmanager';
$db_pass = 'CsAn-eT88WgmauC';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        if (!empty($input) && json_decode($input)) {
            // Usamos REPLACE para asegurar que si el ID 1 existe, se sobrescriba, si no, se cree.
            $stmt = $pdo->prepare("REPLACE INTO kpi_storage (id, data_json) VALUES (1, ?)");
            $stmt->execute([$input]);
            echo json_encode(["status" => "success", "message" => "Datos guardados"]);
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "JSON inválido o vacío"]);
        }
    } else {
        $stmt = $pdo->query("SELECT data_json FROM kpi_storage WHERE id = 1");
        $result = $stmt->fetch();
        
        if ($result && !empty($result['data_json'])) {
            echo $result['data_json'];
        } else {
            echo json_encode(["data" => new stdClass(), "completions" => new stdClass()]);
        }
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
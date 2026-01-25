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

// Credenciales actualizadas
$db_host = 'localhost';
$db_name = 'u396112349_dbmanager';
$db_user = 'u396112349_dbmanager';
$db_pass = 'Leroy047!!';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    // Crear tabla si no existe con motor InnoDB para mayor fiabilidad
    $pdo->exec("CREATE TABLE IF NOT EXISTS kpi_storage (
        id INT PRIMARY KEY,
        data_json LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB");

    // Aseguramos que el registro inicial exista
    $stmtCheck = $pdo->query("SELECT id FROM kpi_storage WHERE id = 1");
    if (!$stmtCheck->fetch()) {
        $pdo->exec("INSERT INTO kpi_storage (id, data_json) VALUES (1, '{\"data\":{}, \"completions\":{}}')");
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        if (!empty($input) && json_decode($input)) {
            // Guardar usando REPLACE para asegurar la actualización atómica del registro 1
            $stmt = $pdo->prepare("REPLACE INTO kpi_storage (id, data_json) VALUES (1, ?)");
            $stmt->execute([$input]);
            echo json_encode(["status" => "success", "message" => "Datos guardados correctamente"]);
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "JSON inválido o vacío"]);
        }
    } else {
        // Método GET: Recuperar los datos
        $stmt = $pdo->query("SELECT data_json FROM kpi_storage WHERE id = 1");
        $result = $stmt->fetch();
        
        if ($result && !empty($result['data_json'])) {
            echo $result['data_json'];
        } else {
            // Estructura por defecto si algo falló
            echo json_encode([
                "data" => new stdClass(),
                "completions" => new stdClass()
            ]);
        }
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => "Error de base de datos: " . $e->getMessage()
    ]);
}
?>
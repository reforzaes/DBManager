<?php
/**
 * API DEFINITIVA PARA DEROY KPI DASHBOARD
 * Soporta la estructura de Managers, KPIs y Meses (0-11)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');

// Credenciales Hostinger
$db_host = 'localhost';
$db_name = 'u396112349_DBLeroy';
$db_user = 'u396112349_DBLeroy';
$db_pass = 'DBLeroyCont047';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // Crear tabla si no existe
    $pdo->exec("CREATE TABLE IF NOT EXISTS kpi_storage (
        id INT PRIMARY KEY DEFAULT 1,
        data_json LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // GUARDAR DATOS
        $input = file_get_contents('php://input');
        // Validamos que sea un JSON correcto antes de guardar
        if (json_decode($input)) {
            $stmt = $pdo->prepare("INSERT INTO kpi_storage (id, data_json) VALUES (1, ?) 
                                   ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)");
            $stmt->execute([$input]);
            echo json_encode(["status" => "success"]);
        } else {
            echo json_encode(["status" => "error", "message" => "JSON inválido"]);
        }
    } else {
        // LEER DATOS
        $stmt = $pdo->query("SELECT data_json FROM kpi_storage WHERE id = 1");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result) {
            echo $result['data_json'];
        } else {
            // SI ESTÁ VACÍO: Enviamos la estructura mínima que tu HTML necesita para no dar error
            // Esto evita el error "undefined (reading 'obj1')"
            $defaultData = [
                "completions" => [
                    "General" => [
                        "obj1" => array_fill(0, 12, false),
                        "obj2" => array_fill(0, 12, false),
                        "obj3" => array_fill(0, 12, false),
                        "obj4" => array_fill(0, 12, false),
                        "obj5" => array_fill(0, 12, false)
                    ]
                    // Se pueden añadir más managers aquí si los tienes definidos
                ]
            ];
            echo json_encode($defaultData);
        }
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error de BD", "details" => $e->getMessage()]);
}
?>
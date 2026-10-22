<?php

declare(strict_types=1);

const CUZK_WFS_URL = 'https://services.cuzk.cz/wfs/inspire-cp-wfs.asp';
const MAX_VIEWPORT_METERS = 7000.0;
const MAX_FEATURES = 15000;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');

try {
    $bbox = readBbox($_GET);
    $cacheDir = dirname(__DIR__, 2) . '/storage/cache';
    $cacheKey = hash('sha256', implode(',', $bbox));
    $cacheFile = $cacheDir . '/' . $cacheKey . '.json';

    if (is_file($cacheFile) && filemtime($cacheFile) > time() - 300) {
        readfile($cacheFile);
        exit;
    }

    if (!is_dir($cacheDir) && !mkdir($cacheDir, 0775, true) && !is_dir($cacheDir)) {
        throw new RuntimeException('Cache adresář se nepodařilo vytvořit.');
    }

    $query = http_build_query([
        'service' => 'WFS',
        'version' => '2.0.0',
        'request' => 'GetFeature',
        'typeNames' => 'cp:CadastralParcel',
        'outputFormat' => 'application/json',
        'srsName' => 'EPSG:5514',
        'count' => MAX_FEATURES,
        'bbox' => implode(',', $bbox) . ',EPSG:5514',
    ]);
    $payload = fetchJson(CUZK_WFS_URL . '?' . $query);
    $encoded = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    file_put_contents($cacheFile, $encoded, LOCK_EX);
    echo $encoded;
} catch (InvalidArgumentException $exception) {
    http_response_code(400);
    echo json_encode(['error' => $exception->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Throwable $exception) {
    http_response_code(502);
    echo json_encode(['error' => 'Data ČÚZK se momentálně nepodařilo načíst.'], JSON_UNESCAPED_UNICODE);
}

/**
 * @param array<string, mixed> $input
 * @return array{0: float, 1: float, 2: float, 3: float}
 */
function readBbox(array $input): array
{
    $values = [];
    foreach (['minX', 'minY', 'maxX', 'maxY'] as $key) {
        if (!isset($input[$key]) || !is_numeric($input[$key])) {
            throw new InvalidArgumentException('Chybí platné parametry mapového výřezu.');
        }
        $values[] = (float) $input[$key];
    }
    [$minX, $minY, $maxX, $maxY] = $values;
    if ($minX >= $maxX || $minY >= $maxY ||
        $maxX - $minX > MAX_VIEWPORT_METERS ||
        $maxY - $minY > MAX_VIEWPORT_METERS) {
        throw new InvalidArgumentException('Výřez mapy je příliš velký. Přibližte mapu.');
    }
    return $values;
}

/**
 * @return array<string, mixed>
 */
function fetchJson(string $url): array
{
    $context = stream_context_create([
        'http' => [
            'timeout' => 30,
            'ignore_errors' => true,
            'header' => "Accept: application/json\r\nUser-Agent: ViagemParcelDemo/1.0\r\n",
        ],
    ]);
    $response = file_get_contents($url, false, $context);
    if ($response === false) {
        throw new RuntimeException('WFS request failed.');
    }
    $payload = json_decode($response, true);
    if (!is_array($payload) || isset($payload['Exception'])) {
        throw new RuntimeException('WFS returned an invalid response.');
    }
    return $payload;
}

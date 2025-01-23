<?php
/**
 *
 * Blob Uploader. An extension for the phpBB Forum Software package.
 *
 * @copyright (c) 2025, tig
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace tig\blobuploader\controller;

use Symfony\Component\HttpFoundation\Response;
use tig\blobuploader\helpers\ImageProcessor;

class blobuploader
{
    /** @var \phpbb\config\config */
    protected $config;

    /** @var \phpbb\user */
    protected $user;

    /** @var \phpbb\language\language */
    protected $language;

    /** @var \phpbb\request\request */
    protected $request;

    /** @var ImageProcessor */
    protected $imageProcessor;

    /**
     * Constructor.
     *
     * @param \phpbb\config\config $config Config object
     * @param \phpbb\user $user User object
     * @param \phpbb\language\language $language Language object
     * @param \phpbb\request\request $request Request object
     */
    public function __construct(
        \phpbb\config\config $config,
        \phpbb\user $user,
        \phpbb\language\language $language,
        \phpbb\request\request $request
    ) {
        $this->config = $config;
        $this->user = $user;
        $this->language = $language;
        $this->request = $request;

        // Initialize the image processor
        $this->imageProcessor = new ImageProcessor();

        // Load the language file
        $this->language->add_lang('common', 'tig/blobuploader');
    }

    public function upload()
    {
        $this->startPerfLog('upload', '============= Start upload ==============');

        // Retrieve configuration settings

        $use_blob_service = (bool) $this->config['tig_use_blob_service'];
        $url_base = $this->config['tig_blobuploader_url_base'];
        $upload_dir = $this->config['tig_blobuploader_mount_dir'];

        if ($use_blob_service) {
            $imageprocessor_fn_url = $this->config['tig_imageprocessor_fn_url'];
            $imageprocessor_appid = $this->config['tig_imageprocessor_appid'];
            $blobstore_connectionstring = $this->config['tig_blobstore_connectionstring'];
            error_log('Using Blob Service: ' . $imageprocessor_fn_url);
        } else {

            error_log('Using Local Storage: ' . $url_base . $upload_dir);
        }

        $allowed_extensions = explode(', ', $this->config['tig_blobuploader_allowed_extensions']);
        $max_original_width = (int) $this->config['tig_blobuploader_max_original_width'];
        $max_original_height = (int) $this->config['tig_blobuploader_max_original_height'];
        $sized_width = (int) $this->config['tig_blobuploader_sized_width'];
        $sized_height = (int) $this->config['tig_blobuploader_sized_height'];
        $thumbnail_width = (int) $this->config['tig_blobuploader_thumbnail_width'];
        $thumbnail_height = (int) $this->config['tig_blobuploader_thumbnail_height'];

        error_log('Sizes: ' . json_encode([
            'max_original_width' => $max_original_width,
            'max_original_height' => $max_original_height,
            'sized_width' => $sized_width,
            'sized_height' => $sized_height,
            'thumbnail_width' => $thumbnail_width,
            'thumbnail_height' => $thumbnail_height,
        ]));

        // Access the input property directly
        $input = (array) $this->request;

        // pretty print input
        //error_log('Input: ' . json_encode($input, JSON_PRETTY_PRINT));

        $files = $input["\0*\0input"][5]['image'];

        // Check if a file is being uploaded
        if (empty($files)) {
            error_log('Error: No file specified.');
            $this->endPerfLog('upload', 'No file specified');
            return $this->errorResponse('No file specified.', 400);
        }

        $response_data = [];
        $files = $this->normalizeFiles($files);

        foreach ($files as $file_to_upload) {
            if (isset($file_to_upload['error']) && $file_to_upload['error'] === 0) {
                if ($use_blob_service) {
                    $response_data[] = $this->processSingleFileRemote(
                        $imageprocessor_fn_url,
                        $imageprocessor_appid,
                        $blobstore_connectionstring,
                        $file_to_upload,
                        $upload_dir,
                        $url_base,
                        $allowed_extensions,
                        $max_original_width,
                        $max_original_height,
                        $sized_width,
                        $sized_height,
                        $thumbnail_width,
                        $thumbnail_height,
                    );

                } else {
                    $response_data[] = $this->processSingleFileLocal(
                        $file_to_upload,
                        $upload_dir,
                        $url_base,
                        $allowed_extensions,
                        $max_original_width,
                        $max_original_height,
                        $sized_width,
                        $sized_height,
                        $thumbnail_width,
                        $thumbnail_height,
                    );
                }
            } else {
                error_log('Error uploading the file: ' . json_encode($file_to_upload));
            }
        }

        //error_log('response_data: ' . json_encode($response_data));
        $this->endPerfLog('upload', 'Finished processing upload');
        return new Response(json_encode($response_data), 200, ['Content-Type' => 'application/json']);
    }

    private function processSingleFileRemote(
        $imageprocessor_fn_url,
        $imageprocessor_appid,
        $blobstore_connectionstring,
        $file_to_upload,
        $subdir,
        $url_base,
        $allowed_extensions,
        $max_original_width,
        $max_original_height,
        $sized_width,
        $sized_height,
        $thumbnail_width,
        $thumbnail_height
    ) {
        $this->startPerfLog('processSingleFileRemote', 'Start processing single file: ' . $file_to_upload['name']);
    
        $ext = strtolower(pathinfo($file_to_upload['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, $allowed_extensions)) {
            $error = 'Invalid file type: ' . htmlspecialchars($file_to_upload['name']);
            error_log($error);
            $this->endPerfLog('processSingleFile', $error);
            return ['error' => $error];
        }

        $deDupe = true;
        $useHashForFileName = true;
    
        // Prepare form data for multipart submission
        $formData = [
            'file' => new \CURLFile($file_to_upload['tmp_name'], $file_to_upload['type'], $file_to_upload['name']),
            'fileName' => $file_to_upload['name'],
            'blobContainer' => '$web', // Set your blob container
            'blobConnectionString' => $blobstore_connectionstring,
            'subDirectory' => $subdir . $this->user->data['user_id'] . '/', // Set the subdirectory where the image will be stored
            'useHashForFileName' =>  $useHashForFileName ? 'true' : 'false', 
            'deDupe' =>  $deDupe ? 'true' : 'false', 
            'originalWidth' => $max_original_width,
            'originalHeight' => $max_original_height,
            'sizedWidth' => $sized_width,
            'sizedHeight' => $sized_height,
            'thumbnailWidth' => $thumbnail_width,
            'thumbnailHeight' => $thumbnail_height,
            'extension' => $ext,
        ];
    
        $this->startPerfLog("curl_init", "Initialize cURL");
        // Initialize cURL
        $ch = curl_init();
        $this->endPerfLog("curl_init", "cURL initialized");
    
        // Set cURL options
        curl_setopt($ch, CURLOPT_URL, $imageprocessor_fn_url . ($imageprocessor_appid ? "?code=$imageprocessor_appid" : ""));
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $formData);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_2_0);
        curl_setopt($ch, CURLOPT_FORBID_REUSE, false);
        curl_setopt($ch, CURLOPT_TCP_KEEPALIVE, 1);

        curl_setopt($ch, CURLOPT_VERBOSE, true);

        // Execute the request and capture the response
        $this->startPerfLog("curl_exec", "Execute cURL request");
        $response = curl_exec($ch);
        $this->endPerfLog("curl_exec", "cURL request executed");

        $info = curl_getinfo($ch);
        error_log('cURL Timing: ' . json_encode([
            'namelookup_time' => $info['namelookup_time'],
            'connect_time' => $info['connect_time'],
            'pretransfer_time' => $info['pretransfer_time'],
            'starttransfer_time' => $info['starttransfer_time'],
            'total_time' => $info['total_time'],
        ]));

    
        // Dump curl info for debugging
        //error_log('Curl info: ' . json_encode(curl_getinfo($ch)));
    
        // Check for cURL errors
        if (curl_errno($ch)) {
            $error = curl_error($ch);
            curl_close($ch);
            error_log('Error processing file remotely: ' . $error);
            return ['error' => 'Error processing file remotely: ' . $error];
        }
    
        // Close cURL session
        curl_close($ch);
    
        // Handle the response
        if ($response) {
            if ($decodedResponse = json_decode($response, true)) {
                // The function will return a URL that may not be accessible to the public.
                // Use $url_base to create public URLs.
                $decodedResponse['original'] = $url_base . $subdir . $this->user->data['user_id'] . '/' . basename($decodedResponse['original']);
                $decodedResponse['sized'] = $url_base . $subdir . $this->user->data['user_id'] . '/' . basename($decodedResponse['sized']);
                $decodedResponse['thumbnail'] = $url_base . $subdir . $this->user->data['user_id'] . '/' . basename($decodedResponse['thumbnail']);
    
                error_log('Decoded Response: ' . json_encode($decodedResponse));
                return $decodedResponse;
            } else {
                error_log('Non-JSON Response: ' . $response);
                return ['error' => $response];
            }
        } else {
            error_log('Empty Response: No data received from server.');
            return ['error' => 'No response received from server.'];
        }
    }
    

    private function processSingleFileLocal(
        $file_to_upload,
        $upload_dir,
        $url_base,
        $allowed_extensions,
        $max_original_width,
        $max_original_height,
        $sized_width,
        $sized_height,
        $thumbnail_width,
        $thumbnail_height
    ) {
        $this->startPerfLog('processSingleFileLocal', 'Start processing single file: ' . $file_to_upload['name']);

        $ext = strtolower(pathinfo($file_to_upload['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, $allowed_extensions)) {
            $error = 'Invalid file type: ' . htmlspecialchars($file_to_upload['name']);
            error_log($error);
            $this->endPerfLog('processSingleFile', $error);
            return ['error' => $error];
        }

        try {
            $imagick = new \Imagick();

            if ($ext === 'heic') {
                $heic_file = $file_to_upload['tmp_name'] . '.heic';
                copy($file_to_upload['tmp_name'], $heic_file);
                $file_to_upload['tmp_name'] = $heic_file;
            }

            $imagick->readImage($file_to_upload['tmp_name']);
        } catch (\ImagickException $e) {
            $error = 'Invalid image file: ' . htmlspecialchars($file_to_upload['name']) . ' (' . $e->getMessage() . ')';
            $this->endPerfLog('processSingleFile', $error);
            return ['error' => $error];
        }

        // If $url_base has a leading slash, remove it
        if (substr($url_base, 0, 1) === '/') {
            $url_base = substr($url_base, 1);
        }

        $image_hash = $this->generateImageHash($file_to_upload['tmp_name']);
        $user_upload_dir = $url_base . $upload_dir . $this->user->data['user_id'];
        if (!is_dir($user_upload_dir)) {
            mkdir($user_upload_dir, 0777, true);
        }

        error_log('User upload dir: ' . $user_upload_dir);

        $original_filename = $image_hash . '_original.' . $ext;
        $sized_filename = $image_hash . '_sized.' . $ext;
        $thumbnail_filename = $image_hash . '_thumbnail.' . $ext;

        if (file_exists($user_upload_dir . '/' . $original_filename)) {
            $this->endPerfLog('processSingleFile', 'File exists.');
            return [
                'original' => '/' . $user_upload_dir . '/' . $original_filename,
                'sized' => '/' . $user_upload_dir . '/' . $sized_filename,
                'thumbnail' => '/' . $user_upload_dir . '/' . $thumbnail_filename,
            ];
        }

        if ($ext === 'heic') {
            $imagick->setImageFormat('jpg');
            $ext = 'jpg';
        }

        $sizes = [
            'original' => [$max_original_width, $max_original_height],
            'sized' => [$sized_width, $sized_height],
            'thumbnail' => [$thumbnail_width, $thumbnail_height],
        ];

        try {
            if ($ext === 'gif') {
                $results = $this->imageProcessor->handleGifProcessing($imagick, $sizes, $user_upload_dir, $image_hash);
            } else {
                $results = $this->imageProcessor->handleImageProcessing($imagick, $sizes, $user_upload_dir, $image_hash, $ext);
            }
            $imagick->clear();
        } catch (\Exception $e) {
            $error = 'Image processing failed for ' . $file_to_upload['name'] . ': ' . $e->getMessage();
            $this->endPerfLog('processSingleFile', $error);
            return ['error' => $error];
        }

        $this->endPerfLog('processSingleFileLocal', 'Finished.');

        return [
            'original' => '/' . $user_upload_dir . '/' . basename($results['original']),
            'sized' => '/' . $user_upload_dir . '/' . basename($results['sized']),
            'thumbnail' => '/' . $user_upload_dir . '/' . basename($results['thumbnail']),
        ];
    }

    private function generateImageHash($file_path)
    {
        $this->startPerfLog('generateImageHash', 'Start');

        $file_handle = fopen($file_path, 'rb');
        $file_data = fread($file_handle, 500 * 1024);
        fclose($file_handle);
        $hash = substr(md5($file_data), 0, 16);
        $this->endPerfLog('generateImageHash', 'Finished.');
        return $hash;
    }

    private function normalizeFiles($files)
    {
        if (!isset($files['name'][0])) {
            return [$files];
        }

        return array_map(function ($name, $tmp_name, $type, $error, $size) {
            return compact('name', 'tmp_name', 'type', 'error', 'size');
        }, (array) $files['name'], (array) $files['tmp_name'], (array) $files['type'], (array) $files['error'], (array) $files['size']);
    }

    private function errorResponse($message, $status = 400)
    {
        return new Response(json_encode(['error' => $message]), $status, ['Content-Type' => 'application/json']);
    }

    private function startPerfLog($key, $message)
    {
        $GLOBALS['perf_log'][$key] = microtime(true);
        error_log("[START $key] $message");
    }

    private function endPerfLog($key, $message)
    {
        if (isset($GLOBALS['perf_log'][$key])) {
            $elapsed = microtime(true) - $GLOBALS['perf_log'][$key];
            error_log("[END $key] $message | Elapsed: " . number_format($elapsed, 4) . " seconds");
            unset($GLOBALS['perf_log'][$key]);
        } else {
            error_log("[END $key] $message | No start time recorded.");
        }
    }
}

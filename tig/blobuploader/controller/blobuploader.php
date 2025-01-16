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

        // Load the language file
        $this->language->add_lang('common', 'tig/blobuploader');
    }

    public function upload()
    {
        // Retrieve configuration settings
        $upload_dir = $this->config['tig_blobuploader_mount_dir'];
        $url_base = $this->config['tig_blobuploader_url_base'];

        if ($url_base === '')
        {
            $url_base = '/' . $upload_dir;
        }

        $allowed_extensions = explode(', ', $this->config['tig_blobuploader_allowed_extensions']);
        $max_original_width = (int) $this->config['tig_blobuploader_max_original_width'];
        $max_original_height = (int) $this->config['tig_blobuploader_max_original_height'];
        $sized_width = (int) $this->config['tig_blobuploader_sized_width'];
        $sized_height = (int) $this->config['tig_blobuploader_sized_height'];

        //error_log('request: ' . print_r( $this->request, true));

        // Access the input property directly
        $input = (array) $this->request;


        $files = $input["\0*\0input"][5]['image'];

        //error_log('files: ' . print_r($files, true));

        // Check if a file is being uploaded
        if (empty($files))
        {
            error_log('Error: No file specified.');
            return new Response('{"error": "No file specified."}', 400, ['Content-Type' => 'application/json']);
        }

        $response_data = [];

        // Normalize the $files structure for consistent processing
        if (!isset($files['name'][0])) {
            // If $files is not an array of files, wrap it in an array
            $files = [$files];
        } else {
            // Reformat the files array to use associative keys
            $files = array_map(function($name, $full_path, $type, $tmp_name, $error, $size) {
                return compact('name', 'full_path', 'type', 'tmp_name', 'error', 'size');
            }, (array)$files['name'], (array)$files['full_path'], (array)$files['type'], (array)$files['tmp_name'], (array)$files['error'], (array)$files['size']);
        }

        //error_log('files: ' . print_r($files, true));

        foreach ($files as $file_to_upload) {
            error_log('Processing file: ' . $file_to_upload['name']);

            if (isset($file_to_upload['error']) && $file_to_upload['error'] == 0) {
                // Validate the file type
                $ext = strtolower(pathinfo($file_to_upload['name'], PATHINFO_EXTENSION));
                if (!in_array($ext, $allowed_extensions))
                {
                    $response_data[] = ['error' => 'Invalid file type: ' . htmlspecialchars($file_to_upload['name'])];
                    error_log('Error uploading file. $response_data[] = ' . json_encode($response_data));
                    continue;
                }

                // Validate that the uploaded file is an image
                try
                {
                    $imagick = new \Imagick();

                    if ($ext === 'heic')
                    {
                        //error_log('heic file detected');
                        // Need to copy the tmp file to a file with .heic extension and use that
                        $heic_file = $file_to_upload['tmp_name'] . '.heic';
                        //error_log('Copying ' . $file_to_upload['tmp_name'] . ' to ' . $heic_file);
                        copy($file_to_upload['tmp_name'], $heic_file);
                        $file_to_upload['tmp_name'] = $heic_file;
                    }

                    error_log('Reading image file: ' . $file_to_upload['tmp_name']);
                    $imagick->readImage($file_to_upload['tmp_name']);
                }
                catch (\ImagickException $e)
                {
                    $response_data[] = ['error' => 'Invalid image file: ' . htmlspecialchars($file_to_upload['name'] . ' (' . htmlspecialchars($file_to_upload['tmp_name']) . ')')];
                    error_log('Error uploading file. $response_data[] = ' . json_encode($response_data) . ' (' . $e->getMessage() . ')');
                    continue;
                }

                // Measure time taken for hashing
                $start_time = microtime(true);

                // Generate an MD5 hash on the first 500KB of the image file
                $file_handle = fopen($file_to_upload['tmp_name'], 'rb');
                $file_data = fread($file_handle, 500 * 1024); // Read the first 500KB
                fclose($file_handle);
                $image_hash = substr(md5($file_data), 0, 16); // 16 characters long

                $end_time = microtime(true);
                $hash_time = $end_time - $start_time;
                error_log('Hashing time: ' . $hash_time . ' seconds');

                // Create user-specific directory if it doesn't exist
                $user_upload_dir = $upload_dir . $this->user->data['user_id'];
                if (!is_dir($user_upload_dir)) {
                    mkdir($user_upload_dir, 0777, true);
                }

                // Check if the file already exists
                $original_filename  = $image_hash . '_original.' . $ext;
                $sized_filename     = $image_hash . '_sized.' . $ext;
                $thumbnail_filename = $image_hash . '_thumbnail.' . $ext;

                if (file_exists($user_upload_dir . '/' . $original_filename)) {
                    error_log('File already exists: ' . $original_filename);
                    $response_data[] = [
                        'original' =>  $url_base . $this->user->data['user_id'] . '/' . $original_filename,
                        'sized' =>  $url_base . $this->user->data['user_id'] . '/' . $sized_filename,
                        'thumbnail' => $url_base . $this->user->data['user_id']  . '/' .$thumbnail_filename,
                    ];
                    continue;
                }

                // Measure time taken for HEIC to JPG conversion
                if ($ext === 'heic')
                {
                    $start_time = microtime(true);

                    $imagick->setImageFormat('jpg');
                    $ext = 'jpg';
                    $file_to_upload['name'] = pathinfo($file_to_upload['name'], PATHINFO_FILENAME) . '.jpg';

                    $end_time = microtime(true);
                    $conversion_time = $end_time - $start_time;
                    error_log('HEIC to JPG conversion time: ' . $conversion_time . ' seconds');
                }

                try {
                    if ($ext === 'gif') {

                        // Handle GIF files
                        $start_time = microtime(true);
                        $imagick = $imagick->coalesceImages();
                        foreach ($imagick as $frame) {
                            $this->resizeImageWithOrientation($frame, $max_original_width, $max_original_height);
                        }
                        $imagick = $imagick->deconstructImages();
                        $imagick->writeImages($user_upload_dir . '/' . $original_filename, true);
                        $end_time = microtime(true);
                        error_log('Creating GIF _original time: ' . $end_time - $start_time . ' seconds');

                        $start_time = microtime(true);
                        $sized = $imagick->coalesceImages();
                        foreach ($sized as $frame) {
                            $this->resizeImageWithOrientation($frame, $sized_width, $sized_height);
                        }
                        $sized = $sized->deconstructImages();
                        $sized->writeImages($user_upload_dir . '/' . $sized_filename, true);
                        $end_time = microtime(true);
                        error_log('Creating GIF _sized time: ' . $end_time - $start_time . ' seconds');

                        $start_time = microtime(true);
                        $thumbnail = $imagick->coalesceImages();
                        foreach ($thumbnail as $frame) {
                            $this->resizeImageWithOrientation($frame, 300, 300); // Assuming 300x300 for thumbnail
                        }
                        $thumbnail = $thumbnail->deconstructImages();
                        $thumbnail->writeImages($user_upload_dir . '/' . $thumbnail_filename, true);
                        $end_time = microtime(true);
                        error_log('Creating GIF _thumbnail time: ' . $end_time - $start_time . ' seconds');

                        $thumbnail->clear();
                        $sized->clear();
                        $imagick->clear();
                    } else {

                        // Handle non-GIF files
                        $start_time = microtime(true);
                        $this->resizeImageWithOrientation($imagick, $max_original_width, $max_original_height);
                        $imagick->writeImage($user_upload_dir . '/' . $original_filename);
                        $end_time = microtime(true);
                        error_log('Creating _original time: ' .  $end_time - $start_time . ' seconds');

                        $start_time = microtime(true);
                        $sized = clone $imagick;
                        $this->resizeImageWithOrientation($sized, $sized_width, $sized_height);
                        $sized->writeImage($user_upload_dir . '/' . $sized_filename);
                        $end_time = microtime(true);
                        error_log('Creating _sized time: ' .  $end_time - $start_time . ' seconds');

                        $start_time = microtime(true);
                        $thumbnail = clone $imagick;
                        $this->resizeImageWithOrientation($thumbnail, 300, 300); // Assuming 300x300 for thumbnail
                        $thumbnail->writeImage($user_upload_dir . '/' . $thumbnail_filename);
                        $end_time = microtime(true);
                        error_log('Creating _thumnail time: ' .  $end_time - $start_time . ' seconds');

                        $thumbnail->clear();
                        $sized->clear();
                        $imagick->clear();
                    }

                    $response_data[] = [
                        'original' =>  $url_base . $this->user->data['user_id'] . '/' . $original_filename,
                        'sized' =>  $url_base . $this->user->data['user_id'] . '/' . $sized_filename,
                        'thumbnail' => $url_base . $this->user->data['user_id']  . '/' .$thumbnail_filename,
                    ];
                } catch (\Exception $e) {
                    $response_data[] = ['error' => 'Image processing failed for ' . $file_to_upload['name'] . ': ' . $e->getMessage()];
                    error_log('Error uploading file. $response_data[] = ' . json_encode($response_data));
                }
            } else {
                // Error uploading the file
                error_log('Error uploading the file: ' . $file_to_upload['error']);
            }
        }

        error_log('response_data: ' . json_encode($response_data));

        return new Response(json_encode($response_data), 200, ['Content-Type' => 'application/json']);
    }

    private function resizeImageWithOrientation($imagick, $maxWidth, $maxHeight)
    {
        $width = $imagick->getImageWidth();
        $height = $imagick->getImageHeight();

        if ($width > $height) {
            if ($width > $maxWidth) {
                $imagick->resizeImage($maxWidth, 0, \Imagick::FILTER_LANCZOS, 1);
            }
        } else {
            if ($height > $maxHeight) {
                $imagick->resizeImage(0, $maxHeight, \Imagick::FILTER_LANCZOS, 1);
            }
        }
    }
}
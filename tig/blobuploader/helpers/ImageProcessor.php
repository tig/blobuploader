<?php

namespace tig\blobuploader\helpers;

class ImageProcessor
{
    public function handleGifProcessing($imagick, $sizes, $outputDir, $baseName)
    {
        $size = $imagick->getImageGeometry();
        $frameCount = $imagick->getNumberImages();
    
        $this->startPerfLog('handleGifProcessing', 'Start processing ' . $size['width'] . 'x' . $size['height'] . ', ' .  $frameCount . ' frame GIF');
    
        $frames = $imagick->coalesceImages();
        $results = [];
    
        foreach ($sizes as $key => [$width, $height]) {
            // Don't resize if the image is already smaller than the target size
            if ($size['width'] <= $width && $size['height'] <= $height) {
                error_log("Image is already smaller than " . $width . "x" . $height . ", skipping resize.");
                $results[$key] = null;
                continue;
            }
    
            $copy = clone $frames;
    
            // Perform resizing for all frames at once
            // The third parameter true tells Imagick to preserve the aspect ratio.
            $copy->thumbnailImage($width, $height, true);
    
            // Remove redundant frames
            $copy = $copy->deconstructImages();
            $filename = $outputDir . '/' . $baseName . "_{$key}.gif";
            $copy->writeImages($filename, true);
            $results[$key] = $filename;
        }
    
        $frames->clear();
        $this->endPerfLog('handleGifProcessing', 'End processing GIF');
        return $results;
    }

    public function handleImageProcessing($imagick, $sizes, $outputDir, $baseName, $ext)
    {
        $results = [];

        foreach ($sizes as $key => [$width, $height]) {
            $copy = clone $imagick;
            // The third parameter true tells Imagick to preserve the aspect ratio.
            $copy->thumbnailImage($width, $height, true);
            $filename = $outputDir . '/' . $baseName . "_{$key}.$ext";
            $this->startPerfLog('writeImage', "Writing image to $filename");
            $copy->writeImage($filename);
            $copy->clear();
            $results[$key] = $filename;
            $this->endPerfLog('writeImage', "Finished writing image to $filename");
        }

        return $results;
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

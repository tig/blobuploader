<?php

namespace tig\blobuploader\helpers;

class ImageProcessor
{
    private function resizeImageWithOrientation($imagick, $maxWidth, $maxHeight)
    {
        $this->startPerfLog('resizeImageWithOrientation', 'Start resizing ' . $maxWidth . 'x' . $maxHeight);
    
        $width = $imagick->getImageWidth();
        $height = $imagick->getImageHeight();
    
        // FILTER_BOX is an order of magnitude faster than FILTER_LANCZOS for small images
        $filter = ($maxWidth <= 300 || $maxHeight <= 300) ? \Imagick::FILTER_BOX : \Imagick::FILTER_LANCZOS;
    
        if ($width > $height) {
            if ($width > $maxWidth) {
                $imagick->resizeImage($maxWidth, 0, $filter, 1);
            }
        } else {
            if ($height > $maxHeight) {
                $imagick->resizeImage(0, $maxHeight, $filter, 1);
            }
        }
    
        $this->endPerfLog('resizeImageWithOrientation', 'Finished resizing ' . $maxWidth . 'x' . $maxHeight);
    }
    

    public function handleGifProcessing($imagick, $sizes, $outputDir, $baseName)
    {
        $this->startPerfLog('handleGifProcessing', 'Start processing GIF');
        $frames = $imagick->coalesceImages();
        $results = [];

        foreach ($sizes as $key => [$width, $height]) {
            $copy = clone $frames;
            foreach ($copy as $frame) {
                $this->resizeImageWithOrientation($frame, $width, $height);
            }
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
            $this->resizeImageWithOrientation($copy, $width, $height);
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

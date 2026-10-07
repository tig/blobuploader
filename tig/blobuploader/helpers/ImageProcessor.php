<?php

namespace tig\blobuploader\helpers;

class ImageProcessor
{
    public function handleGifProcessing($imagick, $sizes, $outputDir, $baseName)
    {
        $frameCount = $imagick->getNumberImages();

        // Measure the animation's canvas, not the current frame. After readImage()
        // the iterator sits on the LAST frame, which in an optimized animated GIF
        // is often a tiny delta (e.g. 1x1). Measuring that made every size look
        // "already smaller", nothing was written, and the upload returned empty
        // filenames.
        $imagick->setFirstIterator();
        $page = $imagick->getImagePage();
        $geometry = $imagick->getImageGeometry();
        $size = [
            'width'  => max((int) $page['width'], (int) $geometry['width']),
            'height' => max((int) $page['height'], (int) $geometry['height']),
        ];

        $this->startPerfLog('handleGifProcessing', 'Start processing ' . $size['width'] . 'x' . $size['height'] . ', ' .  $frameCount . ' frame GIF');

        $results = [];

        foreach ($sizes as $key => [$width, $height]) {
            $filename = $outputDir . '/' . $baseName . "_{$key}.gif";

            // Don't resize if the image already fits the target size, but still
            // write it (original animation, unchanged) so the caller gets a real file.
            if ($size['width'] <= $width && $size['height'] <= $height) {
                error_log("Image is already smaller than " . $width . "x" . $height . ", writing without resize.");
                $imagick->setFirstIterator();
                $imagick->writeImages($filename, true);
                $results[$key] = $filename;
                continue;
            }

            // Full-canvas frames. Coalesced per size (not cloned) to keep peak memory down.
            $frames = $imagick->coalesceImages();

            // Imagick's thumbnailImage() only touches the current frame, so resize
            // every frame. The third parameter true preserves the aspect ratio.
            foreach ($frames as $frame) {
                $frame->thumbnailImage($width, $height, true);
                $frame->setImagePage(0, 0, 0, 0);
            }

            // Equivalent of `convert ... -layers optimize`: keep only changed pixels,
            // then map every frame to one shared palette. Without the shared palette
            // the GIF encoder re-quantizes each frame and the write takes 30-40s.
            $frames->setFirstIterator();
            $optimized = $frames->optimizeImageLayers();
            $frames->clear();
            $optimized->setFirstIterator();
            $optimized->optimizeImageTransparency();
            $optimized->setFirstIterator();
            $optimized->quantizeImages(256, \Imagick::COLORSPACE_SRGB, 0, false, false);
            $optimized->setFirstIterator();
            $optimized->writeImages($filename, true);
            $optimized->clear();
            $results[$key] = $filename;
        }

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

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
                if (!$imagick->writeImages($filename, true)) {
                    throw new \RuntimeException('Failed to write GIF ' . $filename);
                }
                $results[$key] = $filename;
                continue;
            }

            // Full-canvas frames. Coalesced per size (not cloned) to keep peak memory down.
            $frames = $imagick->coalesceImages();
            if (!$frames instanceof \Imagick) {
                throw new \RuntimeException('GIF coalesce failed');
            }

            // Imagick's thumbnailImage() only touches the current frame, so resize
            // every frame. The third parameter true preserves the aspect ratio.
            // Page must be the resized frame size, not 0x0: some GIFs keep a stale
            // virtual canvas after thumbnailImage() and later frames draw off-page.
            foreach ($frames as $frame) {
                $frame->thumbnailImage($width, $height, true);
                $frame->setImagePage($frame->getImageWidth(), $frame->getImageHeight(), 0, 0);
            }

            // Equivalent of `convert ... -layers optimize`: keep only changed pixels,
            // then map every frame to one shared palette. Without the shared palette
            // the GIF encoder re-quantizes each frame and the write takes 30-40s.
            // Imagick 3.x returns a new object; the stub/docs type is bool. Handle both
            // so a true return does not become a PHP 8.3 TypeError on the next call.
            $frames->setFirstIterator();
            $optimized = $frames->optimizeImageLayers();
            if ($optimized instanceof \Imagick) {
                $frames->clear();
                $frames = $optimized;
            } elseif ($optimized !== true) {
                $frames->clear();
                throw new \RuntimeException('GIF layer optimize failed');
            }

            $frames->setFirstIterator();
            $frames->optimizeImageTransparency();
            $frames->setFirstIterator();
            $frames->quantizeImages(256, \Imagick::COLORSPACE_SRGB, 0, false, false);
            $frames->setFirstIterator();
            if (!$frames->writeImages($filename, true)) {
                $frames->clear();
                throw new \RuntimeException('Failed to write GIF ' . $filename);
            }
            $frames->clear();
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

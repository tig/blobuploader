<?php
/**
 * Standalone check for animated GIF canvas size and the no-resize write path.
 *
 * Reproduces the production failure: after readImage() the iterator sits on the
 * last frame, which can be a 1x1 delta. Measuring that made every target look
 * "already smaller", so handleGifProcessing() wrote nothing.
 *
 * Run: php tig/blobuploader/tests/gif_processing_test.php
 */

require __DIR__ . '/../helpers/ImageProcessor.php';

use tig\blobuploader\helpers\ImageProcessor;

function assert_true($condition, $message)
{
	if (!$condition) {
		fwrite(STDERR, "FAIL: $message\n");
		exit(1);
	}
	echo "ok: $message\n";
}

if (!extension_loaded('imagick')) {
	fwrite(STDERR, "SKIP: Imagick extension is not loaded.\n");
	exit(0);
}

$canvasW = 80;
$canvasH = 60;
$workDir = sys_get_temp_dir() . '/blobuploader-gif-' . getmypid();
if (!mkdir($workDir, 0777, true) && !is_dir($workDir)) {
	fwrite(STDERR, "FAIL: could not create $workDir\n");
	exit(1);
}

$sourcePath = $workDir . '/source.gif';

try {
	$gif = new Imagick();

	$first = new Imagick();
	$first->newImage($canvasW, $canvasH, new ImagickPixel('#cc0000'));
	$first->setImageFormat('gif');
	$first->setImageDelay(10);
	$first->setImagePage($canvasW, $canvasH, 0, 0);
	$gif->addImage($first);
	$first->clear();

	// Optimized last frame: a 1x1 delta, the case that broke uploads on prod.
	$delta = new Imagick();
	$delta->newImage(1, 1, new ImagickPixel('#0000cc'));
	$delta->setImageFormat('gif');
	$delta->setImageDelay(10);
	$delta->setImagePage($canvasW, $canvasH, 12, 8);
	$gif->addImage($delta);
	$delta->clear();

	$gif->setFirstIterator();
	$gif->writeImages($sourcePath, true);
	$gif->clear();

	$imagick = new Imagick($sourcePath);
	assert_true($imagick->getNumberImages() >= 2, 'source GIF has more than one frame');

	// After readImage() the iterator is on the last frame.
	$lastGeometry = $imagick->getImageGeometry();
	assert_true(
		(int) $lastGeometry['width'] === 1 && (int) $lastGeometry['height'] === 1,
		'last-frame geometry is 1x1 (the measurement that used to skip the write)'
	);

	$processor = new ImageProcessor();
	$sizes = [
		'original'  => [2000, 2000],
		'sized'     => [800, 800],
		'thumbnail' => [200, 200],
	];

	$results = $processor->handleGifProcessing($imagick, $sizes, $workDir, 'noresize');
	$imagick->clear();

	foreach (['original', 'sized', 'thumbnail'] as $key) {
		assert_true(!empty($results[$key]), "no-resize result for $key is not null");
		assert_true(is_file($results[$key]), "no-resize wrote $key file");
		assert_true(filesize($results[$key]) > 0, "no-resize $key file is not empty");

		$written = new Imagick($results[$key]);
		$written->setFirstIterator();
		$page = $written->getImagePage();
		$geometry = $written->getImageGeometry();
		$width = max((int) $page['width'], (int) $geometry['width']);
		$height = max((int) $page['height'], (int) $geometry['height']);
		assert_true(
			$width === $canvasW && $height === $canvasH,
			"no-resize $key kept the {$canvasW}x{$canvasH} canvas"
		);
		$written->clear();
	}

	// Resize path: thumbnail target is smaller than the canvas.
	$imagick = new Imagick($sourcePath);
	$resized = $processor->handleGifProcessing(
		$imagick,
		['thumbnail' => [20, 20]],
		$workDir,
		'resized'
	);
	$imagick->clear();

	assert_true(is_file($resized['thumbnail']), 'resize path wrote thumbnail');
	$thumb = new Imagick($resized['thumbnail']);
	assert_true($thumb->getNumberImages() >= 2, 'resized thumbnail kept every frame');
	$thumb->setFirstIterator();
	$thumbPage = $thumb->getImagePage();
	$thumbGeo = $thumb->getImageGeometry();
	$thumbW = max((int) $thumbPage['width'], (int) $thumbGeo['width']);
	$thumbH = max((int) $thumbPage['height'], (int) $thumbGeo['height']);
	assert_true($thumbW <= 20 && $thumbH <= 20, "resized thumbnail fits 20x20 (got {$thumbW}x{$thumbH})");
	$thumb->clear();

	echo "All GIF processing checks passed.\n";
} finally {
	foreach (glob($workDir . '/*') ?: [] as $file) {
		@unlink($file);
	}
	@rmdir($workDir);
}

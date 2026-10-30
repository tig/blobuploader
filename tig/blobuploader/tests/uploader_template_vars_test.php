<?php
/**
 * Source checks for uploader template vars.
 *
 * The listener cannot be constructed outside phpBB, so this reads the PHP
 * sources and asserts the assignments the PM-compose bug depends on.
 *
 * Run: php tig/blobuploader/tests/uploader_template_vars_test.php
 */

function assert_true($condition, $message)
{
	if (!$condition) {
		fwrite(STDERR, "FAIL: $message\n");
		exit(1);
	}
	echo "ok: $message\n";
}

function function_body($source, $functionName)
{
	$pattern = '/function\s+' . preg_quote($functionName, '/') . '\s*\(/';
	if (!preg_match($pattern, $source, $match, PREG_OFFSET_CAPTURE)) {
		fwrite(STDERR, "FAIL: function $functionName not found\n");
		exit(1);
	}

	$start = strpos($source, '{', $match[0][1]);
	if ($start === false) {
		fwrite(STDERR, "FAIL: opening brace for $functionName not found\n");
		exit(1);
	}

	$depth = 0;
	$length = strlen($source);
	for ($i = $start; $i < $length; $i++) {
		if ($source[$i] === '{') {
			$depth++;
		} elseif ($source[$i] === '}') {
			$depth--;
			if ($depth === 0) {
				return substr($source, $start, $i - $start + 1);
			}
		}
	}

	fwrite(STDERR, "FAIL: closing brace for $functionName not found\n");
	exit(1);
}

$listener = file_get_contents(__DIR__ . '/../event/main_listener.php');
assert_true($listener !== false, 'loaded main_listener.php');

assert_true(
	strpos($listener, "'core.page_header'") !== false,
	'listens to core.page_header'
);
assert_true(
	strpos($listener, "'core.posting_modify_default_variables'") !== false,
	'still listens to core.posting_modify_default_variables for posting.php'
);

$header = function_body($listener, 'on_page_header');
assert_true(
	strpos($header, "'ALLOWED_EXTENSIONS'") !== false,
	'on_page_header assigns ALLOWED_EXTENSIONS'
);
assert_true(
	strpos($header, "'MAX_ORIGINAL_WIDTH'") !== false,
	'on_page_header assigns MAX_ORIGINAL_WIDTH'
);
assert_true(
	strpos($header, "'MAX_ORIGINAL_HEIGHT'") !== false,
	'on_page_header assigns MAX_ORIGINAL_HEIGHT'
);

$posting = function_body($listener, 'set_vars_for_uploader');
assert_true(
	strpos($posting, "'ALLOWED_EXTENSIONS'") !== false,
	'set_vars_for_uploader still assigns ALLOWED_EXTENSIONS for posting.php'
);
assert_true(
	strpos($posting, "'MAX_ORIGINAL_WIDTH'") !== false,
	'set_vars_for_uploader still assigns MAX_ORIGINAL_WIDTH for posting.php'
);
assert_true(
	strpos($posting, "'MAX_ORIGINAL_HEIGHT'") !== false,
	'set_vars_for_uploader still assigns MAX_ORIGINAL_HEIGHT for posting.php'
);
assert_true(
	strpos($posting, 'BLOBSTORE_CONNECTIONSTRING') === false,
	'set_vars_for_uploader does not assign BLOBSTORE_CONNECTIONSTRING'
);
assert_true(
	strpos($posting, 'IMAGEPROCESSOR_APPID') === false,
	'set_vars_for_uploader does not assign IMAGEPROCESSOR_APPID'
);

$ucp = file_get_contents(__DIR__ . '/../controller/ucp_controller.php');
assert_true($ucp !== false, 'loaded ucp_controller.php');
assert_true(
	strpos($ucp, 'BLOBSTORE_CONNECTIONSTRING') === false,
	'UCP does not assign BLOBSTORE_CONNECTIONSTRING'
);
assert_true(
	strpos($ucp, 'IMAGEPROCESSOR_APPID') === false,
	'UCP does not assign IMAGEPROCESSOR_APPID'
);

$acp = file_get_contents(__DIR__ . '/../controller/acp_controller.php');
assert_true($acp !== false, 'loaded acp_controller.php');
assert_true(
	strpos($acp, "'BLOBSTORE_CONNECTIONSTRING'") !== false,
	'ACP still assigns BLOBSTORE_CONNECTIONSTRING'
);
assert_true(
	strpos($acp, "'IMAGEPROCESSOR_APPID'") !== false,
	'ACP still assigns IMAGEPROCESSOR_APPID'
);

echo "All uploader template-var checks passed.\n";

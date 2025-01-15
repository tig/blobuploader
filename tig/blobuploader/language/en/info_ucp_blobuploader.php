<?php
/**
 *
 * Blob Uploader. An extension for the phpBB Forum Software package.
 *
 * @copyright (c) 2025, tig, https://github.com/tig
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

if (!defined('IN_PHPBB'))
{
	exit;
}

if (empty($lang) || !is_array($lang))
{
	$lang = [];
}

// DEVELOPERS PLEASE NOTE
//
// All language files should use UTF-8 as their encoding and the files must not contain a BOM.
//
// Placeholders can now contain order information, e.g. instead of
// 'Page %s of %s' you can (and should) write 'Page %1$s of %2$s', this allows
// translators to re-order the output of data while ensuring it remains correct
//
// You do not need this where single placeholders are used, e.g. 'Message %d' is fine
// equally where a string contains only two placeholders which are used to wrap text
// in a url you again do not need to specify an order e.g., 'Click %sHERE%s' is fine
//
// Some characters you may want to copy&paste:
// ’ » “ ” …
//

$lang = array_merge($lang, [
	'UCP_BLOBUPLOADER'				=> 'Settings',
	'UCP_BLOBUPLOADER_TITLE'		=> 'Blob Uploader Module',
	'UCP_BLOBUPLOADER_USER'			=> 'Blob Uploader user',
	'UCP_BLOBUPLOADER_USER_EXPLAIN'	=> 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
	'UCP_BLOBUPLOADER_SAVED'		=> 'Settings have been saved successfully!',
	'NOTIFICATION_TYPE_BLOBUPLOADER'	=> 'Use Blob Uploader notifications',
]);

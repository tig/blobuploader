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
	// Uploader UI
	'BLOGUPLOADER_PANEL_TITLE'			=> 'Uploader',
	'BLOBUPLOADER_UPLOADER_PANEL_EXPLAIN' => 'Here you can upload images.',

	'BLOBUPLOADER_CHOOSE_FILES_EXPLAIN' => 'Click the Choose Files button to select images to upload. You can upload multiple images at once.',
	'BLOBUPLOADER_CHOOSE_FILES' => 'Choose files',

	'BLOBUPLOADER_FILES_EXPLAIN' => 'Click on the thumbnail or the copy button to copy the BBcode to the clipboard for pasting into your post.',
	'BLOBUPLOADER_COPY_ALL_EXPLAIN' => 'Click here to copy the BBcodes for all uploaded images to the clipboard  ',
	'BLOBUPLOADED_FILES' => 'Uploaded files',

    'BLOBUPLOADER_ORIGINAL_PREFIX' => '_original',
    'BLOBUPLOADER_SIZED_PREFIX' => '_sized',
    'BLOBUPLOADER_THUMBNAIL_PREFIX' => '_thumbnail',

	// ACP
	'ACP_BLOBUPLOADER_TITLE'	=> 'Blob Uploader',
	'ACP_BLOBUPLOADER'			=> 'Blob Uploader Settings',

	'LOG_ACP_BLOBUPLOADER_SETTINGS'		=> '<strong>Blob Uploader settings updated</strong>',

	'ACP_BLOBUPLOADER_SETTING_SAVED'	=> 'Blob Uploader settings have been saved successfully!',

	'ACP_BLOBUPLOADER_EXPLAIN_TEXT' => 'Uploader Explaination Text',
    'ACP_BLOBUPLOADER_EXPLAIN_TEXT_EXPLAIN' => 'Text that will be displayed in the uploader explaining policies, etc...',

    'ACP_BLOBUPLOADER_USE_BLOBSERVICE' => 'Use Azure Blob Service',
    'ACP_BLOBUPLOADER_USE_BLOBSERVICE_EXPLAIN' => 'Enable this option to use Azure Blob Storage for file uploads. Disable to use local storage.',
    'ACP_BLOBUPLOADER_IMAGEPROCESSOR_FN_URL' => 'Azure Function URL',
    'ACP_BLOBUPLOADER_IMAGEPROCESSOR_FN_URL_EXPLAIN' => 'The URL of the Azure Function used for processing images.',

    'ACP_BLOBUPLOADER_IMAGEPROCESSOR_APPID' => 'Azure Function App ID',
    'ACP_BLOBUPLOADER_IMAGEPROCESSOR_APPID_EXPLAIN' => 'The App ID of the Azure Function App used for processing images.',
    'ACP_BLOBUPLOADER_BLOBSTORE_CONNECTIONSTRING' => 'Blob Storage Connection String',
    'ACP_BLOBUPLOADER_BLOBSTORE_CONNECTIONSTRING_EXPLAIN' => 'The connection string for the Azure Blob Storage account.',

    'ACP_BLOBUPLOADER_BLOB_MOUNT_DIRECTORY' => 'Blob Sub-Directory',
    'ACP_BLOBUPLOADER_BLOB_MOUNT_DIRECTORY_EXPLAIN' => 'The sub-directory where blobs are uploaded to (e.g. uploads/).',
    'ACP_BLOBUPLOADER_URL_BASE' => 'Blob URL Base',
    'ACP_BLOBUPLOADER_URL_BASE_EXPLAIN' => 'The base URL for accessing blobs (e.g. /images/ or https://mye28.z13.web.core.windows.net/).',
    'ACP_BLOBUPLOADER_ALLOWED_EXTENSIONS' => 'Allowed Extensions',
    'ACP_BLOBUPLOADER_ALLOWED_EXTENSIONS_EXPLAIN' => 'Comma-separated list of allowed file extensions.',
    'ACP_BLOBUPLOADER_WIDTH' => 'Width',
    'ACP_BLOBUPLOADER_HEIGHT' => 'Height',
    'ACP_BLOBUPLOADER_MAX_ORIGINAL_SIZE' => 'Max Original Size',
    'ACP_BLOBUPLOADER_MAX_ORIGINAL_SIZE_EXPLAIN' => 'Maximum width and height for the original image.',
    'ACP_BLOBUPLOADER_SIZED_SIZE' => 'Sized Image Size',
    'ACP_BLOBUPLOADER_SIZED_SIZE_EXPLAIN' => 'Width and height for the sized image.',
    'ACP_BLOBUPLOADER_THUMBNAIL_SIZE' => 'Thumbnail Size',
    'ACP_BLOBUPLOADER_THUMBNAIL_SIZE_EXPLAIN' => 'Width and height for the thumbnail image.',

]);

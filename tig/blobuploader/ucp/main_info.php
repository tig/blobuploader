<?php
/**
 *
 * Blob Uploader. An extension for the phpBB Forum Software package.
 *
 * @copyright (c) 2025, tig, https://github.com/tig
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace tig\blobuploader\ucp;

/**
 * Blob Uploader UCP module info.
 */
class main_info
{
	public function module()
	{
		return [
			'filename'	=> '\tig\blobuploader\ucp\main_module',
			'title'		=> 'UCP_BLOBUPLOADER_TITLE',
			'modes'		=> [
				'settings'	=> [
					'title'	=> 'UCP_BLOBUPLOADER',
					'auth'	=> 'ext_tig/blobuploader',
					'cat'	=> ['UCP_BLOBUPLOADER_TITLE'],
				],
			],
		];
	}
}

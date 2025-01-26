<?php
/**
 *
 * blobuploader. An extension for the phpBB Forum Software package.
 *
 * @copyright (c) 2025
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace tig\blobuploader\ucp;

/**
 * blobuploader UCP module info.
 */
class main_info
{
	public function module()
	{
		return [
			'filename'	=> '\tig\blobuploader\ucp\main_module',
			'title'		=> 'UCP_BLOBUPLOADER_TITLE',
			'modes'		=> [
				'gallery'	=> [
					'title'	=> 'UCP_BLOBLOADER_PHOTO_GALLERY',
					'auth'	=> 'ext_tig/blobuploader',
					'cat'	=> ['UCP_BLOBUPLOADER_TITLE'],
				],
			],
		];
	}
}

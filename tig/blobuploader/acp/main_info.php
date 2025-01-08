<?php
/**
 *
 * Blob Uploader. An extension for the phpBB Forum Software package.
 *
 * @copyright (c) 2025, tig, https://github.com/tig
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace tig\blobuploader\acp;

/**
 * Blob Uploader ACP module info.
 */
class main_info
{
	public function module()
	{
		return [
			'filename'	=> '\tig\blobuploader\acp\main_module',
			'title'		=> 'ACP_BLOBUPLOADER_TITLE',
			'modes'		=> [
				'settings'	=> [
					'title'	=> 'ACP_BLOBUPLOADER',
					'auth'	=> 'ext_tig/blobuploader && acl_a_board',
					'cat'	=> ['ACP_BLOBUPLOADER_TITLE'],
				],
			],
		];
	}
}

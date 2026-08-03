<?php
/**
 *
 * Blob Uploader. An extension for the phpBB Forum Software package.
 *
 * @copyright (c) 2025, tig, https://github.com/tig
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace tig\blobuploader\migrations;

class add_uploader_title extends \phpbb\db\migration\migration
{
	public static function depends_on()
	{
		return ['\tig\blobuploader\migrations\install_data'];
	}

	public function effectively_installed()
	{
		return $this->config->offsetExists('tig_blobuploader_title');
	}

	public function update_data()
	{
		return [
			['config.add', ['tig_blobuploader_title', 'Photo Uploader']],
		];
	}
}

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

class install_acp_module extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		return isset($this->config['tig_blobuploader_goodbye']);
	}

	public static function depends_on()
	{
		return ['\phpbb\db\migration\data\v320\v320'];
	}

	public function update_data()
	{
		return [
			['config.add', ['tig_blobuploader_goodbye', 0]],

			['module.add', [
				'acp',
				'ACP_CAT_DOT_MODS',
				'ACP_BLOBUPLOADER_TITLE'
			]],
			['module.add', [
				'acp',
				'ACP_BLOBUPLOADER_TITLE',
				[
					'module_basename'	=> '\tig\blobuploader\acp\main_module',
					'modes'				=> ['settings'],
				],
			]],
		];
	}
}

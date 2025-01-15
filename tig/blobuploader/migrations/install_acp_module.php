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
		//error_log('install_acp_module.php: effectively_installed() : ' . $this->config['tig_blobuploader_mount_dir']);
		return isset($this->config['tig_blobuploader_mount_dir']);
	}

	public static function depends_on()
	{
		return ['\phpbb\db\migration\data\v320\v320'];
	}

	public function update_data()
	{
		//error_log('install_acp_module.php: update_data()');
		return [
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

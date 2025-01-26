<?php
/**
 *
 * blobuploader. An extension for the phpBB Forum Software package.
 *
 * @copyright (c) 2025
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace tig\blobuploader\migrations;

class install_ucp_module extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		error_log('install_ucp_module.php: effectively_installed() : ' . $this->config['tig_blobuploader_mount_dir']);
		return isset($this->config['tig_blobuploader_mount_dir']);
	}

	public static function depends_on()
	{
		error_log('install_ucp_module.php: depends_on()');
		return ['\phpbb\db\migration\data\v320\v320'];
	}

	public function update_data()
	{
		error_log('install_ucp_module.php: update_data()');
		return [
			['module.add', [
				'ucp',
				0,
				'UCP_BLOBUPLOADER_TITLE'
			]],
			['module.add', [
				'ucp',
				'UCP_BLOBUPLOADER_TITLE',
				[
					'module_basename'	=> '\tig\blobuploader\ucp\main_module',
					'modes'				=> ['gallery'],
				],
			]],
		];
	}
}

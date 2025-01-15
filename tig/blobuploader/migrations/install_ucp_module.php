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

class install_ucp_module extends \phpbb\db\migration\migration
{
	public function effectively_installed()
	{
		$sql = 'SELECT module_id
			FROM ' . $this->table_prefix . "modules
			WHERE module_class = 'ucp'
				AND module_langname = 'UCP_BLOBUPLOADER_TITLE'";
		$result = $this->db->sql_query($sql);
		$module_id = $this->db->sql_fetchfield('module_id');
		$this->db->sql_freeresult($result);

		return $module_id !== false;
	}

	public static function depends_on()
	{
		return ['\tig\blobuploader\migrations\install_sample_schema'];
	}

	public function update_data()
	{
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
					'modes'				=> ['settings'],
				],
			]],
		];
	}
}

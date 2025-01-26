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
 * blobuploader UCP module.
 */
class main_module
{
	public $page_title;
	public $tpl_name;
	public $u_action;

	/**
	 * Main UCP module
	 *
	 * @param int    $id   The module ID
	 * @param string $mode The module mode (for example: manage or settings)
	 * @throws \Exception
	 */
	public function main($id, $mode)
	{
		global $phpbb_container;

		/** @var \tig\blobuploader\controller\ucp_controller $ucp_controller */
		$ucp_controller = $phpbb_container->get('tig.blobuploader.controller.ucp');

		// Load a template for our UCP page
		$this->tpl_name = 'ucp_blobuploader_body';

		// Set the page title for our UCP page
		$this->page_title = 'UCP_BLOBUPLOADER_TITLE';

		// Make the $u_action url available in our UCP controller
		$ucp_controller->set_page_url($this->u_action);

		// Load the display options handle in our UCP controller
		$ucp_controller->display_options();
	}
}

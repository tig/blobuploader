<?php
/**
 *
 * blobuploader. An extension for the phpBB Forum Software package.
 *
 * @copyright (c) 2025
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace tig\blobuploader\controller;

/**
 * blobuploader UCP controller.
 */
class ucp_controller
{
	/** @var \phpbb\db\driver\driver_interface */
	protected $db;

	/** @var \phpbb\language\language */
	protected $language;

	/** @var \phpbb\request\request */
	protected $request;

	/** @var \phpbb\template\template */
	protected $template;

	/** @var \phpbb\user */
	protected $user;

	/** @var string Custom form action */
	protected $u_action;

	/** @var \phpbb\config\config */
	protected $config;

	/**
	 * Constructor.
	 *
	 * @param \phpbb\db\driver\driver_interface	$db			Database object
	 * @param \phpbb\language\language			$language	Language object
	 * @param \phpbb\request\request			$request	Request object
	 * @param \phpbb\template\template			$template	Template object
	 * @param \phpbb\user						$user		User object
	 * @param \phpbb\config\config				$config		Config object
	 */
	public function __construct(
		\phpbb\db\driver\driver_interface $db, 
		\phpbb\language\language $language, 
		\phpbb\request\request $request, 
		\phpbb\template\template $template, 
		\phpbb\user $user,
		\phpbb\config\config $config)
	{
		$this->db		= $db;
		$this->language	= $language;
		$this->request	= $request;
		$this->template	= $template;
		$this->user		= $user;
		$this->config 	= $config;
	}

	/**
	 * Display the options a user can configure for this extension.
	 *
	 * @return void
	 */
	public function display_options()
	{
		// Create a form key for preventing CSRF attacks
		add_form_key('tig_blobuploader_ucp');

		// Create an array to collect errors that will be output to the user
		$errors = [];

		// Request the options the user can configure
		$data = [
			'user_blobuploader' => $this->request->variable('user_blobuploader', $this->user->data['user_blobuploader']),
		];

		// Is the form being submitted to us?
		if ($this->request->is_set_post('submit'))
		{
			// // Test if the submitted form is valid
			// if (!check_form_key('tig_blobuploader_ucp'))
			// {
			// 	$errors[] = $this->language->lang('FORM_INVALID');
			// }

			// // If no errors, process the form data
			// if (empty($errors))
			// {
			// 	// Set the options the user configured
			// 	$sql = 'UPDATE ' . USERS_TABLE . '
			// 		SET ' . $this->db->sql_build_array('UPDATE', $data) . '
			// 		WHERE user_id = ' . (int) $this->user->data['user_id'];
			// 	$this->db->sql_query($sql);

			// 	// Option settings have been updated
			// 	// Confirm this to the user and provide (automated) link back to previous page
			// 	meta_refresh(3, $this->u_action);
			// 	$message = $this->language->lang('UCP_BLOBUPLOADER_SAVED') . '<br /><br />' . $this->language->lang('RETURN_UCP', '<a href="' . $this->u_action . '">', '</a>');
			// 	trigger_error($message);
			// }
		}

		$s_errors = !empty($errors);

		// Set output variables for display in the template
		$this->template->assign_vars([
			'S_ERROR'		=> $s_errors,
			'ERROR_MSG'		=> $s_errors ? implode('<br />', $errors) : '',

			'U_UCP_ACTION'	=> $this->u_action,

            'IMAGEPROCESSOR_FN_URL' => $this->config['tig_imageprocessor_fn_url'],

            'BLOBSTORE_CONNECTIONSTRING' => $this->config['tig_blobstore_connectionstring'],
            'BLOBSTORE_SAS_URL' => $this->config['tig_blobstore_sas_url'],

			'USER_ID'		=> $this->user->data['user_id'],
           
		]);
	}

	/**
	 * Set custom form action.
	 *
	 * @param string	$u_action	Custom form action
	 * @return void
	 */
	public function set_page_url($u_action)
	{
		$this->u_action = $u_action;
	}
}

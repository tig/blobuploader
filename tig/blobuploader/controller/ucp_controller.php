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

use tig\blobuploader\helpers\RecentPhotos;

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

		$this->language->add_lang('common', 'tig/blobuploader');

		$errors = [];
		$s_errors = !empty($errors);

		// Local/mount mode is the live path (tig_use_blob_service=0).
		// Config is a string — cast so Twig {% if USE_BLOB_SERVICE %} is reliable.
		$use_blob = ((int) $this->config['tig_use_blob_service']) === 1;
		$user_id = (int) $this->user->data['user_id'];
		$user_photos = [];

		if (!$use_blob)
		{
			$user_photos = RecentPhotos::list_for_user(
				$user_id,
				$this->config['tig_blobuploader_url_base'],
				$this->config['tig_blobuploader_mount_dir']
			);
		}

		$photo_count = count($user_photos);

		// Set output variables for display in the template
		$this->template->assign_vars([
			'S_ERROR'		=> $s_errors,
			'ERROR_MSG'		=> $s_errors ? implode('<br />', $errors) : '',

			'U_UCP_ACTION'	=> $this->u_action,

			'IMAGEPROCESSOR_FN_URL' => $this->config['tig_imageprocessor_fn_url'],

			'BLOBSTORE_CONNECTIONSTRING' => $this->config['tig_blobstore_connectionstring'],
			'BLOBSTORE_SAS_URL' => $this->config['tig_blobstore_sas_url'],
			'URL_BASE' => $this->config['tig_blobuploader_url_base'],

			'USER_ID'		=> $user_id,

			// Local-mode gallery (server-rendered; mirrors ACP recent photos)
			'USE_BLOB_SERVICE' => $use_blob,
			'S_LOCAL_GALLERY' => !$use_blob,
			'S_HAS_USER_PHOTOS' => !empty($user_photos),
			'PHOTO_COUNT' => $photo_count,
			'GALLERY_EXPLAIN' => $this->language->lang('UCP_BLOBLOADER_PHOTO_GALLERY_EXPLAIN', $photo_count),
			'L_COPY_BBCODE' => $this->language->lang('UCP_BLOBLOADER_COPY_BBCODE'),
			'L_COPIED' => $this->language->lang('UCP_BLOBLOADER_COPIED'),
		]);

		foreach ($user_photos as $photo)
		{
			$this->template->assign_block_vars('user_photos', [
				'THUMBNAIL' => $photo['thumbnail'] ?? '',
				'ORIGINAL'  => $photo['original'] ?? '',
				'SIZED'     => $photo['sized'] ?? '',
			]);
		}
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

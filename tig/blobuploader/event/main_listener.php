<?php
/**
 *
 * Blob Uploader. An extension for the phpBB Forum Software package.
 *
 * @copyright (c) 2025, tig, https://github.com/tig
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace tig\blobuploader\event;

/**
 * @ignore
 */
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use tig\blobuploader\helpers\RecentPhotos;

/**
 * Blob Uploader Event listener.
 */
class main_listener implements EventSubscriberInterface
{
	/** @var config */
	protected $config;

	/** @var db_text */
	protected $config_text;

	/* @var \phpbb\language\language */
	protected $language;

	/* @var \phpbb\controller\helper */
	protected $helper;

	/* @var \phpbb\template\template */
	protected $template;

	/** @var string phpEx */
	protected $php_ext;

	/** @var \phpbb\request\request */
	protected $request;

	/**
	 * Constructor
	 *
	 * @param \phpbb\language\language	$language	Language object
	 * @param \phpbb\controller\helper	$helper		Controller helper object
	 * @param \phpbb\template\template	$template	Template object
	 * @param string                    $php_ext    phpEx
	 */
	public function __construct(
        \phpbb\config\config $config,
        $config_text,	
		\phpbb\language\language $language, 
		\phpbb\controller\helper $helper, 
		\phpbb\template\template $template, 
		$php_ext,
        \phpbb\request\request $request,
		)
	{
		$this->language = $language;
        $this->config = $config;
        $this->config_text = $config_text;
		$this->helper   = $helper;
		$this->template = $template;
		$this->php_ext  = $php_ext;
        $this->request = $request;
	}

	public static function getSubscribedEvents()
	{
		return [
			'core.user_setup'  					=> 'load_language_on_setup',
			'core.page_header' 					=> 'on_page_header',
			'core.posting_modify_message_text' 	=> 'handle_preview',
			'core.posting_modify_default_variables' => 'set_vars_for_uploader',
			'core.memberlist_view_profile'		=> 'on_view_profile',
		];
	}

	
    public function handle_preview ($event) 
    {
        $preview = $event['preview'];
        $uploadedFiles = $this->request->variable('tig_blobuploader_uploaded_files', '', true);

		if ($preview === false) {
            return;
        }
        $this->template->assign_vars([
            'TIG_BLOBUPLOADER_UPLOADED_FILES' => $uploadedFiles ,
        ]);
   }

    /**
     * Event handler for the core.page_header event.
     *
     * @param \phpbb\event\data $event The event object
     */
    public function on_page_header($event)
    {
        // Retrieve the explain text from config_text
        $explain_text = $this->config_text->get('tig_blobuploader_explain_text', '');
        $title = $this->config['tig_blobuploader_title'] ?? '';
        if ($title === '' || $title === null)
        {
            $title = $this->language->lang('BLOGUPLOADER_PANEL_TITLE');
        }

        // Assign uploader UI strings to the template
        $this->template->assign_vars([
            'EXPLAIN_TEXT' => $explain_text,
            'UPLOADER_TITLE' => $title,
        ]);
    }

	/**
	 * Load common language files during user setup
	 *
	 * @param \phpbb\event\data	$event	Event object
	 */
	public function load_language_on_setup($event)
	{
		$lang_set_ext = $event['lang_set_ext'];
		$lang_set_ext[] = [
			'ext_name' => 'tig/blobuploader',
			'lang_set' => 'common',
		];
		$event['lang_set_ext'] = $lang_set_ext;

	}

	/**
	 * Event listener for core.posting_layout event
	 *
	 * @param \phpbb\event\data $event
	 */
	public function set_vars_for_uploader($event){

		$this->template->assign_vars([
            'BLOB_MOUNT_DIRECTORY' => $this->config['tig_blobuploader_mount_dir'],

			'USE_BLOB_SERVICE' => $this->config['tig_use_blob_service'],
            'IMAGEPROCESSOR_FN_URL' => $this->config['tig_imageprocessor_fn_url'],
            'IMAGEPROCESSOR_APPID' => $this->config['tig_imageprocessor_appid'],

            'BLOBSTORE_CONNECTIONSTRING' => $this->config['tig_blobstore_connectionstring'],
            
            'URL_BASE' => $this->config['tig_blobuploader_url_base'],

            'ALLOWED_EXTENSIONS' => $this->config['tig_blobuploader_allowed_extensions'],
            'MAX_ORIGINAL_WIDTH' => $this->config['tig_blobuploader_max_original_width'],
            'MAX_ORIGINAL_HEIGHT' => $this->config['tig_blobuploader_max_original_height'],
            'SIZED_WIDTH' => $this->config['tig_blobuploader_sized_width'],
            'SIZED_HEIGHT' => $this->config['tig_blobuploader_sized_height'],
            'THUMBNAIL_WIDTH' => $this->config['tig_blobuploader_thumbnail_width'],
            'THUMBNAIL_HEIGHT' => $this->config['tig_blobuploader_thumbnail_height'],
        ]);
	}

	/**
	 * Show a member's uploaded photos on their profile (below signature).
	 * Local/mount mode only — mirrors UCP gallery listing.
	 *
	 * @param \phpbb\event\data $event
	 */
	public function on_view_profile($event)
	{
		// Config is a string — cast so Twig {% if %} is reliable
		$use_blob = ((int) $this->config['tig_use_blob_service']) === 1;
		if ($use_blob)
		{
			$this->template->assign_vars([
				'S_BLOBUPLOADER_PROFILE_GALLERY' => false,
			]);
			return;
		}

		$member = $event['member'];
		$user_id = (int) ($member['user_id'] ?? 0);
		if ($user_id < 1)
		{
			$this->template->assign_vars([
				'S_BLOBUPLOADER_PROFILE_GALLERY' => false,
			]);
			return;
		}

		$photos = RecentPhotos::list_for_user(
			$user_id,
			$this->config['tig_blobuploader_url_base'],
			$this->config['tig_blobuploader_mount_dir']
		);

		if (empty($photos))
		{
			$this->template->assign_vars([
				'S_BLOBUPLOADER_PROFILE_GALLERY' => false,
			]);
			return;
		}

		$photo_count = count($photos);

		$this->template->assign_vars([
			'S_BLOBUPLOADER_PROFILE_GALLERY' => true,
			'PROFILE_GALLERY_EXPLAIN' => $this->language->lang('UCP_BLOBLOADER_PHOTO_GALLERY_EXPLAIN', $photo_count),
			'L_COPY_BBCODE' => $this->language->lang('UCP_BLOBLOADER_COPY_BBCODE'),
			'L_COPIED' => $this->language->lang('UCP_BLOBLOADER_COPIED'),
		]);

		foreach ($photos as $photo)
		{
			$this->template->assign_block_vars('profile_photos', [
				'THUMBNAIL' => $photo['thumbnail'] ?? '',
				'ORIGINAL'  => $photo['original'] ?? '',
				'SIZED'     => $photo['sized'] ?? '',
			]);
		}
	}
}

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

		//error_log('main_listener.php: __construct()');
	}

	public static function getSubscribedEvents()
	{
		return [
			'core.user_setup'  					=> 'load_language_on_setup',
			'core.page_header' 					=> 'on_page_header',
			'core.posting_modify_message_text' 	=> 'handle_preview'
		];
	}

	
    public function handle_preview ($event) 
    {
        error_log('handle_preview');
        $preview = $event['preview'];
        error_log('preview: ' . $preview);

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

        // Assign the explain text to the template
        $this->template->assign_vars([
            'EXPLAIN_TEXT' => $explain_text,
        ]);
    }

	/**
	 * Load common language files during user setup
	 *
	 * @param \phpbb\event\data	$event	Event object
	 */
	public function load_language_on_setup($event)
	{
		//error_log('main_listener.php: load_language_on_setup()');
		$lang_set_ext = $event['lang_set_ext'];
		$lang_set_ext[] = [
			'ext_name' => 'tig/blobuploader',
			'lang_set' => 'common',
		];
		$event['lang_set_ext'] = $lang_set_ext;

	}
}

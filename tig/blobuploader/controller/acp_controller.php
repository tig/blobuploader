<?php
/**
 *
 * Blob Uploader. An extension for the phpBB Forum Software package.
 *
 * @copyright (c) 2025, tig, https://github.com/tig
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace tig\blobuploader\controller;

/**
 * Blob Uploader ACP controller.
 */
class acp_controller
{
    /** @var \phpbb\config\config */
    protected $config;

    /** @var db_text */
    protected $config_text;

    /** @var \phpbb\language\language */
    protected $language;

    /** @var \phpbb\log\log */
    protected $log;

    /** @var \phpbb\request\request */
    protected $request;

    /** @var \phpbb\template\template */
    protected $template;

    /** @var \phpbb\user */
    protected $user;

    /** @var string Custom form action */
    protected $u_action;

    /**
     * Constructor.
     *
     * @param \phpbb\config\config $config Config object
     * @param \phpbb\language\language $language Language object
     * @param \phpbb\log\log $log Log object
     * @param \phpbb\request\request $request Request object
     * @param \phpbb\template\template $template Template object
     * @param \phpbb\user $user User object
     */
    public function __construct(
        \phpbb\config\config $config,
        $config_text,
        \phpbb\language\language $language,
        \phpbb\log\log $log,
        \phpbb\request\request $request,
        \phpbb\template\template $template,
        \phpbb\user $user
    ) {
        $this->config = $config;
        $this->config_text = $config_text;
        $this->language = $language;
        $this->log = $log;
        $this->request = $request;
        $this->template = $template;
        $this->user = $user;

        //error_log('acp_controller:__construct()');

    }

    /**
     * Display the options a user can configure for this extension.
     *
     * @return void
     */
    public function display_options()
    {
        $current_explain_text = $this->config_text->get('tig_blobuploader_explain_text', $this->config['tig_blobuploader_explain_text']);

        //error_log('display_options()');

        // Add our common language file
        $this->language->add_lang('common', 'tig/blobuploader');

        // Create a form key for preventing CSRF attacks
        add_form_key('tig_blobuploader_acp');

        // Create an array to collect errors that will be output to the user
        $errors = [];

        // Is the form being submitted to us?
        if ($this->request->is_set_post('submit'))
        {
            // Test if the submitted form is valid
            if (!check_form_key('tig_blobuploader_acp'))
            {
                $errors[] = $this->language->lang('FORM_INVALID');
            }

            // If no errors, process the form data
            if (empty($errors))
            {
                // Set the options the user configured, using defaults if not provided

                $this->config_text->set('tig_blobuploader_explain_text', $this->request->variable('explain_text', $current_explain_text));
                $this->config->set('tig_blobuploader_url_base', $this->request->variable('url_base', $this->config['tig_blobuploader_url_base']));
                $this->config->set('tig_blobuploader_allowed_extensions', $this->request->variable('allowed_extensions', $this->config['tig_blobuploader_allowed_extensions']));
                $this->config->set('tig_blobuploader_max_original_width', $this->request->variable('max_original_width', $this->config['tig_blobuploader_max_original_width']));
                $this->config->set('tig_blobuploader_max_original_height', $this->request->variable('max_original_height', $this->config['tig_blobuploader_max_original_height']));
                $this->config->set('tig_blobuploader_sized_width', $this->request->variable('sized_width', $this->config['tig_blobuploader_sized_width']));
                $this->config->set('tig_blobuploader_sized_height', $this->request->variable('sized_height', $this->config['tig_blobuploader_sized_height']));
                $this->config->set('tig_blobuploader_thumbnail_width', $this->request->variable('thumbnail_width', $this->config['tig_blobuploader_thumbnail_width']));
                $this->config->set('tig_blobuploader_thumbnail_height', $this->request->variable('thumbnail_height', $this->config['tig_blobuploader_thumbnail_height']));

                // Add option settings change action to the admin log
                $this->log->add('admin', $this->user->data['user_id'], $this->user->ip, 'LOG_ACP_BLOBUPLOADER_SETTINGS');

                // Option settings have been updated and logged
                // Confirm this to the user and provide link back to previous page
                trigger_error($this->language->lang('ACP_BLOBUPLOADER_SETTING_SAVED'));
            }
        }

        $s_errors = !empty($errors);

        // Set output variables for display in the template
        $current_explain_text = $this->config_text->get('tig_blobuploader_explain_text', $this->config['tig_blobuploader_explain_text']);
        $this->template->assign_vars([
            'S_ERROR' => $s_errors,
            'ERROR_MSG' => $s_errors ? implode('<br />', $errors) : '',

            'BLOB_MOUNT_DIRECTORY' => $this->config['tig_blobuploader_mount_dir'],

            //error_log('BLOB_MOUNT_DIRECTORY: ' . $this->config['tig_blobuploader_mount_dir']),

            'EXPLAIN_TEXT' => $current_explain_text,
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

    public function get_config_text_value($key)
    {
        // Load config_text value dynamically
        $value = $this->config[$key];
        return $value ?: null;
    }
}
<?php
/**
 *
 * Blob Uploader. An extension for the phpBB Forum Software package.
 *
 * @copyright (c) 2025, tig, https://github.com/tig
 * @license GNU General Public License, version 2 (GPL-2.0)
 *
 */

namespace tig\blobuploader\helpers;

/**
 * Maintains a small JSON index of recent local-mode thumbnails for ACP/UCP
 * galleries. Azure/blob-service mode still uses the SAS list API in JS.
 *
 * Full directory walks over FUSE/rclone mounts are too slow for a web request,
 * so we:
 *  - append on every successful local upload
 *  - optionally seed with a time-budgeted scan of user folders
 */
class RecentPhotos
{
	const INDEX_BASENAME = 'blobuploader_recent.json';
	const DEFAULT_LIMIT = 100;

	/**
	 * Absolute path to the index file under phpBB store/.
	 */
	public static function index_path()
	{
		global $phpbb_root_path;
		return rtrim($phpbb_root_path, '/') . '/store/' . self::INDEX_BASENAME;
	}

	/**
	 * Filesystem root for uploads (e.g. /var/www/html/phpbb/images/uploads/).
	 *
	 * @param string $url_base  e.g. /images/
	 * @param string $mount_dir e.g. uploads/
	 */
	public static function uploads_fs_root($url_base, $mount_dir)
	{
		global $phpbb_root_path;
		$base = ltrim((string) $url_base, '/');
		$mount = trim((string) $mount_dir, '/') . '/';
		return rtrim($phpbb_root_path, '/') . '/' . $base . $mount;
	}

	/**
	 * Public URL prefix for uploads (e.g. /images/uploads/).
	 */
	public static function uploads_url_prefix($url_base, $mount_dir)
	{
		$base = '/' . trim((string) $url_base, '/') . '/';
		$mount = trim((string) $mount_dir, '/') . '/';
		return $base . $mount;
	}

	/**
	 * @return array<int, array{thumbnail:string,original:string,mtime:int}>
	 */
	public static function read($limit = self::DEFAULT_LIMIT)
	{
		$path = self::index_path();
		if (!is_readable($path))
		{
			return [];
		}
		$raw = @file_get_contents($path);
		if ($raw === false || $raw === '')
		{
			return [];
		}
		$data = json_decode($raw, true);
		if (!is_array($data))
		{
			return [];
		}
		return array_slice($data, 0, (int) $limit);
	}

	/**
	 * Prepend one photo and keep the newest $limit entries.
	 */
	public static function prepend($thumbnail_url, $original_url, $limit = self::DEFAULT_LIMIT)
	{
		$items = self::read($limit);
		$entry = [
			'thumbnail' => $thumbnail_url,
			'original'  => $original_url,
			'mtime'     => time(),
		];
		// Drop duplicate thumbnail URL if re-uploaded
		$items = array_values(array_filter($items, function ($row) use ($thumbnail_url) {
			return !isset($row['thumbnail']) || $row['thumbnail'] !== $thumbnail_url;
		}));
		array_unshift($items, $entry);
		$items = array_slice($items, 0, (int) $limit);
		self::write($items);
	}

	/**
	 * @param array $items
	 */
	public static function write(array $items)
	{
		$path = self::index_path();
		$dir = dirname($path);
		if (!is_dir($dir))
		{
			return;
		}
		$json = json_encode(array_values($items), JSON_UNESCAPED_SLASHES);
		if ($json === false)
		{
			return;
		}
		@file_put_contents($path, $json, LOCK_EX);
	}

	/**
	 * List one user's local thumbnails (UCP gallery).
	 * Single-directory glob is cheap even on rclone/FUSE.
	 *
	 * @param int    $user_id
	 * @param string $url_base
	 * @param string $mount_dir
	 * @param int    $limit  0 = no limit
	 * @return array<int, array{thumbnail:string,original:string,sized:string,mtime:int}>
	 */
	public static function list_for_user($user_id, $url_base, $mount_dir, $limit = 0)
	{
		$user_id = (int) $user_id;
		if ($user_id < 1)
		{
			return [];
		}

		$fs_root = self::uploads_fs_root($url_base, $mount_dir);
		$url_prefix = self::uploads_url_prefix($url_base, $mount_dir);
		$user_dir = rtrim($fs_root, '/') . '/' . $user_id;

		if (!is_dir($user_dir))
		{
			return [];
		}

		$thumbs = @glob($user_dir . '/*_thumbnail.*') ?: [];
		$items = [];

		foreach ($thumbs as $path)
		{
			if (!is_file($path))
			{
				continue;
			}
			$base = basename($path);
			$orig = str_replace('_thumbnail', '_original', $base);
			$sized = str_replace('_thumbnail', '_sized', $base);
			$items[] = [
				'thumbnail' => $url_prefix . $user_id . '/' . $base,
				'original'  => $url_prefix . $user_id . '/' . $orig,
				'sized'     => $url_prefix . $user_id . '/' . $sized,
				'mtime'     => (int) (@filemtime($path) ?: 0),
			];
		}

		if (empty($items))
		{
			return [];
		}

		usort($items, function ($a, $b) {
			return $b['mtime'] <=> $a['mtime'];
		});

		if ($limit > 0)
		{
			$items = array_slice($items, 0, (int) $limit);
		}

		return $items;
	}

	/**
	 * Budgeted scan of local user folders to (re)build the index.
	 * Safe for ACP: stops after $time_budget seconds.
	 *
	 * @return array photos found (also written to index when non-empty)
	 */
	public static function seed_from_filesystem($url_base, $mount_dir, $limit = self::DEFAULT_LIMIT, $time_budget = 4.0)
	{
		$fs_root = self::uploads_fs_root($url_base, $mount_dir);
		$url_prefix = self::uploads_url_prefix($url_base, $mount_dir);

		if (!is_dir($fs_root))
		{
			return [];
		}

		$start = microtime(true);
		$items = [];

		// Plain scandir (no mtime sort) is relatively cheap on rclone VFS.
		$users = @scandir($fs_root);
		if (!is_array($users))
		{
			return [];
		}

		foreach ($users as $user_id)
		{
			if (!ctype_digit((string) $user_id))
			{
				continue;
			}
			if ((microtime(true) - $start) > $time_budget)
			{
				break;
			}

			$user_dir = $fs_root . $user_id;
			if (!is_dir($user_dir))
			{
				continue;
			}

			// Prefer glob (one readdir) over RecursiveIterator on FUSE
			$thumbs = @glob($user_dir . '/*_thumbnail.*') ?: [];
			foreach ($thumbs as $path)
			{
				if (!is_file($path))
				{
					continue;
				}
				$base = basename($path);
				$orig = str_replace('_thumbnail', '_original', $base);
				$items[] = [
					'thumbnail' => $url_prefix . $user_id . '/' . $base,
					'original'  => $url_prefix . $user_id . '/' . $orig,
					'mtime'     => (int) (@filemtime($path) ?: 0),
				];
			}
		}

		if (empty($items))
		{
			return [];
		}

		usort($items, function ($a, $b) {
			return $b['mtime'] <=> $a['mtime'];
		});
		$items = array_slice($items, 0, (int) $limit);
		self::write($items);
		return $items;
	}
}

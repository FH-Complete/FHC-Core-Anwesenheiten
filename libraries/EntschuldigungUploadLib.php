<?php
if (!defined('BASEPATH')) exit('No direct script access allowed');

/**
 * Checks the document upload of an Entschuldigung and explains a failed upload to the user.
 *
 * The messages use phrases of the category 'global', the calling controller must load this category.
 */
class EntschuldigungUploadLib
{
	// allowed file extensions of Entschuldigung documents, the upload and the frontend file input use this list
	const ALLOWED_FILETYPES = array('pdf', 'jpg', 'jpeg', 'png');

	private $_ci;

	public function __construct()
	{
		$this->_ci =& get_instance();
		$this->_ci->load->helper('hlp_language');
	}

	/**
	 * Returns the size in bytes of the largest file PHP accepts, 0 if PHP sets no limit.
	 */
	public function getMaxFileSize()
	{
		$limits = array_filter(
			array(
				$this->_iniToBytes(ini_get('upload_max_filesize')),
				$this->_iniToBytes(ini_get('post_max_size'))
			),
			function ($limit) { return $limit > 0; }
		);

		return empty($limits) ? 0 : min($limits);
	}

	/**
	 * PHP drops $_POST and $_FILES of a request larger than post_max_size, the endpoint then only sees
	 * missing parameters. Call this before the parameter checks.
	 *
	 * Returns the error message for a request that is too large, else null.
	 */
	public function checkRequestSize($context)
	{
		$postMaxSize = $this->_iniToBytes(ini_get('post_max_size'));
		$contentLength = $this->_getContentLength();

		if ($postMaxSize <= 0 || $contentLength <= $postMaxSize) return null;

		$this->_log($context, 'request_too_large');

		return $this->_getFileTooLargeMessage($contentLength);
	}

	/**
	 * Finds the reason of a failed DmsLib upload, writes it to the webservicelog and returns the message for the user.
	 * The toast of the frontend renders the message as html, so every value from the file name is escaped.
	 */
	public function handleUploadError($dmsResult, $context, $fieldName = 'files')
	{
		$file = isset($_FILES[$fieldName]) ? $_FILES[$fieldName] : null;
		$reason = $this->_getFailureReason($file);
		$logId = $this->_log($context, $reason, $file, $dmsResult);

		switch ($reason)
		{
			case 'too_large':
				// PHP reports the size 0 for a file above upload_max_filesize, the request size is close to the file size
				return $this->_getFileTooLargeMessage($this->_getContentLength());
			case 'partial':
				return $this->_ci->p->t('global', 'errorEntUploadPartial');
			case 'no_file':
				return $this->_ci->p->t('global', 'errorEntUploadNoFile');
			case 'filetype':
				return $this->_ci->p->t('global', 'errorEntUploadFiletype', array(
					'file' => $this->_escape($file['name']),
					'filetypes' => $this->_getFiletypesLabel()
				));
			case 'empty':
				return $this->_ci->p->t('global', 'errorEntUploadEmptyFile', array(
					'file' => $this->_escape($file['name'])
				));
			case 'content':
				return $this->_ci->p->t('global', 'errorEntUploadContent', array(
					'file' => $this->_escape($file['name']),
					'type' => $this->_escape(strtoupper($this->_getExtension($file['name']))),
					'filetypes' => $this->_getFiletypesLabel()
				));
			default:
				return $this->_ci->p->t('global', 'errorEntUploadTechnical', array(
					'reference' => $logId !== null ? $logId : '-'
				));
		}
	}

	/**
	 * Returns the reason of a failed upload: no_file, too_large, partial, filetype, empty, content or server.
	 * The checks follow the order of CI_Upload::do_upload, so the first check that fails in CodeIgniter
	 * also gives the reason here.
	 */
	private function _getFailureReason($file)
	{
		if ($file === null) return 'no_file';

		if (!is_dir(DMS_PATH) || !is_writable(DMS_PATH)) return 'server';

		switch ($file['error'])
		{
			case UPLOAD_ERR_OK:
				break;
			case UPLOAD_ERR_INI_SIZE:
			case UPLOAD_ERR_FORM_SIZE:
				return 'too_large';
			case UPLOAD_ERR_PARTIAL:
				return 'partial';
			case UPLOAD_ERR_NO_FILE:
				return 'no_file';
			default:
				// UPLOAD_ERR_NO_TMP_DIR, UPLOAD_ERR_CANT_WRITE, UPLOAD_ERR_EXTENSION
				return 'server';
		}

		$extension = $this->_getExtension($file['name']);

		if (!in_array($extension, self::ALLOWED_FILETYPES, true)) return 'filetype';

		if ($file['size'] == 0) return 'empty';

		if (!$this->_isContentValid($file['tmp_name'], $extension)) return 'content';

		// the file passes all checks, so saving the file or the dms entry failed
		return 'server';
	}

	/**
	 * Repeats the content checks of CI_Upload::is_allowed_filetype: an image must be readable
	 * and the detected MIME type must match the file extension.
	 */
	private function _isContentValid($path, $extension)
	{
		$imageTypes = array('gif', 'jpg', 'jpeg', 'jpe', 'png', 'webp');
		if (in_array($extension, $imageTypes, true) && @getimagesize($path) === false) return false;

		$mimeType = $this->_detectMimeType($path);

		// without the fileinfo extension this check is not possible, the failure then counts as server problem
		if ($mimeType === null) return true;

		$mimes = get_mimes();

		return isset($mimes[$extension]) && in_array($mimeType, (array)$mimes[$extension], true);
	}

	/**
	 * Detects the MIME type the same way as CI_Upload::_file_mime_type with the fileinfo extension.
	 * Returns null if the detection is not possible.
	 */
	private function _detectMimeType($path)
	{
		if (!function_exists('finfo_file')) return null;

		$finfo = @finfo_open(FILEINFO_MIME);
		if ($finfo === false) return null;

		$mimeType = @finfo_file($finfo, $path);

		if (is_string($mimeType) && preg_match('/^([a-z\-]+\/[a-z0-9\-\.\+]+)(;\s.+)?$/', $mimeType, $matches))
			return $matches[1];

		return null;
	}

	/**
	 * Same result as CI_Upload::get_extension: the text after the last dot in lower case, without the dot.
	 */
	private function _getExtension($fileName)
	{
		$parts = explode('.', $fileName);

		return count($parts) > 1 ? strtolower(end($parts)) : '';
	}

	private function _getFiletypesLabel()
	{
		return implode(', ', array_map('strtoupper', self::ALLOWED_FILETYPES));
	}

	/**
	 * Explicit flags give the same result on PHP 7.0 and 8.x. Without ENT_SUBSTITUTE, PHP 7.0 returns an empty
	 * string for a file name with invalid UTF-8.
	 */
	private function _escape($text)
	{
		return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
	}

	private function _getFileTooLargeMessage($fileSize)
	{
		return $this->_ci->p->t('global', 'errorEntUploadFileTooLarge', array(
			// round the file size up and the limit down, so a file above the limit never shows the same number
			'size' => $this->_formatMegabytes($fileSize, true),
			'max' => $this->_formatMegabytes($this->getMaxFileSize(), false)
		));
	}

	/**
	 * Formats bytes as megabytes with one decimal place at most, for example 8 or 8,5.
	 */
	private function _formatMegabytes($bytes, $roundUp)
	{
		$tenths = $bytes / 1048576 * 10;
		$megabytes = ($roundUp ? ceil($tenths) : floor($tenths)) / 10;
		$decimalSeparator = getUserLanguage() == 'German' ? ',' : '.';
		$decimals = floor($megabytes) == $megabytes ? 0 : 1;

		return number_format($megabytes, $decimals, $decimalSeparator, '');
	}

	private function _getContentLength()
	{
		return (int)$this->_ci->input->server('CONTENT_LENGTH');
	}

	/**
	 * Converts a size value of the php.ini, for example 8M, 512K or 1G, into bytes.
	 */
	private function _iniToBytes($value)
	{
		$value = trim((string)$value);
		$units = array('K' => 1024, 'M' => 1048576, 'G' => 1073741824);
		$unit = strtoupper(substr($value, -1));

		return (int)$value * (isset($units[$unit]) ? $units[$unit] : 1);
	}

	/**
	 * Writes the details of a failed upload to the webservicelog.
	 * Returns the log id, the user gives it to the support as reference.
	 */
	private function _log($context, $reason, $file = null, $dmsResult = null)
	{
		$this->_ci->load->model('system/Webservicelog_model', 'WebservicelogModel');

		$phpErrorCode = $file['error'] ?? null;

		$logData = array(
			'context'             => $context,
			'reason'              => $reason,
			'file_php_error_code' => $phpErrorCode,
			'file_php_error_name' => $this->_getPhpUploadErrorName($phpErrorCode),
			'file_name'           => $file['name'] ?? null,
			'file_type'           => $file['type'] ?? null,
			'file_size'           => $file['size'] ?? null,
			'content_length'      => $this->_getContentLength(),
			'max_file_size'       => $this->getMaxFileSize(),
			'dms_path_exists'     => file_exists(DMS_PATH),
			'dms_path_writable'   => is_writable(DMS_PATH),
			'error_raw'           => $this->_getErrorText($dmsResult),
		);

		$result = $this->_ci->WebservicelogModel->insert(array(
			'webservicetyp_kurzbz' => 'content',
			'beschreibung'         => 'EntschuldigungUploadError on '.$context,
			// a file name with invalid UTF-8 becomes null, instead of a failed encoding of the whole log entry
			'request_data'         => json_encode($logData, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR),
			'execute_user'         => getAuthUID(),
			'execute_time'         => 'NOW()'
		));

		return isSuccess($result) ? getData($result) : null;
	}

	/**
	 * DmsLib returns the CodeIgniter upload errors as html paragraphs and a database error as array.
	 */
	private function _getErrorText($dmsResult)
	{
		$error = $dmsResult !== null ? getError($dmsResult) : null;

		return is_string($error) ? trim(strip_tags($error)) : $error;
	}

	private function _getPhpUploadErrorName($code)
	{
		if (!is_int($code)) return null;

		$map = array(
			UPLOAD_ERR_OK         => 'UPLOAD_ERR_OK',
			UPLOAD_ERR_INI_SIZE   => 'UPLOAD_ERR_INI_SIZE',
			UPLOAD_ERR_FORM_SIZE  => 'UPLOAD_ERR_FORM_SIZE',
			UPLOAD_ERR_PARTIAL    => 'UPLOAD_ERR_PARTIAL',
			UPLOAD_ERR_NO_FILE    => 'UPLOAD_ERR_NO_FILE',
			UPLOAD_ERR_NO_TMP_DIR => 'UPLOAD_ERR_NO_TMP_DIR',
			UPLOAD_ERR_CANT_WRITE => 'UPLOAD_ERR_CANT_WRITE',
			UPLOAD_ERR_EXTENSION  => 'UPLOAD_ERR_EXTENSION',
		);

		return isset($map[$code]) ? $map[$code] : 'UNKNOWN ('.$code.')';
	}
}

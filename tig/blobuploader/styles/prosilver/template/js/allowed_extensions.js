export const DEFAULT_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'heic'];

export function parseAllowedExtensions(configured) {
    if (configured == null || String(configured).trim() === '') {
        return DEFAULT_ALLOWED_EXTENSIONS.slice();
    }

    const list = String(configured)
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0);

    return list.length ? list : DEFAULT_ALLOWED_EXTENSIONS.slice();
}

export function isAllowedFileName(fileName, configured) {
    const name = fileName == null ? '' : String(fileName);
    const ext = name.split('.').pop().toLowerCase();
    return parseAllowedExtensions(configured).includes(ext);
}

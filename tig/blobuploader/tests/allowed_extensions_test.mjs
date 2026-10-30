/**
 * Checks for comma-split, exact-match extension filtering.
 *
 * Run: node tig/blobuploader/tests/allowed_extensions_test.mjs
 */

import {
    DEFAULT_ALLOWED_EXTENSIONS,
    parseAllowedExtensions,
    isAllowedFileName,
} from '../styles/prosilver/template/js/allowed_extensions.js';

function assert_true(condition, message) {
    if (!condition) {
        console.error('FAIL: ' + message);
        process.exit(1);
    }
    console.log('ok: ' + message);
}

function sameList(actual, expected) {
    return actual.length === expected.length && actual.every((item, i) => item === expected[i]);
}

assert_true(
    sameList(parseAllowedExtensions('jpg, jpeg, png, gif, heic'), ['jpg', 'jpeg', 'png', 'gif', 'heic']),
    'splits on commas, trims spaces, and lowercases'
);

assert_true(
    sameList(parseAllowedExtensions('JPG,PNG'), ['jpg', 'png']),
    'lowercases configured extensions'
);

assert_true(
    sameList(parseAllowedExtensions(''), DEFAULT_ALLOWED_EXTENSIONS),
    'empty string falls back to jpg,jpeg,png,gif,heic'
);

assert_true(
    sameList(parseAllowedExtensions('   '), DEFAULT_ALLOWED_EXTENSIONS),
    'whitespace-only string falls back to the default list'
);

assert_true(
    sameList(parseAllowedExtensions(undefined), DEFAULT_ALLOWED_EXTENSIONS),
    'undefined falls back to the default list'
);

assert_true(
    sameList(parseAllowedExtensions(null), DEFAULT_ALLOWED_EXTENSIONS),
    'null falls back to the default list'
);

assert_true(
    isAllowedFileName('photo.png', 'jpg, jpeg, png'),
    'png is allowed when listed'
);

assert_true(
    isAllowedFileName('photo.JPEG', 'jpg, jpeg, png'),
    'JPEG matches jpeg after lowercase'
);

assert_true(
    !isAllowedFileName('notes.txt', 'jpg, jpeg, png'),
    'txt is rejected when not listed'
);

assert_true(
    !isAllowedFileName('photo.jpg.exe', 'jpg, jpeg, png'),
    'exact match rejects a trailing exe even when jpg is listed'
);

assert_true(
    !isAllowedFileName('peg.png.bak', 'jpg, jpeg, png'),
    'substring of jpeg is not treated as an allowed extension'
);

assert_true(
    isAllowedFileName('iphone.heic', ''),
    'empty config still allows heic via the fallback list'
);

assert_true(
    isAllowedFileName('shot.gif', null),
    'null config still allows gif via the fallback list'
);

assert_true(
    !isAllowedFileName('archive.zip', ''),
    'empty config still rejects non-image extensions'
);

console.log('All allowed-extension checks passed.');

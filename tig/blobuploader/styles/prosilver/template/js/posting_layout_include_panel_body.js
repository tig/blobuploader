import { heicTo, isHeic } from 'heic-to';
const { maxWidth, maxHeight } = window.acpSettings;

document.addEventListener('DOMContentLoaded', function () {
    const uploadedFilesContainer = document.getElementById('uploaded-files');
    const filesToUpload = document.getElementById('files-to-upload');
    const formElement = document.getElementById('postform');
    const copyAllLink = document.getElementById('copy-all-bbcodes-link');
    const insertAllLink = document.getElementById('insert-all-bbcodes-link');

    // If no CKEDitor, add a drop handler for the default editor
    if (!window.CKEDITOR) {
        console.log('CKEditor not found. Adding drop handler for default editor.');

        // Add dragover event listener to allow drop
        document.addEventListener('dragover', function (event) {
            event.preventDefault();
        });

        document.addEventListener('drop', async function (event) {
            console.log('Document Drop event:', event.dataTransfer.files);

            // Prevent default browser behavior
            event.preventDefault();

            // This method is defined by blobuploader
            try {
                await window.uploadFiles(event.dataTransfer.files);
                //console.log('Files uploaded successfully.');
            } catch (error) {
                console.error('Error uploading files:', error);
            }
        });
    }

    // Check if formElement exists
    if (formElement) {
        // Restore uploaded files from the hidden input field
        restoreUploadedFilesFromForm(uploadedFilesContainer);

        // Add event listener for file uploads
        if (filesToUpload) {
            filesToUpload.addEventListener('change', async function (event) {
                const files = event.target.files;
                const updatedFiles = await uploadFiles(files);

                // Update the hidden input field
                updateHiddenField(updatedFiles);
            });
        }

        // Ensure the hidden field is updated before form submission
        formElement.addEventListener('submit', function () {
            const storedFiles = getStoredFiles();
            console.log('Submitting form with files:', storedFiles);
            updateHiddenField(storedFiles);
        });
    } else {
        console.warn('Form element with id "postdata" not found.');
    }

    // Add event listener for the "copy all BBcodes" link
    if (copyAllLink) {
        copyAllLink.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent default link behavior
            const storedFiles = getStoredFiles();
            const allBBcodes = storedFiles
                .filter(file => !file.error) // Skip files with errors
                .map(file => `[url=${file.original}]\n [img]${file.sized}[/img]\n[/url]\n`)
                .join('\n');

            navigator.clipboard.writeText(allBBcodes).then(() => {
                //alert('BBcodes copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy BBcodes:', err);
            });
        });
    }

    // Add event listener for the "Insert all BBcodes" link
    if (insertAllLink) {
        insertAllLink.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent default link behavior
            const storedFiles = getStoredFiles();
            const allBBcodes = storedFiles
                .filter(file => !file.error) // Skip files with errors
                .map(file => `[url=${file.original}]\n [img]${file.sized}[/img]\n[/url]\n`)
                .join('\n');

            if (window.CKEDITOR) {
                var instances_names = Object.keys(CKEDITOR.instances),
                    editor = CKEDITOR.instances[instances_names[0]];
                if (editor.mode === 'wysiwyg') {
                    editor.insertText(allBBcodes);
                    editor.setMode('source');
                    editor.setMode('wysiwyg');
                } else {
                    console.log('Editor mode is not WYSIWYG');
                }
            } else {
                // Find the first textarea in the document
                const textArea = document.querySelector('textarea');
                if (textArea) {
                    // Get the current insertion point
                    const selectionStart = textArea.selectionStart;
                    const selectionEnd = textArea.selectionEnd;
                    // Insert the BBCode at the current insertion point
                    textArea.value = textArea.value.substring(0, selectionStart) + allBBcodes + textArea.value.substring(selectionEnd);
                    //console.log('Inserted into editor');
                }
            }
        });
    }
});

function showLoadingSpinner() {
    document.querySelector('.loading-spinner').style.display = 'block';
}

function hideLoadingSpinner() {
    document.querySelector('.loading-spinner').style.display = 'none';
}

// Restore uploaded files from the hidden input field
function restoreUploadedFilesFromForm(container) {
    console.group('restoreUploadedFilesFromForm:', container);

    const hiddenField = document.getElementById('uploaded-files-field');
    const uploadedFiles = hiddenField.value ? JSON.parse(hiddenField.value) : [];
    console.log('Restored files:', uploadedFiles);
    displayUploadedFiles(uploadedFiles, container);
    console.groupEnd();
}

// Update the hidden input field with the latest uploaded files
function updateHiddenField(files) {
    console.group('updateHiddenField:', files);

    const hiddenField = document.getElementById('uploaded-files-field');
    hiddenField.value = JSON.stringify(files);
    //console.log('Hidden field value:', hiddenField.value);
    console.groupEnd();
}

// Get stored files from the hidden input field
function getStoredFiles() {
    console.group('getStoredFiles:');
    const hiddenField = document.getElementById('uploaded-files-field');
    if (hiddenField.value) {
        // console.log('hiddenField.value non-null:', JSON.parse(hiddenField.value));
    }
    console.log('stored files:', hiddenField.value ? JSON.parse(hiddenField.value) : []);
    console.groupEnd();
    return hiddenField.value ? JSON.parse(hiddenField.value) : [];
}


// Handle dropped files
// Called from the document drop event listener in the CKEditor plugin
// or from the document drop event listener in the default editor
// Expose this method to the global scope
window.uploadFiles = uploadFiles;

// Handle file uploads
async function uploadFiles(files) {
    console.group('uploadFiles:', files);

    const uploadedFilesContainer = document.getElementById('uploaded-files');
    const storedFiles = getStoredFiles();
    
    var imgTags = '';

    // disable editor while uploading
    if (window.CKEDITOR) {
        var instances_names = Object.keys(CKEDITOR.instances),
            editor = CKEDITOR.instances[instances_names[0]];
        if (editor.mode === 'wysiwyg') {
            editor.setReadOnly(true);
        } else {
            console.log('Editor mode is not WYSIWYG');
        }
    }

    for (const file of files) {
        try {
            console.group('file:', file);

            if (!isAllowedExtension(file)) {
                console.log('non image file:', file.name);
                throw new Error('Error uploading ' + file.name + '. Only image files are supported.');
            }

            console.log('Converting HEIC to JPG if needed:', file.name);
            const convertedFile = await convertHeicToJpg(file);
            console.log('convertedFile:', convertedFile);

            console.log('Resizing image:', convertedFile.name);
            const resizedFile = await resizeImage(convertedFile, maxWidth, maxHeight);
            console.log('resizedFile:', resizedFile);

            console.log('Uploading single file:', resizedFile.name);
            const uploadedFile = await uploadSingleFile(resizedFile);
            console.log('uploadedFile:', uploadedFile);

            imgTags = imgTags + '[url=' + uploadedFile.original + ']\n  [img]' + uploadedFile.sized + '[/img]\n[/url]\n';


            storedFiles.push(uploadedFile);
        } catch (error) {
            console.log('Exception uploading file:', error.message);
            storedFiles.push({ error: error.message, name: file.name });
        } finally {
            // Remove duplicates
            const uniqueFiles = removeDuplicateFiles(storedFiles);
            console.log('uniqueFiles:', uniqueFiles);
            displayUploadedFiles(uniqueFiles, uploadedFilesContainer);
            console.groupEnd();
        }
    }

    // enable editor after uploading
    if (window.CKEDITOR) {
        var instances_names = Object.keys(CKEDITOR.instances),
            editor = CKEDITOR.instances[instances_names[0]];
        if (editor.mode === 'wysiwyg') {
            editor.setReadOnly(false);
        } else {
            console.log('Editor mode is not WYSIWYG');
        }
    }

    
    const autoInsert = document.getElementById('auto-insert-images');
    const autoInsertValue = autoInsert ? autoInsert.checked : false;
    if (autoInsertValue) {
        // Create the BBCode for the image
        insertIntoEditor(imgTags);
        refreshCKEditor();
    }

    // Remove duplicates
    const uniqueFiles = removeDuplicateFiles(storedFiles);
    // Update the hidden input field
    updateHiddenField(uniqueFiles);

    console.groupEnd();
    return uniqueFiles;
}

async function resizeImage(file, maxWidth, maxHeight) {
    if (file.type === 'image/gif'){
        return file;
    }
    console.group('resizeImage:', file);

    showLoadingSpinner();
    
    const originalSize = file.size;

    var resizedBlob = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // Check if the image dimensions are already within the limits
            if (width <= maxWidth && height <= maxHeight) {
                // No resizing needed, resolve with the original file
                resolve(file);
                return;
            }

            // Calculate the new dimensions while maintaining the aspect ratio
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.9);
        };
        img.onerror = (error) => {
            reject(error);
        };
        img.src = URL.createObjectURL(file);
    });

    var resizedFile = new File([resizedBlob], file.name, { type: file.type });
    console.log(`Resized ${file.name} from ${(originalSize / 1024).toFixed(2)}MB to ${(resizedFile.size / 1024).toFixed(2)}MB`);

    console.groupEnd();

    hideLoadingSpinner();

    return resizedFile;
}

function isAllowedExtension(file){
    return window.allowedExtensions.includes(file.name.split('.').pop().toLowerCase());
}

async function convertHeicToJpg(file) {
    console.group('convertHeicToJpg:', file);

    var convertedFile = file;
    showLoadingSpinner();

    try {
        console.log('Checking if file is HEIC:', file.name);
        if (await isHeic(file)) {
            console.log('File is HEIC:', file.name);
            try {
                const convertedBlob = await heicTo({
                    blob: file,
                    type: "image/jpeg",
                    quality: 0.9
                });

                // Create a new File object from the converted Blob
                const fileName = file.name.replace(/\.[^/.]+$/, ".jpg");
                const fileType = 'image/jpeg';
                convertedFile = new File([convertedBlob], fileName, { type: fileType });
            } catch (error) {
                throw new Error('Error converting ' + file.name + ' to JPG: ' + error);
            }
        } else {
            console.log('File is not HEIC:', file.name);
        }
    } catch (error) {
        console.error('Error checking if file is HEIC:', error);
    } finally {
        console.groupEnd();
        hideLoadingSpinner();
    }

    return convertedFile;
}

// Upload a single file
async function uploadSingleFile(file) {
    console.group('uploadSingleFile:', file);

    let fileToUpload = file;

    //console.log('fileToUpload:', fileToUpload);

    const formData = new FormData();
    formData.append('image', fileToUpload, fileToUpload.name);

    showLoadingSpinner();

    try {

        const response = await fetch('/blobuploader', {
            method: 'POST',
            body: formData
        });

        // Log info about the response object
        console.log('Response:', response);

        switch (response.status) {
            case 200:
                const result = await response.json();
                //console.log('Upload result:', result);

                return {
                    thumbnail: result.thumbnail,
                    sized: result.sized,
                    original: result.original,
                    message: result.message,
                };

            case 400:
                const errResult = await response.json();

                // console.log('Error uploading file - errResult.error:', errResult.error);
                // console.log('Error uploading file - errResult.error.error:', errResult.error.error);
                // console.log('Error uploading file - errResult.error.message.message:', errResult.error.message.message);

                var error = errResult.error.error;
                var message = errResult.error.message.message;
                if (errResult.error.message.exception) {
                    // console.log('Error uploading file - errResult.error.message.exception:', errResult.error.message.exception);
                    error = error + ' ' + errResult.error.message.exception;
                }

                throw new Error(error);

            case 500:
                throw new Error('Internal server error');
            default:
                throw new Error(response.status + ' ' + response.statusText);
        }

    } catch (error) {
        // Log the response text if available
        if (error.response) {
            const responseText = await error.response.text();
            console.error('Response text:', responseText);
        }

        throw new Error('Error uploading ' + fileToUpload.name + ': ' + error.message);
    } finally {
        console.groupEnd();
        hideLoadingSpinner();
    }
}

// Display uploaded files
function displayUploadedFiles(files, container) {
    container.innerHTML = '';
    console.group('displayUploadedFiles:', files);

    // hide/unhide all HTML elements with class blobuploader-hide depending on 
    // if there are files or not
    const hideElements = document.querySelectorAll('.blobuploader-hide');
    if (files.length > 0) {
        hideElements.forEach(element => {
            element.style.display = 'block';
        });
    } else {
        hideElements.forEach(element => {
            element.style.display = 'none';
        });
    }

    files.forEach(fileData => {
        const tableRow = document.createElement('tr');
        tableRow.classList.add('blobuploader');

        // Create a cell for the thumbnail
        const thumbnailCell = document.createElement('td');
        const thumbnail = document.createElement('img');
        thumbnail.style.width = '100px';
        thumbnail.style.height = 'auto';
        thumbnail.style.marginBottom = '5px';

        //console.log('fileData:', fileData);
        if (fileData.error) {
            // Display error image
            thumbnail.src = '/ext/tig/blobuploader/images/hitwhilewarm.gif';
            thumbnail.alt = 'Error';
        } else {
            // Display thumbnail image
            thumbnail.src = fileData.thumbnail;
            thumbnail.alt = 'Thumbnail';
        }
        thumbnailCell.appendChild(thumbnail);

        // Create a cell for the URL and tag
        const infoCell = document.createElement('td');

        if (fileData.error) {
            // Display error message
            const errorMessage = document.createElement('div');
            errorMessage.classList.add('error-message');
            errorMessage.classList.add('box-container');
            errorMessage.textContent = fileData.error;
            infoCell.appendChild(errorMessage);
        } else {
            // Create a container for the BBCode tag and copy button
            const tagContainer = document.createElement('div');
            tagContainer.classList.add('box-container');

            const bbcodeTag = '[url=' + fileData.original + ']\n  [img]' + fileData.sized + '[/img]\n[/url]';
            const preTag = document.createElement('pre');
            preTag.textContent = bbcodeTag;
            preTag.classList.add('box');

            const insertTagButton = createBBCodeInsertButton(fileData, 'Insert BBCode into editor');
            const copyTagButton = createBBCodeCopyButton(fileData, 'Copy BBCode to Clipboard');
            tagContainer.appendChild(insertTagButton);
            tagContainer.appendChild(copyTagButton);
            tagContainer.appendChild(preTag);

            // Create a container for the URL and copy button
            const urlContainer = document.createElement('div');
            urlContainer.classList.add('box-container');

            const anchorTag = document.createElement('pre');
            anchorTag.textContent = fileData.sized;
            anchorTag.classList.add('box');
            const insertButton = createUrlInsertButton(fileData, 'Insert URL into editor');
            const copyButton = createUrlCopyButton(fileData, 'Copy URL to Clipboard');

            urlContainer.appendChild(insertButton);
            urlContainer.appendChild(copyButton);
            urlContainer.appendChild(anchorTag);

            thumbnail.addEventListener('click', (event) => {
                event.preventDefault();
                // Create the BBCode for the image
                const imgTag = '[url=' + uploadedFile.original + ']\n  [img]' + uploadedFile.sized + '[/img]\n[/url]\n';
                insertIntoEditor(imgTag);
            });

            // Append the URL container and tag container to the info cell
            infoCell.appendChild(tagContainer);
            infoCell.appendChild(urlContainer);
        }

        // Append cells to the table row
        tableRow.appendChild(thumbnailCell);
        tableRow.appendChild(infoCell);

        // Append the table row to the table
        const table = document.createElement('table');
        table.classList.add('blobuploader');
        table.appendChild(tableRow);

        container.appendChild(table);
    });
    console.log('displayUploadedFiles done');
    console.groupEnd();
}

function refreshCKEditor() {
    if (window.CKEDITOR) {
        var instances_names = Object.keys(CKEDITOR.instances),
            editor = CKEDITOR.instances[instances_names[0]];
        if (editor.mode === 'wysiwyg') {
            editor.setMode('source');
            editor.setMode('wysiwyg');
        } else {
            console.log('Editor mode is not WYSIWYG');
        }
    } 
}

function insertIntoEditor(text) {
    console.group('insertIntoEditor:', text);
    try {
        if (window.CKEDITOR) {
            var instances_names = Object.keys(CKEDITOR.instances),
                editor = CKEDITOR.instances[instances_names[0]];
            if (editor.mode === 'wysiwyg') {
                //console.log('Inserting text into CKEditor...');
                editor.insertText(text);
            } else {
                console.log('Editor mode is not WYSIWYG');
            }
        } else {
            // Find the first textarea in the document
            const textArea = document.querySelector('textarea');
            if (textArea) {
                console.log('textArea:', textArea);
                // Get the current insertion point
                const selectionStart = textArea.selectionStart;
                const selectionEnd = textArea.selectionEnd;
                // Insert the text at the current insertion point
                textArea.value = textArea.value.substring(0, selectionStart) + text + textArea.value.substring(selectionEnd);
            }
        }
    } catch (error) {
        console.error('Error inserting text into editor:', error);
    }
    finally {
        console.log('insertIntoEditor - done');
        console.groupEnd();
    }
}

// Create copy button
function createBBCodeCopyButton(fileData, title) {
    //console.group('createUrlCopyButton:', fileData);
    const button = document.createElement('button');
    button.innerHTML = '<i class="copy-button fa fa-clipboard"></i>';
    button.title = title;

    const bbcodeTag = '[url=' + fileData.original + ']\n  [img]' + fileData.sized + '[/img]\n[/url]';

    button.addEventListener('click', (event) => {
        event.preventDefault();
        navigator.clipboard.writeText(bbcodeTag).then(() => {
            console.log('Copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    });
    //console.log('button:', button);
    //console.groupEnd();    
    return button;
}

function createUrlCopyButton(fileData, title) {
    //console.group('createUrlCopyButton:', fileData);
    const button = document.createElement('button');
    button.innerHTML = '<i class="copy-button fa fa-clipboard"></i>';
    button.title = title;

    button.addEventListener('click', (event) => {
        event.preventDefault();
        navigator.clipboard.writeText(fileData.original).then(() => {
            console.log('Copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    });
    //console.log('button:', button);
    //console.groupEnd();
    return button;
}

// Create copy button
function createBBCodeInsertButton(fileData, title) {
    //console.group('createBBCodeInsertButton:', fileData);
    const button = document.createElement('button');
    button.innerHTML = '<i class="copy-button fa fa-edit"></i>';
    button.title = title;

    const bbcodeTag = '[url=' + fileData.original + ']\n  [img]' + fileData.sized + '[/img]\n[/url]\n';

    button.addEventListener('click', (event) => {
        event.preventDefault();
        insertIntoEditor(bbcodeTag);
    });
    //console.log('button:', button);
    //console.groupEnd();
    return button;
}

function createUrlInsertButton(fileData, title) {
    //console.group('createUrlInsertButton:', fileData);
    const button = document.createElement('button');
    button.innerHTML = '<i class="copy-button fa fa-edit"></i>';
    button.title = title;

    button.addEventListener('click', (event) => {
        event.preventDefault();
        insertIntoEditor(fileData.original);
    });
    //console.log('button:', button);
    //console.groupEnd();
    return button;
}

// Remove duplicate files based on the `sized` URL
function removeDuplicateFiles(files) {
    const seen = new Set();
    return files.filter(file => {
        const key = file.sized || file.error;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

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
                //updateHiddenField(updatedFiles);
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
            insertIntoEditor(allBBcodes);
            refreshCKEditor();
        });
    }
});

function showLoadingSpinner() {
    //document.querySelector('.loading-spinner').style.display = 'block';
}

function hideLoadingSpinner() {
    //document.querySelector('.loading-spinner').style.display = 'none';
}

// Restore uploaded files from the hidden input field
function restoreUploadedFilesFromForm(container) {
    console.group('restoreUploadedFilesFromForm:', container);

    const hiddenField = document.getElementById('uploaded-files-field');
    const uploadedFiles = hiddenField.value ? JSON.parse(hiddenField.value) : [];
    console.log('Restored files:', uploadedFiles);
    updateUploadedFiles(uploadedFiles, container);
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

    // Disable editor while uploading
    if (window.CKEDITOR) {
        var instances_names = Object.keys(CKEDITOR.instances),
            editor = CKEDITOR.instances[instances_names[0]];
        if (editor.mode === 'wysiwyg') {
            editor.setReadOnly(true);
        }
    }

    // Convert FileList to Array of fileData objects
    if (!(files instanceof Array)) {
        files = Array.from(files);

        // Add fileData properties to each file
        files = files.map(file => {
            return {
                name: file.name,
                status: `Queued ${file.name}...`,
                file: file
            };
        });
    }

    // Get existing files
    const storedFiles = getStoredFiles();

    // Add new files as placeholders
    files.forEach(file => {
        // Check if file already exists in array
        const exists = storedFiles.some(f => f.name === file.name);
        
        if (!exists) {
            storedFiles.push(file); 
        }
    });

    console.log('storedFiles:', storedFiles);

    // Initial UI update with all files
    updateUploadedFiles(storedFiles, uploadedFilesContainer);

    const uploadPromises = files.map(async (fileData) => {
        try {
            if (!isAllowedExtension(fileData)) {
                throw new Error('Error uploading ' + fileData.name + '. Only image files are supported.');
            }

            updateFileState(fileData, {
                status: `Converting ${fileData.name}...`,
            });
            const convertedFile = await convertHeicToJpg(fileData.file);

            updateFileState(fileData, {
                status: `Resizing ${fileData.name}...`,
                file: convertedFile,
            });
            const resizedFile = await resizeImage(convertedFile, maxWidth, maxHeight);

            updateFileState(fileData, {
                status: `Uploading ${fileData.name}...`,
                file: resizedFile,
            });
            const uploadedFile = await uploadSingleFile(resizedFile);

            updateFileState(fileData, {
                status: `Uploaded ${fileData.name}`,
                bbcode: '[url=' + uploadedFile.original + ']\n  [img]' + uploadedFile.sized + '[/img]\n[/url]',
                thumbnail: uploadedFile.thumbnail,
                original: uploadedFile.original,
                sized: uploadedFile.sized,
            });

            fileData.status = `Uploaded ${fileData.name}`;
            fileData.bbcode = '[url=' + uploadedFile.original + ']\n  [img]' + uploadedFile.sized + '[/img]\n[/url]';
            fileData.thumbnail = uploadedFile.thumbnail;
            fileData.original = uploadedFile.original;
            fileData.sized = uploadedFile.sized;
            //fileData.file = uploadedFile;

            console.log('uploadedFile fileData:', fileData);

            return {
                success: true,
                fileData: fileData               
            };
        } catch (error) {
            const errorState = { error: error.message, name: fileData.name };

            const index = storedFiles.findIndex(f => f.name === fileData.name);
            if (index !== -1) {
                storedFiles[index] = errorState;
                updateUploadedFiles(storedFiles, uploadedFilesContainer);
            }
            fileData.status = `Error uploading ${fileData.name}`;
            fileData.error = error.message;

            return {
                success: false,
                fileData: fileData,
            };
        }
    });

    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);

    // Process final results for BBCode collection only
    var imgTags = '';
    results.forEach(result => {
        if (result.success) {
            imgTags += result.fileData.bbcode + '\n';
        }
    });

    console.log('imgTags:', imgTags);   

    // Re-enable editor
    if (window.CKEDITOR) {
        editor.setReadOnly(false);
    }

    // Handle auto-insert if enabled
    const autoInsert = document.getElementById('auto-insert-images');
    if (autoInsert?.checked) {
        insertIntoEditor(imgTags);
        refreshCKEditor();
    }

    updateHiddenField(storedFiles);

    console.groupEnd();
    return results;

    function updateFileState(file, newState) {
        // Find file in array
        const index = storedFiles.findIndex(f => f.name === file.name);
        
        if (index !== -1) {
            // Keep existing properties and update with new state
            storedFiles[index] = {
                ...storedFiles[index],  // preserve all existing properties
                ...newState             // update with new state
            };
        } else {
            // Add new file state to end of array
            storedFiles.push({
                name: file.name,
                ...newState
            });
        }
        
        // Update UI
        updateUploadedFiles(storedFiles, uploadedFilesContainer);
    }

}

async function resizeImage(file, maxWidth, maxHeight) {
    if (file.type === 'image/gif') {
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

    // Create a new File object from the resized Blob
    const resizedFile = new File([resizedBlob], file.name, { type: 'image/jpeg', lastModified: file.lastModified });

    console.log('Resized file:', resizedFile);  

    console.log(`Resized ${file.name} from ${(originalSize / 1024).toFixed(2)}MB to ${(resizedFile.size / 1024).toFixed(2)}MB`);

    console.groupEnd();
    hideLoadingSpinner();
    return resizedFile;
}

function isAllowedExtension(file) {
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
        //console.log('Response:', response);

        var result = {};

        // try to get the result from the response
        const responseClone = response.clone();
        try {
            // Clone the response before consuming it
            result = await response.json();
        } catch (error) {
            // Use the cloned response to get text
            const responseText = await responseClone.text();
            console.error('Response was not JSON:', responseText);
            throw new Error(`Server returned invalid JSON: ${responseText}`);
        }

        switch (response.status) {
            case 200:
                console.log('File uploaded successfully:', result);
                return {
                    original: result.original,
                    sized: result.sized,
                    thumbnail: result.thumbnail,
                    message: result.message,
                };

            case 400:

                var error = result.error.error;
                var message = result.error.message.message;
                if (result.error.message.exception) {
                    // console.log('Error uploading file - errResult.error.message.exception:', errResult.error.message.exception);
                    error = error + ' ' + result.error.message.exception;
                }

                throw new Error(error);

            case 500:
                throw new Error('Internal server error', result);
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

function updateHideElements(hasFiles) {
    const hideElements = document.querySelectorAll('.blobuploader-hide');
    hideElements.forEach(element => {
        element.style.display = hasFiles ? 'block' : 'none';
    });
}

// Display uploaded files
function updateUploadedFiles(fileDataArray, container) {

    console.group('updateUploadedFiles:', fileDataArray);
    if (!Array.isArray(fileDataArray) || fileDataArray.length === 0) {
        console.warn('No files to display');
        updateHideElements(false);
        console.groupEnd();
        return;
    }

    updateHideElements(true);

    fileDataArray.forEach(fileData => {
        var table;
        var thumbnail;
        var infoCellContainer;

        // console.log('fileData:', {...fileData});

        if (document.getElementById(sanitizeId(fileData.name))) {
            // Get the existing table for this file
            table = document.getElementById(sanitizeId(fileData.name));
            thumbnail = table.querySelector('img');
            infoCellContainer = table.querySelector('.info-cell-container');
        } else {
            // Create the table for this file
            table = document.createElement('table');
            table.id = sanitizeId(fileData.name);
            table.classList.add('blobuploader');
            container.appendChild(table);

            const tableRow = document.createElement('tr');
            tableRow.classList.add('blobuploader');

            // Create a cell for the thumbnail
            const thumbnailCell = document.createElement('td');
            thumbnailCell.classList.add('thumbnail');
            thumbnail = document.createElement('img');
            thumbnail.classList.add('thumbnail');
            thumbnailCell.appendChild(thumbnail);

            // Create a cell for the URL and tag
            const infoCell = document.createElement('td');
            infoCell.classList.add('info-cell');

            // Create a container for the URL and tag
            infoCellContainer = document.createElement('div');
            infoCellContainer.classList.add('info-cell-container');
            infoCell.appendChild(infoCellContainer);

            // Append cells to the table row
            tableRow.appendChild(thumbnailCell);
            tableRow.appendChild(infoCell);

            table.appendChild(tableRow);
        }

        if (fileData.error) {
            // Display error image
            thumbnail.src = '/ext/tig/blobuploader/images/hitwhilewarm.gif';
            thumbnail.alt = 'Error';
            thumbnail.classList.remove('loading');

            // Clear infoCell
            infoCellContainer.innerHTML = '';
            infoCellContainer.classList.remove('status-message');
            infoCellContainer.classList.add('error-message');
            infoCellContainer.textContent = fileData.error;

        } else if (!fileData.thumbnail) {
            // Display loading image
            // console.log('Displaying loading image for:', fileData.name, fileData.message);    
            thumbnail.src = '/ext/tig/blobuploader/images/roundel.gif';
            thumbnail.alt = fileData.status;
            thumbnail.classList.add('loading');

            // Clear infoCell
            infoCellContainer.innerHTML = '';
            infoCellContainer.classList.remove('error-message');
            infoCellContainer.classList.add('status-message');
            infoCellContainer.textContent = fileData.status;

        } else {
            // Display the thumbnail
            // console.log('Displaying uploaded image info for:', fileData.name);    
            thumbnail.src = fileData.thumbnail;
            thumbnail.alt = 'Thumbnail';
            thumbnail.classList.remove('loading');

            thumbnail.addEventListener('click', (event) => {
                event.preventDefault();
                insertIntoEditor(fileData.bbcode);
                refreshCKEditor();
            });

            // Display the file info
            infoCellContainer.innerHTML = '';
            infoCellContainer.classList.remove('error-message');
            infoCellContainer.classList.remove('status-message');

            // Create a container for the BBCode and copy buttons
            const tagContainer = document.createElement('div');
            tagContainer.classList.add('box-container');

            const preTag = document.createElement('pre');
            preTag.textContent = fileData.bbcode;
            preTag.classList.add('box');

            const insertTagButton = createBBCodeInsertButton(fileData, 'Insert BBCode into editor');
            const copyTagButton = createBBCodeCopyButton(fileData, 'Copy BBCode to Clipboard');
            tagContainer.appendChild(insertTagButton);
            tagContainer.appendChild(copyTagButton);
            tagContainer.appendChild(preTag);

            // Create a container for the URL and copy buttons
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


            // Append the URL container and tag container to the info cell
            infoCellContainer.appendChild(tagContainer);
            infoCellContainer.appendChild(urlContainer);
        }
    });

    console.log('updateUploadedFiles done');
    console.groupEnd();
}

function sanitizeId(fileName) {
    return fileName.replace(/[^a-zA-Z0-9-_:.]/g, '_');
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

                // DO NOT REFRESH HERE.
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

    button.addEventListener('click', (event) => {
        event.preventDefault();
        navigator.clipboard.writeText(fileData.bbcode).then(() => {
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

    button.addEventListener('click', (event) => {
        event.preventDefault();
        insertIntoEditor(fileData.bbcode + '\n');
        refreshCKEditor();
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
        refreshCKEditor();
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

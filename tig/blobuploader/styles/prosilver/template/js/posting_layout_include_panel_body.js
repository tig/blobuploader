import { heicTo, isHeic } from 'heic-to';

const { maxWidth, maxHeight } = window.acpSettings;

document.addEventListener('DOMContentLoaded', function () {
    const uploadedFilesContainer = document.getElementById('uploaded-files');
    const filesToUpload = document.getElementById('files-to-upload');
    const loadingSpinner = document.getElementById('loading-spinner');
    const formElement = document.getElementById('postform');
    const hiddenField = document.getElementById('uploaded-files-field');
    const copyAllLink = document.getElementById('copy-all-bbcodes-link');
    const insertAllLink = document.getElementById('insert-all-bbcodes-link');

    // If no CKEDitor, add a drop handler for the default editor
    if (!window.CKEDITOR) {
        console.log('CKEditor not found. Adding drop handler for default editor.');
        document.addEventListener('drop', async function (event) {
            console.log('Document Drop event:', event.dataTransfer.files);

            // Prevent default browser behavior
            event.preventDefault();

            // This method is defined by blobuploader
            try {
                await window.uploadDroppedFiles(event.dataTransfer.files);
                console.log('Files uploaded successfully.');
            } catch (error) {
                console.error('Error uploading files:', error);
            }
        });
    }

    // Check if formElement exists
    if (formElement) {
        // Restore uploaded files from the hidden input field
        restoreUploadedFilesFromForm(hiddenField, uploadedFilesContainer);

        // Add event listener for file uploads
        if (filesToUpload) {
            filesToUpload.addEventListener('change', async function (event) {
                const files = event.target.files;
                const updatedFiles = await uploadFiles(files, hiddenField, loadingSpinner, uploadedFilesContainer);
                // displayUploadedFiles(updatedFiles, uploadedFilesContainer);

                // Update the hidden input field
                updateHiddenField(hiddenField, updatedFiles);
            });
        }

        // Ensure the hidden field is updated before form submission
        console.log('Form element found. Adding submit event listener.');
        formElement.addEventListener('submit', function () {
            const storedFiles = getStoredFiles(hiddenField);
            //console.log('Submitting form with files:', storedFiles);
            updateHiddenField(hiddenField, storedFiles);
        });
    } else {
        console.warn('Form element with id "postdata" not found.');
    }

    // Add event listener for the "copy all BBcodes" link
    if (copyAllLink) {
        copyAllLink.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent default link behavior
            const storedFiles = getStoredFiles(hiddenField);
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
            const storedFiles = getStoredFiles(hiddenField);
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
                    console.log('Inserted into editor');
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
function restoreUploadedFilesFromForm(hiddenField, container) {
    const uploadedFiles = hiddenField.value ? JSON.parse(hiddenField.value) : [];
    //console.log('Restored files:', uploadedFiles);
    displayUploadedFiles(uploadedFiles, container);
}

// Update the hidden input field with the latest uploaded files
function updateHiddenField(hiddenField, files) {
    //console.log('Updating hidden field with files:', files);
    hiddenField.value = JSON.stringify(files);
    //console.log('Hidden field value:', hiddenField.value);
}

// Get stored files from the hidden input field
function getStoredFiles(hiddenField) {
    //console.log('Getting stored files from hidden field');
    if (hiddenField.value) {
        //console.log('Stored files:', JSON.parse(hiddenField.value));
    }
    return hiddenField.value ? JSON.parse(hiddenField.value) : [];
}

// Expose this method to the global scope
window.uploadDroppedFiles = uploadDroppedFiles;

async function uploadDroppedFiles(files) {
    console.log('uploadDroppedFiles:', files);

    // Activate the "Uploader" tab
    activateSubPanel('uploader-panel');

    const hiddenField = document.getElementById('uploaded-files-field');
    const loadingSpinner = document.getElementById('loading-spinner');
    const uploadedFilesContainer = document.getElementById('uploaded-files');
    const formElement = document.getElementById('postform');

    if (window.CKEDITOR) {
        var instances_names = Object.keys(CKEDITOR.instances),
        editor = CKEDITOR.instances[instances_names[0]];

       if (editor && editor.mode === 'source') {
            console.log('CKEDITOR is in source mode. Cannot insert BBCode.');
            return;
        }
    }

    const storedFiles = getStoredFiles(hiddenField);

    for (const file of files) {
        try {
            const uploadedFile = await uploadSingleFile(file, loadingSpinner);
            console.log('Uploaded Dropped file:', uploadedFile);
            storedFiles.push(...uploadedFile); // Spread the array to merge it into storedFiles
            displayUploadedFiles(storedFiles, uploadedFilesContainer);

            // Create the BBCode for the image
            const imgTag = '[url=' + uploadedFile[0].original + ']\n  [img]' + uploadedFile[0].sized + '[/img]\n[/url]';
            try {
                // Insert the raw BBCode directly as plain text
                if (editor) {
                    editor.insertText(imgTag);
                } else {
                    // Find the first textarea in the document
                    const textArea = document.querySelector('textarea');
                    if (textArea) {
                        // Get the current insertion point
                        const selectionStart = textArea.selectionStart;
                        const selectionEnd = textArea.selectionEnd;
                        // Insert the BBCode at the current insertion point
                        textArea.value = textArea.value.substring(0, selectionStart) + imgTag + textArea.value.substring(selectionEnd);
                    }
                }
            } catch (error) {
                console.error('Error inserting [img] tag:', error);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
        }
        console.log('Stored files:', storedFiles);
    }

    if (editor) {
        // Hack and switch to source mode and back to WYSIWYG to refresh
        editor.setMode('source');
        editor.setMode('wysiwyg');
    }

    // Remove duplicates
    const uniqueFiles = removeDuplicateFiles(storedFiles);

    // Update the hidden input field
    updateHiddenField(hiddenField, uniqueFiles);
}

// Handle file uploads
async function uploadFiles(files, hiddenField, loadingSpinner, uploadedFilesContainer) {
    const storedFiles = getStoredFiles(hiddenField);

    for (const file of files) {
        try{
            const uploadedFile = await uploadSingleFile(file, loadingSpinner);
            if (uploadedFile && uploadedFile.length > 0) {
                //console.log('Uploaded file:', uploadedFile);
                storedFiles.push(...uploadedFile); // Spread the array to merge it into storedFiles
            }
        } catch (error) {
            storedFiles.push({ error: error.message, name: file.name });
        }
        finally{
            displayUploadedFiles(storedFiles, uploadedFilesContainer);
        }
    }

    // Remove duplicates
    const uniqueFiles = removeDuplicateFiles(storedFiles);

    // Update the hidden input field
    updateHiddenField(hiddenField, uniqueFiles);

    return uniqueFiles;
}

async function resizeImage(file, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
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
}

// Upload a single file
async function uploadSingleFile(file, loadingSpinner) {
    console.log('uploadSingleFile - file:', file);

    let fileToUpload = file;

    // If the extension is not in window.allowedExtensions, throw an error
    if (!window.allowedExtensions.includes(file.name.split('.').pop().toLowerCase())) {
        throw new Error('Error uploading ' + file.name + ' Only image files are supported.');
    }

    // Check if the file is an HEIC file and convert it to JPG
    if (await isHeic(file)) {
        try {
            showLoadingSpinner();

            const convertedBlob = await heicTo({
                blob: file,
                type: "image/jpeg",
                quality: 0.9
            })

            // Create a new File object from the converted Blob
            const fileName = file.name.replace(/\.[^/.]+$/, ".jpg");
            const fileType = 'image/jpeg';
            fileToUpload = new File([convertedBlob], fileName, { type: fileType });

        } catch (error) {
            throw new Error('Error converting ' + file.name + ' to JPG: ' + error);
        } finally {
            hideLoadingSpinner();
        }
    }

    // Resize the image to a maximum resolution of 4K (3840x2160)
    // skip gifs
    if (file.type !== 'image/gif') {
        try {
            showLoadingSpinner();
            const resizedBlob = await resizeImage(fileToUpload, maxWidth, maxHeight);
            fileToUpload = new File([resizedBlob], fileToUpload.name, { type: fileToUpload.type });

            // Log the resized File object details
            console.log('Resized File object:', fileToUpload);
        } catch (error) {
            throw new Error('Error resizing ' + file.name + ':' + error);
        } finally {
            hideLoadingSpinner();
        }
    }

    console.log('fileToUpload:', fileToUpload);

    const formData = new FormData();
    formData.append('image', fileToUpload, fileToUpload.name);

    try {
        showLoadingSpinner();

        const response = await fetch('/blobuploader', {
            method: 'POST',
            body: formData
        });

        // Log info about the response object
        console.log('Response:', response);
 
        if (!response.ok) {
            if (response.status === 400) {
                alert('Error uploading file: The size of the file may be too large.');
            } else if (response.status === 500) {
                alert('Error uploading file: Internal server error');
            } else {
                alert('Error uploading file: ' + response.status + ' ' + response.statusText);
            }

            throw new Error('Network response was not ok');
        }



        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            console.log('Response is JSON:', contentType);
            const result = await response.json();
            console.log('Upload result:', result);
    
            return result.map(fileData => {
                if (fileData.error) {
                    return { error: fileData.error, name: fileData.name };
                }
                return {
                    thumbnail: fileData.thumbnail,
                    sized: fileData.sized,
                    original: fileData.original,
                    message: fileData.message,
                };
            });
        } else {
            const text = await response.text();
            console.error('Unexpected response format:', text);
            throw new Error('Unexpected response format');
        }

    } catch (error) {
        console.group('Exception from fetch');
        console.error('Message:', error.message);
        console.error('Stack trace:', error.stack);

        // Log the response text if available
        if (error.response) {
            const responseText = await error.response.text();
            console.error('Response text:', responseText);
        }

        console.groupEnd();
        return [];
    } finally {
        hideLoadingSpinner();
    }
}

// Display uploaded files
function displayUploadedFiles(files, container) {
    container.innerHTML = '';
    //console.log('Files passed to displayUploadedFiles:', files);

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
        // if (fileData && fileData.original) {
        //     //console.log('Displaying file:', fileData);
        //     //console.log('Original:', fileData.original);

        //     // Render the file details here
        // } else {
        //     console.warn('File data is not as expected:', fileData);
        // }

        const tableRow = document.createElement('tr');
        tableRow.classList.add('blobuploader');

        // Create a cell for the thumbnail
        const thumbnailCell = document.createElement('td');
        const thumbnail = document.createElement('img');
        thumbnail.style.width = '100px';
        thumbnail.style.height = 'auto';
        thumbnail.style.marginBottom = '5px';

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
            errorMessage.textContent = 'Error: ' + fileData.error;
            infoCell.appendChild(errorMessage);
        } else {
            // Create a container for the BBCode tag and copy button
            const tagContainer = document.createElement('div');
            tagContainer.classList.add('box-container');

            const bbcodeTag = '[url=' + fileData.original + ']\n  [img]' + fileData.sized + '[/img]\n[/url]';
            const preTag = document.createElement('pre');
            preTag.textContent = bbcodeTag;
            preTag.classList.add('box');

            const insertTagButton = createInsertButton(bbcodeTag, 'Insert BBCode into editor');
            const copyTagButton = createCopyButton(bbcodeTag, 'Copy BBCode to Clipboard');
            tagContainer.appendChild(insertTagButton);
            tagContainer.appendChild(copyTagButton);
            tagContainer.appendChild(preTag);

            // Create a container for the URL and copy button
            const urlContainer = document.createElement('div');
            urlContainer.classList.add('box-container');

            const anchorTag = document.createElement('pre');
            anchorTag.textContent = fileData.sized;
            anchorTag.classList.add('box');
            const insertButton = createInsertButton(fileData.sized, 'Insert URL into editor');
            const copyButton = createCopyButton(fileData.sized, 'Copy URL to Clipboard');

            urlContainer.appendChild(insertButton);
            urlContainer.appendChild(copyButton);
            urlContainer.appendChild(anchorTag);

            thumbnail.addEventListener('click', (event) => {
                event.preventDefault();
                insertIntoEditor(bbcodeTag);
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
}

function insertIntoEditor(toInsert) {
    if (window.CKEDITOR) {
        var instances_names = Object.keys(CKEDITOR.instances),
        editor = CKEDITOR.instances[instances_names[0]];
        if (editor.mode === 'wysiwyg') {
            editor.insertText(toInsert);
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
            textArea.value = textArea.value.substring(0, selectionStart) + toInsert + textArea.value.substring(selectionEnd);
            console.log('Inserted into editor');
        }
    }
}

// Create copy button
function createCopyButton(text, title) {
    const button = document.createElement('button');
    button.innerHTML = '<i class="copy-button fa fa-clipboard"></i>';
    button.title = title;
    button.addEventListener('click', (event) => {
        event.preventDefault();
        navigator.clipboard.writeText(text).then(() => {
            console.log('Copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    });
    return button;
}

// Create copy button
function createInsertButton(text, title) {
    const button = document.createElement('button');
    button.innerHTML = '<i class="copy-button fa fa-edit"></i>';
    button.title = title;
    button.addEventListener('click', (event) => {
        event.preventDefault();
        insertIntoEditor(text);
    });
    return button;
}


// Handle file upload errors
function handleUploadError(response) {
    console.log(`Response status: ${response.status}`);
    console.log(`Response status text: ${response.statusText}`);
    alert(`Error uploading file: ${response.status} ${response.statusText}`);
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

async function handleFileDrop(evt, editor, loadingSpinner, uploadedFilesContainer) {
    console.log('BlobUploader: File dropped:', evt.data.$);

    if (evt.data.$.dataTransfer && evt.data.$.dataTransfer.files.length > 0) {
        const files = evt.data.$.dataTransfer.files;
        console.log('Dropped files:', files);

        // Make the Upload Tab active
        document.getElementById('uploader-panel-tab').click();

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(`Processing file: ${file.name}`);

            const uploadedFile = await uploadSingleFile(file, loadingSpinner);

            if (uploadedFile && uploadedFile.length > 0) {
            }

            // Create the BBCode for the image
            const imgTag = `[img]${uploadedFile[0].sized}[/img]`;

            try {
                if (editor.mode === 'wysiwyg') {
                    // Insert the raw BBCode directly as plain text
                    editor.insertText(imgTag);


                    // Switch to source mode and back to WYSIWYG to refresh
                    editor.execCommand('source');
                    setTimeout(() => {
                        editor.execCommand('source'); // Switch back to WYSIWYG
                    }, 0);

                } else {
                    console.log('Drop ignored: Not in WYSIWYG mode.');
                }

                console.log(`Inserted tag: ${imgTag}`);
            } catch (error) {
                console.error('Error inserting [img] tag:', error);
            }
        }
    }

    // Prevent default browser behavior
    evt.cancel();
}
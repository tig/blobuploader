document.addEventListener('DOMContentLoaded', function () {
    const uploadedFilesContainer = document.getElementById('uploaded-files');
    const filesToUpload = document.getElementById('files-to-upload');
    const loadingSpinner = document.getElementById('loading-spinner');
    const formElement = document.getElementById('postform');
    const hiddenField = document.getElementById('uploaded-files-field');
    const copyAllLink = document.getElementById('copy-all-bbcodes-link');

    // Check if formElement exists
    if (formElement) {
        // Restore uploaded files from the hidden input field
        restoreUploadedFilesFromForm(hiddenField, uploadedFilesContainer);

        // Add event listener for file uploads
        if (filesToUpload) {
            filesToUpload.addEventListener('change', async function (event) {
                const files = event.target.files;
                const updatedFiles = await uploadFiles(files, hiddenField, loadingSpinner);
                displayUploadedFiles(updatedFiles, uploadedFilesContainer);

                // Update the hidden input field
                updateHiddenField(hiddenField, updatedFiles);
            });
        }

        // Ensure the hidden field is updated before form submission
        console.log('Form element found. Adding submit event listener.');
        formElement.addEventListener('submit', function () {
            const storedFiles = getStoredFiles(hiddenField);
            console.log('Submitting form with files:', storedFiles);
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
});


// Restore uploaded files from the hidden input field
function restoreUploadedFilesFromForm(hiddenField, container) {
    const uploadedFiles = hiddenField.value ? JSON.parse(hiddenField.value) : [];
    console.log('Restored files:', uploadedFiles);
    displayUploadedFiles(uploadedFiles, container);
}

// Update the hidden input field with the latest uploaded files
function updateHiddenField(hiddenField, files) {
    console.log('Updating hidden field with files:', files);
    hiddenField.value = JSON.stringify(files);
    console.log('Hidden field value:', hiddenField.value);
}

// Get stored files from the hidden input field
function getStoredFiles(hiddenField) {
    console.log('Getting stored files from hidden field');
    if (hiddenField.value) {
        console.log('Stored files:', JSON.parse(hiddenField.value));
    }
    return hiddenField.value ? JSON.parse(hiddenField.value) : [];
}

// Handle file uploads
async function uploadFiles(files, hiddenField, loadingSpinner) {
    const storedFiles = getStoredFiles(hiddenField);

    for (const file of files) {
        const uploadedFile = await uploadSingleFile(file, loadingSpinner);
        if (uploadedFile) {
            console.log('Uploaded file. Storing:', uploadedFile);
            storedFiles.push(uploadedFile);
        }
    }

    // Remove duplicates
    const uniqueFiles = removeDuplicateFiles(storedFiles);

    // Update the hidden input field
    updateHiddenField(hiddenField, uniqueFiles);

    return uniqueFiles;
}

// Upload a single file
async function uploadSingleFile(file, loadingSpinner) {
    console.log('Selected file:', file);

    const formData = new FormData();
    formData.append('image', file);

    try {
        loadingSpinner.style.display = 'block';

        const response = await fetch('/blobuploader', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            handleUploadError(response);
            return null;
        }

        const result = await response.json();
        console.log('Upload result:', result);

        // Handle the result as an array and extract the first item
        if (Array.isArray(result) && result.length > 0) {
            const fileData = result[0];
            return {
                thumbnail: fileData.thumbnail,
                sized: fileData.sized,
                original: fileData.original,
                name: file.name
            };
        } else {
            console.error('Unexpected response format:', result);
            return { error: 'Unexpected response format', name: file.name };
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        return { error: 'Network error', name: file.name };
    } finally {
        loadingSpinner.style.display = 'none';
    }
}


// Display uploaded files
function displayUploadedFiles(files, container) {
    container.innerHTML = '';
    files.forEach(fileData => {
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
            thumbnail.src = '/ext/tig/blobuploader/images/upload-error-image.jpg'; 
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
            // Create a container for the URL and copy button
            const urlContainer = document.createElement('div');
            urlContainer.classList.add('box-container');

            const anchorTag = document.createElement('a');
            anchorTag.href = fileData.sized;
            anchorTag.textContent = fileData.sized;
            anchorTag.classList.add('box');
            anchorTag.target = '_blank'; // Open the link in a new tab

            const copyButton = createCopyButton(fileData.sized, 'Copy URL to Clipboard');
            urlContainer.appendChild(anchorTag);
            urlContainer.appendChild(copyButton);

            // Create a container for the BBCode tag and copy button
            const tagContainer = document.createElement('div');
            tagContainer.classList.add('box-container');

            const bbcodeTag = '[url=' + fileData.original + '][img]' + fileData.sized + '[/img][/url]';
            const preTag = document.createElement('pre');
            preTag.textContent = bbcodeTag;
            preTag.classList.add('box');

            const copyTagButton = createCopyButton(bbcodeTag, 'Copy tag to Clipboard');
            tagContainer.appendChild(preTag);
            tagContainer.appendChild(copyTagButton);

            // Append the URL container and tag container to the info cell
            infoCell.appendChild(urlContainer);
            infoCell.appendChild(tagContainer);
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

// Create file info container for URLs and tags
function createFileInfoContainer(content, title, isBBCode = false) {
    const container = document.createElement('div');
    container.classList.add('box-container');

    const displayElement = isBBCode ? document.createElement('pre') : document.createElement('a');
    if (isBBCode) {
        displayElement.textContent = content;
    } else {
        displayElement.href = content;
        displayElement.textContent = content;
        displayElement.target = '_blank';
    }

    const copyButton = createCopyButton(content, title);
    container.appendChild(displayElement);
    container.appendChild(copyButton);

    return container;
}

// Create copy button
function createCopyButton(text, title) {
    const button = document.createElement('button');
    button.innerHTML = '<i class="fa fa-clipboard"></i>';
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

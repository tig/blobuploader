document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const forumId = urlParams.get('f');
    const topicId = urlParams.get('t');
    const postId = urlParams.get('p');

    // Generate a unique storage key based on the URL parameters
    const storageKey = generateStorageKey(mode, forumId, topicId, postId);
    console.log('Storage key:', storageKey);

    
    // Clear local storage if starting a new post
    if (mode === 'post' && !postId) {
        localStorage.removeItem(storageKey);
        console.log('Local storage cleared for new post');
    }
    
    const loadingSpinner = document.getElementById('loading-spinner');
    const uploadedFilesContainer = document.getElementById('uploaded-files');

    // Retrieve uploaded files from local storage and display them
    const storedFiles = JSON.parse(localStorage.getItem(storageKey) || '[]');
    console.log('storedFiles:', storedFiles);
    displayUploadedFiles(storedFiles, uploadedFilesContainer);

    const filesToUpload = document.getElementById('files-to-upload');
    console.log('filesToUpload:', filesToUpload);

    if (filesToUpload) {
        filesToUpload.addEventListener('change', function (event) {
            console.log('File input changed');
            uploadFiles(event.target.files, storageKey, loadingSpinner, uploadedFilesContainer);
        });
    }
});

function generateStorageKey(mode, forumId, topicId, postId) {
    let storageKey = 'uploadedFiles_';
    if (mode) storageKey += 'mode_' + mode + '_';
    if (forumId) storageKey += 'forum_' + forumId + '_';
    if (topicId) storageKey += 'topic_' + topicId + '_';
    if (postId) storageKey += 'post_' + postId;
    return storageKey;
}

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

function createCopyButton(text, title) {
    const button = document.createElement('button');
    button.innerHTML = '<i class="fa fa-clipboard"></i>';
    button.classList.add('copy-button');
    button.title = title; // Add hover indicator
    button.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent the default action
        navigator.clipboard.writeText(text).then(() => {
            console.log('Copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    });
    return button;
}

async function uploadFiles(files, storageKey, loadingSpinner, container) {
    for (const file of files) {
        await uploadSingleFile(file, storageKey, loadingSpinner, container);
    }
}

async function uploadSingleFile(file, storageKey, loadingSpinner, container) {
    console.log('Selected file:', file);

    const formData = new FormData();
    formData.append('image', file);

    // Log the formData showing its content
    for (var pair of formData.entries()) {
        console.log(pair[0] + ', ' + (pair[1] instanceof File ? pair[1].name : pair[1]));
    }
    
    try {
        // Show the loading spinner
        loadingSpinner.style.display = 'block';

        const response = await fetch('/blobuploader', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            // Log info about the response object
            console.log('Response status:', response.status);
            console.log('Response status text:', response.statusText);

            if (response.status === 400) {
                alert('Error uploading file: The size of the file may be too large.');
            } else if (response.status === 500) {
                alert('Error uploading file: Internal server error');
            } else {
                alert('Error uploading file: ' + response.status + ' ' + response.statusText);
            }

            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        console.log('Upload result:', result);

        const storedFiles = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const processedFiles = result.map(fileData => {
            if (fileData.error) {
                return { error: fileData.error, name: fileData.name };
            }
            return {
                thumbnail: fileData.thumbnail,
                sized: fileData.sized,
                original: fileData.original
            };
        });

        console.log('Processed files:', processedFiles);
        const allFiles = storedFiles.concat(processedFiles);

        // Remove duplicates
        const uniqueFiles = Array.from(new Set(allFiles.map(file => file.sized || file.error)))
            .map(uniqueKey => {
                return allFiles.find(file => file.sized === uniqueKey || file.error === uniqueKey);
            });

        displayUploadedFiles(uniqueFiles, container);

        // Save the processed files to local storage
        localStorage.setItem(storageKey, JSON.stringify(uniqueFiles));
        console.log('Processed files saved to local storage');
    } catch (error) {
        console.error('Error uploading file:', error);
    } finally {
        // Hide the loading spinner
        loadingSpinner.style.display = 'none';
    }
}
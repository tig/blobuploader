import { heicTo, isHeic } from 'heic-to';

const { maxWidth, maxHeight } = window.acpSettings;

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
});


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

// Handle file uploads
async function uploadFiles(files, hiddenField, loadingSpinner, uploadedFilesContainer) {
    const storedFiles = getStoredFiles(hiddenField);

    for (const file of files) {
        const uploadedFile = await uploadSingleFile(file, loadingSpinner, uploadedFilesContainer);
        if (uploadedFile && uploadedFile.length > 0) {
            //console.log('Uploaded file:', uploadedFile);
            storedFiles.push(...uploadedFile); // Spread the array to merge it into storedFiles
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
async function uploadSingleFile(file, loadingSpinner, uploadedFilesContainer) {
    console.log('uploadSingleFile - file:', file);
   
    let fileToUpload = file;

    // Check if the file is an HEIC file and convert it to JPG
    if (await isHeic(file)) {
        try {
            // Show the loading spinner
            loadingSpinner.style.display = 'block';
            const convertedBlob = await heicTo({
                blob: file,
                type: "image/jpeg",
                quality: 0.9
              })

            // Log the converted blob details
            console.log('Converted Blob:', convertedBlob);

            // Create a new File object from the converted Blob
            const fileName = file.name.replace(/\.[^/.]+$/, ".jpg");
            const fileType = 'image/jpeg';
            fileToUpload = new File([convertedBlob], fileName, { type: fileType });

        } catch (error) {
            console.error('Error converting HEIC file:', error);
            alert('Error converting HEIC file to JPG.' + error);
            return [];
        } finally {
            // Hide the loading spinner
            loadingSpinner.style.display = 'none';
        }
    }

    // // Resize the image to a maximum resolution of 4K (3840x2160)
    // try {
    //     loadingSpinner.style.display = 'block';
    //     const resizedBlob = await resizeImage(fileToUpload, maxWidth, maxHeight);
    //     fileToUpload = new File([resizedBlob], fileToUpload.name, { type: fileToUpload.type });

    //     // Log the resized File object details
    //     console.log('Resized File object:', fileToUpload);
    // } catch (error) {
    //     console.error('Error resizing image:' + error);
    //     alert('Error resizing image. Please try a different file.');
    //     return [];
    // } finally {
    //     // Hide the loading spinner
    //     loadingSpinner.style.display = 'none';
    // }

    console.log('fileToUpload:', fileToUpload);

    const formData = new FormData();
    formData.append('image', fileToUpload, fileToUpload.name);

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

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
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
        // Hide the loading spinner
        loadingSpinner.style.display = 'none';
    }
}

// Display uploaded files
function displayUploadedFiles(files, container) {
    container.innerHTML = '';
    //console.log('Files passed to displayUploadedFiles:', files);

    files.forEach(fileData => {
        if (fileData && fileData.original) {
            //console.log('Displaying file:', fileData);
            //console.log('Original:', fileData.original);

            // Render the file details here
        } else {
            console.warn('File data is not as expected:', fileData);
        }

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

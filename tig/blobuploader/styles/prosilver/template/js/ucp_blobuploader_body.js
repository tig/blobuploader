document.addEventListener('DOMContentLoaded', function () {
    const containerUrl = window.blobStoreSASUrl; // URL to the blob container
    const userId = window.userId; // Current user ID
    const maxPhotosPerUser = null; // No limit if null
    const thumbnailBlobRegex = /^uploads\/(\d+)\/([\w\d]+)_thumbnail\.(\w+)$/; // Only match `_thumbnail` blobs
    const galleryExplain = document.getElementById('gallery_explain');

    // Fetch `_thumbnail` blobs for the current user
    async function fetchBlobsForUser(userId) {
        const blobs = [];
        let marker = "";
        const pageSize = 100; // Adjust the number of blobs per page for testing or optimization

        // Replace %s in #gallery_explain with the number of photos
        galleryExplain.textContent = galleryExplain.textContent.replace('%s', 0);
        
        try {
            do {
                const response = await fetch(
                    `${containerUrl}&restype=container&comp=list&prefix=uploads/${userId}/&marker=${marker}&maxresults=${pageSize}`
                );
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const textResponse = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(textResponse, "application/xml");

                const blobElements = Array.from(xmlDoc.getElementsByTagName("Blob"));
                blobElements.forEach(blob => {
                    const name = blob.getElementsByTagName("Name")[0]?.textContent;
                    const lastModified = blob.getElementsByTagName("Last-Modified")[0]?.textContent;
                
                    if (name && lastModified && thumbnailBlobRegex.test(name)) {
                        const match = name.match(thumbnailBlobRegex);
                        const [, , hash, extension] = match;
                
                        const baseUrl = containerUrl.split('?')[0];
                
                        blobs.push({
                            name,
                            lastModified: new Date(lastModified),
                            url: `${baseUrl}/${name}`,
                            originalUrl: `${baseUrl}/${name.replace('_thumbnail', '_original')}`,
                            sizedUrl: `${baseUrl}/${name.replace('_thumbnail', '_sized')}`
                        });
                    }
                });

                // Get the next marker for pagination
                marker = xmlDoc.getElementsByTagName("NextMarker")[0]?.textContent || "";
            } while (marker && (maxPhotosPerUser === null || blobs.length < maxPhotosPerUser));

           
            return blobs;
        } catch (error) {
            console.error("Error in fetchBlobsForUser:", error);
            throw error;
        }
    }

    // Display the photos for the current user
    async function displayUserPhotos() {
        try {
            const blobs = await fetchBlobsForUser(userId);
            
            // Sort blobs by lastModified in descending order (newer first)
            blobs.sort((a, b) => b.lastModified - a.lastModified);

            // Replace %s in #gallery_explain with the number of photos
            galleryExplain.textContent = galleryExplain.textContent.replace('0', blobs.length);

            const photoGrid = document.getElementById('photo-grid');
            photoGrid.innerHTML = ''; // Clear existing photos

            blobs.forEach(blob => {
                const photoBox = document.createElement('div');
                photoBox.className = 'photo-box';

                const link = document.createElement('a');
                link.href = blob.originalUrl;
                link.target = '_blank';

                const img = document.createElement('img');
                img.src = blob.url;
                img.alt = blob.name;
                img.title = `Uploaded on ${blob.lastModified.toLocaleString()}`;

                link.appendChild(img);
                photoBox.appendChild(link);

                const bbcodeTag = '[url=' + blob.originalUrl + ']\n  [img]' + blob.sizedUrl + '[/img]\n[/url]';

                const copyButton = createCopyButton(bbcodeTag, 'Copy BBcode');
                photoBox.appendChild(copyButton);

                photoGrid.appendChild(photoBox);
            });
        } catch (error) {
            console.error("Error in displayUserPhotos:", error);
        }
    }

    // Create copy button
    function createCopyButton(bbcode, title) {
        const container = document.createElement('div');
        container.className = 'copy-container';

        const button = document.createElement('button');
        button.innerHTML = '<i class="copy-button fa fa-clipboard"></i> Copy BBcode';
        button.title = title;
        button.addEventListener('click', (event) => {
            event.preventDefault();
            navigator.clipboard.writeText(bbcode).then(() => {
                console.log('Copied to clipboard');
            }).catch(err => {
                console.error('Failed to copy:', err);
            });
        });

        container.appendChild(button);
        return container;
    }

    // Initialize the photo display
    displayUserPhotos();
});
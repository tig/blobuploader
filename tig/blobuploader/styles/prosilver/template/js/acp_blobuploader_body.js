/**
 * ACP gallery loader for Azure Blob Service mode only.
 * Local/mount mode is server-rendered in acp_blobuploader_body.html.
 */
document.addEventListener('DOMContentLoaded', function () {
    const maxPhotos = 100;
    const thumbnailBlobRegex = /^uploads\/(\d+)\/([\w\d]+)_thumbnail\.(.+)$/;
    const pageSize = 100;
    const errorMessage = document.getElementById('error-message');
    const recentPhotosElement = document.getElementById('recent-photos');

    if (!window.blobStoreSASUrl || !recentPhotosElement) {
        if (errorMessage) {
            errorMessage.textContent = 'Blob SAS URL is not configured.';
        }
        return;
    }

    async function fetchThumbnailBlobs() {
        let marker = '';
        const blobs = [];
        const sasUrl = window.blobStoreSASUrl;

        do {
            const response = await fetch(
                `${sasUrl}&restype=container&comp=list&prefix=uploads/&marker=${marker}&maxresults=${pageSize}`
            );
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const textResponse = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(textResponse, 'application/xml');

            Array.from(xmlDoc.getElementsByTagName('Blob')).forEach(blob => {
                const name = blob.getElementsByTagName('Name')[0]?.textContent;
                const lastModified = blob.getElementsByTagName('Last-Modified')[0]?.textContent;
                if (name && lastModified && thumbnailBlobRegex.test(name)) {
                    blobs.push({ name, lastModified: new Date(lastModified) });
                }
            });

            marker = xmlDoc.getElementsByTagName('NextMarker')[0]?.textContent || '';
        } while (marker);

        blobs.sort((a, b) => b.lastModified - a.lastModified);
        return blobs;
    }

    function renderRecentPhotos(blobs) {
        recentPhotosElement.innerHTML = '';
        blobs.slice(0, maxPhotos).forEach(blob => {
            const thumbnailUrl = `${window.blobStoreSASUrl.split('?')[0]}/${blob.name}`;
            const originalUrl = thumbnailUrl.replace('_thumbnail', '_original');
            const link = document.createElement('a');
            link.href = originalUrl;
            link.target = '_blank';
            link.rel = 'noopener';
            const img = document.createElement('img');
            img.src = thumbnailUrl;
            link.appendChild(img);
            recentPhotosElement.appendChild(link);
        });
    }

    fetchThumbnailBlobs()
        .then(renderRecentPhotos)
        .catch(error => {
            console.error('Error fetching thumbnail blobs:', error);
            if (errorMessage) {
                errorMessage.textContent = `Failed to load recent photos: ${error.message}`;
            }
        });
});


document.addEventListener('DOMContentLoaded', function () {
    const useBlobServiceRadios = document.querySelectorAll('input[name="use_blob_service"]');
    const blobServiceSettings = document.getElementById('blob_service_settings');

    // Function to toggle visibility
    function toggleSettings() {
        const isBlobServiceEnabled = document.querySelector('input[name="use_blob_service"]:checked').value === '1';
        if (isBlobServiceEnabled) {
            blobServiceSettings.style.display = 'block';
        } else {
            blobServiceSettings.style.display = 'none';
        }
    }

    // Add event listeners to radios
    useBlobServiceRadios.forEach(radio => {
        radio.addEventListener('change', toggleSettings);
    });

    // Initial toggle based on current selection
    toggleSettings();

    // Display the most recent photos uploaded

    const maxPhotos = 100; // Limit the number of photos to display
    const thumbnailBlobRegex = /^uploads\/(\d+)\/([\w\d]+)_thumbnail\.(.+)$/; // Only match `_thumbnail` blobs
    const pageSize = 100; // Number of blobs to fetch per request

    // Fetch all `_thumbnail` blobs under /uploads (Azure Blob list API)
    async function fetchThumbnailBlobs() {
        let marker = "";
        const blobs = [];
        const sasUrl = window.blobStoreSASUrl || '';

        if (!sasUrl) {
            throw new Error('Blob SAS URL is not configured');
        }

        try {
            do {
                const response = await fetch(
                    `${sasUrl}&restype=container&comp=list&prefix=uploads/&marker=${marker}&maxresults=${pageSize}`
                );
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const textResponse = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(textResponse, "application/xml");

                // Process only `_thumbnail` blobs in the current batch
                const blobElements = Array.from(xmlDoc.getElementsByTagName("Blob"));
                blobElements.forEach(blob => {
                    const name = blob.getElementsByTagName("Name")[0]?.textContent;
                    const lastModified = blob.getElementsByTagName("Last-Modified")[0]?.textContent;

                    if (name && lastModified && thumbnailBlobRegex.test(name)) {
                        blobs.push({
                            name,
                            lastModified: new Date(lastModified),
                        });
                    }
                });

                // Update marker for pagination
                marker = xmlDoc.getElementsByTagName("NextMarker")[0]?.textContent || "";
            } while (marker);

            // Sort blobs by lastModified in descending order
            blobs.sort((a, b) => b.lastModified - a.lastModified);

            return blobs;
        } catch (error) {
            console.error("Error fetching thumbnail blobs:", error);
            throw error;
        }
    }

    // Render Azure list results
    function renderRecentPhotosAzure(blobs) {
        const recentPhotosElement = document.getElementById("recent-photos");
        recentPhotosElement.innerHTML = "";

        blobs.slice(0, maxPhotos).forEach(blob => {
            const thumbnailUrl = `${window.blobStoreSASUrl.split("?")[0]}/${blob.name}`;
            const originalUrl = thumbnailUrl.replace("_thumbnail", "_original");

            const link = document.createElement("a");
            link.href = originalUrl;
            link.target = "_blank";

            const img = document.createElement("img");
            img.src = thumbnailUrl;
            link.appendChild(img);

            recentPhotosElement.appendChild(link);
        });
    }

    // Render local-mode photos from server-side index / seed
    function renderRecentPhotosLocal(photos) {
        const recentPhotosElement = document.getElementById("recent-photos");
        recentPhotosElement.innerHTML = "";

        if (!photos || !photos.length) {
            const errorMessage = document.getElementById("error-message");
            errorMessage.textContent = 'No recent photos in the local index yet. New uploads will appear here automatically.';
            return;
        }

        photos.slice(0, maxPhotos).forEach(photo => {
            const link = document.createElement("a");
            link.href = photo.original || photo.thumbnail;
            link.target = "_blank";

            const img = document.createElement("img");
            img.src = photo.thumbnail;
            img.alt = photo.thumbnail || 'thumbnail';
            link.appendChild(img);

            recentPhotosElement.appendChild(link);
        });
    }

    // Main function
    async function main() {
        const errorMessage = document.getElementById("error-message");
        const useBlob = !!window.useBlobService;
        const localPhotos = Array.isArray(window.recentPhotosLocal) ? window.recentPhotosLocal : [];

        try {
            // Local filesystem / mount mode: never hit the Azure list API
            if (!useBlob || !window.blobStoreSASUrl) {
                renderRecentPhotosLocal(localPhotos);
                return;
            }

            const blobs = await fetchThumbnailBlobs();
            renderRecentPhotosAzure(blobs);
        } catch (error) {
            errorMessage.textContent = `Failed to load recent photos: ${error.message}`;
        }
    }

    // Start the script
    main();

});

document.addEventListener('DOMContentLoaded', function () {
    const useBlobServiceRadios = document.querySelectorAll('input[name="use_blob_service"]');
    const blobServiceSettings = document.getElementById('blob_service_settings');
    const localStorageSettings = document.getElementById('local_storage_settings');

    // Function to toggle visibility
    function toggleSettings() {
        const isBlobServiceEnabled = document.querySelector('input[name="use_blob_service"]:checked').value === '1';
        if (isBlobServiceEnabled) {
            blobServiceSettings.style.display = 'block';
            localStorageSettings.style.display = 'none';
        } else {
            blobServiceSettings.style.display = 'none';
            localStorageSettings.style.display = 'block';
        }
    }

    // Add event listeners to radios
    useBlobServiceRadios.forEach(radio => {
        radio.addEventListener('change', toggleSettings);
    });

    // Initial toggle based on current selection
    toggleSettings();
});
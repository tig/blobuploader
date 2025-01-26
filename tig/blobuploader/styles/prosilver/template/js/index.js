// index.js
import { BlobServiceClient } from '@azure/storage-blob';

// Expose BlobServiceClient to the global scope
window.BlobServiceClient = BlobServiceClient;


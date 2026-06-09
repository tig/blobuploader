# blobuploader
A PhpBB extension that adds drag-and-drop file and photo uploading. Uploaded photos are resized into `original` / `sized` / `thumbnail` variants and stored on whatever backend you point it at.

![demo](https://github.com/user-attachments/assets/e1263539-d619-4ae3-abf5-99cf5a4a08b9)

## Storage backends

There are two storage modes, controlled by the **"Use Azure Blob Service"** toggle in the ACP (`tig_use_blob_service`).

### Local filesystem + mount redirection (recommended)

Set **Use Azure Blob Service = off** (`tig_use_blob_service = 0`). In this mode the extension:

- writes uploads to a local directory (`url_base` + `mount_dir`, e.g. `images/uploads/<user_id>/`),
- resizes images on the server with ImageMagick (`processSingleFileLocal`),
- serves them as plain static files under `url_base` (e.g. `/images/...`).

No cloud SDK, no connection string, no external image-processing function. The extension only ever touches a local path.

The trick that makes this work great: that "local" directory does not have to be a real local disk. Point it wherever you like with a symlink or a FUSE mount and the extension neither knows nor cares. Proven options:

- a plain HDD/SSD on the server,
- an **Azure Blob** container mounted with [blobfuse2](https://github.com/Azure/azure-storage-fuse),
- a **Cloudflare R2** bucket (or any S3-compatible store) mounted with [rclone](https://rclone.org/) (`rclone mount`).

Because storage is chosen at the mount layer, switching providers is an ops-only change: swap the mount, no PhpBB code or config changes. www.mye28.com runs exactly this way and migrated its ~49 GB of photos from Azure Blob to Cloudflare R2 purely by re-pointing the mount, with no edits to the board.

### Direct Azure Blob Service (not preferred)

Set **Use Azure Blob Service = on** (`tig_use_blob_service = 1`). In this mode the extension talks to Azure Blob Storage through a connection string / SAS URL and offloads image resizing to a separate Azure Function ([blobuploader-imageprocessor](https://github.com/tig/blobuploader-imageprocessor), `processSingleFileRemote`).

This mode still works but is **not recommended**:

- it locks you to Azure Blob plus a deployed Azure Function,
- it adds per-operation (LIST / GET / PUT) charges that the local-filesystem mode avoids,
- it is more moving parts to deploy, secure, and operate.

Prefer the local-filesystem mode above and pick your storage at the mount layer instead.

## Current Status

This extension was written for www.mye28.com, but I attempted to author it generically so it can be used on any PhpBB board.

Issues that will make it difficult to deploy:

### The extension doesn't actually build/package

I've not actually done the work to package this extension up properly. I deploy it by simply copying the `./tig/blobuploader` folder to my PhpBB `./ext` folder.

### CKEditor dependency

www.mye28.com uses a bastardized version of [CKEditor 4](https://www.phpbb.com/customise/db/extension/ckeditor_for_phpbb/). It *should* degrade and work fine without CKEditor, but that's not been tested.

For this to work with CKEditor, you'll need my mods to that extension which I've not yet put anywhere.

### blobuploader-imageprocessor (only for the non-preferred blob-service mode)

When **Use Azure Blob Service = on**, the server-side uploader (`blobuploader.php`) resizes the `_sized` and `_thumbnail` images by calling an Azure Function, [blobuploader-imageprocessor](https://github.com/tig/blobuploader-imageprocessor), written in C# using SixLabors.ImageSharp. To use that mode you'll need to set up an Azure account and deploy `blobuploader-imageprocessor`.

You almost certainly don't need it: in the recommended local-filesystem mode (**Use Azure Blob Service = off**) resizing is done on the box with ImageMagick (`processSingleFileLocal`), and the Function is never called.

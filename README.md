# blobuploader
PhpBB extension that provides file and photo uploading to a blob storage backend, like Amazon S3 or Azure Blob Storage.

![demo](https://github.com/user-attachments/assets/e1263539-d619-4ae3-abf5-99cf5a4a08b9)

## Current Status

This extension was written for www.mye28.com, but I attempted to author it generically so it can be used on any PhpBB board.

Issues that will make it difficult to deploy:

### The extension doesn't actually build/package

I've not actually done the work to package this extension up properly. I deploy it by simply copying the `./tig/blobuploader` folder to my PhpBB `./ext` folder.

### CKEditor dependency

www.mye28.com uses a bastardized version of [CKEditor 4](https://www.phpbb.com/customise/db/extension/ckeditor_for_phpbb/). It *should* degrade and work fine without CKEditor, but that's not been tested.

For this to work with CKEditor, you'll need my mods to that extension which I've not yet put anywhere.

### blobuploader-imageprocessor

The server side uploader code (blobuploader.php) currently uses an Azure Function [blobuploader-imageprocessor](https://github.com/tig/blobuploader-imageprocessor) written in C# that uses SixImages.ImageSharp to resize the `_sized` and `_thumbnail` images. In order to make use of this, you'll need to setup an Azure account and deploy `blobuploader-imageprocessor`. 

`blobuploader.php` actually still has the local processing code (using ImageMagick) in it, but it's not in the codepath. 


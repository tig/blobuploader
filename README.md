# blobuploader
PhpBB extension that provides file and photo uploading to a blob storage backend, like Amazon S3 or Azure Blob Storage.

## Current Status

This extension was written for www.mye28.com, but I attempted to author it generically so it can be used on any PhpBB board.

Issues that will make it difficult to deploy:

### blobuploader-imageprocessor

The server side uploader code (blobuploader.php) currently uses an Azure Function [blobuploader-imageprocessor](https://github.com/tig/blobuploader-imageprocessor) written in C# that uses SixImages.ImageSharp to resize the `_sized` and `_thumbnail` images. In order to make use of this, you'll need to setup an Azure account and deploy `blobuploader-imageprocessor`. 

`blobuploader.php` actually still has the local processing code (using ImageMagick) in it, but it's not in the codepath. 


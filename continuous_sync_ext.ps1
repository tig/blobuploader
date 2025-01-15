# Define source and target directories
$SourceDir = "/home/tig/s/blobuploader/tig/"
$TargetDir = "/var/www/html/phpbb/ext/tig/"

# Rsync options
$RsyncOptions = "-av --delete"

# Start watching for changes
Write-Output "Monitoring $SourceDir for changes..."
while ($true) {
    # Use inotifywait to wait for changes in the source directory
    & inotifywait -r -e modify,create,delete $SourceDir

    # Sync changes
    Write-Output "Detected change in $SourceDir. Syncing to $TargetDir..."
    rsync $RsyncOptions $SourceDir/ $TargetDir/
    Write-Output "Sync completed."
}

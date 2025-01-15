# Define source and target directories
$SourceDir = "/home/tig/s/blobuploader/tig/"
$TargetDir = "/var/www/html/phpbb/ext/tig/"

# Rsync options
$RsyncOptions = "-av --delete"

# Run rsync with sudo
Write-Output "Starting sync from $SourceDir to $TargetDir..."
bash -c "sudo rsync $RsyncOptions $SourceDir $TargetDir"
Write-Output "Sync completed successfully."

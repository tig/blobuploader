# Define source and target directories
$SourceDir = "./tig/blobuploader/"
$TargetDir = "/var/www/html/phpbb/ext/tig/"

# Rsync options
#$RsyncOptions = "-av --delete"
$RsyncOptions = "-av --ignore-existing --no-perms --no-owner --no-group"

# Run rsync with sudo
Write-Output "Starting sync from $SourceDir to $TargetDir..."
bash -c "sudo rsync $RsyncOptions $SourceDir $TargetDir"
Write-Output "Sync completed successfully."

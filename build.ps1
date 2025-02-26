$iconSizes = @(16, 48, 64, 128)

if (!(Test-Path .\icons)) {
	New-item -ItemType Directory .\icons
}

if (!(Test-Path .\dist)) {
	New-item -ItemType Directory .\dist
}

foreach ($size in $iconSizes) {
    ffmpeg -i .\icon.png -vf "scale=${size}:${size}" ".\icons\icon${size}.png" -y
}

$files = (
    ".\content-script.js",
    ".\sharp-viewer.css",
    ".\manifest.json",
    ".\icons\",
    ".\background.js"
)

Compress-Archive -Path $files -DestinationPath .\dist\SharpViewer.zip -Force

$iconSizes = @(16, 48, 64, 128)

if (!(Test-Path .\icons)) {
    New-item -ItemType Directory .\icons
}

if (!(Test-Path .\dist)) {
    New-item -ItemType Directory .\dist
}

foreach ($size in $iconSizes) {
    if (!(Test-Path ".\icons\icon${size}.png")) {
        magick .\icon.png -resize ${size}x${size}".\icons\icon${size}.png"
    }
}

$files = (
    ".\sharp-viewer.css",
    ".\manifest.json",
    ".\icons\",
    ".\background.js",
    ".\scripts\",
    ".\options.html",
    ".\options.js",
    "LICENSE"
)

Compress-Archive -Path $files -DestinationPath .\dist\SharpViewer.zip -Force

# unzip to .\dist\SharpViewer for testing
Expand-Archive -Path .\dist\SharpViewer.zip -DestinationPath .\dist\SharpViewer -Force

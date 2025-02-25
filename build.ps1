$iconSizes = @(16, 48, 64, 128)

foreach ($size in $iconSizes) {
    ffmpeg -i .\icon.png -vf "scale=${size}:${size}" ".\icons\icon${size}.png" -y
}

$files = (
    ".\content-script.js",
    ".\sharp-viewer.css",
    ".\manifest.json",
    ".\icons\"
)

Compress-Archive -Path $files -DestinationPath .\dist\SharpViewer.zip -Force
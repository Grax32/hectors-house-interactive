$tracksPath = "content-files/music/albums/hectors-house/tracks"
if (Test-Path $tracksPath) {
    Get-ChildItem -Path $tracksPath -Directory | ForEach-Object {
        $trackFolder = $_.FullName
        $folderName = $_.Name
        $trackSlug = $folderName -replace "^\d+-", ""
        
        $existingArtwork = Get-ChildItem -Path $trackFolder -File | Where-Object { $_.BaseName -eq "artwork" -and $_.Extension -match "^\.(png|jpg|jpeg|webp)$" }
        if ($existingArtwork) {
            $tallFileName = "$trackSlug-tall$($existingArtwork.Extension)"
            Rename-Item -Path $existingArtwork.FullName -NewName $tallFileName -Force
        }

        $chatGptImage = Get-ChildItem -Path $trackFolder -Filter "ChatGPT Image*.png" | Select-Object -First 1
        if ($chatGptImage) {
            Rename-Item -Path $chatGptImage.FullName -NewName "artwork.png" -Force
        }

        $jsonPath = Join-Path $trackFolder "song.json"
        if (Test-Path $jsonPath) {
            $json = Get-Content $jsonPath | ConvertFrom-Json
            $json.artwork = "artwork.png"
            $json | ConvertTo-Json | Set-Content $jsonPath
        }
    }

    Get-ChildItem -Path $tracksPath -Directory | ForEach-Object {
        $trackFolder = $_.Name
        $trackSlug = $trackFolder -replace "^\d+-", ""
        $tallFile = Get-ChildItem -Path $_.FullName -Filter "$trackSlug-tall.*" | Select-Object -ExpandProperty Name -ErrorAction SilentlyContinue
        $artworkExists = Test-Path (Join-Path $_.FullName "artwork.png")
        $songJsonValue = "N/A"
        if (Test-Path (Join-Path $_.FullName "song.json")) {
             $songJsonValue = (Get-Content (Join-Path $_.FullName "song.json") | ConvertFrom-Json).artwork
        }
        [PSCustomObject]@{
            TrackFolder = $trackFolder
            TallFile = $tallFile
            ArtworkPngExists = $artworkExists
            SongJsonArtwork = $songJsonValue
        }
    } | Format-Table -AutoSize
} else {
    Write-Host "Path not found: $tracksPath"
}

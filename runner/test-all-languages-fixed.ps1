$ErrorActionPreference = 'Stop'
$Image = 'polycompile-exec:latest'

$null = & docker image inspect $Image 2>$null
if ($LASTEXITCODE -ne 0) {
    throw "Docker image '$Image' is not available. Build it first: docker build --pull -t $Image -f runner/Dockerfile ."
}

Write-Host 'Running the 55-language interactive runtime smoke suite...' -ForegroundColor Cyan
& docker run --rm --network none --memory 1g --memory-swap 1g --cpus 1 `
    --entrypoint node $Image /opt/runtime-smoke-test.js
if ($LASTEXITCODE -ne 0) {
    throw 'One or more language runtimes failed the 55-language smoke suite.'
}
Write-Host 'All 55 catalogue language smoke programs passed.' -ForegroundColor Green

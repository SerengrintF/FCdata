# UTF-8 인코딩으로 파일 읽기
$ErrorActionPreference = "Stop"

# js와 css 디렉토리 생성
New-Item -ItemType Directory -Path "js" -Force | Out-Null
New-Item -ItemType Directory -Path "css" -Force | Out-Null
Write-Host "디렉토리 생성 완료"

# script.js 분할
Write-Host "`nscript.js 분할 시작..."
$lines = Get-Content "script.js" -Encoding UTF8
Write-Host "전체 줄 수: $($lines.Count)"

# common.js (0-685 인덱스 = 1-686줄)
$lines[0..685] | Set-Content "js\common.js" -Encoding UTF8
Write-Host "✓ js\common.js 생성 완료 (1-686줄)"

# dashboard.js (686-4986 인덱스 = 687-4987줄)
$lines[686..4986] | Set-Content "js\dashboard.js" -Encoding UTF8
Write-Host "✓ js\dashboard.js 생성 완료 (687-4987줄)"

# team-analysis.js (4987-6894 인덱스 = 4988-6895줄)
$lines[4987..6894] | Set-Content "js\team-analysis.js" -Encoding UTF8
Write-Host "✓ js\team-analysis.js 생성 완료 (4988-6895줄)"

# formation-analysis.js (6895-끝 인덱스 = 6896줄-끝)
$lines[6895..($lines.Count-1)] | Set-Content "js\formation-analysis.js" -Encoding UTF8
Write-Host "✓ js\formation-analysis.js 생성 완료 (6896-$($lines.Count)줄)"

# style.css 분할
Write-Host "`nstyle.css 분할 시작..."
$lines = Get-Content "style.css" -Encoding UTF8
Write-Host "전체 줄 수: $($lines.Count)"

# common.css (0-868 인덱스 = 1-869줄)
$lines[0..868] | Set-Content "css\common.css" -Encoding UTF8
Write-Host "✓ css\common.css 생성 완료 (1-869줄)"

# dashboard.css (869-4230 인덱스 = 870-4231줄)
$lines[869..4230] | Set-Content "css\dashboard.css" -Encoding UTF8
Write-Host "✓ css\dashboard.css 생성 완료 (870-4231줄)"

# team-analysis.css (4231-5869 인덱스 = 4232-5870줄)
$lines[4231..5869] | Set-Content "css\team-analysis.css" -Encoding UTF8
Write-Host "✓ css\team-analysis.css 생성 완료 (4232-5870줄)"

# formation-analysis.css (5870-끝 인덱스 = 5871줄-끝)
$lines[5870..($lines.Count-1)] | Set-Content "css\formation-analysis.css" -Encoding UTF8
Write-Host "✓ css\formation-analysis.css 생성 완료 (5871-$($lines.Count)줄)"

Write-Host "`n모든 파일 분할 완료!"


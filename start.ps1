# 统一启动脚本（Windows）
# 一键拉起工作区内两个服务，端口错开避免冲突：
#   任务管理系统  -> http://localhost:3000
#   井明官网      -> http://localhost:4000  (后台 http://localhost:4000/admin.html)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$npm = if (Get-Command npm.cmd -ErrorAction SilentlyContinue) { "npm.cmd" } else { "npm" }

Write-Host "==> 启动 任务管理系统 (http://localhost:3000)" -ForegroundColor Cyan
Start-Process -FilePath $npm -ArgumentList "start" -WorkingDirectory (Join-Path $root "backend") -WindowStyle Normal

$env:PORT = "4000"
Write-Host "==> 启动 井明官网 (http://localhost:4000)" -ForegroundColor Cyan
Start-Process -FilePath $npm -ArgumentList "start" -WorkingDirectory (Join-Path $root "website") -WindowStyle Normal

Start-Sleep -Seconds 3
Write-Host ""
Write-Host "✅ 两个服务已启动：" -ForegroundColor Green
Write-Host "   任务管理系统: http://localhost:3000"
Write-Host "   井明官网前台: http://localhost:4000/"
Write-Host "   井明官网后台: http://localhost:4000/admin.html  (默认密码 admin123)"
Write-Host ""
Write-Host "提示：关闭窗口不会停止服务，结束对应的 node 进程即可。"

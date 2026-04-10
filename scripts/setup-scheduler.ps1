# 기존 작업 삭제
schtasks /delete /tn "Yuhaengwang_TrendUpdate" /f 2>$null

# 매일 00:00 실행으로 등록
schtasks /create /tn "Yuhaengwang_TrendUpdate" /tr "C:\Users\user\Desktop\Yuhaengwang\scripts\run-trends.bat" /sc daily /st 00:00 /rl HIGHEST /f

# 놓친 실행 보충 설정
$task = Get-ScheduledTask -TaskName "Yuhaengwang_TrendUpdate"
$task.Settings.StartWhenAvailable = $true
$task.Settings.ExecutionTimeLimit = "PT10M"
Set-ScheduledTask -InputObject $task

Write-Host ""
Write-Host "Done! Daily 00:00"
Write-Host ""
schtasks /query /tn "Yuhaengwang_TrendUpdate"
pause

@echo off
echo 트렌드 자동 업데이트 스케줄러 등록 중...

:: 매일 00:30에 run-trends.bat 실행 (1일 1회)
schtasks /create /tn "Yuhaengwang_TrendUpdate" /tr "cmd /c C:\Users\user\Desktop\Yuhaengwang\scripts\run-trends.bat" /sc daily /st 00:30 /rl HIGHEST /f

:: 놓친 실행 보충 + 실행 제한 10분
powershell -Command "$task = Get-ScheduledTask -TaskName 'Yuhaengwang_TrendUpdate'; $s = $task.Settings; $s.StartWhenAvailable = $true; $s.ExecutionTimeLimit = 'PT10M'; Set-ScheduledTask -TaskName 'Yuhaengwang_TrendUpdate' -Settings $s"

echo.
echo ✅ 등록 완료!
echo    - 매일 00:30 자동 실행 (1일 1회)
echo    - PC 꺼져있다 켜지면 놓친 실행 즉시 보충
echo    - 로그: scripts\logs\년도\월\일.log
echo.
echo 확인: schtasks /query /tn "Yuhaengwang_TrendUpdate"
echo 삭제: schtasks /delete /tn "Yuhaengwang_TrendUpdate" /f
pause

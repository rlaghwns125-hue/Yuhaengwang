@echo off
echo 트렌드 자동 업데이트 스케줄러 등록 중...

:: 매 시간 정각에 트렌드 업데이트 실행
schtasks /create /tn "Yuhaengwang_TrendUpdate" /tr "cmd /c cd /d C:\Users\user\Desktop\Yuhaengwang && node scripts\update-trends.js >> scripts\update-log.txt 2>&1" /sc hourly /st 00:00 /f

echo.
echo ✅ 등록 완료! 매 시간 정각에 트렌드가 자동 업데이트됩니다.
echo.
echo 확인: schtasks /query /tn "Yuhaengwang_TrendUpdate"
echo 삭제: schtasks /delete /tn "Yuhaengwang_TrendUpdate" /f
echo 수동 실행: npm run update-trends
echo 로그 확인: scripts\update-log.txt
pause

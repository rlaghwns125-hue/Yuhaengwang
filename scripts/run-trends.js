// update-trends.js 래퍼 — 날짜별 로그 폴더 관리
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
process.chdir(root);

// 날짜 폴더 생성 (scripts/logs/2026/04/09.log)
const now = new Date();
const yyyy = String(now.getFullYear());
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');

const logDir = path.join(root, 'scripts', 'logs', yyyy, mm);
fs.mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, `${dd}.log`);

// update-trends.js 실행 + 로그 저장
try {
  const output = execSync('node scripts/update-trends.js', { cwd: root, timeout: 600000, encoding: 'utf8' });
  fs.appendFileSync(logFile, output);
} catch (e) {
  fs.appendFileSync(logFile, e.stdout || '');
  fs.appendFileSync(logFile, e.stderr || '');
  fs.appendFileSync(logFile, `\n❌ 에러: ${e.message}\n`);
}

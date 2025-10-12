const fs = require('fs');
const path = require('path');

// 프로젝트 경로
const projectPath = 'C:\\Cursor_project\\server_1008_6 - 복사본';
process.chdir(projectPath);

// js와 css 디렉토리 생성
if (!fs.existsSync('js')) fs.mkdirSync('js');
if (!fs.existsSync('css')) fs.mkdirSync('css');


// script.js 분할
const scriptContent = fs.readFileSync('script.js', 'utf-8');
const scriptLines = scriptContent.split('\n');


// common.js (1-686줄)
fs.writeFileSync('js/common.js', scriptLines.slice(0, 686).join('\n'), 'utf-8');

// dashboard.js (687-4987줄)
fs.writeFileSync('js/dashboard.js', scriptLines.slice(686, 4987).join('\n'), 'utf-8');

// team-analysis.js (4988-6895줄)
fs.writeFileSync('js/team-analysis.js', scriptLines.slice(4987, 6895).join('\n'), 'utf-8');

// formation-analysis.js (6896줄-끝)
fs.writeFileSync('js/formation-analysis.js', scriptLines.slice(6895).join('\n'), 'utf-8');

// style.css 분할
const styleContent = fs.readFileSync('style.css', 'utf-8');
const styleLines = styleContent.split('\n');


// common.css (1-869줄)
fs.writeFileSync('css/common.css', styleLines.slice(0, 869).join('\n'), 'utf-8');

// dashboard.css (870-4231줄)
fs.writeFileSync('css/dashboard.css', styleLines.slice(869, 4231).join('\n'), 'utf-8');

// team-analysis.css (4232-5870줄)
fs.writeFileSync('css/team-analysis.css', styleLines.slice(4231, 5870).join('\n'), 'utf-8');

// formation-analysis.css (5871줄-끝)
fs.writeFileSync('css/formation-analysis.css', styleLines.slice(5870).join('\n'), 'utf-8');



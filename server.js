require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 8000;

// 외부 모듈
const { NEXON_BASE, buildUserMatchUrl, buildMatchDetailUrl, callNexonAPI } = require('./lib/api');
const { handleApiRoutes } = require('./lib/routes');
const { sendJson, sendRawJson, mimeTypes } = require('./lib/respond');
const { logVisit } = require('./lib/analytics');

const server = http.createServer((req, res) => {
    // CORS 헤더 추가
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
    
    // 방문 로깅 (API 요청만, 관리자 API 제외)
    if (req.url.startsWith('/api/') && !req.url.startsWith('/api/admin/')) {
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'];
        logVisit(clientIP, userAgent);
    }
    
        // API 엔드포인트 처리 위임
        if (handleApiRoutes(req, res)) return;
        
        // 선수 이미지 프록시
        if (req.url.startsWith('/live/externalAssets/common/playersAction/')) {
            const spid = req.url.match(/p(\d+)\.png$/)?.[1];
            if (spid) {
                const imageUrl = `https://fo4.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${spid}.png`;
                
                const https = require('https');
                https.get(imageUrl, (imageRes) => {
                    res.setHeader('Content-Type', 'image/png');
                    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1일 캐시
                    imageRes.pipe(res);
                }).on('error', () => {
                    // 기본 이미지 반환
                    res.setHeader('Content-Type', 'image/svg+xml');
                    res.end(`<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="40" height="40" fill="#333"/>
                        <path d="M20 26C9 26 9 26 9 26V34H9V34H31V34H31V26C31 26 31 26 20 26Z" fill="#666"/>
                        <circle cx="20" cy="16" r="6" fill="#666"/>
                    </svg>`);
                });
                return;
            }
        }

    // 정적 파일 서빙
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    // 파일 확장자 확인
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeType = mimeTypes[extname] || 'application/octet-stream';

    // 파일 읽기
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // 404 오류
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`
                    <html>
                        <head>
                            <title>404 - 파일을 찾을 수 없습니다</title>
                            <meta charset="utf-8">
                        </head>
                        <body>
                            <h1>404 - 파일을 찾을 수 없습니다</h1>
                            <p>요청한 파일: ${filePath}</p>
                            <p><a href="/">홈으로 돌아가기</a></p>
                        </body>
                    </html>
                `);
            } else {
                // 서버 오류
                res.writeHead(500);
                res.end('서버 오류: ' + error.code);
            }
        } else {
            // 파일을 성공적으로 읽음
            res.writeHead(200, { 'Content-Type': mimeType + '; charset=utf-8' });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(port, () => {
});

const https = require('https');

const API_KEY = process.env.NEXON_API_KEY;
const NEXON_BASE = 'https://open.api.nexon.com/fconline/v1';
const MATCH_TYPE = 50;

// 환경 변수가 설정되지 않았으면 에러 발생
if (!API_KEY) {
    throw new Error('❌ NEXON_API_KEY 환경 변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
}

function buildUserMatchUrl(ouid, offset, limit) {
    return `${NEXON_BASE}/user/match?ouid=${ouid}&matchtype=${MATCH_TYPE}&offset=${offset}&limit=${limit}`;
}

function buildMatchDetailUrl(matchId) {
    return `${NEXON_BASE}/match-detail?matchid=${matchId}`;
}

function callNexonAPI(url, callback) {
    const options = {
        method: 'GET',
        headers: {
            'x-nxopen-api-key': API_KEY,
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            callback(null, res.statusCode, data);
        });
    });
    req.on('error', (error) => {
        callback(error, null, null);
    });
    req.end();
}

function callNexonAPIAsync(url) {
    return new Promise((resolve) => {
        callNexonAPI(url, (error, statusCode, data) => {
            if (error) {
                resolve({ ok: false, statusCode: statusCode || 0, data: null, error });
                return;
            }
            resolve({ ok: statusCode === 200, statusCode, data });
        });
    });
}

module.exports = {
    API_KEY,
    NEXON_BASE,
    MATCH_TYPE,
    buildUserMatchUrl,
    buildMatchDetailUrl,
    callNexonAPI,
    callNexonAPIAsync,
};



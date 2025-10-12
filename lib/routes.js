const { NEXON_BASE, buildUserMatchUrl, buildMatchDetailUrl, callNexonAPI } = require('./api');
const { collectMatchInfosSequential, fetchMoreMatchDetails, fetchMatchDetailsWithRetry } = require('./match');
const { sendJson, sendRawJson } = require('./respond');
const { fetchGradeInfo } = require('./grade');
const { logSearch, logError, logVisit, generateStats } = require('./analytics');

const INITIAL_TARGET_MATCH_COUNT = 10;
const INITIAL_MAX_ATTEMPTS = 100;
const MORE_TARGET_MATCH_COUNT = 10;
const MORE_MAX_ATTEMPTS = 100;

// 초기 매치 상세 정보 조회 (match 모듈 위임 사용)

// 등급 응답은 grade 모듈에서 제공

function handleApiRoutes(req, res) {
    // 관리자 대시보드 통계 API
    if (req.url === '/api/admin/stats') {
        const adminNickname = process.env.ADMIN_NICKNAME || 'sereng88';
        
        // 인증 헤더 확인
        const authHeader = req.headers['x-admin-key'];
        const expectedKey = process.env.ADMIN_SECRET_KEY;
        
        if (!authHeader || authHeader !== expectedKey) {
            sendJson(res, 403, { error: '접근 권한이 없습니다' });
            return true;
        }
        
        const stats = generateStats();
        sendJson(res, 200, stats);
        return true;
    }

    if (req.url.startsWith('/api/user/matches/')) {
        // URL 파라미터 파싱: /api/user/matches/{ouid}?offset=10&limit=10
        const urlParts = req.url.split('?');
        const pathParts = urlParts[0].split('/');
        const ouid = pathParts[4];
        
        // 쿼리 파라미터 파싱
        let offset = 0;
        let limit = 10;
        if (urlParts[1]) {
            const params = new URLSearchParams(urlParts[1]);
            offset = parseInt(params.get('offset')) || 0;
            limit = parseInt(params.get('limit')) || 10;
        }
        
        const matchUrl = buildUserMatchUrl(ouid, offset, limit);
        
        callNexonAPI(matchUrl, (error, statusCode, data) => {
            if (error) { sendJson(res, 500, { error: '서버 오류', message: error.message }); return; }
            if (statusCode !== 200) { sendRawJson(res, statusCode, data); return; }
            try {
                const matchIds = JSON.parse(data);
                if (matchIds && matchIds.length > 0) {
                    fetchMoreMatchDetails(matchIds, ouid, res, limit, MORE_MAX_ATTEMPTS);
                } else {
                    sendJson(res, 200, { matches: [] });
                }
            } catch (e) {
                sendJson(res, 500, { error: '데이터 파싱 오류', message: e.message });
            }
        });
        return true;
    }

    if (req.url.startsWith('/api/more-matches/')) {
        const parts = req.url.split('/');
        const ouid = parts[3];
        const offset = parseInt(parts[4]) || 10;
        const limit = parseInt(parts[5]) || 10;
        const matchUrl = buildUserMatchUrl(ouid, offset, 10);
        callNexonAPI(matchUrl, (error, statusCode, data) => {
            if (error) { sendJson(res, 500, { error: '서버 오류', message: error.message }); return; }
            if (statusCode !== 200) { sendRawJson(res, statusCode, data); return; }
            try {
                const matchIds = JSON.parse(data);
                if (matchIds && matchIds.length > 0) {
                    fetchMoreMatchDetails(matchIds, ouid, res, MORE_TARGET_MATCH_COUNT, MORE_MAX_ATTEMPTS);
                } else {
                    sendJson(res, 200, { matches: [] });
                }
            } catch (e) {
                sendJson(res, 500, { error: '데이터 파싱 오류', message: e.message });
            }
        });
        return true;
    }

    if (req.url.startsWith('/api/debug/')) {
        const parts = req.url.split('/');
        const matchId = parts[3];
        if (!matchId) { sendJson(res, 400, { error: '매치 ID가 필요합니다' }); return true; }
        const matchDetailUrl = buildMatchDetailUrl(matchId);
        callNexonAPI(matchDetailUrl, (error, statusCode, data) => {
            if (error) { sendJson(res, 500, { error: 'API 호출 오류', message: error.message }); return; }
            sendRawJson(res, statusCode, data);
        });
        return true;
    }

    if (req.url.startsWith('/api/search/')) {
        const startTime = Date.now();
        const nickname = decodeURIComponent(req.url.split('/')[3]);
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        
        // 관리자 닉네임인지 확인
        const adminNickname = process.env.ADMIN_NICKNAME || 'sereng88';
        console.log('[관리자 체크]', {
            검색닉네임: nickname,
            관리자닉네임: adminNickname,
            일치여부: nickname === adminNickname
        });
        
        if (nickname === adminNickname) {
            // 관리자 대시보드 데이터 반환
            console.log('[관리자 대시보드] 데이터 생성 중...');
            const stats = generateStats();
            console.log('[관리자 대시보드] 데이터 전송:', {
                총검색: stats.summary.totalSearches,
                오늘검색: stats.summary.todaySearches
            });
            sendJson(res, 200, {
                isAdmin: true,
                adminDashboard: stats,
                nickname: adminNickname
            });
            return true;
        }
        
        const uidUrl = `${NEXON_BASE}/id?nickname=${encodeURIComponent(nickname)}`;
        callNexonAPI(uidUrl, (error, statusCode, data) => {
            const responseTime = Date.now() - startTime;
            
            if (error) {
                logSearch(nickname, clientIP, false, responseTime);
                logError('API_ERROR', error.message, req.url, clientIP);
                sendJson(res, 500, { error: '서버 오류', message: error.message });
                return;
            }
            
            if (statusCode !== 200) {
                logSearch(nickname, clientIP, false, responseTime);
                sendRawJson(res, statusCode, data);
                return;
            }
            
            try {
                const uidData = JSON.parse(data);
                const ouid = uidData.ouid;
                
                // 성공 로깅
                logSearch(nickname, clientIP, true, responseTime);
                
                const userInfoUrl = `${NEXON_BASE}/user/basic?ouid=${ouid}`;
                callNexonAPI(userInfoUrl, (error2, statusCode2, data2) => {
                    if (error2) { sendJson(res, 500, { error: '서버 오류', message: error2.message }); return; }
                    if (statusCode2 === 200) {
                        try {
                            const userInfo = JSON.parse(data2);
                            const matchUrl = buildUserMatchUrl(ouid, 0, 100);
                            callNexonAPI(matchUrl, (error3, statusCode3, data3) => {
                                if (error3) { sendJson(res, 200, userInfo); return; }
                                try {
                                    const matchIds = JSON.parse(data3);
                                    if (matchIds && matchIds.length > 0) {
                                        (async () => {
                                            const limitedMatches = await fetchMatchDetailsWithRetry(
                                                matchIds,
                                                ouid,
                                                INITIAL_TARGET_MATCH_COUNT,
                                                INITIAL_MAX_ATTEMPTS,
                                                '초기 로드'
                                            );
                                            fetchGradeInfo(ouid, userInfo, limitedMatches, res);
                                        })();
                                    } else {
                                        fetchGradeInfo(ouid, userInfo, [], res);
                                    }
                                } catch (e3) {
                                    sendJson(res, 200, userInfo);
                                }
                            });
                        } catch (e2) {
                            logError('PARSE_ERROR', e2.message, req.url, clientIP);
                            sendJson(res, 500, { error: '데이터 파싱 오류', message: e2.message });
                        }
                    } else {
                        sendRawJson(res, statusCode2, data2);
                    }
                });
            } catch (e) {
                logError('PARSE_ERROR', e.message, req.url, clientIP);
                sendJson(res, 500, { error: '데이터 파싱 오류', message: e.message });
            }
        });
        return true;
    }

    if (req.url.startsWith('/api/user/')) {
        const accessId = req.url.split('/')[3];
        const apiUrl = `${NEXON_BASE}/user/info?accessid=${accessId}`;
        callNexonAPI(apiUrl, (error, statusCode, data) => {
            if (error) { sendJson(res, 500, { error: '서버 오류', message: error.message }); return; }
            sendRawJson(res, statusCode, data);
        });
        return true;
    }

    if (req.url.startsWith('/api/maxdivision/')) {
        const ouid = req.url.split('/')[3];
        const maxDivisionUrl = `${NEXON_BASE}/user/maxdivision?ouid=${ouid}`;
        callNexonAPI(maxDivisionUrl, (error, statusCode, data) => {
            if (error) { sendJson(res, 500, { error: '서버 오류', message: error.message }); return; }
            sendRawJson(res, statusCode, data);
        });
        return true;
    }

    return false;
}

module.exports = {
    handleApiRoutes,
};



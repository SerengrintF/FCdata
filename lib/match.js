const { buildMatchDetailUrl, callNexonAPIAsync } = require('./api');
const { getPlayerName } = require('./spid');
const { getPositionDesc, getSeasonInfoFromSpId } = require('./meta');
const { sendJson } = require('./respond');

function isValidMatch(matchInfo) {
    if (!matchInfo) return false;
    if (matchInfo.opponentNickname === '상대방' || !matchInfo.opponentNickname) return false;
    if (matchInfo.matchId === 'unknown' || !matchInfo.matchId) return false;
    if (typeof matchInfo.userGoals !== 'number' || typeof matchInfo.opponentGoals !== 'number') return false;
    return true;
}

async function extractPlayerInfo(players) {
    if (!Array.isArray(players)) {
        return [];
    }
    const playerPromises = players.map(async (player) => {
        const playerName = await getPlayerName(player.spId);
        const positionDesc = getPositionDesc(player?.spPosition);
        const seasonInfo = getSeasonInfoFromSpId(player?.spId);
        return {
            spId: player.spId || 0,
            spName: playerName,
            spPosition: player.spPosition || 0,
            spPositionDesc: positionDesc || null,
            season: seasonInfo || null,
            spGrade: player.spGrade || 0,
            status: {
                goal: player.status?.goal || 0,
                assist: player.status?.assist || 0,
                shoot: player.status?.shoot || 0,
                effectiveShoot: player.status?.effectiveShoot || 0,
                yellowCard: player.status?.yellowCards || 0,
                redCard: player.status?.redCards || 0,
                spRating: player.status?.spRating || 0,
                // 패스 통계
                passSuccess: player.status?.passSuccess || player.status?.pass || 0,
                passTry: player.status?.passTry || 0,
                // 드리블 통계
                dribbleSuccess: player.status?.dribbleSuccess || player.status?.dribble || 0,
                dribbleTry: player.status?.dribbleTry || 0,
                // 수비 통계 - FIFA Online 4 API 표준 필드명 사용
                blockSuccess: player.status?.blockSuccess || player.status?.block || 0,
                blockTry: player.status?.blockTry || 0,
                tackleSuccess: player.status?.tackleSuccess || player.status?.tackle || 0,
                tackleTry: player.status?.tackleTry || 0,
                intercept: player.status?.intercept || 0,
                // 골 유형별 통계 - FIFA Online 4 API 표준 필드명 사용
                goalInPenalty: player.status?.goalInPenalty || 0,
                goalOutPenalty: player.status?.goalOutPenalty || 0,
                goalHeading: player.status?.goalHeading || 0,
                shootInPenalty: player.status?.shootInPenalty || 0,
                shootOutPenalty: player.status?.shootOutPenalty || 0,
                shootHeading: player.status?.shootHeading || 0,
                // 공중볼 통계 - FIFA Online 4 API 정확한 필드명 사용
                aerialTry: player.status?.aerialTry || 0,
                aerialSuccess: player.status?.aerialSuccess || 0
            }
        };
    });
    return await Promise.all(playerPromises);
}

async function extractMatchInfo(matchDetail, ouid) {
    try {
        if (!matchDetail || !matchDetail.matchInfo || !Array.isArray(matchDetail.matchInfo)) {
            return null;
        }
        
        let userInfo = null;
        let opponentInfo = null;
        matchDetail.matchInfo.forEach((info) => {
            if (info.ouid === ouid) {
                userInfo = info;
            } else {
                opponentInfo = info;
            }
        });
        if (!userInfo || !opponentInfo) {
            return null;
        }
        const userGoals = (userInfo.shoot && typeof userInfo.shoot.goalTotal === 'number') ? userInfo.shoot.goalTotal : 0;
        const opponentGoals = (opponentInfo.shoot && typeof opponentInfo.shoot.goalTotal === 'number') ? opponentInfo.shoot.goalTotal : 0;
        let matchResult = 0;
        if (userGoals > opponentGoals) matchResult = 1; else if (userGoals < opponentGoals) matchResult = 2;
        const [userPlayers, opponentPlayers] = await Promise.all([
            extractPlayerInfo(userInfo.player || []),
            extractPlayerInfo(opponentInfo.player || [])
        ]);
        // 디버깅: userInfo.shoot 구조 확인
        
        return {
            matchId: matchDetail.matchId || 'unknown',
            matchDate: matchDetail.matchDate || new Date().toISOString(),
            opponentNickname: opponentInfo.nickname || '상대방',
            userGoals,
            opponentGoals,
            matchResult,
            userPlayers,
            opponentPlayers,
            // 공식 경기 등급 정보 추가
            userDivision: userInfo.matchDetail?.division || null,
            opponentDivision: opponentInfo.matchDetail?.division || null,
            // 컨트롤러 정보 추가 (matchDetail.controller에서 추출)
            userController: userInfo.matchDetail?.controller || null,
            opponentController: opponentInfo.matchDetail?.controller || null,
            userStats: {
                possession: userInfo.matchDetail?.possession || 0,
                shoot: userInfo.shoot || {},
                pass: userInfo.pass || {},
                defence: userInfo.defence || {},
                division: userInfo.matchDetail?.division || null,
                controller: userInfo.matchDetail?.controller || null
            },
            opponentStats: {
                possession: opponentInfo.matchDetail?.possession || 0,
                shoot: opponentInfo.shoot || {},
                pass: opponentInfo.pass || {},
                defence: opponentInfo.defence || {},
                division: opponentInfo.matchDetail?.division || null,
                controller: opponentInfo.matchDetail?.controller || null
            }
        };
    } catch (_) {
        return null;
    }
}

async function collectMatchInfosSequential(matchIds, ouid, targetCount, maxAttempts, logPrefix) {
    const matchDetails = [];
    const attempts = Math.min(matchIds.length, maxAttempts);
    for (let i = 0; i < attempts; i++) {
        const matchId = matchIds[i];
        const matchDetailUrl = buildMatchDetailUrl(matchId);
        const { ok, statusCode, data } = await callNexonAPIAsync(matchDetailUrl);
        if (!ok) continue;
        try {
            const matchDetail = JSON.parse(data);
            const matchInfo = await extractMatchInfo(matchDetail, ouid);
            if (matchInfo && isValidMatch(matchInfo)) {
                matchDetails.push(matchInfo);
            }
        } catch (_) {}
        if (matchDetails.length >= targetCount) break;
    }
    return matchDetails.slice(0, targetCount);
}

async function fetchMatchDetailsWithRetry(matchIds, ouid, targetCount, maxAttempts, logPrefix = '초기 로드') {
    return await collectMatchInfosSequential(
        matchIds,
        ouid,
        targetCount,
        maxAttempts,
        logPrefix
    );
}

async function fetchMoreMatchDetails(matchIds, ouid, response, moreTarget = 10, moreAttempts = 30) {
    const limitedMatches = await collectMatchInfosSequential(
        matchIds,
        ouid,
        moreTarget,
        moreAttempts,
        '더보기'
    );
    sendJson(response, 200, { matches: limitedMatches });
}

// 경기 기록에서 등급 정보 추출 기능 삭제됨 - maxdivision API만 사용

module.exports = {
    isValidMatch,
    extractPlayerInfo,
    extractMatchInfo,
    collectMatchInfosSequential,
    fetchMatchDetailsWithRetry,
    fetchMoreMatchDetails,
};



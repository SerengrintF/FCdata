const { sendJson } = require('./respond');
const { NEXON_BASE, callNexonAPI } = require('./api');

// FC온라인 공식 경기 등급(디비전) 시스템
const DIVISION_GRADES = {
    800: { 
        name: "슈퍼챔피언스", 
        level: 1, 
        color: "#FFD700",
        emoji: "👑",
        description: "최고 등급"
    },
    900: { 
        name: "챔피언스", 
        level: 2, 
        color: "#C0C0C0",
        emoji: "🥇",
        description: "챔피언 등급"
    },
    1000: { 
        name: "슈퍼챌린지", 
        level: 3, 
        color: "#CD7F32",
        emoji: "🥈",
        description: "슈퍼챌린지 등급"
    },
    1100: { 
        name: "챌린지1", 
        level: 4, 
        color: "#8B4513",
        emoji: "🥉",
        description: "챌린지 1등급"
    },
    1200: { 
        name: "챌린지2", 
        level: 5, 
        color: "#8B4513",
        emoji: "🥉",
        description: "챌린지 2등급"
    },
    1300: { 
        name: "챌린지3", 
        level: 6, 
        color: "#8B4513",
        emoji: "🥉",
        description: "챌린지 3등급"
    },
    2000: { 
        name: "월드클래스1", 
        level: 7, 
        color: "#6B7280",
        emoji: "⭐",
        description: "월드클래스 1등급"
    },
    2100: { 
        name: "월드클래스2", 
        level: 8, 
        color: "#6B7280",
        emoji: "⭐",
        description: "월드클래스 2등급"
    },
    2200: { 
        name: "월드클래스3", 
        level: 9, 
        color: "#6B7280",
        emoji: "⭐",
        description: "월드클래스 3등급"
    },
    2300: { 
        name: "프로1", 
        level: 10, 
        color: "#4B5563",
        emoji: "🏆",
        description: "프로 1등급"
    },
    2400: { 
        name: "프로2", 
        level: 11, 
        color: "#4B5563",
        emoji: "🏆",
        description: "프로 2등급"
    },
    2500: { 
        name: "프로3", 
        level: 12, 
        color: "#4B5563",
        emoji: "🏆",
        description: "프로 3등급"
    },
    2600: { 
        name: "세미프로1", 
        level: 13, 
        color: "#374151",
        emoji: "🎯",
        description: "세미프로 1등급"
    },
    2700: { 
        name: "세미프로2", 
        level: 14, 
        color: "#374151",
        emoji: "🎯",
        description: "세미프로 2등급"
    },
    2800: { 
        name: "세미프로3", 
        level: 15, 
        color: "#374151",
        emoji: "🎯",
        description: "세미프로 3등급"
    },
    2900: { 
        name: "유망주1", 
        level: 16, 
        color: "#1F2937",
        emoji: "🌱",
        description: "유망주 1등급"
    },
    3000: { 
        name: "유망주2", 
        level: 17, 
        color: "#1F2937",
        emoji: "🌱",
        description: "유망주 2등급"
    },
    3100: { 
        name: "유망주3", 
        level: 18, 
        color: "#1F2937",
        emoji: "🌱",
        description: "유망주 3등급"
    }
};

// 디비전 ID로 등급 정보 조회
function getDivisionInfo(divisionId) {
    return DIVISION_GRADES[divisionId] || {
        name: "등급 없음",
        level: 0,
        color: "#6B7280",
        emoji: "❓",
        description: "등급 정보 없음"
    };
}

// 일반 division API는 사용하지 않음 - maxdivision API만 사용

// 최고 등급 조회 (maxdivision API 사용)
function fetchMaxDivisionGrade(ouid, callback) {
    const maxDivisionUrl = `${NEXON_BASE}/user/maxdivision?ouid=${ouid}`;
    
    callNexonAPI(maxDivisionUrl, (error, statusCode, data) => {
        if (error) {
            callback(error, null);
            return;
        }
        
        if (statusCode !== 200) {
            callback(new Error(`API 오류: ${statusCode}`), null);
            return;
        }
        
        try {
            const maxDivisionData = JSON.parse(data);
            callback(null, maxDivisionData);
        } catch (e) {
            callback(new Error('데이터 파싱 오류: ' + e.message), null);
        }
    });
}

// 등급 정보 처리 및 반환 (maxdivision API만 사용)
function fetchGradeInfo(ouid, userInfo, matchDetails, response, matchType = 50) {
    // maxdivision API로 역대 최고 등급 조회
    fetchMaxDivisionGrade(ouid, (error, maxDivisionData) => {
        if (error) {
            // maxdivision API 실패 시 등급 정보 없이 반환
            
            const combinedData = {
                ...userInfo,
                matches: matchDetails,
                grade: null,
                maxGrade: null,
                division: null,
                maxDivision: null,
                divisionInfo: null,
                maxDivisionInfo: null,
                currentGrade: null,
                highestGrade: null,
                gradeSource: 'none'
            };
            
            
            sendJson(response, 200, combinedData);
            return;
        }
        
        // maxdivision API 성공 시 처리
        
        let maxDivision = null;
        let maxDivisionInfo = null;
        
        if (maxDivisionData && Array.isArray(maxDivisionData) && maxDivisionData.length > 0) {
            
            // maxdivision API 응답 구조 확인
            maxDivisionData.forEach((item, index) => {
            });
            
            // 선택된 매치코드에 해당하는 등급만 필터링
            const matchTypeData = maxDivisionData.filter(item => 
                item.matchType === matchType || item.matchtype === matchType
            );
            
            
            // 선택된 매치코드에서 다양한 필드명으로 division ID 추출 시도
            const divisionIds = matchTypeData.map(d => 
                d.divisionId || d.division || d.id
            ).filter(id => id != null && id !== undefined);
            
            
            if (divisionIds.length > 0) {
                // 가장 높은 등급 (숫자가 작을수록 높은 등급)
                maxDivision = Math.min(...divisionIds);
                maxDivisionInfo = getDivisionInfo(maxDivision);
                
                // 역대 최고 등급만 사용
                
            } else {
                // 선택된 매치코드 데이터가 있는지 확인
                if (matchTypeData.length === 0) {
                } else {
                }
            }
        } else {
        }
        
        // 사용자의 컨트롤러 정보 추출 (최근 경기에서)
        let userController = null;
        if (matchDetails && matchDetails.length > 0) {
            
            // 최근 경기에서 사용자의 컨트롤러 정보 찾기
            for (let i = 0; i < matchDetails.length; i++) {
                const match = matchDetails[i];
                
                if (match.userController !== null && match.userController !== undefined && match.userController !== '') {
                    userController = match.userController;
                    break;
                }
            }
        } else {
        }
        
        
        const combinedData = {
            ...userInfo,
            matches: matchDetails,
            // 기존 카드 등급 (사용하지 않음)
            grade: null,
            maxGrade: null,
            // 역대 최고 등급만 사용
            division: maxDivision, // 역대 최고 등급
            maxDivision: maxDivision,
            divisionInfo: maxDivisionInfo,
            maxDivisionInfo: maxDivisionInfo,
            // 등급 텍스트 (프론트엔드 호환성)
            currentGrade: maxDivisionInfo ? maxDivisionInfo.name : null,
            highestGrade: maxDivisionInfo ? maxDivisionInfo.name : null,
            // 컨트롤러 정보
            controller: userController,
            gradeSource: 'maxdivision_api'
        };
        
        
        sendJson(response, 200, combinedData);
    });
}

module.exports = {
    fetchGradeInfo,
    fetchMaxDivisionGrade,
    getDivisionInfo,
    DIVISION_GRADES
};
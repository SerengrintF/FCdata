function loadDashboardData(userInfo) {
    // 전역 변수에 사용자 정보 저장
    currentUserInfo = userInfo;
    currentUserData = userInfo; // 구단별 데이터 분석을 위해 추가
    
    // 대시보드 전용 경기 데이터 사용 (이미 searchUser에서 초기화됨)
    
    if (dashboardMatches && dashboardMatches.length > 0) {
        // 대시보드 경기 데이터로 통계 계산 (승률, 평균 득점 등)
        const matchStats = calculateMatchStats(dashboardMatches);
        
        // 승률, 평균 득점, 평균 실점 표시
        winRate.textContent = `${matchStats.winRate}%`;
        winRate.className = `summary-value ${getStatClass(matchStats.winRate, 'winRate')}`;
        avgGoals.textContent = matchStats.avgGoals.toFixed(1);
        avgConceded.textContent = matchStats.avgConceded.toFixed(1);
        
        // 경기력 트렌드 표시
        displayTrend(matchStats.trend);
        
        // 골 유형 분석 표시
        displayGoalAnalysis(matchStats.goalTypes);
        
        // 주요 선수 표시
        displayTopPlayers(dashboardMatches || []);
        
        // 초기 로드 시 대시보드 매치 표시
        displayRealMatches(dashboardMatches);
        
        // 더보기 버튼 상태 설정 (항상 표시)
        loadMoreBtn.style.display = 'block';
        if (dashboardMatches.length > 0 && dashboardMatches.length < 100) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = '더보기';
        } else if (dashboardMatches.length >= 100) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = '최대 100경기';
        } else {
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = '더 이상 없음';
        }
    } else {
        // 데이터가 없을 때 기본값 표시
        winRate.textContent = '-';
        avgGoals.textContent = '-';
        avgConceded.textContent = '-';
        trendText.textContent = '-';
        
        // 트렌드 이모지도 초기화
        const trendIcon = document.querySelector('.trend-icon');
        if (trendIcon) {
            trendIcon.textContent = '';
        }
        
        // 경기 기록이 없음 표시
        matchesList.innerHTML = '<div class="no-matches">경기 기록이 없습니다.</div>';
        loadMoreBtn.style.display = 'block';
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '더 이상 없음';
        displayGoalAnalysis({ 
            closeRange: 0, 
            midRange: 0, 
            heading: 0,
            calculationDetails: {
                totalGoals: 0,
                closeRangeGoals: 0,
                midRangeGoals: 0,
                headingGoals: 0,
                matchCount: 0,
                closeRangePercent: 0,
                midRangePercent: 0,
                headingPercent: 0
            }
        }); // 골 유형도 초기화
        
        // 경기 수 업데이트
        updateMatchCount();
    }
}

// 경기 통계 계산
function calculateMatchStats(matches) {
    if (!matches || matches.length === 0) {
        return {
            winRate: 0,
            avgGoals: 0,
            avgConceded: 0,
            trend: 'stable',
            goalTypes: { closeRange: 0, midRange: 0, heading: 0 }
        };
    }
    
    let wins = 0;
    let totalGoals = 0;
    let totalConceded = 0;
    let recentResults = [];
    
    matches.forEach(match => {
        // 승패 계산 (새로운 API 응답 구조)
        const matchResult = match.matchResult || 0; // 0: 무승부, 1: 승리, 2: 패배
        if (matchResult === 1) wins++;
        
        // 득점/실점 계산 (새로운 API 응답 구조)
        const goals = match.userGoals || 0;
        const conceded = match.opponentGoals || 0;
        totalGoals += goals;
        totalConceded += conceded;
        
        recentResults.push({
            result: matchResult,
            goals: goals,
            conceded: conceded
        });
    });
    
    const winRate = Math.round((wins / matches.length) * 100);
    const avgGoals = totalGoals / matches.length;
    const avgConceded = totalConceded / matches.length;
    
    // 트렌드 계산 (최근 5경기 vs 이전 5경기)
    const trend = calculateTrend(recentResults);
    
    // 골 유형 분석 (실제 경기 데이터 기반)
    const goalTypes = calculateGoalTypes(matches);
    
    return {
        winRate,
        avgGoals,
        avgConceded,
        trend,
        goalTypes
    };
}

// 트렌드 계산 (승률 차이 + 연승/연패 반영)
function calculateTrend(results) {
    if (results.length < 6) return 'stable';
    
    const recent = results.slice(0, 5);
    const older = results.slice(5, 10);
    
    // 기존 승률 차이 계산
    const recentWinRate = recent.filter(r => r.result === 1).length / recent.length;
    const olderWinRate = older.filter(r => r.result === 1).length / older.length;
    const diff = recentWinRate - olderWinRate;
    
    // 연승/연패 계산
    const streak = calculateStreak(results);
    
    // 최근 3경기 패턴 분석
    const recent3 = results.slice(0, 3);
    const recent3WinRate = recent3.filter(r => r.result === 1).length / recent3.length;
    
    // 트렌드 점수 계산 (가중치 적용)
    let trendScore = 0;
    
    // 1. 승률 차이 기여도 (기본 -1.0 ~ 1.0)
    trendScore += diff;
    
    // 2. 연승/연패 기여도
    if (streak.type === 'win') {
        if (streak.count >= 3) trendScore += 0.3;  // 3연승 이상 = 강한 상승
        else if (streak.count >= 2) trendScore += 0.15; // 2연승 = 약한 상승
    } else if (streak.type === 'loss') {
        if (streak.count >= 3) trendScore -= 0.3;  // 3연패 이상 = 강한 하락
        else if (streak.count >= 2) trendScore -= 0.15; // 2연패 = 약한 하락
    }
    
    // 3. 최근 3경기 추세 기여도
    if (recent3WinRate >= 0.67) trendScore += 0.1;  // 최근 3경기 중 2승 이상
    else if (recent3WinRate <= 0.33) trendScore -= 0.1;  // 최근 3경기 중 2패 이상
    
    // 트렌드 판정 (임계값 조정)
    if (trendScore > 0.25) return 'rising';      // 상승세
    if (trendScore < -0.25) return 'falling';    // 하락세
    return 'stable';                             // 안정세
}

// 연승/연패 계산 헬퍼 함수
function calculateStreak(results) {
    if (!results || results.length === 0) {
        return { type: 'none', count: 0 };
    }
    
    let count = 0;
    const firstResult = results[0].result;
    
    // 최근 경기부터 연속된 결과 카운트
    for (let i = 0; i < results.length; i++) {
        if (results[i].result === firstResult) {
            count++;
        } else {
            break;
        }
    }
    
    // result: 1=승, 0=무, 2=패
    let type = 'none';
    if (firstResult === 1) type = 'win';
    else if (firstResult === 2) type = 'loss';
    else type = 'draw';
    
    return { type, count };
}

// 골 유형 분석 계산 (실제 API 슛 데이터 기반)
function calculateGoalTypes(matches) {
    if (!matches || matches.length === 0) {
        return { closeRange: 0, midRange: 0, heading: 0, calculationDetails: null };
    }
    
    let totalGoals = 0;
    let closeRangeGoals = 0;  // 페널티 박스 안 골 (근거리)
    let midRangeGoals = 0;    // 페널티 박스 밖 골 (중거리)
    let headingGoals = 0;     // 헤딩 골
    
    
    // 각 경기에서 실제 슛 데이터 분석
    matches.forEach(match => {
        // userStats에서 슛 데이터 가져오기
        const userStats = match.userStats;
        if (userStats && userStats.shoot) {
            const shoot = userStats.shoot;
            
            // 실제 골 수 확인
            const goals = shoot.goalTotal || 0;
            totalGoals += goals;
            
            // 페널티 박스 안 골 (근거리)
            const inPenaltyGoals = shoot.goalInPenalty || 0;
            closeRangeGoals += inPenaltyGoals;
            
            // 페널티 박스 밖 골 (중거리)
            const outPenaltyGoals = shoot.goalOutPenalty || 0;
            midRangeGoals += outPenaltyGoals;
            
            // 헤딩 골
            const headGoals = shoot.goalHeading || 0;
            headingGoals += headGoals;
            
        } else {
        }
    });
    
    
    // 골이 없는 경우
    if (totalGoals === 0) {
        return { closeRange: 0, midRange: 0, heading: 0, calculationDetails: null };
    }
    
    // 퍼센트 계산
    let closeRangePercent = Math.round((closeRangeGoals / totalGoals) * 100);
    let midRangePercent = Math.round((midRangeGoals / totalGoals) * 100);
    let headingPercent = Math.round((headingGoals / totalGoals) * 100);
    
    // 총합이 100%가 되도록 정규화
    const total = closeRangePercent + midRangePercent + headingPercent;
    if (total > 0) {
        closeRangePercent = Math.round((closeRangePercent / total) * 100);
        midRangePercent = Math.round((midRangePercent / total) * 100);
        headingPercent = Math.round((headingPercent / total) * 100);
    }
    
    // 계산 과정 저장
    const calculationDetails = {
        totalGoals: totalGoals,
        closeRangeGoals: closeRangeGoals,
        midRangeGoals: midRangeGoals,
        headingGoals: headingGoals,
        matchCount: matches.length,
        closeRangePercent: closeRangePercent,
        midRangePercent: midRangePercent,
        headingPercent: headingPercent
    };
    
    const result = {
        closeRange: closeRangePercent,
        midRange: midRangePercent,
        heading: headingPercent,
        calculationDetails: calculationDetails
    };
    
    
    return result;
}

// 슛을 시도한 유형 분석 계산 (실제 API 슛 데이터 기반)
function calculateShootTypes(matches) {
    if (!matches || matches.length === 0) {
        return { closeRange: 0, midRange: 0, heading: 0 };
    }
    
    let totalShoots = 0;
    let closeRangeShoots = 0;  // 페널티 박스 안 슛 (근거리)
    let midRangeShoots = 0;    // 페널티 박스 밖 슛 (중거리)
    let headingShoots = 0;     // 헤딩 슛
    
    
    // 각 경기에서 실제 슛 데이터 분석
    matches.forEach(match => {
        // userStats에서 슛 데이터 가져오기
        const userStats = match.userStats;
        if (userStats && userStats.shoot) {
            const shoot = userStats.shoot;
            
            // 실제 슛 수 확인
            const shoots = shoot.shootTotal || 0;
            totalShoots += shoots;
            
            // 페널티 박스 안 슛 (근거리)
            const inPenaltyShoots = shoot.shootInPenalty || 0;
            closeRangeShoots += inPenaltyShoots;
            
            // 페널티 박스 밖 슛 (중거리)
            const outPenaltyShoots = shoot.shootOutPenalty || 0;
            midRangeShoots += outPenaltyShoots;
            
            // 헤딩 슛
            const headShoots = shoot.shootHeading || 0;
            headingShoots += headShoots;
            
        } else {
        }
    });
    
    
    // 슛이 없는 경우
    if (totalShoots === 0) {
        return { closeRange: 0, midRange: 0, heading: 0 };
    }
    
    // 퍼센트 계산
    let closeRangePercent = Math.round((closeRangeShoots / totalShoots) * 100);
    let midRangePercent = Math.round((midRangeShoots / totalShoots) * 100);
    let headingPercent = Math.round((headingShoots / totalShoots) * 100);
    
    // 총합이 100%가 되도록 정규화
    const total = closeRangePercent + midRangePercent + headingPercent;
    if (total > 0) {
        closeRangePercent = Math.round((closeRangePercent / total) * 100);
        midRangePercent = Math.round((midRangePercent / total) * 100);
        headingPercent = Math.round((headingPercent / total) * 100);
    }
    
    const result = {
        closeRange: closeRangePercent,
        midRange: midRangePercent,
        heading: headingPercent
    };
    
    
    return result;
}

// 트렌드 표시
function displayTrend(trend) {
    const trendIcon = document.querySelector('.trend-icon');
    const trendTextElement = document.getElementById('trendText');
    
    if (trendIcon && trendTextElement) {
        switch (trend) {
            case 'rising':
                trendIcon.textContent = '📈';
                trendTextElement.textContent = '상승세';
                trendTextElement.style.color = '#00d4aa';
                break;
            case 'falling':
                trendIcon.textContent = '📉';
                trendTextElement.textContent = '하락세';
                trendTextElement.style.color = '#ff4757';
                break;
            default:
                trendIcon.textContent = '➡️';
                trendTextElement.textContent = '안정세';
                trendTextElement.style.color = '#ffa502';
        }
    }
}

// 골 유형 분석 표시
// 전역 변수로 계산 과정 저장
let currentGoalCalculationDetails = null;
let currentPlayerStatsDetails = null;

function displayGoalAnalysis(goalTypes) {
    // 계산 과정 저장 (없으면 기본값 제공)
    currentGoalCalculationDetails = goalTypes.calculationDetails || {
        totalGoals: 0,
        closeRangeGoals: 0,
        midRangeGoals: 0,
        headingGoals: 0,
        matchCount: 0,
        closeRangePercent: 0,
        midRangePercent: 0,
        headingPercent: 0
    };
    
    // 퍼센트 업데이트
    document.getElementById('closeRangePercent').textContent = `${goalTypes.closeRange}%`;
    document.getElementById('midRangePercent').textContent = `${goalTypes.midRange}%`;
    document.getElementById('headingPercent').textContent = `${goalTypes.heading}%`;
    
    // 카드 배경 애니메이션 업데이트
    updateGoalCardAnimations(goalTypes.closeRange, goalTypes.midRange, goalTypes.heading);
    
    // 클릭 이벤트 추가
    addPercentClickEvents();
}

// 퍼센트 클릭 이벤트 추가
function addPercentClickEvents() {
    // 기존 이벤트 리스너 제거
    removePercentClickEvents();
    
    // 근거리 퍼센트 클릭 이벤트
    const closeRangePercent = document.getElementById('closeRangePercent');
    if (closeRangePercent) {
        closeRangePercent.style.cursor = 'pointer';
        closeRangePercent.addEventListener('click', () => {
            showCalculationPopup('closeRange');
        });
    }
    
    // 중거리 퍼센트 클릭 이벤트
    const midRangePercent = document.getElementById('midRangePercent');
    if (midRangePercent) {
        midRangePercent.style.cursor = 'pointer';
        midRangePercent.addEventListener('click', () => {
            showCalculationPopup('midRange');
        });
    }
    
    // 헤딩 퍼센트 클릭 이벤트
    const headingPercent = document.getElementById('headingPercent');
    if (headingPercent) {
        headingPercent.style.cursor = 'pointer';
        headingPercent.addEventListener('click', () => {
            showCalculationPopup('heading');
        });
    }
}

// 기존 클릭 이벤트 리스너 제거
function removePercentClickEvents() {
    const closeRangePercent = document.getElementById('closeRangePercent');
    const midRangePercent = document.getElementById('midRangePercent');
    const headingPercent = document.getElementById('headingPercent');
    
    if (closeRangePercent) {
        closeRangePercent.replaceWith(closeRangePercent.cloneNode(true));
    }
    if (midRangePercent) {
        midRangePercent.replaceWith(midRangePercent.cloneNode(true));
    }
    if (headingPercent) {
        headingPercent.replaceWith(headingPercent.cloneNode(true));
    }
}

// 계산 과정 팝업 표시
function showCalculationPopup(type) {
    
    if (!currentGoalCalculationDetails) {
        alert('계산 데이터가 없습니다.');
        return;
    }
    
    const details = currentGoalCalculationDetails;
    let content = '';
    
    // 데이터가 모두 0인 경우 (경기 기록 없음)
    if (details.totalGoals === 0 && details.matchCount === 0) {
        content = `
            <h4>📊 계산 과정</h4>
            <div class="calculation-step">
                <p><strong>분석 기간:</strong> 경기 기록 없음</p>
                <p><strong>총 골 수:</strong> 0골</p>
                <p><strong>${type === 'closeRange' ? '근거리' : type === 'midRange' ? '중거리' : '헤딩'} 골 수:</strong> 0골</p>
                <p><strong>계산식:</strong> (0 ÷ 0) × 100 = 0%</p>
            </div>
            <div class="calculation-note">
                <p>💡 경기 기록이 있어야 골 유형 분석이 가능합니다.</p>
            </div>
        `;
        
        // 팝업 내용 업데이트
        document.getElementById('calculationPopupContent').innerHTML = content;
        
        // 팝업 표시
        document.getElementById('calculationPopup').style.display = 'flex';
        lockScroll();
        return;
    }
    
    switch(type) {
        case 'closeRange':
            content = `
                <h4>⚽ 근거리 골 계산 과정</h4>
                <div class="calculation-step">
                    <p><strong>총 골 수:</strong> ${details.totalGoals}골</p>
                    <p><strong>근거리 골 수:</strong> ${details.closeRangeGoals}골</p>
                    <p><strong>계산식:</strong> (${details.closeRangeGoals} ÷ ${details.totalGoals}) × 100 = ${details.closeRangePercent}%</p>
                    <p><strong>분석 기간:</strong> 최근 ${details.matchCount}경기</p>
                </div>
                <div class="calculation-note">
                    <p>💡 <strong>근거리 골:</strong> 페널티 박스 안에서 넣은 골을 의미합니다.</p>
                </div>
            `;
            break;
        case 'midRange':
            content = `
                <h4>🚀 중거리 골 계산 과정</h4>
                <div class="calculation-step">
                    <p><strong>총 골 수:</strong> ${details.totalGoals}골</p>
                    <p><strong>중거리 골 수:</strong> ${details.midRangeGoals}골</p>
                    <p><strong>계산식:</strong> (${details.midRangeGoals} ÷ ${details.totalGoals}) × 100 = ${details.midRangePercent}%</p>
                    <p><strong>분석 기간:</strong> 최근 ${details.matchCount}경기</p>
                </div>
                <div class="calculation-note">
                    <p>💡 <strong>중거리 골:</strong> 페널티 박스 밖에서 넣은 골을 의미합니다.</p>
                </div>
            `;
            break;
        case 'heading':
            content = `
                <h4>💥 헤딩 골 계산 과정</h4>
                <div class="calculation-step">
                    <p><strong>총 골 수:</strong> ${details.totalGoals}골</p>
                    <p><strong>헤딩 골 수:</strong> ${details.headingGoals}골</p>
                    <p><strong>계산식:</strong> (${details.headingGoals} ÷ ${details.totalGoals}) × 100 = ${details.headingPercent}%</p>
                    <p><strong>분석 기간:</strong> 최근 ${details.matchCount}경기</p>
                </div>
                <div class="calculation-note">
                    <p>💡 <strong>헤딩 골:</strong> 헤딩으로 넣은 골을 의미합니다.</p>
                </div>
            `;
            break;
    }
    
    // 팝업 내용 업데이트
    document.getElementById('calculationPopupContent').innerHTML = content;
    
    // 팝업 표시
    const popup = document.getElementById('calculationPopup');
    if (popup) {
        // 강제로 모든 스타일 설정
        popup.setAttribute('style', `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: rgba(0, 0, 0, 0.7) !important;
            z-index: 9999 !important;
            opacity: 1 !important;
            visibility: visible !important;
        `);
        lockScroll();
    } else {
    }
}

// 계산 팝업 닫기
function closeCalculationPopup() {
    const popup = document.getElementById('calculationPopup');
    if (popup) {
        popup.style.display = 'none';
        popup.style.visibility = 'hidden';
        popup.style.opacity = '0';
        unlockScroll();
    }
}

// 선수별 성공률 팝업 표시
function showPlayerStatPopup(playerId, statType, playerName) {
    
    if (!currentPlayerStatsDetails || !currentPlayerStatsDetails[playerId]) {
        alert('선수 데이터가 없습니다.');
        return;
    }
    
    const playerData = currentPlayerStatsDetails[playerId];
    let content = '';
    
    switch(statType) {
        case 'pass':
            content = `
                <h4>⚽ ${playerName} 패스 성공률 계산 과정</h4>
                <div class="calculation-step">
                    <p><strong>총 패스 시도:</strong> ${playerData.passTry}회</p>
                    <p><strong>패스 성공:</strong> ${playerData.passSuccess}회</p>
                    <p><strong>계산식:</strong> (${playerData.passSuccess} ÷ ${playerData.passTry}) × 100 = ${playerData.passSuccessRate}%</p>
                    <p><strong>분석 기간:</strong> ${playerData.totalMatches}경기</p>
                </div>
                <div class="calculation-note">
                    <p>💡 <strong>패스 성공률:</strong> 시도한 패스 중 성공한 패스의 비율입니다.</p>
                </div>
            `;
            break;
        case 'dribble':
            content = `
                <h4>🏃 ${playerName} 드리블 성공률 계산 과정</h4>
                <div class="calculation-step">
                    <p><strong>총 드리블 시도:</strong> ${playerData.dribbleTry}회</p>
                    <p><strong>드리블 성공:</strong> ${playerData.dribbleSuccess}회</p>
                    <p><strong>계산식:</strong> (${playerData.dribbleSuccess} ÷ ${playerData.dribbleTry}) × 100 = ${playerData.dribbleSuccessRate}%</p>
                    <p><strong>분석 기간:</strong> ${playerData.totalMatches}경기</p>
                </div>
                <div class="calculation-note">
                    <p>💡 <strong>드리블 성공률:</strong> 시도한 드리블 중 성공한 드리블의 비율입니다.</p>
                </div>
            `;
            break;
        case 'possession':
            content = `
                <h4>🎯 ${playerName} 볼 소유 성공률 계산 과정</h4>
                <div class="calculation-step">
                    <p><strong>총 볼 소유 시도:</strong> ${playerData.possessionTry}회</p>
                    <p><strong>볼 소유 성공:</strong> ${playerData.possessionSuccess}회</p>
                    <p><strong>계산식:</strong> (${playerData.possessionSuccess} ÷ ${playerData.possessionTry}) × 100 = ${playerData.possessionSuccessRate}%</p>
                    <p><strong>분석 기간:</strong> ${playerData.totalMatches}경기</p>
                </div>
                <div class="calculation-note">
                    <p>💡 <strong>볼 소유 성공률:</strong> 볼을 소유하려 시도한 횟수 중 성공한 횟수의 비율입니다.</p>
                </div>
            `;
            break;
        case 'aerial':
            content = `
                <h4>💥 ${playerName} 공중볼 성공률 계산 과정</h4>
                <div class="calculation-step">
                    <p><strong>총 공중볼 시도:</strong> ${playerData.aerialDuels}회</p>
                    <p><strong>공중볼 성공:</strong> ${playerData.aerialDuelsWon}회</p>
                    <p><strong>계산식:</strong> (${playerData.aerialDuelsWon} ÷ ${playerData.aerialDuels}) × 100 = ${playerData.aerialSuccessRate}%</p>
                    <p><strong>분석 기간:</strong> ${playerData.totalMatches}경기</p>
                </div>
                <div class="calculation-note">
                    <p>💡 <strong>공중볼 성공률:</strong> 헤딩 경합에서 승리한 횟수의 비율입니다.</p>
                </div>
            `;
            break;
        case 'block':
            content = `
                <h4>🛡️ ${playerName} 블록 성공률 계산 과정</h4>
                <div class="calculation-step">
                    <p><strong>총 블록 시도:</strong> ${playerData.blockTry}회</p>
                    <p><strong>블록 성공:</strong> ${playerData.blocks}회</p>
                    <p><strong>계산식:</strong> (${playerData.blocks} ÷ ${playerData.blockTry}) × 100 = ${playerData.blockSuccessRate}%</p>
                    <p><strong>분석 기간:</strong> ${playerData.totalMatches}경기</p>
                </div>
                <div class="calculation-note">
                    <p>💡 <strong>블록 성공률:</strong> 시도한 블록 중 성공한 블록의 비율입니다.</p>
                </div>
            `;
            break;
        case 'tackle':
            content = `
                <h4>⚔️ ${playerName} 태클 성공률 계산 과정</h4>
                <div class="calculation-step">
                    <p><strong>총 태클 시도:</strong> ${playerData.tackleTry}회</p>
                    <p><strong>태클 성공:</strong> ${playerData.tackles}회</p>
                    <p><strong>계산식:</strong> (${playerData.tackles} ÷ ${playerData.tackleTry}) × 100 = ${playerData.tackleSuccessRate}%</p>
                    <p><strong>분석 기간:</strong> ${playerData.totalMatches}경기</p>
                </div>
                <div class="calculation-note">
                    <p>💡 <strong>태클 성공률:</strong> 시도한 태클 중 성공한 태클의 비율입니다.</p>
                </div>
            `;
            break;
        case 'defense':
            const blockTry = playerData.blockTry || 0;
            const blockSuccess = playerData.blocks || 0;
            const tackleTry = playerData.tackleTry || 0;
            const tackleSuccess = playerData.tackles || 0;
            const intercepts = playerData.intercepts || 0;
            
            // 인터셉트는 시도 횟수가 없으므로 성공 횟수를 시도/성공 양쪽에 모두 추가
            const totalDefenseTry = blockTry + tackleTry + intercepts;
            const totalDefenseSuccess = blockSuccess + tackleSuccess + intercepts;
            const defenseRate = totalDefenseTry > 0 ? Math.round((totalDefenseSuccess / totalDefenseTry) * 100) : 0;
            
            content = `
                <h4>🛡️ ${playerName} 수비 성공률 계산 과정</h4>
                <div class="calculation-step">
                    <p><strong>블록 시도:</strong> ${blockTry}회</p>
                    <p><strong>블록 성공:</strong> ${blockSuccess}회</p>
                    <p><strong>태클 시도:</strong> ${tackleTry}회</p>
                    <p><strong>태클 성공:</strong> ${tackleSuccess}회</p>
                    <p><strong>인터셉트:</strong> ${intercepts}회 (시도 = 성공)</p>
                    <hr style="margin: 1rem 0; border: none; border-top: 1px solid #333;">
                    <p><strong>총 수비 시도:</strong> ${totalDefenseTry}회</p>
                    <p style="margin-left: 1rem; font-size: 0.9rem; color: var(--text-secondary);">
                        = 블록 시도(${blockTry}) + 태클 시도(${tackleTry}) + 인터셉트(${intercepts})
                    </p>
                    <p><strong>총 수비 성공:</strong> ${totalDefenseSuccess}회</p>
                    <p style="margin-left: 1rem; font-size: 0.9rem; color: var(--text-secondary);">
                        = 블록 성공(${blockSuccess}) + 태클 성공(${tackleSuccess}) + 인터셉트(${intercepts})
                    </p>
                    <p><strong>계산식:</strong> (${totalDefenseSuccess} ÷ ${totalDefenseTry}) × 100 = ${defenseRate}%</p>
                    <p><strong>분석 기간:</strong> ${playerData.totalMatches}경기</p>
                </div>
                <div class="calculation-note">
                    <p>💡 <strong>수비 성공률:</strong> 블록, 태클, 인터셉트를 합산하여 시도한 수비 액션 중 성공한 횟수의 비율입니다.</p>
                    <p>🔍 <strong>인터셉트:</strong> 패스 차단은 시도 횟수 기록이 없으므로, 성공 횟수를 시도와 성공에 모두 반영합니다.</p>
                    <p>📊 블록, 태클, 인터셉트는 모두 상대의 공격을 저지하는 중요한 수비 지표입니다.</p>
                </div>
            `;
            break;
        case 'contribution':
            const totalGoals = playerData.goals || 0;
            const totalAssists = playerData.assists || 0;
            const totalBlocks = playerData.blocks || 0;
            const totalTackles = playerData.tackles || 0;
            const totalIntercepts = playerData.intercepts || 0;
            const totalContribution = totalGoals + totalAssists + totalBlocks + totalTackles + totalIntercepts;
            const avgContribution = playerData.totalMatches > 0 ? (totalContribution / playerData.totalMatches).toFixed(1) : 0;
            content = `
                <h4>🏆 ${playerName} 기여도 점수 계산 과정</h4>
                <div class="calculation-step">
                    <p><strong>총 골:</strong> ${totalGoals}개</p>
                    <p><strong>총 어시스트:</strong> ${totalAssists}개</p>
                    <p><strong>총 블록:</strong> ${totalBlocks}개</p>
                    <p><strong>총 태클:</strong> ${totalTackles}개</p>
                    <p><strong>총 인터셉트:</strong> ${totalIntercepts}개</p>
                    <hr style="margin: 1rem 0; border: none; border-top: 1px solid #333;">
                    <p><strong>총 기여:</strong> ${totalContribution}회</p>
                    <p><strong>총 경기수:</strong> ${playerData.totalMatches}경기</p>
                    <p><strong>계산식:</strong> ${totalContribution} ÷ ${playerData.totalMatches} = ${avgContribution}점</p>
                </div>
                <div class="calculation-note">
                    <p>💡 <strong>기여도 점수:</strong> 경기당 평균 기여 횟수를 나타냅니다.</p>
                    <p>📊 골, 어시스트, 블록, 태클, 인터셉트를 모두 합산하여 선수의 전체적인 경기 기여도를 평가합니다.</p>
                    <p>⚽ 공격적인 기여(골, 어시스트)와 수비적인 기여(블록, 태클, 인터셉트)를 모두 반영합니다.</p>
                </div>
            `;
            break;
    }
    
    // 팝업 내용 업데이트
    document.getElementById('calculationPopupContent').innerHTML = content;
    
    // 팝업 표시
    const popup = document.getElementById('calculationPopup');
    if (popup) {
        // 강제로 모든 스타일 설정
        popup.setAttribute('style', `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: rgba(0, 0, 0, 0.7) !important;
            z-index: 9999 !important;
            opacity: 1 !important;
            visibility: visible !important;
        `);
        lockScroll();
    } else {
    }
}

// 팝업 오버레이 클릭으로 닫기
function addPopupOverlayClickEvent() {
    const popupOverlay = document.getElementById('calculationPopup');
    if (popupOverlay) {
        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) {
                closeCalculationPopup();
            }
        });
    }
}

function updateGoalCardAnimations(closeRange, midRange, heading) {
    // 각 카드의 배경 바 애니메이션
    const closeRangeCard = document.getElementById('closeRangeCard');
    const midRangeCard = document.getElementById('midRangeCard');
    const headingCard = document.getElementById('headingCard');
    
    // 배경 바의 너비를 퍼센트에 따라 조정
    setTimeout(() => {
        if (closeRangeCard) {
            const bgElement = closeRangeCard.querySelector('.goal-card-bg');
            if (bgElement) {
                bgElement.style.width = `${closeRange}%`;
                bgElement.style.height = closeRange > 0 ? '6px' : '4px';
            }
        }
        
        if (midRangeCard) {
            const bgElement = midRangeCard.querySelector('.goal-card-bg');
            if (bgElement) {
                bgElement.style.width = `${midRange}%`;
                bgElement.style.height = midRange > 0 ? '6px' : '4px';
            }
        }
        
        if (headingCard) {
            const bgElement = headingCard.querySelector('.goal-card-bg');
            if (bgElement) {
                bgElement.style.width = `${heading}%`;
                bgElement.style.height = heading > 0 ? '6px' : '4px';
            }
        }
    }, 100);
}

// 주요 선수 3명 계산 및 표시
function displayTopPlayers(allMatches) {
    const topPlayers = calculateTopPlayers(allMatches);
    const topPlayersContainer = document.getElementById('topPlayersList');
    
    if (!topPlayers || topPlayers.length === 0) {
        topPlayersContainer.innerHTML = '<div class="no-players">주요 선수 정보가 없습니다.</div>';
        return;
    }
    
    topPlayersContainer.innerHTML = topPlayers.map((player, index) => `
        <div class="top-player-item">
            <div class="top-player-rank"></div>
            <img src="/live/externalAssets/common/playersAction/p${player.spid}.png" 
                 alt="${player.name}" 
                 class="top-player-image"
                 onerror="this.onerror=null;">
            <div class="top-player-info">
                <div class="top-player-name-section">
                    ${player.season?.seasonImg ? `<img src="${player.season.seasonImg}" alt="시즌" class="top-player-season-img" onerror="this.style.display='none'"/>` : ''}
                    <div class="top-player-name">${player.name}</div>
                </div>
                <div class="top-player-stats">
                    <div class="top-player-stat">⚽ ${player.totalGoals}골 🅰️ ${player.totalAssists}도움 ⭐ ${player.avgRating}</div>
                </div>
            </div>
        </div>
    `).join('');
}

// 주요 선수 3명 계산 함수
function calculateTopPlayers(allMatches) {
    
    if (!allMatches || allMatches.length === 0) {
        return [];
    }
    
    // 모든 경기에서 선수 데이터 수집
    const playerStats = {};
    
    allMatches.forEach((match, matchIndex) => {
        
        // 매치 데이터에서 선수 정보 찾기 (matchDetail.userPlayers 또는 직접 userPlayers)
        const userPlayers = match.matchDetail?.userPlayers || match.userPlayers;
        
        if (userPlayers && Array.isArray(userPlayers)) {
            userPlayers.forEach(player => {
                // spid 또는 spId 둘 다 확인
                const spid = player.spid || player.spId;
                if (!spid) {
                    return;
                }
                
                if (!playerStats[spid]) {
                    playerStats[spid] = {
                        spid: spid,
                        name: player.spName || '알 수 없음',
                        season: player.season || null,
                        totalGoals: 0,
                        totalAssists: 0,
                        totalRating: 0,
                        matchCount: 0,
                        recentMatches: []
                    };
                }
                
                const goals = player.status?.goal || 0;
                const assists = player.status?.assist || 0;
                const rating = player.status?.spRating || 0;
                
                playerStats[spid].totalGoals += goals;
                playerStats[spid].totalAssists += assists;
                playerStats[spid].totalRating += rating;
                playerStats[spid].matchCount += 1;
                
                // 최근 5경기 기록 저장 (최신순)
                playerStats[spid].recentMatches.unshift({
                    goals: goals,
                    assists: assists,
                    rating: rating,
                    matchDate: match.matchDate
                });
                
                // 최근 5경기만 유지
                if (playerStats[spid].recentMatches.length > 5) {
                    playerStats[spid].recentMatches.pop();
                }
            });
        }
    });
    
    // 선수별 종합 점수 계산
    
    const playersArray = Object.values(playerStats).map(player => {
        // 최소 1경기 이상 출전한 선수만 포함 (임시로 기준 완화)
        if (player.matchCount < 1) {
            return null;
        }
        
        const avgRating = player.matchCount > 0 ? (player.totalRating / player.matchCount) : 0;
        const goalsPerMatch = player.matchCount > 0 ? (player.totalGoals / player.matchCount) : 0;
        const assistsPerMatch = player.matchCount > 0 ? (player.totalAssists / player.matchCount) : 0;
        
        // 최근 폼 계산 (최근 3경기 평균)
        const recentForm = calculateRecentForm(player.recentMatches);
        
        // 종합 점수 계산
        // 골 수 (40%) + 도움 수 (20%) + 평점 (25%) + 최근 폼 (15%)
        const comprehensiveScore = 
            (player.totalGoals * 0.4) + 
            (player.totalAssists * 0.2) + 
            (avgRating * 0.25) + 
            (recentForm * 0.15);
        
        return {
            ...player,
            avgRating: avgRating.toFixed(1),
            goalsPerMatch: goalsPerMatch.toFixed(1),
            assistsPerMatch: assistsPerMatch.toFixed(1),
            recentForm: recentForm.toFixed(1),
            comprehensiveScore: comprehensiveScore
        };
    }).filter(player => player !== null);
    
    // 종합 점수 순으로 정렬하여 상위 3명 반환
    const filteredPlayers = playersArray.filter(player => player !== null);
    
    const topPlayers = filteredPlayers
        .sort((a, b) => b.comprehensiveScore - a.comprehensiveScore)
        .slice(0, 3);
    
    return topPlayers;
}

// 최근 폼 계산 (최근 3경기 기준)
function calculateRecentForm(recentMatches) {
    if (!recentMatches || recentMatches.length === 0) {
        return 0;
    }
    
    const recent3Matches = recentMatches.slice(0, 3);
    const totalScore = recent3Matches.reduce((sum, match) => {
        // 골 (2점) + 도움 (1점) + 평점 보너스
        const matchScore = (match.goals * 2) + (match.assists * 1) + (match.rating > 7 ? 1 : 0);
        return sum + matchScore;
    }, 0);
    
    return recent3Matches.length > 0 ? totalScore / recent3Matches.length : 0;
}

// 경기 하이라이트 판별 함수
function getMatchHighlight(match) {
    const goalDiff = (match.userGoals || 0) - (match.opponentGoals || 0);
    const totalGoals = (match.userGoals || 0) + (match.opponentGoals || 0);
    const result = match.matchResult || 0;
    const userGoals = match.userGoals || 0;
    const opponentGoals = match.opponentGoals || 0;
    
    if (result === 1) { // 승리
        if (opponentGoals === 0) return { icon: '🎯', text: '완봉승' };
        if (goalDiff >= 3) return { icon: '⚡', text: '대승' };
        if (userGoals >= 4) return { icon: '⚽', text: '득점 축제' };
        if (goalDiff === 1) return { icon: '💪', text: '접전승' };
        return { icon: '✨', text: '승리' };
    } else if (result === 2) { // 패배
        if (goalDiff === -1) return { icon: '😭', text: '아쉬운 패배' };
        if (goalDiff <= -3) return { icon: '💔', text: '대패' };
        return { icon: '📉', text: '패배' };
    } else { // 무승부
        if (totalGoals >= 4) return { icon: '🎭', text: '극적 무승부' };
        if (totalGoals === 0) return { icon: '💤', text: '무득점' };
        if (totalGoals >= 2) return { icon: '⚔️', text: '공방전' };
        return { icon: '🤝', text: '무승부' };
    }
}

// MVP 선수 찾기 함수
function getMatchMVP(match) {
    if (!match.userPlayers || match.userPlayers.length === 0) return null;
    
    // 평점이 가장 높은 선수 찾기
    const mvp = match.userPlayers.reduce((best, player) => {
        const currentRating = player.status?.spRating || 0;
        const bestRating = best.status?.spRating || 0;
        return currentRating > bestRating ? player : best;
    });
    
    const rating = mvp.status?.spRating?.toFixed(1) || '0.0';
    const goals = mvp.status?.goal || 0;
    const assists = mvp.status?.assist || 0;
    
    let stats = rating;
    const performance = [];
    if (goals > 0) performance.push(`${goals}골`);
    if (assists > 0) performance.push(`${assists}도움`);
    
    if (performance.length > 0) {
        stats += ` (${performance.join(' ')})`;
    }
    
    return { name: mvp.spName, stats };
}

// 실제 경기 기록 표시
function displayRealMatches(matches) {
    matchesList.innerHTML = '';
    
    if (!matches || matches.length === 0) {
        matchesList.innerHTML = '<div class="no-matches">경기 기록이 없습니다.</div>';
        return;
    }
    
    
    // 모든 경기 데이터 표시 (유효성 검사 완화)
    
    if (matches.length === 0) {
        matchesList.innerHTML = '<div class="no-matches">경기 기록이 없습니다.</div>';
        return;
    }
    
    // API에서 이미 최신순으로 정렬되어 제공되므로 별도 정렬 불필요
    
    matches.forEach((match, index) => {
        const matchElement = document.createElement('div');
        matchElement.className = 'match-item';
        
        const result = match.matchResult || 0;
        const resultText = result === 1 ? '승' : result === 2 ? '패' : '무';
        const resultClass = result === 1 ? 'win' : result === 2 ? 'lose' : 'draw';
        
        const goals = match.userGoals || 0;
        const conceded = match.opponentGoals || 0;
        const score = `${goals} - ${conceded}`;
        
        // 상대방 닉네임 표시 (컨트롤러 정보 포함)
        const opponentName = match.opponentNickname || '상대방';
        const opponentControllerEmoji = getControllerEmoji(match.opponentController);
        const opponentDisplayName = `${opponentName} ${opponentControllerEmoji}`;
        
        // 날짜 포맷팅
        const matchDate = match.matchDate ? formatMatchDate(match.matchDate) : '';
        
        // 경기 하이라이트 가져오기
        const highlight = getMatchHighlight(match);
        const highlightHtml = `<span class="match-highlight">${highlight.icon} ${highlight.text}</span>`;
        
        // MVP 선수 가져오기
        const mvp = getMatchMVP(match);
        const mvpHtml = mvp ? `<span class="match-mvp">⭐ ${mvp.name} ${mvp.stats}</span>` : '';
        
        matchElement.innerHTML = `
            <div class="match-header" onclick="toggleMatchDetails(this)">
                <div class="match-info">
                    <div class="match-details">
                        <span class="match-date">${matchDate}</span>
                        <span class="match-opponent">vs <span class="opponent-nickname-clickable" onclick="searchOpponent(event, '${opponentName}')">${opponentDisplayName}</span></span>
                        <div class="match-badges">
                            ${highlightHtml}
                            ${mvpHtml}
                        </div>
                    </div>
                    <div class="match-score">
                        <span class="score">${score}</span>
                    </div>
                </div>
                <span class="match-result ${resultClass}">${resultText}</span>
                <div class="expand-icon">▼</div>
            </div>
            <div class="match-details-expanded" style="display: none;">
                <div class="match-loading">상세 정보 로딩 중...</div>
            </div>
        `;
        
        // 매치 데이터를 요소에 저장
        matchElement.setAttribute('data-match', JSON.stringify(match));
        
        matchesList.appendChild(matchElement);
    });
    
    // 경기 수 업데이트
    updateMatchCount();
}

// 날짜 포맷팅 함수 (한국 시간 기준)
function formatMatchDate(dateString) {
    try {
        // ISO 형식의 날짜를 파싱
        const date = new Date(dateString);
        
        // 날짜가 유효한지 확인
        if (isNaN(date.getTime())) {
            return dateString; // 원본 반환
        }
        
        // 한국 시간으로 변환 (UTC+9)
        const koreanTime = new Date(date.getTime() + (9 * 60 * 60 * 1000));
        
        const month = String(koreanTime.getMonth() + 1).padStart(2, '0');
        const day = String(koreanTime.getDate()).padStart(2, '0');
        const hours = String(koreanTime.getHours()).padStart(2, '0');
        const minutes = String(koreanTime.getMinutes()).padStart(2, '0');
        
        return `${month}/${day} ${hours}:${minutes}`;
    } catch (error) {
        return dateString;
    }
}

// 샘플 경기 기록 로드
function loadSampleMatches() {
    const sampleMatches = [
        { opponent: '레알마드리드', score: '3-2', result: 'win' },
        { opponent: '바르셀로나', score: '1-1', result: 'draw' },
        { opponent: '맨체스터 유나이티드', score: '2-1', result: 'win' },
        { opponent: '첼시', score: '0-2', result: 'lose' },
        { opponent: '아스날', score: '4-1', result: 'win' },
        { opponent: '리버풀', score: '2-3', result: 'lose' },
        { opponent: '토트넘', score: '1-0', result: 'win' },
        { opponent: '맨체스터 시티', score: '2-2', result: 'draw' },
        { opponent: '아틀레티코', score: '3-0', result: 'win' },
        { opponent: '유벤투스', score: '1-1', result: 'draw' }
    ];
    
    matchesList.innerHTML = '';
    
    sampleMatches.forEach((match, index) => {
        const matchElement = document.createElement('div');
        matchElement.className = 'match-item';
        matchElement.innerHTML = `
            <div class="match-info">
                <span>vs ${match.opponent}</span>
                <span>${match.score}</span>
            </div>
            <span class="match-result ${match.result}">
                ${match.result === 'win' ? '승' : match.result === 'lose' ? '패' : '무'}
            </span>
        `;
        matchesList.appendChild(matchElement);
    });
}

// 더보기 버튼 기능 (대시보드 전용)
async function loadMoreMatches() {
    if (!currentUserInfo || !currentUserInfo.ouid) {
        return;
    }
    
    // Google Analytics 더보기 클릭 이벤트 추적
    if (typeof gtag !== 'undefined') {
        gtag('event', 'load_more', {
            'event_category': 'user_interaction',
            'event_label': 'Dashboard Load More Matches',
            'current_match_count': dashboardMatches.length
        });
    }
    
    // 대시보드 경기 수 확인
    
    // 100경기 제한 확인
    if (dashboardMatches.length >= 100) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '최대 100경기';
        return;
    }
    
    try {
        // 더보기 버튼 비활성화
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '로딩 중...';
        
        // 추가 경기 기록 조회 (10개씩 요청)
        const url = `/api/more-matches/${currentUserInfo.ouid}/${dashboardOffset}/10`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.matches && data.matches.length > 0) {
            // 대시보드 경기 기록에 추가
            dashboardMatches = dashboardMatches.concat(data.matches);
            
            // 화면에 추가 경기 표시
            displayMoreMatches(data.matches);
            
            // 대시보드 offset 증가
            dashboardOffset += data.matches.length;
            
            // 대시보드 통계 갱신 (대시보드 전체 경기 기준으로 재계산)
            const matchStats = calculateMatchStats(dashboardMatches);
            winRate.textContent = `${matchStats.winRate}%`;
            winRate.className = `summary-value ${getStatClass(matchStats.winRate, 'winRate')}`;
            avgGoals.textContent = matchStats.avgGoals.toFixed(1);
            avgConceded.textContent = matchStats.avgConceded.toFixed(1);
            displayTrend(matchStats.trend);
            displayGoalAnalysis(matchStats.goalTypes);
            
            // 주요 선수 갱신 (대시보드 경기 기준으로 재계산)
            displayTopPlayers(dashboardMatches);
            
            // 추가 후 경기 수 확인
            
            // 더보기 버튼 상태 업데이트
            if (dashboardMatches.length >= 100) {
                loadMoreBtn.disabled = true;
                loadMoreBtn.innerHTML = '최대 100경기';
            } else if (data.matches.length < 10) {
                // 10개 미만이면 더 이상 데이터가 없는 것으로 간주
                loadMoreBtn.disabled = true;
                loadMoreBtn.innerHTML = '더 이상 없음';
            } else {
                // 정상적으로 10개 추가된 경우 버튼 유지
                loadMoreBtn.disabled = false;
                loadMoreBtn.innerHTML = '더보기';
            }
        } else {
            // 더 이상 데이터가 없으면 버튼 비활성화
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = '더 이상 없음';
        }
        
    } catch (error) {
        alert('더보기 로드 중 오류가 발생했습니다: ' + error.message);
        // 오류 발생 시에만 버튼 상태 복원
        loadMoreBtn.disabled = false;
        loadMoreBtn.innerHTML = '더보기';
    }
}

// 추가 경기 기록 표시
function displayMoreMatches(moreMatches) {
    
    if (moreMatches.length === 0) {
        return;
    }
    
    // API에서 이미 최신순으로 정렬되어 제공되므로 별도 정렬 불필요
    
    // 현재 사용자 정보에 새로운 경기들을 추가 (최신 경기가 앞에 오도록)
    if (currentUserInfo && currentUserInfo.matches) {
        currentUserInfo.matches = [...moreMatches, ...currentUserInfo.matches];
        
        // 통계 재계산 및 업데이트
        updateMatchStatistics();
    }
    
    moreMatches.forEach((match, index) => {
        const matchElement = document.createElement('div');
        matchElement.className = 'match-item';
        
        const result = match.matchResult || 0;
        const resultText = result === 1 ? '승' : result === 2 ? '패' : '무';
        const resultClass = result === 1 ? 'win' : result === 2 ? 'lose' : 'draw';
        
        const goals = match.userGoals || 0;
        const conceded = match.opponentGoals || 0;
        const score = `${goals} - ${conceded}`;
        
        // 상대방 닉네임 표시 (컨트롤러 정보 포함)
        const opponentName = match.opponentNickname || '상대방';
        const opponentControllerEmoji = getControllerEmoji(match.opponentController);
        const opponentDisplayName = `${opponentName} ${opponentControllerEmoji}`;
        
        // 날짜 포맷팅
        const matchDate = match.matchDate ? formatMatchDate(match.matchDate) : '';
        
        // 경기 하이라이트 가져오기
        const highlight = getMatchHighlight(match);
        const highlightHtml = `<span class="match-highlight">${highlight.icon} ${highlight.text}</span>`;
        
        // MVP 선수 가져오기
        const mvp = getMatchMVP(match);
        const mvpHtml = mvp ? `<span class="match-mvp">⭐ ${mvp.name} ${mvp.stats}</span>` : '';
        
        matchElement.innerHTML = `
            <div class="match-header" onclick="toggleMatchDetails(this)">
                <div class="match-info">
                    <div class="match-details">
                        <span class="match-date">${matchDate}</span>
                        <span class="match-opponent">vs <span class="opponent-nickname-clickable" onclick="searchOpponent(event, '${opponentName}')">${opponentDisplayName}</span></span>
                        <div class="match-badges">
                            ${highlightHtml}
                            ${mvpHtml}
                        </div>
                    </div>
                    <div class="match-score">
                        <span class="score">${score}</span>
                    </div>
                </div>
                <span class="match-result ${resultClass}">${resultText}</span>
                <div class="expand-icon">▼</div>
            </div>
            <div class="match-details-expanded" style="display: none;">
                <div class="match-loading">상세 정보 로딩 중...</div>
            </div>
        `;
        
        // 매치 데이터를 요소에 저장
        matchElement.setAttribute('data-match', JSON.stringify(match));
        
        matchesList.appendChild(matchElement);
    });
    
    // 추가된 경기들을 전체적으로 시간순으로 재정렬
    const allMatches = Array.from(matchesList.children);
    allMatches.sort((a, b) => {
        const dateA = new Date(a.querySelector('.match-date').textContent);
        const dateB = new Date(b.querySelector('.match-date').textContent);
        return dateB - dateA; // 최신순
    });
    
    // 재정렬된 순서로 DOM에 다시 추가
    allMatches.forEach(match => {
        matchesList.appendChild(match);
    });
    
    // 경기 수 업데이트
    updateMatchCount();
}

// 정보 아이템 추가
function addInfoItem(label, value) {
    const infoItem = document.createElement('div');
    infoItem.className = 'info-item';
    infoItem.innerHTML = `
        <h3>${label}</h3>
        <p>${value}</p>
    `;
    infoGrid.appendChild(infoItem);
}

// 로딩 상태 표시/숨김
function showLoading(show) {
    loading.style.display = show ? 'flex' : 'none';
    searchBtn.disabled = show;
    nicknameInput.disabled = show;
}

// 결과 표시/숨김
function hideResults() {
    playerBasicInfo.style.display = 'none';
    tabContainer.style.display = 'none';
}

// 에러 표시/숨김
function showError(message) {
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
    playerBasicInfo.style.display = 'none';
    tabContainer.style.display = 'none';
}

function hideError() {
    errorSection.style.display = 'none';
}

// 상대 닉네임 클릭 시 검색 함수
function searchOpponent(event, nickname) {
    // 이벤트 전파 막기 (경기 상세 정보 토글 방지)
    event.stopPropagation();
    
    // 닉네임 입력 필드에 상대 닉네임 설정
    nicknameInput.value = nickname;
    
    // 검색 실행
    searchUser();
}

// 경기 상세 정보 토글 함수
function toggleMatchDetails(headerElement) {
    const matchItem = headerElement.closest('.match-item');
    const expandedSection = matchItem.querySelector('.match-details-expanded');
    const expandIcon = headerElement.querySelector('.expand-icon');
    
    if (expandedSection.style.display === 'none' || expandedSection.style.display === '') {
        // 확장
        expandedSection.style.display = 'block';
        expandIcon.textContent = '▲';
        expandIcon.style.transform = 'rotate(180deg)';
        
        // 상세 정보 로드
        loadMatchDetails(matchItem);
    } else {
        // 축소
        expandedSection.style.display = 'none';
        expandIcon.textContent = '▼';
        expandIcon.style.transform = 'rotate(0deg)';
    }
}

// 경기 상세 정보 로드
function loadMatchDetails(matchItem) {
    const matchData = JSON.parse(matchItem.getAttribute('data-match'));
    const expandedSection = matchItem.querySelector('.match-details-expanded');
    
    
    // 선수 정보가 있는지 확인
    if (matchData.userPlayers && matchData.userPlayers.length > 0) {
        expandedSection.innerHTML = createMatchDetailsHTML(matchData);
    } else {
        // 디버깅 정보 포함
        const debugInfo = `
            <div class="match-details-content">
                <div class="no-player-data">
                    <p>선수 데이터를 불러올 수 없습니다.</p>
                    <p>API에서 제공되지 않았거나 데이터 구조가 변경되었을 수 있습니다.</p>
                    <details style="margin-top: 16px;">
                        <summary>디버깅 정보 (클릭하여 확인)</summary>
                        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 8px; font-size: 12px; overflow-x: auto;">
매치 ID: ${matchData.matchId}
사용자 선수 데이터: ${JSON.stringify(matchData.userPlayers, null, 2)}
상대방 선수 데이터: ${JSON.stringify(matchData.opponentPlayers, null, 2)}
전체 매치 데이터: ${JSON.stringify(matchData, null, 2)}
                        </pre>
                    </details>
                </div>
            </div>
        `;
        expandedSection.innerHTML = debugInfo;
    }
}

// 경기 상세 정보 HTML 생성 (리뉴얼된 구조)
function createMatchDetailsHTML(matchData) {
    const userPlayers = matchData.userPlayers || [];
    const opponentPlayers = matchData.opponentPlayers || [];
    const userStats = matchData.userStats || {};
    const opponentStats = matchData.opponentStats || {};
    
    // 슛을 시도한 유형 분석 추가
    const shootTypes = calculateShootTypes([matchData]);
    userStats.shootTypes = shootTypes;
    
    
    // 경기 기본 정보
    const matchDate = matchData.matchDate ? formatMatchDate(matchData.matchDate) : '날짜 정보 없음';
    const opponentName = matchData.opponentNickname || '상대방';
    const userGoals = matchData.userGoals || 0;
    const opponentGoals = matchData.opponentGoals || 0;
    const matchResult = matchData.matchResult || 0;
    const resultText = matchResult === 1 ? '승' : matchResult === 2 ? '패' : '무';
    const resultClass = matchResult === 1 ? 'win' : matchResult === 2 ? 'lose' : 'draw';
    
    // 사용자 정보에서 닉네임과 최고 등급 정보 가져오기
    const userNickname = currentUserInfo?.nickname || '나';
    const userMaxGrade = currentUserInfo?.maxDivisionInfo || null;
    const opponentMaxGrade = matchData.opponentDivision ? getDivisionInfo(matchData.opponentDivision) : null;
    
    // 성취감 멘트 생성 (상대방 데이터와 비교 분석)
    const achievementMessage = generateAchievementMessage(matchResult, userGoals, opponentGoals, userStats, opponentStats);
    
    // 실력 향상을 위한 보완점 제안
    const improvementSuggestion = generateImprovementSuggestion(matchResult, userGoals, opponentGoals, userStats, opponentStats, currentUserInfo?.matches || []);
    
    // 베스트 플레이어 정보
    const bestPlayers = getBestPlayers(userPlayers);
    
    // 전술 정보 (실제 선수 데이터 기반)
    const userTactics = generateTacticsInfo(userPlayers, userStats, opponentStats);
    const opponentTactics = generateTacticsInfo(opponentPlayers, opponentStats, userStats);
    
    return `
        <div class="match-details-content">
            <!-- 1. 경기 한눈에 보기 -->
            <div class="match-overview">
                <div class="match-header-info">
                    <div class="match-date-time">${matchDate}</div>
                    <div class="match-opponents-single-line">
                        <div class="team-badge user-team">
                            <div class="team-name">${userNickname}</div>
                        </div>
                        <div class="score-display">
                            <div class="score-box ${resultClass}">
                                <div class="score-numbers">${userGoals} : ${opponentGoals}</div>
                            </div>
                        </div>
                        <div class="team-badge opponent-team">
                            <div class="team-name">${opponentName}</div>
                        </div>
                    </div>
                </div>
                <div class="achievement-message">${achievementMessage}</div>
                <div class="improvement-suggestion">${improvementSuggestion}</div>

            </div>
            
            <!-- 2. 팀별 하이라이트 스탯 -->
            <div class="team-highlight-stats">
                <h4>팀별 하이라이트 스탯</h4>
                <div class="stats-comparison">
                    <div class="stat-item">
                        <div class="stat-label">점유율</div>
                        <div class="stat-comparison">
                            <span class="user-value">${userStats.possession || 0}%</span>
                            <span class="vs">vs</span>
                            <span class="opponent-value">${opponentStats.possession || 0}%</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">슈팅 / 유효 슈팅</div>
                        <div class="stat-comparison">
                            <span class="user-value">${userStats.shoot?.shootTotal || 0} / ${userStats.shoot?.effectiveShootTotal || 0}</span>
                            <span class="vs">vs</span>
                            <span class="opponent-value">${opponentStats.shoot?.shootTotal || 0} / ${opponentStats.shoot?.effectiveShootTotal || 0}</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">슛을 시도한 유형</div>
                        <div class="goal-types">
                            <span class="goal-type">중거리 ${userStats.shootTypes?.midRange || 0}%</span>
                            <span class="goal-type">근거리 ${userStats.shootTypes?.closeRange || 0}%</span>
                            <span class="goal-type">헤딩 ${userStats.shootTypes?.heading || 0}%</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 3. 경기 정보 정보 카드 -->
            <div class="tactics-info">
                <div class="section-header">
                    <h4>경기 정보</h4>
                    <button class="info-button" onclick="showMetricsPopup()">?</button>
                </div>
                <div class="tactics-cards-container">
                    <!-- 나의 전술 카드 -->
                    <div class="tactics-card my-tactics-card">
                        <div class="card-header">
                            <h5>나의 전술</h5>
                            <div class="formation-badge">${userTactics.formation}</div>
                        </div>
                        <div class="card-content">
                            <div class="style-section">
                                <span class="label">경기 성향</span>
                                <span class="style-value">${userTactics.style}</span>
                            </div>
                            ${userTactics.characteristics ? `
                                <div class="performance-metrics">
                                    <div class="metric-row">
                                        <span class="metric-label">공격력</span>
                                        <div class="metric-bar">
                                            <div class="metric-fill" style="width: ${userTactics.characteristics.scores.attack.score}%"></div>
                                        </div>
                                        <span class="metric-score">${userTactics.characteristics.scores.attack.score}</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">빌드업</span>
                                        <div class="metric-bar">
                                            <div class="metric-fill" style="width: ${userTactics.characteristics.scores.buildup.score}%"></div>
                                        </div>
                                        <span class="metric-score">${userTactics.characteristics.scores.buildup.score}</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">점유율 활용</span>
                                        <div class="metric-bar">
                                            <div class="metric-fill" style="width: ${userTactics.characteristics.scores.possession.score}%"></div>
                                        </div>
                                        <span class="metric-score">${userTactics.characteristics.scores.possession.score}</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">수비 강도</span>
                                        <div class="metric-bar">
                                            <div class="metric-fill" style="width: ${userTactics.characteristics.scores.defense.score}%"></div>
                                        </div>
                                        <span class="metric-score">${userTactics.characteristics.scores.defense.score}</span>
                                    </div>
                                </div>
                                <div class="characteristics-section">
                                    <span class="label">이 경기 특징</span>
                                    <p class="match-description">${generatePerformanceBasedDescription(userTactics.characteristics.scores)}</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- VS 구분선 -->
                    <div class="tactics-vs">
                        <span>VS</span>
                    </div>
                    
                    <!-- 상대방 전술 카드 -->
                    <div class="tactics-card opponent-tactics-card">
                        <div class="card-header">
                            <h5>상대방 전술</h5>
                            <div class="formation-badge">${opponentTactics.formation}</div>
                        </div>
                        <div class="card-content">
                            <div class="style-section">
                                <span class="label">경기 성향</span>
                                <span class="style-value">${opponentTactics.style}</span>
                            </div>
                            ${opponentTactics.characteristics ? `
                                <div class="performance-metrics">
                                    <div class="metric-row">
                                        <span class="metric-label">공격력</span>
                                        <div class="metric-bar">
                                            <div class="metric-fill opponent-fill" style="width: ${opponentTactics.characteristics.scores.attack.score}%"></div>
                                        </div>
                                        <span class="metric-score">${opponentTactics.characteristics.scores.attack.score}</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">빌드업</span>
                                        <div class="metric-bar">
                                            <div class="metric-fill opponent-fill" style="width: ${opponentTactics.characteristics.scores.buildup.score}%"></div>
                                        </div>
                                        <span class="metric-score">${opponentTactics.characteristics.scores.buildup.score}</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">점유율 활용</span>
                                        <div class="metric-bar">
                                            <div class="metric-fill opponent-fill" style="width: ${opponentTactics.characteristics.scores.possession.score}%"></div>
                                        </div>
                                        <span class="metric-score">${opponentTactics.characteristics.scores.possession.score}</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">수비 강도</span>
                                        <div class="metric-bar">
                                            <div class="metric-fill opponent-fill" style="width: ${opponentTactics.characteristics.scores.defense.score}%"></div>
                                        </div>
                                        <span class="metric-score">${opponentTactics.characteristics.scores.defense.score}</span>
                                    </div>
                                </div>
                                <div class="characteristics-section">
                                    <span class="label">이 경기 특징</span>
                                    <p class="match-description">${generatePerformanceBasedDescription(opponentTactics.characteristics.scores)}</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 4. 베스트 플레이어 -->
            <div class="best-players">
                <h4>베스트 플레이어</h4>
                <div class="best-players-grid">
                    <div class="best-player-item">
                        <div class="player-title">득점왕</div>
                        <div class="player-info-inline">
                            ${bestPlayers.topScorer.season?.seasonImg ? `<img src="${bestPlayers.topScorer.season.seasonImg}" alt="시즌" class="season-img-small" onerror="this.style.display='none'"/>` : ''}
                            ${renderGradeImage(bestPlayers.topScorer.grade, bestPlayers.topScorer.spid)}
                            <span class="player-name">${bestPlayers.topScorer.name}</span>
                            <span class="player-value">${bestPlayers.topScorer.goals}골</span>
                        </div>
                    </div>
                    <div class="best-player-item">
                        <div class="player-title">도움왕</div>
                        <div class="player-info-inline">
                            ${bestPlayers.topAssister.season?.seasonImg ? `<img src="${bestPlayers.topAssister.season.seasonImg}" alt="시즌" class="season-img-small" onerror="this.style.display='none'"/>` : ''}
                            ${renderGradeImage(bestPlayers.topAssister.grade, bestPlayers.topAssister.spid)}
                            <span class="player-name">${bestPlayers.topAssister.name}</span>
                            <span class="player-value">${bestPlayers.topAssister.assists}도움</span>
                        </div>
                    </div>
                    <div class="best-player-item">
                        <div class="player-title">평점왕</div>
                        <div class="player-info-inline">
                            ${bestPlayers.topRated.season?.seasonImg ? `<img src="${bestPlayers.topRated.season.seasonImg}" alt="시즌" class="season-img-small" onerror="this.style.display='none'"/>` : ''}
                            ${renderGradeImage(bestPlayers.topRated.grade, bestPlayers.topRated.spid)}
                            <span class="player-name">${bestPlayers.topRated.name}</span>
                            <span class="player-value">${bestPlayers.topRated.rating}점</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 5. 선수 목록 -->
            <div class="players-section">
                <h4>선수 목록</h4>
                <div class="teams-players">
                    ${userPlayers && userPlayers.length > 0 ? renderPlayerList(userPlayers, '나의 클럽') : `
                        <div class="team-players">
                            <h5>나의 클럽</h5>
                            <div class="no-players">선수 정보가 없습니다.</div>
                        </div>
                    `}
                    ${opponentPlayers && opponentPlayers.length > 0 ? renderPlayerList(opponentPlayers, '상대방 클럽') : `
                        <div class="team-players">
                            <h5>상대방 클럽</h5>
                            <div class="no-players">선수 정보가 없습니다.</div>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

// 성취감 멘트 생성 (승리 요인/피드백 포함)
function generateAchievementMessage(matchResult, userGoals, opponentGoals, userStats = {}, opponentStats = {}) {
    const goalDiff = userGoals - opponentGoals;
    
    if (matchResult === 1) { // 승리 - 승리 요인과 강점 분석
        return analyzeWinFactors(userGoals, opponentGoals, userStats, opponentStats);
    } else if (matchResult === 2) { // 패배 - 부족한 점과 상대방 비교 피드백
        return analyzeLossFactors(userGoals, opponentGoals, userStats, opponentStats);
    } else { // 무승부 - 개선점과 상대방 비교 피드백
        return analyzeDrawFactors(userGoals, opponentGoals, userStats, opponentStats);
    }
}

// 승리 요인 분석
function analyzeWinFactors(userGoals, opponentGoals, userStats, opponentStats) {
    const goalDiff = userGoals - opponentGoals;
    const userPossession = userStats.possession || 0;
    const opponentPossession = opponentStats.possession || 0;
    const userShots = userStats.shoot?.shootTotal || 0;
    const opponentShots = opponentStats.shoot?.shootTotal || 0;
    const userEffectiveShots = userStats.shoot?.effectiveShootTotal || 0;
    const opponentEffectiveShots = opponentStats.shoot?.effectiveShootTotal || 0;
    
    // 점유율 우위
    if (userPossession > opponentPossession + 10) {
        return "🎯 점유율 장악으로 경기를 주도했다!";
    }
    
    // 슈팅 효율성
    if (userEffectiveShots > opponentEffectiveShots && userShots <= opponentShots) {
        return "⚡ 정확한 슈팅으로 효율적인 공격을 했다!";
    }
    
    // 대승
    if (goalDiff >= 3) {
        return "🏆 완전한 압승! 공수 모두 완벽했다!";
    }
    
    // 안정적 승리
    if (goalDiff === 2) {
        return "💪 안정적인 경기 운영으로 승리를 거두었다!";
    }
    
    // 근소한 승리
    if (goalDiff === 1) {
        return "🎯 치열한 경기 끝에 결정력을 발휘했다!";
    }
    
    return "🎉 승리! 오늘은 내가 최고였다!";
}

// 패배 요인 분석
function analyzeLossFactors(userGoals, opponentGoals, userStats, opponentStats) {
    const goalDiff = userGoals - opponentGoals;
    const userPossession = userStats.possession || 0;
    const opponentPossession = opponentStats.possession || 0;
    const userShots = userStats.shoot?.shootTotal || 0;
    const opponentShots = opponentStats.shoot?.shootTotal || 0;
    const userEffectiveShots = userStats.shoot?.effectiveShootTotal || 0;
    const opponentEffectiveShots = opponentStats.shoot?.effectiveShootTotal || 0;
    
    // 점유율 열세
    if (userPossession < opponentPossession - 10) {
        return "😔 점유율에서 밀려 경기를 내주었다";
    }
    
    // 슈팅 기회 부족
    if (userShots < opponentShots - 3) {
        return "🤔 공격 기회가 부족했다";
    }
    
    // 슈팅 정확도 부족
    if (userShots >= opponentShots && userEffectiveShots < opponentEffectiveShots) {
        return "😤 슈팅 정확도가 아쉬웠다";
    }
    
    // 대패
    if (goalDiff <= -3) {
        return "😔 큰 점수차 패배... 수비가 무너졌다";
    }
    
    // 근소한 패배
    if (goalDiff === -1) {
        return "😅 아쉬운 1점차 패배, 결정력이 부족했다";
    }
    
    return "💪 패배했지만 실력은 인정받았다!";
}

// 무승부 요인 분석
function analyzeDrawFactors(userGoals, opponentGoals, userStats, opponentStats) {
    const userPossession = userStats.possession || 0;
    const opponentPossession = opponentStats.possession || 0;
    const userShots = userStats.shoot?.shootTotal || 0;
    const opponentShots = opponentStats.shoot?.shootTotal || 0;
    
    // 무득점 무승부
    if (userGoals === 0 && opponentGoals === 0) {
        return "🛡️ 수비전, 공격력이 부족했다";
    }
    
    // 고득점 무승부
    if (userGoals >= 3 && opponentGoals >= 3) {
        return "⚽ 화끈한 경기! 수비 안정성이 부족했다";
    }
    
    // 점유율 우위에도 무승부
    if (userPossession > opponentPossession + 5) {
        return "🤔 점유율은 우세했지만 결정력이 부족했다";
    }
    
    // 슈팅 기회는 많았지만 무승부
    if (userShots > opponentShots + 2) {
        return "😤 슈팅 기회는 많았지만 정확도가 아쉬웠다";
    }
    
    return "🤝 실력이 팽팽한 무승부였다";
}

// 실력 향상을 위한 보완점 제안 생성
function generateImprovementSuggestion(matchResult, userGoals, opponentGoals, userStats, opponentStats, recentMatches) {
    const suggestions = [];
    
    // 1. 경기 결과별 기본 피드백
    const basicFeedback = getBasicImprovementFeedback(matchResult, userGoals, opponentGoals);
    if (basicFeedback) suggestions.push(basicFeedback);
    
    // 2. 상대방과의 데이터 비교 분석
    const comparisonFeedback = getComparisonFeedback(userStats, opponentStats);
    if (comparisonFeedback) suggestions.push(comparisonFeedback);
    
    // 3. 최근 경기 패턴 분석
    const patternFeedback = getPatternFeedback(recentMatches);
    if (patternFeedback) suggestions.push(patternFeedback);
    
    // 4. 구체적인 개선 방향 제시
    const specificFeedback = getSpecificFeedback(userStats, opponentStats, recentMatches);
    if (specificFeedback) suggestions.push(specificFeedback);
    
    // 가장 중요한 피드백 1-2개 선택
    const prioritySuggestions = suggestions.slice(0, 2);
    
    if (prioritySuggestions.length === 0) {
        return "💡 꾸준한 연습으로 실력을 향상시켜보세요!";
    }
    
    return prioritySuggestions.join(' ');
}

// 기본 개선 피드백
function getBasicImprovementFeedback(matchResult, userGoals, opponentGoals) {
    const goalDiff = userGoals - opponentGoals;
    
    if (matchResult === 1) { // 승리
        if (goalDiff >= 3) {
            return "🏆 완벽한 경기! 이 플레이 스타일을 유지하세요";
        } else if (goalDiff === 1) {
            return "💪 승리했지만 더 안정적인 경기 운영이 필요해요";
        }
    } else if (matchResult === 2) { // 패배
        if (goalDiff <= -3) {
            return "😤 큰 점수차 패배... 수비 집중도와 공격 효율성을 높여보세요";
        } else if (goalDiff === -1) {
            return "😅 아쉬운 1점차 패배, 결정력 향상이 필요해요";
        }
    } else { // 무승부
        if (userGoals === 0) {
            return "🛡️ 무득점 무승부, 공격 다양성을 늘려보세요";
        } else if (userGoals >= 3) {
            return "⚽ 고득점 무승부, 수비 안정성을 높여보세요";
        }
    }
    
    return null;
}

// 상대방과의 비교 피드백
function getComparisonFeedback(userStats, opponentStats) {
    const userPossession = userStats.possession || 0;
    const opponentPossession = opponentStats.possession || 0;
    const userShots = userStats.shoot?.shootTotal || 0;
    const opponentShots = opponentStats.shoot?.shootTotal || 0;
    const userEffectiveShots = userStats.shoot?.effectiveShootTotal || 0;
    const opponentEffectiveShots = opponentStats.shoot?.effectiveShootTotal || 0;
    
    // 점유율 비교
    if (userPossession < opponentPossession - 15) {
        return "📊 점유율에서 크게 밀렸어요. 빌드업 연습이 필요해요";
    }
    
    // 슈팅 기회 비교
    if (userShots < opponentShots - 5) {
        return "⚽ 공격 기회가 부족했어요. 공격 전개를 더 적극적으로 해보세요";
    }
    
    // 슈팅 정확도 비교
    if (userShots > 0 && opponentShots > 0) {
        const userAccuracy = (userEffectiveShots / userShots) * 100;
        const opponentAccuracy = (opponentEffectiveShots / opponentShots) * 100;
        
        if (userAccuracy < opponentAccuracy - 20) {
            return "🎯 슈팅 정확도가 아쉬워요. 마무리 연습을 더 해보세요";
        }
    }
    
    return null;
}

// 최근 경기 패턴 분석
function getPatternFeedback(recentMatches) {
    if (!recentMatches || recentMatches.length < 3) return null;
    
    const recent3Matches = recentMatches.slice(0, 3);
    let totalGoals = 0;
    let totalConceded = 0;
    let wins = 0;
    
    recent3Matches.forEach(match => {
        totalGoals += match.userGoals || 0;
        totalConceded += match.opponentGoals || 0;
        if (match.matchResult === 1) wins++;
    });
    
    const avgGoals = (totalGoals / recent3Matches.length).toFixed(1);
    const avgConceded = (totalConceded / recent3Matches.length).toFixed(1);
    
    // 득점 패턴 분석
    if (parseFloat(avgGoals) < 1.0) {
        return "⚽ 최근 득점이 부족해요. 공격 전술을 다양화해보세요";
    }
    
    // 실점 패턴 분석
    if (parseFloat(avgConceded) > 2.0) {
        return "🛡️ 최근 실점이 많아요. 수비 집중도를 높여보세요";
    }
    
    // 승률 패턴 분석
    if (wins === 0) {
        return "📈 최근 승률이 낮아요. 기본기 연습에 집중해보세요";
    }
    
    return null;
}

// 구체적인 개선 방향 제시
function getSpecificFeedback(userStats, opponentStats, recentMatches) {
    const userPossession = userStats.possession || 0;
    const userShots = userStats.shoot?.shootTotal || 0;
    const userEffectiveShots = userStats.shoot?.effectiveShootTotal || 0;
    
    // 점유율 기반 제안
    if (userPossession < 40) {
        return "🔄 점유율을 높이기 위해 패스 정확도를 연습해보세요";
    }
    
    // 슈팅 효율성 기반 제안
    if (userShots > 0) {
        const accuracy = (userEffectiveShots / userShots) * 100;
        if (accuracy < 30) {
            return "🎯 슈팅 정확도를 높이기 위해 골대 안쪽을 노려보세요";
        }
    }
    
    // 최근 경기 기반 제안
    if (recentMatches && recentMatches.length >= 5) {
        const recent5Matches = recentMatches.slice(0, 5);
        let cleanSheets = 0;
        
        recent5Matches.forEach(match => {
            if (match.opponentGoals === 0) cleanSheets++;
        });
        
        if (cleanSheets === 0) {
            return "🛡️ 무실점 경기를 위해 수비 조직력을 강화해보세요";
        }
    }
    
    return null;
}

// 최근 10경기 특징 분석
function analyzeRecentFeatures(matches) {
    if (!matches || matches.length === 0) {
        return {};
    }
    
    const recent10Matches = matches.slice(0, 10);
    const features = {};
    
    // 연승/연패 분석
    let currentStreak = 0;
    let streakType = '';
    
    for (let i = 0; i < recent10Matches.length; i++) {
        const result = recent10Matches[i].matchResult;
        if (i === 0) {
            streakType = result === 1 ? 'win' : result === 2 ? 'lose' : 'draw';
            currentStreak = 1;
        } else {
            if ((streakType === 'win' && result === 1) || 
                (streakType === 'lose' && result === 2) || 
                (streakType === 'draw' && result === 0)) {
                currentStreak++;
            } else {
                break;
            }
        }
    }
    
    if (currentStreak >= 2) {
        if (streakType === 'win') {
            features.streak = `연승 ${currentStreak}경기`;
        } else if (streakType === 'lose') {
            features.streak = `연패 ${currentStreak}경기`;
        } else if (streakType === 'draw') {
            features.streak = `연무 ${currentStreak}경기`;
        }
    }
    
    // 무실점 경기 분석
    let cleanSheets = 0;
    for (const match of recent10Matches) {
        if (match.opponentGoals === 0) {
            cleanSheets++;
        }
    }
    
    if (cleanSheets >= 2) {
        features.cleanSheets = `무실점 ${cleanSheets}경기`;
    }
    
    // 평균 득점 계산을 위한 총 골 수
    let totalGoals = 0;
    for (const match of recent10Matches) {
        totalGoals += match.userGoals || 0;
    }
    
    // 평균 득점 분석
    const avgGoals = (totalGoals / recent10Matches.length).toFixed(1);
    if (parseFloat(avgGoals) >= 1.5) {
        features.avgGoals = `평균 ${avgGoals}골`;
    }
    
    return features;
}


// 등급 정보 가져오기 (lib/grade.js의 getDivisionInfo와 동일한 로직)
function getDivisionInfo(divisionId) {
    const divisionMap = {
        800: { name: '슈퍼챔피언스', color: '#FFD700', description: '최고 등급' },
        900: { name: '챔피언스', color: '#C0C0C0', description: '챔피언스 등급' },
        1000: { name: '슈퍼챌린저', color: '#CD7F32', description: '슈퍼챌린저 등급' },
        1100: { name: '챌린저', color: '#FF6B6B', description: '챌린저 등급' },
        1200: { name: '슈퍼챔피언', color: '#4ECDC4', description: '슈퍼챔피언 등급' },
        1300: { name: '챔피언', color: '#45B7D1', description: '챔피언 등급' },
        1400: { name: '슈퍼월드클래스', color: '#96CEB4', description: '슈퍼월드클래스 등급' },
        1500: { name: '월드클래스', color: '#FFEAA7', description: '월드클래스 등급' },
        1600: { name: '슈퍼프로', color: '#DDA0DD', description: '슈퍼프로 등급' },
        1700: { name: '프로', color: '#98D8C8', description: '프로 등급' },
        1800: { name: '세미프로', color: '#F7DC6F', description: '세미프로 등급' },
        1900: { name: '아마추어', color: '#BB8FCE', description: '아마추어 등급' },
        2000: { name: '루키', color: '#85C1E9', description: '루키 등급' }
    };
    
    return divisionMap[divisionId] || { 
        name: '등급 정보 없음', 
        color: '#666', 
        description: '등급 정보 없음' 
    };
}

// 베스트 플레이어 선택
function getBestPlayers(players) {
    if (!players || players.length === 0) {
        return {
            topScorer: { name: '정보 없음', goals: 0, season: null },
            topAssister: { name: '정보 없음', assists: 0, season: null },
            topRated: { name: '정보 없음', rating: 0, season: null }
        };
    }
    
    // 득점왕 찾기
    const topScorer = players.reduce((best, player) => {
        const goals = player.status?.goal || 0;
        return goals > best.goals ? { 
            name: player.spName, 
            goals, 
            season: player.season,
            grade: player.spGrade || player.grade || null,
            spid: player.spid || null
        } : best;
    }, { name: '정보 없음', goals: 0, season: null, grade: null, spid: null });
    
    // 도움왕 찾기
    const topAssister = players.reduce((best, player) => {
        const assists = player.status?.assist || 0;
        return assists > best.assists ? { 
            name: player.spName, 
            assists, 
            season: player.season,
            grade: player.spGrade || player.grade || null,
            spid: player.spid || null
        } : best;
    }, { name: '정보 없음', assists: 0, season: null, grade: null, spid: null });
    
    // 평점왕 찾기
    const topRated = players.reduce((best, player) => {
        const rating = player.status?.spRating || 0;
        return rating > best.rating ? { 
            name: player.spName, 
            rating: rating.toFixed(1), 
            season: player.season,
            grade: player.spGrade || player.grade || null,
            spid: player.spid || null
        } : best;
    }, { name: '정보 없음', rating: 0, season: null, grade: null, spid: null });
    
    return { topScorer, topAssister, topRated };
}

// 포지션 번호를 실제 포지션명으로 변환하는 함수
function getPositionName(positionNumber) {
    const positionMap = {
        0: 'GK',   // 골키퍼
        1: 'SW',   // 스위퍼
        2: 'RWB',  // 라이트 윙백
        3: 'RB',   // 라이트 백
        4: 'RCB',  // 라이트 센터백
        5: 'CB',   // 센터백
        6: 'LCB',  // 레프트 센터백
        7: 'LB',   // 레프트 백
        8: 'LWB',  // 레프트 윙백
        9: 'RDM',  // 라이트 디펜시브 미드필더
        10: 'CDM', // 센터 디펜시브 미드필더
        11: 'LDM', // 레프트 디펜시브 미드필더
        12: 'RM',  // 라이트 미드필더
        13: 'RCM', // 라이트 센터 미드필더
        14: 'CM',  // 센터 미드필더
        15: 'LCM', // 레프트 센터 미드필더
        16: 'LM',  // 레프트 미드필더
        17: 'RAM', // 라이트 어택킹 미드필더
        18: 'CAM', // 센터 어택킹 미드필더
        19: 'LAM', // 레프트 어택킹 미드필더
        20: 'RF',  // 라이트 포워드
        21: 'CF',  // 센터 포워드
        22: 'LF',  // 레프트 포워드
        23: 'RW',  // 라이트 윙
        24: 'RS',  // 라이트 스트라이커
        25: 'ST',  // 스트라이커
        26: 'LS',  // 레프트 스트라이커
        27: 'LW',  // 레프트 윙
        28: 'SUB'  // 교체 선수
    };
    
    const positionName = positionMap[positionNumber];
    return positionName || 'UNKNOWN';
}

// 포지션을 카테고리로 분류하는 함수
function getPositionCategory(positionNumber) {
    const positionName = getPositionName(positionNumber);
    
    
    // 공격수: ST, CF, LW, RW, LF, RF, RS, LS
    if (['ST', 'CF', 'LW', 'RW', 'LF', 'RF', 'RS', 'LS'].includes(positionName)) {
        return 'forward';
    }
    // 미드필더: CAM, CM, CDM, LM, RM, RAM, LAM, RCM, LCM, RDM, LDM
    else if (['CAM', 'CM', 'CDM', 'LM', 'RM', 'RAM', 'LAM', 'RCM', 'LCM', 'RDM', 'LDM'].includes(positionName)) {
        return 'midfielder';
    }
    // 수비수: CB, LB, RB, LWB, RWB, LCB, RCB, LC, RC
    else if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'LCB', 'RCB', 'LC', 'RC'].includes(positionName)) {
        return 'defender';
    }
    // 골키퍼: GK
    else if (['GK'].includes(positionName)) {
        return 'goalkeeper';
    }
    // 교체 선수: SUB
    else if (['SUB'].includes(positionName)) {
        return 'substitute';
    }
    // 기타
    else {
        return 'other';
    }
}

// 선수 목록을 포지션별로 정렬하는 함수
function getPlayersByPosition(players) {
    if (!players || players.length === 0) {
        return {
            forwards: [],
            midfielders: [],
            defenders: [],
            goalkeepers: []
        };
    }
    
    const forwards = [];
    const midfielders = [];
    const defenders = [];
    const goalkeepers = [];
    const substitutes = [];
    const others = [];
    
    
    players.forEach((player, index) => {
        const positionNumber = player.spPosition;
        const positionName = getPositionName(positionNumber);
        const category = getPositionCategory(positionNumber);
        const rating = player.status?.spRating || 0;
        const goals = player.status?.goal || 0;
        const assists = player.status?.assist || 0;
        
        
        const playerInfo = {
            name: player.spName,
            rating: rating,
            goals: goals,
            assists: assists,
            season: player.season,
            position: positionName,
            positionNumber: positionNumber,
            grade: player.spGrade || player.grade || null,
            spid: player.spid || null
        };
        
        // 포지션별 분류
        switch (category) {
            case 'forward':
                forwards.push(playerInfo);
                break;
            case 'midfielder':
                midfielders.push(playerInfo);
                break;
            case 'defender':
                defenders.push(playerInfo);
                break;
            case 'goalkeeper':
                goalkeepers.push(playerInfo);
                break;
            case 'substitute':
                // 교체 선수는 평점이 0이 아닌 경우만 추가
                if (rating > 0) {
                    substitutes.push(playerInfo);
                } else {
                }
                break;
            default:
                others.push(playerInfo);
        }
    });
    
    // 평점순으로 정렬
    forwards.sort((a, b) => b.rating - a.rating);
    midfielders.sort((a, b) => b.rating - a.rating);
    defenders.sort((a, b) => b.rating - a.rating);
    goalkeepers.sort((a, b) => b.rating - a.rating);
    substitutes.sort((a, b) => b.rating - a.rating);
    others.sort((a, b) => b.rating - a.rating);
    
    const result = { forwards, midfielders, defenders, goalkeepers, substitutes, others };
    
    return result;
}

// 선수 목록 HTML 생성
function renderPlayerList(players, teamName) {
    
    if (!players || players.length === 0) {
        return `
            <div class="team-players">
                <h5>${teamName}</h5>
                <div class="no-players">선수 정보가 없습니다.</div>
            </div>
        `;
    }
    
    const playersByPosition = getPlayersByPosition(players);
    
    return `
        <div class="team-players">
            <h5>${teamName}</h5>
            <div class="players-by-position">
                ${playersByPosition.forwards.length > 0 ? `
                    <div class="position-group">
                        <h6>공격수</h6>
                        <div class="players-list">
                            ${playersByPosition.forwards.map(player => renderPlayerItem(player)).join('')}
                        </div>
                    </div>
                ` : ''}
                ${playersByPosition.midfielders.length > 0 ? `
                    <div class="position-group">
                        <h6>미드필더</h6>
                        <div class="players-list">
                            ${playersByPosition.midfielders.map(player => renderPlayerItem(player)).join('')}
                        </div>
                    </div>
                ` : ''}
                ${playersByPosition.defenders.length > 0 ? `
                    <div class="position-group">
                        <h6>수비수</h6>
                        <div class="players-list">
                            ${playersByPosition.defenders.map(player => renderPlayerItem(player)).join('')}
                        </div>
                    </div>
                ` : ''}
                ${playersByPosition.goalkeepers.length > 0 ? `
                    <div class="position-group">
                        <h6>골키퍼</h6>
                        <div class="players-list">
                            ${playersByPosition.goalkeepers.map(player => renderPlayerItem(player)).join('')}
                        </div>
                    </div>
                ` : ''}
                ${playersByPosition.substitutes && playersByPosition.substitutes.length > 0 ? `
                    <div class="position-group">
                        <h6>교체 선수</h6>
                        <div class="players-list">
                            ${playersByPosition.substitutes.map(player => renderPlayerItem(player)).join('')}
                        </div>
                    </div>
                ` : ''}
                ${playersByPosition.others && playersByPosition.others.length > 0 ? `
                    <div class="position-group">
                        <h6>기타</h6>
                        <div class="players-list">
                            ${playersByPosition.others.map(player => renderPlayerItem(player)).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// 강화 등급 이미지 생성 함수
function renderGradeImage(grade, spid) {
    if (!grade && !spid) return '';
    
    // spid에서 강화 등급 추출 (예: spid가 "123456789"라면 마지막 숫자로 등급 추정)
    let gradeLevel = grade;
    if (!gradeLevel && spid) {
        // spid의 마지막 자리로 강화 등급 추정 (0-13)
        const lastDigit = parseInt(spid.toString().slice(-1));
        gradeLevel = lastDigit % 14; // 0-13 범위로 제한
    }
    
    if (gradeLevel === null || gradeLevel === undefined) return '';
    
    // 강화 등급별 색상과 텍스트
    const gradeInfo = getGradeInfo(gradeLevel);
    
    return `
        <div class="grade-badge grade-${gradeLevel}" title="강화 등급: ${gradeInfo.name}">
            <span class="grade-text">+${gradeLevel}</span>
        </div>
    `;
}

// 강화 등급 정보 반환 함수
function getGradeInfo(grade) {
    const gradeMap = {
        0: { name: '기본', color: '#6B7280', tier: 'basic' },
        1: { name: '+1', color: '#8B4513', tier: 'brown' },
        2: { name: '+2', color: '#A0522D', tier: 'brown' },
        3: { name: '+3', color: '#CD853F', tier: 'brown' },
        4: { name: '+4', color: '#D2691E', tier: 'brown' },
        5: { name: '+5', color: '#C0C0C0', tier: 'silver' },
        6: { name: '+6', color: '#A8A8A8', tier: 'silver' },
        7: { name: '+7', color: '#808080', tier: 'silver' },
        8: { name: '+8', color: '#FFD700', tier: 'gold' },
        9: { name: '+9', color: '#FFA500', tier: 'gold' },
        10: { name: '+10', color: '#FF8C00', tier: 'gold' },
        11: { name: '+11', color: 'rgba(255, 215, 0, 0.8)', tier: 'iridescent' },
        12: { name: '+12', color: 'rgba(135, 206, 235, 0.6)', tier: 'iridescent' },
        13: { name: '+13', color: 'rgba(65, 105, 225, 0.6)', tier: 'iridescent' }
    };
    
    return gradeMap[grade] || { name: `+${grade}`, color: '#6B7280', tier: 'basic' };
}

// 개별 선수 아이템 HTML 생성
function renderPlayerItem(player) {
    
    const seasonImg = player.season?.seasonImg ? 
        `<img src="${player.season.seasonImg}" alt="시즌" class="player-season-img" onerror="this.style.display='none'"/>` : '';
    
    const gradeImg = renderGradeImage(player.grade, player.spid);
    
    const stats = [];
    if (player.goals > 0) stats.push(`${player.goals}골`);
    if (player.assists > 0) stats.push(`${player.assists}어시`);
    
    const statsText = stats.length > 0 ? ` (${stats.join(', ')})` : '';
    
    const rating = typeof player.rating === 'number' ? player.rating.toFixed(1) : '0.0';
    const position = player.position || 'UNKNOWN';
    
    return `
    <div class="player-item">
        <div class="player-left-info">
            <span class="player-position">${position}</span>
            ${seasonImg}
            ${gradeImg}
            <span class="player-name">${player.name || '이름 없음'}</span>
        </div>
        <div class="player-right-info">
            <span class="player-recent-stats">${statsText}</span>
            <span class="player-rating">${rating}</span>
        </div>
    </div>
`;

}


// 실제 선수 포지션을 분석하여 포메이션 계산
function calculateFormationFromPlayers(players) {
    // 빈 배열이거나 null인 경우 빈 포메이션 반환
    if (!players || players.length === 0) {
        return '0-0-0-0';
    }
    
    // 1. 교체 선수(SUB)와 기타 포지션 제외하고 실제 출전 선수만 필터링
    const startingPlayers = players.filter(player => {
        const positionGroup = getPositionGroup(player.spPosition);
        return positionGroup !== 'OTHER' && positionGroup !== 'SUB';
    });
    
    
    // 2. 골키퍼와 필드 플레이어 분류
    const goalkeepers = startingPlayers.filter(player => getPositionGroup(player.spPosition) === 'GK');
    const fieldPlayers = startingPlayers.filter(player => getPositionGroup(player.spPosition) !== 'GK');
    
    
    // 3. 포지션 그룹별 선수 수 계산 (골키퍼 제외)
    const positionCounts = {
        DF: 0,  // 수비수
        DM: 0,  // 수미
        AM: 0,  // 공미
        FW: 0   // 공격수
    };
    
    fieldPlayers.forEach(player => {
        const group = getPositionGroup(player.spPosition);
        if (positionCounts.hasOwnProperty(group)) {
            positionCounts[group]++;
        } else {
        }
    });
    
    // 4. 포메이션 문자열 생성 (수비수-수미-공미-공격수)
    let formation = `${positionCounts.DF}-${positionCounts.DM}-${positionCounts.AM}-${positionCounts.FW}`;
    
    // 4-2-2-1-1 포메이션 특별 처리 (FC온라인 정의)
    // FC온라인에서 LB, LCB, RCB, RB, LDM, RDM, LM, RM, CAM, ST를 사용하는 경우 4-2-2-1-1
    if (positionCounts.DF === 4 && positionCounts.DM === 2 && positionCounts.AM === 2 && positionCounts.FW === 1) {
        // FC온라인 4-2-2-1-1 포메이션의 핵심 포지션들 확인
        const fcOnlinePositions = fieldPlayers.map(p => getPositionName(p.spPosition));
        
        // FC온라인 4-2-2-1-1 포메이션 조건 확인
        const hasFcOnlineDefenders = fcOnlinePositions.some(pos => ['LB', 'LCB', 'RCB', 'RB'].includes(pos));
        const hasFcOnlineDMs = fcOnlinePositions.some(pos => ['LDM', 'RDM'].includes(pos));
        const hasFcOnlineAMs = fcOnlinePositions.some(pos => ['LM', 'RM', 'CAM'].includes(pos));
        const hasFcOnlineST = fcOnlinePositions.includes('ST');
        
        
        // FC온라인 4-2-2-1-1 포메이션 조건: 핵심 포지션들이 모두 있어야 함
        if (hasFcOnlineDefenders && hasFcOnlineDMs && hasFcOnlineAMs && hasFcOnlineST) {
            formation = '4-2-2-1-1';
        } else {
        }
    }
    
    // 추가: 4-2-3-1에서 CAM이 있는 경우도 4-2-2-1-1로 인식 (FC온라인 특별 처리)
    else if (positionCounts.DF === 4 && positionCounts.DM === 2 && positionCounts.AM === 3 && positionCounts.FW === 1) {
        const fcOnlinePositions = fieldPlayers.map(p => getPositionName(p.spPosition));
        const hasFcOnlineDefenders = fcOnlinePositions.some(pos => ['LB', 'LCB', 'RCB', 'RB'].includes(pos));
        const hasFcOnlineDMs = fcOnlinePositions.some(pos => ['LDM', 'RDM'].includes(pos));
        const hasFcOnlineAMs = fcOnlinePositions.some(pos => ['LM', 'RM', 'CAM'].includes(pos));
        const hasFcOnlineST = fcOnlinePositions.includes('ST');
        
        
        if (hasFcOnlineDefenders && hasFcOnlineDMs && hasFcOnlineAMs && hasFcOnlineST) {
            formation = '4-2-2-1-1';
        }
    }
    
    
    // 5. 선수별 포지션 상세 로그
    fieldPlayers.forEach(player => {
        const positionName = getPositionName(player.spPosition);
        const group = getPositionGroup(player.spPosition);
    });
    
    return formation;
}

// 포메이션 테스트 함수 (개발용)
function testFormationCalculation() {
    
    // 테스트 케이스 1: 4-4-2 포메이션
    const formation442 = [
        { spPosition: 0, spName: 'GK' },      // GK
        { spPosition: 5, spName: 'CB1' },     // CB
        { spPosition: 6, spName: 'CB2' },     // LCB -> CB
        { spPosition: 7, spName: 'LB' },      // LB
        { spPosition: 3, spName: 'RB' },      // RB
        { spPosition: 14, spName: 'CM1' },    // CM -> AM
        { spPosition: 15, spName: 'CM2' },    // LCM -> AM
        { spPosition: 12, spName: 'RM' },     // RM -> AM
        { spPosition: 16, spName: 'LM' },     // LM -> AM
        { spPosition: 25, spName: 'ST1' },    // ST -> FW
        { spPosition: 21, spName: 'ST2' }     // CF -> FW
    ];
    
    const result1 = calculateFormationFromPlayers(formation442);
    
    // 테스트 케이스 2: 4-3-3 포메이션
    const formation433 = [
        { spPosition: 0, spName: 'GK' },      // GK
        { spPosition: 5, spName: 'CB1' },     // CB
        { spPosition: 6, spName: 'CB2' },     // LCB -> CB
        { spPosition: 7, spName: 'LB' },      // LB
        { spPosition: 3, spName: 'RB' },      // RB
        { spPosition: 10, spName: 'CDM' },    // CDM -> DM
        { spPosition: 14, spName: 'CM1' },    // CM -> AM
        { spPosition: 15, spName: 'CM2' },    // LCM -> AM
        { spPosition: 25, spName: 'ST' },     // ST -> FW
        { spPosition: 27, spName: 'LW' },     // LW -> FW
        { spPosition: 23, spName: 'RW' }      // RW -> FW
    ];
    
    const result2 = calculateFormationFromPlayers(formation433);
    
    // 테스트 케이스 3: 3-5-2 포메이션
    const formation352 = [
        { spPosition: 0, spName: 'GK' },      // GK
        { spPosition: 5, spName: 'CB1' },     // CB
        { spPosition: 6, spName: 'CB2' },     // LCB -> CB
        { spPosition: 4, spName: 'CB3' },     // RCB -> CB
        { spPosition: 10, spName: 'CDM1' },   // CDM -> DM
        { spPosition: 11, spName: 'CDM2' },   // LDM -> DM
        { spPosition: 14, spName: 'CM1' },    // CM -> AM
        { spPosition: 15, spName: 'CM2' },    // LCM -> AM
        { spPosition: 16, spName: 'LM' },     // LM -> AM
        { spPosition: 25, spName: 'ST1' },    // ST -> FW
        { spPosition: 21, spName: 'ST2' }     // CF -> FW
    ];
    
    const result3 = calculateFormationFromPlayers(formation352);
    
    // 테스트 케이스 4: 4-2-2-1-1 포메이션 (FC온라인 정의)
    const formation42211 = [
        { spPosition: 0, spName: 'GK' },      // GK
        { spPosition: 7, spName: 'LB' },      // LB -> DF
        { spPosition: 6, spName: 'LCB' },     // LCB -> DF
        { spPosition: 4, spName: 'RCB' },     // RCB -> DF
        { spPosition: 3, spName: 'RB' },      // RB -> DF
        { spPosition: 11, spName: 'LDM' },    // LDM -> DM
        { spPosition: 10, spName: 'RDM' },    // RDM -> DM
        { spPosition: 16, spName: 'LM' },     // LM -> AM
        { spPosition: 12, spName: 'RM' },     // RM -> AM
        { spPosition: 25, spName: 'ST' }      // ST -> FW
    ];
    
    const result4 = calculateFormationFromPlayers(formation42211);
}

// 공격 효율성 계산
function calculateAttackEfficiency(userStats) {
    if (!userStats.shoot) {
        return { score: 0, level: 'poor', description: '무득점' };
    }
    
    // 안전한 값 추출
    const shootTotal = userStats.shoot.shootTotal || 0;
    const goalTotal = userStats.shoot.goalTotal || 0;
    const effectiveShootTotal = userStats.shoot.effectiveShootTotal || 0;
    const goalInPenalty = userStats.shoot.goalInPenalty || 0;
    
    if (shootTotal === 0) {
        return { score: 0, level: 'poor', description: '무득점' };
    }
    
    // NaN 방지를 위한 안전한 계산
    const shootAccuracy = shootTotal > 0 ? goalTotal / shootTotal : 0;
    const effectiveShootRatio = shootTotal > 0 ? effectiveShootTotal / shootTotal : 0;
    const boxFinishing = goalTotal > 0 ? goalInPenalty / goalTotal : 0;
    
    // 유효한 숫자인지 확인
    const validShootAccuracy = isNaN(shootAccuracy) ? 0 : shootAccuracy;
    const validEffectiveShootRatio = isNaN(effectiveShootRatio) ? 0 : effectiveShootRatio;
    const validBoxFinishing = isNaN(boxFinishing) ? 0 : boxFinishing;
    
    const efficiency = (validShootAccuracy * 0.4 + validEffectiveShootRatio * 0.4 + validBoxFinishing * 0.2) * 100;
    const finalScore = isNaN(efficiency) ? 0 : efficiency;
    
    return {
        score: Math.round(Math.min(Math.max(finalScore, 0), 100)), // 0-100 범위로 제한
        level: finalScore > 75 ? 'excellent' : finalScore > 50 ? 'good' : finalScore > 25 ? 'average' : 'poor',
        description: finalScore > 75 ? '정확한 킬러' : finalScore > 50 ? '효율적 공격수' : finalScore > 25 ? '기회 창조형' : '볼륨 슈터'
    };
}

// 빌드업 스타일 계산 (모든 패스 수, 패스 성공률, 점유율 기반)
function calculateBuildupStyle(userStats) {
    
    // 기본값 체크 - 데이터가 전혀 없으면 0점
    if (!userStats || (!userStats.pass && !userStats.possession)) {
        return { score: 0, style: 'direct', description: '데이터 없음' };
    }
    
    // 1. 패스 데이터 추출 시도
    let totalPassAttempts = 0;
    let totalPassSuccess = 0;
    
    if (userStats.pass) {
        
        // FC온라인 API의 실제 필드명들 (제공된 API 구조 기반)
        const passTry = userStats.pass.passTry || 0;
        const passSuccess = userStats.pass.passSuccess || 0;
        
        // 개별 패스 유형별 시도 및 성공 수
        const shortPassTry = userStats.pass.shortPassTry || 0;
        const shortPassSuccess = userStats.pass.shortPassSuccess || 0;
        const longPassTry = userStats.pass.longPassTry || 0;
        const longPassSuccess = userStats.pass.longPassSuccess || 0;
        const bouncingLobPassTry = userStats.pass.bouncingLobPassTry || 0;
        const bouncingLobPassSuccess = userStats.pass.bouncingLobPassSuccess || 0;
        const drivenGroundPassTry = userStats.pass.drivenGroundPassTry || 0;
        const drivenGroundPassSuccess = userStats.pass.drivenGroundPassSuccess || 0;
        const throughPassTry = userStats.pass.throughPassTry || 0;
        const throughPassSuccess = userStats.pass.throughPassSuccess || 0;
        const lobbedThroughPassTry = userStats.pass.lobbedThroughPassTry || 0;
        const lobbedThroughPassSuccess = userStats.pass.lobbedThroughPassSuccess || 0;
        
        // 총 패스 시도 및 성공 수 계산
        totalPassAttempts = passTry;
        totalPassSuccess = passSuccess;
        
    }
    
    // 2. 패스 성공률 계산
    const passSuccessRate = totalPassAttempts > 0 ? (totalPassSuccess / totalPassAttempts) : 0;
    
    // 3. 점유율 확인
    const possession = userStats.possession || 0;
    
    // 4. 개선된 빌드업 점수 계산
    let finalScore = 0;
    
    // 패스 성공률 점수 (0-40점)
    const passSuccessScore = passSuccessRate * 40;
    
    // 점유율 점수 (0-40점) - 50%를 기준점으로 설정
    const possessionScore = possession > 0 ? Math.min((possession / 50) * 40, 40) : 0;
    
    // 패스 활성도 점수 (0-20점) - 100패스를 기준으로 설정
    const passActivityScore = totalPassAttempts > 0 ? Math.min((totalPassAttempts / 100) * 20, 20) : 0;
    
    finalScore = passSuccessScore + possessionScore + passActivityScore;
    
    // 데이터가 부족한 경우 점유율만으로라도 점수 제공
    if (finalScore === 0 && possession > 0) {
        finalScore = Math.min(possession * 0.8, 60); // 점유율만 있어도 최대 60점 가능
    }
    
    // 최소 점수 보장 (단, 아예 데이터가 없는 경우는 제외)
    if (finalScore === 0 && totalPassAttempts === 0 && possession === 0) {
        finalScore = 0; // 데이터가 전혀 없으면 0점
    } else if (finalScore > 0 && finalScore < 5) {
        finalScore = 5; // 최소 5점은 보장
    }
    
    
    // 스타일 결정
    let style = 'direct';
    let description = '다이렉트 플레이';
    
    if (possession >= 55 && passSuccessRate >= 0.8) {
        style = 'possession';
        description = '티키타카';
    } else if (possession >= 45 && passSuccessRate >= 0.7) {
        style = 'balanced';
        description = '균형 빌드업';
    } else if (possession >= 60) {
        style = 'possession';
        description = '볼 점유형';
    }
    
    return {
        score: Math.round(Math.min(Math.max(finalScore, 0), 100)),
        style: style,
        description: description,
        // 디버깅용 상세 정보
        details: {
            totalPassAttempts,
            totalPassSuccess,
            passSuccessRate: Math.round(passSuccessRate * 100),
            possession,
            passSuccessScore: Math.round(passSuccessScore),
            possessionScore: Math.round(possessionScore),
            passActivityScore: Math.round(passActivityScore)
        }
    };
}

// 점유율 활용도 계산
function calculatePossessionUtilization(userStats, opponentStats) {
    const possessionShare = userStats.possession || 50;
    const shootTotal = userStats.shoot?.shootTotal || 0;
    const goalTotal = userStats.shoot?.goalTotal || 0;
    const effectiveShootTotal = userStats.shoot?.effectiveShootTotal || 0;
    
    
    // 1. 점유율 점수 (0-40점) - 점유율 자체의 가치
    const possessionScore = Math.min((possessionShare / 60) * 40, 40);
    
    // 2. 공격 효율성 점수 (0-35점) - 슛당 골 비율
    const shootingEfficiency = shootTotal > 0 ? (goalTotal / shootTotal) * 35 : 0;
    
    // 3. 공격 빈도 점수 (0-25점) - 점유율 대비 슛 빈도
    // 점유율이 높을수록 더 많은 슛을 시도해야 효율적
    const expectedShots = possessionShare * 0.8; // 점유율 1%당 0.8슛 기대
    const shotFrequency = expectedShots > 0 ? Math.min((shootTotal / expectedShots) * 25, 25) : 0;
    
    // NaN 방지
    const validPossessionScore = isNaN(possessionScore) ? 0 : possessionScore;
    const validShootingEfficiency = isNaN(shootingEfficiency) ? 0 : shootingEfficiency;
    const validShotFrequency = isNaN(shotFrequency) ? 0 : shotFrequency;
    
    const finalScore = validPossessionScore + validShootingEfficiency + validShotFrequency;
    
    
    return {
        score: Math.min(Math.round(Math.max(finalScore, 0)), 100), // 0-100 범위로 제한
        efficiency: possessionShare > 55 ? 'controller' : possessionShare > 45 ? 'balanced' : 'counter',
        description: possessionShare > 55 ? '볼 컨트롤러' : possessionShare > 45 ? '균형 잡힌' : '카운터 어택커'
    };
}

// 수비 강도 계산
function calculateDefensiveIntensity(userStats, opponentStats) {
    if (!userStats.defence) {
        return { score: 50, style: 'passive', description: '안정적 수비' };
    }
    
    // 안전한 값 추출 (실제 API 필드명에 맞게)
    const tackleTry = userStats.defence.tackleTry || 0;
    const tackleSuccess = userStats.defence.tackleSuccess || 0;
    const blockTry = userStats.defence.blockTry || 0;
    const blockSuccess = userStats.defence.blockSuccess || 0;
    const opponentPossession = opponentStats?.possession || 50;
    
    // tackleTry가 0이면 기본값 반환
    if (tackleTry === 0 && blockTry === 0) {
        return { score: 50, style: 'passive', description: '안정적 수비' };
    }
    
    // NaN 방지를 위한 안전한 계산
    const tackleSuccessRate = tackleTry > 0 ? tackleSuccess / tackleTry : 0;
    const blockSuccessRate = blockTry > 0 ? blockSuccess / blockTry : 0;
    const totalDefensiveActions = tackleTry + blockTry;
    const pressureRate = opponentPossession > 0 ? totalDefensiveActions / opponentPossession : 0;
    
    // 모든 값이 유효한 숫자인지 확인
    const validTackleSuccessRate = isNaN(tackleSuccessRate) ? 0 : tackleSuccessRate;
    const validBlockSuccessRate = isNaN(blockSuccessRate) ? 0 : blockSuccessRate;
    const validPressureRate = isNaN(pressureRate) ? 0 : pressureRate;
    
    // 수비 강도 계산 (태클 성공률 + 블록 성공률 + 압박 빈도)
    const combinedSuccessRate = (validTackleSuccessRate + validBlockSuccessRate) / 2;
    const intensity = (combinedSuccessRate * 0.7 + validPressureRate * 0.3) * 100;
    const finalScore = isNaN(intensity) ? 50 : intensity;
    
    return {
        score: Math.round(Math.min(Math.max(finalScore, 0), 100)), // 0-100 범위로 제한
        style: finalScore > 70 ? 'aggressive' : finalScore > 40 ? 'active' : 'passive',
        description: finalScore > 70 ? '강력한 압박' : finalScore > 40 ? '적극적 수비' : '안정적 수비'
    };
}

// 골 다양성 계산
function calculateGoalVariety(userStats) {
    const totalGoals = userStats.shoot?.goalTotal || 0;
    if (totalGoals === 0) return { score: 0, variety: 'none', description: '무득점' };
    
    // 안전한 값 추출
    const insideBox = userStats.shoot.goalInPenalty || 0;
    const outsideBox = userStats.shoot.goalOutPenalty || 0;
    const freeKick = userStats.shoot.goalFreeKick || 0;
    const penalty = userStats.shoot.goalPenaltyKick || 0;
    
    const varietyTypes = [insideBox > 0, outsideBox > 0, freeKick > 0, penalty > 0].filter(Boolean).length;
    const varietyScore = varietyTypes > 0 ? (varietyTypes / 4) * 100 : 0;
    const finalScore = isNaN(varietyScore) ? 0 : varietyScore;
    
    return {
        score: Math.round(Math.min(Math.max(finalScore, 0), 100)), // 0-100 범위로 제한
        variety: varietyTypes >= 3 ? 'versatile' : varietyTypes >= 2 ? 'varied' : 'specialized',
        description: varietyTypes >= 3 ? '만능 득점왕' : varietyTypes >= 2 ? '다채로운 공격' : '특화된 마무리'
    };
}

// 종합 경기 성향 분석
function analyzeMatchCharacteristics(userStats, opponentStats, formation) {
    const attack = calculateAttackEfficiency(userStats);
    const buildup = calculateBuildupStyle(userStats);
    const possession = calculatePossessionUtilization(userStats, opponentStats);
    const defense = calculateDefensiveIntensity(userStats, opponentStats);
    const goalVariety = calculateGoalVariety(userStats);
    
    // 주요 특성 결정 - 점수 기반 우선순위 선택
    const characteristicCandidates = [];
    
    // 각 특성별 점수 계산
    if (attack.level === 'excellent' && attack.score >= 80) {
        characteristicCandidates.push({ name: '🎯 정밀 스나이퍼', score: attack.score });
    }
    if (buildup.style === 'possession' && buildup.score >= 75) {
        characteristicCandidates.push({ name: '🎨 티키타카 마에스트로', score: buildup.score });
    }
    if (possession.efficiency === 'counter' && possession.score >= 70 && attack.score >= 60) {
        characteristicCandidates.push({ name: '⚡ 번개 카운터', score: (possession.score + attack.score) / 2 });
    }
    if (defense.style === 'aggressive' && defense.score >= 80) {
        characteristicCandidates.push({ name: '🛡️ 철벽 수비', score: defense.score });
    }
    if (goalVariety.variety === 'versatile' && attack.score >= 70) {
        characteristicCandidates.push({ name: '🌟 만능 득점머신', score: attack.score + 10 });
    }
    if (buildup.score >= 60 && possession.score >= 60) {
        characteristicCandidates.push({ name: '🎭 창조적 플레이메이커', score: (buildup.score + possession.score) / 2 });
    }
    if (defense.score >= 60 && buildup.score >= 50) {
        characteristicCandidates.push({ name: '🛡️ 안정적 수비', score: (defense.score + buildup.score) / 2 });
    }
    
    // 가장 높은 점수의 특성만 선택 (최대 2개)
    const characteristics = characteristicCandidates
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map(char => char.name);
    
    // 기본 특성이 없으면 포메이션 기반으로 추가
    if (characteristics.length === 0) {
        const formationChar = getFormationBasedCharacteristic(formation);
        if (formationChar) characteristics.push(formationChar);
    }
    
    // 최소 1개는 보장
    if (characteristics.length === 0) {
        characteristics.push('⚖️ 균형 잡힌 플레이');
    }
    
    return {
        primaryCharacteristics: characteristics.slice(0, 2),
        scores: { attack, buildup, possession, defense, goalVariety },
        overallStyle: determineOverallStyle(attack, buildup, possession, defense),
        tacticalRecommendation: generateTacticalAdvice(attack, buildup, possession, defense)
    };
}

// 포메이션 기반 특성
function getFormationBasedCharacteristic(formation) {
    const formationMap = {
        '4-4-2': '🏛️ 클래식 전술',
        '4-3-3': '🔥 현대적 공격',
        '3-5-2': '🎪 윙백 활용',
        '4-5-1': '🛡️ 미드필드 장악',
        '5-3-2': '🏰 수비 중시',
        '4-2-2-1-1': '⚡ 균형 잡힌 플레이'
    };
    return formationMap[formation] || '⚖️ 균형 잡힌 플레이';
}

// 전체적인 스타일 결정
function determineOverallStyle(attack, buildup, possession, defense) {
    if (attack.level === 'excellent' && buildup.style === 'possession') {
        return '점유율을 바탕으로 한 체계적인 공격으로 높은 효율성을 보여준 경기';
    } else if (possession.efficiency === 'counter' && defense.style === 'aggressive') {
        return '탄탄한 수비를 바탕으로 한 효과적인 역습 플레이';
    } else if (buildup.style === 'possession' && possession.efficiency === 'controller') {
        return '볼 소유를 통한 경기 주도권 확보로 안정적인 경기 운영';
    } else if (attack.score > 70 && possession.efficiency !== 'controller') {
        return '기회를 놓치지 않는 예리한 마무리가 돋보인 경기';
    } else {
        return '공수 밸런스가 뛰어난 완성도 높은 경기 운영';
    }
}

// 전술적 조언 생성
function generateTacticalAdvice(attack, buildup, possession, defense) {
    if (attack.score < 50 && buildup.score > 70) {
        return '좋은 빌드업에 비해 마무리가 아쉬우니 골 결정력 향상이 필요합니다.';
    } else if (defense.score < 50 && possession.score > 70) {
        return '공격에 집중하되 수비 안정성을 높이면 더 좋은 결과를 얻을 수 있습니다.';
    } else if (attack.score > 70 && defense.score > 70) {
        return '공수 밸런스가 훌륭합니다. 이 플레이 스타일을 유지해보세요.';
    } else {
        return '각 영역별로 조금씩 개선하면 더 완성도 높은 경기를 만들 수 있습니다.';
    }
}

// 성능 지표 기반 경기 특징 멘트 생성
function generatePerformanceBasedDescription(scores) {
    const { attack, buildup, possession, defense } = scores;
    
    // 평균 점수 계산
    const avgScore = (attack.score + buildup.score + possession.score + defense.score) / 4;
    
    // 최고/최저 점수 찾기
    const allScores = [
        { name: '공격력', score: attack.score },
        { name: '빌드업', score: buildup.score },
        { name: '점유율 활용', score: possession.score },
        { name: '수비 강도', score: defense.score }
    ];
    
    const maxScore = Math.max(...allScores.map(s => s.score));
    const minScore = Math.min(...allScores.map(s => s.score));
    const strongest = allScores.find(s => s.score === maxScore);
    const weakest = allScores.find(s => s.score === minScore);
    
    // 전체적인 성능 수준 판단
    let performanceLevel = '';
    let description = '';
    
    if (avgScore >= 80) {
        performanceLevel = '완벽한';
        description = '모든 영역에서 뛰어난 완성도를 보여주는 경기입니다.';
    } else if (avgScore >= 65) {
        performanceLevel = '우수한';
        description = '대부분의 영역에서 안정적인 경기 운영을 보여줍니다.';
    } else if (avgScore >= 50) {
        performanceLevel = '균형 잡힌';
        description = '공수 밸런스가 잘 맞춰진 경기입니다.';
    } else if (avgScore >= 35) {
        performanceLevel = '발전 가능한';
        description = '몇 가지 영역에서 개선이 필요한 경기입니다.';
    } else {
        performanceLevel = '보완이 필요한';
        description = '전반적인 경기 운영에서 개선이 요구됩니다.';
    }
    
    // 강점과 약점 기반 추가 설명
    let additionalNote = '';
    
    if (maxScore - minScore <= 15) {
        additionalNote = '모든 영역이 고르게 발달된 균형잡힌 플레이를 선보였습니다.';
    } else if (strongest.score >= 70 && weakest.score <= 40) {
        additionalNote = `${strongest.name}이 뛰어나지만 ${weakest.name}에서 보완이 필요합니다.`;
    } else if (strongest.score >= 60) {
        additionalNote = `${strongest.name}이 이 경기의 핵심 강점이었습니다.`;
    } else if (weakest.score <= 30) {
        additionalNote = `${weakest.name} 개선을 통해 더 나은 경기를 만들 수 있습니다.`;
    }
    
    return `${performanceLevel} 경기 운영으로 ${description} ${additionalNote}`;
}

// 지표별 설명 데이터
function getMetricsInfo() {
    return {
        attack: {
            title: '공격력',
            description: '슛 정확도와 골 결정력을 종합한 공격 효율성입니다.',
            calculation: '슛 정확도 40% + 유효슛 비율 40% + 박스 내 골 비율 20%',
            example: '슛 10회 중 3골, 유효슛 7회 → 높은 공격력'
        },
        buildup: {
            title: '빌드업',
            description: '패스 성공률과 점유율을 활용한 공격 전개 능력입니다.',
            calculation: '패스 성공률 40점 + 점유율 40점 + 패스 활동도 20점',
            example: '패스 92회 중 83회 성공, 점유율 46% → 중간 빌드업'
        },
        possession: {
            title: '점유율 활용',
            description: '점유율을 얼마나 효과적으로 공격으로 연결했는지 측정합니다.',
            calculation: '점유율 가치 40점 + 슛 효율성 35점 + 공격 빈도 25점',
            example: '점유율 46%, 슛 3회 중 2골 → 보통 점유율 활용'
        },
        defense: {
            title: '수비 강도',
            description: '태클과 블록 성공률, 그리고 압박 빈도를 종합한 수비 능력입니다.',
            calculation: '수비 성공률 70% + 압박 빈도 30%',
            example: '태클 11회 중 9회 성공, 블록 3회 → 높은 수비 강도'
        }
    };
}

// 경기 성향 가이드 데이터
function getTacticsGuide() {
    return {
        precision_striker: {
            name: '정밀 스나이퍼',
            description: '정확한 슈팅과 결정력으로 골을 노리는 공격 중심 스타일',
            features: '높은 슈팅 정확도, 박스 내 결정력, 골 결정력, 효율적인 공격'
        },
        tiki_taka: {
            name: '티키타카 마에스트로',
            description: '짧은 패스와 점유율을 통한 공격 전개 스타일',
            features: '높은 패스 성공률, 점유율 활용, 공격 전개, 상대 압박'
        },
        lightning_counter: {
            name: '번개 카운터',
            description: '빠른 전환과 역습을 통한 공격 스타일',
            features: '빠른 전환, 역습 공격, 상대 실수 활용, 효율적인 득점'
        },
        iron_defense: {
            name: '철벽 수비',
            description: '강력한 수비력으로 상대 공격을 차단하는 스타일',
            features: '강력한 수비, 태클 성공률, 압박 강도, 상대 공격 차단'
        },
        scoring_machine: {
            name: '만능 득점 머신',
            description: '다양한 방법으로 골을 넣는 공격적 스타일',
            features: '다양한 득점 방법, 높은 공격 빈도, 골 결정력, 공격 창의성'
        },
        possession_control: {
            name: '점유율 제어',
            description: '공을 오래 가지고 경기를 통제하는 스타일',
            features: '높은 점유율, 안정적인 패스, 경기 통제, 상대 압박'
        },
        high_pressure: {
            name: '고압 압박',
            description: '상대를 강하게 압박하여 실수를 유도하는 스타일',
            features: '높은 압박 강도, 상대 실수 유도, 빠른 볼 회수, 공격 기회 확대'
        },
        wing_play: {
            name: '윙 플레이',
            description: '측면을 활용한 공격 전개 스타일',
            features: '윙백 활용, 크로스 공격, 측면 돌파, 공격 폭 확대'
        },
        long_ball: {
            name: '롱볼 전술',
            description: '긴 패스와 공중볼을 활용한 직접적인 공격 스타일',
            features: '긴 패스, 공중볼 활용, 직접적인 공격, 빠른 전환'
        },
        possession_attack: {
            name: '점유율 공격',
            description: '점유율을 공격으로 연결하는 스타일',
            features: '점유율 활용, 공격 전개, 슈팅 효율성, 공격 빈도'
        },
        defensive_counter: {
            name: '수비 카운터',
            description: '수비를 바탕으로 한 역습 공격 스타일',
            features: '안정적인 수비, 역습 기회, 효율적인 공격, 경기 통제'
        },
        all_out_attack: {
            name: '올아웃 어택',
            description: '모든 선수를 공격에 투입하는 공격적 스타일',
            features: '높은 공격 빈도, 많은 슈팅, 상대 수비 압박, 골 기회 확대'
        },
        balanced_play: {
            name: '균형 잡힌 플레이',
            description: '공격과 수비의 균형을 맞춘 안정적인 스타일',
            features: '안정적인 경기 운영, 상황 적응력, 균형잡힌 전술, 다양한 플레이'
        },
        classic_tactics: {
            name: '클래식 전술',
            description: '전통적인 4-4-2 포메이션을 활용한 균형잡힌 전술',
            features: '안정적인 수비라인, 중원 장악, 양쪽 윙 활용, 투톱 공격'
        },
        modern_attack: {
            name: '현대적 공격',
            description: '4-3-3 포메이션 기반의 공격적이고 현대적인 전술',
            features: '높은 라인, 압박 축구, 윙어 활용, 다양한 공격 루트'
        },
        wingback_utilization: {
            name: '윙백 활용',
            description: '3-5-2 포메이션으로 윙백의 오버래핑을 극대화하는 전술',
            features: '윙백 오버래핑, 중앙 수비 안정성, 미드필드 수적 우위, 크로스 공격'
        },
        midfield_dominance: {
            name: '미드필드 장악',
            description: '4-5-1 포메이션으로 중원을 장악하는 수비적 전술',
            features: '중원 수적 우위, 볼 소유권 확보, 안정적인 수비, 카운터 어택'
        },
        defensive_focus: {
            name: '수비 중시',
            description: '5-3-2 포메이션으로 수비 안정성을 최우선으로 하는 전술',
            features: '견고한 수비라인, 수비 안정성, 세트피스 대응, 역습 기회'
        },
    };
}

// 지표 설명 팝업 표시
function showMetricsPopup() {
    const metrics = getMetricsInfo();
    const tacticsGuide = getTacticsGuide();
    
    const popupHTML = `
        <div class="metrics-popup-overlay" onclick="hideMetricsPopup()">
            <div class="metrics-popup" onclick="event.stopPropagation()">
                <div class="popup-header">
                    <h3>경기 정보 가이드</h3>
                    <button class="popup-close" onclick="hideMetricsPopup()">×</button>
                </div>
                <div class="popup-content">
                    <!-- 경기 성향 가이드 -->
                    <div class="guide-section">
                        <h4 class="guide-title">🎯 경기 성향 가이드</h4>
                        <div class="tactics-guide">
                            ${Object.values(tacticsGuide).map(tactic => `
                                <div class="tactic-item">
                                    <div class="tactic-name">${tactic.name}</div>
                                    <div class="tactic-desc">${tactic.description}</div>
                                    <div class="tactic-features">
                                        <strong>특징:</strong> ${tactic.features}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- 경기 지표 설명 -->
                    <div class="guide-section">
                        <h4 class="guide-title">📊 경기 지표 설명</h4>
                        ${Object.values(metrics).map(metric => `
                            <div class="metric-explanation">
                                <h5>${metric.title}</h5>
                                <p class="metric-desc">${metric.description}</p>
                                <div class="calculation-box">
                                    <strong>계산 방식:</strong> ${metric.calculation}
                                </div>
                                <div class="example-box">
                                    <strong>예시:</strong> ${metric.example}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    
    // 배경 스크롤 방지
    lockScroll();
    
    // 애니메이션을 위한 클래스 추가
    setTimeout(() => {
        const popup = document.querySelector('.metrics-popup-overlay');
        if (popup) popup.classList.add('show');
    }, 10);
}

// 지표 설명 팝업 숨기기
function hideMetricsPopup() {
    const overlay = document.querySelector('.metrics-popup-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        unlockScroll();
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

// 경기 성향 시각화 HTML 생성

// 전술 정보 생성 (실제 선수 데이터 기반)
function generateTacticsInfo(userPlayers, userStats = {}, opponentStats = {}) {
    // 실제 포메이션 계산
    const formation = calculateFormationFromPlayers(userPlayers);
    
    // 새로운 경기 성향 분석 (공식 데이터가 있는 경우)
    let characteristics = null;
    let style = '균형';
    let message = '균형잡힌 전술로 경기를 주도했다!';
    
    if (userStats && Object.keys(userStats).length > 0) {
        // 공식 데이터 기반 분석
        characteristics = analyzeMatchCharacteristics(userStats, opponentStats, formation);
        style = characteristics.primaryCharacteristics[0] || '⚖️ 균형 잡힌 플레이';
        message = characteristics.overallStyle;
    } else {
        // 기존 포메이션 기반 분석 (fallback)
        const startingPlayers = (userPlayers || []).filter(player => {
            const positionGroup = getPositionGroup(player.spPosition);
            return positionGroup !== 'OTHER' && positionGroup !== 'SUB';
        });
        
        const fieldPlayers = startingPlayers.filter(player => getPositionGroup(player.spPosition) !== 'GK');
        const attackingPlayers = fieldPlayers.filter(player => {
            const group = getPositionGroup(player.spPosition);
            return group === 'AM' || group === 'FW';
        });
        
        if (fieldPlayers.length > 0) {
            const attackingRatio = attackingPlayers.length / fieldPlayers.length;
            if (attackingRatio > 0.6) {
                style = '공격적';
            } else if (attackingRatio < 0.4) {
                style = '수비적';
            }
        }
        
        const messages = {
            '공격적': [
                "공격적인 포메이션으로 상대를 압도했다!",
                "이 공격 포메이션으로 경기를 주도했다!",
                "공격적인 스타일로 완벽한 경기를 했다!"
            ],
            '수비적': [
                "수비적인 포메이션으로 안정적인 경기를 했다!",
                "이 수비 포메이션으로 상대를 막아냈다!",
                "수비적인 스타일로 경기를 통제했다!"
            ],
            '균형': [
                "균형잡힌 포메이션으로 완벽한 경기를 했다!",
                "이 포메이션으로 상대를 압도했다!",
                "균형잡힌 전술로 경기를 주도했다!"
            ]
        };
        
        const messageList = messages[style];
        message = messageList[Math.floor(Math.random() * messageList.length)];
    }
    
    return { formation, style, message, characteristics };
}

// 포지션 이름 반환
function getPositionName(position) {
    const positions = {
        0: 'GK',   // 골키퍼
        1: 'SW',   // 스위퍼
        2: 'RWB',   // 센터백
        3: 'RB',   // 레프트백
        4: 'RCB',   // 라이트백
        5: 'CB',  // 레프트 윙백
        6: 'LCB',  // 라이트 윙백
        7: 'LB',  // 수비형 미드필더
        8: 'LWB',   // 센터 미드필더
        9: 'RDM',  // 공격형 미드필더
        10: 'CDM',  // 레프트 미드필더
        11: 'LDM',  // 라이트 미드필더
        12: 'RM',  // 레프트 윙
        13: 'RCM',  // 라이트 윙
        14: 'CM',  // 센터 포워드
        15: 'LCM',  // 스트라이커
        16: 'LM',  // 레프트 포워드
        17: 'RAM',  // 라이트 포워드
        18: 'CAM',  // 레프트 스트라이커
        19: 'LAM',  // 라이트 스트라이커
        20: 'RF', // 교체 선수
        21: 'CF', // 레프트 공격형 미드필더
        22: 'LF', // 라이트 공격형 미드필더
        23: 'RW',  // 포워드
        24: 'RS',  // 포워드
        25: 'ST',  // 포워드
        26: 'LS',  // 포워드
        27: 'LW',  // 포워드
        28: 'SUB'  // 교체 선수
    };
    return positions[position] || `POS${position}`;
}

// 선수 포지션을 그룹으로 분류하는 함수
function getPositionGroup(position) {
    const positionName = getPositionName(position);
    
    // 수비수 (Defender) - 4-2-2-1-1에서 LB, LCB, RCB, RB
    if (['CB', 'LB', 'RB', 'LCB', 'RCB', 'LWB', 'RWB', 'SW'].includes(positionName)) {
        return 'DF';
    }
    // 수비형 미드필더 (Defensive Midfielder) - 4-2-2-1-1에서 LDM, RDM
    else if (['CDM', 'LDM', 'RDM'].includes(positionName)) {
        return 'DM';
    }
    // 공격형 미드필더 (Attacking Midfielder) - 4-2-2-1-1에서 LM, RM, CAM
    else if (['CM', 'LCM', 'RCM', 'LM', 'RM', 'CAM', 'LAM', 'RAM'].includes(positionName)) {
        return 'AM';
    }
    // 공격수 (Forward) - 4-2-2-1-1에서 ST
    else if (['ST', 'CF', 'LF', 'RF', 'LS', 'RS', 'LW', 'RW'].includes(positionName)) {
        return 'FW';
    }
    // 골키퍼
    else if (positionName === 'GK') {
        return 'GK';
    }
    // 서브 (교체 선수)
    else if (positionName === 'SUB') {
        return 'SUB';
    }
    // 기타 (교체 선수 등)
    else {
        return 'OTHER';
    }
}

// 선수 정렬 함수: 포지션별 -> 평점순, 서브 선수 중 평점 0점 제외
function sortPlayersByPositionAndRating(players) {
    // 1. 서브 선수 중 평점 0점인 선수 제외
    const filteredPlayers = players.filter(player => {
        const isSub = getPositionGroup(player.spPosition) === 'SUB';
        const rating = player.status?.spRating || 0;
        
        // 서브 선수이면서 평점이 0점인 경우 제외
        if (isSub && rating === 0) {
            return false;
        }
        return true;
    });
    
    // 2. 포지션 그룹별 우선순위 정의
    const positionPriority = {
        'FW': 1,    // 공격수
        'AM': 2,    // 공격형 미드필더
        'DM': 3,    // 수비형 미드필더
        'DF': 4,    // 수비수
        'GK': 5,    // 골키퍼
        'SUB': 6,   // 서브
        'OTHER': 7  // 기타
    };
    
    // 3. 정렬: 포지션 그룹별 -> 평점 높은 순
    return filteredPlayers.sort((a, b) => {
        const aGroup = getPositionGroup(a.spPosition);
        const bGroup = getPositionGroup(b.spPosition);
        const aRating = a.status?.spRating || 0;
        const bRating = b.status?.spRating || 0;
        
        // 포지션 그룹 우선순위로 먼저 정렬
        if (positionPriority[aGroup] !== positionPriority[bGroup]) {
            return positionPriority[aGroup] - positionPriority[bGroup];
        }
        
        // 같은 포지션 그룹 내에서는 평점 높은 순으로 정렬
        return bRating - aRating;
    });
}

// 선수 목록 HTML 생성
function createPlayersHTML(players, team) {
    if (!players || players.length === 0) {
        return '<p class="no-players">선수 정보 없음</p>';
    }
    
    // 선수 정렬: 포지션별 -> 평점순, 서브 선수 중 평점 0점 제외
    const sorted = sortPlayersByPositionAndRating(players);

    return sorted.map(player => {
        const position = player.spPositionDesc || getPositionName(player.spPosition);
        const seasonBadge = renderSeasonBadge(player.season);
        const rating = player.status.spRating || 0;
        const goals = player.status.goal || 0;
        const assists = player.status.assist || 0;
        const ratingClass = rating >= 7 ? 'high' : rating >= 6 ? 'medium' : 'low';
        
        return `
            <div class="player-card ${team}">
                <div class="player-header">
                    <span class="player-name">${player.spName}</span>
                    <span class="player-position">${position}</span>
                    ${seasonBadge}
                </div>
                <div class="player-stats">
                    <div class="stat-item">
                        <span class="stat-label">평점</span>
                        <span class="stat-value rating ${ratingClass}">${rating.toFixed(1)}</span>
                    </div>
                    ${goals > 0 ? `<div class="stat-item"><span class="stat-label">골</span><span class="stat-value goal">${goals}</span></div>` : ''}
                    ${assists > 0 ? `<div class="stat-item"><span class="stat-label">도움</span><span class="stat-value assist">${assists}</span></div>` : ''}
                    <div class="stat-item">
                        <span class="stat-label">슈팅</span>
                        <span class="stat-value">${player.status.shoot || 0}</span>
                    </div>
                </div>
                ${(player.status.yellowCard || player.status.redCard) ? `
                    <div class="player-cards">
                        ${player.status.yellowCard ? '<span class="yellow-card">⚠️</span>' : ''}
                        ${player.status.redCard ? '<span class="red-card">🟥</span>' : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// 시즌 뱃지 렌더링
function renderSeasonBadge(season) {
    if (!season) return '';
    const label = season.className || `Season ${season.seasonId || ''}`;
    const img = season.seasonImg ? `<img src="${season.seasonImg}" alt="${label}" class="season-img" onerror="this.style.display='none'"/>` : '';
    return `<span class="season-badge" title="${label}">${img}${label}</span>`;
}

// 포지션별 분석 HTML 생성
function createPositionAnalysisHTML(players) {
    const positionStats = {
        'FW': { count: 0, totalRating: 0, goals: 0, assists: 0 },
        'AM': { count: 0, totalRating: 0, goals: 0, assists: 0 },
        'DM': { count: 0, totalRating: 0, goals: 0, assists: 0 },
        'DF': { count: 0, totalRating: 0, goals: 0, assists: 0 },
        'GK': { count: 0, totalRating: 0, goals: 0, assists: 0 },
        'SUB': { count: 0, totalRating: 0, goals: 0, assists: 0 }
    };
    
    // 정렬된 선수 목록 사용 (서브 선수 중 평점 0점 제외된 목록)
    const sortedPlayers = sortPlayersByPositionAndRating(players);
    
    sortedPlayers.forEach(player => {
        const group = getPositionGroup(player.spPosition);
        
        if (positionStats[group]) {
            positionStats[group].count++;
            positionStats[group].totalRating += player.status?.spRating || 0;
            positionStats[group].goals += player.status?.goal || 0;
            positionStats[group].assists += player.status?.assist || 0;
        }
    });
    
    // 포지션 그룹 순서대로 표시 (FW -> AM -> DM -> DF -> GK -> SUB)
    const positionOrder = ['FW', 'AM', 'DM', 'DF', 'GK', 'SUB'];
    
    return positionOrder.map(position => {
        const stats = positionStats[position];
        if (stats.count === 0) return '';
        
        const avgRating = (stats.totalRating / stats.count).toFixed(1);
        const positionName = position === 'FW' ? '공격수' : 
                           position === 'AM' ? '공격형 미드필더' :
                           position === 'DM' ? '수비형 미드필더' :
                           position === 'DF' ? '수비수' :
                           position === 'GK' ? '골키퍼' :
                           position === 'SUB' ? '서브' : position;
        
        return `
            <div class="position-stat">
                <span class="position-name">${positionName}</span>
                <span class="position-count">${stats.count}명</span>
                <span class="position-rating">평점 ${avgRating}</span>
                <span class="position-contribution">${stats.goals}골 ${stats.assists}도움</span>
            </div>
        `;
    }).filter(html => html !== '').join('');
}

// 주요 선수 HTML 생성
function createKeyPlayersHTML(userPlayers, opponentPlayers) {
    const allPlayers = [...(userPlayers || []), ...(opponentPlayers || [])];
    
    // 정렬된 선수 목록 사용 (포지션별, 평점순 정렬)
    const sortedPlayers = sortPlayersByPositionAndRating(allPlayers);
    
    // 평점 기준 상위 3명 (정렬된 목록에서)
    const topPlayers = sortedPlayers
        .filter(player => (player.status?.spRating || 0) > 0)
        .slice(0, 3);
    
    // 골 넣은 선수들 (정렬된 목록에서)
    const goalScorers = sortedPlayers.filter(player => (player.status?.goal || 0) > 0);
    
    return `
        <div class="key-players-grid">
            ${topPlayers.length > 0 ? `
                <div class="top-rated">
                    <h6>최고 평점</h6>
                    ${topPlayers.map(player => `
                        <div class="key-player">
                            <span class="player-name">${player.spName}</span>
                            <span class="player-rating">${(player.status.spRating || 0).toFixed(1)}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${goalScorers.length > 0 ? `
                <div class="goal-scorers">
                    <h6>득점자</h6>
                    ${goalScorers.map(player => `
                        <div class="key-player">
                            <span class="player-name">${player.spName}</span>
                            <span class="player-goals">${player.status.goal}골</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// 경기 특징 분석 함수
function analyzePlayerCharacteristics(userInfo) {
    if (!userInfo || !userInfo.matches || userInfo.matches.length === 0) {
        return {
            playStyle: '데이터 부족',
            mainStrength: '분석 불가',
            gameTendency: '정보 없음'
        };
    }
    
    const matches = userInfo.matches;
    const totalMatches = matches.length;
    
    // 기본 통계 계산
    let totalGoals = 0;
    let totalAssists = 0;
    let totalWins = 0;
    let totalDraws = 0;
    let totalLosses = 0;
    let totalGoalsConceded = 0;
    
    matches.forEach(match => {
        // 실제 API 응답 구조에 맞게 수정
        if (match.userGoals !== undefined) {
            totalGoals += match.userGoals;
        }
        
        if (match.opponentGoals !== undefined) {
            totalGoalsConceded += match.opponentGoals;
        }
        
        // 경기 결과 수집 (1: 승, 2: 패, 0: 무)
        if (match.matchResult === 1) totalWins++;
        else if (match.matchResult === 0) totalDraws++;
        else if (match.matchResult === 2) totalLosses++;
        
        // 어시스트는 선수별 데이터에서 수집
        if (match.userPlayers && Array.isArray(match.userPlayers)) {
            match.userPlayers.forEach(player => {
                if (player.status && player.status.assist !== undefined) {
                    totalAssists += player.status.assist;
                }
            });
        }
    });
    
    const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
    const avgGoals = totalMatches > 0 ? totalGoals / totalMatches : 0;
    const avgAssists = totalMatches > 0 ? totalAssists / totalMatches : 0;
    const avgGoalsConceded = totalMatches > 0 ? totalGoalsConceded / totalMatches : 0;
    
    // 디버깅을 위한 로그 출력
    
    // 데이터가 부족한 경우 기본값 반환 (10경기 기준)
    if (totalMatches < 10) {
        return {
            playStyle: `분석중 (${totalMatches}/10경기)`,
            mainStrength: `분석중 (${totalMatches}/10경기)`,
            gameTendency: `분석중 (${totalMatches}/10경기)`
        };
    }
    
    // 플레이 스타일 분석 (10경기 기준) - 우선순위 기반 선택
    const styleCandidates = [];
    
    // 각 스타일별 점수 계산
    if (avgGoals > 2.0 && winRate > 60) {
        styleCandidates.push({ name: '공격적', score: (avgGoals * 20) + (winRate * 0.3) });
    }
    if (avgGoals < 0.5 && avgGoalsConceded < 1.0) {
        styleCandidates.push({ name: '수비적', score: ((1.0 - avgGoalsConceded) * 50) + (winRate * 0.3) });
    }
    if (avgAssists > 1.5 && avgGoals > 0.8) {
        styleCandidates.push({ name: '창조적', score: (avgAssists * 25) + (avgGoals * 15) });
    }
    if (winRate > 75 && avgGoalsConceded < 1.2) {
        styleCandidates.push({ name: '전술적', score: (winRate * 0.4) + ((1.2 - avgGoalsConceded) * 30) });
    }
    if (avgGoals > 1.2 && avgAssists > 0.8) {
        styleCandidates.push({ name: '올라운드', score: (avgGoals * 15) + (avgAssists * 20) + (winRate * 0.2) });
    }
    
    // 가장 높은 점수의 스타일 선택
    const playStyle = styleCandidates.length > 0 
        ? styleCandidates.reduce((max, current) => current.score > max.score ? current : max).name
        : '균형형';
    
    // 주요 강점 분석 (10경기 기준) - 우선순위 기반 선택
    const strengthCandidates = [];
    
    // 각 강점별 점수 계산
    if (avgGoals > 1.8 && winRate > 60) {
        strengthCandidates.push({ name: '득점력', score: (avgGoals * 30) + (winRate * 0.4) });
    }
    if (avgAssists > 1.2 && avgGoals > 0.6) {
        strengthCandidates.push({ name: '플레이메이킹', score: (avgAssists * 35) + (avgGoals * 20) });
    }
    if (winRate > 70 && avgGoalsConceded < 1.0) {
        strengthCandidates.push({ name: '승부사', score: (winRate * 0.5) + ((1.0 - avgGoalsConceded) * 40) });
    }
    if (avgGoalsConceded < 0.8 && winRate > 60) {
        strengthCandidates.push({ name: '수비력', score: ((0.8 - avgGoalsConceded) * 60) + (winRate * 0.3) });
    }
    if (avgGoals > 1.0 && avgAssists > 0.6 && winRate > 55) {
        strengthCandidates.push({ name: '올라운드', score: (avgGoals * 20) + (avgAssists * 25) + (winRate * 0.3) });
    }
    if (avgGoals > 1.5) {
        strengthCandidates.push({ name: '공격력', score: avgGoals * 25 });
    }
    if (avgAssists > 1.0) {
        strengthCandidates.push({ name: '창조력', score: avgAssists * 30 });
    }
    
    // 가장 높은 점수의 강점 선택
    const mainStrength = strengthCandidates.length > 0 
        ? strengthCandidates.reduce((max, current) => current.score > max.score ? current : max).name
        : '안정성';
    
    // 경기 성향 분석 (10경기 기준) - 우선순위 기반 선택
    const tendencyCandidates = [];
    
    // 각 성향별 점수 계산 (더 높은 점수 = 더 특징적)
    if (avgGoals >= 2.2 && winRate >= 70) {
        tendencyCandidates.push({ name: '정밀 스나이퍼', score: (avgGoals * 40) + (winRate * 0.6) });
    }
    if (avgAssists >= 1.5 && winRate >= 70) {
        tendencyCandidates.push({ name: '티키타카 마에스트로', score: (avgAssists * 45) + (winRate * 0.6) });
    }
    if (avgGoals >= 1.8 && avgAssists >= 1.2 && winRate >= 75) {
        tendencyCandidates.push({ name: '번개 카운터', score: (avgGoals * 30) + (avgAssists * 35) + (winRate * 0.8) });
    }
    if (avgGoalsConceded <= 0.7 && winRate >= 70) {
        tendencyCandidates.push({ name: '철벽 수비', score: ((0.7 - avgGoalsConceded) * 80) + (winRate * 0.6) });
    }
    if (avgGoals >= 1.8 && avgAssists >= 1.3 && winRate >= 70) {
        tendencyCandidates.push({ name: '만능 득점머신', score: (avgGoals * 35) + (avgAssists * 40) + (winRate * 0.6) });
    }
    if (avgAssists >= 1.3 && winRate >= 75) {
        tendencyCandidates.push({ name: '점유율 제어', score: (avgAssists * 50) + (winRate * 0.8) });
    }
    if (avgGoalsConceded <= 0.9 && winRate >= 70) {
        tendencyCandidates.push({ name: '고압 압박', score: ((0.9 - avgGoalsConceded) * 70) + (winRate * 0.6) });
    }
    if (avgAssists >= 1.1 && winRate >= 65) {
        tendencyCandidates.push({ name: '윙 플레이', score: (avgAssists * 40) + (winRate * 0.5) });
    }
    if (avgGoals >= 1.6 && winRate >= 65) {
        tendencyCandidates.push({ name: '롱볼 전술', score: (avgGoals * 35) + (winRate * 0.5) });
    }
    if (avgGoalsConceded <= 1.0 && avgGoals >= 1.3 && winRate >= 65) {
        tendencyCandidates.push({ name: '수비 카운터', score: ((1.0 - avgGoalsConceded) * 50) + (avgGoals * 25) + (winRate * 0.5) });
    }
    if (avgGoals >= 2.0 && winRate >= 60) {
        tendencyCandidates.push({ name: '올아웃 어택', score: (avgGoals * 45) + (winRate * 0.4) });
    }
    if (avgAssists >= 1.0 && avgGoals >= 1.0 && winRate >= 60) {
        tendencyCandidates.push({ name: '창조적 플레이메이커', score: (avgAssists * 35) + (avgGoals * 30) + (winRate * 0.4) });
    }
    if (avgGoalsConceded <= 1.1 && winRate >= 60) {
        tendencyCandidates.push({ name: '안정적 수비', score: ((1.1 - avgGoalsConceded) * 60) + (winRate * 0.4) });
    }
    
    // 가장 높은 점수의 성향 선택
    const gameTendency = tendencyCandidates.length > 0 
        ? tendencyCandidates.reduce((max, current) => current.score > max.score ? current : max).name
        : '균형 잡힌 플레이';
    
    // 디버깅을 위한 로그 출력
    
    const result = {
        playStyle,
        mainStrength,
        gameTendency
    };
    
    // 분석 결과 로그 출력
    
    return result;
}

// 경기 특징 표시 함수
function displayPlayerCharacteristics(userInfo) {
    const characteristics = analyzePlayerCharacteristics(userInfo);
    
    // 플레이 스타일
    playStyle.textContent = characteristics.playStyle;
    playStyle.className = 'characteristic-value';
    if (characteristics.playStyle === '공격적') {
        playStyle.classList.add('offensive');
    } else if (characteristics.playStyle === '수비적') {
        playStyle.classList.add('defensive');
    } else if (characteristics.playStyle === '창조적') {
        playStyle.classList.add('creative');
    } else if (characteristics.playStyle === '전술적') {
        playStyle.classList.add('tactical');
    } else if (characteristics.playStyle.includes('분석중')) {
        playStyle.classList.add('analyzing');
    } else {
        playStyle.classList.add('balanced');
    }
    
    // 주요 강점
    mainStrength.textContent = characteristics.mainStrength;
    mainStrength.className = 'characteristic-value';
    if (characteristics.mainStrength === '득점력') {
        mainStrength.classList.add('offensive');
    } else if (characteristics.mainStrength === '수비력') {
        mainStrength.classList.add('defensive');
    } else if (characteristics.mainStrength === '플레이메이킹') {
        mainStrength.classList.add('creative');
    } else if (characteristics.mainStrength === '승부사') {
        mainStrength.classList.add('tactical');
    } else if (characteristics.mainStrength.includes('분석중')) {
        mainStrength.classList.add('analyzing');
    } else {
        mainStrength.classList.add('balanced');
    }
    
    // 경기 성향
    gameTendency.textContent = characteristics.gameTendency;
    gameTendency.className = 'characteristic-value';
    if (characteristics.gameTendency === '공격적') {
        gameTendency.classList.add('aggressive');
    } else if (characteristics.gameTendency === '수비적') {
        gameTendency.classList.add('defensive');
    } else if (characteristics.gameTendency === '창조적') {
        gameTendency.classList.add('creative');
    } else if (characteristics.gameTendency === '전술적') {
        gameTendency.classList.add('tactical');
    } else if (characteristics.gameTendency.includes('분석중')) {
        gameTendency.classList.add('analyzing');
    } else {
        gameTendency.classList.add('balanced');
    }
}

// 검색 기록에 추가
function addToSearchHistory(nickname) {
    if (!nickname || nickname.trim() === '') return;
    
    const trimmedNickname = nickname.trim();
    
    // 기존 기록에서 제거 (중복 방지)
    searchHistory = searchHistory.filter(item => item.nickname !== trimmedNickname);
    
    // 새 기록을 맨 앞에 추가
    searchHistory.unshift({
        nickname: trimmedNickname,
        timestamp: new Date().toISOString()
    });
    
    // 최대 10개까지만 저장
    searchHistory = searchHistory.slice(0, 10);
    
    // 로컬스토리지에 저장
    localStorage.setItem('fcData_searchHistory', JSON.stringify(searchHistory));
    
    // 드롭다운 업데이트
    updateDropdown();
}

// 즐겨찾기 토글
function toggleFavorite(nickname) {
    const trimmedNickname = nickname.trim();
    const existingIndex = favorites.findIndex(item => item.nickname === trimmedNickname);
    
    if (existingIndex > -1) {
        // 즐겨찾기에서 제거
        favorites.splice(existingIndex, 1);
    } else {
        // 즐겨찾기에 추가
        favorites.unshift({
            nickname: trimmedNickname,
            timestamp: new Date().toISOString()
        });
    }
    
    // 로컬스토리지에 저장
    localStorage.setItem('fcData_favorites', JSON.stringify(favorites));
    
    // 드롭다운 업데이트
    updateDropdown();
}

// 즐겨찾기인지 확인
function isFavorite(nickname) {
    return favorites.some(item => item.nickname === nickname);
}

// 검색 기록에서 제거
function removeFromHistory(nickname) {
    searchHistory = searchHistory.filter(item => item.nickname !== nickname);
    localStorage.setItem('fcData_searchHistory', JSON.stringify(searchHistory));
    updateDropdown();
}

// 즐겨찾기 모두 삭제
function clearAllFavorites() {
    if (confirm('모든 즐겨찾기를 삭제하시겠습니까?')) {
        favorites = [];
        localStorage.setItem('fcData_favorites', JSON.stringify(favorites));
        updateDropdown();
    }
}

// 검색 기록 모두 삭제
function clearAllHistory() {
    if (confirm('모든 검색 기록을 삭제하시겠습니까?')) {
        searchHistory = [];
        localStorage.setItem('fcData_searchHistory', JSON.stringify(searchHistory));
        updateDropdown();
    }
}

// 드롭다운 업데이트
function updateDropdown() {
    // 즐겨찾기 목록 업데이트
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<div class="empty-message">즐겨찾기가 없습니다</div>';
    } else {
        favoritesList.innerHTML = favorites.map(item => `
            <div class="dropdown-item" data-nickname="${item.nickname}">
                <div class="item-info">
                    <div class="item-name">${item.nickname}</div>
                    <div class="item-time">즐겨찾기</div>
                </div>
                <div class="item-actions">
                    <button class="favorite-btn favorited" onclick="event.stopPropagation(); toggleFavorite('${item.nickname}')" title="즐겨찾기 해제">⭐</button>
                </div>
            </div>
        `).join('');
    }
    
    // 검색 기록 목록 업데이트
    if (searchHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-message">검색 기록이 없습니다</div>';
    } else {
        historyList.innerHTML = searchHistory.map(item => `
            <div class="dropdown-item" data-nickname="${item.nickname}">
                <div class="item-info">
                    <div class="item-name">${item.nickname}</div>
                    <div class="item-time">${formatTime(item.timestamp)}</div>
                </div>
                <div class="item-actions">
                    <button class="favorite-btn ${isFavorite(item.nickname) ? 'favorited' : ''}" onclick="event.stopPropagation(); toggleFavorite('${item.nickname}')" title="${isFavorite(item.nickname) ? '즐겨찾기 해제' : '즐겨찾기 추가'}">⭐</button>
                    <button class="remove-btn" onclick="event.stopPropagation(); removeFromHistory('${item.nickname}')" title="기록 삭제">🗑️</button>
                </div>
            </div>
        `).join('');
    }
}

// 시간 포맷팅
function formatTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    if (diff < 60000) { // 1분 미만
        return '방금 전';
    } else if (diff < 3600000) { // 1시간 미만
        return `${Math.floor(diff / 60000)}분 전`;
    } else if (diff < 86400000) { // 1일 미만
        return `${Math.floor(diff / 3600000)}시간 전`;
    } else {
        return time.toLocaleDateString('ko-KR');
    }
}

// 드롭다운 표시/숨김
function showDropdown() {
    if (favorites.length > 0 || searchHistory.length > 0) {
        searchDropdown.style.display = 'block';
        selectedIndex = -1;
    }
}

function hideDropdown() {
    searchDropdown.style.display = 'none';
    selectedIndex = -1;
}

// 키보드 네비게이션
function handleKeyNavigation(e) {
    if (searchDropdown.style.display === 'none') return;
    
    const items = searchDropdown.querySelectorAll('.dropdown-item');
    
    switch(e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection();
            break;
        case 'ArrowUp':
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateSelection();
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedIndex >= 0 && items[selectedIndex]) {
                const nickname = items[selectedIndex].dataset.nickname;
                nicknameInput.value = nickname;
                hideDropdown();
                searchUser();
            }
            break;
        case 'Escape':
            hideDropdown();
            break;
    }
}

// 선택된 항목 업데이트
function updateSelection() {
    const items = searchDropdown.querySelectorAll('.dropdown-item');
    items.forEach((item, index) => {
        item.classList.toggle('selected', index === selectedIndex);
    });
}

// 첫 화면으로 돌아가는 함수
function resetToHomePage() {
    // 모든 섹션 숨기기
    playerBasicInfo.style.display = 'none';
    tabContainer.style.display = 'none';
    errorSection.style.display = 'none';
    
    // 검색 입력창 초기화
    nicknameInput.value = '';
    nicknameInput.focus();
    
    // 드롭다운 숨기기
    hideDropdown();
    
    // 전역 변수 초기화
    currentUserInfo = null;
    currentMatchOffset = 10;
    
    // 라이벌 매치 데이터 초기화
    if (typeof rivalMatchManager !== 'undefined') {
        const rivalContainer = document.getElementById('rival-container');
        if (rivalContainer) {
            rivalContainer.innerHTML = '';
        }
        rivalMatchManager.rivalMatches = [];
        rivalMatchManager.rivalNickname = null;
        rivalMatchManager.rivalOffset = 10;
    }
    
    // 로딩 상태 해제
    loading.style.display = 'none';
    searchBtn.disabled = false;
    
}

// 페이지 로드 시 초기화
window.addEventListener('load', function() {
    initTheme();
    nicknameInput.focus();
    
    // teamDetailPanel 초기화
    const teamDetailPanel = document.getElementById('teamDetailPanel');
    if (teamDetailPanel) {
        teamDetailPanel.innerHTML = `
            <div class="team-detail-placeholder">
                <div class="placeholder-icon">⚽</div>
                <h4>구단 카드를 선택하세요</h4>
                <p>위에서 구단 카드를 클릭하면 선수 데이터를 볼 수 있습니다.</p>
            </div>
        `;
        // display는 설정하지 않음 (구단별 데이터 탭 클릭 시 표시됨)
    }
    
    // FC Data 로고 클릭 이벤트 추가
    const logo = document.getElementById('logo');
    if (logo) {
        logo.addEventListener('click', resetToHomePage);
    }
    
    // 검색 버튼 클릭 이벤트
    searchBtn.addEventListener('click', function() {
        const nickname = nicknameInput.value.trim();
        if (nickname) {
            searchUser();
            hideDropdown();
        }
    });
    
    // 엔터키 검색 이벤트
    nicknameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const nickname = nicknameInput.value.trim();
            if (nickname) {
                searchUser();
                hideDropdown();
            }
        }
    });
    
    // 입력창 포커스 이벤트
    nicknameInput.addEventListener('focus', function() {
        updateDropdown();
        showDropdown();
    });
    
    // 입력창 입력 이벤트
    nicknameInput.addEventListener('input', function() {
        if (this.value.trim() === '') {
            showDropdown();
        } else {
            hideDropdown();
        }
    });
    
    // 키보드 네비게이션
    nicknameInput.addEventListener('keydown', handleKeyNavigation);
    
    // 드롭다운 외부 클릭 시 숨기기
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-input-container')) {
            hideDropdown();
        }
    });
    
    // 드롭다운 아이템 클릭 이벤트
    searchDropdown.addEventListener('click', function(e) {
        const item = e.target.closest('.dropdown-item');
        if (item) {
            const nickname = item.dataset.nickname;
            nicknameInput.value = nickname;
            hideDropdown();
            searchUser();
        }
    });
    
    // 즐겨찾기/검색기록 모두 삭제 버튼 이벤트
    clearFavoritesBtn.addEventListener('click', clearAllFavorites);
    clearHistoryBtn.addEventListener('click', clearAllHistory);
    
    // 더보기 버튼 이벤트
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreMatches);
    }
    
    // 초기 드롭다운 업데이트
    updateDropdown();
    
    // 포메이션 계산 테스트 실행 (개발용)
    setTimeout(() => {
        testFormationCalculation();
    }, 1000);
    
    // 특징 가이드 팝업 이벤트
    setupCharacteristicsGuide();
    
    // 최고의 선수 가이드 팝업 이벤트
    setupTopPlayersGuide();
});

// 특징 가이드 팝업 설정
function setupCharacteristicsGuide() {
    const popup = document.getElementById('characteristicsGuidePopup');
    const closeBtn = document.getElementById('closeGuideBtn');
    const guideTitle = document.getElementById('guideTitle');
    const guideContent = document.getElementById('guideContent');
    
    // 팝업 닫기
    function closeGuide() {
        popup.classList.remove('show');
        unlockScroll();
        setTimeout(() => {
            popup.style.display = 'none';
        }, 300);
    }
    
    // 팝업 열기
    function openGuide(type) {
        const guideData = getCharacteristicsGuideData(type);
        guideTitle.textContent = guideData.title;
        guideContent.innerHTML = guideData.content;
        popup.style.display = 'flex';
        lockScroll();
        setTimeout(() => {
            popup.classList.add('show');
        }, 10);
    }
    
    // 닫기 버튼 이벤트
    closeBtn.addEventListener('click', closeGuide);
    
    // 오버레이 클릭 시 닫기
    popup.addEventListener('click', function(e) {
        if (e.target === popup) {
            closeGuide();
        }
    });
    
    // ESC 키로 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && popup.classList.contains('show')) {
            closeGuide();
        }
    });
    
    // 특징 박스 클릭 이벤트 추가
    document.addEventListener('click', function(e) {
        const characteristicItem = e.target.closest('.characteristic-item');
        if (characteristicItem) {
            const label = characteristicItem.querySelector('.characteristic-label').textContent;
            if (label === '스타일') {
                openGuide('style');
            } else if (label === '강점') {
                openGuide('strength');
            } else if (label === '성향') {
                openGuide('tendency');
            }
        }
    });
}

// 최고의 선수 가이드 팝업 설정
function setupTopPlayersGuide() {
    const popup = document.getElementById('topPlayersGuidePopup');
    const closeBtn = document.getElementById('closeTopPlayersGuideBtn');
    const guideBtn = document.getElementById('topPlayersGuideBtn');
    
    // 팝업 닫기
    function closeGuide() {
        popup.classList.remove('show');
        unlockScroll();
        setTimeout(() => {
            popup.style.display = 'none';
        }, 300);
    }
    
    // 팝업 열기
    function openGuide() {
        popup.style.display = 'flex';
        lockScroll();
        setTimeout(() => {
            popup.classList.add('show');
        }, 10);
    }
    
    // 가이드 버튼 클릭 이벤트
    if (guideBtn) {
        guideBtn.addEventListener('click', openGuide);
    }
    
    // 닫기 버튼 이벤트
    if (closeBtn) {
        closeBtn.addEventListener('click', closeGuide);
    }
    
    // 오버레이 클릭 시 닫기
    if (popup) {
        popup.addEventListener('click', function(e) {
            if (e.target === popup) {
                closeGuide();
            }
        });
    }
    
    // ESC 키로 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && popup.classList.contains('show')) {
            closeGuide();
        }
    });
}

// 특징 가이드 데이터
function getCharacteristicsGuideData(type) {
    const guides = {
        style: {
            title: '플레이 스타일 가이드',
            content: `
                <div class="guide-section">
                    <h4>공격 방식에 따른 스타일 분류</h4>
                    <div class="guide-item">
                        <div class="guide-item-name">올라운드</div>
                        <div class="guide-item-desc">공격과 어시스트 모두 뛰어난 완전한 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 득점 ≥ 1.5골 + 어시스트 ≥ 1.0개</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">공격적</div>
                        <div class="guide-item-desc">공격 중심이지만 팀플레이도 하는 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 득점 ≥ 1.5골 + 어시스트 0.5-0.9개</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">스트라이커</div>
                        <div class="guide-item-desc">순수한 골 결정력에 특화된 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 득점 ≥ 1.5골 + 어시스트 < 0.5개</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">플레이메이커</div>
                        <div class="guide-item-desc">공격보다 팀플레이에 특화된 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 득점 1.0-1.4골 + 어시스트 ≥ 1.0개</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">균형형</div>
                        <div class="guide-item-desc">공격과 어시스트가 균형 잡힌 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 득점 1.0-1.4골 + 어시스트 0.5-0.9개</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">창조적</div>
                        <div class="guide-item-desc">어시스트 특화, 득점은 보조 역할</div>
                        <div class="guide-item-features"><strong>조건:</strong> 득점 0.5-0.9골 + 어시스트 ≥ 1.0개</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">수비형</div>
                        <div class="guide-item-desc">수비 중심의 안정적인 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 득점 0.5-0.9골 + 어시스트 < 0.5개</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">수비적</div>
                        <div class="guide-item-desc">강력한 수비력으로 경기를 통제하는 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 득점 < 0.5골 + 실점 < 1.0골</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">전술적</div>
                        <div class="guide-item-desc">전략적 사고로 높은 승률을 기록하는 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 승률 > 75% + 실점 < 1.2골</div>
                    </div>
                </div>
            `
        },
        strength: {
            title: '주요 강점 가이드',
            content: `
                <div class="guide-section">
                    <h4>특화 능력에 따른 강점 분류</h4>
                    <div class="guide-item">
                        <div class="guide-item-name">골 결정력</div>
                        <div class="guide-item-desc">뛰어난 득점 능력을 보유한 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 평균 득점 ≥ 1.8골</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">팀플레이</div>
                        <div class="guide-item-desc">뛰어난 어시스트 능력을 보유한 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 평균 어시스트 ≥ 1.2개</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">수비력</div>
                        <div class="guide-item-desc">탁월한 수비 능력을 보유한 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 평균 실점 ≤ 1.0골</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">승부사</div>
                        <div class="guide-item-desc">중요한 순간 승리 능력을 보유한 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 승률 ≥ 75%</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">전술가</div>
                        <div class="guide-item-desc">전략적 사고 능력을 보유한 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 승률 ≥ 60%</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">올라운드</div>
                        <div class="guide-item-desc">공격과 팀플레이 모두 우수한 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 득점 ≥ 1.5골 + 어시스트 ≥ 1.0개</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">득점력</div>
                        <div class="guide-item-desc">뛰어난 골 결정력과 높은 승률을 보유한 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 평균 득점 > 1.8골 + 승률 > 60%</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">플레이메이킹</div>
                        <div class="guide-item-desc">뛰어난 어시스트 능력과 득점력을 겸비한 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 평균 어시스트 > 1.2개 + 득점 > 0.6골</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">공격력</div>
                        <div class="guide-item-desc">강력한 득점 능력을 보유한 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 평균 득점 > 1.5골</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">창조력</div>
                        <div class="guide-item-desc">뛰어난 어시스트 능력을 보유한 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 평균 어시스트 > 1.0개</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">안정성</div>
                        <div class="guide-item-desc">꾸준하고 안정적인 플레이를 보여주는 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 위 조건들을 만족하지 않는 경우</div>
                    </div>
                </div>
            `
        },
        tendency: {
            title: '경기 성향 가이드',
            content: `
                <div class="guide-section">
                    <h4>경기 운영 철학에 따른 성향 분류</h4>
                    <div class="guide-item">
                        <div class="guide-item-name">정밀 스나이퍼</div>
                        <div class="guide-item-desc">정확한 슈팅과 결정력으로 골을 노리는 공격 중심 스타일</div>
                        <div class="guide-item-features"><strong>조건:</strong> 득점 ≥ 1.8골 + 승률 ≥ 60%</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">티키타카 마에스트로</div>
                        <div class="guide-item-desc">짧은 패스와 점유율을 통한 공격 전개 스타일</div>
                        <div class="guide-item-features"><strong>조건:</strong> 어시스트 ≥ 1.2개 + 승률 ≥ 60%</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">번개 카운터</div>
                        <div class="guide-item-desc">빠른 전환과 역습을 통한 공격 스타일</div>
                        <div class="guide-item-features"><strong>조건:</strong> 득점 ≥ 1.5골 + 어시스트 ≥ 0.8개 + 승률 ≥ 65%</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">철벽 수비</div>
                        <div class="guide-item-desc">강력한 수비력으로 상대 공격을 차단하는 스타일</div>
                        <div class="guide-item-features"><strong>조건:</strong> 실점 ≤ 1.0골 + 승률 ≥ 60%</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">만능 득점머신</div>
                        <div class="guide-item-desc">다양한 방법으로 골을 넣는 공격적 스타일</div>
                        <div class="guide-item-features"><strong>조건:</strong> 득점 ≥ 1.5골 + 어시스트 ≥ 1.0개 + 승률 ≥ 60%</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">점유율 제어</div>
                        <div class="guide-item-desc">공을 오래 가지고 경기를 통제하는 스타일</div>
                        <div class="guide-item-features"><strong>조건:</strong> 어시스트 ≥ 1.0개 + 승률 ≥ 65%</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">고압 압박</div>
                        <div class="guide-item-desc">상대를 강하게 압박하여 실수를 유도하는 스타일</div>
                        <div class="guide-item-features"><strong>조건:</strong> 실점 ≤ 1.2골 + 승률 ≥ 60%</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">윙 플레이</div>
                        <div class="guide-item-desc">측면을 활용한 공격 전개 스타일</div>
                        <div class="guide-item-features"><strong>조건:</strong> 어시스트 ≥ 0.8개 + 승률 ≥ 55%</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">롱볼 전술</div>
                        <div class="guide-item-desc">긴 패스와 공중볼을 활용한 직접적인 공격 스타일</div>
                        <div class="guide-item-features"><strong>조건:</strong> 득점 ≥ 1.2골 + 승률 ≥ 55%</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">수비 카운터</div>
                        <div class="guide-item-desc">수비를 바탕으로 한 역습 공격 스타일</div>
                        <div class="guide-item-features"><strong>조건:</strong> 실점 ≤ 1.3골 + 득점 ≥ 1.0골 + 승률 ≥ 55%</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">올아웃 어택</div>
                        <div class="guide-item-desc">모든 선수를 공격에 투입하는 공격적 스타일</div>
                        <div class="guide-item-features"><strong>조건:</strong> 득점 ≥ 1.8골 + 승률 ≥ 50%</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">균형 잡힌 플레이</div>
                        <div class="guide-item-desc">공수 밸런스가 뛰어난 완성도 높은 경기 운영</div>
                        <div class="guide-item-features"><strong>조건:</strong> 위 조건들을 만족하지 않는 경우</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">창조적 플레이메이커</div>
                        <div class="guide-item-desc">뛰어난 창조력과 득점력을 겸비한 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 어시스트 ≥ 1.0개 + 득점 ≥ 1.0골 + 승률 ≥ 60%</div>
                    </div>
                    <div class="guide-item">
                        <div class="guide-item-name">안정적 수비</div>
                        <div class="guide-item-desc">안정적인 수비력으로 경기를 통제하는 플레이어</div>
                        <div class="guide-item-features"><strong>조건:</strong> 실점 ≤ 1.1골 + 승률 ≥ 60%</div>
                    </div>
                </div>
            `
        }
    };
    
    return guides[type] || { title: '가이드', content: '내용이 없습니다.' };
}

// 구단별 데이터 관련 요소들

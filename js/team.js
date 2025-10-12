const teamDataContent = document.getElementById('teamDataContent');
const teamLoading = document.getElementById('teamLoading');
const teamCardsContainer = document.getElementById('teamCardsContainer');
const noTeamData = document.getElementById('noTeamData');
const teamCardGuide = document.getElementById('teamCardGuide');

// 슬라이더 관련 요소들
const teamCardsSlider = document.getElementById('teamCardsSlider');
const teamCardsTrack = document.getElementById('teamCardsTrack');
const teamSliderPrevBtn = document.getElementById('teamSliderPrevBtn');
const teamSliderNextBtn = document.getElementById('teamSliderNextBtn');

// 구단별 데이터 관련 변수들
let teamFormationData = {};
let currentUserData = null;

// 슬라이더 관련 변수들
let currentSlideIndex = 0;
let totalSlides = 0;
let cardsPerSlide = 2; // 1x2 배열이므로 2개씩

// Top players slider variables
let topPlayersCurrentSlideIndex = 0;
let topPlayersTotalSlides = 0;

// 구단별 데이터 캐시
let teamDataCache = null;
let teamDataLoaded = false;

// 강화 등급 정보 함수 (dashboard.js와 동일)
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
        11: { name: '+11', color: '#E5E4E2', tier: 'platinum' },
        12: { name: '+12', color: '#BCC6CC', tier: 'platinum' },
        13: { name: '+13', color: '#98AFC7', tier: 'platinum' }
    };
    
    return gradeMap[grade] || { name: `+${grade}`, color: '#6B7280', tier: 'basic' };
}

// 강화 등급 배지 렌더링 함수
function renderGradeBadge(grade) {
    const gradeInfo = getGradeInfo(grade);
    return `<div class="player-grade-badge grade-${grade}" style="background: ${gradeInfo.color}; color: white; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">+${grade}</div>`;
}

// 포메이션 분석 관련 요소들
const formationDataContent = document.getElementById('formationDataContent');
const formationLoading = document.getElementById('formationLoading');
const formationLayout = document.getElementById('formationLayout');
const formationPerformanceTrack = document.getElementById('formationPerformanceTrack');
const formationSliderPrevBtn = document.getElementById('formationSliderPrevBtn');
const formationSliderNextBtn = document.getElementById('formationSliderNextBtn');
const formationGroupsContainer = document.getElementById('formationGroupsContainer');
const noFormationData = document.getElementById('noFormationData');

// 포메이션 분석 캐시
let formationDataCache = null;
let formationDataLoaded = false;

// 포메이션 슬라이더 변수
let formationCurrentSlideIndex = 0;
let formationTotalSlides = 0;
const formationCardsPerSlide = 3;

// 구단별 데이터 분석 함수 (동일 선수 11명 출전 경기)
async function analyzeTeamData() {
    
    // 구단별 데이터 탭 전용 경기 데이터 사용
    let matchesToAnalyze = null;
    
    if (currentUserInfo && currentUserInfo.ouid) {
        try {
            showTeamLoading('100경기 데이터를 로드하는 중...');
            
            // 구단별 데이터 탭 전용 변수 사용
            if (teamTabMatches.length === 0) {
                // 처음 로드하는 경우: 대시보드에서 가져온 초기 데이터로 시작
                teamTabMatches = [...(currentUserInfo.matches || [])];
                teamTabOffset = teamTabMatches.length;
            }
            
            matchesToAnalyze = [...teamTabMatches];
            
            // 더보기 API를 여러 번 호출해서 100경기까지 가져오기
            const targetCount = 100;
            const batchSize = 10;
            const maxAttempts = 10; // 최대 10번 시도 (100경기까지)
            let attempts = 0;
            
            while (matchesToAnalyze.length < targetCount && attempts < maxAttempts) {
                try {
                    
                    // 로딩 메시지 업데이트
                    showTeamLoading(`정확한 분석을 위해 데이터 로드 중입니다... (${matchesToAnalyze.length}/${targetCount}경기)`);
                    
                    const response = await fetch(`/api/more-matches/${currentUserInfo.ouid}/${teamTabOffset}/${batchSize}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.matches && data.matches.length > 0) {
                            // 새로운 경기를 추가
                            matchesToAnalyze = matchesToAnalyze.concat(data.matches);
                            teamTabMatches = matchesToAnalyze; // 탭 전용 데이터 업데이트
                            teamTabOffset += data.matches.length; // 실제 가져온 경기 수만큼 offset 증가
                            attempts++;
                            
                            // 100경기에 도달했으면 중단
                            if (matchesToAnalyze.length >= targetCount) {
                                break;
                            }
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                } catch (error) {
                    break;
                }
            }
            
        } catch (error) {
            matchesToAnalyze = currentUserInfo?.matches || currentUserData?.matches;
        }
    } else {
        matchesToAnalyze = currentUserInfo?.matches || currentUserData?.matches;
    }
    
    if (!matchesToAnalyze || matchesToAnalyze.length === 0) {
        showNoTeamData();
        return;
    }

    showTeamLoading(`데이터를 분석하는 중... (${matchesToAnalyze.length}경기)`);
    
    // 최고의 선수 데이터 계산 및 표시
    displayTeamTopPlayers(matchesToAnalyze);
    
    try {
        // 경기별 선수 그룹 분석 (7명 이상 겹치는 선수들 기준)
        const matchGroups = [];
        
        for (const match of matchesToAnalyze) {
            try {
                
                if (match.userPlayers && match.userPlayers.length >= 11) {
                    // 출전한 선수만 필터링 (status.spRating이 있는 선수들)
                    const playingPlayers = match.userPlayers.filter(player => 
                        player.status && player.status.spRating && player.status.spRating > 0
                    );
                    
                    
                    if (playingPlayers.length >= 7) { // 7명 이상이면 포함
                        
                        matchGroups.push({
                            matchId: match.matchId,
                            matchDate: match.matchDate,
                            result: match.matchResult === 1 ? '승' : match.matchResult === 2 ? '패' : '무',
                            matchType: match.matchType,
                            players: playingPlayers,
                            // userStats 정보 추가
                            userStats: match.userStats,
                            opponentStats: match.opponentStats,
                            userGoals: match.userGoals,
                            opponentGoals: match.opponentGoals
                        });
                    } else {
                    }
                } else {
                }
            } catch (error) {
            }
        }
        
        
        // 7명 이상 겹치는 선수들로 그룹화
        const playerGroups = groupMatchesByOverlappingPlayers(matchGroups);
        
        
        // 이미 2경기 이상으로 필터링되어 있음
        const filteredGroups = playerGroups;
        
        if (filteredGroups.length === 0) {
            showNoTeamData();
            return;
        }
        
        // 그룹별 통계 계산
        const groupStats = filteredGroups.map(group => {
            const stats = calculateFormationStats(group.matches);
            return {
                ...group,
                ...stats
            };
        });
        
        // 최근 경기 시간순으로 정렬 (최신이 위에)
        groupStats.sort((a, b) => new Date(b.lastMatchDate) - new Date(a.lastMatchDate));
        
        teamFormationData = groupStats;
        const formations = groupStats; // formations 변수 정의
        displayTeamFormationCards(formations);
        
        // 데이터를 캐시에 저장
        teamDataCache = {
            formations: formations,
            matches: matchesToAnalyze || []
        };
        teamDataLoaded = true;
        
    } catch (error) {
        showNoTeamData();
    }
}

// 7명 이상 겹치는 선수들로 경기 그룹화
function groupMatchesByOverlappingPlayers(matchGroups) {
    const groups = [];
    const processedMatches = new Set();
    
    for (let i = 0; i < matchGroups.length; i++) {
        if (processedMatches.has(i)) continue;
        
        const currentMatch = matchGroups[i];
        const group = {
            players: [...currentMatch.players],
            matches: [currentMatch],
            playerIds: new Set(currentMatch.players.map(p => p.spId))
        };
        
        // 현재 경기와 7명 이상 겹치는 다른 경기들 찾기
        for (let j = i + 1; j < matchGroups.length; j++) {
            if (processedMatches.has(j)) continue;
            
            const otherMatch = matchGroups[j];
            const otherPlayerIds = new Set(otherMatch.players.map(p => p.spId));
            
            // 겹치는 선수 수 계산
            const intersection = new Set([...group.playerIds].filter(id => otherPlayerIds.has(id)));
            
            if (intersection.size >= 7) {
                
                // 그룹에 경기 추가
                group.matches.push(otherMatch);
                
                // 새로운 선수들 추가
                otherMatch.players.forEach(player => {
                    if (!group.playerIds.has(player.spId)) {
                        group.players.push(player);
                        group.playerIds.add(player.spId);
                    }
                });
                
                processedMatches.add(j);
            }
        }
        
        // 2경기 이상인 그룹만 추가
        if (group.matches.length >= 2) {
            groups.push(group);
        }
        
        processedMatches.add(i);
    }
    
    return groups;
}

// 동일 선수 그룹 키 생성 (7명 이상 겹치는 선수들 기준)
function generatePlayerGroupKey(players) {
    // 선수 ID만으로 정렬하여 키 생성
    const sortedPlayerIds = players
        .map(player => player.spId)
        .sort()
        .join('|');
    return sortedPlayerIds;
}

// 포메이션 통계 계산
function calculateFormationStats(matches) {
    let totalGoals = 0;
    let totalConceded = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let totalRating = 0;
    
    if (matches.length > 0) {
    }
    
    for (const match of matches) {
        // 경기 결과별 카운트
        const matchResult = match.matchResult !== undefined ? match.matchResult : match.result;
        
        // matchResult가 숫자인 경우 (0: 무, 1: 승, 2: 패)
        if (typeof matchResult === 'number') {
            if (matchResult === 1) wins++;
            else if (matchResult === 0) draws++;
            else if (matchResult === 2) losses++;
        }
        // matchResult가 문자열인 경우
        else if (typeof matchResult === 'string') {
            if (matchResult === '승') wins++;
            else if (matchResult === '무') draws++;
            else if (matchResult === '패') losses++;
        }
        
        // 득점/실점
        totalGoals += (match.userGoals || match.userScore || 0);
        totalConceded += (match.opponentGoals || match.opponentScore || 0);
        
        // 선수별 평점 합계 (userPlayers 사용)
        const players = match.userPlayers || match.players || [];
        for (const player of players) {
            totalRating += player.status?.spRating || 0;
        }
    }
    
    
    const matchCount = matches.length;
    const winRate = matchCount > 0 ? (wins / matchCount) * 100 : 0;
    const avgRating = matchCount > 0 ? totalRating / (matchCount * 11) : 0;
    const avgGoals = matchCount > 0 ? totalGoals / matchCount : 0;
    const avgConcede = matchCount > 0 ? totalConceded / matchCount : 0;
    
    // 경기 기간 계산
    let firstMatchDate = null;
    let lastMatchDate = null;
    
    if (matches.length > 0) {
        const sortedMatches = [...matches].sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));
        firstMatchDate = sortedMatches[0].matchDate;
        lastMatchDate = sortedMatches[sortedMatches.length - 1].matchDate;
    }
    
    return {
        matchCount,
        winRate: Math.round(winRate * 10) / 10,
        avgRating: Math.round(avgRating * 10) / 10,
        avgGoals,
        avgConcede,
        wins,
        draws,
        losses,
        firstMatchDate,
        lastMatchDate
    };
}

// 구단별 포메이션 카드 표시
function displayTeamFormationCards(formations) {
    
    // 슬라이더 초기화
    if (teamCardsTrack) {
        teamCardsTrack.innerHTML = '';
    }
    
    // 슬라이더 변수 초기화
    currentSlideIndex = 0;
    totalSlides = Math.ceil(formations.length / cardsPerSlide);
    
    // 슬라이드별로 카드 그룹화
    for (let slideIndex = 0; slideIndex < totalSlides; slideIndex++) {
        const slide = document.createElement('div');
        slide.className = 'team-slide';
        
        // 현재 슬라이드에 들어갈 카드들 (최대 2개)
        const startIndex = slideIndex * cardsPerSlide;
        const endIndex = Math.min(startIndex + cardsPerSlide, formations.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const formation = formations[i];
            formation.formationId = i;
            const card = createTeamFormationCard(formation, i);
            slide.appendChild(card);
        }
        
        if (teamCardsTrack) {
            teamCardsTrack.appendChild(slide);
        }
    }
    
    // 슬라이더 버튼 상태 업데이트
    updateSliderButtons();
    
    // 슬라이더 이벤트 리스너 추가
    setupSliderEventListeners();
    
    hideTeamLoading();
    const teamLayout = document.getElementById('teamLayout');
    if (teamLayout) {
        teamLayout.style.display = 'flex';
    } else {
    }
    
    // teamDetailPanel 표시 (가이드)
    const teamDetailPanel = document.getElementById('teamDetailPanel');
    if (teamDetailPanel) {
        teamDetailPanel.style.display = 'block';
    }
    
    // teamCardGuide 숨기기 (구단 카드가 표시되므로)
    if (teamCardGuide) {
        teamCardGuide.style.display = 'none';
    }
    
}

// 포메이션 카드 생성 (간소화)
function createTeamFormationCard(formation, index) {
    const card = document.createElement('div');
    card.className = 'team-formation-card';
    card.dataset.formationId = index;
    
    // 클럽 번호 + 대표 선수 3명으로 이름 생성
    const groupName = generatePlayerGroupName(index, formation.players);
    
    card.innerHTML = `
        <div class="team-formation-header">
            <div class="team-formation-name-container">
                <span class="team-formation-club">${groupName.clubName}</span>
                <span class="team-formation-players">${groupName.playerNames}</span>
            </div>
        </div>
        
        <div class="team-formation-stats">
            <div class="team-stat-single-row">
                <span class="team-stat-label">승률 :</span>
                <span class="team-stat-value win-rate">${formation.winRate}%</span>
                <span class="team-stat-label">평균 평점 :</span>
                <span class="team-stat-value">${formation.avgRating}</span>
                <span class="team-stat-label">경기수 :</span>
                <span class="team-stat-value">${formation.matchCount}</span>
            </div>
        </div>
        
        <div class="team-formation-footer">
            <div class="team-match-period">${formatDate(formation.firstMatchDate)} ~ ${formatDate(formation.lastMatchDate)}</div>
        </div>
    `;
    
    // 카드 클릭 이벤트
    card.addEventListener('click', () => {
        showFormationDetail(formation);
    });
    
    return card;
}

// 슬라이더 이벤트 리스너 설정
function setupSliderEventListeners() {
    if (teamSliderPrevBtn) {
        teamSliderPrevBtn.addEventListener('click', () => {
            if (currentSlideIndex > 0) {
                currentSlideIndex--;
                updateSliderPosition();
                updateSliderButtons();
            }
        });
    }
    
    if (teamSliderNextBtn) {
        teamSliderNextBtn.addEventListener('click', () => {
            if (currentSlideIndex < totalSlides - 1) {
                currentSlideIndex++;
                updateSliderPosition();
                updateSliderButtons();
            }
        });
    }
}

// 슬라이더 위치 업데이트
function updateSliderPosition() {
    if (teamCardsTrack) {
        const translateX = -currentSlideIndex * 100; // 각 슬라이드는 100% 너비
        teamCardsTrack.style.transform = `translateX(${translateX}%)`;
    }
}

// 슬라이더 버튼 상태 업데이트
function updateSliderButtons() {
    if (teamSliderPrevBtn) {
        teamSliderPrevBtn.disabled = currentSlideIndex === 0;
    }
    
    if (teamSliderNextBtn) {
        teamSliderNextBtn.disabled = currentSlideIndex >= totalSlides - 1;
    }
    
}

// 동일 선수 그룹 이름 생성 (클럽 번호 + 대표 선수 3명)
function generatePlayerGroupName(groupIndex, players) {
    // 각 선수의 평균 평점 계산 (모든 경기에서의 평균)
    const playerAvgRatings = players.map(player => {
        let totalRating = 0;
        let matchCount = 0;
        
        // 해당 선수가 출전한 모든 경기에서의 평점 합계
        players.forEach(p => {
            if (p.spId === player.spId && p.status && p.status.spRating > 0) {
                totalRating += p.status.spRating;
                matchCount++;
            }
        });
        
        const avgRating = matchCount > 0 ? totalRating / matchCount : 0;
        return {
            ...player,
            avgRating: avgRating
        };
    });
    
    // 평균 평점이 높은 상위 3명 선수 선택
    const topPlayers = playerAvgRatings
        .filter(player => player.avgRating > 0)
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, 3)
        .map(player => player.spName);
    
    const playerNames = topPlayers.length > 0 ? topPlayers.join(', ') : '선수 없음';
    return {
        clubName: `구단 ${groupIndex + 1}`,
        playerNames: playerNames
    };
}

// 선수 아이템 생성
function createTeamPlayerItem(player) {
    const positionName = getPositionName(player.spPosition);
    const rating = player.status.spRating || 0;
    
    return `
        <div class="team-player-item">
            <img src="${player.seasonImg}" alt="${player.spName}" class="team-player-image">
            <div class="team-player-name">${player.spName}</div>
            <div class="team-player-position">${positionName}</div>
            <div class="team-player-rating">${rating}</div>
        </div>
    `;
}

// 동일 선수 그룹 상세 정보 표시 (오른쪽 패널)
function showFormationDetail(group) {
    
    // teamCardGuide 숨기기
    if (teamCardGuide) {
        teamCardGuide.style.display = 'none';
    }
    
    const detailPanel = document.getElementById('teamDetailPanel');
    if (!detailPanel) {
        return;
    }
    
    const groupName = generatePlayerGroupName(group.formationId || 0, group.players);
    
    // 선수별 성과 데이터 계산
    const playerStats = calculatePlayerStats(group);
    
    // 구단 통계 계산
    const teamStats = calculateTeamStats(group);
    
                detailPanel.innerHTML = `
                    <div class="team-detail-header">
                        <div class="team-detail-title">
                            <h3>${groupName.clubName} : ${groupName.playerNames}</h3>
                            <p>동일 선수 11명 출전 • ${group.matchCount}경기</p>
                        </div>
                    </div>
                    
                    <!-- 구단 통계 영역 -->
                        <div class="team-detail-content">
                    <div class="team-stats-section" id="teamStatsSection">
                        <h4 class="team-stats-title" id="teamStatsTitle">${groupName.clubName} 통계</h4>
                        <div class="team-stats-cards">
                            <div class="stat-card">
                                <div class="stat-label">승률</div>
                                <div class="stat-value" id="teamWinRate">${teamStats.winRate}%</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">평균 평점</div>
                                <div class="stat-value" id="teamAvgRating">${group.avgRating}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">근거리</div>
                                <div class="stat-value" id="teamCloseRangeSuccess">${teamStats.closeRangeSuccess}%</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">중거리</div>
                                <div class="stat-value" id="teamMidRangeSuccess">${teamStats.midRangeSuccess}%</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">헤딩</div>
                                <div class="stat-value" id="teamHeadingSuccess">${teamStats.headingSuccess}%</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">수비</div>
                                <div class="stat-value" id="teamDefenseSuccess">${teamStats.defenseSuccess}%</div>
                            </div>
                        </div>
                    </div>
                     </div>
                     
                    <div class="team-detail-content">
                        <div class="player-stats-section">
                            <h4>선수별 성과</h4>
                            <div class="player-stats-table-container">
                                <table class="player-stats-table">
                                    <thead>
                                        <tr>
                                            <th class="player-info-header">선수 정보</th>
                                            <th class="stats-header sortable" data-sort="totalMatches">경기수 <span class="sort-icon">↕</span></th>
                                            <th class="stats-header sortable active" data-sort="avgRating">평균 평점 <span class="sort-icon">↓</span></th>
                                            <th class="stats-header sortable" data-sort="avgContributionScore">기여도 <span class="sort-icon">↕</span></th>
                                            <th class="stats-header sortable" data-sort="goals">총골 <span class="sort-icon">↕</span></th>
                                            <th class="stats-header sortable" data-sort="assists">어시스트 <span class="sort-icon">↕</span></th>
                                            <th class="stats-header sortable" data-sort="passSuccessRate">패스 <span class="sort-icon">↕</span></th>
                                            <th class="stats-header sortable" data-sort="dribbleSuccessRate">드리블 <span class="sort-icon">↕</span></th>
                                            <th class="stats-header sortable" data-sort="possessionSuccessRate">볼 소유 <span class="sort-icon">↕</span></th>
                                            <th class="stats-header sortable" data-sort="aerialSuccessRate">공중볼 <span class="sort-icon">↕</span></th>
                                            <th class="stats-header sortable" data-sort="defenseSuccessRate">수비 <span class="sort-icon">↕</span></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(() => {
                                            // 선수별 상세 데이터 저장
                                            currentPlayerStatsDetails = {};
                                            playerStats.forEach(player => {
                                                currentPlayerStatsDetails[player.spId] = {
                                                    ...player,
                                                    // 추가 상세 데이터
                                                    passTry: player.passTry || 0,
                                                    passSuccess: player.passSuccess || 0,
                                                    dribbleTry: player.dribbleTry || 0,
                                                    dribbleSuccess: player.dribbleSuccess || 0,
                                                    possessionTry: player.possessionTry || 0,
                                                    possessionSuccess: player.possessionSuccess || 0,
                                                    aerialDuels: player.aerialDuels || 0,
                                                    aerialDuelsWon: player.aerialDuelsWon || 0,
                                                    blockTry: player.blockTry || 0,
                                                    blocks: player.blocks || 0,
                                                    tackleTry: player.tackleTry || 0,
                                                    tackles: player.tackles || 0,
                                                    intercepts: player.intercepts || 0,
                                                    contributionScore: player.contributionScore || 0
                                                };
                                            });
                                            return playerStats.map(player => createPlayerStatsCard(player)).join('');
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
    
    // teamDetailPanel 표시
    detailPanel.style.display = 'block';
    
    // 통계 값에 색상 적용
    applyStatColors(teamStats, group);
    
    // 카드 선택 상태 업데이트
    updateSelectedCard(group);
    
    // 테이블 정렬 기능 초기화
    initializeTableSorting();
}

// 구단 통계 계산
function calculateTeamStats(group) {
    const matches = group.matches || [];
    if (matches.length === 0) {
        return {
            winRate: 0,
            closeRangeSuccess: 0,
            midRangeSuccess: 0,
            headingSuccess: 0,
            defenseSuccess: 0
        };
    }
    
    let totalWins = 0;
    let totalCloseRangeGoals = 0;
    let totalCloseRangeAttempts = 0;
    let totalMidRangeGoals = 0;
    let totalMidRangeAttempts = 0;
    let totalHeadingGoals = 0;
    let totalHeadingAttempts = 0;
    let totalBlockSuccess = 0;
    let totalBlockTry = 0;
    let totalTackleSuccess = 0;
    let totalTackleTry = 0;
    
    matches.forEach(match => {
        // 승률 계산
        if (match.result === '승') totalWins++;
        
        // 팀 전체 슈팅 통계 (userStats.shoot에서 가져오기)
        if (match.userStats && match.userStats.shoot) {
            const shoot = match.userStats.shoot;
            
            // 디버깅: shoot 객체의 주요 필드 확인
            
            // 근거리 성공률 (페널티박스 안) - FIFA Online 4 API 실제 필드명 사용
            const goalInPenalty = shoot.goalInPenalty || shoot.goalInPenaltyBox || shoot.goalInBox || shoot.goalInsideBox || 0;
            const shootInPenalty = shoot.shootInPenalty || shoot.shootInPenaltyBox || shoot.shootInBox || shoot.shootInsideBox || 0;
            totalCloseRangeGoals += goalInPenalty;
            totalCloseRangeAttempts += shootInPenalty;
            
            // 중거리 성공률 (페널티박스 밖) - FIFA Online 4 API 실제 필드명 사용
            const goalOutPenalty = shoot.goalOutPenalty || shoot.goalOutPenaltyBox || shoot.goalOutBox || shoot.goalOutsideBox || 0;
            const shootOutPenalty = shoot.shootOutPenalty || shoot.shootOutPenaltyBox || shoot.shootOutBox || shoot.shootOutsideBox || 0;
            totalMidRangeGoals += goalOutPenalty;
            totalMidRangeAttempts += shootOutPenalty;
            
            // 헤딩 성공률 - FIFA Online 4 API 실제 필드명 사용
            const goalHeading = shoot.goalHeading || shoot.goalHead || shoot.headingGoal || shoot.goalHeader || 0;
            const shootHeading = shoot.shootHeading || shoot.shootHead || shoot.headingShoot || shoot.shootHeader || 0;
            totalHeadingGoals += goalHeading;
            totalHeadingAttempts += shootHeading;
            
        } else {
        }
        
        // 수비 통계는 개별 선수 데이터 합산 (블록 + 태클)
        match.players.forEach(player => {
            const blockSuccess = player.status?.blockSuccess || 0;
            const blockTry = player.status?.blockTry || 0;
            const tackleSuccess = player.status?.tackleSuccess || 0;
            const tackleTry = player.status?.tackleTry || 0;
            
            totalBlockSuccess += blockSuccess;
            totalBlockTry += blockTry;
            totalTackleSuccess += tackleSuccess;
            totalTackleTry += tackleTry;
        });
    });
    
    // 성공률 계산
    const winRate = Math.round((totalWins / matches.length) * 100);
    const closeRangeSuccess = totalCloseRangeAttempts > 0 ? Math.round((totalCloseRangeGoals / totalCloseRangeAttempts) * 100) : 0;
    const midRangeSuccess = totalMidRangeAttempts > 0 ? Math.round((totalMidRangeGoals / totalMidRangeAttempts) * 100) : 0;
    const headingSuccess = totalHeadingAttempts > 0 ? Math.round((totalHeadingGoals / totalHeadingAttempts) * 100) : 0;
    
    
    // 수비 성공률 (블록과 태클의 합계)
    const totalDefenseSuccess = totalBlockSuccess + totalTackleSuccess;
    const totalDefenseTry = totalBlockTry + totalTackleTry;
    const defenseSuccess = totalDefenseTry > 0 ? Math.round((totalDefenseSuccess / totalDefenseTry) * 100) : 0;
    
    return {
        winRate,
        closeRangeSuccess,
        midRangeSuccess,
        headingSuccess,
        defenseSuccess
    };
}

// 통계 값에 색상 적용
function applyStatColors(stats, group) {
    // 구단별 데이터 패널 내의 요소들만 선택 (대시보드와 ID 충돌 방지)
    const detailPanel = document.getElementById('teamDetailPanel');
    if (!detailPanel) return;
    
    const winRate = detailPanel.querySelector('#teamWinRate');
    const avgRating = detailPanel.querySelector('#teamAvgRating');
    const closeRangeSuccess = detailPanel.querySelector('#teamCloseRangeSuccess');
    const midRangeSuccess = detailPanel.querySelector('#teamMidRangeSuccess');
    const headingSuccess = detailPanel.querySelector('#teamHeadingSuccess');
    const defenseSuccess = detailPanel.querySelector('#teamDefenseSuccess');
    
    if (winRate) {
        winRate.className = `stat-value ${getStatClass(stats.winRate, 'winRate')}`;
    }
    
    if (avgRating) {
        avgRating.className = `stat-value ${getStatClass(parseFloat(group.avgRating), 'rating')}`;
    }
    
    if (closeRangeSuccess) {
        closeRangeSuccess.className = `stat-value ${getStatClass(stats.closeRangeSuccess, 'success')}`;
    }
    
    if (midRangeSuccess) {
        midRangeSuccess.className = `stat-value ${getStatClass(stats.midRangeSuccess, 'success')}`;
    }
    
    if (headingSuccess) {
        headingSuccess.className = `stat-value ${getStatClass(stats.headingSuccess, 'success')}`;
    }
    
    if (defenseSuccess) {
        defenseSuccess.className = `stat-value ${getStatClass(stats.defenseSuccess, 'success')}`;
    }
}

// 통계 값에 따른 CSS 클래스 반환
function getStatClass(value, type) {
    if (type === 'winRate') {
        if (value >= 70) return 'high';
        if (value >= 50) return 'medium';
        return 'low';
    } else if (type === 'success') {
        if (value >= 60) return 'high';
        if (value >= 40) return 'medium';
        return 'low';
    } else if (type === 'rating') {
        if (value >= 7.0) return 'high';
        if (value >= 6.0) return 'medium';
        return 'low';
    }
    return '';
}

// 선수별 성과 데이터 계산
function calculatePlayerStats(group) {
    const playerStatsMap = new Map();
    
    // 각 경기에서의 선수 성과 수집
    group.matches.forEach(match => {
        match.players.forEach(player => {
            const playerId = player.spId;
            
            if (!playerStatsMap.has(playerId)) {
                playerStatsMap.set(playerId, {
                    spId: player.spId,
                    spName: player.spName,
                    spPosition: player.spPosition,
                    spGrade: player.spGrade,
                    seasonImg: player.seasonImg,
                    season: player.season, // 대시보드와 동일한 방식으로 season 정보 저장
                    totalMatches: 0,
                    totalRating: 0,
                    avgRating: 0,
                    maxRating: 0,
                    minRating: 10,
                    goals: 0,
                    assists: 0,
                    // 패스 통계
                    passSuccess: 0,
                    passTry: 0,
                    passSuccessRate: 0,
                    // 드리블 통계
                    dribbleSuccess: 0,
                    dribbleTry: 0,
                    dribbleSuccessRate: 0,
                    // 볼 소유 통계
                    possessionSuccess: 0,
                    possessionTry: 0,
                    possessionSuccessRate: 0,
                    // 수비 통계
                    blocks: 0,
                    blockTry: 0,
                    blockSuccessRate: 0,
                    tackles: 0,
                    tackleTry: 0,
                    tackleSuccessRate: 0,
                    // 공중볼 통계
                    aerialDuels: 0,
                    aerialDuelsWon: 0,
                    aerialSuccessRate: 0,
                    // 기여도 통계
                    intercepts: 0,
                    contributionScore: 0,
                    matches: []
                });
            }
            
            const stats = playerStatsMap.get(playerId);
            const rating = player.status.spRating || 0;
            
            stats.totalMatches++;
            stats.totalRating += rating;
            stats.maxRating = Math.max(stats.maxRating, rating);
            stats.minRating = Math.min(stats.minRating, rating);
            stats.goals += player.status.goal || 0;
            stats.assists += player.status.assist || 0;
            
            // 패스 통계
            stats.passSuccess += player.status.passSuccess || player.status.pass || 0;
            stats.passTry += player.status.passTry || player.status.passTry || 0;
            
            // 드리블 통계
            stats.dribbleSuccess += player.status.dribbleSuccess || player.status.dribble || 0;
            stats.dribbleTry += player.status.dribbleTry || player.status.dribbleTry || 0;
            
            // 볼 소유 통계 (패스와 드리블의 조합으로 추정)
            stats.possessionSuccess += (player.status.passSuccess || player.status.pass || 0) + (player.status.dribbleSuccess || player.status.dribble || 0);
            stats.possessionTry += (player.status.passTry || player.status.passTry || 0) + (player.status.dribbleTry || player.status.dribbleTry || 0);
            
            // 수비 통계
            const blockCount = player.status.blockSuccess || player.status.block || 0;
            const blockTryCount = player.status.blockTry || 0;
            const tackleCount = player.status.tackleSuccess || player.status.tackle || 0;
            const tackleTryCount = player.status.tackleTry || 0;
            
            stats.blocks += blockCount;
            stats.blockTry += blockTryCount;
            stats.tackles += tackleCount;
            stats.tackleTry += tackleTryCount;
            
            // 공중볼 통계
            const aerialTry = player.status.aerialTry || 0;
            const aerialSuccess = player.status.aerialSuccess || 0;
            stats.aerialDuels += aerialTry;
            stats.aerialDuelsWon += aerialSuccess;
            
            // 인터셉트 통계
            const interceptCount = player.status.intercept || 0;
            stats.intercepts += interceptCount;
            
            // 기여도 점수 계산 (골 + 어시스트 + 블록 + 태클 + 인터셉트)
            const contribution = (player.status.goal || 0) + 
                               (player.status.assist || 0) + 
                               blockCount + 
                               tackleCount + 
                               interceptCount;
            stats.contributionScore += contribution;
            
            // 골키퍼 선방 (골키퍼 포지션인 경우)
            if (player.spPosition === 1) { // 골키퍼 포지션
                const saveCount = player.status.goal || 0; // 골키퍼의 경우 골을 선방으로 간주
                stats.saves += saveCount;
            }
            
            // 디버깅 로그
            if (blockCount > 0 || tackleCount > 0) {
            }
            
            stats.matches.push({
                matchId: match.matchId,
                matchDate: match.matchDate,
                rating: rating,
                goal: player.status.goal || 0,
                assist: player.status.assist || 0,
                matchResult: match.matchResult
            });
        });
    });
    
    // 평균 평점 및 성공률 계산 및 정렬
    const playerStats = Array.from(playerStatsMap.values()).map(stats => {
        // 공중볼 성공률 계산
        stats.aerialSuccessRate = stats.aerialDuels > 0 ? Math.round((stats.aerialDuelsWon / stats.aerialDuels) * 100) : 0;
        
        // 수비 성공률 계산 (블록 + 태클 + 인터셉트)
        // 인터셉트는 시도 횟수가 없으므로 성공 횟수를 시도/성공 양쪽에 모두 추가
        const totalDefenseTry = stats.blockTry + stats.tackleTry + stats.intercepts;
        const totalDefenseSuccess = stats.blocks + stats.tackles + stats.intercepts;
        stats.defenseSuccessRate = totalDefenseTry > 0 ? Math.round((totalDefenseSuccess / totalDefenseTry) * 100) : 0;
        
        stats.avgRating = stats.totalMatches > 0 ? (stats.totalRating / stats.totalMatches).toFixed(1) : 0;
        
        // 기여도 점수 (경기당 평균)
        stats.avgContributionScore = stats.totalMatches > 0 ? (stats.contributionScore / stats.totalMatches).toFixed(1) : 0;
        
        // 패스 성공률 계산
        stats.passSuccessRate = stats.passTry > 0 ? Math.round((stats.passSuccess / stats.passTry) * 100) : 0;
        
        // 드리블 성공률 계산
        stats.dribbleSuccessRate = stats.dribbleTry > 0 ? Math.round((stats.dribbleSuccess / stats.dribbleTry) * 100) : 0;
        
        // 볼 소유 성공률 계산
        stats.possessionSuccessRate = stats.possessionTry > 0 ? Math.round((stats.possessionSuccess / stats.possessionTry) * 100) : 0;
        
        // 디버깅 로그
        
        return stats;
    }).sort((a, b) => b.avgRating - a.avgRating);
    
    return playerStats;
}

// 선수 성과 카드 생성
function createPlayerStatsCard(player) {
    const positionName = getPositionName(player.spPosition);
    const ratingColor = getRatingColor(player.avgRating);
    
    // 시즌 이미지 처리 - 보라색 박스 없이 직접 이미지 표시
    let seasonDisplay;
    if (player.season?.seasonImg) {
        seasonDisplay = `<img src="${player.season.seasonImg}" alt="시즌" class="season-image" onerror="this.style.display='none'"/>`;
    } else if (player.seasonImg && player.seasonImg !== 'N/A' && player.seasonImg.includes('http')) {
        seasonDisplay = `<img src="${player.seasonImg}" alt="시즌" class="season-image" onerror="this.style.display='none'"/>`;
    } else {
        // 시즌 ID가 없는 경우 빈 공간으로 처리
        seasonDisplay = `<div class="season-placeholder"></div>`;
    }
    
    return `
        <tr class="player-stats-row">
            <td class="player-info-cell">
                <div class="player-info">
                    <div class="player-position-badge">${positionName}</div>
                    ${seasonDisplay}
                    ${renderGradeBadge(player.spGrade)}
                    <div class="player-name">${player.spName}</div>
                </div>
            </td>
            <td class="stats-cell">${player.totalMatches}경기</td>
            <td class="stats-cell rating-${ratingColor}">${player.avgRating}</td>
            <td class="stats-cell clickable-percent" data-player-id="${player.spId}" data-stat-type="contribution" onclick="showPlayerStatPopup('${player.spId}', 'contribution', '${player.spName}')">${player.avgContributionScore}</td>
            <td class="stats-cell">${player.goals}골</td>
            <td class="stats-cell">${player.assists}개</td>
            <td class="stats-cell clickable-percent" data-player-id="${player.spId}" data-stat-type="pass" onclick="showPlayerStatPopup('${player.spId}', 'pass', '${player.spName}')">${player.passSuccessRate}%</td>
            <td class="stats-cell clickable-percent" data-player-id="${player.spId}" data-stat-type="dribble" onclick="showPlayerStatPopup('${player.spId}', 'dribble', '${player.spName}')">${player.dribbleSuccessRate}%</td>
            <td class="stats-cell clickable-percent" data-player-id="${player.spId}" data-stat-type="possession" onclick="showPlayerStatPopup('${player.spId}', 'possession', '${player.spName}')">${player.possessionSuccessRate}%</td>
            <td class="stats-cell clickable-percent" data-player-id="${player.spId}" data-stat-type="aerial" onclick="showPlayerStatPopup('${player.spId}', 'aerial', '${player.spName}')">${player.aerialSuccessRate || 0}%</td>
            <td class="stats-cell clickable-percent" data-player-id="${player.spId}" data-stat-type="defense" onclick="showPlayerStatPopup('${player.spId}', 'defense', '${player.spName}')">${player.defenseSuccessRate || 0}%</td>
        </tr>
    `;
}

// 평점에 따른 색상 반환
function getRatingColor(rating) {
    const numRating = parseFloat(rating);
    if (numRating >= 8.0) return 'rating-excellent';
    if (numRating >= 7.0) return 'rating-good';
    if (numRating >= 6.0) return 'rating-average';
    return 'rating-poor';
}

// 테이블 정렬 기능 초기화
function initializeTableSorting() {
    const sortableHeaders = document.querySelectorAll('.sortable');
    let currentSort = { column: 'avgRating', direction: 'desc' }; // 기본값: 평균 평점 내림차순
    
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            
            // 같은 컬럼을 클릭하면 방향 전환, 다른 컬럼을 클릭하면 내림차순으로 시작
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.direction = 'desc';
            }
            currentSort.column = column;
            
            // 정렬 실행
            sortPlayerTable(column, currentSort.direction);
            
            // 헤더 아이콘 업데이트
            updateSortIcons(column, currentSort.direction);
        });
    });
}

// 선수 테이블 정렬
function sortPlayerTable(column, direction) {
    const tbody = document.querySelector('.player-stats-table tbody');
    if (!tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.sort((a, b) => {
        let aValue, bValue;
        
        // 각 컬럼에 맞는 데이터 추출
        switch (column) {
            case 'totalMatches':
                aValue = parseInt(a.cells[1].textContent.replace('경기', ''));
                bValue = parseInt(b.cells[1].textContent.replace('경기', ''));
                break;
            case 'avgRating':
                aValue = parseFloat(a.cells[2].textContent);
                bValue = parseFloat(b.cells[2].textContent);
                break;
            case 'avgContributionScore':
                aValue = parseFloat(a.cells[3].textContent);
                bValue = parseFloat(b.cells[3].textContent);
                break;
            case 'goals':
                aValue = parseInt(a.cells[4].textContent.replace('골', ''));
                bValue = parseInt(b.cells[4].textContent.replace('골', ''));
                break;
            case 'assists':
                aValue = parseInt(a.cells[5].textContent.replace('개', ''));
                bValue = parseInt(b.cells[5].textContent.replace('개', ''));
                break;
            case 'passSuccessRate':
                aValue = parseInt(a.cells[6].textContent.replace('%', ''));
                bValue = parseInt(b.cells[6].textContent.replace('%', ''));
                break;
            case 'dribbleSuccessRate':
                aValue = parseInt(a.cells[7].textContent.replace('%', ''));
                bValue = parseInt(b.cells[7].textContent.replace('%', ''));
                break;
            case 'possessionSuccessRate':
                aValue = parseInt(a.cells[8].textContent.replace('%', ''));
                bValue = parseInt(b.cells[8].textContent.replace('%', ''));
                break;
            case 'aerialSuccessRate':
                aValue = parseInt(a.cells[9].textContent.replace('%', ''));
                bValue = parseInt(b.cells[9].textContent.replace('%', ''));
                break;
            case 'defenseSuccessRate':
                aValue = parseInt(a.cells[10].textContent.replace('%', ''));
                bValue = parseInt(b.cells[10].textContent.replace('%', ''));
                break;
            default:
                return 0;
        }
        
        // NaN 처리
        if (isNaN(aValue)) aValue = 0;
        if (isNaN(bValue)) bValue = 0;
        
        // 정렬 방향에 따라 비교
        if (direction === 'asc') {
            return aValue - bValue;
        } else {
            return bValue - aValue;
        }
    });
    
    // 정렬된 행들을 다시 테이블에 추가
    rows.forEach(row => tbody.appendChild(row));
}

// 정렬 아이콘 업데이트
function updateSortIcons(activeColumn, direction) {
    const sortableHeaders = document.querySelectorAll('.sortable');
    
    sortableHeaders.forEach(header => {
        const icon = header.querySelector('.sort-icon');
        const column = header.dataset.sort;
        
        if (column === activeColumn) {
            header.classList.add('active');
            icon.textContent = direction === 'asc' ? '↑' : '↓';
        } else {
            header.classList.remove('active');
            icon.textContent = '↕';
        }
    });
}

// 선택된 카드 상태 업데이트
function updateSelectedCard(selectedFormation) {
    const cards = document.querySelectorAll('.team-formation-card');
    cards.forEach(card => {
        card.classList.remove('selected');
    });
    
    // 선택된 카드에 selected 클래스 추가
    const selectedCard = document.querySelector(`[data-formation-id="${selectedFormation.formationId || 0}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
}

// 포메이션 상세 모달 생성
function createFormationDetailModal(formation) {
    const modal = document.createElement('div');
    modal.className = 'team-formation-modal-overlay';
    
    const formationName = generateFormationName(formation.players);
    
    modal.innerHTML = `
        <div class="team-formation-modal">
            <div class="team-formation-modal-header">
                <div class="team-formation-modal-title">
                    <h3>${formationName}</h3>
                    <p>동일 선수 11명 출전 • ${formation.matchCount}경기</p>
                </div>
                <button class="team-formation-modal-close">&times;</button>
            </div>
            <div class="team-formation-modal-content">
                <div class="team-formation-matches">
                    ${formation.matches.map(match => createFormationMatchItem(match)).join('')}
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

// 포메이션 경기 아이템 생성
function createFormationMatchItem(match) {
    const resultClass = match.matchResult === '승' ? 'win' : match.matchResult === '패' ? 'lose' : 'draw';
    
    return `
        <div class="team-formation-match-item">
            <div class="team-formation-match-header">
                <div class="team-formation-match-date">${formatDate(match.matchDate)}</div>
                <div class="team-formation-match-result ${resultClass}">${match.matchResult}</div>
            </div>
            <div class="team-formation-match-details">
                <div class="team-formation-match-opponent">vs 상대팀</div>
                <div class="team-formation-match-score">${getMatchScore(match.matchId)}</div>
                <div class="team-formation-match-opponent">${match.matchType === 50 ? '공식경기' : '친선경기'}</div>
            </div>
            <div class="team-formation-match-players">
                ${match.players.map(player => createFormationMatchPlayer(player)).join('')}
            </div>
        </div>
    `;
}

// 포메이션 경기 선수 아이템 생성
function createFormationMatchPlayer(player) {
    const positionName = getPositionName(player.spPosition);
    const rating = player.status.spRating || 0;
    const goals = player.status.goal || 0;
    const assists = player.status.assist || 0;
    
    return `
        <div class="team-formation-match-player">
            <img src="${player.seasonImg}" alt="${player.spName}" class="team-formation-match-player-image">
            <div class="team-formation-match-player-name">${player.spName}</div>
            <div class="team-formation-match-player-stats">
                <div class="team-formation-match-player-stat">
                    <div class="team-formation-match-player-stat-label">평점</div>
                    <div class="team-formation-match-player-stat-value rating">${rating}</div>
                </div>
                <div class="team-formation-match-player-stat">
                    <div class="team-formation-match-player-stat-label">골</div>
                    <div class="team-formation-match-player-stat-value goals">${goals}</div>
                </div>
                <div class="team-formation-match-player-stat">
                    <div class="team-formation-match-player-stat-label">어시</div>
                    <div class="team-formation-match-player-stat-value assists">${assists}</div>
                </div>
            </div>
        </div>
    `;
}

// 모달 닫기
function closeFormationDetailModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
        document.body.removeChild(modal);
    }, 300);
}

// 로딩 표시
function showTeamLoading(message = '구단별 데이터 분석 중...') {
    if (teamLoading) {
        teamLoading.style.display = 'flex';
        
        // 로딩 메시지 업데이트
        const loadingText = teamLoading.querySelector('span');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }
    
    if (teamCardsContainer) teamCardsContainer.style.display = 'none';
    if (noTeamData) noTeamData.style.display = 'none';
}

// 로딩 숨기기
function hideTeamLoading() {
    if (teamLoading) {
        teamLoading.style.display = 'none';
    }
}

// 구단별 데이터 초기화
function clearTeamData() {
    
    // 모든 컨테이너 숨기기
    if (teamLoading) teamLoading.style.display = 'none';
    if (teamCardsContainer) teamCardsContainer.style.display = 'none';
    if (noTeamData) noTeamData.style.display = 'none';
    
    // teamDetailPanel은 가이드로 초기화 (숨기지 않음)
    if (teamDetailPanel) {
        teamDetailPanel.innerHTML = `
            <div class="team-detail-placeholder">
                <div class="placeholder-icon">⚽</div>
                <h4>구단 카드를 선택하세요</h4>
                <p>위에서 구단 카드를 클릭하면 선수 데이터를 볼 수 있습니다.</p>
            </div>
        `;
    }
    
    // teamCardGuide 표시 (다른 탭에서 돌아올 때)
    if (teamCardGuide) {
        teamCardGuide.style.display = 'block';
    }
    
    // 최고의 선수 섹션 숨기기
    const topPlayersSection = document.getElementById('topPlayersSection');
    if (topPlayersSection) {
        topPlayersSection.style.display = 'none';
    }
    
    // 카드 컨테이너 비우기
    if (teamCardsContainer) {
        teamCardsContainer.innerHTML = '';
    }
    
    // teamLayout 숨기기
    const teamLayout = document.getElementById('teamLayout');
    if (teamLayout) {
        teamLayout.style.display = 'none';
    }
    
    // teamCardsTrack 비우기
    const teamCardsTrack = document.getElementById('teamCardsTrack');
    if (teamCardsTrack) {
        teamCardsTrack.innerHTML = '';
        teamCardsTrack.style.transform = 'translateX(0%)';
    }
    
    // topPlayersTrack 비우기
    const topPlayersTrack = document.getElementById('topPlayersTrack');
    if (topPlayersTrack) {
        topPlayersTrack.innerHTML = '';
        topPlayersTrack.style.transform = 'translateX(0%)';
    }
    
    // 상세 패널 초기화는 위에서 이미 처리됨
    
    // 데이터 변수 초기화
    teamFormationData = {};
    
    // 슬라이더 변수 초기화
    currentSlideIndex = 0;
    totalSlides = 0;
    topPlayersCurrentSlideIndex = 0;
    topPlayersTotalSlides = 0;
    
    // 슬라이더 버튼 상태 초기화
    const teamSliderPrevBtn = document.getElementById('teamSliderPrevBtn');
    const teamSliderNextBtn = document.getElementById('teamSliderNextBtn');
    const topPlayersPrevBtn = document.getElementById('topPlayersPrevBtn');
    const topPlayersNextBtn = document.getElementById('topPlayersNextBtn');
    
    if (teamSliderPrevBtn) teamSliderPrevBtn.disabled = true;
    if (teamSliderNextBtn) teamSliderNextBtn.disabled = true;
    if (topPlayersPrevBtn) {
        topPlayersPrevBtn.disabled = true;
        topPlayersPrevBtn.style.display = 'none';
    }
    if (topPlayersNextBtn) {
        topPlayersNextBtn.disabled = true;
        topPlayersNextBtn.style.display = 'none';
    }
    
}

// 데이터 없음 표시
function showNoTeamData() {
    hideTeamLoading();
    teamCardsContainer.style.display = 'none';
    noTeamData.style.display = 'block';
}

// 포지션 이름 변환

// 경기 점수 가져오기 (간단한 구현)
function getMatchScore(matchId) {
    // 실제로는 경기 상세 정보에서 점수를 가져와야 함
    // 임시로 랜덤 점수 반환
    const scores = ['1-0', '2-1', '3-2', '2-0', '1-1', '0-1', '1-2'];
    return scores[Math.floor(Math.random() * scores.length)];
}

// 날짜 포맷팅
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// 구단별 데이터용 최고의 선수 데이터 표시
function displayTeamTopPlayers(matches) {
    
    const playerStats = {};
    
    // 모든 경기에서 선수 통계 수집
    matches.forEach(match => {
        if (match.userPlayers) {
            match.userPlayers.forEach(player => {
                if (player.status && player.status.spRating) {
                    const playerId = player.spId;
                    const playerName = player.spName;
                    
                    if (!playerStats[playerId]) {
                        playerStats[playerId] = {
                            name: playerName,
                            spId: playerId,
                            seasonId: player.seasonId || player.spId || 'default',
                            season: player.season || null, // season 정보 추가
                            goals: 0,
                            assists: 0,
                            appearances: 0,
                            totalRating: 0,
                            avgRating: 0,
                            // 슈팅 관련 통계
                            totalShots: 0,
                            effectiveShots: 0,
                            // 패스 관련 통계
                            passTry: 0,
                            // 수비 관련 통계
                            blocks: 0,
                            blockTry: 0,
                            tackles: 0,
                            tackleTry: 0,
                            intercepts: 0,
                            // 공중볼 관련 통계
                            aerialDuels: 0,
                            aerialDuelsWon: 0,
                            // 멀티 기여도 통계
                            multiContribution: 0
                        };
                    }
                    
                    // 통계 누적
                    playerStats[playerId].goals += player.status.goal || 0;
                    playerStats[playerId].assists += player.status.assist || 0;
                    playerStats[playerId].appearances += 1;
                    playerStats[playerId].totalRating += player.status.spRating || 0;
                    
                    // 슈팅 관련 통계
                    playerStats[playerId].totalShots += player.status.shoot || 0;
                    playerStats[playerId].effectiveShots += player.status.effectiveShoot || 0;
                    
                    // 패스 관련 통계
                    playerStats[playerId].passTry += player.status.passTry || 0;
                    
                    // 수비 관련 통계
                    playerStats[playerId].blocks += player.status.blockSuccess || player.status.block || 0;
                    playerStats[playerId].blockTry += player.status.blockTry || 0;
                    playerStats[playerId].tackles += player.status.tackleSuccess || player.status.tackle || 0;
                    playerStats[playerId].tackleTry += player.status.tackleTry || 0;
                    playerStats[playerId].intercepts += player.status.intercept || 0;
                    
                    // 공중볼 관련 통계 (API에서 제공하는 정확한 필드명 사용)
                    const aerialTry = player.status.aerialTry || 0;
                    const aerialSuccess = player.status.aerialSuccess || 0;
                    playerStats[playerId].aerialDuels += aerialTry;
                    playerStats[playerId].aerialDuelsWon += aerialSuccess;
                    
                    // 멀티 기여도 통계 (골 + 어시스트 + 블록 + 태클 + 인터셉트)
                    const multiContribution = (player.status.goal || 0) + 
                                           (player.status.assist || 0) + 
                                           (player.status.blockSuccess || player.status.block || 0) + 
                                           (player.status.tackleSuccess || player.status.tackle || 0) + 
                                           (player.status.intercept || 0);
                    playerStats[playerId].multiContribution += multiContribution;
                    
                    // 디버깅: 공중볼 데이터 확인
                    if (aerialTry > 0 || aerialSuccess > 0) {
                    }
                    
                    // 디버깅: 공중볼 데이터 확인 (처음 몇 명만)
                    if (playerId === Object.keys(playerStats)[0]) {
                    }
                }
            });
        }
    });
    
    // 평균 평점 및 성공률 계산
    Object.values(playerStats).forEach(player => {
        player.avgRating = player.appearances > 0 ? (player.totalRating / player.appearances).toFixed(1) : 0;
        
        // 득점 성공률 계산
        player.goalSuccessRate = player.totalShots > 0 ? Math.round((player.goals / player.totalShots) * 100) : 0;
        
        // 도움 성공률 계산 (어시스트/패스시도)
        player.assistSuccessRate = player.passTry > 0 ? Math.round((player.assists / player.passTry) * 100) : 0;
        
        // 수비 성공률 계산 (블록 + 태클 + 인터셉트)
        // 인터셉트는 시도 횟수가 없으므로 별도 처리
        const totalDefenseTry = player.blockTry + player.tackleTry;
        const totalDefenseSuccess = player.blocks + player.tackles + player.intercepts;
        
        // 인터셉트가 있는 경우 가중치 적용 (인터셉트는 100% 성공으로 간주)
        if (player.intercepts > 0) {
            // 인터셉트를 시도 횟수에 추가 (인터셉트 시도 = 인터셉트 성공)
            const adjustedDefenseTry = totalDefenseTry + player.intercepts;
            const adjustedDefenseSuccess = totalDefenseSuccess;
            player.defenseSuccessRate = adjustedDefenseTry > 0 ? Math.round((adjustedDefenseSuccess / adjustedDefenseTry) * 100) : 0;
        } else {
            player.defenseSuccessRate = totalDefenseTry > 0 ? Math.round((totalDefenseSuccess / totalDefenseTry) * 100) : 0;
        }
        
        // 공중볼 성공률 계산 (aerialSuccess/aerialTry)
        player.aerialSuccessRate = player.aerialDuels > 0 ? Math.round((player.aerialDuelsWon / player.aerialDuels) * 100) : 0;
        
        // 멀티 기여도 계산 (경기당 평균)
        player.multiContributionRate = player.appearances > 0 ? (player.multiContribution / player.appearances).toFixed(1) : 0;
    });
    
    // 최고의 선수들 찾기
    const players = Object.values(playerStats);
    
    if (players.length === 0) {
        return;
    }
    
    // 각 분야별 Top 4 선수들
    const topRated = players
        .sort((a, b) => parseFloat(b.avgRating) - parseFloat(a.avgRating))
        .slice(0, 4);
    
    const topScorers = players
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 4);
    
    const topAssisters = players
        .sort((a, b) => b.assists - a.assists)
        .slice(0, 4);
    
    // 수비 성공률 디버깅
    const defensePlayers = players.filter(p => p.blocks > 0 || p.tackles > 0 || p.intercepts > 0);
    
    const topDefenseSuccess = players
        .filter(p => p.defenseSuccessRate > 0)
        .sort((a, b) => b.defenseSuccessRate - a.defenseSuccessRate)
        .slice(0, 4);
    
    
    const topGoalSuccess = players
        .filter(p => p.goalSuccessRate > 0)
        .sort((a, b) => b.goalSuccessRate - a.goalSuccessRate)
        .slice(0, 4);
    
    const topAssistSuccess = players
        .filter(p => p.assistSuccessRate > 0)
        .sort((a, b) => b.assistSuccessRate - a.assistSuccessRate)
        .slice(0, 4);
    
    // 공중볼 성공률 디버깅
    const aerialPlayers = players.filter(p => p.aerialDuels > 0 || p.aerialDuelsWon > 0);
    
    const topMultiContribution = players
        .filter(p => p.multiContribution > 0) // 멀티 기여도가 있는 선수들만
        .sort((a, b) => parseFloat(b.multiContributionRate) - parseFloat(a.multiContributionRate))
        .slice(0, 4);
    
    let topAerialSuccess = players
        .filter(p => p.aerialDuels > 0) // 공중볼 시도가 있는 선수들만
        .sort((a, b) => b.aerialSuccessRate - a.aerialSuccessRate)
        .slice(0, 4);
    
    // 공중볼 데이터가 없는 경우 모든 선수를 표시 (0% 성공률로)
    if (topAerialSuccess.length === 0) {
        topAerialSuccess = players
            .sort((a, b) => b.aerialSuccessRate - a.aerialSuccessRate)
            .slice(0, 4);
    }
    
    
    // 슬라이드 데이터 생성
    const slides = [
        {
            title: '⭐ 최고 평점',
            icon: '⭐',
            players: topRated.map((player, index) => {
                return {
                    name: player.name,
                    stats: `${player.avgRating}점`,
                    rank: index + 1,
                    spId: player.spId,
                    seasonId: player.seasonId || player.spId || 'default',
                    season: player.season
                };
            })
        },
        {
            title: '⚽ 최다 득점',
            icon: '⚽',
            players: topScorers.map((player, index) => ({
                name: player.name,
                stats: `${player.goals}골`,
                rank: index + 1,
                spId: player.spId,
                seasonId: player.seasonId || 'default',
                season: player.season
            }))
        },
        {
            title: '🅰️ 최다 도움',
            icon: '🅰️',
            players: topAssisters.map((player, index) => ({
                name: player.name,
                stats: `${player.assists}도움`,
                rank: index + 1,
                spId: player.spId,
                seasonId: player.seasonId || 'default',
                season: player.season
            }))
        },
        {
            title: '🛡️ 수비 성공',
            icon: '🛡️',
            players: topDefenseSuccess.map((player, index) => ({
                name: player.name,
                stats: `${player.defenseSuccessRate}%`,
                rank: index + 1,
                spId: player.spId,
                seasonId: player.seasonId || 'default',
                season: player.season
            }))
        },
        {
            title: '🏆 멀티 기여도',
            icon: '🏆',
            players: topMultiContribution.map((player, index) => ({
                name: player.name,
                stats: `${player.multiContributionRate}점`,
                rank: index + 1,
                spId: player.spId,
                seasonId: player.seasonId || 'default',
                season: player.season
            }))
        },
        {
            title: '🎯 득점 성공률',
            icon: '🎯',
            players: topGoalSuccess.map((player, index) => ({
                name: player.name,
                stats: `${player.goalSuccessRate}%`,
                rank: index + 1,
                spId: player.spId,
                seasonId: player.seasonId || 'default',
                season: player.season
            }))
        },
        {
            title: '📊 도움 성공률',
            icon: '📊',
            players: topAssistSuccess.map((player, index) => ({
                name: player.name,
                stats: `${player.assistSuccessRate}%`,
                rank: index + 1,
                spId: player.spId,
                seasonId: player.seasonId || 'default',
                season: player.season
            }))
        },
        {
            title: '💥 공중볼 성공률',
            icon: '💥',
            players: topAerialSuccess.map((player, index) => ({
                name: player.name,
                stats: `${player.aerialSuccessRate || 0}%`,
                rank: index + 1,
                spId: player.spId,
                seasonId: player.seasonId || 'default',
                season: player.season
            }))
        }
    ];
    
    // 슬라이더 상태 초기화
    topPlayersCurrentSlideIndex = 0;
    topPlayersTotalSlides = slides.length;
    
    // 슬라이더 생성
    createTopPlayersSlider(slides);
    
    // 실제 경기 수 업데이트
    const actualMatchCount = document.getElementById('actualMatchCount');
    if (actualMatchCount) {
        actualMatchCount.textContent = matches.length;
    }
    
    // 섹션 표시
    const topPlayersSection = document.getElementById('topPlayersSection');
    if (topPlayersSection) {
        topPlayersSection.style.display = 'block';
    }
    
}

// 최고의 선수 슬라이더 생성
function createTopPlayersSlider(slides) {
    const track = document.getElementById('topPlayersTrack');
    if (!track) return;
    
    // 기존 내용 초기화
    track.innerHTML = '';
    
    // 슬라이드 생성 (4개씩 그룹화)
    const slidesPerView = 4;
    topPlayersTotalSlides = Math.ceil(slides.length / slidesPerView);
    topPlayersCurrentSlideIndex = 0;
    
    // 슬라이더 트랙 위치 초기화
    track.style.transform = 'translateX(0%)';
    
    for (let i = 0; i < topPlayersTotalSlides; i++) {
        const slideElement = document.createElement('div');
        slideElement.className = 'top-players-slide';
        
        const startIndex = i * slidesPerView;
        const endIndex = Math.min(startIndex + slidesPerView, slides.length);
        const slideData = slides.slice(startIndex, endIndex);
        
        slideElement.innerHTML = slideData.map(slide => `
            <div class="top-player-category">
                <h5>${slide.title}</h5>
                <div class="top-players-list">
                            ${slide.players.map((player, index) => {
                                if (index === 0) {
                                    // 1등 - 사진 표시
                                    return `
                                        <div class="top-player-item first-place">
                                            <img src="https://fo4.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${player.spId || 'default'}.png" 
                                                 alt="${player.name}" 
                                                 class="player-image" 
                                                 onerror="this.src='https://fo4.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p100000000.png'">
                                            <div class="player-info">
                                                ${player.season?.seasonImg ? `<img src="${player.season.seasonImg}" alt="시즌" class="season-badge" onerror="this.style.display='none'"/>` : ''}
                                                <div class="player-name">${player.name}</div>
                                            </div>
                                            <div class="player-stats">${player.stats}</div>
                                        </div>
                                    `;
                                } else {
                                    // 2-4등 - 시즌이미지+이름 (순위 텍스트 제거)
                                    return `
                                        <div class="top-player-item">
                                            <div class="player-info">
                                                ${player.season?.seasonImg ? `<img src="${player.season.seasonImg}" alt="시즌" class="season-badge" onerror="this.style.display='none'"/>` : ''}
                                                <div class="player-name">${player.name}</div>
                                            </div>
                                            <div class="player-stats">${player.stats}</div>
                                        </div>
                                    `;
                                }
                            }).join('')}
                </div>
            </div>
        `).join('');
        
        track.appendChild(slideElement);
    }
    
    // 슬라이더 이벤트 리스너 설정
    setupTopPlayersSlider();
    
    // 슬라이더 버튼 상태 초기화 및 표시
    const prevBtn = document.getElementById('topPlayersPrevBtn');
    const nextBtn = document.getElementById('topPlayersNextBtn');
    
    if (prevBtn) {
        prevBtn.disabled = true;
        prevBtn.style.display = topPlayersTotalSlides > 1 ? 'flex' : 'none';
    }
    if (nextBtn) {
        nextBtn.disabled = topPlayersTotalSlides <= 1;
        nextBtn.style.display = topPlayersTotalSlides > 1 ? 'flex' : 'none';
    }
}

// 최고의 선수 슬라이더 이벤트 리스너 설정
function setupTopPlayersSlider() {
    const prevBtn = document.getElementById('topPlayersPrevBtn');
    const nextBtn = document.getElementById('topPlayersNextBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (topPlayersCurrentSlideIndex > 0) {
                topPlayersCurrentSlideIndex--;
                updateTopPlayersSliderPosition();
                updateTopPlayersSliderButtons();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (topPlayersCurrentSlideIndex < topPlayersTotalSlides - 1) {
                topPlayersCurrentSlideIndex++;
                updateTopPlayersSliderPosition();
                updateTopPlayersSliderButtons();
            }
        });
    }
    
    // 초기 버튼 상태 설정
    updateTopPlayersSliderButtons();
}

// 최고의 선수 슬라이더 위치 업데이트
function updateTopPlayersSliderPosition() {
    const track = document.getElementById('topPlayersTrack');
    if (!track) return;
    
    const slideWidth = 100; // 100% per slide
    const translateX = -topPlayersCurrentSlideIndex * slideWidth;
    track.style.transform = `translateX(${translateX}%)`;
}

// 최고의 선수 슬라이더 버튼 상태 업데이트
function updateTopPlayersSliderButtons() {
    const prevBtn = document.getElementById('topPlayersPrevBtn');
    const nextBtn = document.getElementById('topPlayersNextBtn');
    
    if (prevBtn) {
        prevBtn.disabled = topPlayersCurrentSlideIndex === 0;
    }
    
    if (nextBtn) {
        nextBtn.disabled = topPlayersCurrentSlideIndex === topPlayersTotalSlides - 1;
    }
}

// 최고의 선수 요소 업데이트 (기존 함수 유지)
function updateTopPlayerElement(elementId, playerName, stats) {
    const element = document.getElementById(elementId);
    if (element) {
        const nameElement = element.querySelector('.player-name');
        const statsElement = element.querySelector('.player-stats');
        
        if (nameElement) nameElement.textContent = playerName;
        if (statsElement) statsElement.textContent = stats;
    }
}

// 포메이션 분석 함수들

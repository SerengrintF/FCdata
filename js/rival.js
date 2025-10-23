// ========================================
// 라이벌 매치 탭 전용 JavaScript
// ========================================

class RivalMatchManager {
    constructor() {
        this.currentUserInfo = null;
        this.rivalNickname = null;
        this.rivalMatches = [];
        this.isLoaded = false;
        this.rivalOffset = 10; // 더보기용 offset
        this.allMatchIds = []; // 전체 매치 ID 저장
    }

    // 라이벌 매치 컨테이너 초기화
    initRivalMatchContent() {
        const container = document.getElementById('rival-container');
        
        if (!container) {
            return;
        }

        // 이미 렌더링된 상태라면 다시 렌더링하지 않음 (데이터 유지)
        if (container.innerHTML.trim() !== '') {
            return;
        }

        // 검색 UI 표시
        this.renderSearchUI();
    }

    // 검색 UI 렌더링
    renderSearchUI() {
        const container = document.getElementById('rival-container');
        
        container.innerHTML = `
            <div class="rival-match-content">
                <!-- 검색 헤더 -->
                <div class="rival-header">
                    <h2>라이벌 매치</h2>
                    <p class="rival-description">특정 상대방과의 경기 기록을 확인하세요</p>
                </div>

                <!-- 검색 박스 -->
                <div class="rival-search-box">
                    <div class="search-input-wrapper">
                        <input 
                            type="text" 
                            id="rivalNicknameInput" 
                            class="rival-search-input" 
                            placeholder="상대방 닉네임을 입력하세요"
                            autocomplete="off"
                        >
                        <button id="rivalSearchBtn" class="rival-search-btn">
                            <span>🔍</span>
                            <span>검색</span>
                        </button>
                    </div>
                    <p class="search-hint">💡 상대방의 닉네임을 정확히 입력하세요</p>
                </div>

                <!-- 결과 컨테이너 -->
                <div id="rivalResultContainer" class="rival-result-container" style="display: none;">
                    <!-- 통계 요약 -->
                    <div id="rivalStats" class="rival-stats-section"></div>
                    
                    <!-- 비교 차트 -->
                    <div id="rivalComparison" class="rival-comparison-section"></div>
                    
                    <!-- 경기 기록 -->
                    <div id="rivalMatchList" class="rival-match-list"></div>
                </div>

                <!-- 안내 메시지 -->
                <div id="rivalGuideMessage" class="rival-guide-message">
                    <div class="guide-icon">🎮</div>
                    <p>특정 상대방과의 모든 경기 기록을 확인할 수 있습니다</p>
                    <ul class="guide-list">                        
                        <li>✅ 전체 전적 및 통계 확인</li>
                        <li>✅ 경기별 상세 정보 제공</li>                    
                    </ul>
                </div>
            </div>
        `;
        
        // 이벤트 리스너 등록
        this.attachSearchEvents();
    }

    // 검색 이벤트 등록
    attachSearchEvents() {
        const searchBtn = document.getElementById('rivalSearchBtn');
        const searchInput = document.getElementById('rivalNicknameInput');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchRivalMatches();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchRivalMatches();
                }
            });
        }
    }

    // 라이벌 매치 검색
    async searchRivalMatches() {
        const rivalInput = document.getElementById('rivalNicknameInput');
        const rivalNickname = rivalInput?.value.trim();

        if (!rivalNickname) {
            this.showError('상대방 닉네임을 입력해주세요');
            return;
        }

        // 현재 사용자 정보 확인 (전역 변수에서 가져오기)
        this.currentUserInfo = typeof currentUserInfo !== 'undefined' ? currentUserInfo : null;
        
        if (!this.currentUserInfo || !this.currentUserInfo.ouid) {
            this.showError('먼저 내 닉네임을 검색해주세요');
            return;
        }

        // 로딩 표시
        this.showLoading();
        this.rivalNickname = rivalNickname;
        this.rivalOffset = 10; // offset 초기화

        try {
            // 여러 매치 타입의 경기 가져오기 (50, 40, 204, 214, 224)
            const response = await fetch(`/api/rival-matches/${this.currentUserInfo.ouid}`);
            
            if (!response.ok) {
                throw new Error('경기 데이터를 가져오는데 실패했습니다');
            }

            const data = await response.json();
            const allMatches = data.matches || [];

            // 라이벌과의 경기만 필터링
            this.rivalMatches = allMatches.filter(match => {
                const opponentName = match.opponentNickname || '';
                return opponentName.toLowerCase() === rivalNickname.toLowerCase();
            });

            if (this.rivalMatches.length === 0) {
                this.showNoMatches();
                return;
            }

            // 결과 렌더링
            this.renderRivalMatches();
        } catch (error) {
            this.showError('경기 기록을 불러오는데 실패했습니다');
            this.removeLoading();
        }
    }

    // 로딩 표시
    showLoading() {
        const guideMessage = document.getElementById('rivalGuideMessage');
        const resultContainer = document.getElementById('rivalResultContainer');
        
        if (guideMessage) guideMessage.style.display = 'none';
        if (resultContainer) resultContainer.style.display = 'none';

        const container = document.getElementById('rival-container');
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'rivalLoading';
        loadingDiv.className = 'rival-loading';
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <p>경기 기록을 검색하는 중...</p>
        `;
        container.querySelector('.rival-match-content').appendChild(loadingDiv);
    }

    // 로딩 제거
    removeLoading() {
        const loading = document.getElementById('rivalLoading');
        if (loading) loading.remove();
    }

    // 경기 없음 표시
    showNoMatches() {
        this.removeLoading();
        const guideMessage = document.getElementById('rivalGuideMessage');
        if (guideMessage) {
            guideMessage.innerHTML = `
                <div class="guide-icon">😕</div>
                <h3>경기 기록이 없습니다</h3>
                <p><strong>${this.rivalNickname}</strong>님과의 경기 기록을 찾을 수 없습니다</p>
                <p class="hint-text">닉네임을 정확히 입력했는지 확인해주세요</p>
            `;
            guideMessage.style.display = 'block';
        }
    }

    // 에러 표시
    showError(message) {
        const guideMessage = document.getElementById('rivalGuideMessage');
        if (guideMessage) {
            guideMessage.innerHTML = `
                <div class="guide-icon">⚠️</div>
                <h3>알림</h3>
                <p>${message}</p>
            `;
            guideMessage.style.display = 'block';
        }
    }

    // 라이벌 매치 결과 렌더링
    renderRivalMatches() {
        this.removeLoading();
        
        const guideMessage = document.getElementById('rivalGuideMessage');
        const resultContainer = document.getElementById('rivalResultContainer');
        
        if (guideMessage) guideMessage.style.display = 'none';
        if (resultContainer) resultContainer.style.display = 'block';

        // 통계 계산
        const stats = this.calculateRivalStats();
        
        // 통계 렌더링
        this.renderRivalStats(stats);
        
        // 비교 차트 렌더링
        this.renderComparisonChart();
        
        // 승리를 위한 솔루션 카드 렌더링 (비교 차트와 경기기록 사이)
        this.renderVictorySolutionCard();
        
        // 경기 목록 렌더링 (대시보드 스타일 사용)
        this.renderMatchList();
    }

    // 승리를 위한 솔루션 카드 렌더링
    renderVictorySolutionCard() {
        const resultContainer = document.getElementById('rivalResultContainer');
        const matchListContainer = document.getElementById('rivalMatchList');
        
        // 솔루션 카드 HTML 생성
        const solutionCard = document.createElement('div');
        solutionCard.className = 'victory-solution-card';
        solutionCard.innerHTML = this.createVictorySolutionHTML();
        
        // 경기 목록 컨테이너 앞에 삽입 (비교 차트와 경기기록 사이)
        if (matchListContainer) {
            resultContainer.insertBefore(solutionCard, matchListContainer);
        } else {
            // 경기 목록이 아직 렌더링되지 않은 경우 맨 끝에 추가
            resultContainer.appendChild(solutionCard);
        }
    }

    // 승리 솔루션 HTML 생성
    createVictorySolutionHTML() {
        const analysis = this.analyzeVictoryData();
        
        return `
            <div class="victory-solution-header">
                <span class="victory-solution-icon">🎯</span>
                <h3>승리를 위한 솔루션</h3>
            </div>
            <div class="victory-solution-content">
                ${this.createFormationRecommendation(analysis)}
                ${this.createPlayerRecommendation(analysis)}
                ${this.createPlayStyleRecommendation(analysis)}
            </div>
        `;
    }

    // 포메이션 추천 생성
    createFormationRecommendation(analysis) {
        const bestFormation = analysis.bestFormation;
        const formationStats = analysis.formationStats[bestFormation];
        
        return `
            <div class="solution-item">
                <div class="solution-item-header">
                    <span class="solution-item-icon">⚽</span>
                    <span class="solution-item-title">추천 포메이션</span>
                </div>
                <div class="solution-item-content">
                    <strong>${bestFormation}</strong> 포메이션을 사용하세요
                    <div class="solution-stats">
                        <div class="solution-stat">
                            <div class="solution-stat-value">${formationStats.winRate}%</div>
                            <div class="solution-stat-label">승률</div>
                        </div>
                        <div class="solution-stat">
                            <div class="solution-stat-value">${formationStats.matches}</div>
                            <div class="solution-stat-label">경기수</div>
                        </div>
                    </div>
                    <div class="solution-recommendation">
                        <div class="solution-recommendation-title">💡 추천 이유</div>
                        <div class="solution-recommendation-text">
                            ${this.getFormationAdvice(bestFormation, formationStats)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 선수 추천 생성
    createPlayerRecommendation(analysis) {
        const topPlayers = analysis.topPlayers.slice(0, 3);
        
        // 선수 데이터가 없는 경우 대체 메시지
        if (topPlayers.length === 0) {
            return `
                <div class="solution-item">
                    <div class="solution-item-header">
                        <span class="solution-item-icon">⭐</span>
                        <span class="solution-item-title">추천 선수</span>
                    </div>
                    <div class="solution-item-content">
                        <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                            <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
                            <div>선수 데이터를 불러올 수 없습니다.</div>
                            <div style="font-size: 12px; margin-top: 4px;">
                                경기 상세 정보를 확인해보세요.
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="solution-item">
                <div class="solution-item-header">
                    <span class="solution-item-icon">⭐</span>
                    <span class="solution-item-title">추천 선수</span>
                </div>
                <div class="solution-item-content">
                    ${topPlayers.map(player => `
                        <div style="margin-bottom: 8px;">
                            <strong>${player.name}</strong> - ${player.position}
                            <div style="font-size: 12px; color: var(--text-secondary);">
                                평균 평점: ${player.avgRating} | 경기수: ${player.matches}
                            </div>
                        </div>
                    `).join('')}
                    <div class="solution-recommendation">
                        <div class="solution-recommendation-title">💡 활용 팁</div>
                        <div class="solution-recommendation-text">
                            ${this.getPlayerAdvice(topPlayers)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 플레이 스타일 추천 생성
    createPlayStyleRecommendation(analysis) {
        const improvements = analysis.improvements;
        
        return `
            <div class="solution-item">
                <div class="solution-item-header">
                    <span class="solution-item-icon">📊</span>
                    <span class="solution-item-title">개선 포인트</span>
                </div>
                <div class="solution-item-content">
                    ${improvements.map(improvement => `
                        <div class="improvement-item">
                            <strong>${improvement.category}</strong>
                            <div style="font-size: 13px; margin-top: 4px;">
                                ${improvement.description}
                            </div>
                            <div style="font-size: 12px; color: #34c759; margin-top: 4px;">
                                목표: ${improvement.target}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // 라이벌 통계 계산
    calculateRivalStats() {
        let wins = 0;
        let draws = 0;
        let losses = 0;
        let totalGoals = 0;
        let totalConceded = 0;

        this.rivalMatches.forEach(match => {
            const result = match.matchResult || 0;
            if (result === 1) wins++;
            else if (result === 2) losses++;
            else draws++;

            totalGoals += match.userGoals || 0;
            totalConceded += match.opponentGoals || 0;
        });

        const totalMatches = this.rivalMatches.length;
        const winRate = totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : 0;

        return {
            totalMatches,
            wins,
            draws,
            losses,
            winRate,
            totalGoals,
            totalConceded,
            avgGoals: (totalGoals / totalMatches).toFixed(1),
            avgConceded: (totalConceded / totalMatches).toFixed(1)
        };
    }

    // 통계 렌더링
    renderRivalStats(stats) {
        const statsContainer = document.getElementById('rivalStats');
        
        // 매치 타입별 분류
        const matchTypeStats = {};
        this.rivalMatches.forEach(match => {
            const typeInfo = this.getMatchTypeInfo(match.matchType);
            const typeName = typeInfo.name;
            if (!matchTypeStats[typeName]) {
                matchTypeStats[typeName] = { count: 0, icon: typeInfo.icon, color: typeInfo.color };
            }
            matchTypeStats[typeName].count++;
        });

        const matchTypeHTML = Object.entries(matchTypeStats)
            .map(([name, info]) => 
                `<span class="match-type-stat" style="background: ${info.color}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; margin-right: 6px; display: inline-block; margin-bottom: 4px;">
                    ${info.icon} ${name} ${info.count}
                </span>`
            ).join('');
        
        statsContainer.innerHTML = `
            <div class="rival-stats-header">
                <h3>⚔️ vs ${this.rivalNickname}</h3>
                    </div>
            <div class="match-type-summary" style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color);">
                ${matchTypeHTML}
                            </div>
            <div class="rival-stats-content">
                <div class="stat-card win">
                    <div class="stat-label">승리</div>
                    <div class="stat-value">${stats.wins}</div>
                        </div>
                <div class="stat-card draw">
                    <div class="stat-label">무승부</div>
                    <div class="stat-value">${stats.draws}</div>
                            </div>
                <div class="stat-card lose">
                    <div class="stat-label">패배</div>
                    <div class="stat-value">${stats.losses}</div>
                            </div>
                <div class="stat-card highlight">
                    <div class="stat-label">승률</div>
                    <div class="stat-value">${stats.winRate}%</div>
                            </div>
                        </div>
            <div class="rival-stats-detail">
                <div class="detail-item">
                    <span class="detail-label">평균 득점</span>
                    <span class="detail-value">${stats.avgGoals}골</span>
                            </div>
                <div class="detail-item">
                    <span class="detail-label">평균 실점</span>
                    <span class="detail-value">${stats.avgConceded}골</span>
                    </div>
                <div class="detail-item">
                    <span class="detail-label">총 득점</span>
                    <span class="detail-value">${stats.totalGoals}골</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">총 실점</span>
                    <span class="detail-value">${stats.totalConceded}골</span>
                    </div>
                </div>
        `;
    }

    // 비교 차트 렌더링
    renderComparisonChart() {
        const comparisonContainer = document.getElementById('rivalComparison');
        
        // 나와 라이벌의 평균 통계 계산
        const comparison = this.calculateComparison();
        
        comparisonContainer.innerHTML = `
            <div class="comparison-header">
                <h3>📊 나 vs ${this.rivalNickname} 비교</h3>
            </div>
            <div class="comparison-content">
                ${this.createComparisonBar('점유율', comparison.myPossession, comparison.rivalPossession, '%')}
                ${this.createComparisonBar('슈팅 수', comparison.myShots, comparison.rivalShots, '개')}
                ${this.createComparisonBar('슈팅 정확도', comparison.myAccuracy, comparison.rivalAccuracy, '%')}
                ${this.createComparisonBar('패스 성공률', comparison.myPassRate, comparison.rivalPassRate, '%')}
            </div>
            <div class="comparison-summary">
                <div class="summary-item advantage">
                    <span class="summary-label">✅ 내가 우세한 부분</span>
                    <span class="summary-value">${comparison.advantages.join(', ') || '없음'}</span>
                </div>
                <div class="summary-item weakness">
                    <span class="summary-label">❌ 개선이 필요한 부분</span>
                    <span class="summary-value">${comparison.weaknesses.join(', ') || '없음'}</span>
                </div>
            </div>
        `;
    }

    // 비교 바 생성
    createComparisonBar(label, myValue, rivalValue, unit) {
        const myPercent = myValue + rivalValue > 0 ? (myValue / (myValue + rivalValue) * 100) : 50;
        const rivalPercent = 100 - myPercent;
        
        const isAdvantage = myValue > rivalValue;
        const isDraw = Math.abs(myValue - rivalValue) < 0.01;
        
        return `
            <div class="comparison-row">
                <div class="comparison-label">${label}</div>
                <div class="comparison-bars">
                    <div class="comparison-bar-container">
                        <div class="comparison-bar my-bar ${isAdvantage ? 'advantage' : ''}" style="width: ${myPercent}%">
                            <span class="bar-value">${myValue}${unit}</span>
                        </div>
                    </div>
                    <div class="comparison-vs">VS</div>
                    <div class="comparison-bar-container rival">
                        <div class="comparison-bar rival-bar ${!isAdvantage && !isDraw ? 'advantage' : ''}" style="width: ${rivalPercent}%">
                            <span class="bar-value">${rivalValue}${unit}</span>
                        </div>
                    </div>
                </div>
                <div class="comparison-result">
                    ${isAdvantage ? '✅' : isDraw ? '➖' : '❌'}
                </div>
            </div>
        `;
    }

    // 비교 통계 계산
    calculateComparison() {
        let myTotalPossession = 0;
        let myTotalShots = 0;
        let myTotalEffectiveShots = 0;
        let myTotalPassSuccess = 0;
        let myTotalPassTry = 0;
        
        let rivalTotalPossession = 0;
        let rivalTotalShots = 0;
        let rivalTotalEffectiveShots = 0;
        let rivalTotalPassSuccess = 0;
        let rivalTotalPassTry = 0;
        
        this.rivalMatches.forEach(match => {
            const userStats = match.userStats || {};
            const opponentStats = match.opponentStats || {};
            
            // 내 통계
            myTotalPossession += userStats.possession || 0;
            myTotalShots += userStats.shoot?.shootTotal || 0;
            myTotalEffectiveShots += userStats.shoot?.effectiveShootTotal || 0;
            myTotalPassSuccess += userStats.pass?.passSuccess || 0;
            myTotalPassTry += userStats.pass?.passTry || 0;
            
            // 라이벌 통계
            rivalTotalPossession += opponentStats.possession || 0;
            rivalTotalShots += opponentStats.shoot?.shootTotal || 0;
            rivalTotalEffectiveShots += opponentStats.shoot?.effectiveShootTotal || 0;
            rivalTotalPassSuccess += opponentStats.pass?.passSuccess || 0;
            rivalTotalPassTry += opponentStats.pass?.passTry || 0;
        });
        
        const matchCount = this.rivalMatches.length;
        
        const myPossession = matchCount > 0 ? (myTotalPossession / matchCount).toFixed(1) : 0;
        const rivalPossession = matchCount > 0 ? (rivalTotalPossession / matchCount).toFixed(1) : 0;
        
        const myShots = matchCount > 0 ? (myTotalShots / matchCount).toFixed(1) : 0;
        const rivalShots = matchCount > 0 ? (rivalTotalShots / matchCount).toFixed(1) : 0;
        
        const myAccuracy = myTotalShots > 0 ? (myTotalEffectiveShots / myTotalShots * 100).toFixed(1) : 0;
        const rivalAccuracy = rivalTotalShots > 0 ? (rivalTotalEffectiveShots / rivalTotalShots * 100).toFixed(1) : 0;
        
        const myPassRate = myTotalPassTry > 0 ? (myTotalPassSuccess / myTotalPassTry * 100).toFixed(1) : 0;
        const rivalPassRate = rivalTotalPassTry > 0 ? (rivalTotalPassSuccess / rivalTotalPassTry * 100).toFixed(1) : 0;
        
        // 강점과 약점 분석
        const advantages = [];
        const weaknesses = [];
        
        if (parseFloat(myPossession) > parseFloat(rivalPossession)) advantages.push('점유율');
        else if (parseFloat(myPossession) < parseFloat(rivalPossession)) weaknesses.push('점유율');
        
        if (parseFloat(myShots) > parseFloat(rivalShots)) advantages.push('슈팅 수');
        else if (parseFloat(myShots) < parseFloat(rivalShots)) weaknesses.push('슈팅 수');
        
        if (parseFloat(myAccuracy) > parseFloat(rivalAccuracy)) advantages.push('슈팅 정확도');
        else if (parseFloat(myAccuracy) < parseFloat(rivalAccuracy)) weaknesses.push('슈팅 정확도');
        
        if (parseFloat(myPassRate) > parseFloat(rivalPassRate)) advantages.push('패스 성공률');
        else if (parseFloat(myPassRate) < parseFloat(rivalPassRate)) weaknesses.push('패스 성공률');
        
        return {
            myPossession: parseFloat(myPossession),
            rivalPossession: parseFloat(rivalPossession),
            myShots: parseFloat(myShots),
            rivalShots: parseFloat(rivalShots),
            myAccuracy: parseFloat(myAccuracy),
            rivalAccuracy: parseFloat(rivalAccuracy),
            myPassRate: parseFloat(myPassRate),
            rivalPassRate: parseFloat(rivalPassRate),
            advantages,
            weaknesses
        };
    }

    // 경기 목록 렌더링 (대시보드 스타일)
    renderMatchList() {
        const matchListContainer = document.getElementById('rivalMatchList');
        
        matchListContainer.innerHTML = `
            <div class="rival-matches-header">
                <h3>경기 기록 <span class="match-count">(${this.rivalMatches.length}경기)</span></h3>
                <button class="load-more-btn" id="rivalLoadMoreBtn">더보기</button>
            </div>
            <div class="matches-list-wrapper" id="rivalMatchesList"></div>
        `;

        const matchesList = document.getElementById('rivalMatchesList');
        
        this.rivalMatches.forEach((match, index) => {
            const matchElement = this.createMatchElement(match, index);
            matchesList.appendChild(matchElement);
        });

        // 더보기 버튼 이벤트 등록
        const loadMoreBtn = document.getElementById('rivalLoadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreRivalMatches());
        }
    }

    // 매치 타입 정보 가져오기
    getMatchTypeInfo(matchType) {
        const matchTypes = {
            50: { name: '공식경기', color: '#FFD700', icon: '🏆' },            
            40: { name: '친선 매치', color: '#87CEEB', icon: '🤝' },
            204: { name: '이벤트', color: '#9B59B6', icon: '🎉' },
            214: { name: '클래식 1on1', color: '#E67E22', icon: '⚔️' },
            224: { name: '이벤트 1on1', color: '#3498DB', icon: '🎮' }
        };
        
        return matchTypes[matchType] || { name: '기타', color: '#95A5A6', icon: '📌' };
    }

    // 경기 요소 생성 (대시보드와 동일한 스타일 + 매치 타입 표시)
    createMatchElement(match, index) {
        const matchElement = document.createElement('div');
        matchElement.className = 'match-item';
        
        const result = match.matchResult || 0;
        const resultText = result === 1 ? '승' : result === 2 ? '패' : '무';
        const resultClass = result === 1 ? 'win' : result === 2 ? 'lose' : 'draw';
        
        const goals = match.userGoals || 0;
        const conceded = match.opponentGoals || 0;
        const score = `${goals} - ${conceded}`;
        
        const opponentName = match.opponentNickname || '상대방';
        const opponentControllerEmoji = getControllerEmoji(match.opponentController);
        const opponentDisplayName = `${opponentName} ${opponentControllerEmoji}`;
        
        const matchDate = match.matchDate ? formatMatchDate(match.matchDate) : '';
        
        // 매치 타입 정보
        const matchTypeInfo = this.getMatchTypeInfo(match.matchType);
        const matchTypeBadge = `<span class="match-type-badge" style="background: ${matchTypeInfo.color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${matchTypeInfo.icon} ${matchTypeInfo.name}</span>`;
        
        const highlight = getMatchHighlight(match);
        const highlightHtml = `<span class="match-highlight">${highlight.icon} ${highlight.text}</span>`;
        
        const mvp = getMatchMVP(match);
        const mvpHtml = mvp ? `<span class="match-mvp">⭐ ${mvp.name} ${mvp.stats}</span>` : '';
        
        matchElement.innerHTML = `
            <div class="match-header" onclick="rivalMatchManager.toggleRivalMatchDetails(this)">
                <div class="match-info">
                    <div class="match-details">
                        <span class="match-date">${matchDate}</span>
                        <span class="match-opponent">vs <span class="opponent-nickname-clickable">${opponentDisplayName}</span></span>
                        <div class="match-badges">
                            ${matchTypeBadge}
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
        
        return matchElement;
    }

    // 더보기 버튼 클릭 시 추가 경기 로드
    async loadMoreRivalMatches() {
        const loadMoreBtn = document.getElementById('rivalLoadMoreBtn');
        
        if (!this.currentUserInfo || !this.rivalNickname) {
            return;
        }
        
        // 버튼 비활성화
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = '로딩 중...';

        try {
            const response = await fetch(`/api/rival-matches-more/${this.currentUserInfo.ouid}?offset=${this.rivalOffset}`);
            
            if (!response.ok) {
                throw new Error('추가 경기 데이터를 가져오는데 실패했습니다');
            }

            const data = await response.json();
            const moreMatches = data.matches || [];

            if (moreMatches.length === 0) {
                loadMoreBtn.textContent = '더 이상 없음';
                loadMoreBtn.disabled = true;
                return;
            }

            // 라이벌과의 경기만 필터링
            const filteredMatches = moreMatches.filter(match => {
                const opponentName = match.opponentNickname || '';
                return opponentName.toLowerCase() === this.rivalNickname.toLowerCase();
            });

            if (filteredMatches.length > 0) {
                // 기존 경기에 추가
                this.rivalMatches.push(...filteredMatches);
                
                // 화면에 추가 표시
                const matchesList = document.getElementById('rivalMatchesList');
                filteredMatches.forEach((match, index) => {
                    const matchElement = this.createMatchElement(match, this.rivalMatches.length - filteredMatches.length + index);
                    matchesList.appendChild(matchElement);
                });

                // 경기 수 업데이트
                const matchCountSpan = document.querySelector('.rival-matches-header .match-count');
                if (matchCountSpan) {
                    matchCountSpan.textContent = `(${this.rivalMatches.length}경기)`;
                }

                // offset 증가
                this.rivalOffset += 10;
                
                // 버튼 다시 활성화
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = '더보기';
            } else {
                // 필터링된 결과가 없으면 더 가져오기 시도
                this.rivalOffset += 10;
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = '더보기';
            }

        } catch (error) {
            loadMoreBtn.textContent = '더보기';
            loadMoreBtn.disabled = false;
        }
    }

    // 라이벌 매치용 경기 상세 정보 토글
    toggleRivalMatchDetails(headerElement) {
        const matchItem = headerElement.closest('.match-item');
        const expandedSection = matchItem.querySelector('.match-details-expanded');
        const expandIcon = headerElement.querySelector('.expand-icon');
        
        // 모바일 감지 개선
        const isMobile = window.innerWidth <= 1024 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // 모바일에서는 카드 확장 대신 팝업 호출
            this.openRivalMatchPopup(matchItem);
        } else {
            // 데스크톱에서는 기존 방식
            if (expandedSection.style.display === 'none' || expandedSection.style.display === '') {
                // 확장
                expandedSection.style.display = 'block';
                expandIcon.textContent = '▲';
                expandIcon.style.transform = 'rotate(180deg)';
                
                // 상세 정보 로드
                this.loadRivalMatchDetails(matchItem);
            } else {
                // 축소
                expandedSection.style.display = 'none';
                expandIcon.textContent = '▼';
                expandIcon.style.transform = 'rotate(0deg)';
            }
        }
    }

    // 라이벌 매치용 경기 상세 정보 로드
    loadRivalMatchDetails(matchItem) {
        const matchData = JSON.parse(matchItem.getAttribute('data-match'));
        const expandedSection = matchItem.querySelector('.match-details-expanded');
        
        // 선수 정보가 있는지 확인
        if (matchData.userPlayers && matchData.userPlayers.length > 0) {
            // 대시보드의 createMatchDetailsHTML 함수 재사용
            if (typeof createMatchDetailsHTML === 'function') {
                expandedSection.innerHTML = createMatchDetailsHTML(matchData);
            } else {
                expandedSection.innerHTML = `
                    <div class="match-details-content">
                        <div class="no-player-data">
                            <p>상세 정보를 표시할 수 없습니다.</p>
                        </div>
                    </div>
                `;
            }
        } else {
            expandedSection.innerHTML = `
                <div class="match-details-content">
                    <div class="no-player-data">
                        <p>선수 데이터를 불러올 수 없습니다.</p>
                    </div>
            </div>
        `;
    }
    }

    // 모바일 팝업 열기 함수 (대시보드의 openMatchPopup과 동일한 로직)
    openRivalMatchPopup(matchItem) {
        const matchData = JSON.parse(matchItem.getAttribute('data-match'));
        
        // 현재 스크롤 위치 저장
        const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        window.matchPopupScrollPosition = currentScrollPosition;
        
        // 기존 팝업이 있다면 제거
        const existingPopup = document.getElementById('matchPopup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        // 팝업 오버레이 생성
        const popupOverlay = document.createElement('div');
        popupOverlay.id = 'matchPopup';
        popupOverlay.className = 'match-popup-overlay';
        
        // 팝업 콘텐츠 생성
        const popupContent = document.createElement('div');
        popupContent.className = 'match-popup-content';
        
        // 닫기 버튼 생성
        const closeBtn = document.createElement('button');
        closeBtn.className = 'match-popup-close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('aria-label', '팝업 닫기');
        closeBtn.onclick = this.closeRivalMatchPopup;
        
        // 팝업 헤더 생성 (경기 정보)
        const popupHeader = document.createElement('div');
        popupHeader.className = 'match-popup-header';
        
        const result = matchData.matchResult || 0;
        const resultText = result === 1 ? '승' : result === 2 ? '패' : '무';
        const resultClass = result === 1 ? 'win' : result === 2 ? 'lose' : 'draw';
        const goals = matchData.userGoals || 0;
        const conceded = matchData.opponentGoals || 0;
        const score = `${goals} - ${conceded}`;
        const opponentName = matchData.opponentNickname || '상대방';
        const opponentControllerEmoji = this.getControllerEmoji(matchData.opponentController);
        const opponentDisplayName = `${opponentName} ${opponentControllerEmoji}`;
        const matchDate = matchData.matchDate ? this.formatMatchDate(matchData.matchDate) : '';
        
        popupHeader.innerHTML = `
            <div class="match-popup-title">
                <span class="match-popup-date">${matchDate}</span>
                <span class="match-popup-opponent">vs ${opponentDisplayName}</span>
                <span class="match-popup-score ${resultClass}">${score} ${resultText}</span>
            </div>
        `;
        
        // 팝업 바디 생성 (상세 정보가 들어갈 영역)
        const popupBody = document.createElement('div');
        popupBody.className = 'match-popup-body';
        popupBody.innerHTML = '<div class="match-loading">상세 정보 로딩 중...</div>';
        
        // 팝업 구조 조립
        popupContent.appendChild(closeBtn);
        popupContent.appendChild(popupHeader);
        popupContent.appendChild(popupBody);
        popupOverlay.appendChild(popupContent);
        
        // body에 팝업 추가
        document.body.appendChild(popupOverlay);
        
        // body에 팝업 열림 상태 클래스 추가 (스크롤 방지)
        document.body.classList.add('mobile-popup-open');
        // 현재 스크롤 위치를 top으로 설정하여 스크롤 위치 유지
        document.body.style.top = `-${currentScrollPosition}px`;
        
        // 팝업 배경 클릭으로 닫기
        popupOverlay.onclick = (e) => {
            if (e.target === popupOverlay) {
                this.closeRivalMatchPopup();
            }
        };
        
        // ESC 키로 팝업 닫기
        const handleEscKey = (e) => {
            if (e.key === 'Escape') {
                this.closeRivalMatchPopup();
                document.removeEventListener('keydown', handleEscKey);
            }
        };
        document.addEventListener('keydown', handleEscKey);
        
        // 상세 정보 로드
        setTimeout(() => {
            this.loadRivalMatchPopupDetails(matchData, popupBody);
        }, 100);
    }

    // 모바일 팝업 닫기 함수
    closeRivalMatchPopup() {
        const popup = document.getElementById('matchPopup');
        if (popup) {
            popup.remove();
            document.body.classList.remove('mobile-popup-open');
            document.body.style.top = '';
            
            // 저장된 스크롤 위치로 복원
            if (window.matchPopupScrollPosition !== undefined) {
                window.scrollTo(0, window.matchPopupScrollPosition);
                window.matchPopupScrollPosition = undefined;
            }
        }
    }

    // 모바일 팝업 상세 정보 로드
    loadRivalMatchPopupDetails(matchData, popupBody) {
        // 선수 정보가 있는지 확인
        if (matchData.userPlayers && matchData.userPlayers.length > 0) {
            // 대시보드의 createMatchDetailsHTML 함수 재사용
            if (typeof createMatchDetailsHTML === 'function') {
                popupBody.innerHTML = createMatchDetailsHTML(matchData);
            } else {
                popupBody.innerHTML = `
                    <div class="match-details-content">
                        <div class="no-player-data">
                            <p>상세 정보를 표시할 수 없습니다.</p>
                        </div>
                    </div>
                `;
            }
        } else {
            popupBody.innerHTML = `
                <div class="match-details-content">
                    <div class="no-player-data">
                        <p>선수 데이터를 불러올 수 없습니다.</p>
                    </div>
                </div>
            `;
        }
    }

    // 컨트롤러 이모지 가져오기 함수
    getControllerEmoji(controller) {
        const controllerMap = {
            0: '🎮', // 패드
            1: '⌨️'  // 키보드
        };
        return controllerMap[controller] || '🎮';
    }

    // 경기 날짜 포맷팅 함수
    formatMatchDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            return `${month}/${day} ${hours}:${minutes}`;
        } catch (error) {
            return dateString;
        }
    }

    // 승리 데이터 분석
    analyzeVictoryData() {
        const formationStats = {};
        const playerStats = {};
        const improvements = [];
        
        // 포메이션별 통계 계산
        this.rivalMatches.forEach(match => {
            const formation = match.formation || '4-4-2';
            if (!formationStats[formation]) {
                formationStats[formation] = { wins: 0, total: 0, matches: 0 };
            }
            
            formationStats[formation].matches++;
            formationStats[formation].total++;
            if (match.matchResult === 1) {
                formationStats[formation].wins++;
            }
        });
        
        // 포메이션 승률 계산
        Object.keys(formationStats).forEach(formation => {
            const stats = formationStats[formation];
            stats.winRate = stats.total > 0 ? (stats.wins / stats.total * 100).toFixed(1) : 0;
        });
        
        // 최고 승률 포메이션 찾기
        const bestFormation = Object.keys(formationStats).length > 0 ? 
            Object.keys(formationStats).reduce((best, current) => {
                return formationStats[current].winRate > formationStats[best].winRate ? current : best;
            }) : '4-4-2';
        
        // 선수별 통계 계산
        this.rivalMatches.forEach(match => {
            // 대시보드와 동일한 방식으로 선수 데이터 찾기
            const userPlayers = match.matchDetail?.userPlayers || match.userPlayers;
            
            if (userPlayers && Array.isArray(userPlayers)) {
                userPlayers.forEach(player => {
                    // spid 또는 spId 둘 다 확인
                    const spid = player.spid || player.spId;
                    if (!spid) {
                        return;
                    }
                    
                    const playerName = player.spName || '알 수 없음';
                    const position = this.getPositionName(player.spPosition) || 'Unknown';
                    const rating = player.status?.spRating || 0;
                    
                    if (!playerStats[spid]) {
                        playerStats[spid] = {
                            spid: spid,
                            name: playerName,
                            position: position,
                            totalRating: 0,
                            matches: 0,
                            wins: 0
                        };
                    }
                    
                    playerStats[spid].totalRating += rating;
                    playerStats[spid].matches++;
                    if (match.matchResult === 1) {
                        playerStats[spid].wins++;
                    }
                });
            }
        });
        
        // 선수 평균 평점 계산 및 정렬
        const topPlayers = Object.values(playerStats)
            .map(player => ({
                ...player,
                avgRating: (player.totalRating / player.matches).toFixed(1),
                winRate: (player.wins / player.matches * 100).toFixed(1)
            }))
            .sort((a, b) => parseFloat(b.avgRating) - parseFloat(a.avgRating))
            .slice(0, 5);
        
        // 개선점 분석
        const comparison = this.calculateComparison();
        if (comparison.weaknesses.length > 0) {
            comparison.weaknesses.forEach(weakness => {
                improvements.push({
                    category: weakness,
                    description: this.getImprovementDescription(weakness),
                    target: this.getImprovementTarget(weakness, comparison)
                });
            });
        }
        
        return {
            bestFormation,
            formationStats,
            topPlayers,
            improvements
        };
    }

    // 포메이션 조언 생성
    getFormationAdvice(formation, stats) {
        const advice = {
            '4-4-2': '균형잡힌 공격과 수비를 원할 때 적합합니다. 측면 플레이가 강한 선수들을 활용하세요.',
            '4-3-3': '공격적인 플레이를 원할 때 좋습니다. 빠른 윙어들과 강력한 중앙 공격수를 활용하세요.',
            '3-5-2': '중앙 제어가 강한 포메이션입니다. 패스 플레이가 좋은 선수들을 중앙에 배치하세요.',
            '4-2-3-1': '공격과 수비의 균형이 좋은 포메이션입니다. 창의적인 공격형 미드필더를 활용하세요.'
        };
        
        return advice[formation] || '이 포메이션에서 좋은 성과를 보이고 있습니다. 계속 활용해보세요.';
    }

    // 선수 조언 생성
    getPlayerAdvice(players) {
        if (players.length === 0) return '선수 데이터가 부족합니다.';
        
        const topPlayer = players[0];
        return `${topPlayer.name} 선수가 가장 좋은 성과를 보이고 있습니다. 이 선수를 중심으로 팀을 구성해보세요.`;
    }

    // 개선점 설명 생성
    getImprovementDescription(category) {
        const descriptions = {
            '점유율': '볼 소유 시간을 늘려 경기를 주도하세요.',
            '슈팅 수': '더 많은 슈팅 기회를 만들어보세요.',
            '슈팅 정확도': '슈팅 정확도를 높이기 위해 연습하세요.',
            '패스 성공률': '정확한 패스로 공격을 연결하세요.'
        };
        
        return descriptions[category] || '이 부분을 개선하면 더 좋은 결과를 얻을 수 있습니다.';
    }

    // 개선 목표 생성
    getImprovementTarget(category, comparison) {
        const targets = {
            '점유율': `현재 ${comparison.myPossession}% → 목표 ${parseFloat(comparison.myPossession) + 5}%`,
            '슈팅 수': `현재 ${comparison.myShots}개 → 목표 ${parseFloat(comparison.myShots) + 2}개`,
            '슈팅 정확도': `현재 ${comparison.myAccuracy}% → 목표 ${parseFloat(comparison.myAccuracy) + 10}%`,
            '패스 성공률': `현재 ${comparison.myPassRate}% → 목표 ${parseFloat(comparison.myPassRate) + 5}%`
        };
        
        return targets[category] || '지속적인 개선이 필요합니다.';
    }

    // 포지션 번호를 포지션 이름으로 변환
    getPositionName(positionNumber) {
        const positionMap = {
            0: 'GK', 1: 'SW', 2: 'RWB', 3: 'RB', 4: 'RCB', 5: 'CB', 6: 'LCB', 7: 'LB', 8: 'LWB',
            9: 'RDM', 10: 'CDM', 11: 'LDM', 12: 'RM', 13: 'RCM', 14: 'CM', 15: 'LCM', 16: 'LM',
            17: 'RAM', 18: 'CAM', 19: 'LAM', 20: 'RF', 21: 'CF', 22: 'LF', 23: 'RW', 24: 'ST', 25: 'LW'
        };
        return positionMap[positionNumber] || 'Unknown';
    }

    // 초기화
    init() {
        // 데스크톱 라이벌 매치 탭 클릭 이벤트 리스너 등록
        const rivalTab = document.querySelector('[data-tab="rival"]');
        if (rivalTab) {
            rivalTab.addEventListener('click', () => {
                this.initRivalMatchContent();
            });
        }
        
        // 모바일 라이벌 매치 탭 클릭 이벤트 리스너 등록
        const mobileRivalTab = document.getElementById('mobileRivalTabBtn');
        if (mobileRivalTab) {
            mobileRivalTab.addEventListener('click', () => {
                this.initRivalMatchContent();
            });
        }
    }
}

// 전역 인스턴스 생성
const rivalMatchManager = new RivalMatchManager();

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    rivalMatchManager.init();
});

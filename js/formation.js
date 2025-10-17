async function analyzeFormationData() {
    
    // 포메이션 분석 탭 전용 경기 데이터 사용
    let matchesToAnalyze = null;
    
    if (currentUserInfo && currentUserInfo.ouid) {
        try {
            // 포메이션 분석 탭 전용 변수 사용
            if (formationTabMatches.length === 0) {
                // 처음 로드하는 경우: 대시보드에서 가져온 초기 데이터로 시작
                formationTabMatches = [...(currentUserInfo.matches || [])];
                formationTabOffset = formationTabMatches.length;
            }
            
            matchesToAnalyze = [...formationTabMatches];
            
            // 더보기 API를 여러 번 호출해서 100경기까지 가져오기
            const targetCount = 100;
            const batchSize = 10;
            const maxAttempts = 10;
            let attempts = 0;
            
            
            while (matchesToAnalyze.length < targetCount && attempts < maxAttempts) {
                attempts++;
                const currentProgress = Math.round((matchesToAnalyze.length / targetCount) * 100);
                showFormationLoading(`정확한 분석을 위해 데이터 로드 중입니다... (${matchesToAnalyze.length}/${targetCount}경기)`);
                
                try {
                    // 선택된 매치코드 가져오기
                    const matchType = document.getElementById('matchTypeSelect').value;
                    const response = await fetch(`/api/more-matches/${currentUserInfo.ouid}/${formationTabOffset}/${batchSize}?matchType=${matchType}`);
                    
                    if (!response.ok) {
                        break;
                    }
                    
                    const data = await response.json();
                    
                    if (data && data.matches && data.matches.length > 0) {
                        matchesToAnalyze = matchesToAnalyze.concat(data.matches);
                        formationTabMatches = matchesToAnalyze; // 탭 전용 데이터 업데이트
                        formationTabOffset += data.matches.length; // 실제 가져온 경기 수만큼 offset 증가
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
        showNoFormationData();
        return;
    }
    
    
    try {
        // 포메이션별 경기 그룹화
        showFormationLoading('📂 포메이션별 경기를 그룹화하는 중...');
        
        const formationGroups = {};
        
        for (const match of matchesToAnalyze) {
            try {
                const formation = match.formation || calculateFormationFromPlayers(match.userPlayers || []);
                
                if (!formationGroups[formation]) {
                    formationGroups[formation] = [];
                }
                
                formationGroups[formation].push(match);
            } catch (error) {
            }
        }
        
        const formationList = Object.keys(formationGroups).sort((a, b) => 
            formationGroups[b].length - formationGroups[a].length
        );
        formationList.forEach(formation => {
        });
        
        // 포메이션별 성과 계산
        showFormationLoading('📊 포메이션별 성과를 계산하는 중...');
        
        const formationPerformances = [];
        for (const [formation, matches] of Object.entries(formationGroups)) {
            if (matches.length > 0) {
                const stats = calculateFormationStats(matches);
                formationPerformances.push({
                    formation,
                    matchCount: matches.length,
                    ...stats
                });
            }
        }
        
        // 경기 수가 많은 순으로 정렬
        formationPerformances.sort((a, b) => b.matchCount - a.matchCount);
        
        // 각 포메이션 내에서 동일한 선수 그룹화
        showFormationLoading('👥 동일 선수 그룹을 분석하는 중...');
        
        const formationDetailedGroups = {};
        let totalGroups = 0;
        
        for (const [formation, matches] of Object.entries(formationGroups)) {
            const playerGroups = groupMatchesByOverlappingPlayers(
                matches.map(match => ({
                    match: match,
                    players: match.userPlayers || []
                }))
            );
            
            formationDetailedGroups[formation] = playerGroups.map(group => {
                // group.matches는 { match, players } 형태이므로 실제 match만 추출
                const actualMatches = group.matches.map(item => item.match || item);
                const stats = calculateFormationStats(actualMatches);
                return {
                    formation,
                    matchCount: actualMatches.length,
                    players: group.players,
                    matches: actualMatches,
                    ...stats
                };
            });
            
            totalGroups += playerGroups.length;
        }
        
        
        // 캐시에 저장
        formationDataCache = {
            performances: formationPerformances,
            detailedGroups: formationDetailedGroups,
            matches: matchesToAnalyze,
            matchesData: formationGroups // 포메이션별 경기 데이터 추가
        };
        formationDataLoaded = true;
        
        
        // 데이터 표시
        showFormationLoading('🎨 데이터를 화면에 표시하는 중...');
        displayFormationPerformances(formationPerformances);
        
        // 초기 가이드 표시
        showFormationGroupsGuide('포메이션 성과 카드를 클릭하여 해당 포메이션의 상세 그룹 분석을 확인하세요.');
        
        // 그룹 데이터를 전역 변수에 저장
        window.formationGroupsData = formationDetailedGroups;
        window.formationMatchesData = formationGroups; // 포메이션별 전체 경기 데이터 저장
        
        hideFormationLoading();
        
    } catch (error) {
        showNoFormationData();
    }
}

// 포메이션별 성과 표시 (슬라이더)
function displayFormationPerformances(performances) {
    if (!formationPerformanceTrack) return;
    
    // 슬라이더 초기화
    formationPerformanceTrack.innerHTML = '';
    formationCurrentSlideIndex = 0;
    formationTotalSlides = Math.ceil(performances.length / formationCardsPerSlide);
    
    // 슬라이더 위치를 처음으로 리셋
    if (formationPerformanceTrack) {
        formationPerformanceTrack.style.transform = 'translateX(0%)';
    }
    
    // 슬라이드별로 카드 그룹화
    for (let slideIndex = 0; slideIndex < formationTotalSlides; slideIndex++) {
        const slide = document.createElement('div');
        slide.className = 'formation-performance-slide';
        
        const startIdx = slideIndex * formationCardsPerSlide;
        const endIdx = Math.min(startIdx + formationCardsPerSlide, performances.length);
        
        for (let i = startIdx; i < endIdx; i++) {
            const perf = performances[i];
            const card = document.createElement('div');
            card.className = 'formation-performance-card';
            
            const winRateClass = perf.winRate >= 50 ? 'good' : 'bad';
            const avgGoalsClass = perf.avgGoals >= 2 ? 'good' : '';
            const avgConcedeClass = perf.avgConcede <= 1.5 ? 'good' : 'bad';
            
            card.innerHTML = `
                <div class="formation-performance-header">
                    <div class="formation-name">${perf.formation}</div>
                    <div class="formation-match-count">${perf.matchCount}경기</div>
                </div>
                <div class="formation-performance-stats">
                    <div class="formation-stat-item">
                        <span class="formation-stat-label">승률</span>
                        <span class="formation-stat-value ${winRateClass}">${perf.winRate}%</span>
                    </div>
                    <div class="formation-stat-item">
                        <span class="formation-stat-label">평균득점</span>
                        <span class="formation-stat-value ${avgGoalsClass}">${perf.avgGoals.toFixed(1)}</span>
                    </div>
                    <div class="formation-stat-item">
                        <span class="formation-stat-label">평균실점</span>
                        <span class="formation-stat-value ${avgConcedeClass}">${perf.avgConcede.toFixed(1)}</span>
                    </div>
                </div>
            `;
            
            // 클릭 이벤트 추가
            card.addEventListener('click', () => {
                selectFormationPerformance(perf, card);
            });
            
            slide.appendChild(card);
        }
        
        formationPerformanceTrack.appendChild(slide);
    }
    
    // 슬라이더 버튼 설정
    updateFormationSliderButtons();
    
    // 슬라이더 버튼 이벤트 리스너 추가
    if (formationSliderPrevBtn) {
        formationSliderPrevBtn.onclick = () => moveFormationSlide(-1);
    }
    if (formationSliderNextBtn) {
        formationSliderNextBtn.onclick = () => moveFormationSlide(1);
    }
}

// 포메이션 슬라이더 이동
function moveFormationSlide(direction) {
    formationCurrentSlideIndex += direction;
    
    // 범위 체크
    if (formationCurrentSlideIndex < 0) {
        formationCurrentSlideIndex = 0;
    } else if (formationCurrentSlideIndex >= formationTotalSlides) {
        formationCurrentSlideIndex = formationTotalSlides - 1;
    }
    
    // 슬라이드 이동
    if (formationPerformanceTrack) {
        const offset = -formationCurrentSlideIndex * 100;
        formationPerformanceTrack.style.transform = `translateX(${offset}%)`;
    }
    
    // 버튼 상태 업데이트
    updateFormationSliderButtons();
}

// 포메이션 성과 카드 선택 함수
function selectFormationPerformance(selectedPerformance, clickedCard) {
    
    // 모든 포메이션 카드에서 선택 상태 제거
    document.querySelectorAll('.formation-performance-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 선택된 카드에 선택 상태 추가
    if (clickedCard) {
        clickedCard.classList.add('selected');
    }
    
    // 해당 포메이션의 그룹 데이터 표시
    displayFormationGroups(selectedPerformance.formation);
}

// 포메이션 그룹 표시 함수
function displayFormationGroups(selectedFormation) {
    const groupsSection = document.getElementById('formationGroupsSection');
    if (!groupsSection) {
        return;
    }
    
    // 선택된 포메이션의 경기 데이터 가져오기
    const formationMatchesData = window.formationMatchesData || {};
    const matches = formationMatchesData[selectedFormation] || [];
    
    if (matches.length === 0) {
        showFormationGroupsGuide('선택한 포메이션에 대한 경기 데이터가 없습니다.');
        return;
    }
    
    // 상대 포메이션 추출 및 카운트
    const opponentFormations = {};
    matches.forEach(match => {
        try {
            const opponentFormation = match.opponentFormation || calculateFormationFromPlayers(match.opponentPlayers || []);
            if (opponentFormation) {
                if (!opponentFormations[opponentFormation]) {
                    opponentFormations[opponentFormation] = 0;
                }
                opponentFormations[opponentFormation]++;
            }
        } catch (error) {
        }
    });
    
    // 경기 수가 많은 순으로 정렬
    const sortedOpponentFormations = Object.entries(opponentFormations)
        .sort((a, b) => b[1] - a[1])
        .map(([formation, count]) => ({ formation, count }));
    
    
    // HTML 생성
    groupsSection.innerHTML = `
        <div class="formation-detail-container">
            <div class="formation-detail-header">
                <div class="formation-matchup-header">
                    <div class="my-formation-section">
                        <span class="formation-label">나의 포메이션</span>
                        <h3>${selectedFormation}</h3>
                    </div>
                    <div class="vs-divider">
                        <span class="vs-text">VS</span>
                    </div>
                    <div class="opponent-formation-section">
                        <span class="formation-label">상대</span>
                        <h3 id="selectedOpponentDisplay">All <span class="formation-match-count">(${matches.length}경기)</span></h3>
                    </div>
                </div>
            </div>
            <div class="opponent-formation-slider-container">
                <button class="opponent-slider-btn opponent-prev-btn" id="opponentPrevBtn" disabled>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15,18 9,12 15,6"></polyline>
                    </svg>
                </button>
                <div class="opponent-formation-slider" id="opponentFormationSlider">
                    <div class="opponent-formation-track" id="opponentFormationTrack">
                        <!-- All 박스 -->
                        <div class="opponent-formation-box active" data-formation="all">
                            <div class="opponent-formation-name">All</div>
                            <div class="opponent-formation-count">${matches.length}경기</div>
                        </div>
                        <!-- 상대 포메이션 박스들 -->
                        ${sortedOpponentFormations.map(({ formation, count }) => `
                            <div class="opponent-formation-box" data-formation="${formation}">
                                <div class="opponent-formation-name">${formation}</div>
                                <div class="opponent-formation-count">${count}경기</div>
                            </div>
                        `)}
                    </div>
                </div>
                <button class="opponent-slider-btn opponent-next-btn" id="opponentNextBtn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9,18 15,12 9,6"></polyline>
                    </svg>
                </button>
            </div>
            <div class="formation-detail-content" id="formationDetailContent">
                <!-- 선택된 상대 포메이션에 대한 상세 정보가 여기에 표시됩니다 -->
            </div>
        </div>
    `;
    
    // 슬라이더 초기화
    initOpponentFormationSlider();
    
    // All에 대한 상세 정보 자동 표시
    setTimeout(() => {
        displayFormationDetail('all');
    }, 100);
    
}

// 상대 포메이션 슬라이더 초기화
function initOpponentFormationSlider() {
    const slider = document.getElementById('opponentFormationSlider');
    const track = document.getElementById('opponentFormationTrack');
    const prevBtn = document.getElementById('opponentPrevBtn');
    const nextBtn = document.getElementById('opponentNextBtn');
    const boxes = track?.querySelectorAll('.opponent-formation-box');
    
    if (!slider || !track || !boxes || boxes.length === 0) return;
    
    let currentScroll = 0;
    const scrollAmount = 200; // 한 번에 스크롤할 픽셀 수
    
    // 이전 버튼 클릭
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentScroll = Math.max(0, currentScroll - scrollAmount);
            track.style.transform = `translateX(-${currentScroll}px)`;
            updateOpponentSliderButtons();
        });
    }
    
    // 다음 버튼 클릭
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const maxScroll = track.scrollWidth - slider.clientWidth;
            currentScroll = Math.min(maxScroll, currentScroll + scrollAmount);
            track.style.transform = `translateX(-${currentScroll}px)`;
            updateOpponentSliderButtons();
        });
    }
    
    // 버튼 상태 업데이트
    function updateOpponentSliderButtons() {
        const maxScroll = track.scrollWidth - slider.clientWidth;
        if (prevBtn) prevBtn.disabled = currentScroll <= 0;
        if (nextBtn) nextBtn.disabled = currentScroll >= maxScroll;
    }
    
    // 초기 버튼 상태
    updateOpponentSliderButtons();
    
    // 각 박스에 클릭 이벤트 추가
    boxes.forEach(box => {
        box.addEventListener('click', () => {
            // 이전 active 클래스 제거
            boxes.forEach(b => b.classList.remove('active'));
            // 현재 박스에 active 클래스 추가
            box.classList.add('active');
            
            const selectedOpponentFormation = box.getAttribute('data-formation');
            
            // 상대 포메이션 비교 상세 데이터 표시
            displayFormationDetail(selectedOpponentFormation);
        });
    });
}

// 상대 포메이션 비교 상세 데이터 표시
function displayFormationDetail(opponentFormation) {
    
    const detailContent = document.getElementById('formationDetailContent');
    
    if (!detailContent) {
        return;
    }
    
    // 현재 선택된 내 포메이션 가져오기
    const selectedCard = document.querySelector('.formation-performance-card.selected');
    
    if (!selectedCard) {
        detailContent.innerHTML = `
            <div class="formation-detail-placeholder">
                <p>포메이션을 먼저 선택해주세요.</p>
            </div>
        `;
        return;
    }
    
    const myFormation = selectedCard.querySelector('.formation-name').textContent;
    
    // window.formationMatchesData에서 내 포메이션 경기 가져오기
    const myFormationMatches = window.formationMatchesData?.[myFormation] || [];
    
    if (myFormationMatches.length === 0) {
        detailContent.innerHTML = `
            <div class="formation-detail-placeholder">
                <p>포메이션 경기 데이터를 불러올 수 없습니다.</p>
            </div>
        `;
        return;
    }
    
    // 상대 포메이션 필터링
    let filteredMatches = [];
    if (opponentFormation === 'all') {
        filteredMatches = myFormationMatches;
    } else {
        filteredMatches = myFormationMatches.filter(match => {
            const oppFormation = match.opponentFormation || calculateFormationFromPlayers(match.opponentPlayers || []);
            return oppFormation === opponentFormation;
        });
    }
    
    // 헤더의 상대 포메이션 표시 업데이트
    const opponentDisplay = document.getElementById('selectedOpponentDisplay');
    if (opponentDisplay) {
        if (opponentFormation === 'all') {
            opponentDisplay.innerHTML = `All <span class="formation-match-count">${myFormationMatches.length}경기</span>`;
        } else {
            opponentDisplay.innerHTML = `${opponentFormation} <span class="formation-match-count">${filteredMatches.length}경기</span>`;
        }
    }
    
    if (filteredMatches.length === 0) {
        detailContent.innerHTML = `
            <div class="formation-detail-placeholder">
                <p>해당 상대 포메이션과의 경기 데이터가 없습니다.</p>
            </div>
        `;
        return;
    }
    
    // 통계 계산
    const stats = calculateFormationVsStats(filteredMatches);
    
    // 슛 유형 데이터 계산
    const shootTypes = calculateFormationShootTypes(filteredMatches);
    const shootData = {
        totalShoots: shootTypes.totalShoots,
        closeRangeShoots: shootTypes.closeRangeShoots,
        midRangeShoots: shootTypes.midRangeShoots,
        headingShoots: shootTypes.headingShoots
    };
    
    // 비교 분석
    const analysis = analyzeFormationPerformance(stats, filteredMatches);
    
    // 빠른 요약 생성
    const quickSummary = generateQuickSummary(stats, filteredMatches, analysis);
    
    // HTML 생성
    detailContent.innerHTML = `
        <div class="formation-detail-wrapper">
            <!-- 경기 피드백 제목 -->
            <div class="section-header" style="margin-bottom: 16px;">
                <h3>경기 피드백</h3>
            </div>
            
            <!-- 빠른 요약 박스 -->
            <div class="formation-quick-summary">
                <div class="quick-summary-item summary-grade">
                    <span class="quick-summary-icon">🏆</span>
                    <span class="quick-summary-label">등급:</span>
                    <span class="quick-summary-value grade-${quickSummary.gradeClass}">${quickSummary.grade}</span>
                </div>
                <div class="quick-summary-divider"></div>
                
                <div class="quick-summary-item summary-trend">
                    <span class="quick-summary-icon">${quickSummary.trendIcon}</span>
                    <span class="quick-summary-value trend-${quickSummary.trendClass}">${quickSummary.trend}</span>
                </div>
                <div class="quick-summary-divider"></div>
                
                <div class="quick-summary-item summary-stats">
                    <span class="quick-summary-label">최근</span>
                    <span class="quick-summary-value">${quickSummary.recentForm}</span>
                    <span class="quick-summary-label" style="margin-left: 12px;">득실</span>
                    <span class="quick-summary-value ${quickSummary.goalDiffClass}">${quickSummary.goalDiffText}</span>
                </div>
                <div class="quick-summary-divider"></div>
                
                <div class="quick-summary-item summary-action">
                    <span class="quick-summary-icon">💡</span>
                    <span class="quick-summary-text">${quickSummary.action}</span>
                </div>
            </div>
            
            <!-- 기본 통계 -->
            <div class="formation-stats-summary">
                <div class="stat-box">
                    <div class="stat-label">승률</div>
                    <div class="stat-value ${stats.winRate >= 50 ? 'good' : 'bad'}">${stats.winRate}%</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">승</div>
                    <div class="stat-value">${stats.wins}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">무</div>
                    <div class="stat-value">${stats.draws}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">패</div>
                    <div class="stat-value">${stats.losses}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">평균 득점</div>
                    <div class="stat-value ${stats.avgGoals >= 2 ? 'good' : ''}">${stats.avgGoals.toFixed(1)}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">평균 실점</div>
                    <div class="stat-value ${stats.avgConcede <= 1.5 ? 'good' : 'bad'}">${stats.avgConcede.toFixed(1)}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">평균 평점</div>
                    <div class="stat-value ${stats.avgRating >= 7 ? 'good' : ''}">${stats.avgRating.toFixed(1)}</div>
                </div>
            </div>
            
            <!-- 상세 지표 (한 줄) -->
            <div class="detailed-metrics-inline">
                <div class="metric-item-inline">
                    <div class="metric-label">평균 점유율</div>
                    <div class="metric-bar-wrapper">
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: ${stats.avgPossession}%;"></div>
                        </div>
                        <span class="metric-value">${stats.avgPossession.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="metric-item-inline">
                    <div class="metric-label">슈팅 정확도</div>
                    <div class="metric-bar-wrapper">
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: ${stats.shootAccuracy}%;"></div>
                        </div>
                        <span class="metric-value">${stats.shootAccuracy.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="metric-item-inline">
                    <div class="metric-label">패스 성공률</div>
                    <div class="metric-bar-wrapper">
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: ${stats.passSuccess}%;"></div>
                        </div>
                        <span class="metric-value">${stats.passSuccess.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="metric-item-inline">
                    <div class="metric-label">수비 성공률</div>
                    <div class="metric-bar-wrapper">
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: ${stats.defenseSuccess}%;"></div>
                        </div>
                        <span class="metric-value">${stats.defenseSuccess.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="metric-item-inline">
                    <div class="metric-label">근거리 시도</div>
                    <div class="metric-bar-wrapper">
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: ${shootTypes.closeRange}%;"></div>
                        </div>
                        <span class="metric-value clickable-percent" onclick="showShootTypeCalculation('closeRange', ${shootTypes.closeRange}, ${shootData.closeRangeShoots}, ${shootData.totalShoots})">${shootTypes.closeRange}%</span>
                    </div>
                </div>
                <div class="metric-item-inline">
                    <div class="metric-label">중거리 시도</div>
                    <div class="metric-bar-wrapper">
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: ${shootTypes.midRange}%;"></div>
                        </div>
                        <span class="metric-value clickable-percent" onclick="showShootTypeCalculation('midRange', ${shootTypes.midRange}, ${shootData.midRangeShoots}, ${shootData.totalShoots})">${shootTypes.midRange}%</span>
                    </div>
                </div>
                <div class="metric-item-inline">
                    <div class="metric-label">헤딩 시도</div>
                    <div class="metric-bar-wrapper">
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: ${shootTypes.heading}%;"></div>
                        </div>
                        <span class="metric-value clickable-percent" onclick="showShootTypeCalculation('heading', ${shootTypes.heading}, ${shootData.headingShoots}, ${shootData.totalShoots})">${shootTypes.heading}%</span>
                    </div>
                </div>
            </div>
            
            <!-- 비교 분석 -->
            <div class="formation-analysis-section">
                <div class="analysis-card strength-card">
                    <div class="analysis-header">
                        <span class="analysis-icon">💪</span>
                        <h4>잘하고 있는 부분</h4>
                    </div>
                    <div class="analysis-content">
                        ${analysis.strengths.map(s => `
                            <div class="analysis-item">
                                <span class="item-icon">✓</span>
                                <span class="item-text">${s}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="analysis-card weakness-card">
                    <div class="analysis-header">
                        <span class="analysis-icon">⚠️</span>
                        <h4>보완이 필요한 부분</h4>
                    </div>
                    <div class="analysis-content">
                        ${analysis.weaknesses.map(w => `
                            <div class="analysis-item">
                                <span class="item-icon">!</span>
                                <span class="item-text">${w}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="analysis-card feedback-card">
                    <div class="analysis-header">
                        <span class="analysis-icon">💡</span>
                        <h4>전략적 피드백</h4>
                    </div>
                    <div class="analysis-content">
                        ${analysis.feedback.map(f => `
                            <div class="analysis-item">
                                <span class="item-icon">→</span>
                                <span class="item-text">${f}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 포메이션 대결 통계 계산
function calculateFormationVsStats(matches) {
    let wins = 0, draws = 0, losses = 0;
    let totalGoals = 0, totalConcede = 0, totalRating = 0;
    let totalPossession = 0, totalShootAccuracy = 0, totalPassSuccess = 0, totalDefenseSuccess = 0;
    let validPossessionCount = 0, validShootCount = 0, validPassCount = 0, validDefenseCount = 0;
    let validRatingCount = 0;
    
    matches.forEach(match => {
        // 승무패
        const result = match.matchResult || 0;
        if (result === 1) wins++;
        else if (result === 0) draws++;
        else if (result === 2) losses++;
        
        // 득실점
        totalGoals += match.userGoals || 0;
        totalConcede += match.opponentGoals || 0;
        
        // 평점
        if (match.userStats?.spRating) {
            totalRating += match.userStats.spRating;
            validRatingCount++;
        }
        
        // 점유율
        if (match.userStats?.possession && match.userStats.possession > 0) {
            totalPossession += match.userStats.possession;
            validPossessionCount++;
        }
        
        // 슈팅 정확도 (유효슈팅/전체슈팅)
        const userShoot = match.userStats?.shoot;
        if (userShoot && userShoot.shootTotal > 0) {
            const accuracy = (userShoot.effectiveShootTotal / userShoot.shootTotal) * 100;
            totalShootAccuracy += accuracy;
            validShootCount++;
        }
        
        // 패스 성공률
        const userPass = match.userStats?.pass;
        if (userPass && userPass.passTry > 0) {
            const passRate = (userPass.passSuccess / userPass.passTry) * 100;
            totalPassSuccess += passRate;
            validPassCount++;
        }
        
        // 수비 성공률 (태클+인터셉트 성공 / 시도)
        const userDefence = match.userStats?.defence;
        if (userDefence) {
            const tackles = userDefence.tackleTry || 0;
            const intercepts = userDefence.interceptTry || 0;
            const tackleSuccess = userDefence.tackleSuccess || 0;
            const interceptSuccess = userDefence.interceptSuccess || 0;
            if (tackles + intercepts > 0) {
                const defenseRate = ((tackleSuccess + interceptSuccess) / (tackles + intercepts)) * 100;
                totalDefenseSuccess += defenseRate;
                validDefenseCount++;
            }
        }
    });
    
    const matchCount = matches.length;
    
    // 안전한 기본값 설정 (NaN 방지)
    const avgRating = validRatingCount > 0 ? totalRating / validRatingCount : 6.5;
    const avgPossession = validPossessionCount > 0 ? totalPossession / validPossessionCount : 50;
    const shootAccuracy = validShootCount > 0 ? totalShootAccuracy / validShootCount : 40;
    const passSuccess = validPassCount > 0 ? totalPassSuccess / validPassCount : 75;
    const defenseSuccess = validDefenseCount > 0 ? totalDefenseSuccess / validDefenseCount : 50;
    
    return {
        wins,
        draws,
        losses,
        winRate: matchCount > 0 ? Math.round((wins / matchCount) * 100) : 0,
        avgGoals: matchCount > 0 ? totalGoals / matchCount : 0,
        avgConcede: matchCount > 0 ? totalConcede / matchCount : 0,
        avgRating: avgRating,
        avgPossession: avgPossession,
        shootAccuracy: shootAccuracy,
        passSuccess: passSuccess,
        defenseSuccess: defenseSuccess,
        matchCount
    };
}

// 빠른 요약 생성 함수
function generateQuickSummary(stats, matches, analysis) {
    // 1. 등급 계산 (S, A, B, C, D, F)
    const winRate = stats.winRate;
    const goalDiff = stats.avgGoals - stats.avgConcede;
    
    let grade = 'C';
    let gradeClass = 'c';
    
    if (winRate >= 70 && goalDiff > 1.0) {
        grade = 'S';
        gradeClass = 's';
    } else if (winRate >= 60 && goalDiff > 0.5) {
        grade = 'A';
        gradeClass = 'a';
    } else if (winRate >= 50 || goalDiff >= 0) {
        grade = 'B';
        gradeClass = 'b';
    } else if (winRate >= 40) {
        grade = 'C';
        gradeClass = 'c';
    } else if (winRate >= 30) {
        grade = 'D';
        gradeClass = 'd';
    } else {
        grade = 'F';
        gradeClass = 'f';
    }
    
    // 2. 트렌드 계산 (최근 5경기 vs 이전 5경기)
    let trend = '안정';
    let trendClass = 'stable';
    let trendIcon = '➡️';
    
    if (matches.length >= 10) {
        const recent5 = matches.slice(0, 5);
        const previous5 = matches.slice(5, 10);
        
        const recentWins = recent5.filter(m => m.matchResult === 1).length;
        const prevWins = previous5.filter(m => m.matchResult === 1).length;
        
        if (recentWins > prevWins + 1) {
            trend = '상승세';
            trendClass = 'rising';
            trendIcon = '📈';
        } else if (recentWins < prevWins - 1) {
            trend = '하락세';
            trendClass = 'falling';
            trendIcon = '📉';
        }
    }
    
    // 3. 골득실 표시
    const goalDiffValue = goalDiff;
    const goalDiffText = goalDiff > 0 ? `+${goalDiff.toFixed(1)}` : goalDiff.toFixed(1);
    const goalDiffClass = goalDiff > 0 ? 'positive' : goalDiff < 0 ? 'negative' : 'neutral';
    
    // 4. 최근 전적 계산 (최근 5경기)
    const recentMatches = matches.slice(0, Math.min(5, matches.length));
    const recentWins = recentMatches.filter(m => m.matchResult === 1).length;
    const recentDraws = recentMatches.filter(m => m.matchResult === 0).length;
    const recentLosses = recentMatches.filter(m => m.matchResult === 2).length;
    const recentForm = `${recentWins}승${recentDraws}무${recentLosses}패`;
    
    // 5. 공격 스타일 분석
    const detailedAnalysis = analysis.detailedAnalysis || performDetailedAnalysis(matches);
    const attackStyle = analyzeAttackStyle(detailedAnalysis);
    
    // 6. 즉시 액션 생성 (승률 기반으로 우선 판단)
    let action = '현재 전술을 계속 유지하세요';
    
    // 피드백에서 추천 포메이션이 있는지 확인
    const counterFormationFeedback = analysis.feedback.find(f => 
        f.includes('🎯') || f.includes('🔄')
    );
    
    if (counterFormationFeedback) {
        // 1순위: 포메이션 추천이 있으면 그것을 액션으로
        const formationMatch = counterFormationFeedback.match(/<strong>([^<]+)<\/strong>/);
        if (formationMatch && formationMatch[1]) {
            const recommendedFormation = formationMatch[1];
            const winRateMatch = counterFormationFeedback.match(/승률이.*?(\d+)%p/);
            const currentWinRateMatch = counterFormationFeedback.match(/현재\s+(\d+)%/);
            const bestWinRateMatch = counterFormationFeedback.match(/→\s+(\d+)%/);
            
            if (winRateMatch && currentWinRateMatch && bestWinRateMatch) {
                action = `<strong>${recommendedFormation}</strong> 포메이션으로 변경하면 승률이 ${winRateMatch[1]}%p 더 높아집니다 (현재 ${currentWinRateMatch[1]}% → ${bestWinRateMatch[1]}%)`;
            } else if (winRateMatch) {
                action = `<strong>${recommendedFormation}</strong> 포메이션으로 변경하면 승률이 ${winRateMatch[1]}%p 더 높아집니다`;
            } else {
                action = `<strong>${recommendedFormation}</strong> 포메이션으로 변경을 고려해보세요`;
            }
        }
    } else if (winRate < 40) {
        // 2순위: 승률이 매우 낮으면 (40% 미만) 가장 큰 문제점 지적
        if (stats.avgConcede >= 2.5) {
            action = `수비가 매우 취약합니다 (${stats.avgConcede.toFixed(1)}실점). 수비 라인을 보강하고 압박을 강화하세요`;
        } else if (stats.avgGoals < 1.0) {
            action = `득점력이 매우 부족합니다 (${stats.avgGoals.toFixed(1)}골). 공격 전술을 전면 재검토하세요`;
        } else if (goalDiff < -0.8) {
            action = `골득실이 좋지 않습니다 (${goalDiffText}). 전술 변경을 심각하게 고려하세요`;
        } else {
            action = '이 상대 포메이션에 고전하고 있습니다. 다른 포메이션을 시도해보세요';
        }
    } else if (winRate < 50) {
        // 3순위: 승률이 낮으면 (40-50%) 주요 보완점 제시
        if (stats.avgConcede >= 2.0) {
            action = `수비 보강이 필요합니다 (${stats.avgConcede.toFixed(1)}실점). 수비형 미드필더를 추가하세요`;
        } else if (stats.avgGoals < 1.5) {
            action = `득점력 향상이 필요합니다 (${stats.avgGoals.toFixed(1)}골). 공격 옵션을 다양화하세요`;
        } else if (goalDiff < 0) {
            action = `골득실 개선이 필요합니다 (${goalDiffText}). 수비 안정성을 높이세요`;
        } else {
            action = '승률이 낮습니다. 경기 운영 방식을 재점검하고 전술을 조정하세요';
        }
    } else if (attackStyle && attackStyle.message && winRate >= 50) {
        // 4순위: 승률이 괜찮으면 (50% 이상) 공격 스타일 피드백
        action = attackStyle.message;
    } else {
        // 5순위: 승률별 맞춤 피드백
        if (stats.avgConcede >= 2.0) {
            action = '수비형 미드필더를 보강하여 실점을 줄이세요';
        } else if (stats.avgGoals < 1.5 && stats.avgConcede < 1.5) {
            action = '공격 옵션을 다양화하여 득점력을 높이세요';
        } else if (stats.avgGoals >= 2.5 && winRate < 60) {
            action = '좋은 공격력을 승리로 연결하는 마무리 능력을 키우세요';
        } else if (winRate >= 60) {
            action = '현재 전술이 효과적입니다. 선수 컨디션 관리에 집중하세요';
        } else if (stats.shootAccuracy < 40) {
            action = '슈팅 연습을 통해 골 결정력을 향상시키세요';
        } else if (stats.passSuccess < 75) {
            action = '패스 정확도를 높여 안정적인 빌드업을 구축하세요';
        } else {
            action = '세트피스 상황을 더 활용하여 득점 기회를 늘리세요';
        }
    }
    
    return {
        grade,
        gradeClass,
        trend,
        trendClass,
        trendIcon,
        goalDiffText,
        goalDiffClass,
        recentForm,
        action,
        detailedAnalysis // 분석 데이터 전달
    };
}

// 포메이션별 슛 유형 계산 함수
function calculateFormationShootTypes(matches) {
    if (!matches || matches.length === 0) {
        return { 
            closeRange: 0, 
            midRange: 0, 
            heading: 0,
            totalShoots: 0,
            closeRangeShoots: 0,
            midRangeShoots: 0,
            headingShoots: 0
        };
    }
    
    let totalShoots = 0;
    let closeRangeShoots = 0;
    let midRangeShoots = 0;
    let headingShoots = 0;
    
    matches.forEach(match => {
        const userStats = match.userStats;
        if (userStats && userStats.shoot) {
            const shoot = userStats.shoot;
            
            totalShoots += shoot.shootTotal || 0;
            closeRangeShoots += shoot.shootInPenalty || 0;
            midRangeShoots += shoot.shootOutPenalty || 0;
            headingShoots += shoot.shootHeading || 0;
        }
    });
    
    if (totalShoots === 0) {
        return { 
            closeRange: 0, 
            midRange: 0, 
            heading: 0,
            totalShoots: 0,
            closeRangeShoots: 0,
            midRangeShoots: 0,
            headingShoots: 0
        };
    }
    
    const closeRangePercent = Math.round((closeRangeShoots / totalShoots) * 100);
    const midRangePercent = Math.round((midRangeShoots / totalShoots) * 100);
    const headingPercent = Math.round((headingShoots / totalShoots) * 100);
    
    return {
        closeRange: closeRangePercent,
        midRange: midRangePercent,
        heading: headingPercent,
        totalShoots: totalShoots,
        closeRangeShoots: closeRangeShoots,
        midRangeShoots: midRangeShoots,
        headingShoots: headingShoots
    };
}


// 상대 포메이션에 대한 최적 포메이션 추천 함수
function analyzeCounterFormation(opponentFormation, matches, feedback) {
    // 전체 경기 데이터에서 이 상대 포메이션과의 경기를 내 포메이션별로 분석
    const allMatchesData = window.formationMatchesData || formationDataCache?.matchesData || {};
    
    if (!allMatchesData || Object.keys(allMatchesData).length === 0) {
        return; // 데이터가 없으면 조용히 종료
    }
    
    // 같은 상대 포메이션을 상대한 모든 경기를 내 포메이션별로 그룹화
    const myFormationStats = {};
    
    Object.entries(allMatchesData).forEach(([myFormation, formationMatches]) => {
        const vsMatches = formationMatches.filter(match => {
            const oppFormation = match.opponentFormation || calculateFormationFromPlayers(match.opponentPlayers || []);
            return oppFormation === opponentFormation;
        });
        
        if (vsMatches.length > 0) {
            myFormationStats[myFormation] = {
                wins: 0,
                draws: 0,
                losses: 0,
                totalGoals: 0,
                totalConceded: 0,
                matchCount: vsMatches.length
            };
            
            vsMatches.forEach(match => {
                const stats = myFormationStats[myFormation];
                stats.totalGoals += match.userGoals || 0;
                stats.totalConceded += match.opponentGoals || 0;
                
                const result = match.matchResult || 0;
                if (result === 1) stats.wins++;
                else if (result === 0) stats.draws++;
                else if (result === 2) stats.losses++;
            });
        }
    });
    
    // 내 포메이션별 성과 계산 및 정렬
    const formationPerformances = Object.keys(myFormationStats)
        .filter(formation => myFormationStats[formation].matchCount >= 2) // 최소 2경기 이상
        .map(formation => {
            const stats = myFormationStats[formation];
            const winRate = (stats.wins / stats.matchCount) * 100;
            const avgGoals = stats.totalGoals / stats.matchCount;
            const avgConceded = stats.totalConceded / stats.matchCount;
            const goalDiff = avgGoals - avgConceded;
            
            // 종합 점수 (승률 70% + 골득실 30%)
            const score = (winRate * 0.7) + (Math.max(goalDiff, -3) * 10 * 0.3);
            
            return {
                formation,
                winRate,
                avgGoals,
                avgConceded,
                goalDiff,
                matchCount: stats.matchCount,
                score
            };
        })
        .sort((a, b) => b.score - a.score);
    
    // 현재 분석 중인 포메이션 찾기
    const currentFormationMatches = matches || [];
    const currentFormation = currentFormationMatches.length > 0 
        ? (currentFormationMatches[0].formation || calculateFormationFromPlayers(currentFormationMatches[0].userPlayers || []))
        : null;
    
    // 추천 로직
    if (formationPerformances.length >= 2 && currentFormation) {
        const best = formationPerformances[0];
        const current = formationPerformances.find(f => f.formation === currentFormation);
        
        if (current && best.formation !== current.formation) {
            const winRateDiff = best.winRate - current.winRate;
            const goalDiffDiff = best.goalDiff - current.goalDiff;
            
            // 의미있는 차이가 있을 때만 추천
            if (winRateDiff > 10 || (winRateDiff > 5 && goalDiffDiff > 0.5)) {
                feedback.push(
                    `🎯 상대 <strong>${opponentFormation}</strong>에 대해서는 ` +
                    `<strong>${best.formation}</strong> 포메이션이 더 효과적입니다 ` +
                    `(승률 ${best.winRate.toFixed(0)}%, 골득실 ${best.goalDiff > 0 ? '+' : ''}${best.goalDiff.toFixed(1)}, ${best.matchCount}경기 기준)`
                );
                
                if (winRateDiff > 15) {
                    feedback.push(
                        `🔄 <strong>${best.formation}</strong> 포메이션으로 변경하면 승률이 <strong>${winRateDiff.toFixed(0)}%p 더 높아집니다</strong> ` +
                        `(현재 ${current.winRate.toFixed(0)}% → ${best.winRate.toFixed(0)}%)`
                    );
                } else if (winRateDiff > 10) {
                    feedback.push(
                        `💡 <strong>${best.formation}</strong> 포메이션을 고려해보세요. ` +
                        `승률이 ${winRateDiff.toFixed(0)}%p 더 높습니다 (현재 ${current.winRate.toFixed(0)}% → ${best.winRate.toFixed(0)}%)`
                    );
                }
            } else if (best.formation === current.formation) {
                // 현재 포메이션이 최선인 경우
                if (current.winRate >= 60) {
                    feedback.push(`✅ 현재 포메이션이 이 상대에게 가장 효과적입니다. 계속 사용하세요`);
                }
            }
        } else if (!current && best) {
            // 현재 포메이션으로는 이 상대를 만난 적이 없는 경우
            feedback.push(
                `💡 <strong>${best.formation}</strong> 포메이션을 시도해보세요. ` +
                `상대 ${opponentFormation}에 대해 가장 좋은 성적을 기록했습니다 ` +
                `(승률 ${best.winRate.toFixed(0)}%, ${best.matchCount}경기)`
            );
        }
    }
    
    // 전체 포메이션 중 상위 2-3개 간단 요약
    if (formationPerformances.length >= 3) {
        const top3 = formationPerformances.slice(0, 3);
        const summary = top3.map((f, idx) => 
            `${idx + 1}. ${f.formation} (승률 ${f.winRate.toFixed(0)}%)`
        ).join(', ');
        
        feedback.push(`📊 상대 ${opponentFormation} 대응 성적 순위: ${summary}`);
    }
}

// 포메이션 성과 분석 (심화 버전 - 우선순위 기반 Top 5)
function analyzeFormationPerformance(stats, matches) {
    // 일반 배열 사용
    const strengths = [];
    const weaknesses = [];
    const feedback = [];
    
    // 심화 분석 데이터 수집
    const detailedAnalysis = performDetailedAnalysis(matches);
    
    // 0. 상대 포메이션에 대한 최적 포메이션 추천 (새로운 분석 - 최우선)
    if (matches.length > 0) {
        const opponentFormation = matches[0].opponentFormation || calculateFormationFromPlayers(matches[0].opponentPlayers || []);
        if (opponentFormation) {
            analyzeCounterFormation(opponentFormation, matches, feedback);
        }
    }
    
    // 1. 승률 및 경기력 트렌드 분석 (최우선)
    analyzeWinRateAndTrend(stats, matches, strengths, weaknesses, feedback);
    
    // 2. 공격 패턴 심층 분석 (고우선순위)
    analyzeAttackPatterns(stats, detailedAnalysis, strengths, weaknesses, feedback);
    
    // 3. 수비 취약점 분석 (고우선순위)
    analyzeDefenseVulnerabilities(stats, detailedAnalysis, strengths, weaknesses, feedback);
    
    // 4. 공격 방향 분석 (측면/중앙) - 중상 우선순위
    analyzeAttackDirection(stats, detailedAnalysis, strengths, weaknesses, feedback);
    
    // 5. 경기 흐름 및 시간대별 분석 (중간 우선순위)
    analyzeGameFlow(detailedAnalysis, strengths, weaknesses, feedback);
    
    // 6. 볼 소유 및 빌드업 분석 (중간 우선순위)
    analyzePossessionAndBuildup(stats, detailedAnalysis, strengths, weaknesses, feedback);
    
    // 7. 전술적 효율성 분석 (낮은 우선순위)
    analyzeTacticalEfficiency(stats, detailedAnalysis, strengths, weaknesses, feedback);
    
    // 8. 항상 개선점 찾기 (낮은 우선순위)
    findAdditionalImprovements(stats, detailedAnalysis, strengths, weaknesses, feedback);
    
    // 최소 개선점 보장
    if (weaknesses.length === 0) {
        const improvements = findRelativeWeaknesses(stats, detailedAnalysis);
        weaknesses.push(...improvements.slice(0, 3));
    }
    
    // 최소 강점 보장
    if (strengths.length === 0) {
        strengths.push('전반적으로 균형잡힌 경기력을 보이고 있습니다');
        const relativeStrengths = findRelativeStrengths(stats, detailedAnalysis);
        strengths.push(...relativeStrengths.slice(0, 2));
    }
    
    // 최소 피드백 보장
    if (feedback.length === 0) {
        feedback.push('세트피스 상황을 더 활용하여 득점 기회를 늘리세요');
        feedback.push('경기 후반 체력 관리에 집중하고, 교체 타이밍을 최적화하세요');
    }
    
    
    // 우선순위 기반으로 가장 중요한 5개만 선택
    const topStrengths = selectTopPriority(strengths, 5);
    const topWeaknesses = selectTopPriority(weaknesses, 5);
    const topFeedback = selectTopPriority(feedback, 5);
    
    
    return { 
        strengths: topStrengths, 
        weaknesses: topWeaknesses, 
        feedback: topFeedback,
        detailedAnalysis: detailedAnalysis // 상세 분석 데이터 포함
    };
}

// 우선순위 기반 Top N 선택 (스마트 필터링)
function selectTopPriority(items, maxCount) {
    if (items.length <= maxCount) return items;
    
    const itemsWithScore = items.map((text, index) => {
        let priorityScore = items.length - index; // 앞쪽이 높은 점수 (기본)
        const lowerText = text.toLowerCase();
        
        // 1. 승률 분석 (최우선)
        if (lowerText.match(/승률.*?(\d+)%/)) {
            const winRate = parseInt(lowerText.match(/승률.*?(\d+)%/)[1]);
            if (lowerText.includes('낮은 승률') || lowerText.includes('부진') || winRate < 40) {
                priorityScore += 15; // 낮은 승률은 최우선
            } else if (lowerText.includes('압도적') || winRate >= 65) {
                priorityScore += 12; // 높은 승률은 강점 최우선
            }
        }
        
        // 2. 득점력 분석 (고우선순위)
        if (lowerText.match(/평균.*?(\d+\.?\d*)골/)) {
            const avgGoals = parseFloat(lowerText.match(/평균.*?(\d+\.?\d*)골/)[1]);
            if (lowerText.includes('낮은 득점') || lowerText.includes('부족') && avgGoals < 1.5) {
                priorityScore += 10;
            } else if (lowerText.includes('높은 득점') || avgGoals >= 2.5) {
                priorityScore += 8;
            }
        }
        
        // 3. 실점 분석 (고우선순위)
        if (lowerText.match(/평균.*?(\d+\.?\d*)실점/)) {
            const avgConcede = parseFloat(lowerText.match(/평균.*?(\d+\.?\d*)실점/)[1]);
            if (lowerText.includes('과다') || lowerText.includes('높은 실점') && avgConcede >= 2.5) {
                priorityScore += 10;
            } else if (lowerText.includes('탁월') || avgConcede <= 1.0) {
                priorityScore += 8;
            }
        }
        
        // 3-1. 실점 유형 분석 (고우선순위)
        if (lowerText.includes('박스 내 실점') || lowerText.includes('근거리 실점')) {
            priorityScore += 9; // 박스 내 실점은 매우 중요
        }
        if (lowerText.includes('중거리 슛 실점')) {
            priorityScore += 8; // 중거리 실점도 중요
        }
        if (lowerText.includes('헤딩 실점')) {
            priorityScore += 9; // 헤딩 실점 취약점 중요
        }
        
        // 4. 심각도 키워드 (고우선순위)
        if (lowerText.includes('심각') || lowerText.includes('시급') || lowerText.includes('즉각적')) {
            priorityScore += 9;
        } else if (lowerText.includes('근본적') || lowerText.includes('필수')) {
            priorityScore += 7;
        }
        
        // 5. 역전/대패 (중요)
        if (lowerText.includes('역전패') || lowerText.includes('대패')) {
            priorityScore += 6;
        }
        
        // 6. 최근 경기 트렌드 (중요)
        if (lowerText.includes('최근') && (lowerText.includes('하락') || lowerText.includes('부진'))) {
            priorityScore += 7;
        } else if (lowerText.includes('최근') && lowerText.includes('상승')) {
            priorityScore += 6;
        }
        
        // 7. 긍정적 강점 키워드
        if (lowerText.includes('압도') || lowerText.includes('탁월') || lowerText.includes('우수')) {
            priorityScore += 5;
        }
        
        // 8. 구체적 전술 조언 (피드백 우선순위)
        if (lowerText.includes('전혀 다른') || lowerText.includes('특화 전술')) {
            priorityScore += 8;
        }
        
        return { text, score: priorityScore, originalIndex: index };
    });
    
    // 점수 순으로 정렬, 동점이면 원래 순서 유지
    const sorted = itemsWithScore.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.originalIndex - b.originalIndex;
    });
    
    // 디버깅용 점수 출력
    
    return sorted.slice(0, maxCount).map(item => item.text);
}

// 공격 스타일 분석 함수 (측면/중앙)
function analyzeAttackStyle(detailedAnalysis) {
    const shooting = detailedAnalysis.shooting;
    const total = shooting.totalGoals;
    
    if (total === 0) return null;
    
    const inPenaltyRatio = (shooting.inPenaltyGoals / total) * 100;
    const headingRatio = (shooting.headingGoals / total) * 100;
    const outPenaltyRatio = (shooting.outPenaltyGoals / total) * 100;
    
    // 헤딩 골 비율이 높으면 측면 공격형
    if (headingRatio >= 30) {
        return { 
            style: 'wing', 
            message: '측면 크로스가 효과적입니다. 풀백 오버래핑을 더 활용하세요',
            ratio: headingRatio
        };
    }
    
    // 박스 안 골이 많으면 중앙 침투형
    if (inPenaltyRatio >= 70) {
        return { 
            style: 'central', 
            message: '중앙 돌파가 좋습니다. 원투 패스로 박스를 계속 공략하세요',
            ratio: inPenaltyRatio
        };
    }
    
    // 박스 밖 골이 많으면 중거리 슈팅형
    if (outPenaltyRatio >= 40) {
        return { 
            style: 'longshot', 
            message: '중거리 슈팅이 좋습니다. 박스 진입과 병행하여 수비를 혼란시키세요',
            ratio: outPenaltyRatio
        };
    }
    
    // 균형잡힌 경우
    return { 
        style: 'balanced', 
        message: '측면과 중앙을 모두 활용하는 균형잡힌 공격을 계속 유지하세요',
        ratio: 0
    };
}

// 공격 방향 분석 (측면/중앙) - 중상 우선순위
function analyzeAttackDirection(stats, detailedAnalysis, strengths, weaknesses, feedback) {
    const shooting = detailedAnalysis.shooting;
    const totalGoals = shooting.totalGoals;
    
    if (totalGoals === 0) return;
    
    const inPenaltyRatio = (shooting.inPenaltyGoals / totalGoals) * 100;
    const headingRatio = (shooting.headingGoals / totalGoals) * 100;
    const outPenaltyRatio = (shooting.outPenaltyGoals / totalGoals) * 100;
    
    // 측면 공격 분석
    if (headingRatio >= 30) {
        strengths.push(`효과적인 측면 공격 (헤딩골 ${headingRatio.toFixed(0)}%) - 크로스 플레이가 위협적입니다`);
        feedback.push('측면 크로스를 계속 활용하되, 컷백 패스로 중앙 공격도 시도하세요');
        feedback.push('풀백의 오버래핑으로 측면 공간을 더 넓게 사용하세요');
    } else if (headingRatio >= 20) {
        strengths.push(`적절한 측면 활용 (헤딩골 ${headingRatio.toFixed(0)}%) - 측면 공격 옵션이 있습니다`);
    } else if (headingRatio < 10 && stats.avgGoals < 2.0) {
        weaknesses.push(`측면 공격 부족 (헤딩골 ${headingRatio.toFixed(0)}%) - 공격 루트가 제한적입니다`);
        feedback.push('윙어의 크로스를 늘리고 ST의 박스 진입 타이밍을 조율하세요');
        feedback.push('사이드 체인지로 상대 수비를 좌우로 흔들어 공간을 만드세요');
    }
    
    // 중앙 공격 분석
    if (inPenaltyRatio >= 70) {
        strengths.push(`강력한 중앙 침투 (박스내골 ${inPenaltyRatio.toFixed(0)}%) - 중앙 돌파가 매우 효과적입니다`);
        feedback.push('중앙 공격이 좋습니다. CAM과 ST의 연계를 더욱 강화하세요');
        feedback.push('원투 패스와 스루패스로 수비 라인을 계속 뚫으세요');
    } else if (inPenaltyRatio >= 55) {
        strengths.push(`효율적인 중앙 공격 (박스내골 ${inPenaltyRatio.toFixed(0)}%) - 박스 진입이 좋습니다`);
    } else if (inPenaltyRatio < 40 && headingRatio < 15) {
        weaknesses.push(`박스 진입 부족 (박스내골 ${inPenaltyRatio.toFixed(0)}%) - 위험 지역 침투가 약합니다`);
        feedback.push('중앙 미드필더의 전진 움직임을 늘려 박스 진입 루트를 만드세요');
        feedback.push('측면에서 중앙으로의 컷백 패스로 박스 내 슈팅 기회를 늘리세요');
    }
    
    // 중거리 슈팅 활용도
    if (outPenaltyRatio >= 40) {
        if (stats.shootAccuracy >= 45) {
            strengths.push(`중거리 슈팅 활용 (${outPenaltyRatio.toFixed(0)}%) - 다양한 거리에서 위협적입니다`);
            feedback.push('중거리 슈팅과 박스 침투를 병행하여 수비를 혼란시키세요');
        } else {
            weaknesses.push(`중거리 슈팅 의존 (${outPenaltyRatio.toFixed(0)}%) - 슈팅 정확도가 낮아 비효율적입니다`);
            feedback.push('무리한 중거리 슈팅을 줄이고 박스에 더 가까이 진입하세요');
        }
    }
    
    // 균형잡힌 공격
    if (inPenaltyRatio >= 45 && inPenaltyRatio <= 65 && headingRatio >= 15 && headingRatio <= 25) {
        strengths.push('측면과 중앙을 골고루 활용하는 균형잡힌 공격 - 예측하기 어렵습니다');
    }
}

// 상세 분석 데이터 수집
function performDetailedAnalysis(matches) {
    let totalShots = 0, totalEffectiveShots = 0, totalGoals = 0;
    let inPenaltyGoals = 0, outPenaltyGoals = 0, headingGoals = 0;
    let totalPasses = 0, shortPasses = 0, longPasses = 0;
    let totalTackles = 0, successfulTackles = 0;
    let totalIntercepts = 0, successfulIntercepts = 0;
    let dribbleAttempts = 0, successfulDribbles = 0;
    let goalsInFirstHalf = 0, goalsInSecondHalf = 0;
    let concedeInFirstHalf = 0, concedeInSecondHalf = 0;
    let bigWins = 0, bigLosses = 0, closeGames = 0;
    let comebackWins = 0, blownLeads = 0;
    
    // 실점 유형 데이터 추가
    let concedeInPenaltyGoals = 0, concedeOutPenaltyGoals = 0, concedeHeadingGoals = 0;
    
    
    matches.forEach((match, idx) => {
        const userStats = match.userStats || {};
        const opponentStats = match.opponentStats || {};
        const shoot = userStats.shoot || {};
        const oppShoot = opponentStats.shoot || {};
        const pass = userStats.pass || {};
        const defence = userStats.defence || {};
        
        // 슈팅 분석
        totalShots += shoot.shootTotal || 0;
        totalEffectiveShots += shoot.effectiveShootTotal || 0;
        totalGoals += shoot.goalTotal || 0;
        inPenaltyGoals += shoot.goalInPenalty || 0;
        outPenaltyGoals += shoot.goalOutPenalty || 0;
        headingGoals += shoot.goalHeading || 0;
        
        // 실점 유형 분석 (상대방 골 데이터)
        concedeInPenaltyGoals += oppShoot.goalInPenalty || 0;
        concedeOutPenaltyGoals += oppShoot.goalOutPenalty || 0;
        concedeHeadingGoals += oppShoot.goalHeading || 0;
        
        // 패스 분석
        totalPasses += pass.passTry || 0;
        shortPasses += pass.shortPassTry || 0;
        longPasses += pass.longPassTry || 0;
        
        // 수비 분석
        totalTackles += defence.tackleTry || 0;
        successfulTackles += defence.tackleSuccess || 0;
        totalIntercepts += defence.interceptTry || 0;
        successfulIntercepts += defence.interceptSuccess || 0;
        
        // 드리블 분석
        const dribble = userStats.dribble || {};
        dribbleAttempts += dribble.dribbleTry || 0;
        successfulDribbles += dribble.dribbleSuccess || 0;
        
        // 경기 결과 분석
        const userGoals = match.userGoals || 0;
        const oppGoals = match.opponentGoals || 0;
        const result = match.matchResult || 0;
        const goalDiff = Math.abs(userGoals - oppGoals);
        
        if (result === 1 && goalDiff >= 3) bigWins++;
        if (result === 2 && goalDiff >= 3) bigLosses++;
        if (goalDiff <= 1) closeGames++;
        
        // 역전 분석
        if (result === 1 && oppGoals >= 1 && userGoals > oppGoals) comebackWins++;
        if (result === 2 && userGoals >= 1 && oppGoals > userGoals) blownLeads++;
        
        // 시간대별 골 (임시 추정)
        if (userGoals > 0) {
            goalsInFirstHalf += Math.floor(userGoals * 0.45);
            goalsInSecondHalf += Math.ceil(userGoals * 0.55);
        }
        if (oppGoals > 0) {
            concedeInFirstHalf += Math.floor(oppGoals * 0.45);
            concedeInSecondHalf += Math.ceil(oppGoals * 0.55);
        }
    });
    
    
    // 안전한 비율 계산 (0으로 나누기 방지)
    const shotEfficiency = totalShots > 0 ? (totalEffectiveShots / totalShots) * 100 : 40;
    const goalConversion = totalEffectiveShots > 0 ? (totalGoals / totalEffectiveShots) * 100 : 20;
    const shortPassRatio = totalPasses > 0 ? (shortPasses / totalPasses) * 100 : 60;
    const longPassRatio = totalPasses > 0 ? (longPasses / totalPasses) * 100 : 40;
    const tackleSuccess = totalTackles > 0 ? (successfulTackles / totalTackles) * 100 : 50;
    const interceptSuccess = totalIntercepts > 0 ? (successfulIntercepts / totalIntercepts) * 100 : 50;
    const dribbleSuccess = dribbleAttempts > 0 ? (successfulDribbles / dribbleAttempts) * 100 : 50;
    
    // 실점 유형 비율 계산
    const totalConcede = concedeInPenaltyGoals + concedeOutPenaltyGoals + concedeHeadingGoals;
    const concedeInPenaltyRatio = totalConcede > 0 ? (concedeInPenaltyGoals / totalConcede) * 100 : 0;
    const concedeOutPenaltyRatio = totalConcede > 0 ? (concedeOutPenaltyGoals / totalConcede) * 100 : 0;
    const concedeHeadingRatio = totalConcede > 0 ? (concedeHeadingGoals / totalConcede) * 100 : 0;
    
    return {
        shooting: {
            totalShots, totalEffectiveShots, totalGoals,
            inPenaltyGoals, outPenaltyGoals, headingGoals,
            shotEfficiency: shotEfficiency,
            goalConversion: goalConversion
        },
        conceding: {
            totalConcede,
            concedeInPenaltyGoals, 
            concedeOutPenaltyGoals, 
            concedeHeadingGoals,
            concedeInPenaltyRatio,
            concedeOutPenaltyRatio,
            concedeHeadingRatio
        },
        passing: {
            totalPasses, shortPasses, longPasses,
            shortPassRatio: shortPassRatio,
            longPassRatio: longPassRatio
        },
        defense: {
            totalTackles, successfulTackles, totalIntercepts, successfulIntercepts,
            tackleSuccess: tackleSuccess,
            interceptSuccess: interceptSuccess
        },
        dribbling: {
            dribbleAttempts, successfulDribbles,
            dribbleSuccess: dribbleSuccess
        },
        gameFlow: {
            goalsInFirstHalf, goalsInSecondHalf,
            concedeInFirstHalf, concedeInSecondHalf,
            firstHalfStrength: goalsInFirstHalf - concedeInFirstHalf,
            secondHalfStrength: goalsInSecondHalf - concedeInSecondHalf
        },
        results: {
            bigWins, bigLosses, closeGames, comebackWins, blownLeads,
            matchCount: matches.length
        }
    };
}

// 승률 및 트렌드 분석
function analyzeWinRateAndTrend(stats, matches, strengths, weaknesses, feedback) {
    const winRate = stats.winRate;
    const recentMatches = matches.slice(0, Math.min(5, matches.length));
    const recentWins = recentMatches.filter(m => m.matchResult === 1).length;
    const recentWinRate = recentMatches.length > 0 ? (recentWins / recentMatches.length) * 100 : 0;
    
    if (winRate >= 60) {
        strengths.push(`압도적인 승률 ${winRate}% - 이 매치업에서 뚜렷한 우위를 점하고 있습니다`);
        if (recentWinRate > 70) {
            strengths.push(`최근 ${recentMatches.length}경기 승률 ${recentWinRate.toFixed(0)}% - 상승세를 이어가고 있습니다`);
        }
    } else if (winRate >= 50) {
        strengths.push(`준수한 승률 ${winRate}% - 이 매치업에서 선전하고 있습니다`);
        if (recentWinRate >= 60) {
            strengths.push(`최근 경기력 상승 (최근 ${recentWinRate.toFixed(0)}%) - 전술 적응이 성공적입니다`);
        } else if (recentWinRate < 40) {
            weaknesses.push(`최근 ${recentMatches.length}경기 하락세 (${recentWinRate.toFixed(0)}%) - 전술 재점검 필요`);
            feedback.push('최근 패배 경기를 분석하여 상대가 어떻게 대응했는지 파악하세요');
        }
        feedback.push(`승률 ${winRate}%는 안정적이지만, 60% 이상을 목표로 전술을 다듬으세요`);
    } else if (winRate >= 40) {
        weaknesses.push(`균형이 필요한 승률 ${winRate}% - 일관성 있는 경기력 확보가 과제입니다`);
        if (recentWinRate < 40) {
            weaknesses.push(`최근 ${recentMatches.length}경기 부진 (${recentWinRate.toFixed(0)}%) - 즉각적인 전술 변화가 필요합니다`);
            feedback.push('최근 패배 경기를 복기하여 반복되는 실수 패턴을 찾아내세요');
        }
        feedback.push('승률 향상을 위해 핵심 약점 1-2가지에 집중하세요');
    } else {
        weaknesses.push(`낮은 승률 ${winRate}% - 이 포메이션 매치업에서 근본적인 전술 개선이 필요합니다`);
        feedback.push('전혀 다른 접근법을 시도하세요: 공격 템포 변경, 압박 라인 조정, 빌드업 루트 다양화');
        feedback.push('상대 포메이션의 약점을 집중 공략할 특화 전술을 개발하세요');
    }
}

// 공격 패턴 심층 분석
function analyzeAttackPatterns(stats, analysis, strengths, weaknesses, feedback) {
    const shooting = analysis.shooting;
    const avgGoals = stats.avgGoals;
    const totalGoals = shooting.totalGoals;
    
    // 득점 효율성
    if (avgGoals >= 2.5) {
        strengths.push(`높은 득점력 (평균 ${avgGoals.toFixed(1)}골) - 공격 전개가 효과적입니다`);
        
        // 골 유형 분석
        if (totalGoals > 0) {
            const inPenaltyRatio = (shooting.inPenaltyGoals / totalGoals) * 100;
            const outPenaltyRatio = (shooting.outPenaltyGoals / totalGoals) * 100;
            const headingRatio = (shooting.headingGoals / totalGoals) * 100;
            
            if (inPenaltyRatio > 60) {
                strengths.push(`박스 침투 능력 우수 (근거리 골 ${inPenaltyRatio.toFixed(0)}%) - 페널티 박스 내 위치 선정이 탁월합니다`);
            } else if (outPenaltyRatio > 30) {
                strengths.push(`중거리 슛 능력 탁월 (${outPenaltyRatio.toFixed(0)}%) - 상대 수비를 원거리에서 위협합니다`);
            }
            if (headingRatio > 25) {
                strengths.push(`공중볼 장악력 (헤딩 골 ${headingRatio.toFixed(0)}%) - 크로스 및 세트피스 활용이 효과적입니다`);
            }
        }
    } else if (avgGoals >= 2.0) {
        // 중간 상위권
        strengths.push(`준수한 득점력 (평균 ${avgGoals.toFixed(1)}골) - 공격이 안정적입니다`);
    } else if (avgGoals >= 1.5) {
        // 중간권 - 개선 여지
        weaknesses.push(`평범한 득점력 (평균 ${avgGoals.toFixed(1)}골) - 공격 효율성을 더 높일 수 있습니다`);
        
        // 원인 분석
        if (shooting.shotEfficiency < 45) {
            weaknesses.push(`개선 필요한 유효슈팅 비율 (${shooting.shotEfficiency.toFixed(1)}%) - 슈팅 찬스 질 향상 필요`);
            feedback.push('박스 진입 전 한 번 더 패스를 연결하여 더 좋은 찬스를 만드세요');
            feedback.push('측면 크로스와 컷백 패스를 적극 활용하세요');
        }
        if (shooting.goalConversion < 25) {
            weaknesses.push(`마무리 정확도 부족 (골 전환율 ${shooting.goalConversion.toFixed(1)}%) - 결정력 향상 필요`);
            feedback.push('슈팅 연습 시 다양한 각도와 거리에서 반복 훈련하세요');
        }
        
        // 공격 다양성 체크
        if (totalGoals > 0) {
            const inPenaltyRatio = (shooting.inPenaltyGoals / totalGoals) * 100;
            const headingRatio = (shooting.headingGoals / totalGoals) * 100;
            
            if (inPenaltyRatio < 50) {
                feedback.push(`박스 침투 강화 (현재 근거리 골 ${inPenaltyRatio.toFixed(0)}%) - 스루패스와 원투패스로 수비 라인 뒤 공간을 노리세요`);
            }
            if (headingRatio < 15) {
                feedback.push(`공중볼 활용도 증가 (현재 헤딩 골 ${headingRatio.toFixed(0)}%) - 코너킥과 프리킥 전술을 개발하세요`);
            }
        }
    } else {
        // 낮은 득점력
        weaknesses.push(`낮은 득점력 (평균 ${avgGoals.toFixed(1)}골) - 결정력 개선이 시급합니다`);
        
        if (shooting.shotEfficiency < 40) {
            weaknesses.push(`낮은 유효슈팅 비율 (${shooting.shotEfficiency.toFixed(1)}%) - 슈팅 찬스 질이 낮습니다`);
            feedback.push('무리한 슈팅을 자제하고 더 좋은 위치로 볼을 연결하세요');
            feedback.push('윙어와 풀백의 오버래핑으로 측면에서 수적 우위를 만드세요');
        }
        if (shooting.goalConversion < 20) {
            weaknesses.push(`낮은 골 전환율 (${shooting.goalConversion.toFixed(1)}%) - 마무리 정확도가 부족합니다`);
            feedback.push('슈팅 전 골키퍼 위치를 확인하고 반대편 구석을 노리세요');
            feedback.push('1대1 상황에서는 침착하게 골키퍼의 움직임을 유도하세요');
        }
    }
    
    // 드리블 활용도
    const dribble = analysis.dribbling;
    if (dribble.dribbleAttempts > 0) {
        if (dribble.dribbleSuccess >= 60) {
            strengths.push(`효과적인 돌파 (성공률 ${dribble.dribbleSuccess.toFixed(0)}%) - 개인기로 수비를 무너뜨립니다`);
        } else if (dribble.dribbleSuccess < 50) {
            weaknesses.push(`개선 필요한 드리블 (성공률 ${dribble.dribbleSuccess.toFixed(0)}%) - 돌파 성공률 향상 필요`);
            feedback.push('드리블은 상대가 밀집하지 않은 측면이나 역습 상황에서만 시도하세요');
        }
    }
}

// 수비 취약점 분석
function analyzeDefenseVulnerabilities(stats, analysis, strengths, weaknesses, feedback) {
    const avgConcede = stats.avgConcede;
    const defense = analysis.defense;
    
    if (avgConcede <= 1.0) {
        strengths.push(`탁월한 수비 조직력 (평균 ${avgConcede.toFixed(1)}실점) - 견고한 수비를 구축하고 있습니다`);
        
        if (defense.tackleSuccess > 65) {
            strengths.push(`높은 태클 성공률 (${defense.tackleSuccess.toFixed(0)}%) - 적극적인 압박이 효과적입니다`);
        }
        if (defense.interceptSuccess > 60) {
            strengths.push(`우수한 인터셉트 능력 (${defense.interceptSuccess.toFixed(0)}%) - 패스 루트 차단이 탁월합니다`);
        }
    } else if (avgConcede <= 1.5) {
        // 좋은 수비력
        strengths.push(`안정적인 수비 (평균 ${avgConcede.toFixed(1)}실점) - 수비 조직력이 좋습니다`);
    } else if (avgConcede <= 2.0) {
        // 중간 수준 - 개선 여지
        weaknesses.push(`개선 가능한 수비 (평균 ${avgConcede.toFixed(1)}실점) - 실점을 줄일 여지가 있습니다`);
        
        if (defense.tackleSuccess < 55) {
            weaknesses.push(`태클 성공률 향상 필요 (${defense.tackleSuccess.toFixed(0)}%) - 압박 효율성 개선`);
            feedback.push('태클보다는 상대의 진로를 막아 패스 실수를 유도하세요');
        }
        
        if (defense.interceptSuccess < 50) {
            weaknesses.push(`인터셉트 향상 여지 (${defense.interceptSuccess.toFixed(0)}%) - 패스 루트 읽기 개선`);
            feedback.push('상대 공격수의 움직임을 미리 예측하고 패스 경로에 위치하세요');
        }
        
        feedback.push('수비수와 미드필더 간 거리를 좁혀 상대의 침투 패스를 차단하세요');
    } else if (avgConcede <= 2.5) {
        weaknesses.push(`높은 실점 (평균 ${avgConcede.toFixed(1)}실점) - 수비 안정성 개선이 필요합니다`);
        feedback.push('수비 라인을 더 낮추고 조밀하게 유지하여 공간을 최소화하세요');
        feedback.push('위험 지역에서의 집중력을 높이고, 세컨볼 경합을 강화하세요');
    } else {
        weaknesses.push(`과다한 실점 (평균 ${avgConcede.toFixed(1)}실점) - 수비 구조에 심각한 문제가 있습니다`);
        
        if (defense.tackleSuccess < 50) {
            weaknesses.push(`낮은 태클 성공률 (${defense.tackleSuccess.toFixed(0)}%) - 태클 타이밍이 부정확합니다`);
            feedback.push('성급한 태클을 자제하고 상대의 진로를 차단하는 수비를 우선하세요');
            feedback.push('수비수들이 너무 벌어지지 않도록 라인 간격을 좁게 유지하세요');
        }
        
        if (defense.interceptSuccess < 45) {
            weaknesses.push(`낮은 인터셉트 성공률 (${defense.interceptSuccess.toFixed(0)}%) - 패스 루트 예측이 부족합니다`);
            feedback.push('상대 공격수와 미드필더 사이 공간을 압축하여 패스 경로를 제한하세요');
        }
        
        // 실점 패턴 분석
        const gameFlow = analysis.gameFlow;
        if (gameFlow.concedeInSecondHalf > gameFlow.concedeInFirstHalf * 1.5) {
            weaknesses.push('후반 실점 집중 - 체력 저하로 인한 수비 집중력 저하');
            feedback.push('후반 60분 이후 수비형 미드필더를 투입하여 수비를 보강하세요');
            feedback.push('리드 중일 때는 낮은 압박으로 전환하여 체력을 보존하세요');
        }
    }
    
    // 역전패 문제
    const results = analysis.results;
    if (results.blownLeads >= 1) {
        weaknesses.push(`역전패 ${results.blownLeads}회 발생 - 리드 관리 능력 향상 필요`);
        feedback.push('선제골 이후 너무 방어적으로 변하지 말고 추가 득점으로 경기를 확실히 하세요');
        feedback.push('리드 상황에서는 측면 공간을 활용한 역습으로 상대를 계속 위협하세요');
    }
    
    // 실점 유형 분석 (우선순위 높음)
    const conceding = analysis.conceding;
    if (conceding && conceding.totalConcede > 0) {
        // 근거리 실점 (박스 내)
        if (conceding.concedeInPenaltyRatio > 65) {
            weaknesses.push(`박스 내 실점 집중 (근거리 실점 ${conceding.concedeInPenaltyRatio.toFixed(0)}%) - 페널티 박스 수비 강화 필요`);
            feedback.push('박스 안에서 상대 공격수를 밀착 마크하고, 슈팅 각도를 차단하세요');
            feedback.push('크로스 상황에서 수비수들이 골문 앞 위험 지역을 먼저 점령하세요');
        }
        
        // 중거리 실점
        if (conceding.concedeOutPenaltyRatio > 25) {
            weaknesses.push(`중거리 슛 실점 많음 (${conceding.concedeOutPenaltyRatio.toFixed(0)}%) - 박스 바깥 압박 강화 필요`);
            feedback.push('페널티 박스 바깥에서 슈팅 각도를 주지 않도록 빠르게 압박하세요');
            feedback.push('중거리 슛이 강한 선수는 20m 지점부터 밀착 마크하세요');
        }
        
        // 헤딩 실점
        if (conceding.concedeHeadingRatio > 25) {
            weaknesses.push(`헤딩 실점 취약 (${conceding.concedeHeadingRatio.toFixed(0)}%) - 공중볼 수비와 세트피스 대응 개선 필요`);
            feedback.push('크로스 상황에서 키 큰 수비수를 골문 앞에 배치하고, 상대 공격수보다 먼저 위치 선점하세요');
            feedback.push('코너킥 시 지역 방어를 강화하고, 니어 포스트와 파 포스트에 수비수를 배치하세요');
        }
    }
    
    // 골 유형 다양성 체크
    const shooting = analysis.shooting;
    if (shooting && shooting.totalGoals > 0) {
        const headingRatio = (shooting.headingGoals / shooting.totalGoals) * 100;
        if (headingRatio < 10 && shooting.headingGoals < 2) {
            feedback.push('공중볼 활용이 거의 없습니다. 크로스와 세트피스로 득점 루트를 다양화하세요');
        }
    }
    
    // 드리블 활용도
    const dribble = analysis.dribbling;
    if (dribble.dribbleAttempts > 0) {
        if (dribble.dribbleSuccess >= 60) {
            strengths.push(`효과적인 돌파 (성공률 ${dribble.dribbleSuccess.toFixed(0)}%) - 개인기로 수비를 무너뜨립니다`);
        } else if (dribble.dribbleSuccess < 50) {
            weaknesses.push(`드리블 성공률 개선 필요 (${dribble.dribbleSuccess.toFixed(0)}%) - 볼 소실 위험`);
            feedback.push('드리블은 상대가 밀집하지 않은 측면이나 역습 상황에서만 시도하세요');
            feedback.push('1대1 상황에서 페인트 동작으로 상대를 제치는 연습을 하세요');
        }
    }
}

// 경기 흐름 및 시간대별 분석
function analyzeGameFlow(analysis, strengths, weaknesses, feedback) {
    const gameFlow = analysis.gameFlow;
    const results = analysis.results;
    const matchCount = results.matchCount;
    
    // 전후반 강도 분석 (더 세분화)
    if (gameFlow.firstHalfStrength > 2) {
        strengths.push('전반전 지배력 우수 - 빠른 템포로 주도권을 잡습니다');
    } else if (gameFlow.firstHalfStrength >= 0) {
        // 전반전 균형
        if (gameFlow.goalsInFirstHalf < gameFlow.goalsInSecondHalf * 1.5) {
            feedback.push('전반전 득점 강화 - 경기 초반부터 더 적극적으로 공격하여 선제골을 노리세요');
        }
    } else if (gameFlow.firstHalfStrength > -2) {
        weaknesses.push(`전반전 약세 (득실 ${gameFlow.firstHalfStrength.toFixed(1)}) - 초반 적응력 향상 필요`);
        feedback.push('경기 시작 전 충분한 워밍업으로 경기 감각을 끌어올리세요');
        feedback.push('초반 10분은 안정적인 빌드업으로 경기 리듬을 찾으세요');
    } else {
        weaknesses.push('전반전 부진 - 경기 초반 적응이 매우 느립니다');
        feedback.push('경기 시작부터 높은 압박으로 상대를 압도하세요');
        feedback.push('초반 5분간 집중력을 최대로 높여 선제골 기회를 만드세요');
    }
    
    if (gameFlow.secondHalfStrength > 2) {
        strengths.push('후반전 강세 - 지구력과 집중력이 뛰어납니다');
    } else if (gameFlow.secondHalfStrength >= 0) {
        // 후반전 균형
        if (gameFlow.concedeInSecondHalf > gameFlow.concedeInFirstHalf) {
            feedback.push('후반전 수비 집중력 유지 - 체력 관리와 교체 타이밍 최적화가 중요합니다');
        }
    } else if (gameFlow.secondHalfStrength > -2) {
        weaknesses.push(`후반전 약세 (득실 ${gameFlow.secondHalfStrength.toFixed(1)}) - 체력 또는 전술 대응 문제`);
        feedback.push('하프타임에 상대의 전술 변화를 분석하고 대응책을 준비하세요');
        feedback.push('후반 60-70분에 신선한 선수로 교체하여 템포를 유지하세요');
    } else {
        weaknesses.push('후반전 심각한 약세 - 체력 저하나 전술 대응 실패');
        feedback.push('후반 시작 직후 즉시 공격형 교체로 주도권을 되찾으세요');
        feedback.push('리드 중일 때는 수비형 교체로 결과를 지키세요');
    }
    
    // 경기 결과 패턴 (더 상세한 분석)
    if (results.bigWins > matchCount * 0.25) {
        strengths.push(`대승 ${results.bigWins}회 (3골차 이상) - 약한 상대를 확실하게 제압합니다`);
    }
    if (results.bigLosses > matchCount * 0.2) {
        weaknesses.push(`대패 ${results.bigLosses}회 (3골차 이상) - 밀리는 경기에서 무너지는 경향`);
        feedback.push('뒤지는 상황에서도 침착함을 유지하고 전술을 지키며 한 골씩 따라가세요');
        feedback.push('대량 실점 시 너무 공격적으로 변하지 말고 수비 조직력 유지를 우선하세요');
    }
    if (results.closeGames > matchCount * 0.4) {
        weaknesses.push(`접전 ${results.closeGames}회 (1골차 경기) - 결정적 순간의 마무리 부족`);
        feedback.push('접전 상황에서의 집중력을 높이고, 세트피스를 더 효과적으로 활용하세요');
        feedback.push('1-0 리드 상황에서는 추가 득점보다 실점 방지에 집중하세요');
    }
    
    // 역전 능력 (더 상세)
    if (results.comebackWins > 1) {
        strengths.push(`역전승 ${results.comebackWins}회 - 멘탈이 강하고 끈기있는 플레이`);
    } else if (results.comebackWins === 0 && matchCount >= 5) {
        feedback.push('뒤지는 상황에서 역전한 경험이 없습니다 - 불리한 상황에서의 플랜 B를 준비하세요');
    }
}

// 점유율 및 빌드업 분석
function analyzePossessionAndBuildup(stats, analysis, strengths, weaknesses, feedback) {
    const possession = stats.avgPossession;
    const passing = analysis.passing;
    const passSuccess = stats.passSuccess;
    
    // 점유율 분석
    if (possession >= 55) {
        strengths.push(`높은 볼 점유율 (${possession.toFixed(1)}%) - 경기 템포를 주도합니다`);
        
        // 점유율이 높은데 득점이 낮다면
        if (stats.avgGoals < 2.0) {
            weaknesses.push('높은 점유율 대비 득점 부족 - 공격 마무리 단계 문제');
            feedback.push('볼 소유에만 집중하지 말고 위험한 지역(페널티 박스)으로의 침투를 늘리세요');
            feedback.push('측면에서 중앙으로의 컷백 패스와 골문 앞 크로스를 더 활용하세요');
            feedback.push('수비수들이 밀집하기 전 빠른 템포로 공격을 마무리하세요');
        }
    } else if (possession >= 50) {
        // 균형잡힌 점유율
        feedback.push(`균형잡힌 점유율 ${possession.toFixed(1)}% - 상황에 따라 빌드업과 역습을 적절히 사용 중`);
    } else if (possession >= 45) {
        // 약간 낮은 점유율
        if (stats.winRate < 50) {
            weaknesses.push(`낮은 점유율 (${possession.toFixed(1)}%) - 경기 주도권 확보 필요`);
            feedback.push('미드필더의 활동량을 늘려 2차 볼 경합에서 우위를 점하세요');
            feedback.push('측면 풀백의 전진으로 볼 순환 옵션을 늘리세요');
        } else {
            // 낮은 점유율이지만 승률 좋음
            strengths.push(`효율적 역습 (점유율 ${possession.toFixed(1)}%) - 적은 기회를 확실히 살립니다`);
        }
    } else {
        weaknesses.push(`낮은 볼 점유율 (${possession.toFixed(1)}%) - 경기 주도권을 잃고 있습니다`);
        feedback.push('미드필더 수를 늘려 중원 장악력을 강화하세요');
        feedback.push('짧은 패스 위주의 빌드업으로 점유율을 높이고 경기를 안정화하세요');
    }
    
    // 패스 스타일 분석
    if (passing.shortPassRatio > 70) {
        strengths.push(`짧은 패스 중심 (${passing.shortPassRatio.toFixed(0)}%) - 안정적인 빌드업을 구사합니다`);
        if (passSuccess > 80) {
            strengths.push(`높은 패스 성공률 (${passSuccess.toFixed(0)}%) - 볼 컨트롤이 매우 안정적입니다`);
        } else if (passSuccess >= 75) {
            strengths.push(`안정적인 패스 성공률 (${passSuccess.toFixed(0)}%)`);
        }
    } else if (passing.longPassRatio > 40) {
        weaknesses.push(`롱패스 의존도 높음 (${passing.longPassRatio.toFixed(0)}%) - 볼 소유 안정성 저하`);
        feedback.push(`롱패스 비중이 높습니다 - 패스 정확도가 ${passSuccess.toFixed(0)}%로 개선 필요`);
        if (passSuccess < 70) {
            weaknesses.push(`낮은 패스 성공률 (${passSuccess.toFixed(0)}%) - 과도한 롱패스로 볼을 자주 잃습니다`);
            feedback.push('무리한 롱패스를 줄이고 측면으로 전개하는 빌드업을 시도하세요');
        }
    } else if (passSuccess < 75) {
        // 중간 수준 패스
        weaknesses.push(`패스 성공률 향상 여지 (${passSuccess.toFixed(0)}%) - 볼 운영 안정성 개선 가능`);
        feedback.push('압박 상황에서 안전한 백패스를 활용하고, 공간이 있을 때 전진 패스를 시도하세요');
    }
}

// 전술적 효율성 분석
function analyzeTacticalEfficiency(stats, analysis, strengths, weaknesses, feedback) {
    const shooting = analysis.shooting;
    
    // 슈팅 효율성 종합
    const shotsPerGoal = shooting.totalGoals > 0 ? shooting.totalShots / shooting.totalGoals : 0;
    if (shotsPerGoal > 0 && shotsPerGoal < 8) {
        strengths.push(`높은 슈팅 효율 (${shotsPerGoal.toFixed(1)}슛당 1골) - 찬스를 확실하게 살립니다`);
    } else if (shotsPerGoal > 15) {
        weaknesses.push(`낮은 슈팅 효율 (${shotsPerGoal.toFixed(1)}슛당 1골) - 결정력이 매우 부족합니다`);
        feedback.push('골키퍼가 잡기 어려운 구석이나 낮은 슈팅을 연습하세요');
        feedback.push('슈팅 전 골키퍼 위치를 반드시 확인하고 빈 공간을 노리세요');
    } else if (shotsPerGoal > 10) {
        // 중간 수준도 개선점으로
        weaknesses.push(`평범한 슈팅 효율 (${shotsPerGoal.toFixed(1)}슛당 1골) - 결정력 개선 여지가 있습니다`);
        feedback.push('더 명확한 찬스를 만들고, 슈팅 타이밍을 개선하세요');
    }
    
    // 공격-수비 밸런스
    const goalDiff = stats.avgGoals - stats.avgConcede;
    if (goalDiff > 1.5) {
        strengths.push(`압도적 골득실 (+${goalDiff.toFixed(1)}) - 공격과 수비 모두 우수합니다`);
    } else if (goalDiff < -0.5) {
        weaknesses.push(`부정적 골득실 (${goalDiff.toFixed(1)}) - 공격력 강화 또는 수비력 보강 필요`);
        
        if (stats.avgGoals < stats.avgConcede && stats.avgGoals < 1.5) {
            feedback.push('공격형 미드필더나 공격수를 추가 투입하여 공격력을 높이세요');
        } else if (stats.avgConcede > 2) {
            feedback.push('수비형 미드필더를 보강하여 수비 라인을 두텁게 하세요');
        }
    } else if (goalDiff >= 0 && goalDiff <= 0.5) {
        // 근소한 플러스도 개선 여지
        feedback.push(`골득실 +${goalDiff.toFixed(1)} - 좋은 편이지만 더 여유있는 승리를 위해 공격력을 강화하세요`);
    }
    
    // 종합 전술 피드백
    if (stats.winRate >= 50 && stats.avgGoals >= 2.0) {
        feedback.push('현재 전술이 효과적입니다. 선수 개개인의 컨디션 관리에 집중하세요');
    } else if (stats.winRate < 50) {
        feedback.push('포메이션 변경을 고려하세요. 상대의 강점을 무력화할 수 있는 전술을 개발하세요');
        feedback.push('빠른 측면 공격수나 표적형 스트라이커 등 다양한 공격 옵션을 준비하세요');
    }
}

// 추가 개선점 찾기 (데이터 기반) - 항상 실행
function findAdditionalImprovements(stats, analysis, strengths, weaknesses, feedback) {
    const shooting = analysis.shooting;
    const passing = analysis.passing;
    const defense = analysis.defense;
    
    
    // 득점력 범위별 체크 (빠짐없이)
    if (stats.avgGoals >= 2.0 && stats.avgGoals < 2.5) {
        feedback.push(`득점력 ${stats.avgGoals.toFixed(1)}골 - 좋지만 2.5골 이상을 목표로 공격 옵션을 더 다양화하세요`);
    } else if (stats.avgGoals >= 1.5 && stats.avgGoals < 2.0) {
        weaknesses.push(`평범한 득점력 (평균 ${stats.avgGoals.toFixed(1)}골) - 공격 다양성 추가로 득점력 향상 가능`);
        feedback.push('다양한 공격 루트를 개발하세요: 측면 돌파, 중앙 침투, 롱슛 등');
        feedback.push('공격 전개 속도를 상황에 맞게 조절하세요 (빠른 역습 vs 느린 빌드업)');
    }
    
    // 실점 범위별 체크
    if (stats.avgConcede >= 1.5 && stats.avgConcede < 2.0) {
        weaknesses.push(`개선 가능한 수비 (평균 ${stats.avgConcede.toFixed(1)}실점) - 수비 집중력 향상 필요`);
        feedback.push('위험한 순간 수비 라인을 더 조밀하게 유지하세요');
        feedback.push('상대 핵심 공격수를 밀착 마크하여 플레이 기회를 제한하세요');
    } else if (stats.avgConcede >= 2.0 && stats.avgConcede < 2.5) {
        weaknesses.push(`높은 실점 (평균 ${stats.avgConcede.toFixed(1)}실점) - 수비 개선이 필요합니다`);
        feedback.push('수비 조직력을 강화하고, 백업 수비수를 항상 준비시키세요');
    }
    
    // 점유율 중간 수준
    if (stats.avgPossession >= 48 && stats.avgPossession < 52) {
        feedback.push(`점유율 ${stats.avgPossession.toFixed(0)}% - 균형적이지만 명확한 전술 정체성 확립이 중요합니다`);
        feedback.push('팀 스타일을 명확히 하세요: 공격적 압박형 vs 수비 후 역습형');
    }
    
    // 패스 성공률 범위별 체크
    if (stats.passSuccess >= 78 && stats.passSuccess < 82) {
        feedback.push(`패스 성공률 ${stats.passSuccess.toFixed(0)}% - 좋은 수준이지만 85% 이상 목표로 더 안정적인 볼 운영을 추구하세요`);
    } else if (stats.passSuccess >= 70 && stats.passSuccess < 78) {
        weaknesses.push(`개선 가능한 패스 성공률 (${stats.passSuccess.toFixed(0)}%) - 볼 운영 안정성 향상 여지`);
        feedback.push('압박 받을 때 안전한 선택을 우선하고, 불필요한 리스크를 줄이세요');
        feedback.push('어려운 상황에서는 백패스나 측면 전개로 안전하게 볼을 순환하세요');
    }
    
    // 슈팅 정확도 범위별 체크
    if (stats.shootAccuracy >= 45 && stats.shootAccuracy < 55) {
        feedback.push(`슈팅 정확도 ${stats.shootAccuracy.toFixed(0)}% - 더 명확한 찬스 메이킹으로 60% 이상을 목표하세요`);
    } else if (stats.shootAccuracy >= 35 && stats.shootAccuracy < 45) {
        weaknesses.push(`평범한 슈팅 정확도 (${stats.shootAccuracy.toFixed(0)}%) - 슈팅 찬스의 질 향상 필요`);
        feedback.push('서두르지 말고 좋은 슈팅 포지션을 만든 후 정확하게 마무리하세요');
        feedback.push('무리한 장거리 슈팅보다 박스 침투를 우선하세요');
    }
    
    // 수비 성공률 체크
    if (stats.defenseSuccess >= 50 && stats.defenseSuccess < 60) {
        feedback.push(`수비 성공률 ${stats.defenseSuccess.toFixed(0)}% - 압박과 인터셉트 타이밍을 개선하면 더 효과적입니다`);
    }
    
    // 승률 세분화
    if (stats.winRate >= 50 && stats.winRate < 55) {
        weaknesses.push(`승률 ${stats.winRate}% - 안정적이지만 한 단계 더 도약 가능`);
        feedback.push('핵심 경기에서의 집중력을 높여 60% 이상 승률을 목표하세요');
    } else if (stats.winRate >= 55 && stats.winRate < 60) {
        feedback.push(`승률 ${stats.winRate}%는 우수하지만, 지속 가능한 전술 개선으로 더 높일 수 있습니다`);
    }
}

// 상대적 약점 찾기 (비교 분석) - 항상 실행
function findRelativeWeaknesses(stats, analysis) {
    const improvements = [];
    
    
    // 모든 지표를 점수화하여 가장 낮은 것 찾기
    const metrics = [];
    
    // 승률 점수 (0-100)
    metrics.push({ 
        name: '승률', 
        score: stats.winRate, 
        message: `승률 개선 여지 있음 (현재 ${stats.winRate}%)`, 
        advice: '핵심 경기에서의 집중력을 높이고, 세트피스 상황을 더 효과적으로 활용하세요' 
    });
    
    // 득점력 점수 (평균 득점 * 35, 최대 100)
    const goalScore = Math.min(stats.avgGoals * 35, 100);
    metrics.push({ 
        name: '득점력', 
        score: goalScore, 
        message: `득점력 향상 가능 (평균 ${stats.avgGoals.toFixed(1)}골/경기)`, 
        advice: '공격 템포를 다양화하고, 상대 수비 조직이 갖춰지기 전 빠른 공격을 시도하세요' 
    });
    
    // 수비력 점수 (100 - 평균 실점 * 40, 최대 100)
    const defenseScore = Math.max(100 - stats.avgConcede * 40, 0);
    metrics.push({ 
        name: '수비력', 
        score: defenseScore, 
        message: `수비 안정성 개선 필요 (평균 ${stats.avgConcede.toFixed(1)}실점/경기)`, 
        advice: '수비 라인 간격을 좁히고, 위험 지역에서 더블 커버를 활용하세요' 
    });
    
    // 점유율 점수 (이상적인 값 55에서 얼마나 가까운가)
    const possessionScore = 100 - Math.abs(stats.avgPossession - 55) * 1.5;
    metrics.push({ 
        name: '점유율', 
        score: possessionScore, 
        message: `볼 점유율 최적화 필요 (현재 ${stats.avgPossession.toFixed(0)}%)`, 
        advice: '중원 장악력을 높이고, 미드필더의 활동 반경을 넓혀 더 많은 볼 터치 기회를 만드세요' 
    });
    
    // 패스 성공률 점수
    const passScore = stats.passSuccess;
    metrics.push({ 
        name: '패스', 
        score: passScore, 
        message: `패스 정확도 개선 가능 (현재 ${stats.passSuccess.toFixed(0)}%)`, 
        advice: '어려운 패스는 피하고, 확실한 패스 각도가 나올 때까지 볼을 킵하세요' 
    });
    
    // 슈팅 정확도 점수
    const shootScore = stats.shootAccuracy;
    metrics.push({ 
        name: '슈팅', 
        score: shootScore, 
        message: `슈팅 정확도 개선 필요 (현재 ${stats.shootAccuracy.toFixed(0)}%)`, 
        advice: '페널티 박스 내에서 더 침착하게 슈팅 타이밍을 잡고, 골키퍼가 반응하기 어려운 곳을 노리세요' 
    });
    
    // 수비 성공률 점수
    const defenseSuccessScore = stats.defenseSuccess;
    metrics.push({ 
        name: '수비 성공률', 
        score: defenseSuccessScore, 
        message: `수비 대응 성공률 개선 (현재 ${stats.defenseSuccess.toFixed(0)}%)`, 
        advice: '성급한 태클보다는 포지셔닝으로 상대의 패스 루트를 차단하세요' 
    });
    
    // 점수가 낮은 순서대로 정렬
    metrics.sort((a, b) => a.score - b.score);
    
    
    // 가장 낮은 2-3개를 개선점으로 제시
    const worstMetrics = metrics.slice(0, 3);
    worstMetrics.forEach(metric => {
        improvements.push(metric.message);
    });
    
    // 구체적 조언도 추가 (중복 방지)
    const topAdvices = metrics.slice(0, 2);
    topAdvices.forEach(metric => {
        if (!improvements.includes(metric.advice)) {
            improvements.push(metric.advice);
        }
    });
    
    
    return improvements;
}

// 상대적 강점 찾기
function findRelativeStrengths(stats, analysis) {
    const strengths = [];
    
    // 지표별 점수
    const metrics = [];
    metrics.push({ name: '승률', score: stats.winRate, message: `안정적인 승률 ${stats.winRate}%` });
    metrics.push({ name: '득점력', score: Math.min(stats.avgGoals * 30, 100), message: `준수한 득점력 (평균 ${stats.avgGoals.toFixed(1)}골)` });
    metrics.push({ name: '수비력', score: Math.max(100 - stats.avgConcede * 30, 0), message: `괜찮은 수비력 (평균 ${stats.avgConcede.toFixed(1)}실점)` });
    metrics.push({ name: '패스', score: stats.passSuccess, message: `안정적인 패스 성공률 ${stats.passSuccess.toFixed(0)}%` });
    
    // 점수가 높은 순서대로 정렬
    metrics.sort((a, b) => b.score - a.score);
    
    // 가장 높은 2개를 강점으로
    const bestMetrics = metrics.slice(0, 2);
    bestMetrics.forEach(metric => {
        if (metric.score >= 60) { // 일정 수준 이상만
            strengths.push(metric.message);
        }
    });
    
    return strengths;
}

// 포메이션 그룹 가이드 표시 함수
function showFormationGroupsGuide(message) {
    const groupsSection = document.getElementById('formationGroupsSection');
    if (!groupsSection) return;
    
    groupsSection.innerHTML = `
        <div class="formation-groups-guide">
            <div class="guide-icon">📊</div>
            <div class="guide-content">
                <h4>포메이션 그룹 분석</h4>
                <p>${message}</p>
                
            </div>
        </div>
    `;
}

// 포메이션 슬라이더 버튼 상태 업데이트
function updateFormationSliderButtons() {
    if (formationSliderPrevBtn) {
        formationSliderPrevBtn.disabled = formationCurrentSlideIndex === 0;
    }
    if (formationSliderNextBtn) {
        formationSliderNextBtn.disabled = formationCurrentSlideIndex === formationTotalSlides - 1 || formationTotalSlides === 0;
    }
}


// 포메이션 로딩 표시
function showFormationLoading(message = '포메이션 데이터 분석 중...') {
    if (formationLoading) {
        formationLoading.style.display = 'flex';
        const loadingText = formationLoading.querySelector('span');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }
    if (formationLayout) formationLayout.style.display = 'none';
    if (noFormationData) noFormationData.style.display = 'none';
    
    // 슬라이더 위치 초기화
    if (formationPerformanceTrack) {
        formationPerformanceTrack.style.transform = 'translateX(0%)';
        formationCurrentSlideIndex = 0;
    }
}

// 포메이션 로딩 숨기기
function hideFormationLoading() {
    if (formationLoading) formationLoading.style.display = 'none';
    if (formationLayout) formationLayout.style.display = 'flex';
}

// 포메이션 데이터 없음 표시
function showNoFormationData() {
    if (formationLoading) formationLoading.style.display = 'none';
    if (formationLayout) formationLayout.style.display = 'none';
    if (noFormationData) noFormationData.style.display = 'block';
    
    // 슬라이더 위치 초기화
    if (formationPerformanceTrack) {
        formationPerformanceTrack.style.transform = 'translateX(0%)';
        formationCurrentSlideIndex = 0;
    }
}

// DOM이 로드된 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 팝업 오버레이 클릭 이벤트 추가
    addPopupOverlayClickEvent();
});

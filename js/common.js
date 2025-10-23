// API 설정 - 서버를 통해 처리하므로 프론트엔드에서는 불필요
// const API_KEY는 보안상 제거됨 - 서버(.env)에서 관리
const BASE_URL = 'https://open.api.nexon.com/fconline/v1';

// 넥슨 API의 실제 엔드포인트들 (문서 기반)
const NEXON_ENDPOINTS = {
    userBasic: 'https://open.api.nexon.com/fconline/v1/user/basic',
    userInfo: 'https://open.api.nexon.com/fconline/v1/user/info',
    userMatch: 'https://open.api.nexon.com/fconline/v1/user/match',
    // 대안 엔드포인트들
    userBasicAlt: 'https://open.api.nexon.com/fconline/v1/user',
    userInfoAlt: 'https://open.api.nexon.com/fconline/v1/user/detail'
};

// DOM 요소들
const nicknameInput = document.getElementById('nicknameInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

// 검색 드롭다운 관련 요소들
const searchDropdown = document.getElementById('searchDropdown');
const favoritesList = document.getElementById('favoritesList');
const historyList = document.getElementById('historyList');
const clearFavoritesBtn = document.getElementById('clearFavoritesBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// 선수 정보 관련 요소들
const playerBasicInfo = document.getElementById('playerBasicInfo');
const playerName = document.getElementById('playerName');
const currentGradeText = document.getElementById('currentGradeText');
const highestGradeText = document.getElementById('highestGradeText');
const playerLevel = document.getElementById('playerLevel');

// 경기 특징 관련 요소들
const playStyle = document.getElementById('playStyle');
const mainStrength = document.getElementById('mainStrength');
const gameTendency = document.getElementById('gameTendency');

// 탭 관련 요소들
const tabContainer = document.getElementById('tabContainer');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// 대시보드 관련 요소들
const winRate = document.getElementById('winRate');
const avgGoals = document.getElementById('avgGoals');
const avgConceded = document.getElementById('avgConceded');
const matchesList = document.getElementById('matchesList');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const matchCount = document.getElementById('matchCount');


// 컨트롤러 타입 매핑
const CONTROLLER_INFO = {
    'keyboard': { name: '키보드', emoji: '⌨️' },
    'gamepad': { name: '게임패드', emoji: '🎮' },
    'pad': { name: '게임패드', emoji: '🎮' }
};

// 컨트롤러 이모지 가져오기 함수
function getControllerEmoji(controllerType) {
    if (controllerType === null || controllerType === undefined || controllerType === '') {
        return '';
    }
    
    // 문자열을 소문자로 변환하여 매칭
    const normalizedType = controllerType.toLowerCase();
    const controllerInfo = CONTROLLER_INFO[normalizedType];
    
    
    return controllerInfo ? controllerInfo.emoji : '';
}

// 전역 변수
let currentUserInfo = null;

// 각 탭별 독립적인 경기 데이터 및 offset
let dashboardMatches = [];  // 대시보드 전용 경기 데이터
let dashboardOffset = 10;   // 대시보드 더보기 offset

let teamTabMatches = [];    // 구단별 데이터 탭 전용 경기 데이터
let teamTabOffset = 0;      // 구단별 데이터 탭 offset

let formationTabMatches = []; // 포메이션 분석 탭 전용 경기 데이터
let formationTabOffset = 0;   // 포메이션 분석 탭 offset

// 검색 기록과 즐겨찾기 관리
let searchHistory = JSON.parse(localStorage.getItem('fcData_searchHistory') || '[]');
let favorites = JSON.parse(localStorage.getItem('fcData_favorites') || '[]');
let selectedIndex = -1;

// 이메일 팝업 관련 요소들
const emailBtn = document.getElementById('emailBtn');
const emailPopup = document.getElementById('emailPopup');
const closeEmailBtn = document.getElementById('closeEmailBtn');
const copyEmailBtn = document.getElementById('copyEmailBtn');

// 경기 수 업데이트 함수 (대시보드 전용)
function updateMatchCount() {
    // 대시보드 탭 내부의 match-item만 선택
    const dashboardMatchesList = document.getElementById('matchesList');
    const matchItems = dashboardMatchesList ? dashboardMatchesList.querySelectorAll('.match-item') : [];
    const count = matchItems.length;
    matchCount.textContent = `(${count}경기)`;
    
    // 골 넣는 유형과 주요 선수 카드의 경기 수도 업데이트
    const goalAnalysisMatchCount = document.getElementById('goalAnalysisMatchCount');
    const topPlayersMatchCount = document.getElementById('topPlayersMatchCount');
    
    if (goalAnalysisMatchCount) {
        goalAnalysisMatchCount.textContent = `(${count}경기)`;
    }
    if (topPlayersMatchCount) {
        topPlayersMatchCount.textContent = `(${count}경기)`;
    }
}

// 이메일 팝업 열기
function openEmailPopup() {
    if (emailPopup) {
        emailPopup.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// 이메일 팝업 닫기
function closeEmailPopup() {
    if (emailPopup) {
        emailPopup.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// 이메일 복사 기능
function copyEmailToClipboard() {
    const email = 'serengrinf@gmail.com';
    
    if (navigator.clipboard && window.isSecureContext) {
        // 최신 브라우저의 Clipboard API 사용
        navigator.clipboard.writeText(email).then(() => {
            showCopySuccess();
        }).catch(() => {
            fallbackCopyTextToClipboard(email);
        });
    } else {
        // 구형 브라우저를 위한 fallback
        fallbackCopyTextToClipboard(email);
    }
}

// 구형 브라우저용 복사 함수
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopySuccess();
        } else {
            showCopyError();
        }
    } catch (err) {
        showCopyError();
    }
    
    document.body.removeChild(textArea);
}

// 복사 성공 메시지
function showCopySuccess() {
    const originalText = copyEmailBtn.textContent;
    copyEmailBtn.textContent = '복사됨!';
    copyEmailBtn.style.background = '#28a745';
    
    setTimeout(() => {
        copyEmailBtn.textContent = originalText;
        copyEmailBtn.style.background = '';
    }, 2000);
}

// 복사 실패 메시지
function showCopyError() {
    const originalText = copyEmailBtn.textContent;
    copyEmailBtn.textContent = '복사 실패';
    copyEmailBtn.style.background = '#dc3545';
    
    setTimeout(() => {
        copyEmailBtn.textContent = originalText;
        copyEmailBtn.style.background = '';
    }, 2000);
}


// 이메일 팝업 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function() {
    // 이메일 버튼 클릭 이벤트
    if (emailBtn) {
        emailBtn.addEventListener('click', openEmailPopup);
    }
    
    // 팝업 닫기 버튼 이벤트
    if (closeEmailBtn) {
        closeEmailBtn.addEventListener('click', closeEmailPopup);
    }
    
    // 이메일 복사 버튼 이벤트
    if (copyEmailBtn) {
        copyEmailBtn.addEventListener('click', copyEmailToClipboard);
    }
    
    // 팝업 배경 클릭 시 닫기
    if (emailPopup) {
        emailPopup.addEventListener('click', function(e) {
            if (e.target === emailPopup) {
                closeEmailPopup();
            }
        });
    }
    
    // ESC 키로 팝업 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && emailPopup && emailPopup.style.display === 'flex') {
            closeEmailPopup();
        }
    });
});

// 경기 통계 업데이트 (더보기로 경기 추가 시 호출)
function updateMatchStatistics() {
    if (!currentUserInfo || !currentUserInfo.matches || currentUserInfo.matches.length === 0) {
        return;
    }
    
    
    // 전체 경기 데이터로 통계 재계산
    const matchStats = calculateMatchStats(currentUserInfo.matches);
    
    // 승률, 평균 득점, 평균 실점 업데이트
    if (winRate) {
        winRate.textContent = `${matchStats.winRate}%`;
    }
    if (avgGoals) {
        avgGoals.textContent = matchStats.avgGoals.toFixed(1);
    }
    if (avgConceded) {
        avgConceded.textContent = matchStats.avgConceded.toFixed(1);
    }
    
    // 경기력 트렌드 업데이트
    displayTrend(matchStats.trend);
    
    // 골 유형 분석 업데이트
    displayGoalAnalysis(matchStats.goalTypes);
    
    // 주요 선수 업데이트 (현재 사용자의 모든 매치 데이터 사용)
    if (currentUserInfo && currentUserInfo.matches) {
        displayTopPlayers(currentUserInfo.matches);
    }
    
}

// 테마 전환 함수
function initTheme() {
    // 다크 테마로 고정
    document.documentElement.setAttribute('data-theme', 'dark');
}

// 검색 버튼 클릭 이벤트: 페이지의 검색 버튼은 항상 즉시 검색 실행
function isMobileUA() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function handleSearchClick(e) {
    // 즉시 검색 수행 (팝업은 하단 검색 탭에서만 호출)
    if (e) e.preventDefault();
    searchUser();
}

searchBtn.addEventListener('click', handleSearchClick);
nicknameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchUser();
    }
});

// 탭 버튼 이벤트
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        switchTab(tabId);
    });
});

// YouTube 버튼 클릭 추적
const youtubeBtn = document.getElementById('followBtn');
const logoEl = document.getElementById('logo');
const mobileTabbar = document.getElementById('mobileTabbar');
// 모바일 검색 팝업 요소들
const mobileSearchPopup = document.getElementById('mobileSearchPopup');
const mobileNicknameInput = document.getElementById('mobileNicknameInput');
const mobileMatchTypeSelect = document.getElementById('mobileMatchTypeSelect');
const confirmMobileSearchBtn = document.getElementById('confirmMobileSearchBtn');
const closeMobileSearchBtn = document.getElementById('closeMobileSearchBtn');
if (youtubeBtn) {
    youtubeBtn.addEventListener('click', () => {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'click', {
                'event_category': 'engagement',
                'event_label': 'YouTube Channel Link',
                'value': 'External Link'
            });
        }
    });
}

// Logo click: go home-like behavior and show search on mobile
if (logoEl) {
    logoEl.addEventListener('click', () => {
        try {
            var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
            if (isMobile) {
                document.body.classList.remove('mobile-searched');
                // scroll to top to reveal header/search
                window.scrollTo({ top: 0, behavior: 'smooth' });
                // activate search tab in bottom bar when returning home
                setActiveMobileTab('search');
            }
        } catch (e) {}
    });
}

// Helper to set active state on mobile bottom tabs
function setActiveMobileTab(tabId) {
    if (!mobileTabbar) return;
    const items = mobileTabbar.querySelectorAll('.mobile-tabitem');
    items.forEach(i => i.classList.remove('active'));
    const target = mobileTabbar.querySelector(`.mobile-tabitem[data-tab="${tabId}"]`);
    if (target) target.classList.add('active');
}

// Wire up bottom bar actions
if (mobileTabbar) {
    mobileTabbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.mobile-tabitem');
        if (!btn) return;
        const tabId = btn.getAttribute('data-tab');
        // Special case: search tab opens mobile popup (keeps bottom tab visible)
        if (tabId === 'search') {
            openMobileSearch();
            setActiveMobileTab('search');
            return;
        }

        // Rival tab might be hidden depending on matchType
        if (tabId === 'rival') {
            const rivalTabBtn = document.getElementById('rivalTabBtn');
            if (rivalTabBtn && rivalTabBtn.style.display === 'none') {
                return; // ignore when not available
            }
        }

        // Switch main content tab and sync active state
        switchTab(tabId);
        setActiveMobileTab(tabId);
    });
}

// 모바일 검색 팝업 동작
function openMobileSearch() {
    if (!mobileSearchPopup) return;
    // 메인 매치타입 값을 팝업에 반영
    const mainMatch = document.getElementById('matchTypeSelect');
    if (mainMatch && mobileMatchTypeSelect) {
        mobileMatchTypeSelect.value = mainMatch.value;
    }
    // 기존 입력값을 팝업에 프리필
    if (nicknameInput && mobileNicknameInput) {
        mobileNicknameInput.value = nicknameInput.value || '';
    }
    mobileSearchPopup.style.display = 'flex';
    document.body.classList.add('mobile-popup-open');
    lockScroll();
    setActiveMobileTab('search');
    setTimeout(() => { try { mobileNicknameInput && mobileNicknameInput.focus(); } catch(e){} }, 50);
}

function closeMobileSearch() {
    if (!mobileSearchPopup) return;
    mobileSearchPopup.style.display = 'none';
    document.body.classList.remove('mobile-popup-open');
    unlockScroll();
}

if (closeMobileSearchBtn) {
    closeMobileSearchBtn.addEventListener('click', closeMobileSearch);
}

if (confirmMobileSearchBtn) {
    confirmMobileSearchBtn.addEventListener('click', () => {
        // 값 복사 후 실제 검색 실행 (기존 데이터는 확인 전까지 유지)
        const mainMatch = document.getElementById('matchTypeSelect');
        if (mobileMatchTypeSelect && mainMatch) {
            mainMatch.value = mobileMatchTypeSelect.value;
        }
        if (mobileNicknameInput && nicknameInput) {
            nicknameInput.value = mobileNicknameInput.value.trim();
        }
        // 팝업을 유지한 채로 검색 시작 (팝업 하단에 로딩 노출)
        searchUser();
    });
}

if (mobileSearchPopup) {
    mobileSearchPopup.addEventListener('click', (e) => {
        if (e.target === mobileSearchPopup) closeMobileSearch();
    });
}

if (mobileNicknameInput) {
    mobileNicknameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmMobileSearchBtn && confirmMobileSearchBtn.click();
        }
    });
}

// Sync mobile rival tab visibility with desktop control
function syncMobileRivalTabVisibility() {
    const rivalTabBtn = document.getElementById('rivalTabBtn');
    const mobileRival = document.getElementById('mobileRivalTabBtn');
    if (!mobileRival || !rivalTabBtn) return;
    mobileRival.style.display = rivalTabBtn.style.display || '';
}

// Call sync when rival visibility changes within search flow
// Patch into existing places toggling rivalTabBtn


// 유저 검색 함수 (서버에서 한 번에 처리)
async function searchUser() {
    const nickname = nicknameInput.value.trim();
    
    if (!nickname) {
        showError('닉네임을 입력해주세요.');
        return;
    }
    
    try {
        // If searching via mobile popup, show popup loader and keep global loader hidden
        const popupLoader = document.getElementById('mobilePopupLoading');
        const viaMobilePopup = document.body.classList.contains('mobile-popup-open');
        if (viaMobilePopup && popupLoader) {
            popupLoader.style.display = 'flex';
        } else {
            showLoading(true);
        }
        hideError();
        // 모바일 팝업 검색 시 기존 데이터는 유지
        if (!viaMobilePopup) {
            hideResults();
        }
        
        // 선택된 매치코드 가져오기
        const matchType = document.getElementById('matchTypeSelect').value;
        
        // 서버 API 엔드포인트 호출 (서버에서 2단계 모두 처리)
        const url = `/api/search/${encodeURIComponent(nickname)}?matchType=${matchType}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        
        if (!response.ok) {
            const errorText = await response.text();
            
            if (response.status === 404) {
                showError('존재하지 않는 닉네임입니다. 닉네임을 정확히 입력해주세요.');
                return;
            }
            if (response.status === 400) {
                showError('올바르지 않은 닉네임 형식입니다. 특수문자나 공백 없이 입력해주세요.');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const userInfo = await response.json();
        
        
        // 관리자 대시보드 확인
        if (userInfo.isAdmin && userInfo.adminDashboard) {
            displayAdminDashboard(userInfo.adminDashboard);
            return;
        }
        
            if (userInfo) {
                currentUserInfo = userInfo; // 전역 변수에 저장
                
                // 매치코드에 따라 라이벌 매치 탭 표시/숨김 처리
                const rivalTabBtn = document.getElementById('rivalTabBtn');
                
                if (rivalTabBtn) {
                    if (matchType === '50' || matchType === '60') {
                        // 공식경기 또는 친선경기: 라이벌 매치 탭 표시
                        rivalTabBtn.style.display = 'inline-flex';
                        syncMobileRivalTabVisibility();
                    } else if (matchType === '52') {
                        // 감독모드: 라이벌 매치 탭 숨김
                        rivalTabBtn.style.display = 'none';
                        syncMobileRivalTabVisibility();
                        
                        // 현재 라이벌 매치 탭이 활성화되어 있다면 대시보드로 이동
                        const activeTab = document.querySelector('.tab-btn.active');
                        if (activeTab && activeTab.dataset.tab === 'rival') {
                            switchTab('dashboard');
                            setActiveMobileTab('dashboard');
                        }
                    }
                }
                
                // 각 탭별 데이터 초기화
                dashboardMatches = userInfo.matches || [];
                dashboardOffset = (userInfo.matches || []).length;
                
                teamTabMatches = [];
                teamTabOffset = 0;
                
                formationTabMatches = [];
                formationTabOffset = 0;
                
                // 구단별 데이터 캐시 초기화 (새로운 사용자 검색 시)
                teamDataCache = null;
                teamDataLoaded = false;
                
                // 포메이션 데이터 캐시 초기화 (새로운 사용자 검색 시)
                formationDataCache = null;
                formationDataLoaded = false;
                
                // 라이벌 매치 데이터 초기화 (새로운 사용자 검색 시)
                if (typeof rivalMatchManager !== 'undefined') {
                    const rivalContainer = document.getElementById('rival-container');
                    if (rivalContainer) {
                        rivalContainer.innerHTML = '';
                    }
                    rivalMatchManager.rivalMatches = [];
                    rivalMatchManager.rivalNickname = null;
                    rivalMatchManager.rivalOffset = 10;
                }
                
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
                
                // 검색 기록에 추가
                addToSearchHistory(nickname);
                
                // Google Analytics 검색 이벤트 추적
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'search', {
                        'search_term': nickname,
                        'event_category': 'user_interaction'
                    });
                }
                
                displayPlayerInfo(userInfo, nickname);
                showDashboard(userInfo);

                // Mobile-only: hide search section after successful search
                try {
                    var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
                    if (isMobile) {
                        document.body.classList.add('mobile-searched');
                    }
                } catch (e) {}

                // Close mobile popup after data loaded
                if (viaMobilePopup) {
                    closeMobileSearch();
                }
            } else {
                showError('유저 정보를 가져올 수 없습니다.');
            }
        
    } catch (error) {
        if (error.message.includes('400')) {
            showError('올바르지 않은 닉네임입니다. 닉네임을 다시 확인해주세요.');
        } else if (error.message.includes('404')) {
            showError('해당 닉네임의 유저를 찾을 수 없습니다.');
        } else if (error.message.includes('500')) {
            showError('서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } else {
            showError('네트워크 연결을 확인하고 다시 시도해주세요.');
        }
    } finally {
        const popupLoader = document.getElementById('mobilePopupLoading');
        if (popupLoader) popupLoader.style.display = 'none';
        showLoading(false);
    }
}

// API 테스트 함수는 서버를 통해 처리하므로 제거됨
// 모든 API 호출은 /api/* 엔드포인트를 통해 서버에서 안전하게 처리됩니다

// 닉네임으로 accessId 조회 (서버를 통해)
async function getAccessIdByNickname(nickname) {
    try {
        
        // 서버 API 엔드포인트 호출
        const url = `/api/search/${encodeURIComponent(nickname)}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        
        if (!response.ok) {
            const errorText = await response.text();
            
            if (response.status === 404) {
                return null; // 유저를 찾을 수 없음
            }
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        return data.id || data.accessId || data.userId;
        
    } catch (error) {
        throw error;
    }
}

// accessId로 유저 정보 조회 (서버를 통해)
async function getUserInfo(accessId) {
    try {
        
        // 서버 API 엔드포인트 호출
        const url = `/api/user/${accessId}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        throw error;
    }
}

// 선수 정보 표시 - 공식 경기 등급 시스템 적용
function displayPlayerInfo(userInfo, nickname) {
    // 컨트롤러 정보 디버깅
    
    // 선수 이름 설정 (컨트롤러 이모지 포함)
    const controllerEmoji = getControllerEmoji(userInfo.controller);
    const displayName = userInfo.nickname || nickname;
    playerName.textContent = `${displayName} ${controllerEmoji}`;
    
    // 레벨 설정
    if (userInfo.level !== undefined && userInfo.level !== null) {
        playerLevel.textContent = userInfo.level;
    }
    
    // 역대 최고 등급 정보만 사용
    const maxDivision = userInfo.maxDivision;
    const maxDivisionInfo = userInfo.maxDivisionInfo;
    
    
    // 등급 이미지 표시 (역대 최고 등급만 표시)
    displayDivisionImage('currentGradeImage', maxDivision, maxDivisionInfo);
    // 최고 등급 이미지는 숨김 처리 (중복 방지)
    const highestGradeElement = document.getElementById('highestGradeImage');
    if (highestGradeElement) {
        highestGradeElement.style.display = 'none';
    }
    
    // player-card에 등급별 배경 클래스 추가
    const playerCard = document.querySelector('.player-card');
    if (playerCard && maxDivisionInfo && maxDivisionInfo.level) {
        // 기존 등급 클래스 제거
        playerCard.className = playerCard.className.replace(/division-tier-[\w\d]+/g, '').trim();
        
        // 등급 레벨에 따라 클래스 추가
        const level = maxDivisionInfo.level;
        let tierClass = '';
        
        if (level === 1) {
            tierClass = 'division-tier-level1'; // 슈퍼챔피언스 - 검은/갈색
        } else if (level === 2) {
            tierClass = 'division-tier-level2'; // 챔피언스 - 자주색
        } else if (level === 3) {
            tierClass = 'division-tier-level3'; // 슈퍼챌린지 - 청록색 차별화
        } else if (level >= 4 && level <= 6) {
            tierClass = 'division-tier-challenger'; // 챌린지 - 청록색 (메인 컬러)
        } else if (level >= 7 && level <= 9) {
            tierClass = 'division-tier-worldclass'; // 월드클래스 - 파랑/보라
        } else if (level >= 10 && level <= 12) {
            tierClass = 'division-tier-pro'; // 프로 - 골드
        } else if (level >= 13 && level <= 15) {
            tierClass = 'division-tier-semipro'; // 세미프로 - 실버
        } else if (level >= 16 && level <= 18) {
            tierClass = 'division-tier-amateur'; // 유망주 - 브론즈
        }
        
        if (tierClass) {
            playerCard.classList.add(tierClass);
        }
    }
    
    // 경기 특징 표시
    displayPlayerCharacteristics(userInfo);
    
    // 선수 기본 정보 섹션 표시
    playerBasicInfo.style.display = 'block';
}

// 공식 경기 등급 이미지 표시 함수
function displayDivisionImage(elementId, divisionId, divisionInfo) {
    const element = document.getElementById(elementId);
    
    if (!element) return;
    
    
    // 기존 등급 클래스 제거
    element.className = element.className.replace(/division-\d+/g, '');
    
    if (divisionId && divisionInfo) {
        // 공식 경기 등급 이미지 URL 생성
        const imageUrl = getDivisionImageUrl(divisionInfo.level);
        
        element.innerHTML = `
            <img src="${imageUrl}" 
                 alt="${divisionInfo.name}" 
                 class="grade-image" 
                 onerror="this.style.display='none'">
        `;
        element.title = `${divisionInfo.name} (${divisionInfo.description})`;
        
    } else {
        // 등급 정보가 없을 때는 이미지를 표시하지 않음
        element.innerHTML = '';
        element.title = '';
        element.style.borderColor = '';
    }
}

// 공식 경기 등급 이미지 URL 생성
function getDivisionImageUrl(level) {
    // 사용자가 제공한 이미지 URL 사용
    const baseUrl = 'https://ssl.nexon.com/s2/game/fo4/obt/rank/large/update_2009/';
    
    // 레벨을 이미지 번호로 매핑 (level 1 = ico_rank0, level 18 = ico_rank17)
    const imageNumber = level - 1;
    const fileName = `ico_rank${imageNumber}.png`;
    
    const imageUrl = `${baseUrl}${fileName}`;
    
    return imageUrl;
}

// 기존 등급 이미지 표시 함수 (카드 등급용 - 호환성 유지)
function displayGradeImage(elementId, gradeValue) {
    const element = document.getElementById(elementId);
    
    if (!element) return;
    
    // 기존 등급 클래스 제거
    element.className = element.className.replace(/grade-\d+/g, '');
    
    if (gradeValue && gradeValue !== '-') {
        // 등급에 따른 이모지나 텍스트 표시
        const gradeEmoji = getGradeEmoji(gradeValue);
        element.innerHTML = `<span class="grade-display">${gradeEmoji}</span>`;
        element.title = `등급: ${gradeValue}`;
        
        // 등급별 CSS 클래스 추가
        element.classList.add(`grade-${gradeValue}`);
    } else {
        element.innerHTML = '<span class="grade-display">-</span>';
        element.title = '등급 정보 없음';
        element.classList.add('grade-0');
    }
}

// 등급에 따른 이모지 반환
function getGradeEmoji(grade) {
    const gradeMap = {
        0: '⚪',   // 기본
        1: '⚪',   // +1 (갈색)
        2: '🟤',   // +2 (갈색)
        3: '🟤',   // +3 (갈색)
        4: '🟤',   // +4 (갈색)
        5: '⚪',   // +5 (은색)
        6: '⚪',   // +6 (은색)
        7: '⚪',   // +7 (은색)
        8: '🟡',   // +8 (금색)
        9: '🟡',   // +9 (금색)
        10: '🟡',  // +10 (금색)
        11: '🔵',  // +11 (백금색)
        12: '🔵',  // +12 (백금색)
        13: '🔵'   // +13 (백금색)
    };
    
    return gradeMap[grade] || '⚪';
}

// 슛 유형 계산 팝업 표시 함수 (전역)
function showShootTypeCalculation(type, percent, count, total) {
    const typeNames = {
        'closeRange': '근거리 슛',
        'midRange': '중거리 슛', 
        'heading': '헤딩 슛'
    };
    
    const typeName = typeNames[type] || type;
    
    // 기존 팝업이 있다면 제거
    const existingPopup = document.getElementById('shootCalculationPopup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    const popup = document.createElement('div');
    popup.id = 'shootCalculationPopup';
    popup.className = 'calculation-popup-overlay';
    // 대시보드와 동일한 설명 방식으로 수정
    let content = '';
    const emojiMap = {
        'closeRange': '⚽',
        'midRange': '🚀', 
        'heading': '💥'
    };
    const emoji = emojiMap[type] || '⚽';
    
    content = `
        <div class="calculation-popup">
            <div class="popup-header">
                <h3>${emoji} ${typeName} 계산 과정</h3>
                <button class="popup-close" onclick="closeShootCalculationPopup()">&times;</button>
            </div>
            <div class="popup-content">
                <div class="calculation-step">
                    <p><strong>총 슛 시도:</strong> ${total}회</p>
                    <p><strong>${typeName} 시도:</strong> ${count}회</p>
                    <p><strong>계산식:</strong> (${count} ÷ ${total}) × 100 = ${percent}%</p>
                    <p><strong>분석 기간:</strong> 해당 포메이션 경기</p>
                </div>
                <div class="calculation-note">
                    <p>💡 <strong>${typeName}:</strong> ${getShootTypeDescription(type)}</p>
                </div>
            </div>
        </div>
    `;
    
    popup.innerHTML = content;
    
    document.body.appendChild(popup);
    
    // 대시보드와 동일한 스타일 적용
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
    
    // 스크롤 잠금
    lockScroll();
    
    // 모달 외부 클릭 시 닫기
    popup.addEventListener('click', function(e) {
        if (e.target === popup) {
            closeShootCalculationPopup();
        }
    });
}

// 슛 유형별 설명 반환 함수
function getShootTypeDescription(type) {
    const descriptions = {
        'closeRange': '페널티 박스 안에서 시도한 슛을 의미합니다.',
        'midRange': '페널티 박스 밖에서 시도한 슛을 의미합니다.',
        'heading': '헤딩으로 시도한 슛을 의미합니다.'
    };
    return descriptions[type] || '슛을 의미합니다.';
}

// 슛 유형 계산 팝업 닫기 함수
function closeShootCalculationPopup() {
    const popup = document.getElementById('shootCalculationPopup');
    if (popup) {
        popup.remove();
        unlockScroll();
    }
}

// 등급 텍스트 설정 (간소화된 버전) - 기존 함수 유지
function setGradeDisplay(gradeType, gradeValue) {
    const textElement = document.getElementById(`${gradeType}Text`);
    
    if (textElement) {
        if (gradeValue && gradeValue !== '-') {
            textElement.textContent = gradeValue;
        } else {
            textElement.textContent = '-';
        }
    }
}

// 대시보드 표시
function showDashboard(userInfo) {
    tabContainer.style.display = 'block';
    
    // 기본적으로 대시보드 탭 활성화
    switchTab('dashboard');
    
    // 실제 데이터로 대시보드 채우기 (더보기 버튼 상태도 포함)
    loadDashboardData(userInfo);
}

// 탭 전환 함수
function switchTab(tabId) {
    // Google Analytics 탭 추적
    if (typeof gtag !== 'undefined') {
        gtag('event', 'tab_view', {
            'tab_name': tabId,
            'event_category': 'engagement',
            'event_label': `Tab: ${tabId}`
        });
    }
    
    // 모든 탭 버튼 비활성화
    tabBtns.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // 선택된 탭 활성화
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(tabId);
    
    if (activeBtn && activeContent) {
        activeBtn.classList.add('active');
        activeContent.classList.add('active');
        
        // 구단별 데이터 탭인 경우 데이터 분석
        if (tabId === 'team') {
            
            if (currentUserData) {
                // 캐시된 데이터가 있으면 재사용, 없으면 새로 분석
                if (teamDataLoaded && teamDataCache) {
                    displayTeamFormationCards(teamDataCache.formations);
                    displayTeamTopPlayers(teamDataCache.matches);
                    
                    // 실제 경기 수 업데이트
                    const actualMatchCount = document.getElementById('actualMatchCount');
                    if (actualMatchCount && teamDataCache.matches) {
                        actualMatchCount.textContent = teamDataCache.matches.length;
                    }
                    
                    // 섹션 표시
                    const topPlayersSection = document.getElementById('topPlayersSection');
                    if (topPlayersSection) {
                        topPlayersSection.style.display = 'block';
                    }
                    
                    // teamLayout 표시
                    const teamLayout = document.getElementById('teamLayout');
                    if (teamLayout) {
                        teamLayout.style.display = 'flex';
                    }
                    
                    // teamDetailPanel 표시 (가이드)
                    const teamDetailPanel = document.getElementById('teamDetailPanel');
                    if (teamDetailPanel) {
                        teamDetailPanel.style.display = 'block';
                    }
                    
                    // teamCardGuide 표시
                    if (teamCardGuide) {
                        teamCardGuide.style.display = 'block';
                    }
                    
                    hideTeamLoading();
                } else {
                    // UI 요소들만 초기화 (캐시는 유지)
                    const teamLayout = document.getElementById('teamLayout');
                    const topPlayersSection = document.getElementById('topPlayersSection');
                    if (teamLayout) teamLayout.style.display = 'none';
                    if (topPlayersSection) topPlayersSection.style.display = 'none';
                    
                    // teamDetailPanel 표시 (가이드)
                    const teamDetailPanel = document.getElementById('teamDetailPanel');
                    if (teamDetailPanel) {
                        teamDetailPanel.style.display = 'block';
                    }
                    
                    // teamCardGuide 표시
                    if (teamCardGuide) {
                        teamCardGuide.style.display = 'block';
                    }
                    
                    analyzeTeamData();
                }
            } else {
                showNoTeamData();
            }
        }
        
        // 포메이션 분석 탭인 경우 데이터 분석
        if (tabId === 'stats') {
            
            if (currentUserData) {
                // 캐시된 데이터가 있으면 재사용, 없으면 새로 분석
                if (formationDataLoaded && formationDataCache) {
                    displayFormationPerformances(formationDataCache.performances);
                    // 그룹 데이터는 포메이션 카드 클릭 시 표시됨
                    showFormationGroupsGuide('포메이션 성과 카드를 클릭하여 해당 포메이션의 상세 그룹 분석을 확인하세요.');
                    // 캐시된 데이터를 전역 변수에 저장
                    window.formationGroupsData = formationDataCache.detailedGroups;
                    window.formationMatchesData = formationDataCache.matchesData;
                    hideFormationLoading();
                } else {
                    // 로딩 상태 먼저 표시
                    showFormationLoading('100경기 데이터를 준비하는 중...');
                    // 약간의 지연 후 분석 시작 (UI 업데이트를 위해)
                    setTimeout(() => {
                        analyzeFormationData();
                    }, 100);
                }
            } else {
                showNoFormationData();
            }
        }
    }
}

// 팝업 스크롤 방지 유틸리티 (스크롤 위치 유지)
let scrollPosition = 0;

function lockScroll() {
    // 현재 스크롤 위치 저장
    scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    // body에 fixed 적용하면서 현재 스크롤 위치를 top으로 설정
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = '100%';
    document.body.classList.add('modal-open');
}

function unlockScroll() {
    // body의 fixed 해제
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.classList.remove('modal-open');
    
    // 저장된 스크롤 위치로 복원
    window.scrollTo(0, scrollPosition);
}

// 관리자 대시보드 표시 함수
function displayAdminDashboard(stats) {
    // 기존 UI 숨기기
    playerBasicInfo.style.display = 'none';
    tabContainer.style.display = 'none';
    
    // 시간 포맷 함수
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        
        if (diff < 60) return `${diff}초 전`;
        if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
        return `${Math.floor(diff / 86400)}일 전`;
    }
    
    // 관리자 대시보드 HTML 생성
    const dashboardHTML = `
        <div class="admin-dashboard">
            <h2>🔐 관리자 대시보드</h2>
            
            <div class="admin-summary">
                <div class="stat-card">
                    <div class="stat-label">총 방문자</div>
                    <div class="stat-value">${stats.summary.totalVisitors.toLocaleString()}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">오늘 방문자</div>
                    <div class="stat-value">${stats.summary.todayVisitors.toLocaleString()}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">주간 방문자</div>
                    <div class="stat-value">${stats.summary.weekVisitors.toLocaleString()}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">월간 방문자</div>
                    <div class="stat-value">${stats.summary.monthVisitors.toLocaleString()}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">재방문자 (오늘)</div>
                    <div class="stat-value">${stats.summary.returningVisitors.toLocaleString()}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">신규 방문자 (오늘)</div>
                    <div class="stat-value">${stats.summary.newVisitors.toLocaleString()}</div>
                </div>
            </div>
            
            <div class="admin-content">
                <div class="admin-section">
                    <h3>🔥 인기 검색어</h3>
                    <div class="top-searches-list">
                        ${stats.topSearches.map((item, idx) => `
                            <div class="search-item">
                                <span class="rank">${idx + 1}</span>
                                <span class="nickname">${item.nickname}</span>
                                <span class="count">${item.count}회</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="admin-section">
                    <h3>🕐 최근 검색</h3>
                    <div class="recent-searches-list">
                        ${stats.recentSearches.map(item => `
                            <div class="search-item ${item.success ? 'success' : 'failed'}">
                                <span class="nickname">${item.nickname}</span>
                                <span class="status">${item.success ? '✓' : '✗'}</span>
                                <span class="time">${formatTime(item.timestamp)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="admin-section full-width">
                    <h3>📊 시간대별 방문 (오늘)</h3>
                    <div class="hourly-chart">
                        ${stats.hourlyDistribution.map((count, hour) => `
                            <div class="hour-bar" style="height: ${Math.min(count * 5, 150)}px" title="${hour}시: ${count}명">
                                <span class="hour-label">${hour}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 기존 에러 섹션 위치에 표시
    errorSection.innerHTML = dashboardHTML;
    errorSection.style.display = 'block';
}

// 대시보드 데이터 로드

// ============================================
// 맨 위로 가기 버튼
// ============================================
const scrollToTopBtn = document.getElementById('scrollToTopBtn');

if (scrollToTopBtn) {
    // 스크롤 이벤트 감지
    window.addEventListener('scroll', () => {
        // 300px 이상 스크롤하면 버튼 표시
        if (window.scrollY > 300) {
            scrollToTopBtn.classList.add('show');
        } else {
            scrollToTopBtn.classList.remove('show');
        }
    });

    // 버튼 클릭 시 맨 위로 스크롤
    scrollToTopBtn.addEventListener('click', () => {
        // Google Analytics 이벤트 추적
        if (typeof gtag !== 'undefined') {
            gtag('event', 'scroll_to_top', {
                'event_category': 'user_interaction',
                'event_label': 'Scroll to Top Button',
                'scroll_depth': window.scrollY
            });
        }
        
        // 부드럽게 맨 위로 스크롤
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}


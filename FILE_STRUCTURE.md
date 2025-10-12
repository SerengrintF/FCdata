# 파일 구조 변경 사항

## 📁 변경 전
```
├── script.js (약 7,400라인 - 모든 JavaScript 코드)
└── style.css (약 6,400라인 - 모든 CSS 스타일)
```

## 📁 변경 후

### JavaScript 파일 (js/ 디렉토리)
```
js/
├── common.js        - 공통 기능 (약 686라인)
│   ├── API 설정 및 상수
│   ├── DOM 요소 선언
│   ├── 검색 기능 (searchUser, getAccessIdByNickname)
│   ├── 탭 전환 기능 (switchTab)
│   ├── 플레이어 정보 표시 (displayPlayerInfo)
│   ├── 등급 시스템 관련 함수
│   └── 공통 유틸리티 함수 (showLoading, showError, hideResults 등)
│
├── common-utils.js  - 공통 유틸리티 (약 93라인)
│   ├── getPositionName - 포지션 번호를 이름으로 변환
│   ├── getPositionGroup - 포지션을 그룹으로 분류
│   └── calculateFormationFromPlayers - 선수 배치로 포메이션 계산
│
├── dashboard.js     - 대시보드 관련 (약 4,302라인)
│   ├── loadDashboardData - 대시보드 데이터 로드
│   ├── calculateMatchStats - 경기 통계 계산
│   ├── displayTrend - 트렌드 표시
│   ├── displayGoalAnalysis - 골 유형 분석
│   ├── displayTopPlayers - 주요 선수 표시
│   ├── displayRealMatches - 경기 기록 표시
│   ├── loadMoreMatches - 더보기 기능
│   ├── createMatchDetailsHTML - 경기 상세 정보
│   ├── analyzeMatchCharacteristics - 경기 특성 분석
│   └── analyzePlayerCharacteristics - 선수 특성 분석
│
├── team.js          - 구단별 데이터 분석 (약 1,907라인)
│   ├── analyzeTeamData - 구단별 데이터 분석
│   ├── groupMatchesByOverlappingPlayers - 선수 그룹화
│   ├── displayTeamFormationCards - 팀 구성 카드 표시
│   ├── calculateTeamStats - 팀 통계 계산
│   ├── calculatePlayerStats - 선수 통계 계산
│   ├── displayTeamTopPlayers - 최고의 선수 표시
│   ├── showTeamLoading - 로딩 상태 표시
│   └── showNoTeamData - 데이터 없음 표시
│
└── formation.js     - 포메이션 분석 (약 512라인)
    ├── analyzeFormationData - 포메이션 데이터 분석
    ├── displayFormationPerformances - 포메이션 성과 표시
    ├── displayFormationGroups - 포메이션 그룹 표시
    ├── showFormationGroupsGuide - 가이드 표시
    ├── showFormationLoading - 로딩 상태 표시
    └── showNoFormationData - 데이터 없음 표시
```

### CSS 파일 (css/ 디렉토리)
```
css/
├── common.css       - 공통 스타일 (약 869라인)
│   ├── 기본 레이아웃 및 타이포그래피
│   ├── 헤더 및 네비게이션
│   ├── 검색 섹션
│   ├── 선수 기본 정보
│   ├── 탭 메뉴
│   ├── 팝업 및 모달
│   └── 반응형 레이아웃
│
├── dashboard.css    - 대시보드 스타일 (약 3,363라인)
│   ├── 요약 통계 (승률, 득점, 트렌드)
│   ├── 골 유형 분석 카드
│   ├── 주요 선수 카드
│   ├── 경기 기록 목록
│   ├── 경기 상세 정보
│   ├── 전술 정보 카드
│   └── 성과 메트릭스
│
├── team.css         - 구단별 데이터 스타일 (약 1,639라인)
│   ├── 팀 데이터 컨테이너
│   ├── 팀 카드 슬라이더
│   ├── 팀 구성 카드
│   ├── 선수 통계 테이블
│   ├── 최고의 선수 섹션
│   └── 팀 상세 패널
│
└── formation.css    - 포메이션 분석 스타일 (약 532라인)
    ├── 포메이션 데이터 컨테이너
    ├── 포메이션 성과 슬라이더
    ├── 포메이션 성과 카드
    ├── 포메이션 그룹 카드
    └── 포메이션 가이드
```

## 🎯 변경 이점

### 1. **유지보수성 향상**
- 각 기능별로 파일이 분리되어 코드 찾기가 쉬움
- 버그 수정이나 기능 추가 시 해당 파일만 수정하면 됨

### 2. **가독성 개선**
- 파일 크기가 줄어 코드 탐색이 용이
- 명확한 파일명으로 각 파일의 역할 파악이 쉬움

### 3. **협업 용이성**
- 여러 개발자가 동시에 다른 기능을 개발 가능
- Git 충돌 가능성 감소

### 4. **로딩 최적화**
- 필요한 모듈만 선택적으로 로드 가능 (향후 확장 시)
- 브라우저 캐싱 효율성 증가

## 📋 로드 순서

### CSS 로드 순서 (index.html)
```html
<link rel="stylesheet" href="css/common.css">       <!-- 1. 공통 스타일 -->
<link rel="stylesheet" href="css/dashboard.css">    <!-- 2. 대시보드 -->
<link rel="stylesheet" href="css/team.css">         <!-- 3. 구단별 데이터 -->
<link rel="stylesheet" href="css/formation.css">    <!-- 4. 포메이션 분석 -->
```

### JavaScript 로드 순서 (index.html)
```html
<script src="js/common.js"></script>        <!-- 1. 공통 기능 (필수) -->
<script src="js/dashboard.js"></script>     <!-- 2. 대시보드 -->
<script src="js/team.js"></script>          <!-- 3. 구단별 데이터 -->
<script src="js/formation.js"></script>     <!-- 4. 포메이션 분석 -->
```

**⚠️ 중요:** 로드 순서가 중요합니다! `common.js`는 다른 모든 파일에서 사용하는 변수와 함수를 선언하므로 반드시 먼저 로드되어야 합니다.

## 🔒 백업 파일

기존 파일은 `backup/` 디렉토리에 안전하게 보관되어 있습니다:
```
backup/
├── script.js.bak    - 원본 JavaScript 파일
└── style.css.bak    - 원본 CSS 파일
```

## 🚀 동작 방식

파일이 분리되었지만 **모든 기능은 기존과 동일하게 작동**합니다:
1. 페이지 로드 시 모든 JS/CSS 파일이 순차적으로 로드됨
2. `common.js`의 전역 변수와 함수가 먼저 초기화됨
3. 각 탭별 기능이 해당 JS 파일에서 제공됨
4. 사용자 경험은 완전히 동일함

## 📝 추가 개선 제안

향후 더 나은 관리를 위해 고려할 수 있는 사항들:

1. **모듈화**: ES6 모듈 시스템 도입 (import/export)
2. **번들링**: Webpack이나 Vite 같은 번들러 사용
3. **CSS 전처리기**: SASS/SCSS 도입
4. **타입 안정성**: TypeScript 전환
5. **컴포넌트화**: 재사용 가능한 컴포넌트 단위로 분리

---

**작성일**: 2025-10-09  
**변경자**: AI Assistant  
**목적**: 코드 가독성 및 유지보수성 향상

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ANALYTICS_FILE = path.join(__dirname, '../data/analytics.json');

// 데이터 디렉토리가 없으면 생성
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 초기 데이터 구조
function getInitialData() {
    return {
        searches: [],
        errors: [],
        visits: [],
        performance: [],
        startDate: new Date().toISOString()
    };
}

// 분석 데이터 로드
function loadAnalytics() {
    try {
        if (fs.existsSync(ANALYTICS_FILE)) {
            const data = fs.readFileSync(ANALYTICS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
    }
    return getInitialData();
}

// 분석 데이터 저장
function saveAnalytics(data) {
    try {
        fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
    }
}

// IP 해싱 (프라이버시 보호)
function hashIP(ip) {
    const secretKey = process.env.ADMIN_SECRET_KEY || 'default_secret_key';
    return crypto.createHash('sha256').update(ip + secretKey).digest('hex').substring(0, 16);
}

// 검색 로깅
function logSearch(nickname, ip, success, responseTime) {
    try {
        const analytics = loadAnalytics();
        analytics.searches.push({
            nickname,
            ip: hashIP(ip),
            success,
            responseTime,
            timestamp: new Date().toISOString()
        });
        
        // 최근 1000건만 유지
        if (analytics.searches.length > 1000) {
            analytics.searches = analytics.searches.slice(-1000);
        }
        
        saveAnalytics(analytics);
    } catch (error) {
    }
}

// 에러 로깅
function logError(type, message, url, ip) {
    try {
        const analytics = loadAnalytics();
        analytics.errors.push({
            type,
            message,
            url,
            ip: hashIP(ip),
            timestamp: new Date().toISOString()
        });
        
        // 최근 500건만 유지
        if (analytics.errors.length > 500) {
            analytics.errors = analytics.errors.slice(-500);
        }
        
        saveAnalytics(analytics);
    } catch (error) {
    }
}

// 방문 로깅
function logVisit(ip, userAgent) {
    try {
        const analytics = loadAnalytics();
        analytics.visits.push({
            ip: hashIP(ip),
            userAgent: userAgent ? userAgent.substring(0, 100) : 'unknown',
            timestamp: new Date().toISOString()
        });
        
        // 최근 1000건만 유지
        if (analytics.visits.length > 1000) {
            analytics.visits = analytics.visits.slice(-1000);
        }
        
        saveAnalytics(analytics);
    } catch (error) {
    }
}

// 통계 생성
function generateStats() {
    try {
        const analytics = loadAnalytics();
        const now = new Date();
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        
        // 기간별 방문 필터링
        const todayVisits = analytics.visits.filter(v => new Date(v.timestamp) > oneDayAgo);
        const weekVisits = analytics.visits.filter(v => new Date(v.timestamp) > oneWeekAgo);
        const monthVisits = analytics.visits.filter(v => new Date(v.timestamp) > oneMonthAgo);
        
        // 고유 방문자 수 (해시된 IP 기준)
        const allUniqueIPs = new Set(analytics.visits.map(v => v.ip));
        const todayUniqueIPs = new Set(todayVisits.map(v => v.ip));
        const weekUniqueIPs = new Set(weekVisits.map(v => v.ip));
        const monthUniqueIPs = new Set(monthVisits.map(v => v.ip));
        
        // 재방문자 vs 신규 방문자
        const ipVisitCounts = {};
        analytics.visits.forEach(v => {
            ipVisitCounts[v.ip] = (ipVisitCounts[v.ip] || 0) + 1;
        });
        
        // 오늘 재방문자 (오늘 방문한 사람 중 이전에도 방문한 적 있는 사람)
        const todayReturningVisitors = todayUniqueIPs.size > 0 
            ? Array.from(todayUniqueIPs).filter(ip => {
                // 오늘 이전의 방문 기록이 있는지 확인
                const previousVisits = analytics.visits.filter(v => 
                    v.ip === ip && new Date(v.timestamp) <= oneDayAgo
                );
                return previousVisits.length > 0;
            }).length
            : 0;
        
        const todayNewVisitors = todayUniqueIPs.size - todayReturningVisitors;
        
        // 검색 통계
        const todaySearches = analytics.searches.filter(s => new Date(s.timestamp) > oneDayAgo);
        
        // 인기 검색어 (성공한 검색만)
        const searchCounts = {};
        analytics.searches.filter(s => s.success).forEach(s => {
            searchCounts[s.nickname] = (searchCounts[s.nickname] || 0) + 1;
        });
        const topSearches = Object.entries(searchCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([nickname, count]) => ({ nickname, count }));
        
        // 최근 검색 (최근 20개)
        const recentSearches = analytics.searches
            .slice(-20)
            .reverse()
            .map(s => ({
                nickname: s.nickname,
                success: s.success,
                timestamp: s.timestamp
            }));
        
        // 시간대별 방문 분포 (오늘 기준)
        const hourlyDistribution = Array(24).fill(0);
        todayVisits.forEach(v => {
            const hour = new Date(v.timestamp).getHours();
            hourlyDistribution[hour]++;
        });
        
        return {
            summary: {
                totalVisitors: allUniqueIPs.size,
                todayVisitors: todayUniqueIPs.size,
                weekVisitors: weekUniqueIPs.size,
                monthVisitors: monthUniqueIPs.size,
                returningVisitors: todayReturningVisitors,
                newVisitors: todayNewVisitors,
                totalSearches: analytics.searches.length,
                todaySearches: todaySearches.length
            },
            topSearches,
            recentSearches,
            hourlyDistribution,
            errors: analytics.errors.slice(-10).reverse(),
            startDate: analytics.startDate
        };
    } catch (error) {
        return {
            summary: {
                totalVisitors: 0,
                todayVisitors: 0,
                weekVisitors: 0,
                monthVisitors: 0,
                returningVisitors: 0,
                newVisitors: 0,
                totalSearches: 0,
                todaySearches: 0
            },
            topSearches: [],
            recentSearches: [],
            hourlyDistribution: Array(24).fill(0),
            errors: [],
            startDate: new Date().toISOString()
        };
    }
}

module.exports = {
    logSearch,
    logError,
    logVisit,
    generateStats
};


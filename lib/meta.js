const https = require('https');

const POSITION_URL = 'https://open.api.nexon.com/static/fconline/meta/spposition.json';
const SEASON_URL = 'https://open.api.nexon.com/static/fconline/meta/seasonid.json';

const sppositionMap = new Map(); // key: spposition (number), value: desc (string)
const seasonMap = new Map(); // key: seasonId (number), value: { className, seasonImg }

function httpGetJson(url, onDone) {
    const req = https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                onDone(null, json);
            } catch (e) {
                onDone(e);
            }
        });
    });
    req.on('error', (err) => onDone(err));
}

function loadPositionMeta(callback) {
    httpGetJson(POSITION_URL, (err, arr) => {
        if (err) {
            if (callback) callback();
            return;
        }
        if (Array.isArray(arr)) {
            sppositionMap.clear();
            for (const item of arr) {
                if (typeof item?.spposition === 'number' && item?.desc) {
                    sppositionMap.set(item.spposition, item.desc);
                }
            }
        }
        if (callback) callback();
    });
}

function loadSeasonMeta(callback) {
    httpGetJson(SEASON_URL, (err, arr) => {
        if (err) {
            if (callback) callback();
            return;
        }
        if (Array.isArray(arr)) {
            seasonMap.clear();
            for (const item of arr) {
                if (typeof item?.seasonId === 'number') {
                    seasonMap.set(item.seasonId, { className: item.className || '', seasonImg: item.seasonImg || '' });
                }
            }
        }
        if (callback) callback();
    });
}

function getPositionDesc(spposition) {
    return sppositionMap.get(spposition) || null;
}

function getSeasonInfoFromSpId(spId) {
    if (typeof spId !== 'number') return null;
    const seasonId = Math.floor(spId / 1000000);
    const info = seasonMap.get(seasonId);
    if (!info) return { seasonId, className: null, seasonImg: null };
    return { seasonId, className: info.className || null, seasonImg: info.seasonImg || null };
}

// 초기 로드 및 주기 갱신(12시간)
function initMetaLoaders() {
    loadPositionMeta();
    loadSeasonMeta();
    setInterval(loadPositionMeta, 1000 * 60 * 60 * 12);
    setInterval(loadSeasonMeta, 1000 * 60 * 60 * 12);
}

initMetaLoaders();

module.exports = {
    getPositionDesc,
    getSeasonInfoFromSpId,
};



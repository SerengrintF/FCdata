const https = require('https');

const SPID_JSON_URL = 'https://open.api.nexon.com/static/fconline/meta/spid.json';
const spidNameMap = new Map();
const playerNameCache = new Map();

function loadSpidMapping(callback) {
    const req = https.get(SPID_JSON_URL, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const arr = JSON.parse(data);
                if (Array.isArray(arr)) {
                    spidNameMap.clear();
                    for (const item of arr) {
                        if (item && typeof item.id === 'number' && item.name) {
                            spidNameMap.set(item.id, item.name);
                        }
                    }
                } else {
                }
            } catch (e) {
            }
            if (callback) callback();
        });
    });
    req.on('error', (err) => {
        if (callback) callback();
    });
}

async function getPlayerName(spId) {
    if (playerNameCache.has(spId)) {
        return playerNameCache.get(spId);
    }
    const name = spidNameMap.get(spId);
    if (name) {
        playerNameCache.set(spId, name);
        return name;
    }
    return `선수 ${spId}`;
}

// 초기 로드 및 주기적 갱신(24시간)
loadSpidMapping();
setInterval(loadSpidMapping, 1000 * 60 * 60 * 24);

module.exports = {
    loadSpidMapping,
    getPlayerName,
};



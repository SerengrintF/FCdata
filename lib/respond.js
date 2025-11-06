function sendJson(response, statusCode, dataObject) {
    response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(dataObject));
}

function sendRawJson(response, statusCode, jsonString) {
    response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(jsonString);
}

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.rss': 'application/rss+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

module.exports = {
    sendJson,
    sendRawJson,
    mimeTypes,
};



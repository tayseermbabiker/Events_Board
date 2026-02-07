const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `scrape-${timestamp}.log`);
const stream = fs.createWriteStream(logFile, { flags: 'a' });

function format(level, source, msg) {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] [${source}] ${msg}`;
}

function write(line) {
  console.log(line);
  stream.write(line + '\n');
}

const logger = {
  info:  (source, msg) => write(format('INFO',  source, msg)),
  warn:  (source, msg) => write(format('WARN',  source, msg)),
  error: (source, msg) => write(format('ERROR', source, msg)),
  close: () => stream.end(),
};

module.exports = logger;

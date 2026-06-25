const mongoose = require('mongoose');
const os       = require('os');

const startTime = Date.now();
let errorCount   = 0;
let requestCount = 0;

// Call this from the error handler in server.js
function recordError() {
  errorCount++;
}

function recordRequest() {
  requestCount++;
}

// GET /api/admin/health
const getSystemHealth = async (req, res) => {
  try {
    const uptimeMs      = Date.now() - startTime;
    const uptimeMinutes = Math.floor(uptimeMs / 60000);
    const uptimeHours   = Math.floor(uptimeMinutes / 60);
    const uptimeDays    = Math.floor(uptimeHours / 24);

    const memUsage   = process.memoryUsage();
    const totalMem   = os.totalmem();
    const freeMem    = os.freemem();
    const usedMemPct = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);

    const dbState = mongoose.connection.readyState;
    const dbStatusMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    res.json({
      uptime: {
        ms:      uptimeMs,
        formatted: uptimeDays > 0
          ? `${uptimeDays}d ${uptimeHours % 24}h ${uptimeMinutes % 60}m`
          : uptimeHours > 0
            ? `${uptimeHours}h ${uptimeMinutes % 60}m`
            : `${uptimeMinutes}m`,
      },
      memory: {
        processUsedMB:  Math.round(memUsage.heapUsed / 1024 / 1024),
        processTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        systemUsedPercent: parseFloat(usedMemPct),
        systemTotalGB:  (totalMem / 1024 / 1024 / 1024).toFixed(1),
        systemFreeGB:   (freeMem / 1024 / 1024 / 1024).toFixed(1),
      },
      cpu: {
        loadAverage: os.loadavg(),
        cores:       os.cpus().length,
      },
      database: {
        status: dbStatusMap[dbState] || 'unknown',
        connected: dbState === 1,
      },
      requests: {
        total:  requestCount,
        errors: errorCount,
        errorRate: requestCount > 0 ? ((errorCount / requestCount) * 100).toFixed(2) : 0,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getSystemHealth, recordError, recordRequest };
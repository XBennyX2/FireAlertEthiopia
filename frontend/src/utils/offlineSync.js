import API from '../api/axios';
import {
  getOfflineReports,
  deleteOfflineReport,
  updateOfflineReportStatus,
  base64ToFile,
} from './offlineDB';

let syncInProgress = false;
let lastSyncedAt   = null;

export function getLastSyncedAt() {
  return lastSyncedAt;
}

export function isSyncing() {
  return syncInProgress;
}

/**
 * Attempt to sync all pending offline reports to the server.
 * Returns { synced, failed } counts.
 */
export async function syncOfflineReports(onProgress) {
  if (syncInProgress) return { synced: 0, failed: 0, alreadyRunning: true };
  if (!navigator.onLine) return { synced: 0, failed: 0, offline: true };

  syncInProgress = true;
  let synced = 0;
  let failed = 0;

  try {
    const reports = await getOfflineReports();
    const pending = reports.filter(r => r.syncStatus === 'pending' || r.syncStatus === 'failed');

    for (const report of pending) {
      await updateOfflineReportStatus(report.localId, 'syncing');
      onProgress?.({ current: report, status: 'syncing' });

      try {
        const formData = new FormData();
        formData.append('description',   report.description);
        formData.append('fire_type',     report.fire_type);
        formData.append('lat',           report.lat);
        formData.append('lng',           report.lng);
        formData.append('address',       report.address || '');
        formData.append('gps_validated', report.gps_validated || 'false');
        formData.append('gps_score',     report.gps_score || '50');
        formData.append('media_is_live', report.media_is_live || 'false');

        if (report.mediaBase64) {
          const file = base64ToFile(report.mediaBase64, report.mediaName, report.mediaType);
          formData.append('media', file);
        }

        await API.post('/incidents', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        await deleteOfflineReport(report.localId);
        synced++;
        onProgress?.({ current: report, status: 'success' });

      } catch (err) {
        await updateOfflineReportStatus(
          report.localId,
          'failed',
          err.response?.data?.message || 'Failed to sync. Will retry later.'
        );
        failed++;
        onProgress?.({ current: report, status: 'failed', error: err.message });
      }
    }

    lastSyncedAt = new Date().toISOString();

  } finally {
    syncInProgress = false;
  }

  return { synced, failed };
}
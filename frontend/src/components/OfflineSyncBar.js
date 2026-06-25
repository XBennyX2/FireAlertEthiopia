import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useToast } from '../context/ToastContext';
import { getOfflineReports, deleteOfflineReport, getPendingCount } from '../utils/offlineDB';
import { syncOfflineReports, getLastSyncedAt } from '../utils/offlineSync';

function fmtTime(iso) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return new Date(iso).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
}

export default function OfflineSyncBar() {
  const isOnline   = useOnlineStatus();
  const { toast }  = useToast();

  const [pendingCount, setPendingCount] = useState(0);
  const [showPanel,    setShowPanel]    = useState(false);
  const [reports,      setReports]      = useState([]);
  const [syncing,      setSyncing]      = useState(false);
  const [lastSynced,   setLastSynced]   = useState(getLastSyncedAt());

  const refreshCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 5000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  // Auto-sync when connection returns
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      handleSync();
    }
  }, [isOnline]);

  async function loadPanel() {
    const data = await getOfflineReports();
    setReports(data);
    setShowPanel(true);
  }

  async function handleSync() {
    if (!isOnline) {
      toast.warning('Cannot sync while offline. Reconnect to the internet first.');
      return;
    }
    setSyncing(true);
    try {
      const result = await syncOfflineReports();
      if (result.synced > 0) {
        toast.success(`${result.synced} report${result.synced !== 1 ? 's' : ''} synced successfully.`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} report${result.failed !== 1 ? 's' : ''} failed to sync. Will retry.`);
      }
      if (result.synced === 0 && result.failed === 0 && !result.offline) {
        toast.info('Nothing to sync.');
      }
      setLastSynced(new Date().toISOString());
      await refreshCount();
      if (showPanel) await loadPanel();
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete(localId) {
    await deleteOfflineReport(localId);
    toast.success('Offline report deleted.');
    await loadPanel();
    await refreshCount();
  }

  return (
    <>
      {/* ── Status Bar ───────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            '0.75rem',
        padding:        '0.6rem 1rem',
        borderRadius:   10,
        marginBottom:   '1.25rem',
        background:     isOnline ? 'rgba(34,197,94,0.06)' : 'rgba(230,60,47,0.08)',
        border:         `1px solid ${isOnline ? 'rgba(34,197,94,0.15)' : 'rgba(230,60,47,0.2)'}`,
        flexWrap:       'wrap',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <div style={{
            width: 7, height: 7, borderRadius:'50%',
            background: isOnline ? '#22c55e' : '#e63c2f',
            animation:  !isOnline ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize:'0.78rem', color: isOnline ? '#22c55e' : '#f87c74', fontWeight:600 }}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {!isOnline && (
            <span style={{ fontSize:'0.72rem', color:'#888' }}>
              — reports will be saved locally and synced automatically
            </span>
          )}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
          {pendingCount > 0 && (
            <button
              onClick={loadPanel}
              style={{
                fontSize:'0.72rem', padding:'0.25rem 0.65rem', borderRadius:999,
                background:'rgba(244,130,10,0.12)', border:'1px solid rgba(244,130,10,0.25)',
                color:'#f4820a', cursor:'pointer', fontWeight:600,
              }}
            >
              📋 {pendingCount} Pending
            </button>
          )}

          {isOnline && pendingCount > 0 && (
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                fontSize:'0.72rem', padding:'0.25rem 0.65rem', borderRadius:999,
                background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.25)',
                color:'#3b82f6', cursor:'pointer', fontWeight:600,
              }}
            >
              {syncing ? '⏳ Syncing…' : '🔄 Sync Now'}
            </button>
          )}

          <span style={{ fontSize:'0.68rem', color:'#555' }}>
            Last synced: {fmtTime(lastSynced)}
          </span>
        </div>
      </div>

      {/* ── Pending Reports Panel ────────────────────────────── */}
      {showPanel && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={() => setShowPanel(false)}
        >
          <div
            className="card"
            style={{ maxWidth:480, width:'100%', maxHeight:'80vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
              <div className="section-label" style={{ margin:0 }}>Pending Offline Reports</div>
              <button
                onClick={() => setShowPanel(false)}
                style={{ background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:'1rem' }}
              >
                ✕
              </button>
            </div>

            {reports.length === 0 && (
              <div style={{ textAlign:'center', padding:'2rem 0', color:'#555', fontSize:'0.85rem' }}>
                No pending reports.
              </div>
            )}

            {reports.map(report => (
              <div
                key={report.localId}
                style={{ padding:'0.85rem', background:'#111', border:'1px solid #1e1e1e', borderRadius:8, marginBottom:'0.6rem' }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.5rem', marginBottom:'0.4rem' }}>
                  <span style={{ fontSize:'0.7rem', fontWeight:600, textTransform:'uppercase', color:'#666' }}>
                    {report.fire_type || 'other'}
                  </span>
                  <span style={{
                    fontSize:'0.65rem', padding:'0.1rem 0.5rem', borderRadius:999, fontWeight:600,
                    background: report.syncStatus === 'failed' ? 'rgba(230,60,47,0.12)' : report.syncStatus === 'syncing' ? 'rgba(59,130,246,0.12)' : 'rgba(244,130,10,0.12)',
                    color:      report.syncStatus === 'failed' ? '#f87c74' : report.syncStatus === 'syncing' ? '#3b82f6' : '#f4820a',
                  }}>
                    {report.syncStatus === 'syncing' ? '⏳ Syncing' : report.syncStatus === 'failed' ? '⚠ Failed' : '⏸ Pending'}
                  </span>
                </div>

                <p style={{ fontSize:'0.8rem', color:'#c0bdb8', margin:'0 0 0.4rem', lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                  {report.description}
                </p>

                {report.syncError && (
                  <div style={{ fontSize:'0.7rem', color:'#f87c74', marginBottom:'0.4rem' }}>
                    {report.syncError}
                  </div>
                )}

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'0.68rem', color:'#555' }}>
                    Saved {fmtTime(report.createdAt)}
                  </span>
                  <button
                    onClick={() => handleDelete(report.localId)}
                    style={{ fontSize:'0.7rem', color:'#e63c2f', background:'none', border:'none', cursor:'pointer' }}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}

            {reports.length > 0 && isOnline && (
              <button
                className="btn-primary"
                style={{ width:'100%', marginTop:'0.5rem' }}
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? 'Syncing…' : '🔄 Sync All Now'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pulse animation for offline dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </>
  );
}
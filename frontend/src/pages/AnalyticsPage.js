import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import '../dashboard.css';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const STATUS_COLORS = {
  pending:    '#f4820a',
  verified:   '#3b82f6',
  dispatched: '#a855f7',
  resolved:   '#22c55e',
  rejected:   '#e63c2f',
};

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const FALLBACK_PIE  = [{ name: t.noData || 'No Data', value: 1 }];
  const FALLBACK_LINE = [{ month: '—', actual: 0, aiTrend: 0 }];

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [aiTrends,  setAiTrends]  = useState(null);
  const [aiHeatmap, setAiHeatmap] = useState(null);
  

  useEffect(() => {
    let isMounted = true;

    async function loadMainData() {
      try {
        const { data: analytics } = await API.get('/admin/analytics');
        if (isMounted) setData(analytics);
      } catch (err) {
        if (isMounted) setError('Could not load analytics data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    async function loadAiData() {
      try {
        const [trendRes, heatRes] = await Promise.all([
          fetch('http://localhost:5001/api/ai/trends'),
          fetch('http://localhost:5001/api/ai/heatmap'),
        ]);
        
        if (!trendRes.ok || !heatRes.ok) return;

        const trendJson = await trendRes.json();
        const heatJson  = await heatRes.json();
        
        if (isMounted) {
          setAiTrends(trendJson);
          setAiHeatmap(heatJson);
        }
      } catch {
        // AI service offline — silently skip
      }
    }

    loadMainData();
    loadAiData();

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Normalize API naming conventions (CamelCase & SnakeCase fallback) ──
  const totalIncidents     = data?.totalIncidents ?? data?.total ?? '—';
  const avgResponseMinutes = data?.avgResponseMinutes ?? data?.avgResponseTimeMinutes ?? '—';
  const totalUsers         = data?.totalUsers ?? '—';
  const byStatus           = data?.byStatus ?? {};
  const byMonth            = data?.byMonth  ?? {};

  // ── Build Chart Datasets ───────────────────────────────────────
  const pieData = Object.keys(byStatus).length > 0
    ? Object.entries(byStatus).map(([name, value]) => ({ name, value }))
    : FALLBACK_PIE;

  const monthsSet = new Set([
    ...Object.keys(byMonth),
    ...Object.keys(aiTrends?.monthly_trends || {})
  ]);

  const combinedLineData = monthsSet.size > 0
    ? Array.from(monthsSet).map(month => ({
        month,
        actual: byMonth[month] ?? 0,
        aiTrend: aiTrends?.monthly_trends?.[month] ?? undefined,
      }))
    : FALLBACK_LINE;

  return (
    <div className="dash-page">

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <nav className="dash-topbar">
        <Link to="/" className="dash-topbar-logo">
          <div className="dash-topbar-logo-icon">🔥</div>
          <span className="dash-topbar-logo-text">{t.appName}</span>
        </Link>
        <div className="dash-topbar-right">
          <LanguageSwitcher />
          <span className="dash-role-badge">{t.admin}</span>
          <span className="dash-user-name">{user?.name}</span>
          <Link to="/admin" className="btn-secondary" style={{ fontSize:'0.78rem', padding:'0.4rem 0.9rem' }}>{t.back}</Link>
          <button className="dash-logout-btn" onClick={() => { logout(); navigate('/'); }}>{t.signOut}</button>
        </div>
      </nav>

      <div className="dash-content">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">{t.analyticsTitle}</h1>
            <p className="dash-subtitle">{t.analyticsSub}</p>
          </div>
        </div>

        {loading && <div className="loading-state">{t.loading}</div>}
        {error   && <div className="loading-state" style={{ color:'#f87c74' }}>{error}</div>}

        {!loading && !error && (
          <>
            {/* ── Stat Cards ─────────────────────────────────── */}
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">{t.totalIncidents}</div>
                <div className="stat-value stat-accent">{totalIncidents}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{t.resolved}</div>
                <div className="stat-value">{byStatus?.resolved ?? '—'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{t.avgResponse || 'Avg Response Time'}</div>
                <div className="stat-value">
                  {avgResponseMinutes === '—' ? '—' : `${avgResponseMinutes} min`}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{t.activeUsers || 'Active Users'}</div>
                <div className="stat-value">{totalUsers}</div>
              </div>
            </div>

            {/* ── Charts Row ────────────────────────────────── */}
            <div className="two-col" style={{ gap:'1.5rem', marginBottom:'2rem' }}>

              {/* Pie Chart — Incidents by Status */}
              <div className="card">
                <div className="section-label" style={{ marginBottom:'1rem' }}>{t.byStatus}</div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.name] || '#444'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background:'#161616', border:'1px solid #2a2a2a', borderRadius:8, fontSize:'0.8rem' }}
                      labelStyle={{ color:'#f0ede8' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', marginTop:'0.75rem', justifyContent:'center' }}>
                  {pieData.map(entry => (
                    <div key={entry.name} style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.72rem', color:'#888' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background: STATUS_COLORS[entry.name] || '#444' }} />
                      {t[entry.name] || entry.name} ({entry.value})
                    </div>
                  ))}
                </div>
              </div>

              {/* Line Chart — Incidents & AI Trends Timeline */}
              <div className="card">
                <div className="section-label" style={{ marginBottom:'1rem' }}>{t.overTime}</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={combinedLineData} margin={{ top:5, right:10, left:-20, bottom:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                    <XAxis dataKey="month" tick={{ fontSize:10, fill:'#555' }} />
                    <YAxis tick={{ fontSize:10, fill:'#555' }} />
                    <Tooltip
                      contentStyle={{ background:'#161616', border:'1px solid #2a2a2a', borderRadius:8, fontSize:'0.8rem' }}
                      labelStyle={{ color:'#f0ede8' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name={t.actualData || "Actual"}
                      stroke="#f4820a"
                      strokeWidth={2}
                      dot={{ fill:'#f4820a', r:3 }}
                      activeDot={{ r:5 }}
                    />
                    {aiTrends && (
                      <Line
                        type="monotone"
                        dataKey="aiTrend"
                        name={t.aiPrediction || "AI Trend"}
                        stroke="#a855f7"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ fill:'#a855f7', r:3 }}
                        activeDot={{ r:5 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── AI Heatmap Risk Zones ──────────────────────── */}
            {aiHeatmap?.risk_zones?.length > 0 && (
              <div style={{ marginBottom:'2rem' }}>
                <div className="section-label">{t.riskZones}</div>
                <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'1rem', color:'var(--text-primary)', margin:'0 0 1rem' }}>
                  {t.riskZonesSub}
                </h3>
                <div className="incident-grid">
                  {aiHeatmap.risk_zones.map(zone => (
                    <div key={zone.zone_id} className="card" style={{ borderLeft:`3px solid ${zone.risk_level === 'High' ? '#e63c2f' : zone.risk_level === 'Medium' ? '#f4820a' : '#22c55e'}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
                        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'0.875rem' }}>Zone {zone.zone_id}</span>
                        <span className={`status-badge status-${zone.risk_level === 'High' ? 'rejected' : zone.risk_level === 'Medium' ? 'pending' : 'resolved'}`}>
                          {zone.risk_level} Risk
                        </span>
                      </div>
                      <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'0.4rem' }}>
                        📍 {zone.center_lat}, {zone.center_lng}
                      </div>
                      <div style={{ fontSize:'0.78rem', color:'var(--text-dim)' }}>
                        {zone.total_incidents} {t.totalReports?.toLowerCase() || 'incidents'} — Risk score: {zone.risk_score}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Fire Type Distribution (from AI service) ──── */}
            {aiTrends?.fire_type_distribution && (
              <div style={{ marginBottom:'2rem' }}>
                <div className="section-label">{t.fireTypeBreakdown}</div>
                <div className="card">
                  {(() => {
                    const total = Object.values(aiTrends.fire_type_distribution).reduce((a, b) => a + b, 0);
                    return Object.entries(aiTrends.fire_type_distribution).map(([type, count]) => {
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      const localizedTypeLabel = t.fireTypes?.[type] || type;

                      return (
                        <div key={type} style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'0.75rem' }}>
                          <span style={{ width:120, fontSize:'0.78rem', color:'var(--text-muted)', textTransform:'capitalize', flexShrink:0 }}>
                            {localizedTypeLabel}
                          </span>
                          <div style={{ flex:1, height:6, background:'#1e1e1e', borderRadius:99, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#e63c2f,#f4820a)', borderRadius:99, transition:'width 0.6s' }} />
                          </div>
                          <span style={{ fontSize:'0.72rem', color:'var(--text-dim)', width:30, textAlign:'right' }}>{count}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}
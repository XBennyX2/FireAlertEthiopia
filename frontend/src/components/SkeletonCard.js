export default function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card-sm" style={{ marginBottom:'0.6rem', opacity:0.5 }}>
      <div style={{
        height:14, width:'55%', background:'#1e1e1e',
        borderRadius:4, marginBottom:'0.6rem',
        animation:'pulse 1.4s ease-in-out infinite',
      }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height:10,
          width: i === lines-1 ? '40%' : '90%',
          background:'#1a1a1a', borderRadius:4,
          marginBottom:'0.4rem',
          animation:'pulse 1.4s ease-in-out infinite',
          animationDelay:`${i * 0.1}s`,
        }} />
      ))}
    </div>
  );
}
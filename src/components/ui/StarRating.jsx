export default function StarRating({ rating, count, size = 14 }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const diff = rating - (i - 1);
    if (diff >= 1) {
      // Full star
      stars.push(
        <span key={i} style={{ color: '#F59E0B', fontSize: size }}>★</span>
      );
    } else if (diff >= 0.5) {
      // Half star using gradient trick
      stars.push(
        <span key={i} style={{ fontSize: size, position: 'relative', display: 'inline-block' }}>
          <span style={{ color: '#E5E7EB' }}>★</span>
          <span style={{
            color: '#F59E0B',
            position: 'absolute',
            left: 0,
            top: 0,
            width: '50%',
            overflow: 'hidden',
            display: 'inline-block',
          }}>★</span>
        </span>
      );
    } else {
      // Empty star
      stars.push(
        <span key={i} style={{ color: '#E5E7EB', fontSize: size }}>★</span>
      );
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex">{stars}</span>
      {count !== undefined && (
        <span className="text-[#555555]" style={{ fontSize: size - 1 }}>
          {count} avis
        </span>
      )}
    </span>
  );
}

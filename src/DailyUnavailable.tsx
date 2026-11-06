export default function DailyUnavailable({ onResults }: { onResults?: () => void }) {
  return (
    <article className="daily-unavailable" role="status">
      <label>DAILY CHALLENGE</label>
      <h2>Daily Challenge unavailable</h2>
      <p>We couldn’t prepare this lineup. Please check back later.</p>
      {onResults && <button className="primary" onClick={onResults}>View saved results</button>}
    </article>
  );
}

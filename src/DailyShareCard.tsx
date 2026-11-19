export type DailyShareData = { challenge: string; date: string; points: number; solved: number; streak: number; time: string; results: boolean[] };

export function DailyShareCard({ data }: { data: DailyShareData }) {
  return <article className="daily-share-card" aria-label="Spoiler-free Daily Challenge scorecard">
    <header>SEQUENCE <span>DAILY CHALLENGE #{data.challenge}</span></header>
    <div className="daily-share-score"><strong>{data.points}<span> / 500</span></strong><span>{data.date}</span></div>
    <div className="daily-share-grid" role="img" aria-label={data.solved + ' of 5 puzzles solved'}>{data.results.map((solved, index) => <i key={index} className={solved ? 'solved' : ''} />)}</div>
    <div className="daily-share-meta"><span>{data.solved}/5 solved</span><span>{data.streak} day streak</span><span>{data.time}</span></div>
  </article>;
}

export async function makeDailyShareImage(data: DailyShareData): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 720;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable.');
  const gradient = context.createLinearGradient(0, 0, 1080, 720);
  gradient.addColorStop(0, '#f8faf6'); gradient.addColorStop(1, '#e9f0e5');
  context.fillStyle = gradient; context.fillRect(0, 0, 1080, 720);
  context.fillStyle = '#314637'; context.font = '800 32px Arial'; context.fillText('SEQUENCE', 82, 94);
  context.fillStyle = '#6f7d6d'; context.font = '600 24px Arial'; context.fillText('DAILY CHALLENGE  #' + data.challenge, 82, 145);
  context.fillStyle = '#26332a'; context.font = '700 122px Arial'; context.fillText(String(data.points), 76, 330);
  context.fillStyle = '#7b8778'; context.font = '600 36px Arial'; context.fillText('/ 500 POINTS', 394, 325);
  context.fillStyle = '#657260'; context.font = '500 26px Arial'; context.fillText(data.date, 82, 390);
  data.results.forEach((solved, index) => {
    const x = 82 + index * 90;
    context.fillStyle = solved ? '#719875' : '#d4dbd1';
    context.beginPath(); context.roundRect(x, 448, 64, 64, 14); context.fill();
  });
  context.fillStyle = '#435343'; context.font = '600 25px Arial';
  context.fillText(data.solved + '/5 SOLVED', 82, 580);
  context.fillText(data.streak + ' DAY STREAK', 375, 580);
  context.fillText(data.time, 735, 580);
  context.fillStyle = '#849080'; context.font = '500 20px Arial';
  context.fillText('A spoiler-free scorecard · One good question at a time', 82, 650);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not create the scorecard.')), 'image/png'));
  return new File([blob], 'sequence-daily-score.png', { type: 'image/png' });
}

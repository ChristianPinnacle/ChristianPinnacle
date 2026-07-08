interface PlScannerProps {
  topScore: number;
  topTitle: string;
  scanning: boolean;
}

export function PlScanner({ topScore, topTitle, scanning }: PlScannerProps) {
  const isOver9000 = topScore > 9000;

  return (
    <div className={`pl-scanner ${scanning ? 'pl-scanning' : ''}`}>
      <div className="pl-label">POWER LEVEL SCAN</div>
      <div className={`pl-number ${isOver9000 ? 'pl-over' : ''}`}>
        {scanning ? '???,???' : topScore.toLocaleString()}
      </div>
      {isOver9000 && !scanning && (
        <div className="pl-over-label">IT'S OVER 9000!!!</div>
      )}
      <div className="pl-note-title">{scanning ? 'SCANNING…' : topTitle}</div>
    </div>
  );
}

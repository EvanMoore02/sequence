import { useEffect, useRef } from 'react';
import { Lightbulb, X } from 'lucide-react';

export default function TutorialDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;
    root?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key === 'Tab' && root) {
        const items = Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])'));
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [onClose]);
  return <div className="tutorial-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="tutorial-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorial-title" aria-describedby="tutorial-intro" ref={ref} tabIndex={-1}>
    <button className="tutorial-close" aria-label="Close How to Play" onClick={onClose}><X size={18} /></button><div className="tutorial-mark"><Lightbulb size={19} /></div><label className="tutorial-eyebrow">A QUICK GUIDE</label><h1 id="tutorial-title">How to play</h1><p id="tutorial-intro" className="tutorial-intro">Find the rule behind each number, letter, or shape sequence. Every third Daily Challenge includes a letter pattern.</p>
    <div className="tutorial-example" aria-label="Example: three, six, nine, then twelve">3, 6, 9 <span>→</span> ? <small>Add 3 each time, so the answer is 12.</small></div>
    <ol className="tutorial-steps"><li><b>Study the sequence</b><span>Look for changes in numbers, letters, or shapes. Letter patterns may move forward or backward, grow their jumps, or alternate rules.</span></li><li><b>Enter your answer</b><span>Use a whole number for number puzzles or one letter for letter puzzles. If a puzzle has two blanks, enter both numbers separated by commas.</span></li><li><b>Use attempts and hints</b><span>Daily score starts at 100, 70, 40, or 10 points for 0, 1, 2, or 3 hints; each extra try costs 10 points. A correct answer always earns at least 10 points; skipping gives 0.</span></li><li><b>Choose how to play</b><span>Practice has unlimited tries and category filters. Endless gives you three lives. Rate Practice puzzles to tune their difficulty.</span></li></ol>
    <button className="primary tutorial-done" data-autofocus onClick={onClose}>Got it, let’s play</button><p className="tutorial-foot">Open this guide any time with the help icon.</p>
  </section></div>;
}

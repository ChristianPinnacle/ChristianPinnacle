import { useRef, useState } from 'react';

interface PortraitSlotProps {
  onUpload: (file: File) => void;
  portraitUrl: string | null;
}

export function PortraitSlot({ onUpload, portraitUrl }: PortraitSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    onUpload(file);
  };

  return (
    <div
      className={`portrait-slot ${dragging ? 'portrait-dragging' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
      }}
    >
      {portraitUrl ? (
        <img src={portraitUrl} alt="Portrait" className="portrait-img" />
      ) : (
        <div className="portrait-placeholder">
          <span className="portrait-icon">◎</span>
          <span className="portrait-label">TAP TO UPLOAD</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

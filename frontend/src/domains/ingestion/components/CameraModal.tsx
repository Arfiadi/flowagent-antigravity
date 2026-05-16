import { useEffect } from "react";
import { GlassCard, Button } from "../../../core/ui";
import { useCamera } from "../hooks/useCamera";
import "./CameraModal.css";

interface CameraModalProps {
  onCapture: (photoBase64: string) => void;
  onClose: () => void;
}

export function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const { startCamera, stopCamera, capturePhoto, videoRef, error } = useCamera();

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = () => {
    const photo = capturePhoto();
    if (photo) {
      stopCamera();
      onCapture(photo);
      onClose();
    }
  };

  const handleCancel = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="camera-modal-overlay fade-slide-up">
      <GlassCard className="camera-modal">
        <div className="camera-modal__header">
          <h3 className="text-heading">Foto Nota</h3>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            ✕
          </Button>
        </div>

        {error ? (
          <div className="camera-modal__error text-critical">{error}</div>
        ) : (
          <div className="camera-modal__viewport">
            <video ref={videoRef} autoPlay playsInline muted className="camera-modal__video" />
            <div className="camera-modal__overlay">
              <div className="scan-line" />
            </div>
          </div>
        )}

        <div className="camera-modal__actions">
          <Button variant="ghost" size="lg" onClick={handleCancel}>
            Batal
          </Button>
          <Button variant="primary" size="lg" onClick={handleCapture} disabled={!!error}>
            Ambil Foto
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

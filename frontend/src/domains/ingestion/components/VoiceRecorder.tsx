import { GlassCard, Button } from "../../../core/ui";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import "./VoiceRecorder.css";

interface VoiceRecorderProps {
  onSend: (audioBase64: string) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const {
    isRecording,
    audioUrl,
    audioBase64,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();

  const handleSend = () => {
    if (audioBase64) {
      onSend(audioBase64);
    }
  };

  const handleCancel = () => {
    clearRecording();
    onCancel();
  };

  return (
    <div className="voice-modal-overlay fade-slide-up">
      <GlassCard className="voice-recorder">
        <h3 className="text-heading" style={{ textAlign: "center" }}>
          Pesan Suara
        </h3>

        <div className="voice-recorder__visualizer">
          {isRecording ? (
            <div className="voice-recorder__waves">
              <span className="wave" />
              <span className="wave" />
              <span className="wave" />
              <span className="wave" />
              <span className="wave" />
            </div>
          ) : audioUrl ? (
            <audio src={audioUrl} controls className="voice-recorder__audio" />
          ) : (
            <p className="text-muted">Tekan dan bicara untuk mencatat transaksi.</p>
          )}
        </div>

        <div className="voice-recorder__actions">
          {!audioUrl ? (
            <Button
              variant={isRecording ? "critical" : "primary"}
              size="lg"
              className={`voice-recorder__btn ${isRecording ? "pulse-glow" : ""}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? "⏹ Hentikan" : "🎤 Rekam"}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={clearRecording}>
                Ulangi
              </Button>
              <Button variant="positive" onClick={handleSend}>
                Kirim
              </Button>
            </>
          )}
        </div>
        
        {!audioUrl && !isRecording && (
          <Button variant="ghost" size="sm" onClick={handleCancel} style={{ marginTop: 'var(--fa-space-md)' }}>
            Batal
          </Button>
        )}
      </GlassCard>
    </div>
  );
}

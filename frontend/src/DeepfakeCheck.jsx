import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ScanFace, UploadCloud } from "lucide-react";
import { api } from "./api";
import "./DeepfakeCheck.css";

const MAX_MB = 200;

const DeepfakeCheck = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // { url, kind }
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => () => preview && URL.revokeObjectURL(preview.url), [preview]);

  const pick = (e) => {
    const f = e.target.files[0];
    setReport(null);
    setError("");
    if (!f) return;
    const kind = f.type.startsWith("image/") ? "image" : f.type.startsWith("video/") ? "video" : null;
    if (!kind) return setError("Please choose an image or a video file.");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`File is too large (max ${MAX_MB} MB).`);
    setFile(f);
    setPreview({ url: URL.createObjectURL(f), kind });
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setReport(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setReport(null);
    setError("");
    const formData = new FormData();
    formData.append("media", file);
    try {
      setReport(await api("/deepfake/check", { method: "POST", body: formData }));
    } catch (err) {
      setError(err.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const isFake = report?.prediction === "FAKE";
  const confidencePct = report ? (report.confidence * 100).toFixed(1) : null;
  const fakePct = report ? (report.fake_probability * 100).toFixed(1) : null;

  return (
    <div className="dfc-page">
      <div className="dfc-card">
        <button className="dfc-back" onClick={() => navigate("/home")}>
          <ArrowLeft size={16} /> Back to home
        </button>

        <div className="dfc-title">
          <ScanFace size={30} />
          <div>
            <h1>Deepfake Check</h1>
            <p>Upload any photo or video to get a REAL / FAKE report with a confidence score. Nothing is saved or recorded on the blockchain.</p>
          </div>
        </div>

        <label className="dfc-drop">
          <UploadCloud size={28} />
          <span>{file ? file.name : "Choose an image or video"}</span>
          <small>JPG, PNG, WEBP, BMP, MP4, AVI, MOV, MKV, WEBM · up to {MAX_MB} MB</small>
          <input ref={inputRef} type="file" accept="image/*,video/*" onChange={pick} disabled={loading} hidden />
        </label>

        {preview && (
          <div className="dfc-preview">
            {preview.kind === "image" ? (
              <img src={preview.url} alt="Selected upload" />
            ) : (
              <video src={preview.url} controls preload="metadata" />
            )}
          </div>
        )}

        <div className="dfc-actions">
          <button className="dfc-btn" onClick={analyze} disabled={!file || loading}>
            {loading ? "Analyzing…" : "Analyze"}
          </button>
          {file && !loading && (
            <button className="dfc-btn dfc-btn-ghost" onClick={reset}>Clear</button>
          )}
        </div>

        {loading && <p className="dfc-hint">Analyzing. Videos can take up to a minute.</p>}
        {error && <div className="dfc-error">{error}</div>}

        {report && (
          <div className={`dfc-report ${isFake ? "fake" : "real"}`}>
            <div className="dfc-verdict">{isFake ? "FAKE" : "REAL"}</div>
            <div className="dfc-verdict-sub">
              {isFake ? "Signs of manipulation detected" : "No signs of manipulation detected"}
            </div>

            <div className="dfc-confidence">
              <span>Confidence</span>
              <strong>{confidencePct}%</strong>
            </div>
            <div className="dfc-bar" title={`Fake probability ${fakePct}%`}>
              <div className="dfc-bar-fill" style={{ width: `${fakePct}%` }} />
            </div>
            <div className="dfc-bar-scale"><span>Real</span><span>Fake probability: {fakePct}%</span><span>Fake</span></div>

            <div className="dfc-details">
              <div><span>File</span><b>{report.fileName}</b></div>
              <div><span>Type</span><b>{report.media_type}</b></div>
              <div><span>{report.media_type === "video" ? "Frames analyzed" : "Images analyzed"}</span><b>{report.frames_analyzed}</b></div>
              <div><span>Faces found</span><b>{report.faces_found}</b></div>
            </div>

            {report.note && <div className="dfc-warn">{report.note}</div>}

            <p className="dfc-disclaimer">
              This is an automated, probabilistic screen based on a face-forgery model. It can be wrong, especially on
              heavily compressed files, images without faces, or newer generation methods. Do not treat it as proof.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeepfakeCheck;

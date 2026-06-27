"use client";

import { useState } from "react";
import { adaptImageToSize } from "@/lib/imageUtils";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function Home() {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [contextText, setContextText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [publishStatus, setPublishStatus] = useState("");
  const [adaptedImages, setAdaptedImages] = useState(null);
  const [isAdapting, setIsAdapting] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setIsAdapting(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        setImagePreview(base64);
        
        try {
          const instagram = await adaptImageToSize(base64, 1080, 1080);
          const facebook = await adaptImageToSize(base64, 1200, 630);
          const tiktok = await adaptImageToSize(base64, 1080, 1920);
          const x = await adaptImageToSize(base64, 1200, 675);
          
          setAdaptedImages({
            instagram,
            facebook,
            tiktok,
            x
          });
        } catch (error) {
          console.error("Error al adaptar imagenes:", error);
        } finally {
          setIsAdapting(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!imagePreview) return;
    
    setLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imagePreview,
          context: contextText,
        }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setResults(data);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Error al generar posts");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!results) return;
    setPublishStatus("Enviando...");
    
    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imagePreview,
          images: adaptedImages,
          posts: results,
        }),
      });
      
      if (response.ok) {
        setPublishStatus("¡Enviado a n8n!");
        setTimeout(() => setPublishStatus(""), 3000);
      } else {
        setPublishStatus("Error al enviar");
      }
    } catch (error) {
      console.error(error);
      setPublishStatus("Error de red");
    }
  };

  const handleTextChange = (platform, text) => {
    setResults(prev => ({ ...prev, [platform]: text }));
  };

  const handleCopyText = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Fallo al copiar", err);
    }
  };

  const handleDownloadImage = (base64, platform) => {
    if (!base64) return;
    const link = document.createElement("a");
    link.href = base64;
    link.download = `${platform}_image.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportZip = async () => {
    if (!results) return;
    try {
      const zip = new JSZip();
      
      const imgFolder = zip.folder("images");
      if (adaptedImages) {
        Object.entries(adaptedImages).forEach(([platform, base64]) => {
          if (base64) {
            const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
            imgFolder.file(`${platform}.jpg`, base64Data, {base64: true});
          }
        });
      }

      let textsContent = "";
      Object.entries(results).forEach(([platform, text]) => {
        textsContent += `=== ${platform.toUpperCase()} ===\n\n${text}\n\n\n`;
      });
      zip.file("posts.txt", textsContent);

      const content = await zip.generateAsync({type: "blob"});
      saveAs(content, "social_posts.zip");
    } catch (error) {
      console.error("Error creando ZIP:", error);
      alert("Hubo un error al exportar el ZIP");
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">Social Gen AI</h1>
        <p className="subtitle">Crea contenido para todas tus redes en segundos</p>
      </header>

      <main className="main-content">
        <section className="card">
          <h2>1. Sube tu imagen</h2>
          
          <div className="upload-area">
            <input 
              type="file" 
              accept="image/*" 
              className="upload-input" 
              onChange={handleImageUpload}
            />
            {!imagePreview ? (
              <div>
                <p>Haz clic o arrastra una imagen aquí</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>JPG, PNG (Max 5MB)</p>
              </div>
            ) : (
              <img src={imagePreview} alt="Preview" className="preview-image" />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Contexto (Opcional)</label>
            <textarea 
              className="form-textarea"
              placeholder="Ej: Evento de marketing el 25 de Octubre en Madrid. Destacar los nuevos productos."
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
            />
          </div>

          <button 
            className="btn" 
            onClick={handleGenerate} 
            disabled={!imagePreview || loading || isAdapting}
          >
            {(loading || isAdapting) ? <span className="spinner"></span> : "Generar Posts"}
          </button>
        </section>

        <section className="results-container">
          {results ? (
            <>
              <h2>2. Revisa y Edita</h2>
              
              <div className="social-card">
                <div className="social-header instagram">
                  <span>📸 Instagram</span>
                </div>
                <div className="social-body">
                  {adaptedImages?.instagram && (
                    <img src={adaptedImages.instagram} alt="Instagram" style={{width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '0.5rem', marginBottom: '1rem'}} />
                  )}
                  <textarea 
                    className="social-textarea"
                    value={results.instagram}
                    onChange={(e) => handleTextChange('instagram', e.target.value)}
                  />
                  <div className="action-buttons">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleDownloadImage(adaptedImages?.instagram, 'instagram')} disabled={!adaptedImages?.instagram}>
                      Descargar Imagen
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleCopyText(results.instagram)}>
                      Copiar Texto
                    </button>
                  </div>
                </div>
              </div>

              <div className="social-card">
                <div className="social-header facebook">
                  <span>📘 Facebook</span>
                </div>
                <div className="social-body">
                  {adaptedImages?.facebook && (
                    <img src={adaptedImages.facebook} alt="Facebook" style={{width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '0.5rem', marginBottom: '1rem'}} />
                  )}
                  <textarea 
                    className="social-textarea"
                    value={results.facebook}
                    onChange={(e) => handleTextChange('facebook', e.target.value)}
                  />
                  <div className="action-buttons">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleDownloadImage(adaptedImages?.facebook, 'facebook')} disabled={!adaptedImages?.facebook}>
                      Descargar Imagen
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleCopyText(results.facebook)}>
                      Copiar Texto
                    </button>
                  </div>
                </div>
              </div>

              <div className="social-card">
                <div className="social-header tiktok">
                  <span>🎵 TikTok</span>
                </div>
                <div className="social-body">
                  {adaptedImages?.tiktok && (
                    <img src={adaptedImages.tiktok} alt="TikTok" style={{width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '0.5rem', marginBottom: '1rem'}} />
                  )}
                  <textarea 
                    className="social-textarea"
                    value={results.tiktok}
                    onChange={(e) => handleTextChange('tiktok', e.target.value)}
                  />
                  <div className="action-buttons">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleDownloadImage(adaptedImages?.tiktok, 'tiktok')} disabled={!adaptedImages?.tiktok}>
                      Descargar Imagen
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleCopyText(results.tiktok)}>
                      Copiar Texto
                    </button>
                  </div>
                </div>
              </div>

              <div className="social-card">
                <div className="social-header x">
                  <span>𝕏 X (Twitter)</span>
                </div>
                <div className="social-body">
                  {adaptedImages?.x && (
                    <img src={adaptedImages.x} alt="X" style={{width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '0.5rem', marginBottom: '1rem'}} />
                  )}
                  <textarea 
                    className="social-textarea"
                    value={results.x}
                    onChange={(e) => handleTextChange('x', e.target.value)}
                  />
                  <div className="action-buttons">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleDownloadImage(adaptedImages?.x, 'x')} disabled={!adaptedImages?.x}>
                      Descargar Imagen
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleCopyText(results.x)}>
                      Copiar Texto
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn" onClick={handleExportZip} style={{background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)'}}>
                  Exportar Todo (ZIP)
                </button>
                <button className="btn" onClick={handlePublish} style={{background: 'var(--foreground)', color: 'var(--background)'}}>
                  {publishStatus || "Enviar a n8n"}
                </button>
              </div>
            </>
          ) : (
            <div className="card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)'}}>
              <p>Sube una imagen y haz clic en generar para ver los resultados aquí.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

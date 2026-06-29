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
  
  const [imagePrompt, setImagePrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'generate', 'edit'
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditingImage, setIsEditingImage] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setIsAdapting(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        await processImageBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImageBase64 = async (base64) => {
    setImagePreview(base64);
    setIsAdapting(true);
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

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt })
      });
      const data = await response.json();
      if (response.ok) {
        await processImageBase64(data.imageBase64);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Error al generar imagen");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleEditImage = async () => {
    if (!editPrompt.trim() || !imagePreview) return;
    setIsEditingImage(true);
    try {
      const response = await fetch("/api/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: editPrompt, image: imagePreview })
      });
      const data = await response.json();
      if (response.ok) {
        await processImageBase64(data.imageBase64);
        setEditPrompt(""); // Limpiar prompt
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Error al editar imagen");
    } finally {
      setIsEditingImage(false);
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
          <h2>1. Imagen Principal</h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <button 
              className={`btn btn-sm ${activeTab === 'upload' ? 'btn-secondary' : ''}`}
              style={{ background: activeTab === 'upload' ? 'var(--foreground)' : 'transparent', color: activeTab === 'upload' ? 'var(--background)' : 'var(--foreground)' }}
              onClick={() => setActiveTab('upload')}
            >
              Subir
            </button>
            <button 
              className={`btn btn-sm ${activeTab === 'generate' ? 'btn-secondary' : ''}`}
              style={{ background: activeTab === 'generate' ? 'var(--foreground)' : 'transparent', color: activeTab === 'generate' ? 'var(--background)' : 'var(--foreground)' }}
              onClick={() => setActiveTab('generate')}
            >
              Generar (0)
            </button>
            <button 
              className={`btn btn-sm ${activeTab === 'edit' ? 'btn-secondary' : ''}`}
              style={{ background: activeTab === 'edit' ? 'var(--foreground)' : 'transparent', color: activeTab === 'edit' ? 'var(--background)' : 'var(--foreground)' }}
              onClick={() => setActiveTab('edit')}
              disabled={!imagePreview}
            >
              Modificar
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Panel Izquierdo: Acciones */}
            <div>
              {activeTab === 'upload' && (
                <div className="upload-area" style={{ height: '100%' }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="upload-input" 
                    onChange={handleImageUpload}
                  />
                  <div>
                    <p>Haz clic o arrastra una imagen aquí</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>JPG, PNG (Max 5MB)</p>
                  </div>
                </div>
              )}

              {activeTab === 'generate' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  <textarea 
                    className="form-textarea"
                    placeholder="Describe la imagen que quieres crear desde cero..."
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    style={{ flex: 1, minHeight: '120px' }}
                  />
                  <button 
                    className="btn" 
                    onClick={handleGenerateImage} 
                    disabled={isGeneratingImage || !imagePrompt.trim()}
                    style={{ background: 'var(--foreground)', color: 'var(--background)' }}
                  >
                    {isGeneratingImage ? <span className="spinner"></span> : "Generar con IA (DALL-E)"}
                  </button>
                </div>
              )}

              {activeTab === 'edit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  <textarea 
                    className="form-textarea"
                    placeholder="Escribe qué quieres cambiar de la foto actual..."
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    style={{ flex: 1, minHeight: '120px' }}
                  />
                  <button 
                    className="btn" 
                    onClick={handleEditImage} 
                    disabled={isEditingImage || !editPrompt.trim() || !imagePreview}
                    style={{ background: 'var(--foreground)', color: 'var(--background)' }}
                  >
                    {isEditingImage ? <span className="spinner"></span> : "Modificar con IA (GPT-4V + DALL-E)"}
                  </button>
                </div>
              )}
            </div>

            {/* Panel Derecho: Previsualización */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--surface)', padding: '1rem', minHeight: '200px' }}>
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="preview-image" style={{ maxHeight: '300px', width: 'auto', objectFit: 'contain' }} />
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>La imagen seleccionada aparecerá aquí</p>
              )}
            </div>
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

import { useState, useRef, useCallback, DragEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Camera, Crop, ImagePlus, Check, Loader2 } from 'lucide-react';
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface AvatarUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentUrl: string | null;
  initials: string;
  onUploaded: (url: string | null) => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, 1, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

function getCroppedBlob(image: HTMLImageElement, crop: CropType): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const pixelCrop = {
    x: (crop.unit === '%' ? (crop.x / 100) * image.width : crop.x) * scaleX,
    y: (crop.unit === '%' ? (crop.y / 100) * image.height : crop.y) * scaleY,
    width: (crop.unit === '%' ? (crop.width / 100) * image.width : crop.width) * scaleX,
    height: (crop.unit === '%' ? (crop.height / 100) * image.height : crop.height) * scaleY,
  };

  const size = Math.min(pixelCrop.width, pixelCrop.height, 512);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, size, size);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas error'))), 'image/jpeg', 0.9);
  });
}

export default function AvatarUploadModal({ open, onOpenChange, userId, currentUrl, initials, onUploaded }: AvatarUploadModalProps) {
  const { toast } = useToast();
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<CropType>();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setImgSrc('');
    setCrop(undefined);
    setDragOver(false);
  };

  const loadFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      toast({ title: 'Selecione uma imagem válida', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImgSrc(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    loadFile(f);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) loadFile(f);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
  }, []);

  const handleUpload = async () => {
    if (!imgRef.current || !crop) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, crop);
      const path = `${userId}/avatar.jpg`;

      const { error } = await supabase.storage.from('avatars').upload(path, blob, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      if (error) throw error;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl + '?t=' + Date.now();
      await supabase.from('profiles').update({ avatar_url: publicUrl } as any).eq('user_id', userId);

      onUploaded(publicUrl);
      toast({ title: 'Foto atualizada!' });
      reset();
      onOpenChange(false);
    } catch (err) {
      console.error("Error uploading avatar:", err);
      toast({ title: 'Erro ao enviar foto', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    await supabase.from('profiles').update({ avatar_url: null } as any).eq('user_id', userId);
    onUploaded(null);
    toast({ title: 'Foto removida!' });
    setUploading(false);
    reset();
    onOpenChange(false);
  };

  const isCropping = !!imgSrc;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
            {isCropping ? (
              <>
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Crop className="w-4 h-4 text-primary" />
                </div>
                Ajustar foto
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-primary" />
                </div>
                Foto de perfil
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          {isCropping ? (
            /* ── Crop view ── */
            <div className="space-y-4">
              <div className="rounded-2xl border border-border overflow-hidden bg-muted/30 flex items-center justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  aspect={1}
                  circularCrop
                  className="block [&_.ReactCrop__crop-selection]:!border-2 [&_.ReactCrop__crop-selection]:!border-primary"
                >
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt="Crop"
                    onLoad={onImageLoad}
                    className="block max-w-full max-h-80"
                  />
                </ReactCrop>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Arraste para ajustar a área de recorte
              </p>

              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2 h-11 rounded-xl font-semibold"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {uploading ? 'Salvando...' : 'Salvar foto'}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl px-5"
                  onClick={reset}
                  disabled={uploading}
                >
                  Voltar
                </Button>
              </div>
            </div>
          ) : (
            /* ── Initial view ── */
            <div className="space-y-5">
              {/* Current avatar preview */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-primary/10 ring-offset-2 ring-offset-card">
                    {currentUrl ? (
                      <img src={currentUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Avatar className="w-full h-full rounded-none">
                        <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-extrabold rounded-none w-full h-full">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  {currentUrl && (
                    <button
                      onClick={handleRemove}
                      disabled={uploading}
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                      title="Remover foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
                className={`
                  relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200
                  flex flex-col items-center justify-center gap-3 py-8 px-4
                  ${dragOver
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-border hover:border-primary/50 hover:bg-muted/40'
                  }
                `}
              >
                <div className={`
                  w-12 h-12 rounded-2xl flex items-center justify-center transition-colors
                  ${dragOver ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}
                `}>
                  <ImagePlus className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">
                    Clique ou arraste uma imagem
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG ou WebP • Máx. 5MB
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </DialogContent>
    </Dialog>
  );
}

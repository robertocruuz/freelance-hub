import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Camera, Crop } from 'lucide-react';
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
  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setImgSrc('');
    setCrop(undefined);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast({ title: 'Selecione uma imagem válida', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImgSrc(reader.result as string);
    reader.readAsDataURL(f);
    if (inputRef.current) inputRef.current.value = '';
  };

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
    } catch {
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCropping && <Crop className="w-4 h-4" />}
            {isCropping ? 'Recortar foto' : 'Foto de perfil'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {isCropping ? (
            <div className="w-full max-h-[350px] overflow-auto rounded-lg border border-border">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                aspect={1}
                circularCrop
                className="max-w-full"
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop"
                  onLoad={onImageLoad}
                  className="max-w-full"
                  style={{ maxHeight: 340 }}
                />
              </ReactCrop>
            </div>
          ) : (
            <div
              className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-border cursor-pointer group"
              onClick={() => inputRef.current?.click()}
            >
              {currentUrl ? (
                <img src={currentUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Avatar className="w-full h-full rounded-none">
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold rounded-none w-full h-full">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
          )}

          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

          <div className="flex gap-2 w-full">
            {isCropping ? (
              <>
                <Button className="flex-1 gap-1.5" onClick={handleUpload} disabled={uploading}>
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Enviando...' : 'Salvar'}
                </Button>
                <Button variant="ghost" onClick={reset}>
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="flex-1 gap-1.5" onClick={() => inputRef.current?.click()}>
                  <Upload className="w-4 h-4" />
                  Escolher foto
                </Button>
                {currentUrl && (
                  <Button variant="destructive" size="icon" onClick={handleRemove} disabled={uploading}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

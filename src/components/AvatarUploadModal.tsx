import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Camera } from 'lucide-react';

interface AvatarUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentUrl: string | null;
  initials: string;
  onUploaded: (url: string | null) => void;
}

export default function AvatarUploadModal({ open, onOpenChange, userId, currentUrl, initials, onUploaded }: AvatarUploadModalProps) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast({ title: 'Selecione uma imagem válida', variant: 'destructive' });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/avatar.${ext}`;

    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) {
      toast({ title: 'Erro ao enviar foto', variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = data.publicUrl + '?t=' + Date.now();

    await supabase.from('profiles').update({ avatar_url: publicUrl } as any).eq('user_id', userId);

    onUploaded(publicUrl);
    toast({ title: 'Foto atualizada!' });
    setUploading(false);
    setFile(null);
    setPreview(null);
    onOpenChange(false);
  };

  const handleRemove = async () => {
    setUploading(true);
    await supabase.from('profiles').update({ avatar_url: null } as any).eq('user_id', userId);
    onUploaded(null);
    toast({ title: 'Foto removida!' });
    setUploading(false);
    setFile(null);
    setPreview(null);
    onOpenChange(false);
  };

  const displayUrl = preview || currentUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Foto de perfil</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div
            className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-border cursor-pointer group"
            onClick={() => inputRef.current?.click()}
          >
            {displayUrl ? (
              <img src={displayUrl} alt="Avatar" className="w-full h-full object-cover" />
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

          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

          <div className="flex gap-2 w-full">
            {preview ? (
              <Button className="flex-1 gap-1.5" onClick={handleUpload} disabled={uploading}>
                <Upload className="w-4 h-4" />
                {uploading ? 'Enviando...' : 'Salvar'}
              </Button>
            ) : (
              <Button variant="outline" className="flex-1 gap-1.5" onClick={() => inputRef.current?.click()}>
                <Upload className="w-4 h-4" />
                Escolher foto
              </Button>
            )}
            {currentUrl && !preview && (
              <Button variant="destructive" size="icon" onClick={handleRemove} disabled={uploading}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            {preview && (
              <Button variant="ghost" onClick={() => { setFile(null); setPreview(null); }}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import React, { useState, useRef } from 'react';
import { Camera, Trash2, Loader2, User as UserIcon, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfilePhotoUploaderProps {
  currentAvatar?: string | null;
  userName?: string;
  size?: 'sm' | 'md' | 'lg';
  onPhotoUpdated?: (avatarUrl: string | null) => void;
  className?: string;
}

export const ProfilePhotoUploader: React.FC<ProfilePhotoUploaderProps> = ({
  currentAvatar,
  userName = 'User',
  size = 'lg',
  onPhotoUpdated,
  className,
}) => {
  const [avatar, setAvatar] = useState<string | null>(currentAvatar || null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with prop changes
  React.useEffect(() => {
    setAvatar(currentAvatar || null);
  }, [currentAvatar]);

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  /**
   * Compresses and crops an image file into a square base64 JPEG
   */
  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image file'));
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const targetDim = 320; // 320x320 optimal avatar size
            canvas.width = targetDim;
            canvas.height = targetDim;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas context not available'));

            // Square center crop calculation
            const minSide = Math.min(img.width, img.height);
            const startX = (img.width - minSide) / 2;
            const startY = (img.height - minSide) / 2;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, targetDim, targetDim);

            // Compress to JPEG at 0.85 quality
            const base64 = canvas.toDataURL('image/jpeg', 0.85);
            resolve(base64);
          } catch (err) {
            reject(err);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showStatus('Please select an image file (PNG, JPG, WebP)', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showStatus('Image file is too large. Maximum 10MB.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const compressedBase64 = await processImageFile(file);

      // Save via API
      const res = await fetch('/api/auth/profile-photo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: compressedBase64 }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile photo');
      }

      setAvatar(compressedBase64);
      onPhotoUpdated?.(compressedBase64);
      showStatus('Profile photo updated successfully!', 'success');
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      showStatus(err.message || 'Failed to upload photo', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!avatar) return;
    setIsUploading(true);
    try {
      const res = await fetch('/api/auth/profile-photo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: null }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove profile photo');
      }

      setAvatar(null);
      onPhotoUpdated?.(null);
      showStatus('Profile photo removed', 'success');
    } catch (err: any) {
      console.error('Error removing photo:', err);
      showStatus(err.message || 'Failed to remove photo', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const sizeClasses = {
    sm: 'w-14 h-14 text-base',
    md: 'w-20 h-20 text-xl',
    lg: 'w-24 h-24 sm:w-28 sm:h-28 text-2xl sm:text-3xl',
  };

  const initial = userName ? userName.charAt(0).toUpperCase() : 'U';

  return (
    <div className={cn('flex flex-col sm:flex-row items-center gap-4 sm:gap-6', className)}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Avatar Frame */}
      <div className="relative group shrink-0">
        <div
          className={cn(
            'rounded-2xl overflow-hidden aspect-square flex items-center justify-center font-black border-2 border-slate-700/80 shadow-xl transition-all duration-300',
            sizeClasses[size],
            avatar
              ? 'bg-slate-900'
              : 'bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 text-white shadow-rose-600/20'
          )}
        >
          {avatar ? (
            <img
              src={avatar}
              alt={userName}
              className="w-full h-full object-cover rounded-2xl"
              onError={() => setAvatar(null)}
            />
          ) : (
            <span>{initial}</span>
          )}

          {/* Uploading overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center text-white">
              <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
            </div>
          )}
        </div>

        {/* Quick Camera Badge Trigger */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40 border-2 border-slate-900 transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
          title="Upload / Change profile photo"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Controls & Guidelines */}
      <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
            <span>Profile Photo</span>
            {avatar && (
              <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/25">
                Active
              </span>
            )}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Accepts JPG, PNG, or WebP. Automatically optimized & cropped to square.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            <span>{avatar ? 'Change Photo' : 'Upload Photo'}</span>
          </button>

          {avatar && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-900/50 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          )}
        </div>

        {/* Feedback Message */}
        {statusMessage && (
          <div
            className={cn(
              'text-xs font-medium flex items-center justify-center sm:justify-start gap-1.5 pt-0.5 animate-in fade-in duration-200',
              statusMessage.type === 'success'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            )}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};


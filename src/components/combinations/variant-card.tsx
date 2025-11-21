'use client';

/**
 * Variant Card Component
 * Displays a variant with final image and language selector
 */

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Download, ExternalLink } from 'lucide-react';
import { useGenerateLanguage } from '@/hooks/use-combinations';

interface VariantCardProps {
  record: any; // Flexible type to handle Prisma response
  combinationId: string;
  combinationKey: string;
}

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'zh', label: '繁體中文', flag: '🇹🇼' },
];

export function VariantCard({
  record,
  combinationId,
  combinationKey,
}: VariantCardProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const generateLanguage = useGenerateLanguage();

  // Get the variant data (should be first and only for this version)
  const variant = record.variants[0];

  if (!variant || !record.imageGenerated) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Badge variant="outline">v{record.variantNumber}</Badge>
            <span className="text-sm text-muted-foreground">
              {record.promptGenerated ? '图片生成中...' : 'Prompt 生成中...'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const finalImages = variant.finalImages || {};
  const currentImagePath = finalImages[selectedLanguage];
  const hasLanguageImage = !!currentImagePath;

  const handleLanguageChange = async (langCode: string) => {
    setSelectedLanguage(langCode);

    // Generate language version if not exists
    if (!finalImages[langCode]) {
      await generateLanguage.mutateAsync({
        combinationId,
        variantId: variant.id,
        language: langCode,
      });
    }
  };

  const handleDownload = () => {
    if (!currentImagePath) return;

    const link = document.createElement('a');
    link.href = currentImagePath;
    link.download = `${combinationKey}_v${record.variantNumber}_final_${selectedLanguage}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Image Preview */}
          <div className="flex-shrink-0">
            {hasLanguageImage ? (
              <div className="relative w-full md:w-[300px] aspect-[2/1] bg-muted rounded-lg overflow-hidden">
                <Image
                  src={currentImagePath}
                  alt={`Variant ${record.variantNumber}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 300px"
                />
              </div>
            ) : generateLanguage.isPending &&
              generateLanguage.variables?.language === selectedLanguage ? (
              <div className="w-full md:w-[300px] aspect-[2/1] bg-muted rounded-lg flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="w-full md:w-[300px] aspect-[2/1] bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                <span className="text-sm">选择语言生成图片</span>
              </div>
            )}
          </div>

          {/* Info & Controls */}
          <div className="flex-1 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge>v{record.variantNumber}</Badge>
                <span className="text-sm text-muted-foreground">
                  {record.imageId}
                </span>
              </div>
            </div>

            {/* Language Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">语言版本</label>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedLanguage}
                  onValueChange={handleLanguageChange}
                  disabled={generateLanguage.isPending}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.label}</span>
                          {finalImages[lang.code] && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              已生成
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {generateLanguage.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </div>
            </div>

            {/* Generated Languages */}
            <div className="flex flex-wrap gap-1">
              {Object.keys(finalImages).map((langCode) => (
                <Badge
                  key={langCode}
                  variant={langCode === selectedLanguage ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedLanguage(langCode)}
                >
                  {langCode.toUpperCase()}
                </Badge>
              ))}
            </div>

            {/* Actions */}
            {hasLanguageImage && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="mr-2 h-4 w-4" />
                  下载
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={currentImagePath} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    查看原图
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

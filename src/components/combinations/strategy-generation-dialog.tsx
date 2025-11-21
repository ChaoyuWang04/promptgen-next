'use client';

/**
 * Strategy Generation Dialog
 * Allows users to configure and generate combinations based on strategy
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, Lock, Shuffle } from 'lucide-react';
import { useGenerateCombinations } from '@/hooks/use-combinations';
import { useQuery } from '@tanstack/react-query';

interface StrategyGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LibraryEntry {
  id: string;
  name: string;
  [key: string]: any;
}

interface Library {
  id: string;
  name: string;
  displayName: string;
  entries: LibraryEntry[];
}

interface Template {
  id: string;
  name: string;
  description: string | null;
}

// Library configuration type
interface LibraryConfig {
  isFixed: boolean;
  selectedEntryId: string | null;
}

export function StrategyGenerationDialog({
  open,
  onOpenChange,
}: StrategyGenerationDialogProps) {
  const generateCombinations = useGenerateCombinations();

  // State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [libraryConfigs, setLibraryConfigs] = useState<
    Record<string, LibraryConfig>
  >({});

  // Fetch templates
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await fetch('/api/templates');
      const data = await response.json();
      return (data.data || []) as Template[];
    },
  });

  // Fetch libraries
  const { data: libraries, isLoading: isLoadingLibraries } = useQuery({
    queryKey: ['libraries'],
    queryFn: async () => {
      const response = await fetch('/api/libraries');
      const data = await response.json();
      return (data.data || []) as Library[];
    },
  });

  // Reset configs when dialog opens
  useEffect(() => {
    if (open && libraries) {
      const initialConfigs: Record<string, LibraryConfig> = {};
      libraries.forEach((lib) => {
        initialConfigs[lib.name] = {
          isFixed: false,
          selectedEntryId: null,
        };
      });
      setLibraryConfigs(initialConfigs);
    }
  }, [open, libraries]);

  // Calculate expected combination count
  const calculateCombinationCount = () => {
    if (!libraries) return 0;

    let count = 1;
    const variableLibraries = libraries.filter(
      (lib) => !libraryConfigs[lib.name]?.isFixed
    );

    variableLibraries.forEach((lib) => {
      const entries = lib.entries || [];
      count *= entries.length;
    });

    return count;
  };

  const handleLibraryToggle = (libraryName: string, isFixed: boolean) => {
    setLibraryConfigs((prev) => ({
      ...prev,
      [libraryName]: {
        ...prev[libraryName],
        isFixed,
        selectedEntryId: isFixed ? prev[libraryName]?.selectedEntryId : null,
      },
    }));
  };

  const handleEntrySelect = (libraryName: string, entryId: string) => {
    setLibraryConfigs((prev) => ({
      ...prev,
      [libraryName]: {
        ...prev[libraryName],
        selectedEntryId: entryId,
      },
    }));
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId) return;

    // Build strategy config
    const fixed: Record<string, string> = {};
    const variable: string[] = [];

    Object.entries(libraryConfigs).forEach(([libraryName, config]) => {
      if (config.isFixed && config.selectedEntryId) {
        fixed[libraryName] = config.selectedEntryId;
      } else {
        variable.push(libraryName);
      }
    });

    await generateCombinations.mutateAsync({
      templateId: selectedTemplateId,
      strategyConfig: { fixed, variable },
    });

    onOpenChange(false);
  };

  // Validation
  const isValid = () => {
    if (!selectedTemplateId) return false;

    // Check that fixed libraries have selected entries
    for (const [libraryName, config] of Object.entries(libraryConfigs)) {
      if (config.isFixed && !config.selectedEntryId) {
        return false;
      }
    }

    // At least one library should be variable
    const hasVariable = Object.values(libraryConfigs).some(
      (config) => !config.isFixed
    );
    if (!hasVariable) return false;

    return true;
  };

  const combinationCount = calculateCombinationCount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>策略生成组合</DialogTitle>
          <DialogDescription>
            选择模板并配置各库的固定/可变状态来批量生成组合
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label>选择模板</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              disabled={isLoadingTemplates}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择一个模板" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                    {template.description && (
                      <span className="text-muted-foreground ml-2">
                        - {template.description}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Library Configuration */}
          {isLoadingLibraries ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <Label>配置库元素</Label>
              {libraries?.map((library) => {
                const config = libraryConfigs[library.name] || {
                  isFixed: false,
                  selectedEntryId: null,
                };
                const entries = library.entries || [];

                return (
                  <Card key={library.name}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {library.displayName}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {config.isFixed ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Shuffle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Switch
                            checked={config.isFixed}
                            onCheckedChange={(checked) =>
                              handleLibraryToggle(library.name, checked)
                            }
                          />
                          <span className="text-xs text-muted-foreground w-12">
                            {config.isFixed ? '固定' : '可变'}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    {config.isFixed && (
                      <CardContent className="py-3 pt-0">
                        <Select
                          value={config.selectedEntryId || ''}
                          onValueChange={(value) =>
                            handleEntrySelect(library.name, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择元素" />
                          </SelectTrigger>
                          <SelectContent>
                            {entries.map((entry) => (
                              <SelectItem key={entry.id} value={entry.id}>
                                {entry.name || entry.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    )}
                    {!config.isFixed && entries.length > 0 && (
                      <CardContent className="py-3 pt-0">
                        <p className="text-xs text-muted-foreground">
                          将枚举 {entries.length} 个元素
                        </p>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Preview */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">预计生成组合数</span>
                <Badge variant="secondary" className="text-lg">
                  {combinationCount} 个
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!isValid() || generateCombinations.isPending}
          >
            {generateCombinations.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            生成 {combinationCount} 个组合
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

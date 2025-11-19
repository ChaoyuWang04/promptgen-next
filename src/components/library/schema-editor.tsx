'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Eye, Code } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamic import of Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

// Default schema template for new libraries
const DEFAULT_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      pattern: '^[a-z]+_[a-z0-9_]+$',
      description: '唯一标识符，格式：prefix_name（例如：char_alice, pose_standing）',
    },
    name: {
      type: 'string',
      description: '显示名称',
    },
  },
  required: ['id', 'name'],
};

interface SchemaEditorProps {
  value?: Record<string, unknown>;
  onChange?: (schema: Record<string, unknown>) => void;
  readOnly?: boolean;
  height?: string;
}

export function SchemaEditor({
  value,
  onChange,
  readOnly = false,
  height = '400px',
}: SchemaEditorProps) {
  const [schemaContent, setSchemaContent] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  // Initialize schema content
  useEffect(() => {
    const initialSchema = value || DEFAULT_SCHEMA;
    setSchemaContent(JSON.stringify(initialSchema, null, 2));

    // Notify parent of initial schema if no value provided
    if (!value && onChange) {
      onChange(initialSchema);
    }
  }, [value, onChange]);

  // Validate JSON Schema format
  const validateSchema = (content: string): boolean => {
    try {
      const parsed = JSON.parse(content);

      // Basic JSON Schema validation
      if (typeof parsed !== 'object' || parsed === null) {
        setValidationError('Schema 必须是一个对象');
        setIsValid(false);
        return false;
      }

      if (parsed.type !== 'object') {
        setValidationError('根级别的 type 必须是 "object"');
        setIsValid(false);
        return false;
      }

      if (!parsed.properties || typeof parsed.properties !== 'object') {
        setValidationError('Schema 必须包含 properties 字段');
        setIsValid(false);
        return false;
      }

      // Check for required id and name fields
      if (!parsed.properties.id) {
        setValidationError('Schema 必须包含 "id" 字段定义');
        setIsValid(false);
        return false;
      }

      if (!parsed.properties.name) {
        setValidationError('Schema 必须包含 "name" 字段定义');
        setIsValid(false);
        return false;
      }

      // Check required array
      if (!parsed.required || !Array.isArray(parsed.required)) {
        setValidationError('Schema 必须包含 required 数组');
        setIsValid(false);
        return false;
      }

      if (!parsed.required.includes('id') || !parsed.required.includes('name')) {
        setValidationError('"id" 和 "name" 必须在 required 数组中');
        setIsValid(false);
        return false;
      }

      setValidationError(null);
      setIsValid(true);
      return true;
    } catch (error) {
      setValidationError(`JSON 解析错误: ${error instanceof Error ? error.message : '未知错误'}`);
      setIsValid(false);
      return false;
    }
  };

  // Handle editor change
  const handleEditorChange = (newValue: string | undefined) => {
    const content = newValue || '';
    setSchemaContent(content);

    // Validate and notify parent
    if (validateSchema(content)) {
      try {
        const parsed = JSON.parse(content);
        onChange?.(parsed);
      } catch {
        // Already handled in validateSchema
      }
    }
  };

  // Render field preview
  const renderFieldPreview = () => {
    try {
      const schema = JSON.parse(schemaContent);
      const properties = schema.properties || {};
      const required = schema.required || [];

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">字段结构预览</h4>
            <Badge variant="outline">{Object.keys(properties).length} 个字段</Badge>
          </div>

          <div className="space-y-2">
            {Object.entries(properties).map(([fieldName, fieldDef]: [string, any]) => (
              <Card key={fieldName} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-semibold">{fieldName}</code>
                      {required.includes(fieldName) && (
                        <Badge variant="destructive" className="text-xs">必填</Badge>
                      )}
                      {fieldDef.type && (
                        <Badge variant="secondary" className="text-xs">{fieldDef.type}</Badge>
                      )}
                    </div>
                    {fieldDef.description && (
                      <p className="text-xs text-muted-foreground">{fieldDef.description}</p>
                    )}
                    {fieldDef.pattern && (
                      <p className="text-xs text-muted-foreground font-mono">
                        格式: {fieldDef.pattern}
                      </p>
                    )}
                    {fieldDef.enum && (
                      <p className="text-xs text-muted-foreground">
                        可选值: {fieldDef.enum.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    } catch {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>无法预览字段结构，请检查 JSON 格式</AlertDescription>
        </Alert>
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Validation Status */}
      {!readOnly && (
        <Alert variant={isValid ? 'default' : 'destructive'}>
          {isValid ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Schema 格式正确</AlertDescription>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </>
          )}
        </Alert>
      )}

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'edit' | 'preview')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edit" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            JSON 编辑
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            字段预览
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-4">
          <Editor
            height={height}
            defaultLanguage="json"
            value={schemaContent}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              formatOnPaste: true,
              formatOnType: true,
              readOnly,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div className="border rounded-md p-4 bg-muted/50 max-h-[400px] overflow-y-auto">
            {renderFieldPreview()}
          </div>
        </TabsContent>
      </Tabs>

      {/* Helper Text */}
      {!readOnly && (
        <Alert>
          <AlertDescription className="text-xs">
            <strong>提示：</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Schema 必须包含 <code>id</code> 和 <code>name</code> 两个必填字段</li>
              <li>使用 JSON Schema 标准定义字段类型和验证规则</li>
              <li>支持的字段类型：string, number, boolean, array, object</li>
              <li>可以使用 <code>pattern</code>、<code>enum</code>、<code>minLength</code> 等进行验证</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

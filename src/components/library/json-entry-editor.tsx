'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Wand2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getSchemaForLibraryType,
  getMonacoSchemaConfig,
  getLibraryTypeDisplayName,
  getFormattedExampleJson,
  isNestedArrayStructure,
  type LibraryType,
} from '@/lib/utils/monaco-schema-provider';
import type { editor } from 'monaco-editor';

// Dynamic import of Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <Skeleton className="h-[500px] w-full" />,
});

interface JsonEntryEditorProps {
  /** 库类型，用于加载对应的JSON Schema */
  libraryType: LibraryType;
  /** 当前JSON内容（字符串格式） */
  value: string;
  /** 内容变化回调 */
  onChange: (value: string) => void;
  /** 是否只读 */
  readOnly?: boolean;
  /** 编辑器高度 */
  height?: string;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否显示格式化按钮 */
  showFormatButton?: boolean;
  /** 是否显示示例按钮 */
  showExampleButton?: boolean;
  /** 紧凑模式：隐藏验证状态和帮助文本，只显示编辑器 */
  compact?: boolean;
}

export function JsonEntryEditor({
  libraryType,
  value,
  onChange,
  readOnly = false,
  height = '500px',
  placeholder,
  showFormatButton = true,
  showExampleButton = true,
  compact = false,
}: JsonEntryEditorProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean>(true);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);

  // 获取库类型的显示名称
  const libraryDisplayName = getLibraryTypeDisplayName(libraryType);
  const isNestedArray = isNestedArrayStructure(libraryType);

  // Configure Monaco Editor when it mounts
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Set up JSON language features with schema
    const schemaConfig = getMonacoSchemaConfig(
      libraryType,
      `inmemory://${libraryType}-entry.json`
    );

    if (schemaConfig) {
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [schemaConfig],
        enableSchemaRequest: false,
        schemaValidation: 'error',
      });
    }

    // Enable format on paste/type
    editor.updateOptions({
      formatOnPaste: true,
      formatOnType: true,
    });

    // Initial validation
    validateJson(value);
  };

  // Validate JSON content
  const validateJson = (content: string): boolean => {
    if (!content.trim()) {
      setValidationError('JSON 内容不能为空');
      setIsValid(false);
      return false;
    }

    try {
      const parsed = JSON.parse(content);

      // Basic validation
      if (typeof parsed !== 'object' || parsed === null) {
        setValidationError('JSON 必须是一个对象');
        setIsValid(false);
        return false;
      }

      // For decorative_props (nested_array), validate structure
      if (isNestedArray) {
        if (!parsed.common_props || !Array.isArray(parsed.common_props)) {
          setValidationError('装饰小物库必须包含 "common_props" 数组字段');
          setIsValid(false);
          return false;
        }
      } else {
        // For standard structure, validate required fields
        if (!parsed.id) {
          setValidationError('条目必须包含 "id" 字段');
          setIsValid(false);
          return false;
        }

        // Check for display field based on library type
        const requiredDisplayFields: Record<LibraryType, string> = {
          character: 'name',
          pose: 'pose_name',
          scene: 'scene',
          theme: 'theme',
          style: 'era_style',
          decorative_props: 'name', // 不会用到，因为是nested_array
        };

        const displayField = requiredDisplayFields[libraryType];
        if (displayField && !parsed[displayField]) {
          setValidationError(`条目必须包含 "${displayField}" 字段`);
          setIsValid(false);
          return false;
        }
      }

      setValidationError(null);
      setIsValid(true);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      setValidationError(`JSON 格式错误: ${errorMsg}`);
      setIsValid(false);
      return false;
    }
  };

  // Handle editor content change
  const handleEditorChange = (newValue: string | undefined) => {
    const content = newValue || '';
    validateJson(content);
    onChange(content);
  };

  // Format JSON content
  const handleFormat = () => {
    if (!editorRef.current || !monacoRef.current) return;

    try {
      // Parse and re-stringify with proper formatting
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);

      // Update editor value
      onChange(formatted);

      // Trigger editor formatting action
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    } catch (error) {
      // If JSON is invalid, just trigger Monaco's formatter
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  // Load example JSON
  const handleLoadExample = () => {
    const example = getFormattedExampleJson(libraryType);
    if (example) {
      onChange(example);
      validateJson(example);
    }
  };

  return (
    <div className={compact ? 'h-full flex flex-col' : 'space-y-3'}>
      {/* Validation Status - 仅在非紧凑模式显示 */}
      {!compact && !readOnly && (
        <Alert variant={isValid ? 'default' : 'destructive'}>
          {isValid ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                JSON 格式正确 - {libraryDisplayName}条目验证通过
              </AlertDescription>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </>
          )}
        </Alert>
      )}

      {/* Action Buttons */}
      {!readOnly && (showFormatButton || showExampleButton) && (
        <div className="flex items-center gap-2">
          {showFormatButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFormat}
              disabled={!value || !isValid}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              格式化 JSON
            </Button>
          )}
          {showExampleButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadExample}
            >
              加载示例
            </Button>
          )}
        </div>
      )}

      {/* Monaco Editor */}
      <div className={`border rounded-md overflow-hidden ${compact ? 'flex-1 min-h-0' : ''}`}>
        <Editor
          height={height}
          defaultLanguage="json"
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
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
            wordWrap: 'on',
            wrappingIndent: 'indent',
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            bracketPairColorization: {
              enabled: true,
            },
            guides: {
              indentation: true,
              bracketPairs: true,
            },
          }}
        />
      </div>

      {/* Helper Text - 仅在非紧凑模式显示 */}
      {!compact && !readOnly && (
        <Alert>
          <AlertDescription className="text-xs">
            <strong>提示：</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>编辑器提供智能提示和自动完成功能</li>
              <li>输入时会自动验证字段类型和必填项</li>
              {isNestedArray && (
                <li>装饰小物库使用特殊的嵌套数组结构（common_props）</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

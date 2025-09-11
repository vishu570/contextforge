'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const MonacoEditorComponent = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[#0F1117] flex items-center justify-center">
      <div className="text-gray-400">Loading editor...</div>
    </div>
  ),
});

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  readOnly?: boolean;
}

export function MonacoEditor({ 
  value, 
  onChange, 
  language = 'text',
  theme = 'vs-dark-contextforge',
  readOnly = false 
}: MonacoEditorProps) {
  const editorRef = useRef<any>(null);

  // Define custom ContextForge theme
  const defineTheme = (monaco: any) => {
    monaco.editor.defineTheme('vs-dark-contextforge', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'E6EDF3', background: '0F1117' },
        { token: 'comment', foreground: '7D8590', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'FF7B72', fontStyle: 'bold' },
        { token: 'string', foreground: 'A5D6FF' },
        { token: 'number', foreground: '79C0FF' },
        { token: 'regexp', foreground: '7EE787' },
        { token: 'operator', foreground: 'FF7B72' },
        { token: 'namespace', foreground: 'FFA657' },
        { token: 'type', foreground: 'FFA657' },
        { token: 'struct', foreground: 'FFA657' },
        { token: 'class', foreground: 'FFA657' },
        { token: 'interface', foreground: 'FFA657' },
        { token: 'parameter', foreground: 'E6EDF3' },
        { token: 'variable', foreground: 'E6EDF3' },
        { token: 'function', foreground: 'D2A8FF' },
        { token: 'method', foreground: 'D2A8FF' },
        { token: 'decorator', foreground: 'FFA657' },
        { token: 'tag', foreground: '7EE787' },
        { token: 'attribute.name', foreground: '79C0FF' },
        { token: 'attribute.value', foreground: 'A5D6FF' },
        { token: 'delimiter', foreground: 'E6EDF3' },
        { token: 'delimiter.bracket', foreground: 'E6EDF3' },
        { token: 'delimiter.parenthesis', foreground: 'E6EDF3' },
        { token: 'delimiter.square', foreground: 'E6EDF3' },
        { token: 'delimiter.angle', foreground: 'E6EDF3' },
      ],
      colors: {
        'editor.background': '#0F1117',
        'editor.foreground': '#E6EDF3',
        'editorLineNumber.foreground': '#7D8590',
        'editorLineNumber.activeForeground': '#E6EDF3',
        'editor.selectionBackground': '#1F6FEB40',
        'editor.selectionHighlightBackground': '#1F6FEB20',
        'editor.wordHighlightBackground': '#1F6FEB20',
        'editor.wordHighlightStrongBackground': '#1F6FEB40',
        'editor.findMatchBackground': '#FFA65740',
        'editor.findMatchHighlightBackground': '#FFA65720',
        'editor.hoverHighlightBackground': '#1F6FEB20',
        'editor.lineHighlightBackground': '#161B22',
        'editorCursor.foreground': '#79C0FF',
        'editorWhitespace.foreground': '#484F58',
        'editorIndentGuide.background': '#21262D',
        'editorIndentGuide.activeBackground': '#30363D',
        'editor.inactiveSelectionBackground': '#1F6FEB20',
        'editorGutter.background': '#0F1117',
        'editorMarkerNavigation.background': '#21262D',
        'editorMarkerNavigationError.background': '#F85149',
        'editorMarkerNavigationWarning.background': '#FFA657',
        'editorMarkerNavigationInfo.background': '#79C0FF',
        'scrollbar.shadow': '#00000050',
        'scrollbarSlider.background': '#21262D80',
        'scrollbarSlider.hoverBackground': '#30363D80',
        'scrollbarSlider.activeBackground': '#6E768680',
      }
    });
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    defineTheme(monaco);
    monaco.editor.setTheme('vs-dark-contextforge');

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
      fontLigatures: true,
      lineHeight: 1.6,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'line',
      selectOnLineNumbers: true,
      automaticLayout: true,
      wordWrap: 'on',
      bracketPairColorization: { enabled: true },
      guides: {
        indentation: true,
        bracketPairs: true,
      },
      suggest: {
        showKeywords: true,
        showSnippets: true,
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false
      },
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: true,
    });

    // Add custom commands
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Save command - handled by parent component
    });

    // Focus the editor
    editor.focus();
  };

  return (
    <div className="h-full w-full bg-[#0F1117]">
      <MonacoEditorComponent
        value={value}
        language={language}
        theme={theme}
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          fontSize: 14,
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          lineNumbers: 'on',
          folding: true,
          matchBrackets: 'always',
          renderLineHighlight: 'line',
          selectOnLineNumbers: true,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorStyle: 'line',
          renderWhitespace: 'selection',
          showUnused: true,
          tabSize: 2,
          insertSpaces: true,
        }}
      />
    </div>
  );
}
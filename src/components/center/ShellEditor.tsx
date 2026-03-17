import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { oneDark } from "@codemirror/theme-one-dark";

interface ShellEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ShellEditor({ value, onChange, placeholder }: ShellEditorProps) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      height="120px"
      theme={oneDark}
      extensions={[StreamLanguage.define(shell)]}
      placeholder={placeholder ?? "echo 'Hello, World!'"}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
        bracketMatching: true,
      }}
    />
  );
}

'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import { Bold } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-input p-1 mb-2">
      <Button
        type="button"
        variant={editor.isActive('bold') ? 'secondary' : 'outline'}
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="太字"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <Button
        type="button"
        variant={editor.isActive('textStyle', { color: '#E03131' }) ? 'secondary' : 'outline'}
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().setColor('#E03131').run()}
        title="赤色"
      >
        <div className="h-4 w-4 rounded-full bg-[#E03131]" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive('textStyle', { color: '#2F9E44' }) ? 'secondary' : 'outline'}
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().setColor('#2F9E44').run()}
        title="緑色"
      >
        <div className="h-4 w-4 rounded-full bg-[#2F9E44]" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive('textStyle', { color: '#1971C2' }) ? 'secondary' : 'outline'}
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().setColor('#1971C2').run()}
        title="青色"
      >
        <div className="h-4 w-4 rounded-full bg-[#1971C2]" />
      </Button>
      <Button
        type="button"
        variant={'outline'}
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().unsetColor().run()}
        title="色をリセット"
      >
        <div className="h-4 w-4 rounded-full bg-foreground" />
      </Button>
    </div>
  );
};

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable extensions we don't need for a simple editor
        codeBlock: false,
        blockquote: false,
        heading: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        code: false,
      }),
      TextStyle,
      Color,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert prose-sm min-h-[150px] max-w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      },
    },
  });

  return (
    <div>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

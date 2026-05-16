'use client';

import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Undo, Redo } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Label } from '@/components/ui/label';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    autoSave?: boolean;
}

export function RichTextEditor({ value, onChange, label, autoSave = false }: RichTextEditorProps) {
    const [saveStatus, setSaveStatus] = React.useState<'Saved' | 'Saving...' | 'Unsaved changes'>('Saved');

    const editor = useEditor({
        extensions: [
            StarterKit,
        ],
        content: value,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
            if (autoSave) {
                setSaveStatus('Unsaved changes');
                handleAutoSave();
            }
        },
        editorProps: {
            attributes: {
                class: 'min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            },
        },
    });

    const handleAutoSave = React.useCallback(
        () => {
            setTimeout(() => {
                setSaveStatus('Saving...');
                setTimeout(() => {
                    setSaveStatus('Saved');
                }, 500);
            }, 1000);
        },
        []
    );

    React.useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                {label && <Label>{label}</Label>}
                {autoSave && (
                    <span className={`text-xs ${saveStatus === 'Saved' ? 'text-green-600' : 'text-orange-500'}`}>
                        {saveStatus}
                    </span>
                )}
            </div>

            <div className="border border-border rounded-md overflow-hidden bg-white dark:bg-zinc-950">
                <div className="flex flex-wrap items-center gap-1 border-b border-border p-1 bg-muted/50">
                    <Toggle
                        size="sm"
                        pressed={editor.isActive('bold')}
                        onPressedChange={() => editor.chain().focus().toggleBold().run()}
                        aria-label="Toggle bold"
                    >
                        <Bold className="h-4 w-4" />
                    </Toggle>

                    <Toggle
                        size="sm"
                        pressed={editor.isActive('italic')}
                        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                        aria-label="Toggle italic"
                    >
                        <Italic className="h-4 w-4" />
                    </Toggle>

                    <div className="w-px h-4 bg-border mx-1" />

                    <Toggle
                        size="sm"
                        pressed={editor.isActive('bulletList')}
                        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                        aria-label="Toggle bullet list"
                    >
                        <List className="h-4 w-4" />
                    </Toggle>

                    <Toggle
                        size="sm"
                        pressed={editor.isActive('orderedList')}
                        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                        aria-label="Toggle ordered list"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </Toggle>

                    <div className="w-px h-4 bg-border mx-1" />

                    <Toggle
                        size="sm"
                        pressed={false}
                        onPressedChange={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                    >
                        <Undo className="h-4 w-4" />
                    </Toggle>

                    <Toggle
                        size="sm"
                        pressed={false}
                        onPressedChange={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                    >
                        <Redo className="h-4 w-4" />
                    </Toggle>
                </div>

                <div className="p-0">
                    <EditorContent editor={editor} />
                </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
                {editor.storage.characterCount?.characters() || 0} characters
            </div>
        </div>
    );
}

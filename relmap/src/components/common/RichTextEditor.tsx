import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { useUIStore } from '../../hooks/stores';
interface RichTextEditorProps {
 modelValue: string;
 onChange: (value: string) => void;
 placeholder?: string;
 disabled?: boolean;
}
export default function RichTextEditor({ modelValue, onChange, disabled }: RichTextEditorProps) {
 const { darkMode } = useUIStore();
 const editor = useEditor({
 extensions: [
 StarterKit.configure({
 heading: {
 levels: [1, 2, 3],
 },
 }),
 Link.configure({
 openOnClick: true,
 HTMLAttributes: {
 rel: 'noopener noreferrer',
 target: '_blank',
 },
 validate: (href) => /^https?:\/\//i.test(href) || /^mailto:/i.test(href),
 }),
 Image,
 Underline,
 ],
 content: modelValue || '<p></p>',
 onUpdate: ({ editor }) => {
 onChange(editor.getHTML());
 },
 editable: !disabled,
 });
 if (!editor) {
 return null;
 }
 return (<div className={`rich-text-editor-wrapper rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'} overflow-hidden`}>
 <div className={`flex flex-wrap items-center gap-1 p-2 border-b ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
 <button onClick={() => editor.chain().focus().toggleBold().run()} disabled={disabled} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bold') ? `${darkMode ? 'bg-gray-700 text-primary-400' : 'bg-primary-100 text-primary-600'}` : `${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600'}`}`} title="粗体 (Ctrl+B)">
 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
 <path d="M6 12h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
 </svg>
 </button>

 <button onClick={() => editor.chain().focus().toggleItalic().run()} disabled={disabled} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('italic') ? `${darkMode ? 'bg-gray-700 text-primary-400' : 'bg-primary-100 text-primary-600'}` : `${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600'}`}`} title="斜体 (Ctrl+I)">
 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M14 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2"/>
 <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/>
 <path d="M12 15l4-6"/>
 </svg>
 </button>

 <button onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={disabled} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('underline') ? `${darkMode ? 'bg-gray-700 text-primary-400' : 'bg-primary-100 text-primary-600'}` : `${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600'}`}`} title="下划线 (Ctrl+U)">
 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M6 4h12"/>
 <path d="M6 20h12"/>
 <path d="M8 11h8"/>
 <path d="M8 15h8"/>
 </svg>
 </button>

 <button onClick={() => editor.chain().focus().toggleStrike().run()} disabled={disabled} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('strike') ? `${darkMode ? 'bg-gray-700 text-primary-400' : 'bg-primary-100 text-primary-600'}` : `${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600'}`}`} title="删除线">
 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M10 18h4"/>
 <path d="M6 18h12"/>
 <path d="M8 6h8"/>
 <path d="M9 12h6"/>
 </svg>
 </button>

 <div className={`w-px h-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} mx-1`}/>

 <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} disabled={disabled} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('heading', { level: 1 }) ? `${darkMode ? 'bg-gray-700 text-primary-400' : 'bg-primary-100 text-primary-600'}` : `${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600'}`}`} title="标题1">
 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M4 12h16"/>
 <path d="M4 18h16"/>
 <path d="M4 6h16"/>
 </svg>
 </button>

 <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} disabled={disabled} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('heading', { level: 2 }) ? `${darkMode ? 'bg-gray-700 text-primary-400' : 'bg-primary-100 text-primary-600'}` : `${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600'}`}`} title="标题2">
 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M4 14h16"/>
 <path d="M4 18h16"/>
 <path d="M4 6h8"/>
 <path d="M4 10h8"/>
 </svg>
 </button>

 <div className={`w-px h-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} mx-1`}/>

 <button onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={disabled} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bulletList') ? `${darkMode ? 'bg-gray-700 text-primary-400' : 'bg-primary-100 text-primary-600'}` : `${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600'}`}`} title="无序列表">
 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M6 4h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2H6"/>
 <path d="M6 10h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2H6"/>
 <path d="M6 16h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2H6"/>
 <path d="M14 4h6"/>
 <path d="M14 10h6"/>
 <path d="M14 16h6"/>
 </svg>
 </button>

 <button onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={disabled} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('orderedList') ? `${darkMode ? 'bg-gray-700 text-primary-400' : 'bg-primary-100 text-primary-600'}` : `${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600'}`}`} title="有序列表">
 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M4 8h16"/>
 <path d="M4 14h16"/>
 <path d="M4 6V4"/>
 <path d="M9 6V4"/>
 <path d="M14 6V4"/>
 </svg>
 </button>

 <div className={`w-px h-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} mx-1`}/>

 <button onClick={() => {
 const href = prompt('请输入链接地址');
 if (href && /^https?:\/\//i.test(href)) {
 editor.chain().focus().toggleLink({ href }).run();
 } else if (href) {
 alert('仅支持 http/https 链接');
 }
 }} disabled={disabled} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('link') ? `${darkMode ? 'bg-gray-700 text-primary-400' : 'bg-primary-100 text-primary-600'}` : `${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600'}`}`} title="链接">
 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M10 13a5 5 0 0 1 7.54.54l3-3a5 5 0 0 1-7.07-7.07l-1.72 1.71"/>
 <path d="M14 11a5 5 0 0 1-7.54-.54l-3 3a5 5 0 0 1 7.07 7.07l1.71-1.71"/>
 </svg>
 </button>

 <button onClick={() => {
 const url = prompt('请输入图片 URL');
 if (url && /^https?:\/\//i.test(url)) {
 editor.chain().focus().setImage({ src: url }).run();
 } else if (url) {
 alert('仅支持 http/https 图片链接');
 }
 }} disabled={disabled} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600'}`} title="图片">
 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
 <circle cx="9" cy="9" r="2"/>
 <path d="M21 15l-5-5L5 21"/>
 </svg>
 </button>

 <div className={`w-px h-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} mx-1`}/>

 <button onClick={() => editor.chain().focus().undo().run()} disabled={disabled || !editor.can().undo()} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600'} ${!editor.can().undo() ? 'opacity-50 cursor-not-allowed' : ''}`} title="撤销 (Ctrl+Z)">
 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M3 7v6h6"/>
 <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
 </svg>
 </button>

 <button onClick={() => editor.chain().focus().redo().run()} disabled={disabled || !editor.can().redo()} className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600'} ${!editor.can().redo() ? 'opacity-50 cursor-not-allowed' : ''}`} title="重做 (Ctrl+Y)">
 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M21 7v6h-6"/>
 <path d="M3 17a9 9 0 0 0 9 9 9 9 0 0 0 6-2.3L21 13"/>
 </svg>
 </button>
 </div>

 <EditorContent editor={editor} className={`min-h-[200px] max-h-[400px] p-4 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-primary-500 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`} />
 </div>);
}
import { Bold, Italic, Underline, Smile, Heading2, List } from 'lucide-react'
import { useEffect, useRef } from 'react'

const EMOJIS = ['❤️', '🎉', '🎂', '🥳', '😍', '🌸', '✨', '🌹', '💖', '🤗', '🍰', '🎈', '😇', '💐', '🥳', '💫']

/**
 * Lightweight rich-text editor built on contentEditable + execCommand.
 * Keeps formatting to bold/italic/underline/headings/lists/emoji — all of
 * which survive the server-side HTML sanitizer.
 */
export default function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const skipNext = useRef(false)

  // Sync external value changes (e.g. loading an existing page) into the DOM.
  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false
      return
    }
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value
    }
  }, [value])

  function exec(command: string) {
    ref.current?.focus()
    document.execCommand(command)
    push()
  }

  function push() {
    if (!ref.current) return
    skipNext.current = true
    onChange(ref.current.innerHTML)
  }

  function insertEmoji(emoji: string) {
    ref.current?.focus()
    document.execCommand('insertText', false, emoji)
    push()
  }

  const btn = 'flex h-8 w-8 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-200 hover:text-gray-900'

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 px-2 py-1.5">
        <button type="button" className={btn} title="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')}>
          <Bold size={15} />
        </button>
        <button type="button" className={btn} title="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')}>
          <Italic size={15} />
        </button>
        <button type="button" className={btn} title="Underline" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('underline')}>
          <Underline size={15} />
        </button>
        <button type="button" className={btn} title="Heading" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('formatBlock')}>
          <Heading2 size={15} />
        </button>
        <button type="button" className={btn} title="Bullet list" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')}>
          <List size={15} />
        </button>

        <span className="mx-1 h-5 w-px bg-gray-200" />

        {EMOJIS.slice(0, 8).map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-gray-100"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertEmoji(emoji)}
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          className={btn}
          title="More emoji"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insertEmoji(EMOJIS[Math.floor(Math.random() * EMOJIS.length)])}
        >
          <Smile size={15} />
        </button>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={push}
        onBlur={push}
        data-placeholder="Write your personal letter… Dear you, on this special day…"
        className="letter-editor min-h-[180px] px-4 py-3 text-[15px] leading-relaxed text-gray-800 outline-none"
      />
    </div>
  )
}

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, drawSelection, keymap, placeholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import {
  HighlightStyle,
  codeFolding,
  foldEffect,
  foldGutter,
  foldKeymap,
  foldService,
  foldedRanges,
  syntaxHighlighting,
  unfoldAll as unfoldAllCommand,
  unfoldEffect,
} from '@codemirror/language'
import { tags } from '@lezer/highlight'
import {
  getFoldBlocks,
  loadFoldedSignatures,
  saveFoldedSignatures,
  topLevelBlocks,
} from '../lib/markdownOutline'

const blocksCache = new WeakMap()

function blocksForState(state) {
  let blocks = blocksCache.get(state)
  if (!blocks) {
    blocks = getFoldBlocks(state.doc.toString())
    blocksCache.set(state, blocks)
  }
  return blocks
}

function collectFoldedSignatures(state) {
  const ranges = foldedRanges(state)
  if (!ranges || typeof ranges.between !== 'function') return []
  const byRange = new Map(
    blocksForState(state).map((block) => [`${block.from}:${block.to}`, block.signature])
  )
  const signatures = []
  ranges.between(0, state.doc.length, (from, to) => {
    const signature = byRange.get(`${from}:${to}`)
    if (signature) signatures.push(signature)
  })
  return [...new Set(signatures)]
}

function existingFoldKeys(state) {
  const keys = new Set()
  const ranges = foldedRanges(state)
  if (ranges && typeof ranges.between === 'function') {
    ranges.between(0, state.doc.length, (from, to) => keys.add(`${from}:${to}`))
  }
  return keys
}

const markdownHighlight = HighlightStyle.define([
  {
    tag: [
      tags.heading,
      tags.heading1,
      tags.heading2,
      tags.heading3,
      tags.heading4,
      tags.heading5,
      tags.heading6,
    ],
    color: 'var(--text)',
    fontWeight: '600',
  },
  { tag: tags.strong, color: 'var(--text)', fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.link, color: 'var(--accent)', textDecoration: 'underline' },
  { tag: tags.url, color: 'var(--accent)' },
  { tag: tags.monospace, color: 'var(--text)', fontFamily: 'var(--font-mono)' },
  { tag: tags.meta, color: 'var(--faint)' },
  { tag: tags.processingInstruction, color: 'var(--faint)' },
  { tag: tags.list, color: 'var(--muted)' },
  { tag: tags.quote, color: 'var(--muted)', fontStyle: 'italic' },
  { tag: tags.contentSeparator, color: 'var(--border-strong)' },
])

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'transparent',
    color: 'var(--text-soft)',
    fontSize: '13px',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'var(--font-sans)',
    lineHeight: '1.85',
    overflow: 'auto',
    padding: '17px 18px 22px 15px',
  },
  '.cm-content': { padding: '0', caretColor: 'var(--text)' },
  '.cm-line': { padding: '0' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--muted)',
  },
  '.cm-foldGutter': { width: '18px' },
  '.cm-foldGutter .cm-gutterElement': {
    padding: '0 2px',
    fontSize: '12px',
    opacity: '0.65',
    transition: 'opacity 0.15s ease, color 0.15s ease',
  },
  '.cm-foldGutter .cm-gutterElement:hover': {
    opacity: '1',
    color: 'var(--accent)',
  },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--accent-soft)',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)' },
  '.cm-placeholder': { color: 'var(--faint)' },
  '.cm-panels': { backgroundColor: 'var(--panel)', color: 'var(--text)' },
})

const foldConfig = {
  preparePlaceholder(state, range) {
    const fromLine = state.doc.lineAt(range.from).number
    const toLine = state.doc.lineAt(range.to).number
    return Math.max(1, toLine - fromLine)
  },
  placeholderDOM(view, onclick, lines) {
    const element = document.createElement('span')
    element.className = 'cm-foldPlaceholder cm-foldPlaceholder-custom'
    element.textContent = `已折叠 ${lines || 1} 行`
    element.title = '点击展开'
    element.setAttribute('aria-label', '已折叠内容，点击展开')
    element.addEventListener('click', onclick)
    return element
  },
}

const markdownFoldService = foldService.of((state, lineStart) => {
  const lineNumber = state.doc.lineAt(lineStart).number - 1
  const block = blocksForState(state).find((item) => item.startLine === lineNumber)
  if (!block) return null
  return { from: block.from, to: block.to }
})

function restoreFolds(view, storageKey) {
  const saved = loadFoldedSignatures(storageKey)
  if (saved.length === 0) return
  const bySignature = new Map(blocksForState(view.state).map((block) => [block.signature, block]))
  const selected = topLevelBlocks(
    saved.map((signature) => bySignature.get(signature)).filter(Boolean)
  )
  if (selected.length === 0) return
  view.dispatch({
    effects: selected.map((block) => foldEffect.of({ from: block.from, to: block.to })),
  })
}

const MarkdownCodeEditor = forwardRef(function MarkdownCodeEditor(
  { value, onChange, storageKey, ariaLabel = '待办详情' },
  ref
) {
  const hostRef = useRef(null)
  const viewRef = useRef(null)
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const storageKeyRef = useRef(storageKey)

  valueRef.current = value

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    storageKeyRef.current = storageKey
  }, [storageKey])

  const extensions = useMemo(
    () => [
      history(),
      drawSelection(),
      EditorState.tabSize.of(2),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': ariaLabel, spellcheck: 'false' }),
      markdown(),
      syntaxHighlighting(markdownHighlight),
      placeholder('写下这件事的背景、下一步、链接，或者任何想记下的细节…'),
      keymap.of([...foldKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
      markdownFoldService,
      foldGutter({
        openText: '▾',
        closedText: '▸',
      }),
      codeFolding(foldConfig),
      editorTheme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current?.(update.state.doc.toString())
        }
        const foldChanged = update.transactions.some((transaction) =>
          transaction.effects.some(
            (effect) => effect.is(foldEffect) || effect.is(unfoldEffect)
          )
        )
        if (foldChanged && storageKeyRef.current) {
          saveFoldedSignatures(storageKeyRef.current, collectFoldedSignatures(update.state))
        }
      }),
    ],
    [ariaLabel]
  )

  useEffect(() => {
    if (!hostRef.current) return undefined
    const view = new EditorView({
      state: EditorState.create({ doc: valueRef.current, extensions }),
      parent: hostRef.current,
    })
    viewRef.current = view
    restoreFolds(view, storageKeyRef.current)

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [extensions])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === value) return
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    })
  }, [value])

  const applyFolds = (blocks) => {
    const view = viewRef.current
    if (!view || blocks.length === 0) return
    const existing = existingFoldKeys(view.state)
    const effects = blocks
      .filter((block) => !existing.has(`${block.from}:${block.to}`))
      .map((block) => foldEffect.of({ from: block.from, to: block.to }))
    if (effects.length > 0) view.dispatch({ effects })
  }

  useImperativeHandle(
    ref,
    () => ({
      foldAll() {
        const view = viewRef.current
        if (!view) return
        applyFolds(topLevelBlocks(blocksForState(view.state)))
      },
      unfoldAll() {
        const view = viewRef.current
        if (view) unfoldAllCommand(view)
      },
      foldToLevel(level) {
        const view = viewRef.current
        if (!view) return
        const headings = blocksForState(view.state).filter(
          (block) => block.kind === 'heading' && block.level >= level
        )
        applyFolds(topLevelBlocks(headings))
      },
      focus() {
        viewRef.current?.focus()
      },
    }),
    []
  )

  return <div className="detail-editor" ref={hostRef} />
})

export default MarkdownCodeEditor

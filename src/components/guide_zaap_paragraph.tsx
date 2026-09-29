import {
  attributesToProps,
  type DOMNode,
  domToReact,
  Element,
  type HTMLReactParserOptions,
  Text,
} from 'html-react-parser'

import { GuideCopyButton } from '@/components/guide_copy_button.tsx'
import type { Conf } from '@/ipc/bindings.ts'
import { getZaapCopyText, type InlineZaap, type Zaap } from '@/lib/guide_travel_action.ts'

function getNodeTextLength(node: DOMNode): number {
  if (node.type === 'text') return node.data.length

  if (node.type === 'tag') {
    return node.children.reduce((sum, child) => sum + getNodeTextLength(child as DOMNode), 0)
  }

  return 0
}

function sliceNodesByTextRange(nodes: DOMNode[], start: number, end: number): DOMNode[] {
  let offset = 0

  function sliceNodeToTextRange(node: DOMNode): DOMNode[] {
    const length = getNodeTextLength(node)

    if (offset >= start && offset + length <= end && (length > 0 || offset < end)) {
      offset += length

      return [node]
    }

    if (node.type === 'text') {
      const from = Math.max(0, start - offset)
      const to = Math.min(node.data.length, end - offset)
      offset += node.data.length

      return to > from ? [new Text(node.data.slice(from, to))] : []
    }

    if (node.type !== 'tag') return []

    const children = node.children.flatMap((child) => sliceNodeToTextRange(child as DOMNode))

    return children.length ? [new Element(node.name, { ...node.attribs }, children)] : []
  }

  return nodes.flatMap(sliceNodeToTextRange)
}

export function renderGuideZaapParagraph({
  node,
  zaap,
  mention,
  mode,
  disabled,
  warning,
  options,
}: {
  node: Element
  zaap: Zaap
  mention?: InlineZaap
  mode: Conf['zaapCopyMode']
  disabled: boolean
  warning?: string
  options: HTMLReactParserOptions
}) {
  const children = node.children as DOMNode[]
  const content = getZaapCopyText(zaap, mode)

  if (!mention) {
    return (
      <p className="contents">
        <GuideCopyButton content={content} disabled={disabled} warning={warning}>
          {domToReact(children)}
        </GuideCopyButton>
      </p>
    )
  }

  return (
    <p {...attributesToProps(node.attribs)}>
      {domToReact(sliceNodesByTextRange(children, 0, mention.start), options)}

      <GuideCopyButton content={content} disabled={disabled} warning={warning}>
        {domToReact(sliceNodesByTextRange(children, mention.start, mention.end))}
      </GuideCopyButton>

      {domToReact(sliceNodesByTextRange(children, mention.end, Infinity), options)}
    </p>
  )
}

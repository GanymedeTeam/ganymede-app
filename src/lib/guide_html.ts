import type { DOMNode } from 'html-react-parser'

const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'input',
  'label',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strike',
  'strong',
  'sub',
  'sup',
  'u',
  'ul',
])

export type GuideNodeAction = 'keep' | 'unwrap' | 'drop'

/**
 * Guide HTML comes from users: only the tags produced by the guide editor are rendered as elements.
 * Other tags are replaced by their children, executable ones are dropped.
 */
export function getGuideNodeAction(node: DOMNode): GuideNodeAction {
  if (node.type === 'script' || node.type === 'style') {
    return 'drop'
  }

  if (node.type !== 'tag') {
    return 'keep'
  }

  if (node.name === 'input') {
    return node.attribs.type === 'checkbox' ? 'keep' : 'drop'
  }

  return ALLOWED_TAGS.has(node.name) ? 'keep' : 'unwrap'
}

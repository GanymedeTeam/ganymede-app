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

const ALLOWED_CLASS = /^(guide-step|quest-block|(tag|img|quest|guide)-[a-z0-9-]+)$/
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.%]+\s*(,\s*[\d.%]+\s*){2,3}\)|[a-z]{3,20})$/i
const ALIGNMENT = /^(left|right|center|justify|start|end)$/i

function isAllowedDeclaration(declaration: string): boolean {
  const separator = declaration.indexOf(':')

  if (separator === -1) {
    return false
  }

  const property = declaration.slice(0, separator).trim().toLowerCase()
  const value = declaration.slice(separator + 1).trim()

  switch (property) {
    case 'color':
    case 'background-color':
      return COLOR.test(value)
    case 'text-align':
      return ALIGNMENT.test(value)
    default:
      return false
  }
}

export function sanitizeGuideStyle(style: string): string | undefined {
  const kept = style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter((declaration) => declaration !== '' && isAllowedDeclaration(declaration))

  return kept.length > 0 ? kept.join('; ') : undefined
}

export function sanitizeGuideClass(className: string): string | undefined {
  const kept = className.split(/\s+/).filter((name) => ALLOWED_CLASS.test(name))

  return kept.length > 0 ? kept.join(' ') : undefined
}

/**
 * Keeps only the styles and classes set by the guide editor, so a guide cannot reuse layout
 * utilities or inline positioning (e.g. a fixed overlay covering the window).
 */
export function sanitizeGuideAttributes(attribs: Record<string, string>): Record<string, string> {
  const { style, class: className, ...rest } = attribs
  const safeStyle = style === undefined ? undefined : sanitizeGuideStyle(style)
  const safeClass = className === undefined ? undefined : sanitizeGuideClass(className)

  return {
    ...rest,
    ...(safeStyle !== undefined && { style: safeStyle }),
    ...(safeClass !== undefined && { class: safeClass }),
  }
}

import { htmlToDOM } from 'html-react-parser'
import { describe, expect, test } from 'vitest'

import { getGuideNodeAction, sanitizeGuideAttributes, sanitizeGuideClass, sanitizeGuideStyle } from './guide_html.ts'

function firstNode(html: string) {
  const [node] = htmlToDOM(html)

  if (!node) {
    throw new Error('no node parsed')
  }

  return getGuideNodeAction(node)
}

describe('getGuideNodeAction', () => {
  test.each([
    '<p>texte</p>',
    '<span data-type="custom-tag" type="quest">Quête</span>',
    '<div data-type="quest-block"><p>x</p></div>',
    '<img src="https://ganymede-dofus.com/a.webp" class="img-medium">',
    '<a href="https://www.dofus.com">lien</a>',
    '<input type="checkbox" checked="checked">',
    'texte simple',
  ])('keeps editor content %s', (html) => {
    expect(firstNode(html)).toBe('keep')
  })

  test.each(['<script>alert(1)</script>', '<style>body{display:none}</style>', '<input type="text" autofocus>'])(
    'drops executable or interactive content %s',
    (html) => {
      expect(firstNode(html)).toBe('drop')
    },
  )

  test.each([
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '<object data="data:text/html,x"></object>',
    '<embed src="data:text/html,x">',
    '<form action="https://evil.test"><button>ok</button></form>',
    '<svg onload="alert(1)"></svg>',
    '<base href="https://evil.test/">',
    '<meta http-equiv="refresh" content="0;url=https://evil.test">',
    '<table><tr><td>cellule</td></tr></table>',
  ])('unwraps unknown tags %s', (html) => {
    expect(firstNode(html)).toBe('unwrap')
  })
})

describe('sanitizeGuideStyle', () => {
  test.each([
    'color: #ff0000',
    'background-color: rgb(255, 0, 0)',
    'text-align: center',
    'color: red; text-align: right',
  ])('keeps editor style %s', (style) => {
    expect(sanitizeGuideStyle(style)).toBe(style)
  })

  test('drops positioning and keeps editor declarations', () => {
    expect(sanitizeGuideStyle('position: fixed; inset: 0; color: #abc; z-index: 9999')).toBe('color: #abc')
  })

  test.each([
    'position: fixed',
    'color: expression(alert(1))',
    'background-color: url(https://evil.test)',
    'width: 100vw',
  ])('drops %s', (style) => {
    expect(sanitizeGuideStyle(style)).toBeUndefined()
  })
})

describe('sanitizeGuideClass', () => {
  test.each(['tag-quest', 'img-medium', 'guide-step', 'quest-block'])('keeps editor class %s', (className) => {
    expect(sanitizeGuideClass(className)).toBe(className)
  })

  test('drops layout utilities', () => {
    expect(sanitizeGuideClass('img-large fixed inset-0 z-50')).toBe('img-large')
    expect(sanitizeGuideClass('fixed inset-0')).toBeUndefined()
  })
})

describe('sanitizeGuideAttributes', () => {
  test('filters style and class and keeps other attributes', () => {
    expect(
      sanitizeGuideAttributes({
        'data-type': 'custom-tag',
        class: 'tag-item absolute',
        style: 'position: absolute; color: #fff',
        name: 'Objet',
      }),
    ).toEqual({ 'data-type': 'custom-tag', class: 'tag-item', style: 'color: #fff', name: 'Objet' })
  })

  test('removes attributes left empty', () => {
    expect(sanitizeGuideAttributes({ class: 'fixed', style: 'position: fixed' })).toEqual({})
  })
})

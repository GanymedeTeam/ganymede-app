import { htmlToDOM } from 'html-react-parser'
import { describe, expect, test } from 'vitest'

import { getGuideNodeAction } from './guide_html.ts'

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

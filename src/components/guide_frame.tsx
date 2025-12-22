import { EditorHtmlParsing } from '@/components/editor_html_parsing.tsx'

export function GuideFrame({
  className,
  html,
  guideId,
  stepIndex,
}: {
  className?: string
  html: string
  guideId: number
  stepIndex: number
}) {
  return <EditorHtmlParsing className={className} guideId={guideId} html={html} stepIndex={stepIndex} />
}

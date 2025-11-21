import { EntityWorkspace } from './EntityWorkspace'
import { QuestionAnswersPanel } from './QuestionAnswersPanel'

export function QuestionsModule() {
  return (
    <div className="space-y-6">
      <EntityWorkspace moduleKey="questions" />
      <QuestionAnswersPanel />
    </div>
  )
}

import { EntityWorkspace } from './EntityWorkspace'
import { QuizRelationsPanel } from './QuizRelationsPanel'

export function QuizzesModule() {
  return (
    <div className="space-y-6">
      <EntityWorkspace moduleKey="quizzes" />
      <QuizRelationsPanel />
    </div>
  )
}

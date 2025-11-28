import { useNavigate } from 'react-router-dom'
import { EntityWorkspace } from './EntityWorkspace'
import { QuestionAnswersPanel } from './QuestionAnswersPanel'
import { Button } from '@/components/ui/button'

export function QuestionsModule() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => navigate('/questions/create')}>Formulaire complet</Button>
      </div>
      <EntityWorkspace moduleKey="questions" />
      <QuestionAnswersPanel />
    </div>
  )
}

import { EntityWorkspace } from './EntityWorkspace'
import { LevelRelationsPanel } from './LevelRelationsPanel'

export function LevelsModule() {
  return (
    <div className="space-y-6">
      <EntityWorkspace moduleKey="levels" />
      <LevelRelationsPanel />
    </div>
  )
}

import { loadEnvironments, saveEnvironments } from '@/services/storage/environments'
import type { DeployEnvironmentRecord, EnvironmentFormValue } from '@/types/task'

const ENVIRONMENT_ORDER = ['test', 'prod']

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `env_${Date.now()}`
}

function sortEnvironments(environments: DeployEnvironmentRecord[]) {
  return [...environments].sort((left, right) => {
    const leftIndex = ENVIRONMENT_ORDER.indexOf(left.name)
    const rightIndex = ENVIRONMENT_ORDER.indexOf(right.name)

    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
    }

    return left.name.localeCompare(right.name)
  })
}

export const PRESET_ENVIRONMENTS = ['test', 'prod'] as const

export async function deleteEnvironment(projectId: string, environmentName: string) {
  const environments = await loadEnvironments()
  const nextEnvironments = environments.filter(
    (environment) => !(environment.projectId === projectId && environment.name === environmentName),
  )
  await saveEnvironments(nextEnvironments)
  return sortEnvironments(nextEnvironments.filter((environment) => environment.projectId === projectId))
}

export function createEnvironmentRecordDraft(name: string): EnvironmentFormValue {
  return {
    name,
    serverId: '',
    remotePath: '',
    uploadStrategy: 'overwrite',
    postDeployCommand: '',
    enabled: true,
  }
}

export async function getProjectEnvironments(projectId: string) {
  const environments = await loadEnvironments()
  return sortEnvironments(environments.filter((environment) => environment.projectId === projectId))
}

export async function getEnvironmentsByProjectIds(projectIds: string[]) {
  if (projectIds.length === 0) {
    return new Map<string, DeployEnvironmentRecord[]>()
  }

  const environments = await loadEnvironments()
  const projectIdSet = new Set(projectIds)
  const result = new Map<string, DeployEnvironmentRecord[]>()

  environments.forEach((environment) => {
    if (!projectIdSet.has(environment.projectId)) {
      return
    }

    const current = result.get(environment.projectId) ?? []
    current.push(environment)
    result.set(environment.projectId, current)
  })

  result.forEach((items, projectId) => {
    result.set(projectId, sortEnvironments(items))
  })

  return result
}

export async function upsertEnvironment(projectId: string, formValue: EnvironmentFormValue) {
  const environments = await loadEnvironments()
  const now = new Date().toISOString()
  const existing = environments.find(
    (environment) => environment.projectId === projectId && environment.name === formValue.name,
  )

  if (existing) {
    const updated: DeployEnvironmentRecord = {
      ...existing,
      ...formValue,
      updatedAt: now,
    }

    const nextEnvironments = environments.map((environment) =>
      environment.id === existing.id ? updated : environment,
    )
    await saveEnvironments(nextEnvironments)
    return updated
  }

  const created: DeployEnvironmentRecord = {
    id: generateId(),
    projectId,
    ...formValue,
    createdAt: now,
    updatedAt: now,
  }

  const nextEnvironments = [...environments, created]
  await saveEnvironments(nextEnvironments)
  return created
}

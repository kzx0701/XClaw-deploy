import { loadProjects, saveProjects } from '@/services/storage/projects'
import type { ProjectRecord, ProjectScanResult } from '@/types/task'

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `project_${Date.now()}`
}

function sortProjects(projects: ProjectRecord[]) {
  return [...projects].sort((left, right) => {
    const leftTime = left.lastUsedAt ?? left.updatedAt
    const rightTime = right.lastUsedAt ?? right.updatedAt

    return new Date(rightTime).getTime() - new Date(leftTime).getTime()
  })
}

export async function getProjects() {
  const projects = await loadProjects()
  return sortProjects(projects)
}

export async function upsertProject(scanResult: ProjectScanResult) {
  const projects = await loadProjects()
  const now = new Date().toISOString()
  const existing = projects.find((project) => project.localPath === scanResult.localPath)

  if (existing) {
    const updated: ProjectRecord = {
      ...existing,
      name: scanResult.name,
      packageJsonPath: scanResult.packageJsonPath,
      projectType: scanResult.projectType,
      packageManager: scanResult.packageManager,
      scripts: scanResult.scripts,
      detectedBuildCommand: scanResult.detectedBuildCommand,
      detectedOutputDir: scanResult.detectedOutputDir,
      defaultBuildCommand: scanResult.defaultBuildCommand,
      defaultOutputDir: scanResult.defaultOutputDir,
      updatedAt: now,
      lastUsedAt: now,
    }

    const nextProjects = projects.map((project) => (project.id === existing.id ? updated : project))
    await saveProjects(sortProjects(nextProjects))
    return updated
  }

  const created: ProjectRecord = {
    id: generateId(),
    name: scanResult.name,
    localPath: scanResult.localPath,
    packageJsonPath: scanResult.packageJsonPath,
    projectType: scanResult.projectType,
    packageManager: scanResult.packageManager,
    scripts: scanResult.scripts,
    detectedBuildCommand: scanResult.detectedBuildCommand,
    detectedOutputDir: scanResult.detectedOutputDir,
    defaultBuildCommand: scanResult.defaultBuildCommand,
    defaultOutputDir: scanResult.defaultOutputDir,
    defaultPrecheckEnabled: false,
    defaultPrecheckCommand: '',
    defaultDeployServerIdByEnv: {},
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
  }

  const nextProjects = sortProjects([created, ...projects])
  await saveProjects(nextProjects)
  return created
}

export async function markProjectAsUsed(projectId: string) {
  const projects = await loadProjects()
  const now = new Date().toISOString()
  const nextProjects = projects.map((project) =>
    project.id === projectId
      ? {
          ...project,
          lastUsedAt: now,
          updatedAt: now,
        }
      : project,
  )

  await saveProjects(sortProjects(nextProjects))
  return sortProjects(nextProjects)
}

export async function deleteProject(projectId: string) {
  const projects = await loadProjects()
  const nextProjects = projects.filter((project) => project.id !== projectId)

  await saveProjects(sortProjects(nextProjects))
  return sortProjects(nextProjects)
}

export async function updateProjectConfig(project: ProjectRecord) {
  const projects = await loadProjects()
  const now = new Date().toISOString()
  const nextProjects = projects.map((item) =>
    item.id === project.id
      ? {
          ...project,
          updatedAt: now,
        }
      : item,
  )

  await saveProjects(sortProjects(nextProjects))
  return sortProjects(nextProjects)
}

export type ProjectType = 'vite-vue' | 'vite-react' | 'vue-cli' | 'react' | 'next' | 'nuxt' | 'astro' | 'sveltekit' | 'static-generator' | 'unknown'

export interface ProjectSummary {
  id: string
  name: string
  path: string
  type: ProjectType
  updatedAt: string
}

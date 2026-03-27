import { prisma } from '@/lib/prisma'
import { NewOrgForm } from './new-org-form'

export default async function NewOrgPage() {
  const industries = await prisma.industry.findMany({ orderBy: { name: 'asc' } })
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <a href="/organizations" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">← Организации</a>
        <span className="text-slate-700">/</span>
        <span className="text-sm text-slate-300">Новая организация</span>
      </div>
      <h1 className="text-xl font-semibold text-white mb-8">Создать организацию</h1>
      <NewOrgForm industries={industries} />
    </div>
  )
}

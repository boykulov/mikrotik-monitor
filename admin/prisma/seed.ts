import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding...')

  // SuperAdmin
  const hash = await bcrypt.hash('NebulaAdmin2024!', 12)
  const admin = await prisma.superAdmin.upsert({
    where:  { email: 'admin@nebulanet.local' },
    update: {},
    create: { email: 'admin@nebulanet.local', password: hash, name: 'Super Admin' },
  })
  console.log('✅ SuperAdmin:', admin.email)

  // Platform settings
  await prisma.platformSettings.upsert({
    where:  { id: 'singleton' },
    update: {},
    create: { id: 'singleton', platformName: 'NebulaNet' },
  })
  console.log('✅ PlatformSettings')

  // Отрасли
  const industries = [
    { name: 'Логистика',       slug: 'logistics',     icon: '🚛' },
    { name: 'Производство',    slug: 'manufacturing', icon: '🏭' },
    { name: 'IT',              slug: 'it',            icon: '💻' },
    { name: 'Торговля',        slug: 'retail',        icon: '🛒' },
    { name: 'Образование',     slug: 'education',     icon: '🎓' },
    { name: 'Здравоохранение', slug: 'healthcare',    icon: '🏥' },
    { name: 'Финансы',         slug: 'finance',       icon: '💰' },
    { name: 'Строительство',   slug: 'construction',  icon: '🏗' },
  ]
  for (const ind of industries) {
    await prisma.industry.upsert({ where: { slug: ind.slug }, update: {}, create: ind })
  }
  console.log('✅ Отрасли:', industries.length)

  // Организация Uzbfreight (мигрируем из v1.0)
  const logistics = await prisma.industry.findUnique({ where: { slug: 'logistics' } })
  const org = await prisma.organization.upsert({
    where:  { slug: 'uzbfreight' },
    update: {},
    create: {
      name:       'Uzbfreight',
      slug:       'uzbfreight',
      comment:    'Логистическая компания — мигрировано из v1.0',
      aiEnabled:  true,
      isActive:   true,
      plan:       'PRO',
      industryId: logistics?.id,
    },
  })
  console.log('✅ Organization:', org.name)

  console.log('🎉 Seed завершён!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

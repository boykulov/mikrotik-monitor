import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Client } from 'pg'

const CATEGORY_MAP: Record<string, { name: string; color: string; icon: string }> = {
  work:          { name: 'Работа',      color: '#3b82f6', icon: '💼' },
  other:         { name: 'Другое',      color: '#6b7280', icon: '🌐' },
  system:        { name: 'Система',     color: '#8b5cf6', icon: '⚙️' },
  entertainment: { name: 'Развлечения', color: '#f59e0b', icon: '🎬' },
  social:        { name: 'Соцсети',     color: '#ec4899', icon: '💬' },
  gaming:        { name: 'Игры',        color: '#10b981', icon: '🎮' },
}

export async function POST() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'nebulanet',
    user: 'nebulanet',
    password: 'nebulanet_secret',
  })

  try {
    await client.connect()
    const { rows } = await client.query('SELECT service_name, category FROM domain_categories')
    await client.end()

    const org = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
    })
    if (!org) return NextResponse.json({ error: 'Нет активных организаций' }, { status: 400 })

    // Получаем или создаём категории
    const existingCats = await prisma.category.findMany({
      where: { isGlobal: true },
      select: { id: true, description: true },
    })
    const catMap: Record<string, string> = {}
    for (const c of existingCats) {
      if (c.description) catMap[c.description] = c.id
    }

    // Создаём недостающие категории
    for (const [slug, meta] of Object.entries(CATEGORY_MAP)) {
      if (!catMap[slug]) {
        const cat = await prisma.category.create({
          data: { name: meta.name, description: slug, color: meta.color, icon: meta.icon, orgId: org.id, isGlobal: true },
        })
        catMap[slug] = cat.id
      }
    }

    // Получаем существующие домены
    const existing = await prisma.domain.findMany({
      where: { orgId: org.id },
      select: { domain: true },
    })
    const existingSet = new Set(existing.map(d => d.domain))

    // Добавляем новые домены
    const toCreate = rows
      .filter((r: {service_name: string; category: string}) => catMap[r.category] && !existingSet.has(r.service_name))
      .map((r: {service_name: string; category: string}) => ({
        domain: r.service_name,
        categoryId: catMap[r.category],
        orgId: org.id,
        isGlobal: true,
        isVerified: true,
      }))

    let added = 0
    if (toCreate.length > 0) {
      const result = await prisma.domain.createMany({ data: toCreate, skipDuplicates: true })
      added = result.count
    }

    return NextResponse.json({
      success: true,
      stats: { total: rows.length, added, skipped: rows.length - added, categories: Object.keys(catMap).length },
    })
  } catch (err) {
    try { await client.end() } catch {}
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const orgs = await prisma.organization.findMany({
    include: { industry: true, _count: { select: { devices: true, users: true, domains: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(orgs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const existing = await prisma.organization.findUnique({ where: { slug: body.slug } })
  if (existing) return NextResponse.json({ error: 'Slug уже занят' }, { status: 400 })
  const org = await prisma.organization.create({
    data: {
      name:       body.name,
      slug:       body.slug,
      comment:    body.comment || null,
      industryId: body.industryId || null,
      plan:       body.plan || 'BASIC',
      userLimit:  body.userLimit || 5,
      aiEnabled:  body.aiEnabled || false,
    },
  })
  return NextResponse.json(org, { status: 201 })
}

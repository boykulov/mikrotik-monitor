import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const org = await prisma.organization.findUnique({ where: { id }, include: { industry: true } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(org)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const org = await prisma.organization.update({
    where: { id },
    data: {
      name:       body.name,
      comment:    body.comment,
      industryId: body.industryId,
      plan:       body.plan,
      userLimit:  body.userLimit,
      aiEnabled:  body.aiEnabled,
      isActive:   body.isActive,
    },
  })
  return NextResponse.json(org)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.organization.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

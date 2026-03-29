import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { key, status, devices, uptime, version, ip } = body

    if (!key) return NextResponse.json({ error: 'No key' }, { status: 400 })

    const org = await prisma.organization.findUnique({
      where: { licenseKey: key },
      select: { id: true, name: true, isActive: true },
    })

    if (!org) return NextResponse.json({ error: 'Invalid key' }, { status: 404 })

    // Обновляем lastHeartbeat и данные
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        lastHeartbeat: new Date(),
        heartbeatData: { status, devices, uptime, version, ip },
      },
    })

    return NextResponse.json({
      ok: true,
      org: org.name,
      active: org.isActive,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

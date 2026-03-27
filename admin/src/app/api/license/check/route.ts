import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')

  if (!key) {
    return NextResponse.json({ active: false, reason: 'No license key' }, { status: 400 })
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { licenseKey: key },
      select: {
        id: true, name: true, slug: true,
        isActive: true, plan: true,
        planExpiresAt: true, aiEnabled: true,
      },
    })

    if (!org) {
      return NextResponse.json({ active: false, reason: 'Invalid license key' }, { status: 404 })
    }

    if (!org.isActive) {
      return NextResponse.json({
        active: false,
        reason: 'Organization disabled',
        org: org.name,
      }, { status: 403 })
    }

    if (org.planExpiresAt && org.planExpiresAt < new Date()) {
      return NextResponse.json({
        active: false,
        reason: 'License expired',
        org: org.name,
        expiredAt: org.planExpiresAt,
      }, { status: 403 })
    }

    return NextResponse.json({
      active: true,
      org: org.name,
      plan: org.plan,
      aiEnabled: org.aiEnabled,
      expiresAt: org.planExpiresAt,
    })
  } catch (err) {
    console.error('License check error:', err)
    return NextResponse.json({ active: false, reason: 'Server error' }, { status: 500 })
  }
}

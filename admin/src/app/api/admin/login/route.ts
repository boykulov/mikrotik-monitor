import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    const admin = await prisma.superAdmin.findUnique({ where: { email } })
    if (!admin) {
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, admin.password)
    if (!valid) {
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
    }

    await prisma.superAdmin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    })

    const cookieStore = await cookies()
    cookieStore.set('nebulanet_session', admin.id, {
      httpOnly: true,
      secure: false,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}

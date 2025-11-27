/**
 * Script pour créer un utilisateur admin dans la DB backoffice
 * Run with: BACKOFFICE_DB_URL="postgresql://postgres:password@localhost:5433/backoffice?schema=public" bunx tsx seed-admin.ts
 */

import { prisma } from './src/client'
import bcrypt from 'bcryptjs'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@cashou.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123456!'
const ADMIN_NAME = process.env.ADMIN_NAME || 'Administrator'

async function main() {
  try {
    console.log('🔐 Création d\'un utilisateur admin dans la DB backoffice...\n')

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    })

    if (existingUser) {
      console.log('ℹ️  L\'utilisateur existe déjà!')
      console.log('📧 Email:', existingUser.email)
      console.log('🆔 User ID:', existingUser.id)
      console.log('\nSi vous voulez réinitialiser le mot de passe, supprimez d\'abord l\'utilisateur.')
      return
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)

    // Créer l'utilisateur admin
    const user = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        password: hashedPassword,
        name: ADMIN_NAME,
      },
    })

    console.log('✅ Utilisateur admin créé avec succès!\n')
    console.log('📧 Email:', user.email)
    console.log('👤 Name:', user.name)
    console.log('🆔 User ID:', user.id)
    console.log('\n📝 Identifiants de connexion:')
    console.log('   Email:', ADMIN_EMAIL)
    console.log('   Password:', ADMIN_PASSWORD)
    console.log('\n⚠️  IMPORTANT: Changez le mot de passe après la première connexion!')

    // Créer un rôle admin si nécessaire
    try {
      const adminRole = await prisma.role.upsert({
        where: { name: 'admin' },
        update: {},
        create: { name: 'admin' },
      })

      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      })

      console.log('✅ Rôle admin assigné!')
    } catch (error) {
      console.log('⚠️  Impossible d\'assigner le rôle admin (peut-être déjà assigné)')
    }
  } catch (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

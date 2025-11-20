import path from 'path'
import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

loadEnv({
  path: path.resolve(process.cwd(), '../../.env'),
})

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminEmail = process.env.BACKOFFICE_ADMIN_EMAIL ?? 'admin@cashou.local'
const adminPassword = process.env.BACKOFFICE_ADMIN_PASSWORD ?? 'ChangeMe123!'

async function main() {
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL (ou SUPABASE_URL) est requis pour créer un utilisateur.')
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY est requis pour créer un utilisateur admin.')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: list } = await supabase.auth.admin.listUsers()
  const alreadyExists = list.users.find((user) => user.email === adminEmail)
  if (alreadyExists) {
    console.info(`✅ L'utilisateur ${adminEmail} existe déjà (id: ${alreadyExists.id}).`)
    return
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      source: 'seed-script',
    },
  })

  if (error) {
    throw error
  }

  console.info(`✅ Utilisateur admin créé (${data.user?.email}).`)
  console.info('   Pensez à modifier BACKOFFICE_ADMIN_EMAIL / BACKOFFICE_ADMIN_PASSWORD après usage.')
}

main().catch((error) => {
  console.error('❌ Erreur lors de la création de l’admin Supabase\n', error)
  process.exit(1)
})

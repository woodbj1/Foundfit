import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'aeeseylqnzxwcsxtgowo'
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const RESEND_API_KEY = process.env.RESEND_API_KEY
const SMTP_FROM_EMAIL =
  process.env.SUPABASE_AUTH_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'noreply@foundfit.net'
const SMTP_SENDER_NAME = process.env.SUPABASE_AUTH_SENDER_NAME || 'Foundation Fitness'

const TEMPLATE_CONFIG = [
  {
    template: 'confirmation',
    subject: `Confirm your ${SMTP_SENDER_NAME} account`,
    fileName: 'confirmation.html',
  },
  {
    template: 'invite',
    subject: `Your ${SMTP_SENDER_NAME} invite is ready`,
    fileName: 'invite.html',
  },
  {
    template: 'magic_link',
    subject: `Your ${SMTP_SENDER_NAME} sign-in link`,
    fileName: 'magic-link.html',
  },
  {
    template: 'recovery',
    subject: `Reset your ${SMTP_SENDER_NAME} password`,
    fileName: 'recovery.html',
  },
  {
    template: 'email_change',
    subject: `Confirm your ${SMTP_SENDER_NAME} email change`,
    fileName: 'email-change.html',
  },
  {
    template: 'reauthentication',
    subject: `Confirm your ${SMTP_SENDER_NAME} verification code`,
    fileName: 'reauthentication.html',
  },
]

function requireEnv(name, value) {
  if (!value || !value.trim()) {
    throw new Error(`${name} is required`)
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  requireEnv('SUPABASE_ACCESS_TOKEN', SUPABASE_ACCESS_TOKEN)
  requireEnv('RESEND_API_KEY', RESEND_API_KEY)

  const templates = await Promise.all(
    TEMPLATE_CONFIG.map(async (config) => {
      const templatePath = path.resolve(scriptDir, `../supabase/templates/${config.fileName}`)
      const content = await readFile(templatePath, 'utf8')

      return {
        ...config,
        content,
      }
    })
  )

  const mailerPayload = templates.reduce((payload, template) => {
    payload[`mailer_subjects_${template.template}`] = template.subject
    payload[`mailer_templates_${template.template}_content`] = template.content
    return payload
  }, {})

  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      external_email_enabled: true,
      mailer_autoconfirm: false,
      smtp_admin_email: SMTP_FROM_EMAIL,
      smtp_host: 'smtp.resend.com',
      smtp_port: 465,
      smtp_user: 'resend',
      smtp_pass: RESEND_API_KEY,
      smtp_sender_name: SMTP_SENDER_NAME,
      ...mailerPayload,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Supabase auth branding update failed: ${response.status} ${errorText}`)
  }

  const config = await response.json()

  console.log('Supabase Auth branding updated successfully.')
  console.log(`Project: ${PROJECT_REF}`)
  console.log(`Sender: ${config.smtp_sender_name} <${config.smtp_admin_email}>`)
  console.log(`Confirmation subject: ${config.mailer_subjects_confirmation}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

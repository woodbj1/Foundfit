import { Resend } from 'resend'
import { SITE } from '@/lib/site-config'

let resend: Resend | null = null

const EMAIL_BRAND_NAME = process.env.RESEND_FROM_NAME || 'Foundation Fitness'
const EMAIL_TAGLINE = 'Empowering Women Through Fitness'
const EMAIL_SUPPORT_ADDRESS = SITE.email || 'info@foundfit.net'
const EMAIL_FALLBACK_ASSET_BASE_URL = 'https://foundfit.net'
const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@foundfit.net'

interface EmailOptions {
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
}

type EmailDetail = {
  label: string
  value: string
}

type BrandedEmailOptions = {
  title: string
  bodyHtml: string
  ctaLabel?: string
  ctaHref?: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
  footerNote?: string
}

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set')
  }

  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }

  return resend
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || SITE.url
}

function getAppLink(path: string) {
  return new URL(path, getAppUrl()).toString()
}

function getEmailAssetBaseUrl() {
  const appUrl = getAppUrl()

  if (appUrl.includes('localhost') || appUrl.includes('127.0.0.1')) {
    return EMAIL_FALLBACK_ASSET_BASE_URL
  }

  return appUrl
}

function getEmailHomeUrl() {
  return getEmailAssetBaseUrl()
}

function getLogoUrl() {
  return new URL('/brand/site-logo-vertical.png', getEmailAssetBaseUrl()).toString()
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderDetails(details: EmailDetail[]) {
  return `
    <div style="margin: 20px 0; border: 1px solid #eadcf7; border-radius: 18px; background: #faf5ff; padding: 18px 20px;">
      ${details
        .map(
          (detail, index) => `
            <div style="padding: 8px 0; ${index === details.length - 1 ? '' : 'border-bottom: 1px solid #f1e7fb;'}">
              <div style="font-size: 12px; line-height: 1.4; letter-spacing: 0.08em; text-transform: uppercase; color: #a855f7; font-weight: 700;">
                ${escapeHtml(detail.label)}
              </div>
              <div style="margin-top: 4px; font-size: 16px; line-height: 1.6; color: #241335; font-weight: 600;">
                ${escapeHtml(detail.value)}
              </div>
            </div>
          `
        )
        .join('')}
    </div>
  `
}

function renderButton(label: string, href: string, variant: 'primary' | 'secondary' = 'primary') {
  const background = variant === 'primary' ? '#7c3aed' : '#ffffff'
  const color = variant === 'primary' ? '#ffffff' : '#7c3aed'
  const border = variant === 'primary' ? '1px solid #7c3aed' : '1px solid #d8b4fe'

  return `
    <a
      href="${href}"
      style="
        display: inline-block;
        padding: 14px 22px;
        border-radius: 999px;
        background: ${background};
        color: ${color};
        border: ${border};
        text-decoration: none;
        font-size: 14px;
        font-weight: 700;
        line-height: 1;
      "
    >
      ${escapeHtml(label)} &rarr;
    </a>
  `
}

function renderBrandedEmail({
  title,
  bodyHtml,
  ctaLabel,
  ctaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  footerNote,
}: BrandedEmailOptions) {
  const primaryCta = ctaLabel && ctaHref ? renderButton(ctaLabel, ctaHref, 'primary') : ''
  const secondaryCta =
    secondaryCtaLabel && secondaryCtaHref
      ? renderButton(secondaryCtaLabel, secondaryCtaHref, 'secondary')
      : ''

  return `
    <div style="margin: 0; padding: 24px 12px; background: #f8f4fc; color: #241335; font-family: 'Segoe UI', Arial, sans-serif;">
      <div style="max-width: 640px; margin: 0 auto;">
        <div style="background: #ffffff; border: 1px solid #eadcf7; border-radius: 28px; overflow: hidden; box-shadow: 0 18px 50px rgba(91, 33, 182, 0.08);">
          <div style="background: radial-gradient(circle at top, #52206d 0%, #241335 44%, #160c20 100%); padding: 32px 24px 26px; text-align: center;">
            <img
              src="${getLogoUrl()}"
              alt="${EMAIL_BRAND_NAME}"
              width="172"
              height="172"
              style="display: block; margin: 0 auto 18px; width: 172px; height: auto; max-width: 100%;"
            />
            <div style="font-size: 11px; line-height: 1.4; letter-spacing: 0.22em; text-transform: uppercase; color: #f5d0fe; font-weight: 700;">
              ${EMAIL_BRAND_NAME}
            </div>
            <div style="margin-top: 8px; font-size: 13px; line-height: 1.6; color: #fce7f3; font-weight: 600;">
              ${EMAIL_TAGLINE}
            </div>
            <h1 style="margin: 14px 0 0; font-size: 30px; line-height: 1.15; color: #ffffff; font-weight: 800;">
              ${escapeHtml(title)}
            </h1>
          </div>
          <div style="height: 6px; background: linear-gradient(90deg, #ec4899 0%, #a855f7 52%, #06b6d4 100%);"></div>
          <div style="padding: 32px 28px;">
            ${bodyHtml}
            ${primaryCta || secondaryCta ? `
              <div style="margin-top: 28px; display: flex; flex-wrap: wrap; gap: 12px;">
                ${primaryCta}
                ${secondaryCta}
              </div>
            ` : ''}
          </div>
          <div style="padding: 18px 28px 24px; border-top: 1px solid #f3e8ff; background: #fcfaff;">
            <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #6b5b7b;">
              ${footerNote
                ? escapeHtml(footerNote)
                : `Need help? Reply to this email or contact ${EMAIL_SUPPORT_ADDRESS}.`}
            </p>
            <p style="margin: 10px 0 0; font-size: 12px; line-height: 1.6; color: #8a7d98;">
              ${EMAIL_BRAND_NAME} | <a href="${getEmailHomeUrl()}" style="color: #7c3aed; text-decoration: none;">foundfit.net</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `
}

export async function sendEmail({ to, subject, html, attachments }: EmailOptions) {
  try {
    const { data, error } = await getResend().emails.send({
      from: `${EMAIL_BRAND_NAME} <${fromEmail}>`,
      to,
      subject,
      html,
      attachments: attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
      })),
    })

    if (error) {
      console.error('Email send error:', error)
      throw new Error(error.message)
    }

    return data
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

export function bookingRequestEmail(clientName: string, date: string, time: string) {
  return {
    subject: `New Booking Request from ${clientName}`,
    html: renderBrandedEmail({
      title: 'New Booking Request',
      bodyHtml: `
        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #332145;">
          <strong>${escapeHtml(clientName)}</strong> requested a training session. Review the details below and approve or decline it from your trainer dashboard.
        </p>
        ${renderDetails([
          { label: 'Client', value: clientName },
          { label: 'Date', value: date },
          { label: 'Time', value: time },
        ])}
      `,
      ctaLabel: 'Review Request',
      ctaHref: getAppLink('/trainer/bookings'),
    }),
  }
}

export function bookingApprovedEmail(
  clientName: string,
  date: string,
  time: string,
  joinUrl?: string
) {
  return {
    subject: 'Your Session is Confirmed!',
    html: renderBrandedEmail({
      title: 'Session Confirmed',
      bodyHtml: `
        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #332145;">
          Hey ${escapeHtml(clientName)}, your session has been confirmed and added to your plan.
        </p>
        ${renderDetails([
          { label: 'Date', value: date },
          { label: 'Time', value: time },
        ])}
        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #6b5b7b;">
          ${joinUrl
            ? 'Your Daily join link is ready below. We recommend joining a few minutes early.'
            : 'You can review your schedule any time from your client dashboard.'}
        </p>
      `,
      ctaLabel: joinUrl ? 'Join Virtual Session' : 'Open Dashboard',
      ctaHref: joinUrl || getAppLink('/sessions'),
      secondaryCtaLabel: joinUrl ? 'View Sessions' : undefined,
      secondaryCtaHref: joinUrl ? getAppLink('/sessions') : undefined,
    }),
  }
}

export function bookingDeclinedEmail(clientName: string, date: string, time: string) {
  return {
    subject: 'Booking Update - Session Not Available',
    html: renderBrandedEmail({
      title: 'Session Update',
      bodyHtml: `
        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #332145;">
          Hey ${escapeHtml(clientName)}, that requested time is no longer available.
        </p>
        ${renderDetails([
          { label: 'Requested Date', value: date },
          { label: 'Requested Time', value: time },
        ])}
        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #6b5b7b;">
          Your session credit is still available. Pick a different time and we&apos;ll help you get booked.
        </p>
      `,
      ctaLabel: 'Book Another Time',
      ctaHref: getAppLink('/book'),
    }),
  }
}

export function bookingCancelledEmail(
  trainerName: string,
  clientName: string,
  date: string,
  time: string
) {
  return {
    subject: `Session Cancelled by ${clientName}`,
    html: renderBrandedEmail({
      title: 'Session Cancelled',
      bodyHtml: `
        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #332145;">
          Hi ${escapeHtml(trainerName)}, <strong>${escapeHtml(clientName)}</strong> cancelled an upcoming session.
        </p>
        ${renderDetails([
          { label: 'Client', value: clientName },
          { label: 'Date', value: date },
          { label: 'Time', value: time },
        ])}
      `,
      ctaLabel: 'Open Trainer Bookings',
      ctaHref: getAppLink('/trainer/bookings'),
    }),
  }
}

export function bookingRescheduleRequestEmail(clientName: string, date: string, time: string) {
  return {
    subject: `Reschedule Request from ${clientName}`,
    html: renderBrandedEmail({
      title: 'Reschedule Request',
      bodyHtml: `
        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #332145;">
          <strong>${escapeHtml(clientName)}</strong> picked a new time for an existing session request.
        </p>
        ${renderDetails([
          { label: 'Client', value: clientName },
          { label: 'New Date', value: date },
          { label: 'New Time', value: time },
        ])}
        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #6b5b7b;">
          Open your trainer bookings page to approve or decline the updated request.
        </p>
      `,
      ctaLabel: 'Review Request',
      ctaHref: getAppLink('/trainer/bookings'),
    }),
  }
}

export function bookingRescheduledEmail(
  clientName: string,
  date: string,
  time: string,
  joinUrl?: string
) {
  return {
    subject: 'Your Session Has Been Rescheduled',
    html: renderBrandedEmail({
      title: 'Session Rescheduled',
      bodyHtml: `
        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #332145;">
          Hey ${escapeHtml(clientName)}, your session has been moved to a new time.
        </p>
        ${renderDetails([
          { label: 'New Date', value: date },
          { label: 'New Time', value: time },
        ])}
        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #6b5b7b;">
          ${joinUrl
            ? 'Your existing Daily join link is still ready below.'
            : 'You can review the updated session details any time from your dashboard.'}
        </p>
      `,
      ctaLabel: joinUrl ? 'Join Virtual Session' : 'View Sessions',
      ctaHref: joinUrl || getAppLink('/sessions'),
      secondaryCtaLabel: joinUrl ? 'Open Dashboard' : undefined,
      secondaryCtaHref: joinUrl ? getAppLink('/dashboard') : undefined,
    }),
  }
}

export function bookingRescheduledNoticeEmail(
  trainerName: string,
  clientName: string,
  date: string,
  time: string
) {
  return {
    subject: `Session Rescheduled by ${clientName}`,
    html: renderBrandedEmail({
      title: 'Session Rescheduled',
      bodyHtml: `
        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #332145;">
          Hi ${escapeHtml(trainerName)}, <strong>${escapeHtml(clientName)}</strong> moved an upcoming session.
        </p>
        ${renderDetails([
          { label: 'Client', value: clientName },
          { label: 'New Date', value: date },
          { label: 'New Time', value: time },
        ])}
      `,
      ctaLabel: 'Open Trainer Bookings',
      ctaHref: getAppLink('/trainer/bookings'),
    }),
  }
}

export function paymentConfirmationEmail(clientName: string, serviceName: string, amount: string) {
  return {
    subject: `Payment Confirmed - ${EMAIL_BRAND_NAME}`,
    html: renderBrandedEmail({
      title: 'Payment Confirmed',
      bodyHtml: `
        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #332145;">
          Thanks ${escapeHtml(clientName)}. Your payment has been processed successfully.
        </p>
        ${renderDetails([
          { label: 'Service', value: serviceName },
          { label: 'Amount', value: amount },
        ])}
        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #6b5b7b;">
          Your updated access is available in your dashboard.
        </p>
      `,
      ctaLabel: 'Go to Dashboard',
      ctaHref: getAppLink('/dashboard'),
    }),
  }
}

export function mealPlanEmail(clientName: string, planTitle: string) {
  return {
    subject: `Your Meal Plan is Ready - ${planTitle}`,
    html: renderBrandedEmail({
      title: 'Meal Plan Ready',
      bodyHtml: `
        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #332145;">
          Hey ${escapeHtml(clientName)}, your new meal plan is ready to review.
        </p>
        ${renderDetails([{ label: 'Meal Plan', value: planTitle }])}
        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #6b5b7b;">
          The PDF is attached to this email, and you can download it any time from your portal.
        </p>
      `,
      ctaLabel: 'View Meal Plans',
      ctaHref: getAppLink('/meal-plans'),
    }),
  }
}

export function trainerWelcomeEmail(
  fullName: string,
  email: string,
  setupUrl: string,
  tempPassword?: string
) {
  const details: EmailDetail[] = [{ label: 'Trainer Email', value: email }]

  if (tempPassword) {
    details.push({ label: 'Temporary Password', value: tempPassword })
  }

  return {
    subject: `Your ${EMAIL_BRAND_NAME} trainer setup is ready`,
    html: renderBrandedEmail({
      title: 'Welcome to Foundation Fitness',
      bodyHtml: `
        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #332145;">
          Hey ${escapeHtml(fullName)}, your trainer account is ready.
        </p>
        ${renderDetails(details)}
        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #6b5b7b;">
          Use the link below to finish setup, create your password, and connect your personal Google Calendar so only your real availability is used for client bookings.
        </p>
      `,
      ctaLabel: 'Finish Trainer Setup',
      ctaHref: setupUrl,
    }),
  }
}

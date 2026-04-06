import { Resend } from 'resend'
import { SITE } from '@/lib/site-config'

let resend: Resend | null = null
const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@foundfit.net'

interface EmailOptions {
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
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

export async function sendEmail({ to, subject, html, attachments }: EmailOptions) {
  try {
    const { data, error } = await getResend().emails.send({
      from: `${SITE.name} <${fromEmail}>`,
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
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Booking Request</h1>
        </div>
        <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #374151;">
            <strong>${clientName}</strong> has requested a session:
          </p>
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0; color: #4b5563;"><strong>Date:</strong> ${date}</p>
            <p style="margin: 4px 0; color: #4b5563;"><strong>Time:</strong> ${time}</p>
          </div>
          <p style="color: #6b7280;">Log in to your dashboard to approve or decline this request.</p>
          <a href="${getAppLink('/trainer/bookings')}"
             style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
            Review Request &rarr;
          </a>
        </div>
      </div>
    `,
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
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Session Confirmed</h1>
        </div>
        <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #374151;">
            Hey ${clientName}! Your training session has been confirmed.
          </p>
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0; color: #4b5563;"><strong>Date:</strong> ${date}</p>
            <p style="margin: 4px 0; color: #4b5563;"><strong>Time:</strong> ${time}</p>
          </div>
          ${joinUrl ? `
            <a href="${joinUrl}"
               style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 16px;">
              Join your Daily session &rarr;
            </a>
          ` : ''}
          <p style="color: #6b7280;">See you there.</p>
        </div>
      </div>
    `,
  }
}

export function bookingDeclinedEmail(clientName: string, date: string, time: string) {
  return {
    subject: 'Booking Update - Session Not Available',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6b7280, #4b5563); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Session Update</h1>
        </div>
        <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #374151;">
            Hey ${clientName}, unfortunately the requested time slot is not available.
          </p>
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0; color: #4b5563;"><strong>Date:</strong> ${date}</p>
            <p style="margin: 4px 0; color: #4b5563;"><strong>Time:</strong> ${time}</p>
          </div>
          <p style="color: #6b7280;">Please try booking a different time. Your session credit has been preserved.</p>
          <a href="${getAppLink('/book')}"
             style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
            Book Another Time &rarr;
          </a>
        </div>
      </div>
    `,
  }
}

export function bookingCancelledEmail(trainerName: string, clientName: string, date: string, time: string) {
  return {
    subject: `Session Cancelled by ${clientName}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Session Cancelled</h1>
        </div>
        <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #374151;">
            ${clientName} has cancelled their session:
          </p>
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0; color: #4b5563;"><strong>Date:</strong> ${date}</p>
            <p style="margin: 4px 0; color: #4b5563;"><strong>Time:</strong> ${time}</p>
          </div>
        </div>
      </div>
    `,
  }
}

export function paymentConfirmationEmail(clientName: string, serviceName: string, amount: string) {
  return {
    subject: `Payment Confirmed - ${SITE.name}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Payment Confirmed</h1>
        </div>
        <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #374151;">
            Thanks ${clientName}! Your payment has been processed.
          </p>
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0; color: #4b5563;"><strong>Service:</strong> ${serviceName}</p>
            <p style="margin: 4px 0; color: #4b5563;"><strong>Amount:</strong> ${amount}</p>
          </div>
          <a href="${getAppLink('/dashboard')}"
             style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
            Go to Dashboard &rarr;
          </a>
        </div>
      </div>
    `,
  }
}

export function mealPlanEmail(clientName: string, planTitle: string) {
  return {
    subject: `Your Meal Plan is Ready - ${planTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Meal Plan Ready</h1>
        </div>
        <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #374151;">
            Hey ${clientName}! Your new meal plan "<strong>${planTitle}</strong>" is ready.
          </p>
          <p style="color: #6b7280;">The PDF is attached to this email, and you can also download it from your portal.</p>
          <a href="${getAppLink('/meal-plans')}"
             style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
            View in Portal &rarr;
          </a>
        </div>
      </div>
    `,
  }
}

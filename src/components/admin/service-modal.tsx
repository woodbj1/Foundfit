'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DollarSign, X } from 'lucide-react'
import { toast } from 'sonner'

export type Service = {
  id?: string
  title?: string
  name?: string
  description?: string | null
  price?: number
  is_active?: boolean
  duration_minutes?: number | null
  category?: string
  is_popular?: boolean
  is_session?: boolean
  session_limit?: number | null
  fulfillment_type?: 'booking' | 'daily' | 'vimeo' | 'hybrid'
  access_url?: string | null
}

interface Props {
  serviceToEdit?: Service | null
  onClose: () => void
  onSuccess: () => void
}

type ServiceFormData = {
  name: string
  description: string
  price: string
  duration_minutes: string
  category: string
  is_popular: boolean
  is_session: boolean
  is_active: boolean
  session_limit: string
  fulfillment_type: NonNullable<Service['fulfillment_type']>
  access_url: string
}

export default function ServiceModal({ serviceToEdit, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    price: '',
    duration_minutes: '60',
    category: 'session',
    is_popular: false,
    is_session: true,
    is_active: true,
    session_limit: '',
    fulfillment_type: 'booking' as const,
    access_url: '',
  })

  useEffect(() => {
    if (serviceToEdit) {
      setFormData({
        name: serviceToEdit.title || serviceToEdit.name || '',
        description: serviceToEdit.description || '',
        price: serviceToEdit.price != null ? (serviceToEdit.price / 100).toFixed(2) : '',
        duration_minutes: String(serviceToEdit.duration_minutes ?? 60),
        category: serviceToEdit.category || 'session',
        is_popular: serviceToEdit.is_popular ?? false,
        is_session: serviceToEdit.is_session ?? true,
        is_active: serviceToEdit.is_active ?? true,
        session_limit: String(serviceToEdit.session_limit ?? ''),
        fulfillment_type: serviceToEdit.fulfillment_type || 'booking',
        access_url: serviceToEdit.access_url || '',
      })
    }
  }, [serviceToEdit])

  useEffect(() => {
    if (formData.fulfillment_type === 'vimeo') {
      setFormData((prev) => ({
        ...prev,
        is_session: false,
        duration_minutes: '0',
        session_limit: '',
      }))
      return
    }

    if (formData.fulfillment_type === 'daily' || formData.fulfillment_type === 'hybrid') {
      setFormData((prev) => ({
        ...prev,
        is_session: true,
        duration_minutes: prev.duration_minutes === '0' ? '50' : prev.duration_minutes,
      }))
    }
  }, [formData.fulfillment_type])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((p) => ({ ...p, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const priceValue = parseFloat(formData.price)
      if (isNaN(priceValue) || priceValue < 0) throw new Error('Please enter a valid price (0 or greater).')
      if (formData.fulfillment_type === 'vimeo' && formData.category !== 'subscription') {
        throw new Error('Vimeo-only products should use the Subscription category so digital access is tracked correctly.')
      }

      const payload = {
        title: formData.name,
        description: formData.description,
        price: priceValue,
        duration_minutes: formData.is_session ? parseInt(formData.duration_minutes) : null,
        category: formData.category,
        is_popular: formData.is_popular,
        is_session: formData.is_session,
        is_active: formData.is_active,
        session_limit: formData.session_limit ? parseInt(formData.session_limit) : null,
        fulfillment_type: formData.fulfillment_type,
        access_url: formData.access_url || null,
      }

      const method = serviceToEdit?.id ? 'PUT' : 'POST'
      const body = serviceToEdit?.id ? { ...payload, id: serviceToEdit.id } : payload

      const res = await fetch('/api/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save service.')
      }

      toast.success(serviceToEdit ? 'Service updated successfully!' : 'Service added successfully!')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save service.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 p-6 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
            {serviceToEdit ? 'Edit Service' : 'Add New Service'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Service Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. 1-on-1 Personal Training"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="session">Session</option>
              <option value="plan">Plan</option>
              <option value="subscription">Subscription</option>
              <option value="buddy_session">Buddy Session</option>
              <option value="meal_plan">Meal Plan</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fulfillment_type">Fulfillment</Label>
            <select
              id="fulfillment_type"
              name="fulfillment_type"
              value={formData.fulfillment_type}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="booking">Standard Booking</option>
              <option value="daily">Daily Virtual Session</option>
              <option value="vimeo">Vimeo Library Access</option>
              <option value="hybrid">Daily + Vimeo Hybrid</option>
            </select>
            <p className="text-xs text-gray-500">
              Choose how this product is fulfilled after purchase.
            </p>
            {(formData.fulfillment_type === 'daily' || formData.fulfillment_type === 'hybrid') && (
              <p className="text-xs text-amber-700">
                Daily-powered products can only go live after a valid Daily API key is configured.
              </p>
            )}
            {(formData.fulfillment_type === 'vimeo' || formData.fulfillment_type === 'hybrid') && (
              <p className="text-xs text-amber-700">
                Vimeo products can use the shared library URL for all subscribers, or you can set an optional service-specific override here.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="pl-9"
                  required
                />
              </div>
              <p className="text-xs text-gray-500">Set to 0 for free services</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (mins)</Label>
              <Input
                id="duration_minutes"
                name="duration_minutes"
                type="number"
                min="15"
                step="5"
                value={formData.duration_minutes}
                onChange={handleChange}
                disabled={!formData.is_session}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 border p-3 rounded-md bg-gray-50">
            <input
              type="checkbox"
              id="is_session"
              checked={formData.is_session}
              onChange={(e) => setFormData((p) => ({ ...p, is_session: e.target.checked }))}
              disabled={formData.fulfillment_type === 'vimeo' || formData.fulfillment_type === 'daily' || formData.fulfillment_type === 'hybrid'}
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <Label htmlFor="is_session" className="font-normal cursor-pointer">Is Bookable Session?</Label>
          </div>

          <div className="flex items-center gap-3 border p-3 rounded-md bg-gray-50">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <Label htmlFor="is_active" className="font-normal cursor-pointer">Active for customers</Label>
          </div>

          <div className="flex items-center gap-3 border p-3 rounded-md bg-gray-50">
            <input
              type="checkbox"
              id="is_popular"
              checked={formData.is_popular}
              onChange={(e) => setFormData((p) => ({ ...p, is_popular: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <Label htmlFor="is_popular" className="font-normal cursor-pointer">Mark as Popular?</Label>
          </div>

          {formData.is_session && (
            <div className="space-y-2">
              <Label htmlFor="session_limit">Session Limit (Optional)</Label>
              <Input
                id="session_limit"
                name="session_limit"
                type="number"
                min="1"
                placeholder="Leave blank for unlimited"
                value={formData.session_limit}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500">Number of sessions included (e.g. 6 for a 6-week plan).</p>
            </div>
          )}

          {(formData.fulfillment_type === 'vimeo' || formData.fulfillment_type === 'hybrid') && (
            <div className="space-y-2">
              <Label htmlFor="access_url">Vimeo Showcase URL</Label>
              <Input
                id="access_url"
                name="access_url"
                type="url"
                value={formData.access_url}
                onChange={handleChange}
                placeholder="https://vimeo.com/showcase/..."
              />
              <p className="text-xs text-gray-500">
                Optional override. Leave blank to use the shared on-demand library for all subscribers.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what&apos;s included..."
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 text-white"
            >
              {loading ? 'Saving...' : serviceToEdit ? 'Update Service' : 'Add Service'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

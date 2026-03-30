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
  duration_minutes?: number | null
  category?: string
  is_popular?: boolean
  is_session?: boolean
  session_limit?: number | null
}

interface Props {
  serviceToEdit?: Service | null
  onClose: () => void
  onSuccess: () => void
}

export default function ServiceModal({ serviceToEdit, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: '60',
    category: 'session',
    is_popular: false,
    is_session: true,
    session_limit: '',
  })

  useEffect(() => {
    if (serviceToEdit) {
      setFormData({
        name: serviceToEdit.title || serviceToEdit.name || '',
        description: serviceToEdit.description || '',
        price: String(serviceToEdit.price ?? ''),
        duration_minutes: String(serviceToEdit.duration_minutes ?? 60),
        category: serviceToEdit.category || 'session',
        is_popular: serviceToEdit.is_popular ?? false,
        is_session: serviceToEdit.is_session ?? true,
        session_limit: String(serviceToEdit.session_limit ?? ''),
      })
    }
  }, [serviceToEdit])

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

      const payload = {
        title: formData.name,
        description: formData.description,
        price: priceValue,
        duration_minutes: formData.is_session ? parseInt(formData.duration_minutes) : null,
        category: formData.category,
        is_popular: formData.is_popular,
        is_session: formData.is_session,
        session_limit: formData.session_limit ? parseInt(formData.session_limit) : null,
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
    } catch (err: any) {
      toast.error(err.message || 'Could not save service.')
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
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <Label htmlFor="is_session" className="font-normal cursor-pointer">Is Bookable Session?</Label>
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

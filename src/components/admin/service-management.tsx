'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Loader2, Pencil, Plus, RefreshCw, Sparkles, Tag, Trash2, X } from 'lucide-react'
import ServiceModal, { type Service } from './service-modal'
import { formatPrice } from '@/lib/stripe'
import { toast } from 'sonner'

export default function ServiceManagement() {
  const [supabase] = useState(() => createClient())
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)

  const fetchServices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setServices(data || [])
    } catch {
      toast.error('Could not load services.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void fetchServices()
  }, [fetchServices])

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setIsModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return

    try {
      const res = await fetch(`/api/services?id=${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete.')
      }
      toast.success(`${deleteTarget.title || deleteTarget.name} deactivated.`)
      await fetchServices()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not delete service.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleSeedServices = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/admin/seed-services', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unknown error during seeding')
      toast.success(`Default services synced (${data.data?.length || 0} updated).`)
      await fetchServices()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not seed services.')
    } finally {
      setSeeding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <Tag className="h-6 w-6 text-purple-600" />
          Manage Services
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={handleSeedServices}
            variant="outline"
            disabled={seeding}
            className="border-dashed border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            {seeding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Reset Defaults
          </Button>
          <Button
            onClick={() => {
              setEditingService(null)
              setIsModalOpen(true)
            }}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {services.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No services found. Click &quot;Reset Defaults&quot; to load standard packages.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-sm font-medium text-gray-600">
                <tr>
                  <th className="px-6 py-4">Service Name</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map((service) => (
                  <tr key={service.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{service.title || service.name}</p>
                          {service.is_popular && (
                            <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                              <Sparkles className="mr-1 h-3 w-3" />
                              POPULAR
                            </span>
                          )}
                        </div>
                        <p className="max-w-xs truncate text-sm text-gray-500">{service.description}</p>
                        {service.fulfillment_type && service.fulfillment_type !== 'booking' && (
                          <p className="mt-1 text-xs uppercase tracking-wide text-purple-600">
                            {service.fulfillment_type.replace(/_/g, ' ')}
                          </p>
                        )}
                        {(service.fulfillment_type === 'vimeo' || service.fulfillment_type === 'hybrid') && (
                          <p className="mt-1 text-xs text-purple-600">
                            {service.access_url ? 'Using a custom video-library URL' : 'Using the shared video library for all subscribers'}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-gray-600">
                        <Clock className="mr-1 h-4 w-4 text-gray-400" />
                        {service.duration_minutes ? `${service.duration_minutes} mins` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{formatPrice(service.price || 0)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={service.is_active ? 'default' : 'secondary'}>
                          {service.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">
                          {(service.category || 'General').replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(service)}
                          className="text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(service)}
                          className="text-gray-600 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ServiceModal
          serviceToEdit={editingService}
          onClose={() => {
            setIsModalOpen(false)
            setEditingService(null)
          }}
          onSuccess={fetchServices}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="m-4 w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Are you sure?</h3>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-6 text-gray-600">
              This will deactivate{' '}
              <span className="font-semibold text-gray-900">&ldquo;{deleteTarget.title || deleteTarget.name}&rdquo;</span>
              {' '}and archive its Stripe product so customers can no longer purchase it.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button onClick={confirmDelete} className="bg-red-600 text-white hover:bg-red-700">
                Deactivate Service
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

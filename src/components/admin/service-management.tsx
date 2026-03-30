'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Clock, DollarSign, Loader2, Pencil, Plus, RefreshCw, Sparkles, Tag, Trash2, X } from 'lucide-react'
import ServiceModal, { type Service } from './service-modal'
import { toast } from 'sonner'

export default function ServiceManagement() {
  const supabase = createClient()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)

  const fetchServices = async () => {
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
  }

  useEffect(() => {
    fetchServices()
  }, [])

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
      toast.success(`${deleteTarget.title || deleteTarget.name} deleted.`)
      fetchServices()
    } catch (err: any) {
      toast.error(err.message || 'Could not delete service.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleSeedServices = async () => {
    setSeeding(true)
    try {
      const { data, error } = await supabase.functions.invoke('seed-services')
      if (error) throw error
      if (!data.success) throw new Error(data.error || 'Unknown error during seeding')
      toast.success(`Successfully added ${data.data?.length || 6} default services.`)
      await fetchServices()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSeeding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
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
            {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Reset Defaults
          </Button>
          <Button onClick={() => { setEditingService(null); setIsModalOpen(true) }} className="bg-purple-600 hover:bg-purple-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Service
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {services.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No services found. Click &quot;Reset Defaults&quot; to load standard packages.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
                <tr>
                  <th className="px-6 py-4">Service Name</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{service.title || service.name}</p>
                          {service.is_popular && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                              <Sparkles className="h-3 w-3 mr-1" /> POPULAR
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate max-w-xs">{service.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-1 text-gray-400" />
                        {service.duration_minutes ? `${service.duration_minutes} mins` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center font-medium text-gray-900">
                        <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                        {service.price?.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 uppercase tracking-wide">
                        {(service.category || 'General').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(service)}
                          className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(service)}
                          className="text-gray-600 hover:text-red-600 hover:bg-red-50"
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
          onClose={() => { setIsModalOpen(false); setEditingService(null) }}
          onSuccess={fetchServices}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Are you sure?</h3>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              This will permanently delete{' '}
              <span className="font-semibold text-gray-900">&ldquo;{deleteTarget.title || deleteTarget.name}&rdquo;</span>
              {' '}and archive its Stripe product.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                Delete Service
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

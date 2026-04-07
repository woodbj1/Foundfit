import ServiceManagement from '@/components/admin/service-management'

export default function AdminServicesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Services</h1>
        <p className="mt-1 text-muted-foreground">
          Manage live training, virtual sessions, and video library products.
        </p>
      </div>
      <ServiceManagement />
    </div>
  )
}

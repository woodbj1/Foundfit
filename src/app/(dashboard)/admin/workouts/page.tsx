import WorkoutRepository from '@/components/admin/workout-repository'

export default function AdminWorkoutsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Workout Studio</h1>
        <p className="mt-1 text-muted-foreground">
          Manage exercises, workout blocks, and the weekly Workout of the Day plan.
        </p>
      </div>
      <WorkoutRepository />
    </div>
  )
}

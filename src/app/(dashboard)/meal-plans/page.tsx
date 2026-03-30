import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, UtensilsCrossed } from 'lucide-react'
import { format } from 'date-fns'

export default async function MealPlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mealPlans } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Meal Plans</h1>
        <p className="text-muted-foreground mt-1">Your custom nutrition plans</p>
      </div>

      {mealPlans && mealPlans.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mealPlans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-2">
                  <UtensilsCrossed className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-lg">{plan.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(plan.created_at), 'MMMM d, yyyy')}
                </p>
              </CardHeader>
              <CardContent>
                <a href={plan.file_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">No Meal Plans Yet</h3>
            <p className="text-muted-foreground">
              Your trainer will upload meal plans here when they&apos;re ready.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

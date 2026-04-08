import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CheckoutButton from '@/components/payments/checkout-button'
import { formatPrice } from '@/lib/stripe'
import type { MealPlanPurchase, Service } from '@/lib/types'
import { Clock3, Download, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { format } from 'date-fns'

type MealPlanPurchaseWithService = MealPlanPurchase & {
  service?: Service | Service[] | null
}

export default async function MealPlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [mealPlansRes, servicesRes, purchasesRes] = await Promise.all([
    supabase
      .from('meal_plans')
      .select('*')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .eq('type', 'meal_plan')
      .order('price', { ascending: true }),
    supabase
      .from('meal_plan_purchases')
      .select('*, service:services(*)')
      .eq('client_id', user.id)
      .order('purchased_at', { ascending: false }),
  ])

  const mealPlans = mealPlansRes.data ?? []
  const mealPlanServices = (servicesRes.data ?? []) as Service[]
  const mealPlanPurchases = ((purchasesRes.data ?? []) as MealPlanPurchaseWithService[]).map((purchase) => ({
    ...purchase,
    service: Array.isArray(purchase.service) ? purchase.service[0] : purchase.service,
  }))
  const pendingPurchases = mealPlanPurchases.filter((purchase) => !purchase.fulfilled_at)
  const latestPendingPurchase = pendingPurchases[0] ?? null
  const hasPurchasedMealPlan = mealPlanPurchases.length > 0
  const hasAvailableMealPlanService = mealPlanServices.length > 0
  const showPurchaseCta = hasAvailableMealPlanService && !latestPendingPurchase

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Meal Plans</h1>
        <p className="text-muted-foreground mt-1">Your custom nutrition plans</p>
      </div>

      {mealPlans.length > 0 ? (
        <div className="space-y-6">
          {latestPendingPurchase ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Clock3 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Your next meal plan is in progress</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {latestPendingPurchase.service?.name || 'Your meal plan'} was purchased on{' '}
                      {format(new Date(latestPendingPurchase.purchased_at), 'MMMM d, yyyy')}. Your trainer will upload it here when it&apos;s ready.
                    </p>
                  </div>
                </div>
                {pendingPurchases.length > 1 ? (
                  <p className="text-sm text-muted-foreground">
                    {pendingPurchases.length} plans waiting
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {showPurchaseCta ? (
            <Card>
              <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold">Need an updated meal plan?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Purchase a fresh nutrition plan and your trainer will deliver it here.
                  </p>
                </div>
                <div className="w-full max-w-sm space-y-3">
                  {mealPlanServices.map((service) => (
                    <div key={service.id} className="rounded-lg border p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">{formatPrice(service.price)}</p>
                        </div>
                      </div>
                      <CheckoutButton serviceId={service.id} className="w-full gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Purchase Meal Plan
                      </CheckoutButton>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mealPlans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader className="pb-3">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                    <UtensilsCrossed className="h-5 w-5 text-green-600" />
                  </div>
                  <CardTitle className="text-lg">{plan.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(plan.created_at), 'MMMM d, yyyy')}
                  </p>
                </CardHeader>
                <CardContent>
                  <a href={`/api/meal-plans/${plan.id}/download`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full gap-2">
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className={hasPurchasedMealPlan ? 'border-primary/20 bg-primary/5' : undefined}>
          <CardContent className="py-12">
            <div className="mx-auto max-w-xl text-center">
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${hasPurchasedMealPlan ? 'bg-primary/10' : 'bg-muted'}`}>
                {hasPurchasedMealPlan ? (
                  <Clock3 className="h-6 w-6 text-primary" />
                ) : (
                  <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
                )}
              </div>

              {hasPurchasedMealPlan ? (
                <>
                  <h3 className="text-xl font-semibold">Your meal plan is in progress</h3>
                  <p className="mt-2 text-muted-foreground">
                    {latestPendingPurchase?.service?.name || 'Your meal plan'} was purchased on{' '}
                    {format(new Date(latestPendingPurchase?.purchased_at || new Date()), 'MMMM d, yyyy')}.
                    Your trainer will upload it here as soon as it&apos;s ready.
                  </p>
                  {pendingPurchases.length > 1 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      You also have {pendingPurchases.length - 1} additional meal plan purchase{pendingPurchases.length === 2 ? '' : 's'} waiting in the queue.
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold">You haven&apos;t subscribed to meal plans yet</h3>
                  <p className="mt-2 text-muted-foreground">
                    Purchase a custom meal plan and your trainer will deliver it right here when it&apos;s ready.
                  </p>
                </>
              )}

              {hasAvailableMealPlanService ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {mealPlanServices.map((service) => (
                    <Card key={service.id} className="text-left">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-4 text-3xl font-bold text-primary">
                          {formatPrice(service.price)}
                        </p>
                        <CheckoutButton serviceId={service.id} className="w-full gap-2">
                          <ShoppingCart className="h-4 w-4" />
                          {hasPurchasedMealPlan ? 'Purchase Another Meal Plan' : 'Subscribe to Meal Plan'}
                        </CheckoutButton>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Meal plan subscriptions are not available right now. Please check back soon.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

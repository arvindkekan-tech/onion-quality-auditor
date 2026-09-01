import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/lib/constants'

export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="PAOQA"
        subtitle="Portable AI Onion Quality Auditor"
      />
      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Start a new inspection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Run the demo-critical inspection journey from batch details through
              digital certificate verification.
            </p>
            <Link to={ROUTES.newInspection}>
              <Button className="w-full">New Inspection</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </>
  )
}

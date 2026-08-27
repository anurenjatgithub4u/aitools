import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Star, CheckCircle2, XCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { AITool } from "@/types"
import { ToolLogo } from "@/components/tool-logo"

export function ToolCard({ tool }: { tool: AITool }) {
  return (
    <Card className="flex flex-col h-full hover:border-primary/50 transition-colors bg-background/50 backdrop-blur-sm group overflow-hidden">
      <CardContent className="p-6 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-4 items-center">
            <ToolLogo
              name={tool.name}
              website={tool.website}
              className="w-14 h-14"
              fallbackTextClassName="text-xl"
            />
            <div>
              <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                <Link href={`/tool/${tool.id}`} className="before:absolute before:inset-0">
                  {tool.name}
                </Link>
              </h3>
              <p className="text-sm text-muted-foreground">{tool.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm font-bold">
            <Star className="w-4 h-4 fill-primary" />
            {tool.rating}
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {tool.description}
        </p>

        <div className="space-y-3 mt-4">
          <div>
            <span className="text-xs font-semibold uppercase text-muted-foreground">Best For</span>
            <p className="text-sm">{tool.best_for}</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant={tool.pricing === 'Free' ? 'default' : 'outline'}>{tool.pricing}</Badge>
            <Badge variant="secondary">{tool.difficulty}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 border-t border-border/40 pt-4">
          <div>
            <span className="text-xs font-semibold uppercase text-green-500 mb-2 block">Pros</span>
            <ul className="space-y-1 text-sm">
              {tool.pros.slice(0, 2).map((pro, i) => (
                <li key={i} className="flex items-start gap-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{pro}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-red-500 mb-2 block">Cons</span>
            <ul className="space-y-1 text-sm">
              {tool.cons.slice(0, 2).map((con, i) => (
                <li key={i} className="flex items-start gap-1">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{con}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-4 mt-auto relative z-10 flex justify-center">
        <Link href={`/tool/${tool.id}`} className={buttonVariants({ variant: "default", className: "w-full font-medium" })}>
          View Details
        </Link>
      </CardFooter>
    </Card>
  )
}

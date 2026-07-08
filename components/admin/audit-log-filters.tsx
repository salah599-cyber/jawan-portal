import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const selectClassName =
  "h-9 w-40 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export function AuditLogFilters({
  actions,
  resources,
  currentAction,
  currentResource,
  currentQuery,
}: {
  actions: string[];
  resources: string[];
  currentAction?: string;
  currentResource?: string;
  currentQuery?: string;
}) {
  return (
    <form className="flex flex-wrap items-end gap-3" method="get">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="q">
          Search
        </label>
        <Input id="q" name="q" placeholder="User or resource ID..." defaultValue={currentQuery} className="w-56" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="action">
          Action
        </label>
        <select id="action" name="action" defaultValue={currentAction || ""} className={selectClassName}>
          <option value="">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="resource">
          Resource
        </label>
        <select id="resource" name="resource" defaultValue={currentResource || ""} className={selectClassName}>
          <option value="">All resources</option>
          {resources.map((resource) => (
            <option key={resource} value={resource}>
              {resource}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" variant="secondary" size="sm">
        Apply filters
      </Button>
    </form>
  );
}

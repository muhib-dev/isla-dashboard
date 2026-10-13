import { Card, CardContent } from "@/components/ui/card";

/** Shown when the current demo role can't use a page. */
export function RoleNotice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="font-medium">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {children}
        </p>
      </CardContent>
    </Card>
  );
}

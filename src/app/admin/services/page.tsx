import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ServicesTable } from "./services-table";

export const metadata: Metadata = { title: "Solutions" };

export default async function AdminServicesPage() {
  await requireAdmin();
  const services = await db.service.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Solutions
        </h1>
        <p className="mt-1 text-muted-foreground">
          Le catalogue affiché sur le site public et proposé aux clients.
        </p>
      </div>

      <div className="mt-6">
        <ServicesTable services={services} />
      </div>
    </div>
  );
}

import {
  FACEBOOK_SERVICE_SLUG,
  formatConfigValue,
  INSTAGRAM_SERVICE_SLUG,
  TELEPHONY_SERVICE_SLUGS,
  WHATSAPP_SERVICE_SLUG,
  type ConfigValue,
} from "@/lib/catalog";
import {
  FacebookPageIdEditor,
  InstagramAccountIdEditor,
  NoteEditor,
  PhoneNumberEditor,
  WhatsAppPhoneNumberEditor,
} from "./client-service-actions";

export type ClientServiceCellData = {
  id: string;
  status: string;
  configuration: unknown;
  adminNote: string | null;
  externalPhoneNumber: string | null;
  whatsappPhoneNumberId: string | null;
  facebookPageId: string | null;
  instagramAccountId: string | null;
  service: { slug: string };
};

export function configSummary(cs: { configuration: unknown }): string {
  const config = (cs.configuration ?? {}) as Record<string, ConfigValue>;
  const entries = Object.entries(config).filter(([, v]) => v);
  if (entries.length === 0) return "—";
  return entries.map(([k, v]) => `${k}: ${formatConfigValue(v)}`).join(" · ");
}

const Dash = () => <span className="text-sm text-muted-foreground">—</span>;

export function NoteCell({ cs }: { cs: ClientServiceCellData }) {
  if (cs.status === "CANCELED") return <Dash />;
  return <NoteEditor clientServiceId={cs.id} initialNote={cs.adminNote ?? ""} />;
}

export function ConnectionCell({ cs }: { cs: ClientServiceCellData }) {
  if (cs.status === "CANCELED") return <Dash />;

  if (TELEPHONY_SERVICE_SLUGS.has(cs.service.slug)) {
    return (
      <PhoneNumberEditor
        clientServiceId={cs.id}
        initialPhoneNumber={cs.externalPhoneNumber ?? ""}
      />
    );
  }
  if (cs.service.slug === WHATSAPP_SERVICE_SLUG) {
    return (
      <WhatsAppPhoneNumberEditor
        clientServiceId={cs.id}
        initialPhoneNumberId={cs.whatsappPhoneNumberId ?? ""}
      />
    );
  }
  if (cs.service.slug === FACEBOOK_SERVICE_SLUG) {
    return (
      <FacebookPageIdEditor
        clientServiceId={cs.id}
        initialPageId={cs.facebookPageId ?? ""}
      />
    );
  }
  if (cs.service.slug === INSTAGRAM_SERVICE_SLUG) {
    return (
      <InstagramAccountIdEditor
        clientServiceId={cs.id}
        initialAccountId={cs.instagramAccountId ?? ""}
      />
    );
  }
  return <Dash />;
}

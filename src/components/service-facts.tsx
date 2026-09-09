import { formatConfigValue, type MyServiceDTO } from "@/lib/catalog";

// La partie purement informative d'une solution : plafond d'usage, numéro,
// et les réglages que le client a renseignés. Extraite pour que l'admin voie
// exactement ce que voit le client, sans hériter des commandes qui
// l'accompagnent côté client (modifier la configuration, connecter un
// compte) — un admin ne doit pas pouvoir les déclencher sur le compte de
// quelqu'un d'autre.

// Libellé à gauche, valeur juste en dessous (ou en colonne sur écran large) :
// une valeur longue — des horaires sur sept jours, un menu de produits —
// reste lisible, là où un alignement à droite la faisait revenir à la ligne
// en escalier.
export function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-border py-3 text-sm last:border-b-0 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

export function serviceConfigEntries(item: MyServiceDTO) {
  return Object.entries(item.configuration).filter(([, value]) => value);
}

export function hasServiceFacts(item: MyServiceDTO, showPhoneNumber: boolean) {
  return Boolean(
    item.service.usageCapLabel ||
      (item.externalPhoneNumber && showPhoneNumber) ||
      serviceConfigEntries(item).length > 0
  );
}

export function ServiceFacts({
  item,
  // Côté client, le numéro remonte dans le bloc « En direct » quand la
  // solution tourne : on ne le répète pas ici.
  showPhoneNumber = true,
}: {
  item: MyServiceDTO;
  showPhoneNumber?: boolean;
}) {
  return (
    <dl>
      {item.service.usageCapLabel && (
        <Fact label="Plafond d'usage">{item.service.usageCapLabel}</Fact>
      )}
      {item.externalPhoneNumber && showPhoneNumber && (
        <Fact label="Numéro de téléphone">
          <span className="tabular-nums">{item.externalPhoneNumber}</span>
        </Fact>
      )}
      {serviceConfigEntries(item).map(([key, value]) => {
        const field = item.service.configFields.find((f) => f.key === key);
        const displayValue =
          field?.type === "select" && typeof value === "string"
            ? (field.options?.find((o) => o.value === value)?.label ?? value)
            : formatConfigValue(value);
        return (
          <Fact key={key} label={field?.label ?? key}>
            {displayValue}
          </Fact>
        );
      })}
    </dl>
  );
}

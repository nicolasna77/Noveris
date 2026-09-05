import {
  CalendarCheck,
  CalendarClock,
  FileArchive,
  FileSearch,
  FileSignature,
  FileText,
  LifeBuoy,
  Mail,
  MessageCircle,
  MessageSquare,
  Mic,
  Phone,
  PhoneCall,
  ScanText,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

// Icône par prestation — partagée entre la landing page et les pages de
// détail /prestations/[slug] pour ne pas dupliquer la table.
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  "standard-telephonique-ia": PhoneCall,
  "prise-rdv-telephone": Phone,
  "assistant-whatsapp": MessageCircle,
  "assistant-messenger-instagram": MessageSquare,
  "reponses-emails": Mail,
  "prise-rdv-automatique": CalendarCheck,
  "devis-factures-bons-commande": FileText,
  "contrats-courriers-administratifs": ScrollText,
  "relance-impayes": CalendarClock,
  "signature-electronique": FileSignature,
  "archivage-intelligent": FileArchive,
  "resume-pdf": FileSearch,
  "resume-reunions": Mic,
  "ocr-lecture-automatique": ScanText,
  "support-prioritaire": LifeBuoy,
};

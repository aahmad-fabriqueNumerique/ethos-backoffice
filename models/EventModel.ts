import type { Timestamp } from "firebase/firestore";

export default interface EventModel {
  id: string;
  titre: string;
  description: string;
  dateDebut: string | Timestamp | Date;
  dateFin: string | Timestamp | Date;
  adresse: string;
  codePostal: string;
  ville: string;
  pays: string;
  image: string;
  type: string;
  participants?: string[];
  telephone: string;
  email: string;
  reseauxSociaux?: string[];
}

export interface EventUIModel
  extends Omit<EventModel, "dateDebut" | "dateFin"> {
  dateDebut: Date;
  dateFin: Date;
}

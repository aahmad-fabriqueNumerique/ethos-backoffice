import type SelectType from "~/models/SelectType";

export const useSelectTranslation = (category: string) => {
  const { t, te } = useI18n();

  // Display the event type with translation fallback
  const getTypeDisplay = (
    typeId: number,
    data: Array<SelectType>,
    code: string
  ) => {
    if (!typeId) return t(`${category}.placeholders.${code}`);

    const foundObject = data.find((et) => et.id === typeId);
    if (!foundObject) return t(`${category}.placeholders.${code}`);

    const translationKey = `data.${code}.${foundObject.nom}`;
    return te(translationKey) ? t(translationKey) : foundObject.nom;
  };

  return { getTypeDisplay };
};

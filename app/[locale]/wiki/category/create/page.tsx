import WikiCategoryCreateClient from "./WikiCategoryCreateClient";
import { getDictionary } from "@/lib/getDictionary";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function WikiCategoryCreatePage({ params }: Props) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return <WikiCategoryCreateClient locale={locale} dict={dict.categoryCreate} />;
}

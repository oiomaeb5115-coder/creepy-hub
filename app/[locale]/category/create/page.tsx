import { getDictionary } from "@/lib/getDictionary";
import CategoryCreateClient from "./CategoryCreateClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CategoryCreatePage({ params }: Props) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return <CategoryCreateClient locale={locale} dict={dict.categoryCreate} />;
}

import { redirect } from "next/navigation";
import StoryCreator from "@/components/StoryCreator";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewStoryPage({ params }: Props) {
  const { locale } = await params;

  return <StoryCreator locale={locale} />;
}

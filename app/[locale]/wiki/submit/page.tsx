import { getDictionary } from "@/lib/getDictionary";
import WikiSubmitClient from "./WikiSubmitClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function WikiSubmitPage({ params }: Props) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  const labels = {
    title: dict.wikiSubmit.titleLabel,
    subtitle: locale === "en" ? "Subtitle" : "サブタイトル",
    summary: dict.wikiSubmit.summaryLabel,
    pageType: dict.wikiSubmit.pageTypeLabel,
    thumbnailLabel: locale === "en" ? "Thumbnail Image" : "サムネイル画像",
    chapterTitle: locale === "en" ? "Chapter Title" : "章タイトル",
    chapterBody: dict.wikiSubmit.contentLabel,
    chapterImage: locale === "en" ? "Chapter Image (optional)" : "章の画像（任意）",
    addChapter: locale === "en" ? "+ Add Chapter" : "章を追加",
    moveUp: locale === "en" ? "↑" : "上へ",
    moveDown: locale === "en" ? "↓" : "下へ",
    deleteChapter: dict.common.delete,
    minChapterAlert: locale === "en" ? "At least one chapter is required." : "章は最低1つ必要です。",
    publishNow: locale === "en" ? "Publish immediately" : "すぐ公開する",
    submitPublish: dict.wikiSubmit.submitBtn,
    submitDraft: locale === "en" ? "Save as Draft" : "下書きを保存",
    submitting: dict.wikiSubmit.submitting,
    alertTitle: dict.wikiSubmit.errorTitleSlug,
    alertSummary: locale === "en" ? "Please enter a summary." : "概要を入力してください。",
    alertBody: dict.wikiSubmit.errorContent,
    alertLogin: locale === "en" ? "Login required." : "ログインが必要です。",
    alertThumbFail: locale === "en" ? "Thumbnail upload failed" : "サムネイルのアップロードに失敗しました",
    alertChapterImgFail: locale === "en" ? "Chapter image upload failed for chapter" : "章の画像アップロードに失敗しました: 章",
    alertSlugFail: locale === "en" ? "Could not generate a valid slug. Please adjust the title." : "有効な slug を生成できませんでした。タイトルを調整してください。",
    alertWikiFail: locale === "en" ? "Failed to create wiki" : "wiki作成に失敗しました",
    successPublished: locale === "en" ? "Wiki article published." : "wiki記事を公開しました。",
    successDraft: locale === "en" ? "Draft saved." : "下書きを保存しました。",
    draftNotice: dict.postDrawer.draftNotice,
    draftRestored: dict.postDrawer.draftRestored,
    deleteDraft: dict.postDrawer.deleteDraft,
    checkingAuth: dict.postDrawer.checkingAuth,
    uploading: locale === "en" ? "Uploading..." : "アップロード中...",
    breadcrumb: "ARCHIVE / WIKI / SUBMIT",
    headerTitle: dict.wikiSubmit.title,
    headerSubtitle: dict.wiki.subtitle,
    wikiList: dict.wiki.listTitle,
    home: dict.wiki.home,
    sectionTitle: dict.wikiSubmit.title,
    sectionDesc: locale === "en" ? "You can add images to the thumbnail and each chapter." : "サムネイル・各章に画像を追加できます。",
    chapterSection: locale === "en" ? "Chapter" : "章",
    categoryLabel: locale === "en" ? "Categories" : "カテゴリー",
    categoryNone: locale === "en" ? "No categories yet." : "カテゴリーがまだありません。",
    categoryCreate: locale === "en" ? "+ Create new category" : "+ カテゴリーを作成",
    pageTypes: {
      general: dict.pageType.general,
      urban_legend: dict.pageType.urban_legend,
      incident: dict.pageType.incident,
      work: dict.pageType.work,
      region: dict.pageType.region,
      term: dict.pageType.term,
      person: dict.pageType.person,
    },
  };

  return <WikiSubmitClient locale={locale} labels={labels} />;
}

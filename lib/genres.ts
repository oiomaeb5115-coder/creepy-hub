export type Genre = {
  id: number;
  slug: string;
  name: string;
  description: string;
};

export const genres: Genre[] = [
  {
    id: 1,
    slug: "kaidan",
    name: "怪談",
    description: "実話怪談・投稿怪談・古典的な恐怖譚を整理します。",
  },
  {
    id: 2,
    slug: "toshidensetsu",
    name: "都市伝説",
    description: "国内外の噂、ネットロア、現代の伝承をまとめます。",
  },
  {
    id: 3,
    slug: "sharekowa",
    name: "洒落怖",
    description: "匿名掲示板由来の名作や派生作品を追える入口です。",
  },
  {
    id: 4,
    slug: "creepypasta",
    name: "Creepypasta",
    description: "海外発のホラー創作、連載型アーカイブ向けの分類です。",
  },
  {
    id: 5,
    slug: "video",
    name: "映像記録",
    description: "アナログホラー、ARG、映像資料系の記録を収集します。",
  },
  {
    id: 6,
    slug: "analysis",
    name: "考察 / 解説",
    description: "作品解説、元ネタ考察、用語整理のためのジャンルです。",
  },
];
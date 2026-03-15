type Props = {
  html: string;
};

export default function AutoLinkedWikiContent({ html }: Props) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
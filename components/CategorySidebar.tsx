import Link from "next/link";
import styles from "./CategorySidebar.module.css";

export type CategoryItem = {
  slug: string;
  name: string;
  icon_url: string | null;
  href: string;
};

type Props = {
  title: string;
  categories: CategoryItem[];
  children?: React.ReactNode;
};

export default function CategorySidebar({ title, categories, children }: Props) {
  return (
    <aside className={styles.sidebar}>
      <p className={styles.sectionTitle}>{title}</p>
      <ul className={styles.list}>
        {categories.map((cat) => (
          <li key={cat.slug} className={styles.item}>
            <Link href={cat.href} className={styles.link}>
              <span className={styles.iconWrap}>
                {cat.icon_url ? (
                  <img
                    src={cat.icon_url}
                    alt={cat.name}
                    className={styles.icon}
                    loading="lazy"
                  />
                ) : (
                  <span className={styles.iconPlaceholder} />
                )}
              </span>
              <span className={styles.name}>{cat.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      {children}
    </aside>
  );
}

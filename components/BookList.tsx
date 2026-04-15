import { useHits } from 'react-instantsearch'
import { BookCard } from './BookCard'
import styles from './BookList.module.css'
export interface Book {
  objectID: string
  title: string
  authors: string[]
  publication_year: number
  average_rating: number
  image_url: string
  ratings_count: number
}

export const BookList = () => {
  const { items } = useHits<Book>()

  if (!items || items.length === 0) {
    return (
      <div className={styles.emptyState}>
        {items ? 'No books found. Try a different search term.' : 'Start typing to search for books.'}
      </div>
    )
  }

  return (
    <div className={styles.bookList}>
      {items.map(item => (
        <BookCard key={item.objectID} book={item as unknown as Book} />
      ))}
    </div>
  )
}

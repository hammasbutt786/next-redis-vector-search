import styles from './BookCard.module.css'
import { Book } from './BookList'

interface BookCardProps {
  book: Book
}

export const BookCard = ({ book }: BookCardProps) => {
  const { title, authors, publication_year, image_url, average_rating, ratings_count } = book

  return (
    <div className={styles.bookCard}>
      <div className={styles.bookImageContainer}>
        {image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image_url}
            alt={title}
            className={styles.bookImage}
            onError={e => {
              ;(e.target as HTMLImageElement).src = '/book-placeholder.png'
            }}
          />
        ) : (
          <div className={styles.noImage}>No Image</div>
        )}
      </div>
      <div className={styles.bookInfo}>
        <h3 className={styles.bookTitle}>{title}</h3>
        <p className={styles.bookAuthor}>By: {authors?.join(', ')}</p>
        {publication_year && <p className={styles.bookYear}>Published: {publication_year}</p>}
        <div className={styles.ratingContainer}>
          <div className={styles.starRating}>{'★'.repeat(Math.round(average_rating || 0))}</div>
          <span className={styles.ratingText}>
            {average_rating?.toFixed(1)} ({ratings_count?.toLocaleString()} ratings)
          </span>
        </div>
      </div>
    </div>
  )
}

import { SearchBox } from 'react-instantsearch'
import styles from './Searchbar.module.css'

export const SearchBar = () => {
  return (
    <div className={styles.searchContainer}>
      <h1 className={styles.searchTitle}>Book Search</h1>
      <SearchBox
        placeholder='Search for books by title or author...'
        classNames={{
          form: styles.searchForm,
          input: styles.searchInput,
          submit: styles.searchButton,
          reset: styles.resetButton,
        }}
        submitIconComponent={() => (
          <svg
            className={styles.searchIcon}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
            />
          </svg>
        )}
        resetIconComponent={() => (
          <svg
            className={styles.closeIcon}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
          </svg>
        )}
        loadingIconComponent={() => <div className={styles.loadingSpinner} />}
      />
    </div>
  )
}

import { InstantSearch } from 'react-instantsearch'
import { typesenseInstantSearchAdapter } from '../lib/instantSearchAdapter'
import Head from 'next/head'
import { SearchBar } from '@/components/SearchBar'
import { BookList } from '@/components/BookList'

export default function Home() {
  return (
    <div className='min-h-screen bg-gray-50 py-8 px-4'>
      <Head>
        <title>Book Search with TypeSense</title>
        <meta name='description' content='Search through our collection of books' />
      </Head>

      <div className='max-w-7xl mx-auto'>
        <InstantSearch
          searchClient={typesenseInstantSearchAdapter.searchClient}
          indexName={process.env.NEXT_PUBLIC_TYPESENSE_INDEX || 'books'}
        >
          <SearchBar />
          <BookList />
        </InstantSearch>
      </div>
    </div>
  )
}

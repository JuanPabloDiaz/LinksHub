import { useRef, useEffect, Ref } from 'react'
import { useRouter } from 'next/router'

import dynamic from 'next/dynamic'

const ShortcutKey = dynamic(() => import('./ShortcutKey'), { ssr: false })

import { SearchbarSuggestions } from './SearchbarSuggestions'
import { ErrorMessage } from 'components/ErrorMessage'

import { Icons } from 'components/icons'

import { SearchOption, SubCategories } from '../../types'
import { SearchbarAction } from './SearchbarReducer'
import { sidebarData } from 'database/data'
import { searchOptions as importedSearchOptions } from 'database/data'
import { useFuzzySearch } from '../../hooks/useFuzzySearch'

interface SearchbarProps {
  dispatchSearch: (action: SearchbarAction) => void
  searchQuery: string
  showSuggestions: boolean
  searchQueryIsValid: boolean
  inputRef: Ref<HTMLInputElement>
}

const SEARCH_ERROR_MSG = 'Please enter a valid search query'

export const Searchbar: React.FC<SearchbarProps> = ({
  dispatchSearch,
  searchQuery,
  showSuggestions,
  searchQueryIsValid,
  inputRef,
}) => {
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  
  // min value for fuzzy search is the input length
  const { search: fuzzySearch } = useFuzzySearch({ 
    data: importedSearchOptions,
    options: {
      threshold: 0.4,
      minMatchCharLength: searchQuery.length
    }
  })
  
  const suggestions = getFilteredSuggestions(searchQuery, fuzzySearch)

  // console.log('Suggestions to Render:', suggestions)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Dispatch the search query change
    dispatchSearch({
      type: 'search_query_change',
      searchQuery: e.target.value,
    })

    // Handle clearing search query and routing to home
    if (
      !e.target.value &&
      router.asPath != '/' &&
      router.asPath.substring(1, 7) == 'search'
    ) {
      searchQuery = ''
      router.push('/')
    }
  }

  const handleSuggestionClick = (suggestion: SubCategories) => {
    const searchQuery: SearchOption = {
      ...suggestion,
      category: sidebarData.find((item) =>
        item.subcategory.some((subCat) => subCat.name === suggestion.name)
      )?.category || '',
    }
  
    dispatchSearch({ type: 'suggestion_click', searchQuery: searchQuery.name })
    router.push(`/${searchQuery.category}${searchQuery.url}`)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // console.log('this is sidebar data', sidebarData)
    e.preventDefault()
    dispatchSearch({ type: 'submit' })
    const cleanedSearchQuery = searchQuery.toLocaleLowerCase().trim()

    if (cleanedSearchQuery !== '') {
      const { category } = sidebarData.find((item) =>
        item.subcategory.find((subCat) => subCat.name === cleanedSearchQuery)
      ) || { category: '' }

      if (category != '') {
        router.push(`/${category}/${cleanedSearchQuery}`)
      } else {
        router.push({
          pathname: '/search',
          query: {
            query: searchQuery,
          },
        })
      }
    }
  }

  useEffect(() => {
    const handleClickOutsideDropdown = (e: MouseEvent) => {
      if (!e.target) return
      
      if (formRef.current && formRef.current.contains(e.target as Node)) {
        return
      }
      
      dispatchSearch({ type: 'close_suggestions' })
    }

    document.addEventListener('mousedown', handleClickOutsideDropdown, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutsideDropdown, true)
    }
  }, [])

  return (
    <form
      data-custom="restrict-click-outside"
      noValidate
      ref={formRef}
      onSubmit={handleSubmit}
      role="search"
    >
      <div className="relative">
        <div className="relative w-full h-12 flex items-center justify-between border border border-theme-secondary/25 dark:border-none rounded-lg">
          <label htmlFor="simple-search" className="sr-only">
            Quick search
          </label>

          <input
            ref={inputRef}
            type="text"
            id="simple-search"
            name="simple-search"
            className="peer h-12 w-full flex items-center justify-start pl-[46px] pr-4 py-3 bg-slate-100 bg-opacity-50 dark:bg-zinc-400 dark:bg-opacity-20 rounded-[10px] outline-none hover:shadow-input-hover focus:shadow-input-focus dark:hover:shadow-input-hover-dark dark:focus:shadow-input-focus-dark"
            placeholder="Quick search..."
            value={searchQuery}
            onChange={handleSearchChange}
            autoComplete="off"
            required
          />

          <Icons.search className="h-5 w-5 absolute top-[14px] left-4 text-gray-400 peer-focus:text-primary dark:peer-focus:text-slate-100" />

          <ShortcutKey />
        </div>

        {suggestions.length > 0 && showSuggestions && (
          <SearchbarSuggestions
            suggestions={suggestions}
            onSuggestionClick={handleSuggestionClick}
          />
        )}
      </div>
      {!searchQueryIsValid && <ErrorMessage>{SEARCH_ERROR_MSG}</ErrorMessage>}
    </form>
  )
}

const getFilteredSuggestions = (query: string, fuzzySearchFn?: (query: string) => SearchOption[]) => {
  const normalisedQuery = query.trim().toLowerCase()

  // console.log('Search Query:', query)
  // console.log('Imported Search Options:', importedSearchOptions)

  if (normalisedQuery.length === 0) {
    // console.log('Query is empty, returning no suggestions.')
    return []
  }

  // Use fuzzy search if function is provided, otherwise fall back to exact matching
  if (fuzzySearchFn) {
    const fuzzyResults = fuzzySearchFn(normalisedQuery)
    // console.log('Fuzzy Search Results:', fuzzyResults)
    return fuzzyResults
  }

  // Fallback to original exact matching logic
  const suggestions = importedSearchOptions.filter((option) => {
    const optionName = option.name?.toLowerCase().trim()
    const categoryName = option.category?.toLowerCase().trim()

    // console.log('Checking Option:', { optionName, categoryName })

    return (
      (optionName && optionName.includes(normalisedQuery)) ||
      (categoryName && categoryName.includes(normalisedQuery))
    )
  })

  // console.log('Filtered Suggestions:', suggestions)

  return suggestions
}

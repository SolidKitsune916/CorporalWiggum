import { useEffect, useRef, useState } from 'react';
import { Trash2, Search, ArrowDown, ArrowUp } from 'lucide-react';

interface LogViewerProps {
  logs: string[];
  onClear: () => void;
  maxHeight?: string;
  showSearch?: boolean;
}

export function LogViewer({
  logs,
  onClear,
  maxHeight = '400px',
  showSearch = false,
}: LogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Handle search
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }

    const results: number[] = [];
    logs.forEach((log, index) => {
      if (log.toLowerCase().includes(searchTerm.toLowerCase())) {
        results.push(index);
      }
    });
    setSearchResults(results);
    setCurrentSearchIndex(0);
  }, [searchTerm, logs]);

  const handleScroll = () => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const scrollToSearchResult = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;

    let newIndex = currentSearchIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex =
        (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }

    setCurrentSearchIndex(newIndex);

    // Scroll to the result
    const lineElements = scrollRef.current?.querySelectorAll('.log-line');
    if (lineElements && lineElements[searchResults[newIndex]]) {
      lineElements[searchResults[newIndex]].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const highlightSearchTerm = (text: string, index: number) => {
    if (!searchTerm) return text;

    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    const isCurrentResult =
      searchResults.length > 0 && searchResults[currentSearchIndex] === index;

    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark
          key={i}
          className={`${isCurrentResult ? 'bg-yellow-400 text-black' : 'bg-yellow-200 text-black'}`}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getLogColor = (log: string) => {
    if (log.includes('[ERR]')) return 'text-red-400';
    if (log.includes('error') || log.includes('Error')) return 'text-red-400';
    if (log.includes('warning') || log.includes('Warning'))
      return 'text-yellow-400';
    if (log.includes('success') || log.includes('Success'))
      return 'text-green-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
        <h3 className="font-semibold text-foreground">Logs</h3>
        <div className="flex items-center gap-2">
          {showSearch && (
            <div className="flex items-center gap-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-2 py-1 text-sm bg-background border border-input rounded w-48"
                />
              </div>
              {searchResults.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">
                    {currentSearchIndex + 1}/{searchResults.length}
                  </span>
                  <button
                    onClick={() => scrollToSearchResult('prev')}
                    className="p-1 hover:bg-muted rounded"
                    title="Previous"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => scrollToSearchResult('next')}
                    className="p-1 hover:bg-muted rounded"
                    title="Next"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}
          <button
            onClick={onClear}
            className="p-1 hover:bg-muted rounded"
            title="Clear logs"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Log Content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="font-mono text-xs overflow-auto bg-[#1a1a1a]"
        style={{ maxHeight }}
      >
        {logs.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No logs yet. Start the loop to see output.
          </div>
        ) : (
          <div className="p-2">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`log-line py-0.5 ${getLogColor(log)} hover:bg-white/5`}
              >
                {showSearch ? highlightSearchTerm(log, index) : log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && logs.length > 0 && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }}
          className="w-full py-1 text-xs text-center bg-primary/10 text-primary hover:bg-primary/20"
        >
          Scroll to bottom
        </button>
      )}
    </div>
  );
}

import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const renderContent = (text: string) => {
    const elements: React.JSX.Element[] = [];
    const lines = text.split('\n');
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines but preserve spacing
      if (line.trim() === '') {
        elements.push(<div key={currentIndex++} className="h-2" />);
        continue;
      }

      // Handle separators (---)
      if (line.trim() === '---') {
        elements.push(<hr key={currentIndex++} className="my-4 border-gray-300" />);
        continue;
      }

      // Handle headers (order matters - check longer patterns first)
      if (line.startsWith('####')) {
        const text = line.replace(/^####\s*/, '');
        elements.push(
          <h4 key={currentIndex++} className="text-sm font-semibold text-gray-800 mt-3 mb-2">
            {formatInlineText(text)}
          </h4>
        );
        continue;
      }

      if (line.startsWith('###')) {
        const text = line.replace(/^###\s*/, '');
        elements.push(
          <h3 key={currentIndex++} className="text-base font-bold text-gray-900 mt-4 mb-3">
            {formatInlineText(text)}
          </h3>
        );
        continue;
      }

      if (line.startsWith('##')) {
        const text = line.replace(/^##\s*/, '');
        elements.push(
          <h2 key={currentIndex++} className="text-lg font-bold text-gray-900 mt-5 mb-3 border-b border-gray-200 pb-2">
            {formatInlineText(text)}
          </h2>
        );
        continue;
      }

      // Handle table detection
      if (line.includes('|') && i < lines.length - 1 && lines[i + 1].includes('|')) {
        const tableLines = [];
        let j = i;

        // Collect all table lines
        while (j < lines.length && lines[j].includes('|')) {
          tableLines.push(lines[j]);
          j++;
        }

        // Render table
        elements.push(renderTable(tableLines, currentIndex++));
        i = j - 1; // Skip processed lines
        continue;
      }

      // Handle list items
      if (line.trim().startsWith('- ')) {
        const text = line.replace(/^\s*-\s*/, '');
        elements.push(
          <li key={currentIndex++} className="text-sm text-gray-700 mb-1 ml-4 list-disc leading-relaxed">
            {formatInlineText(text)}
          </li>
        );
        continue;
      }

      // Handle regular paragraphs
      elements.push(
        <p key={currentIndex++} className="text-sm text-gray-700 mb-2 leading-relaxed">
          {formatInlineText(line)}
        </p>
      );
    }

    return elements;
  };

  const formatInlineText = (text: string): React.JSX.Element[] => {
    const parts: React.JSX.Element[] = [];
    let remaining = text;
    let keyIndex = 0;

    while (remaining.length > 0) {
      // Look for **bold** text
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);

      if (boldMatch) {
        const beforeBold = remaining.substring(0, boldMatch.index!);
        const boldText = boldMatch[1];
        const afterBold = remaining.substring(boldMatch.index! + boldMatch[0].length);

        // Add text before bold
        if (beforeBold) {
          parts.push(<span key={keyIndex++}>{beforeBold}</span>);
        }

        // Add bold text
        parts.push(
          <strong key={keyIndex++} className="font-semibold text-gray-900">
            {boldText}
          </strong>
        );

        remaining = afterBold;
      } else {
        // No more bold text, add remaining
        parts.push(<span key={keyIndex++}>{remaining}</span>);
        break;
      }
    }

    return parts;
  };

  const renderTable = (tableLines: string[], key: number): React.JSX.Element => {
    if (tableLines.length < 2) return <div key={key} />;

    // Parse header
    const headerCells = tableLines[0].split('|').map(cell => cell.trim()).filter(cell => cell);

    // Skip separator line (usually contains dashes)
    const dataRows = tableLines.slice(2);

    return (
      <div key={key} className="my-4 overflow-x-auto">
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {headerCells.map((header, index) => (
                <th
                  key={index}
                  className="px-3 py-2 text-left font-semibold text-gray-900 border-b border-gray-300"
                >
                  {formatInlineText(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {dataRows.map((row, rowIndex) => {
              const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
              return (
                <tr key={rowIndex} className="border-b border-gray-200">
                  {cells.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-3 py-2 text-gray-700 border-r border-gray-200 last:border-r-0"
                    >
                      {formatInlineText(cell)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="prose prose-sm max-w-none">
      {renderContent(content)}
    </div>
  );
}
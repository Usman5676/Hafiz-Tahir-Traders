import React from 'react';
import './UI.css';

export const Table = ({ columns, data, className = '' }) => {
  return (
    <div className={`table-container ${className}`}>
      <table className="modern-table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col, colIndex) => (
                <td key={colIndex}>
                  {col.cell ? col.cell(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-center py-4 text-secondary">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

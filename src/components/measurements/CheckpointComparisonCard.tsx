'use client';

import React from 'react';
import { Calendar, ArrowLeftRight, ArrowUpDown } from 'lucide-react';
import styles from '@/app/app/measurements/measurements.module.css';

export interface CheckpointRow {
  key: string;
  site: string;
  target_type: 'hypertrophy' | 'reduction' | 'neutral';
  val_a_cm: number | null;
  val_b_cm: number | null;
  diff_cm: number | null;
  diff_pct: number | null;
}

interface CheckpointComparisonCardProps {
  dates: string[];
  dateA: string;
  dateB: string;
  onDateAChange: (d: string) => void;
  onDateBChange: (d: string) => void;
  rows: CheckpointRow[];
  unit: 'cm' | 'in';
  sortField: 'site' | 'baseline' | 'latest' | 'change' | 'changePct';
  sortDirection: 'asc' | 'desc';
  onSort: (field: 'site' | 'baseline' | 'latest' | 'change' | 'changePct') => void;
}

export const CheckpointComparisonCard: React.FC<CheckpointComparisonCardProps> = ({
  dates,
  dateA,
  dateB,
  onDateAChange,
  onDateBChange,
  rows,
  unit,
  sortField,
  sortDirection,
  onSort,
}) => {
  const toDisplayValue = (valCm?: number | null) => {
    if (valCm === null || valCm === undefined || isNaN(valCm)) return '—';
    if (unit === 'cm') return valCm.toFixed(1);
    return (valCm / 2.54).toFixed(1);
  };

  const sortedRows = React.useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'site') cmp = a.site.localeCompare(b.site);
      else if (sortField === 'baseline') cmp = (a.val_a_cm ?? 0) - (b.val_a_cm ?? 0);
      else if (sortField === 'latest') cmp = (a.val_b_cm ?? 0) - (b.val_b_cm ?? 0);
      else if (sortField === 'change') cmp = (a.diff_cm ?? 0) - (b.diff_cm ?? 0);
      else if (sortField === 'changePct') cmp = (a.diff_pct ?? 0) - (b.diff_pct ?? 0);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [rows, sortField, sortDirection]);

  return (
    <div className={styles.bottomCard}>
      <div>
        <div className={styles.bottomCardHeader}>
          <div className={styles.bottomHeaderLeft}>
            <div className={styles.bottomIcon}>
              <Calendar size={18} color="#0f766e" />
            </div>
            <div>
              <h3 className={styles.bottomTitle}>Checkpoint Comparison</h3>
              <p className={styles.bottomSubtitle}>
                Compare measurements between two dates to analyze your progress.
              </p>
            </div>
          </div>

          <div className={styles.checkpointPickers}>
            <div className={styles.checkpointField}>
              <span className={styles.checkpointLabel}>Baseline:</span>
              <select
                value={dateA}
                onChange={(e) => onDateAChange(e.target.value)}
                className={styles.checkpointSelect}
              >
                {dates.map((d) => (
                  <option key={`a-${d}`} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.checkpointSwapIcon}>
              <ArrowLeftRight size={13} />
            </div>

            <div className={styles.checkpointField}>
              <span className={styles.checkpointLabel}>Latest:</span>
              <select
                value={dateB}
                onChange={(e) => onDateBChange(e.target.value)}
                className={styles.checkpointSelect}
              >
                {dates.map((d) => (
                  <option key={`b-${d}`} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th
                  className={`${styles.tableTh} ${styles.tableThSortable}`}
                  onClick={() => onSort('site')}
                >
                  Body Site
                  <ArrowUpDown size={11} className={styles.tableThSortIcon} />
                </th>
                <th
                  className={`${styles.tableTh} ${styles.tableThSortable}`}
                  onClick={() => onSort('baseline')}
                >
                  Baseline ({unit})
                  <ArrowUpDown size={11} className={styles.tableThSortIcon} />
                </th>
                <th
                  className={`${styles.tableTh} ${styles.tableThSortable}`}
                  onClick={() => onSort('latest')}
                >
                  Latest ({unit})
                  <ArrowUpDown size={11} className={styles.tableThSortIcon} />
                </th>
                <th
                  className={`${styles.tableTh} ${styles.tableThSortable}`}
                  onClick={() => onSort('change')}
                >
                  Change ({unit})
                  <ArrowUpDown size={11} className={styles.tableThSortIcon} />
                </th>
                <th
                  className={`${styles.tableTh} ${styles.tableThSortable}`}
                  onClick={() => onSort('changePct')}
                >
                  Change %
                  <ArrowUpDown size={11} className={styles.tableThSortIcon} />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                let changeColorClass = styles.tableTd;
                const diff = row.diff_cm ?? 0;
                if (diff > 0) {
                  changeColorClass = styles.tableTdDeltaGreen;
                } else if (diff < 0) {
                  changeColorClass = row.target_type === 'reduction' ? styles.tableTdDeltaTeal : styles.tableTdDeltaBlue;
                }

                const diffStr = row.diff_cm !== null
                  ? `${row.diff_cm > 0 ? '+' : ''}${toDisplayValue(row.diff_cm)} ${unit}`
                  : '—';

                const pctStr = row.diff_pct !== null
                  ? `${row.diff_pct > 0 ? '+' : ''}${row.diff_pct.toFixed(1)}%`
                  : '—';

                return (
                  <tr key={row.key} className={styles.tableTr}>
                    <td className={`${styles.tableTd} ${styles.tableTdSite}`}>{row.site}</td>
                    <td className={styles.tableTd}>{toDisplayValue(row.val_a_cm)}</td>
                    <td className={styles.tableTd}>{toDisplayValue(row.val_b_cm)}</td>
                    <td className={`${styles.tableTd} ${changeColorClass}`}>{diffStr}</td>
                    <td className={`${styles.tableTd} ${changeColorClass}`}>{pctStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

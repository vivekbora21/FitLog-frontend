'use client';

import React from 'react';
import { Calendar, Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { BodyMeasurement } from '@/lib/types';
import styles from '@/app/app/measurements/measurements.module.css';

interface HistoryLogCardProps {
  measurements: BodyMeasurement[];
  page: number;
  itemsPerPage: number;
  onPageChange: (p: number) => void;
  onAddLog: () => void;
  onEditLog: (m: BodyMeasurement) => void;
  onDeleteLog: (id: string) => void;
  unit: 'cm' | 'in';
}

export const HistoryLogCard: React.FC<HistoryLogCardProps> = ({
  measurements,
  page,
  itemsPerPage,
  onPageChange,
  onAddLog,
  onEditLog,
  onDeleteLog,
  unit,
}) => {
  const toDisplayValue = (valCm?: number | null) => {
    if (valCm === null || valCm === undefined || isNaN(valCm)) return '—';
    if (unit === 'cm') return valCm.toFixed(1);
    return (valCm / 2.54).toFixed(1);
  };

  const totalCount = measurements.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const paginated = React.useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return measurements.slice(start, start + itemsPerPage);
  }, [measurements, page, itemsPerPage]);

  return (
    <div className={styles.bottomCard}>
      <div>
        <div className={styles.bottomCardHeader}>
          <div className={styles.bottomHeaderLeft}>
            <div className={styles.bottomIcon}>
              <Calendar size={18} color="#0f766e" />
            </div>
            <div>
              <h3 className={styles.bottomTitle}>Check-in History Log</h3>
              <p className={styles.bottomSubtitle}>
                Full chronological log of your recorded body measurements.
              </p>
            </div>
          </div>

          <button className={styles.addLogBtn} onClick={onAddLog}>
            <Plus size={13} />
            <span>+ Add Log</span>
          </button>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.tableTh}>Date</th>
                <th className={styles.tableTh}>Shoulders</th>
                <th className={styles.tableTh}>Chest</th>
                <th className={styles.tableTh}>Waist</th>
                <th className={styles.tableTh}>Hips</th>
                <th className={styles.tableTh}>Arms</th>
                <th className={styles.tableTh}>Thighs</th>
                <th className={styles.tableTh}>Calves</th>
                <th className={styles.tableTh}>Neck</th>
                <th className={styles.tableTh}>Notes</th>
                <th className={styles.tableTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((m) => (
                <tr key={m.id} className={styles.tableTr}>
                  <td className={`${styles.tableTd} ${styles.tableTdDate}`}>{m.date}</td>
                  <td className={styles.tableTd}>{toDisplayValue(m.shoulders_cm)}</td>
                  <td className={styles.tableTd}>{toDisplayValue(m.chest_cm)}</td>
                  <td className={`${styles.tableTd} ${styles.tableTdWaistHighlight}`}>
                    {toDisplayValue(m.waist_cm)}
                  </td>
                  <td className={styles.tableTd}>{toDisplayValue(m.hips_cm)}</td>
                  <td className={styles.tableTd}>{toDisplayValue(m.arms_cm)}</td>
                  <td className={styles.tableTd}>{toDisplayValue(m.thighs_cm)}</td>
                  <td className={styles.tableTd}>{toDisplayValue(m.calves_cm)}</td>
                  <td className={styles.tableTd}>{toDisplayValue(m.neck_cm)}</td>
                  <td className={styles.tableTd}>{m.notes || '—'}</td>
                  <td className={styles.tableTd}>
                    <div className={styles.tableTdActions}>
                      <button
                        onClick={() => onEditLog(m)}
                        title="Edit log"
                        className={styles.actionIconBtn}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => onDeleteLog(m.id)}
                        title="Delete log"
                        className={styles.actionDeleteBtn}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className={styles.paginationFooter}>
          <span>
            Showing {paginated.length} of {totalCount} check-ins
          </span>

          <div className={styles.paginationControls}>
            <button
              className={styles.pageNavBtn}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={13} />
              <span>Previous</span>
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
              <button
                key={pg}
                onClick={() => onPageChange(pg)}
                className={`${styles.pageNumberBtn} ${page === pg ? styles.pageNumberBtnActive : ''}`}
              >
                {pg}
              </button>
            ))}

            <button
              className={styles.pageNavBtn}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              <span>Next</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

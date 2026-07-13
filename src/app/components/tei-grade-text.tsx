/**
 * Simple TEI grade text display with color coding for leaderboard.
 * Uses grade string (e.g., "V67") since leaderboard doesn't have full rating object.
 */

import styles from './tei-grade-text.module.scss';

interface TeiGradeTextProps {
  grade: string | number | null;
  className?: string;
}

const GRADE_NAMES: Record<string, string> = {
  E: 'Elite',
  V: 'Veteran',
  C: 'Consistent',
  I: 'Improving',
  P: 'Provisional',
};

export function TeiGradeText({ grade, className = '' }: TeiGradeTextProps) {
  if (grade === null || grade === undefined) {
    return <span className={className} aria-label="No rating">—</span>;
  }

  // Handle legacy numeric TEI (should be rare now)
  if (typeof grade === 'number') {
    return <span className={className} aria-label={`Rating ${grade}`}>{grade}</span>;
  }

  // Extract grade letter and number
  const gradeLetter = grade.charAt(0);
  const gradeScore = grade.slice(1);
  const gradeName = GRADE_NAMES[gradeLetter] || 'Unknown';
  const gradeClass = `grade-${gradeLetter.toLowerCase()}`;
  
  const ariaLabel = `${gradeName} grade, ${gradeScore} out of 99`;

  return (
    <span 
      className={`${styles.teiGrade} ${styles[gradeClass]} ${className}`} 
      title={`TEI Grade: ${grade}`}
      aria-label={ariaLabel}
      role="status"
    >
      <span aria-hidden="true">{grade}</span>
    </span>
  );
}

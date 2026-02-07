import { useStore } from '../../../store';
import { GRADE_THRESHOLDS } from '../../../shared/constants';

export function useCapability() {
  const capability = useStore((s) => s.capability);

  return {
    capability,
    gradeThreshold: capability ? GRADE_THRESHOLDS[capability.grade] || '' : '',
  };
}

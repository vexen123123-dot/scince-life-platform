// أنواع كتل المحتوى — تُستعمل في الدروس المضمّنة وفي جدول lesson_sections (jsonb)

export type ExerciseBlock =
  | {
      type: 'exercise';
      kind: 'classify';
      prompt: string;
      categories: string[];
      items: { text: string; category: number }[];
    }
  | {
      type: 'exercise';
      kind: 'match';
      prompt: string;
      pairs: [string, string][];
    }
  | {
      type: 'exercise';
      kind: 'truefalse';
      prompt: string;
      statements: { text: string; answer: boolean; why: string }[];
    }
  | {
      type: 'exercise';
      kind: 'order';
      prompt: string;
      steps: string[]; // بالترتيب الصحيح
    };

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'objectives'; items: string[] }
  | { type: 'definition'; term: string; text: string }
  | { type: 'table'; caption?: string; headers: string[]; rows: string[][] }
  | { type: 'callout'; tone: 'info' | 'tip' | 'warn' | 'extra'; title?: string; text: string }
  | { type: 'equation'; left: string; enzyme?: string; right: string; note?: string }
  | { type: 'experiment'; title: string; materials: string[]; steps: string[]; observe: string; conclude: string }
  | { type: 'figure'; id: 'pyramid' | 'digestive' | 'villus' | 'stomach' | 'liver-bile'; caption: string }
  | { type: 'conceptmap'; id: string }
  | { type: 'sim'; id: string; label: string }
  | ExerciseBlock;

export interface SectionContent {
  slug: string;
  title: string;
  blocks: Block[];
}

export interface LessonContent {
  slug: string;
  unitSlug: string;
  title: string;
  summary: string;
  position: number;
  sections: SectionContent[];
}

export interface UnitContent {
  slug: string;
  title: string;
  description: string;
  position: number;
}

export type QuestionKind =
  | 'mcq' | 'true_false' | 'fill_blank' | 'matching' | 'definition'
  | 'explain_why' | 'short_answer' | 'classification' | 'equation' | 'compare';

export interface BankQuestion {
  kind: QuestionKind;
  prompt: string;
  options?: unknown;
  answer_key: unknown;
  explanation: string;
  points?: number;
}

export interface QuizContent {
  slug: string;
  lessonSlug: string;
  title: string;
  description: string;
  questions: BankQuestion[];
}

export interface ConceptNode {
  id: string;
  label: string;
  detail: string;
  children?: string[];
}
export interface ConceptMapData {
  id: string;
  title: string;
  root: string;
  nodes: ConceptNode[];
}

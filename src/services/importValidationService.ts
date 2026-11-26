import type { FlexibleDate, GenealogyDatabaseSnapshot, Relationship } from '../models/genealogy';
import { daysInGregorianMonth } from '../utils/dateUtils';
import { validatePersonInput } from './validationService';

export interface ImportValidationResult {
  errors: string[];
  warnings: string[];
}

type RecordValue = Record<string, unknown>;
type FieldRule = (value: unknown) => boolean;
type RecordRules = Record<string, FieldRule>;
type Collection = Exclude<keyof GenealogyDatabaseSnapshot, 'app' | 'schemaVersion' | 'exportedAt' | 'settings'>;

const isString: FieldRule = (value) => typeof value === 'string';
const nonBlank: FieldRule = (value) => typeof value === 'string' && value.trim().length > 0;
const isBoolean: FieldRule = (value) => typeof value === 'boolean';
const version: FieldRule = (value) => value === 1;

function isRecord(value: unknown): value is RecordValue {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function optional(check: FieldRule): FieldRule {
  return (value) => value === undefined || check(value);
}

function arrayOf(check: FieldRule): FieldRule {
  return (value) => {
    if (!Array.isArray(value)) return false;
    for (const item of value) {
      if (!check(item)) return false;
    }
    return true;
  };
}

function oneOf(...values: string[]): FieldRule {
  return (value) => typeof value === 'string' && values.includes(value);
}

function integer(min: number, max = Number.MAX_SAFE_INTEGER): FieldRule {
  return (value) => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

const text = optional(isString);
const id = optional(nonBlank);
const ids = arrayOf(nonBlank);
const texts = arrayOf(isString);
const positiveInteger = optional(integer(1));

function timestamp(value: unknown): boolean {
  if (value === '') return true; // Older v1 snapshots can carry empty record timestamps.
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day] = match.map(Number);
  return day <= daysInGregorianMonth(month, year);
}

const flexibleDateRules: RecordRules = {
  precision: oneOf('exact', 'month', 'year', 'approx', 'before', 'after', 'unknown'),
  year: optional(integer(1, 9999)),
  month: optional(integer(1, 12)),
  day: optional(integer(1, 31)),
  displayText: text,
  calendar: optional(oneOf('solar', 'lunar')),
};

const lunarAnniversaryRules: RecordRules = {
  day: optional(integer(1, 30)),
  month: optional(integer(1, 12)),
  note: text,
};

function matchesFields(value: RecordValue, rules: RecordRules): boolean {
  return Object.entries(rules).every(([key, check]) => check(value[key]));
}

export function isValidFlexibleDate(value: unknown): value is FlexibleDate {
  if (!isRecord(value) || !matchesFields(value, flexibleDateRules)) return false;
  const { day, month, year, calendar } = value;
  if (typeof day !== 'number') return true;
  if (calendar === 'lunar') return day <= 30;
  if (typeof month !== 'number') return true;
  return day <= daysInGregorianMonth(month, typeof year === 'number' ? year : undefined);
}

function checkDatePrecision(date: FlexibleDate | undefined, path: string, warnings: string[]): void {
  if (!date) return;

  const { precision, year, month, day, displayText } = date;
  // v1 saved incomplete dates and left hidden fields behind on precision changes.
  // Historic backups keep their original precision and values.
  let issue: string | undefined;
  switch (precision) {
    case 'exact':
      if (year === undefined || month === undefined || day === undefined) issue = 'thiếu ngày, tháng hoặc năm';
      break;
    case 'month':
      if (year === undefined || month === undefined) issue = 'thiếu tháng hoặc năm';
      else if (day !== undefined) issue = 'có thêm trường ngày';
      break;
    case 'year':
      if (month !== undefined || day !== undefined) issue = 'có thêm trường tháng hoặc ngày';
      else if (year === undefined && !displayText?.trim()) issue = 'thiếu năm hoặc văn bản niên đại';
      break;
    case 'unknown':
      if (year !== undefined || month !== undefined || day !== undefined) issue = 'vẫn có trường ngày, tháng hoặc năm';
      break;
    case 'approx':
    case 'before':
    case 'after':
      // GEDCOM qualifiers can legitimately describe a year, month, or full date.
      if (day !== undefined && month === undefined) issue = 'có ngày nhưng thiếu tháng';
      else if (year === undefined && (month !== undefined || !displayText?.trim())) {
        issue = 'thiếu năm hoặc văn bản niên đại';
      }
  }
  if (issue) warnings.push(`${path}: precision "${precision}" ${issue}. Giữ nguyên giá trị đã nhập.`);
}

function mediaUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.trim() !== value || !value) return false;
  if (/^data:/i.test(value)) {
    const comma = value.indexOf(',');
    return comma >= 5 && comma < value.length - 1;
  }
  try {
    const url = new URL(value, 'https://backup.invalid/');
    return ['http:', 'https:', 'blob:'].includes(url.protocol);
  } catch {
    return false;
  }
}

const mimeType: FieldRule = (value) =>
  typeof value === 'string' && /^[a-z\d!#$&^_.+-]+\/[a-z\d!#$&^_.+-]+(?:;[^\r\n]+)?$/i.test(value);

const commonRecordRules: RecordRules = { id: nonBlank, createdAt: timestamp, updatedAt: timestamp };
const collections: Record<Collection, RecordRules> = {
  people: {
    fullName: nonBlank,
    gender: oneOf('male', 'female', 'unknown'),
    isLiving: isBoolean,
    portraitMediaId: id,
    portraitUrl: optional((value) => value === '' || mediaUrl(value)),
    commonName: text,
    tabooName: text,
    courtesyName: text,
    alias: text,
    birthDate: optional(isValidFlexibleDate),
    birthPlace: text,
    deathDate: optional(isValidFlexibleDate),
    deathPlace: text,
    ancestralHome: text,
    residence: text,
    occupation: text,
    biography: text,
    notes: text,
    generation: positiveInteger,
    branchId: id,
    secondaryBranchIds: optional(ids),
    subBranch: text,
    clanRole: text,
    deathAnniversaryLunar: optional((value) => isRecord(value) && matchesFields(value, lunarAnniversaryRules)),
    burialPlace: text,
    merits: text,
  },
  unions: {
    partnerIds: (value) => Array.isArray(value) && value.length >= 1 && value.length <= 2 && ids(value),
    marriageDate: optional(isValidFlexibleDate),
    marriagePlace: text,
    status: oneOf('married', 'widowed', 'divorced', 'separated', 'unknown'),
    marriageOrder: positiveInteger,
    notes: text,
  },
  relationships: {
    parentId: nonBlank,
    childId: nonBlank,
    unionId: id,
    lineageType: oneOf('biological', 'adoptive', 'step', 'unknown'),
    birthOrder: positiveInteger,
    notes: text,
  },
  lifeEvents: {
    personId: nonBlank,
    title: nonBlank,
    type: oneOf('birth', 'education', 'marriage', 'career', 'migration', 'contribution', 'death', 'other'),
    date: optional(isValidFlexibleDate),
    location: text,
    description: text,
  },
  media: {
    title: nonBlank,
    category: oneOf('portrait', 'historical_photo', 'document', 'letter', 'certificate', 'record', 'audio'),
    mimeType,
    dataUrl: mediaUrl,
    personIds: ids,
    description: text,
    dateLabel: text,
    fileName: text,
    fileSize: optional(integer(0)),
    branchId: id,
    storyContext: text,
  },
  stories: {
    title: nonBlank,
    content: isString,
    personIds: ids,
    mediaIds: ids,
    summary: text,
    periodLabel: text,
    branchId: id,
    recordedBy: text,
    category: optional(oneOf('historical_event', 'clan_memory', 'communal_rule', 'renovation_merit', 'general_note')),
    location: text,
    isPinned: optional(isBoolean),
    tags: optional(texts),
  },
  branches: {
    name: nonBlank,
    code: nonBlank,
    subBranches: texts,
    founderId: id,
    parentBranchId: id,
    originPlace: text,
    description: text,
    establishedPeriod: text,
  },
};

const settingRules: RecordRules = {
  id: oneOf('default'),
  clanName: isString,
  clanMotto: isString,
  ancestralHallLocation: isString,
  rootPersonId: id,
  schemaVersion: version,
  lastBackupAt: optional(timestamp),
  updatedAt: timestamp,
};

function checkFields(record: RecordValue, rules: RecordRules, path: string, errors: string[]): void {
  for (const [key, check] of Object.entries(rules)) {
    if (!check(record[key])) {
      const field = path ? `${path}.${key}` : key;
      errors.push(`${field} thiếu hoặc không hợp lệ.`);
    }
  }
}

function checkShape(input: unknown, errors: string[]): input is GenealogyDatabaseSnapshot {
  if (!isRecord(input)) {
    errors.push('Cấu trúc gốc của dữ liệu nhập không hợp lệ.');
    return false;
  }

  checkFields(input, { app: nonBlank, schemaVersion: version, exportedAt: timestamp }, '', errors);
  if (isRecord(input.settings)) {
    checkFields(input.settings, settingRules, 'settings', errors);
  } else {
    errors.push('settings phải là một đối tượng.');
  }

  for (const [collection, rules] of Object.entries(collections)) {
    const records = input[collection];
    if (!Array.isArray(records)) {
      errors.push(`${collection} phải là một danh sách.`);
      continue;
    }
    const seen = new Set<unknown>();
    for (const [index, record] of records.entries()) {
      const path = `${collection}[${index}]`;
      if (!isRecord(record)) {
        errors.push(`${path} phải là một đối tượng.`);
        continue;
      }
      checkFields(record, commonRecordRules, path, errors);
      checkFields(record, rules, path, errors);
      if (nonBlank(record.id)) {
        if (seen.has(record.id)) errors.push(`${path}.id trùng mã định danh "${record.id}".`);
        seen.add(record.id);
      }
    }
  }
  return errors.length === 0;
}

type Edge = { from: string; to: string; label: string };

function cycleErrors(edges: Edge[], graph: string, errors: string[]): void {
  const edgesByOrigin = new Map<string, Edge[]>();
  for (const edge of edges) {
    const items = edgesByOrigin.get(edge.from);
    if (items) items.push(edge);
    else edgesByOrigin.set(edge.from, [edge]);
  }

  // Iterative depth-first traversal keeps large trees off the JS call stack.
  const active = new Set<string>();
  const done = new Set<string>();
  for (const start of edgesByOrigin.keys()) {
    if (done.has(start)) continue;

    const stack = [{ id: start, next: 0 }];
    active.add(start);
    while (stack.length > 0) {
      const step = stack[stack.length - 1];
      const edge = edgesByOrigin.get(step.id)?.[step.next++];
      if (!edge) {
        stack.pop();
        active.delete(step.id);
        done.add(step.id);
      } else if (active.has(edge.to)) {
        errors.push(`${edge.label} tạo vòng lặp ${graph}.`);
      } else if (!done.has(edge.to)) {
        stack.push({ id: edge.to, next: 0 });
        active.add(edge.to);
      }
    }
  }
}

function checkReference(targets: Set<string>, value: string | undefined, path: string, errors: string[]): void {
  if (value !== undefined && !targets.has(value)) {
    errors.push(`${path} tham chiếu đến mã không tồn tại "${value}".`);
  }
}

function checkReferences(snapshot: GenealogyDatabaseSnapshot, result: ImportValidationResult): void {
  const { errors, warnings } = result;
  const people = new Set(snapshot.people.map((record) => record.id));
  const branches = new Set(snapshot.branches.map((record) => record.id));
  const media = new Set(snapshot.media.map((record) => record.id));
  const unions = new Map(snapshot.unions.map((record) => [record.id, record]));
  const unionIds = new Set(unions.keys());

  checkReference(people, snapshot.settings.rootPersonId, 'settings.rootPersonId', errors);
  for (const person of snapshot.people) {
    const path = `people[${person.id}]`;
    checkReference(branches, person.branchId, path + '.branchId', errors);
    for (const branchId of person.secondaryBranchIds ?? []) {
      checkReference(branches, branchId, path + '.secondaryBranchIds', errors);
    }
    checkReference(media, person.portraitMediaId, path + '.portraitMediaId', errors);
  }
  for (const branch of snapshot.branches) {
    const path = `branches[${branch.id}]`;
    checkReference(people, branch.founderId, path + '.founderId', errors);
    checkReference(branches, branch.parentBranchId, path + '.parentBranchId', errors);
  }
  for (const union of snapshot.unions) {
    for (const partnerId of union.partnerIds) {
      checkReference(people, partnerId, `unions[${union.id}].partnerIds`, errors);
    }
  }
  for (const relationship of snapshot.relationships) {
    const path = `relationships[${relationship.id}]`;
    checkReference(people, relationship.parentId, path + '.parentId', errors);
    checkReference(people, relationship.childId, path + '.childId', errors);
    checkReference(unionIds, relationship.unionId, path + '.unionId', errors);
    const union = relationship.unionId ? unions.get(relationship.unionId) : undefined;
    if (union && !union.partnerIds.includes(relationship.parentId)) {
      warnings.push(`${path} liên kết tới hôn phối không có người cha/mẹ được ghi nhận.`);
    }
  }
  for (const event of snapshot.lifeEvents) {
    checkReference(people, event.personId, `lifeEvents[${event.id}].personId`, errors);
  }
  for (const item of snapshot.media) {
    const path = `media[${item.id}]`;
    checkReference(branches, item.branchId, path + '.branchId', errors);
    for (const personId of item.personIds) checkReference(people, personId, path + '.personIds', errors);
  }
  for (const story of snapshot.stories) {
    const path = `stories[${story.id}]`;
    checkReference(branches, story.branchId, path + '.branchId', errors);
    for (const personId of story.personIds) checkReference(people, personId, path + '.personIds', errors);
    for (const mediaId of story.mediaIds) checkReference(media, mediaId, path + '.mediaIds', errors);
  }
}

function checkRelationshipGraph(relationships: Relationship[], result: ImportValidationResult): void {
  const edges: Edge[] = [];
  const seen = new Set<string>();
  for (const relationship of relationships) {
    const { id, parentId, childId, lineageType, unionId } = relationship;
    const path = `relationships[${id}]`;
    if (parentId === childId) {
      result.errors.push(`${path} không thể là quan hệ cha mẹ/con cái với chính mình.`);
      continue;
    }
    edges.push({ from: parentId, to: childId, label: path });
    const key = JSON.stringify([parentId, childId, lineageType, unionId]);
    if (seen.has(key)) {
      result.warnings.push(`${path} có cùng cha mẹ, con, loại quan hệ và hôn phối với một liên kết khác.`);
    }
    seen.add(key);
  }
  cycleErrors(edges, 'tổ tiên', result.errors);
}

/**
 * Validates a normalized v1 snapshot without altering values. Merge previews may
 * defer foreign keys until the database has supplied the live combined snapshot.
 */
export function validateImportSnapshot(
  input: unknown,
  { checkReferences: verifyReferences = true }: { checkReferences?: boolean } = {}
): ImportValidationResult {
  const result: ImportValidationResult = { errors: [], warnings: [] };
  if (!checkShape(input, result.errors)) return result;

  const branchEdges: Edge[] = [];
  for (const branch of input.branches) {
    if (!branch.parentBranchId) continue;
    const path = `branches[${branch.id}].parentBranchId`;
    if (branch.parentBranchId === branch.id) {
      result.errors.push(`${path} không thể trỏ đến chính chi họ đó.`);
    } else {
      branchEdges.push({ from: branch.id, to: branch.parentBranchId, label: path });
    }
  }
  cycleErrors(branchEdges, 'chi họ', result.errors);
  for (const union of input.unions) {
    checkDatePrecision(union.marriageDate, `unions[${union.id}].marriageDate`, result.warnings);
    if (new Set(union.partnerIds).size !== union.partnerIds.length) {
      result.errors.push(`unions[${union.id}].partnerIds chứa quan hệ hôn phối với chính mình.`);
    }
  }
  checkRelationshipGraph(input.relationships, result);
  if (verifyReferences) checkReferences(input, result);

  for (const event of input.lifeEvents) {
    checkDatePrecision(event.date, `lifeEvents[${event.id}].date`, result.warnings);
  }
  for (const person of input.people) {
    const path = `people[${person.id}]`;
    checkDatePrecision(person.birthDate, path + '.birthDate', result.warnings);
    checkDatePrecision(person.deathDate, path + '.deathDate', result.warnings);
    const review = validatePersonInput(person);
    for (const issue of [...review.errors, ...review.warnings]) {
      result.warnings.push(`${path} ${issue}`);
    }
    if (person.portraitUrl && !/^data:/i.test(person.portraitUrl)) {
      result.warnings.push(`${path}.portraitUrl phụ thuộc vào nguồn ảnh ngoài bản sao lưu.`);
    }
  }
  for (const item of input.media) {
    if (!/^data:/i.test(item.dataUrl)) {
      result.warnings.push(`media[${item.id}].dataUrl phụ thuộc vào nguồn tư liệu ngoài bản sao lưu.`);
    }
  }
  return result;
}

import {
  GenealogyDatabaseSnapshot,
  LineageType,
  Person,
  Relationship,
  Union,
} from '../models/genealogy';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PersonDeletionImpact {
  parentLinksCount: number;
  childLinksCount: number;
  unionsCount: number;
  eventsCount: number;
  linkedMediaCount: number;
  linkedStoriesCount: number;
}

export function wouldCreateAncestryCycle(
  parentId: string,
  childId: string,
  relationships: Relationship[],
  ignoreRelationshipId?: string
): boolean {
  if (parentId === childId) return true;

  const childrenByParent = new Map<string, string[]>();
  for (const rel of relationships) {
    if (ignoreRelationshipId && rel.id === ignoreRelationshipId) continue;
    const list = childrenByParent.get(rel.parentId) ?? [];
    list.push(rel.childId);
    childrenByParent.set(rel.parentId, list);
  }

  const visited = new Set<string>();
  const stack: string[] = [childId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === parentId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const children = childrenByParent.get(current) ?? [];
    for (const nextChild of children) {
      if (!visited.has(nextChild)) {
        stack.push(nextChild);
      }
    }
  }

  return false;
}

export function validatePersonInput(person: Partial<Person>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!person.fullName || person.fullName.trim().length < 2) {
    errors.push('Vui lòng nhập Họ và tên thành viên (ít nhất 2 ký tự).');
  }

  const bYear = person.birthDate?.year;
  const dYear = person.deathDate?.year;

  if (bYear && (bYear < 1000 || bYear > 2100)) {
    warnings.push(`Năm sinh (${bYear}) nằm ngoài khoảng lịch sử thông thường (1000 – 2100).`);
  }
  if (dYear && (dYear < 1000 || dYear > 2100)) {
    warnings.push(`Năm mất (${dYear}) nằm ngoài khoảng lịch sử thông thường (1000 – 2100).`);
  }
  if (bYear && dYear && dYear < bYear) {
    errors.push(`Năm mất (${dYear}) không thể nhỏ hơn năm sinh (${bYear}).`);
  }
  if (person.isLiving && dYear) {
    warnings.push('Thành viên đang để trạng thái "Còn sống" nhưng lại có thông tin năm mất.');
  }
  if (person.generation !== undefined && (person.generation < 1 || person.generation > 100)) {
    errors.push('Đời thứ phải là số nguyên dương hợp lệ (từ 1 trở lên).');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateParentChildRelationship(params: {
  parentId: string;
  childId: string;
  lineageType: LineageType;
  people: Person[];
  relationships: Relationship[];
  editingRelationshipId?: string;
}): ValidationResult {
  const { parentId, childId, lineageType, people, relationships, editingRelationshipId } = params;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!parentId || !childId) {
    errors.push('Vui lòng chọn đầy đủ cha/mẹ và con.');
    return { valid: false, errors, warnings };
  }

  if (parentId === childId) {
    errors.push('Một thành viên không thể là cha/mẹ của chính mình.');
    return { valid: false, errors, warnings };
  }

  const parent = people.find((p) => p.id === parentId);
  const child = people.find((p) => p.id === childId);
  if (!parent || !child) {
    errors.push('Không tìm thấy hồ sơ thành viên trong cơ sở dữ liệu.');
    return { valid: false, errors, warnings };
  }

  const duplicate = relationships.find(
    (r) =>
      r.id !== editingRelationshipId &&
      r.parentId === parentId &&
      r.childId === childId
  );
  if (duplicate) {
    errors.push(`Quan hệ cha/mẹ – con giữa "${parent.fullName}" và "${child.fullName}" đã tồn tại.`);
  }

  if (wouldCreateAncestryCycle(parentId, childId, relationships, editingRelationshipId)) {
    errors.push(
      `Không thể thiết lập quan hệ này vì sẽ tạo vòng lặp huyết thống ("${parent.fullName}" đang là hậu duệ của "${child.fullName}").`
    );
  }

  if (lineageType === 'biological') {
    const existingBioParents = relationships.filter(
      (r) =>
        r.id !== editingRelationshipId &&
        r.childId === childId &&
        r.lineageType === 'biological'
    );
    if (existingBioParents.length >= 2) {
      warnings.push(
        `"${child.fullName}" đã có ${existingBioParents.length} cha/mẹ ruột được ghi nhận. Hãy kiểm tra lại xem đây là quan hệ Cha/Mẹ ruột, Cha/Mẹ nuôi hay Kế phụ/Kế mẫu.`
      );
    }
  }

  const parentBirth = parent.birthDate?.year;
  const childBirth = child.birthDate?.year;
  if (parentBirth && childBirth) {
    if (childBirth <= parentBirth) {
      warnings.push(
        `Cảnh báo niên đại: Năm sinh của con (${childBirth}) sớm hơn hoặc bằng năm sinh của cha/mẹ (${parentBirth}).`
      );
    } else if (lineageType === 'biological' && childBirth - parentBirth < 13) {
      warnings.push(
        `Cảnh báo niên đại: Khoảng cách tuổi giữa cha/mẹ (${parentBirth}) và con ruột (${childBirth}) chỉ ${childBirth - parentBirth} năm.`
      );
    }
  }

  if (parent.generation && child.generation && child.generation <= parent.generation) {
    warnings.push(
      `Cảnh báo thế thứ: Con đang ghi Đời thứ ${child.generation}, trong khi cha/mẹ ghi Đời thứ ${parent.generation}.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateSpouseUnion(params: {
  personAId: string;
  personBId: string;
  people: Person[];
  unions: Union[];
  relationships: Relationship[];
  editingUnionId?: string;
}): ValidationResult {
  const { personAId, personBId, people, unions, relationships, editingUnionId } = params;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!personAId || !personBId) {
    errors.push('Vui lòng chọn hai thành viên cho quan hệ hôn phối.');
    return { valid: false, errors, warnings };
  }

  if (personAId === personBId) {
    errors.push('Không thể tạo quan hệ vợ/chồng với chính mình.');
    return { valid: false, errors, warnings };
  }

  const personA = people.find((p) => p.id === personAId);
  const personB = people.find((p) => p.id === personBId);
  if (!personA || !personB) {
    errors.push('Không tìm thấy hồ sơ thành viên.');
    return { valid: false, errors, warnings };
  }

  const duplicate = unions.find((u) => {
    if (editingUnionId && u.id === editingUnionId) return false;
    return u.partnerIds.includes(personAId) && u.partnerIds.includes(personBId);
  });
  if (duplicate) {
    errors.push(`Quan hệ hôn phối giữa "${personA.fullName}" và "${personB.fullName}" đã được ghi nhận.`);
  }

  if (
    wouldCreateAncestryCycle(personAId, personBId, relationships) ||
    wouldCreateAncestryCycle(personBId, personAId, relationships)
  ) {
    errors.push('Không thể tạo quan hệ hôn phối trực tiếp giữa hai người có quan hệ tổ tiên – hậu duệ.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getPersonDeletionImpact(
  personId: string,
  snapshot: GenealogyDatabaseSnapshot
): PersonDeletionImpact {
  return {
    parentLinksCount: snapshot.relationships.filter((r) => r.childId === personId).length,
    childLinksCount: snapshot.relationships.filter((r) => r.parentId === personId).length,
    unionsCount: snapshot.unions.filter((u) => u.partnerIds.includes(personId)).length,
    eventsCount: snapshot.lifeEvents.filter((e) => e.personId === personId).length,
    linkedMediaCount: snapshot.media.filter((m) => m.personIds.includes(personId)).length,
    linkedStoriesCount: snapshot.stories.filter((s) => s.personIds.includes(personId)).length,
  };
}

export function auditDatabaseIntegrity(snapshot: GenealogyDatabaseSnapshot): string[] {
  const issues: string[] = [];
  const personIds = new Set(snapshot.people.map((p) => p.id));

  for (const rel of snapshot.relationships) {
    if (!personIds.has(rel.parentId) || !personIds.has(rel.childId)) {
      issues.push(`Liên kết quan hệ (${rel.id}) tham chiếu tới thành viên không tồn tại.`);
    }
    if (rel.parentId === rel.childId) {
      issues.push(`Phát hiện lỗi tự tham chiếu cha-con tại bản ghi (${rel.id}).`);
    }
  }

  for (const p of snapshot.people) {
    if (p.birthDate?.year && p.deathDate?.year && p.deathDate.year < p.birthDate.year) {
      issues.push(`Hồ sơ "${p.fullName}" có năm mất (${p.deathDate.year}) nhỏ hơn năm sinh (${p.birthDate.year}).`);
    }
  }

  return issues;
}

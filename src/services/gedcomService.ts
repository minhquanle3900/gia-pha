import {
  FamilyBranch,
  FlexibleDate,
  GenealogyDatabaseSnapshot,
  LineageType,
  Person,
  Relationship,
  Union,
} from '../models/genealogy';
import { generateId, normalizeVietnameseText } from '../utils/dateUtils';

const GEDCOM_MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

export interface GedcomImportPreview {
  valid: boolean;
  errors: string[];
  warnings: string[];
  unsupportedTags: string[];
  duplicatePeople: Array<{ importedName: string; existingName: string; birthYear?: number }>;
  snapshot: GenealogyDatabaseSnapshot;
  stats: {
    individualsCount: number;
    familiesCount: number;
    relationshipsCount: number;
    branchesCount: number;
  };
}

function splitVietnameseName(fullName: string): { surname: string; givenName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { surname: '', givenName: 'Không rõ' };
  if (parts.length === 1) return { surname: '', givenName: parts[0] };
  return {
    surname: parts[0],
    givenName: parts.slice(1).join(' '),
  };
}

function formatGedcomDate(date?: FlexibleDate): string | null {
  if (!date || date.precision === 'unknown') {
    return null;
  }
  const m = date.month && date.month >= 1 && date.month <= 12 ? GEDCOM_MONTHS[date.month - 1] : '';
  const d = date.day ? String(date.day) : '';
  const y = date.year ? String(date.year) : '';

  if (!y) return null;

  switch (date.precision) {
    case 'exact':
      if (d && m && y) return `${d} ${m} ${y}`;
      if (m && y) return `${m} ${y}`;
      return y;
    case 'month':
      if (m && y) return `${m} ${y}`;
      return y;
    case 'year':
      return y;
    case 'approx':
      return `ABT ${y}`;
    case 'before':
      return `BEF ${y}`;
    case 'after':
      return `AFT ${y}`;
    default:
      return y;
  }
}

function parseGedcomDate(raw: string, label: string, warnings: string[]): FlexibleDate {
  const cleaned = raw.trim();
  const body = cleaned.replace(/^@#DGREGORIAN@\s+/i, '').toUpperCase();
  const match = body.match(/^(?:(ABT|EST|CAL|BEF|AFT)\s+)?(?:(?:(\d{1,2})\s+)?([A-Z]{3})\s+)?(\d{1,4})$/);
  const month = match?.[3] ? GEDCOM_MONTHS.indexOf(match[3]) + 1 : undefined;
  if (!match || month === 0) {
    warnings.push(`${label}: giữ nguyên văn bản ngày GEDCOM vì định dạng không được hỗ trợ.`);
    return { precision: 'unknown', displayText: cleaned };
  }

  const [, qualifier, rawDay, , rawYear] = match;
  const day = rawDay === undefined ? undefined : Number(rawDay);
  const precision = qualifier === 'BEF' ? 'before' : qualifier === 'AFT' ? 'after'
    : qualifier ? 'approx' : day !== undefined ? 'exact' : month ? 'month' : 'year';
  return { precision, day, month, year: Number(rawYear), displayText: cleaned };
}

function writeMultilineTag(lines: string[], level: number, tag: string, value?: string) {
  if (!value || !value.trim()) return;
  const paragraphs = value.replace(/\r\n/g, '\n').split('\n');
  paragraphs.forEach((para, idx) => {
    if (idx === 0) {
      lines.push(`${level} ${tag} ${para}`);
    } else {
      lines.push(`${level + 1} CONT ${para}`);
    }
  });
}

export function exportToGedcom551(snapshot: GenealogyDatabaseSnapshot): string {
  const lines: string[] = [];
  const now = new Date();
  const gedNow = `${now.getDate()} ${GEDCOM_MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  const indiXref = new Map<string, string>();
  snapshot.people.forEach((p, idx) => {
    indiXref.set(p.id, `@I${idx + 1}@`);
  });

  interface GedFamily {
    xref: string;
    unionId?: string;
    husbId?: string;
    wifeId?: string;
    children: Array<{ childId: string; lineageType: LineageType }>;
    marriageDate?: FlexibleDate;
    marriagePlace?: string;
    notes?: string;
  }

  const families: GedFamily[] = [];
  const unionToGedFam = new Map<string, GedFamily>();
  const personById = new Map(snapshot.people.map((p) => [p.id, p]));
  const branchById = new Map(snapshot.branches.map((b) => [b.id, b]));

  snapshot.unions.forEach((u, idx) => {
    let husbId: string | undefined;
    let wifeId: string | undefined;
    for (const pid of u.partnerIds) {
      const p = personById.get(pid);
      if (!p) continue;
      if (p.gender === 'male' && !husbId) husbId = pid;
      else if (p.gender === 'female' && !wifeId) wifeId = pid;
      else if (!husbId) husbId = pid;
      else if (!wifeId) wifeId = pid;
    }

    const fam: GedFamily = {
      xref: `@F${idx + 1}@`,
      unionId: u.id,
      husbId,
      wifeId,
      children: [],
      marriageDate: u.marriageDate,
      marriagePlace: u.marriagePlace,
      notes: u.notes,
    };
    families.push(fam);
    unionToGedFam.set(u.id, fam);
  });

  const orphanParentFam = new Map<string, GedFamily>();
  for (const rel of snapshot.relationships) {
    if (!indiXref.has(rel.parentId) || !indiXref.has(rel.childId)) continue;

    let targetFam: GedFamily | undefined;
    if (rel.unionId && unionToGedFam.has(rel.unionId)) {
      targetFam = unionToGedFam.get(rel.unionId);
    } else {
      targetFam = families.find(
        (f) =>
          (f.husbId === rel.parentId && !f.wifeId) ||
          (f.wifeId === rel.parentId && !f.husbId)
      );
      if (!targetFam) {
        const existingOrphan = orphanParentFam.get(rel.parentId);
        if (existingOrphan) {
          targetFam = existingOrphan;
        } else {
          const parent = personById.get(rel.parentId);
          const newFam: GedFamily = {
            xref: `@F${families.length + 1}@`,
            husbId: parent?.gender !== 'female' ? rel.parentId : undefined,
            wifeId: parent?.gender === 'female' ? rel.parentId : undefined,
            children: [],
          };
          families.push(newFam);
          orphanParentFam.set(rel.parentId, newFam);
          targetFam = newFam;
        }
      }
    }

    if (targetFam && !targetFam.children.some((c) => c.childId === rel.childId)) {
      targetFam.children.push({
        childId: rel.childId,
        lineageType: rel.lineageType,
      });
    }
  }

  const famsByPerson = new Map<string, string[]>();
  const famcByPerson = new Map<string, Array<{ xref: string; lineageType: LineageType }>>();

  for (const fam of families) {
    for (const pid of [fam.husbId, fam.wifeId]) {
      if (!pid) continue;
      const list = famsByPerson.get(pid) ?? [];
      list.push(fam.xref);
      famsByPerson.set(pid, list);
    }
    for (const ch of fam.children) {
      const list = famcByPerson.get(ch.childId) ?? [];
      list.push({ xref: fam.xref, lineageType: ch.lineageType });
      famcByPerson.set(ch.childId, list);
    }
  }

  lines.push('0 HEAD');
  lines.push('1 SOUR GIA_PHA_VIET_COI_NGUON');
  lines.push('2 NAME Gia Phả Việt – Cội Nguồn');
  lines.push('2 VERS 1.0.0');
  lines.push(`1 DATE ${gedNow}`);
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');
  lines.push('1 LANG Vietnamese');
  writeMultilineTag(lines, 1, 'NOTE', `${snapshot.settings.clanName} - ${snapshot.settings.clanMotto}`);

  for (const p of snapshot.people) {
    const xref = indiXref.get(p.id)!;
    lines.push(`0 ${xref} INDI`);

    const { surname, givenName } = splitVietnameseName(p.fullName);
    const gedName = surname ? `${givenName} /${surname}/` : givenName;
    lines.push(`1 NAME ${gedName}`);
    if (givenName) lines.push(`2 GIVN ${givenName}`);
    if (surname) lines.push(`2 SURN ${surname}`);
    if (p.commonName) lines.push(`2 NICK ${p.commonName}`);

    const sexCode = p.gender === 'male' ? 'M' : p.gender === 'female' ? 'F' : 'U';
    lines.push(`1 SEX ${sexCode}`);

    const bDateStr = formatGedcomDate(p.birthDate);
    if (bDateStr || p.birthPlace) {
      lines.push('1 BIRT');
      if (bDateStr) lines.push(`2 DATE ${bDateStr}`);
      if (p.birthPlace) lines.push(`2 PLAC ${p.birthPlace}`);
    }

    if (!p.isLiving) {
      lines.push('1 DEAT Y');
      const dDateStr = formatGedcomDate(p.deathDate);
      if (dDateStr) lines.push(`2 DATE ${dDateStr}`);
      if (p.deathPlace) lines.push(`2 PLAC ${p.deathPlace}`);
    }

    if (p.burialPlace) {
      lines.push('1 BURI');
      lines.push(`2 PLAC ${p.burialPlace}`);
    }

    if (p.occupation) {
      lines.push(`1 OCCU ${p.occupation}`);
    }

    if (p.residence) {
      lines.push('1 RESI');
      lines.push(`2 PLAC ${p.residence}`);
    }

    if (p.generation !== undefined) lines.push(`1 _GEN ${p.generation}`);
    if (p.branchId && branchById.has(p.branchId)) {
      lines.push(`1 _BRAN ${branchById.get(p.branchId)!.name}`);
    }
    if (p.subBranch) lines.push(`1 _SUBB ${p.subBranch}`);
    if (p.clanRole) lines.push(`1 _ROLE ${p.clanRole}`);
    if (p.tabooName) lines.push(`1 _TABOO ${p.tabooName}`);
    if (p.courtesyName) lines.push(`1 _COURTESY ${p.courtesyName}`);
    if (p.alias) lines.push(`1 _ALIAS ${p.alias}`);
    if (p.ancestralHome) lines.push(`1 _ANCESTRAL ${p.ancestralHome}`);
    if (p.deathAnniversaryLunar?.day && p.deathAnniversaryLunar?.month) {
      const lunarStr = `${p.deathAnniversaryLunar.day}/${p.deathAnniversaryLunar.month}${
        p.deathAnniversaryLunar.note ? ` | ${p.deathAnniversaryLunar.note}` : ''
      }`;
      lines.push(`1 _LUNAR_GIO ${lunarStr}`);
    }
    if (p.merits) {
      writeMultilineTag(lines, 1, '_MERIT', p.merits);
    }
    if (p.biography) {
      writeMultilineTag(lines, 1, 'NOTE', p.biography);
    }

    const famcs = famcByPerson.get(p.id) ?? [];
    for (const fc of famcs) {
      lines.push(`1 FAMC ${fc.xref}`);
      if (fc.lineageType === 'adoptive') lines.push('2 PEDI adopted');
      else if (fc.lineageType === 'step') lines.push('2 PEDI foster');
      else if (fc.lineageType === 'biological') lines.push('2 PEDI birth');
    }

    const famss = famsByPerson.get(p.id) ?? [];
    for (const fs of famss) {
      lines.push(`1 FAMS ${fs}`);
    }
  }

  for (const fam of families) {
    lines.push(`0 ${fam.xref} FAM`);
    if (fam.husbId && indiXref.has(fam.husbId)) {
      lines.push(`1 HUSB ${indiXref.get(fam.husbId)!}`);
    }
    if (fam.wifeId && indiXref.has(fam.wifeId)) {
      lines.push(`1 WIFE ${indiXref.get(fam.wifeId)!}`);
    }
    for (const ch of fam.children) {
      if (indiXref.has(ch.childId)) {
        lines.push(`1 CHIL ${indiXref.get(ch.childId)!}`);
      }
    }
    const mDate = formatGedcomDate(fam.marriageDate);
    if (mDate || fam.marriagePlace) {
      lines.push('1 MARR');
      if (mDate) lines.push(`2 DATE ${mDate}`);
      if (fam.marriagePlace) lines.push(`2 PLAC ${fam.marriagePlace}`);
    }
    if (fam.notes) {
      writeMultilineTag(lines, 1, 'NOTE', fam.notes);
    }
  }

  lines.push('0 TRLR');
  return lines.join('\n');
}

interface GedNode {
  lineNumber: number;
  level: number;
  xref?: string;
  tag: string;
  value: string;
  children: GedNode[];
}

const SUPPORTED_INDI_TAGS = new Set([
  'NAME',
  'SEX',
  'BIRT',
  'DEAT',
  'BURI',
  'OCCU',
  'RESI',
  'NOTE',
  'FAMC',
  'FAMS',
  '_GEN',
  '_BRAN',
  '_SUBB',
  '_ROLE',
  '_TABOO',
  '_COURTESY',
  '_ALIAS',
  '_ANCESTRAL',
  '_LUNAR_GIO',
  '_MERIT',
]);

const SUPPORTED_FAM_TAGS = new Set(['HUSB', 'WIFE', 'CHIL', 'MARR', 'DIV', 'NOTE']);
const TEXT_CONTINUATIONS = ['CONT', 'CONC'];
const INDI_CHILD_TAGS: Record<string, string[]> = {
  NAME: ['GIVN', 'SURN', 'NICK'],
  BIRT: ['DATE', 'PLAC'],
  DEAT: ['DATE', 'PLAC'],
  BURI: ['PLAC'],
  RESI: ['PLAC', 'ADDR'],
  FAMC: ['PEDI'],
  OCCU: TEXT_CONTINUATIONS,
  NOTE: TEXT_CONTINUATIONS,
  _MERIT: TEXT_CONTINUATIONS,
};

function noteUnsupportedChildren(
  node: GedNode,
  prefix: string,
  supported: string[],
  unsupported: Set<string>,
  warnings: string[]
): void {
  const seen = new Set<string>();
  for (const child of node.children) {
    if (!supported.includes(child.tag)) {
      unsupported.add(`${prefix}.${child.tag}`);
    } else {
      if (prefix !== 'INDI.RESI' && !TEXT_CONTINUATIONS.includes(child.tag) && seen.has(child.tag)) {
        warnings.push(`Dòng ${child.lineNumber}: ${prefix} có nhiều thẻ ${child.tag}; chỉ lưu được giá trị đầu.`);
      }
      seen.add(child.tag);
      const continuations = ['PLAC', 'ADDR'].includes(child.tag) ? TEXT_CONTINUATIONS : [];
      for (const nested of child.children) {
        if (!continuations.includes(nested.tag)) unsupported.add(`${prefix}.${child.tag}.${nested.tag}`);
      }
    }
  }
}


function extractNodeText(node: GedNode): string {
  let result = node.value;
  for (const child of node.children) {
    if (child.tag === 'CONT') {
      result += `\n${child.value}`;
    } else if (child.tag === 'CONC') {
      result += child.value;
    }
  }
  return result.trim();
}

function reconstructVietnameseFullName(rawName: string, givn?: string, surn?: string): string {
  const match = rawName.match(/^(.*?)\/([^/]*)\/(.*)$/);
  if (match) {
    const before = match[1].trim();
    const surname = (surn || match[2]).trim();
    const after = match[3].trim();
    const given = (givn || [before, after].filter(Boolean).join(' ')).trim();
    return [surname, given].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }
  if (surn && givn) {
    return `${surn} ${givn}`.trim();
  }
  return rawName.replace(/\//g, '').trim() || 'Thành viên chưa rõ tên';
}

export function parseAndPreviewGedcom(
  rawGedcom: string,
  existingSnapshot?: GenealogyDatabaseSnapshot
): GedcomImportPreview {
  const emptySnapshot: GenealogyDatabaseSnapshot = {
    app: 'Gia Phả Việt – Cội Nguồn',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: {
      ...(existingSnapshot?.settings ?? {
        id: 'default',
        clanName: 'Gia Phả Nhập Từ GEDCOM',
        clanMotto: 'Uống nước nhớ nguồn',
        ancestralHallLocation: 'Việt Nam',
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
      }),
      rootPersonId: undefined,
    },
    branches: [],
    people: [],
    unions: [],
    relationships: [],
    lifeEvents: [],
    media: [],
    stories: [],
  };

  const rawLines = rawGedcom.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const rootNodes: GedNode[] = [];
  const stack: GedNode[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const xrefs = new Set<string>();

  for (let index = 0; index < rawLines.length; index++) {
    const line = rawLines[index].trimEnd();
    if (!line.trim()) continue;
    const lineNumber = index + 1;
    const match = line.match(/^(\d+)\s+(?:(@[^@\s]+@)\s+)?([A-Za-z0-9_]+)(?:\s+(.*))?$/);
    if (!match) {
      errors.push(`Dòng GEDCOM ${lineNumber} không đúng cú pháp.`);
      continue;
    }

    const [, rawLevel, xref, rawTag, value = ''] = match;
    const level = Number(rawLevel);
    const tag = rawTag.toUpperCase();
    const node: GedNode = { lineNumber, level, xref, tag, value, children: [] };

    if (level === 0) {
      if (xref && xrefs.has(xref)) errors.push(`Dòng GEDCOM ${lineNumber}: mã bản ghi ${xref} bị trùng.`);
      if (xref) xrefs.add(xref);
      if ((tag === 'INDI' || tag === 'FAM') && !xref) {
        errors.push(`Dòng GEDCOM ${lineNumber}: bản ghi ${tag} thiếu mã định danh.`);
      }
      rootNodes.push(node);
      stack.length = 0;
    } else {
      while (stack.length > 0 && stack[stack.length - 1].level >= level) stack.pop();
      const parent = stack[stack.length - 1];
      if (!parent || parent.level !== level - 1 || xref) {
        errors.push(`Dòng GEDCOM ${lineNumber}: cấp lồng nhau hoặc mã định danh không hợp lệ.`);
        continue;
      }
      parent.children.push(node);
    }
    stack.push(node);
  }

  if (rootNodes[0]?.tag !== 'HEAD' || rootNodes.filter((node) => node.tag === 'HEAD').length !== 1) {
    errors.push('Tệp GEDCOM phải bắt đầu bằng một thẻ "0 HEAD".');
  }
  if (rootNodes.at(-1)?.tag !== 'TRLR' || rootNodes.filter((node) => node.tag === 'TRLR').length !== 1) {
    errors.push('Tệp GEDCOM phải kết thúc bằng một thẻ "0 TRLR".');
  }
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      unsupportedTags: [],
      duplicatePeople: [],
      snapshot: emptySnapshot,
      stats: { individualsCount: 0, familiesCount: 0, relationshipsCount: 0, branchesCount: 0 },
    };
  }

  const unsupportedSet = new Set(
    rootNodes.filter((node) => !['HEAD', 'TRLR', 'INDI', 'FAM'].includes(node.tag)).map((node) => node.tag)
  );
  const nowIso = new Date().toISOString();
  const xrefToPersonId = new Map<string, string>();
  const branchByName = new Map<string, FamilyBranch>();
  const countWarnings = { approximateStatus: 0, unknownName: 0, inferredGeneration: 0 };

  const importedBranches: FamilyBranch[] = [];
  const importedPeople: Person[] = [];
  const pediByIndiAndFam = new Map<string, LineageType>();

  const indiNodes = rootNodes.filter((n) => n.tag === 'INDI' && n.xref);
  const famNodes = rootNodes.filter((n) => n.tag === 'FAM' && n.xref);
  const familiesByXref = new Map(famNodes.map((family) => [family.xref!, family]));

  for (const indi of indiNodes) {
    const personId = generateId('p_ged');
    xrefToPersonId.set(indi.xref!, personId);

    let fullName = 'Thành viên chưa rõ tên';
    let commonName: string | undefined;
    let gender: Person['gender'] = 'unknown';
    let birthDate: FlexibleDate | undefined;
    let birthPlace: string | undefined;
    let isLiving = true;
    let deathDate: FlexibleDate | undefined;
    let deathPlace: string | undefined;
    let burialPlace: string | undefined;
    let occupation: string | undefined;
    let residence: string | undefined;
    let biography: string | undefined;
    let generation: number | undefined;
    let branchId: string | undefined;
    let subBranch: string | undefined;
    let clanRole: string | undefined;
    let tabooName: string | undefined;
    let courtesyName: string | undefined;
    let alias: string | undefined;
    let ancestralHome: string | undefined;
    let merits: string | undefined;
    let deathAnniversaryLunar: Person['deathAnniversaryLunar'] | undefined;

    const seenTags = new Set<string>();
    const familyLinks = new Set<string>();
    for (const ch of indi.children) {
      if (!SUPPORTED_INDI_TAGS.has(ch.tag)) {
        unsupportedSet.add(`INDI.${ch.tag}`);
        continue;
      }

      if (!['FAMC', 'FAMS', 'NOTE'].includes(ch.tag) && seenTags.has(ch.tag)) {
        warnings.push(`Dòng ${ch.lineNumber}: bản ghi ${indi.xref} có nhiều thẻ ${ch.tag}; chỉ lưu được giá trị cuối.`);
      }
      seenTags.add(ch.tag);
      noteUnsupportedChildren(ch, `INDI.${ch.tag}`, INDI_CHILD_TAGS[ch.tag] ?? [], unsupportedSet, warnings);

      switch (ch.tag) {
        case 'NAME': {
          const givn = ch.children.find((c) => c.tag === 'GIVN')?.value;
          const surn = ch.children.find((c) => c.tag === 'SURN')?.value;
          const nick = ch.children.find((c) => c.tag === 'NICK')?.value;
          fullName = reconstructVietnameseFullName(ch.value, givn, surn);
          if (nick) commonName = nick.trim();
          break;
        }
        case 'SEX': {
          const v = ch.value.trim().toUpperCase();
          if (!['M', 'F', 'U'].includes(v)) errors.push(`Dòng ${ch.lineNumber}: giá trị SEX không hợp lệ.`);
          gender = v === 'M' ? 'male' : v === 'F' ? 'female' : 'unknown';
          break;
        }
        case 'BIRT': {
          const dNode = ch.children.find((c) => c.tag === 'DATE');
          const pNode = ch.children.find((c) => c.tag === 'PLAC');
          if (dNode) birthDate = parseGedcomDate(dNode.value, `Dòng ${dNode.lineNumber}`, warnings);
          if (pNode) birthPlace = extractNodeText(pNode);
          break;
        }
        case 'DEAT': {
          if (ch.value.trim().toUpperCase() === 'N' && ch.children.length === 0) break;
          isLiving = false;
          const dNode = ch.children.find((c) => c.tag === 'DATE');
          const pNode = ch.children.find((c) => c.tag === 'PLAC');
          if (dNode) deathDate = parseGedcomDate(dNode.value, `Dòng ${dNode.lineNumber}`, warnings);
          if (pNode) deathPlace = extractNodeText(pNode);
          break;
        }
        case 'BURI': {
          isLiving = false;
          const pNode = ch.children.find((c) => c.tag === 'PLAC');
          if (pNode) burialPlace = extractNodeText(pNode);
          break;
        }
        case 'OCCU':
          occupation = extractNodeText(ch);
          break;
        case 'RESI': {
          const places = ch.children.filter((node) => node.tag === 'PLAC' || node.tag === 'ADDR').map(extractNodeText);
          residence = [ch.value.trim(), ...places].filter(Boolean).join('\n');
          break;
        }
        case 'NOTE': {
          const txt = extractNodeText(ch);
          biography = biography ? `${biography}\n\n${txt}` : txt;
          break;
        }
        case '_GEN': {
          const parsedGen = Number(ch.value);
          if (/^\d+$/.test(ch.value.trim()) && Number.isSafeInteger(parsedGen) && parsedGen > 0) {
            generation = parsedGen;
          } else {
            errors.push(`Dòng ${ch.lineNumber}: giá trị _GEN phải là số nguyên dương.`);
          }
          break;
        }
        case '_BRAN': {
          const bName = ch.value.trim();
          if (bName) {
            const norm = bName.toLowerCase();
            let branch = branchByName.get(norm);
            if (!branch) {
              branch = {
                id: generateId('branch_ged'),
                name: bName,
                code: bName.slice(0, 12).toUpperCase().replace(/\s+/g, '-'),
                subBranches: [],
                createdAt: nowIso,
                updatedAt: nowIso,
              };
              branchByName.set(norm, branch);
              importedBranches.push(branch);
            }
            branchId = branch.id;
          }
          break;
        }
        case '_SUBB':
          subBranch = ch.value.trim();
          break;
        case '_ROLE':
          clanRole = ch.value.trim();
          break;
        case '_TABOO':
          tabooName = ch.value.trim();
          break;
        case '_COURTESY':
          courtesyName = ch.value.trim();
          break;
        case '_ALIAS':
          alias = ch.value.trim();
          break;
        case '_ANCESTRAL':
          ancestralHome = ch.value.trim();
          break;
        case '_MERIT':
          merits = extractNodeText(ch);
          break;
        case '_LUNAR_GIO': {
          const dm = ch.value.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\s*(?:\||AL)\s*(.*))?$/i);
          if (dm) {
            deathAnniversaryLunar = {
              day: parseInt(dm[1], 10),
              month: parseInt(dm[2], 10),
              note: dm[3]?.trim() || undefined,
            };
          } else if (ch.value.trim()) {
            deathAnniversaryLunar = { note: ch.value.trim() };
          }
          break;
        }
        case 'FAMC':
        case 'FAMS': {
          const famXref = ch.value.trim();
          const family = familiesByXref.get(famXref);
          const reciprocalTags = ch.tag === 'FAMC' ? ['CHIL'] : ['HUSB', 'WIFE'];
          const linkKey = JSON.stringify([ch.tag, famXref]);
          if (familyLinks.has(linkKey)) {
            errors.push(`Dòng ${ch.lineNumber}: liên kết ${ch.tag} ${famXref} bị trùng.`);
          }
          familyLinks.add(linkKey);
          if (!family) {
            errors.push(`Dòng ${ch.lineNumber}: không tìm thấy gia đình ${famXref}.`);
          } else if (!family.children.some((node) => reciprocalTags.includes(node.tag) && node.value.trim() === indi.xref)) {
            errors.push(`Dòng ${ch.lineNumber}: liên kết ${ch.tag} ${famXref} thiếu tham chiếu ngược trong FAM.`);
          }
          if (ch.tag === 'FAMC') {
            const pedi = ch.children.find((node) => node.tag === 'PEDI')?.value.trim().toLowerCase();
            let lineageType: LineageType = 'biological';
            if (pedi === 'adopted') lineageType = 'adoptive';
            else if (pedi === 'foster' || pedi === 'step') lineageType = 'step';
            else if (pedi && pedi !== 'birth') {
              lineageType = 'unknown';
              warnings.push(`Dòng ${ch.lineNumber}: loại phả hệ PEDI "${pedi}" được đánh dấu chưa rõ.`);
            }
            pediByIndiAndFam.set(JSON.stringify([indi.xref, famXref]), lineageType);
          }
          break;
        }
      }
    }

    if (!seenTags.has('NAME')) countWarnings.unknownName++;
    if (isLiving && birthDate?.year && new Date().getFullYear() - birthDate.year > 115) {
      isLiving = false;
      countWarnings.approximateStatus++;
    }

    importedPeople.push({
      id: personId,
      fullName,
      commonName,
      gender,
      isLiving,
      birthDate,
      birthPlace,
      deathDate,
      deathPlace,
      burialPlace,
      occupation,
      residence,
      biography,
      generation,
      branchId,
      subBranch,
      clanRole,
      tabooName,
      courtesyName,
      alias,
      ancestralHome,
      merits,
      deathAnniversaryLunar,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  const importedUnions: Union[] = [];
  const importedRelationships: Relationship[] = [];
  const marriageOrderCountByPerson = new Map<string, number>();

  for (const fam of famNodes) {
    const partnerNodes = fam.children.filter((node) => node.tag === 'HUSB' || node.tag === 'WIFE');
    const childNodes = fam.children.filter((node) => node.tag === 'CHIL');
    for (const tag of ['HUSB', 'WIFE']) {
      if (partnerNodes.filter((node) => node.tag === tag).length > 1) {
        errors.push(`Dòng ${fam.lineNumber}: bản ghi ${fam.xref} có nhiều hơn một thẻ ${tag}.`);
      }
    }

    for (const child of fam.children) {
      if (!SUPPORTED_FAM_TAGS.has(child.tag)) {
        unsupportedSet.add(`FAM.${child.tag}`);
      } else {
        const supportedChildren = child.tag === 'MARR' ? ['DATE', 'PLAC']
          : child.tag === 'NOTE' ? TEXT_CONTINUATIONS : [];
        noteUnsupportedChildren(child, `FAM.${child.tag}`, supportedChildren, unsupportedSet, warnings);
      }
    }

    function resolvePerson(node: GedNode): string | undefined {
      const xref = node.value.trim();
      const personId = xrefToPersonId.get(xref);
      if (!personId) errors.push(`Dòng ${node.lineNumber}: ${node.tag} không tìm thấy cá nhân "${xref}".`);
      return personId;
    }

    const partnerIds = partnerNodes.map(resolvePerson).filter((id): id is string => id !== undefined);
    if (new Set(partnerIds).size !== partnerIds.length) {
      errors.push(`Dòng ${fam.lineNumber}: bản ghi ${fam.xref} có hôn phối với chính mình.`);
    }
    if (partnerIds.length === 0) {
      if (fam.children.length > 0) {
        errors.push(`Dòng ${fam.lineNumber}: bản ghi ${fam.xref} chứa dữ liệu nhưng không có cha/mẹ hay người phối ngẫu.`);
      } else {
        warnings.push(`Dòng ${fam.lineNumber}: bản ghi gia đình ${fam.xref} trống và không thể lưu.`);
      }
    }

    let marriageDate: FlexibleDate | undefined;
    let marriagePlace: string | undefined;
    const marriageNodes = fam.children.filter((node) => node.tag === 'MARR');
    if (marriageNodes.length > 1) {
      warnings.push(`Dòng ${fam.lineNumber}: bản ghi ${fam.xref} có nhiều thẻ MARR; chỉ lưu được sự kiện đầu.`);
    }
    const [marrNode] = marriageNodes;
    if (marrNode) {
      const d = marrNode.children.find((c) => c.tag === 'DATE');
      const p = marrNode.children.find((c) => c.tag === 'PLAC');
      if (d) marriageDate = parseGedcomDate(d.value, `Dòng ${d.lineNumber}`, warnings);
      if (p) marriagePlace = extractNodeText(p);
    }

    const isDivorced = fam.children.some((c) => c.tag === 'DIV');
    const notes = fam.children.filter((node) => node.tag === 'NOTE').map(extractNodeText).filter(Boolean).join('\n\n');

    let unionId: string | undefined;
    if (partnerIds.length > 0) {
      const primaryPartner = partnerIds[0];
      const nextOrder = (marriageOrderCountByPerson.get(primaryPartner) ?? 0) + 1;
      marriageOrderCountByPerson.set(primaryPartner, nextOrder);

      unionId = generateId('u_ged');
      importedUnions.push({
        id: unionId,
        partnerIds,
        marriageDate,
        marriagePlace,
        status: isDivorced ? 'divorced' : 'married',
        marriageOrder: nextOrder,
        notes: notes || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    const seenChildren = new Set<string>();
    childNodes.forEach((child, idx) => {
      const childId = resolvePerson(child);
      if (!childId) return;
      if (seenChildren.has(childId)) {
        errors.push(`Dòng ${child.lineNumber}: trẻ trong bản ghi ${fam.xref} bị trùng.`);
        return;
      }
      seenChildren.add(childId);
      const lineageType = pediByIndiAndFam.get(JSON.stringify([child.value.trim(), fam.xref])) ?? 'biological';

      for (const pid of partnerIds) {
        importedRelationships.push({
          id: generateId('r_ged'),
          parentId: pid,
          childId,
          unionId,
          lineageType,
          birthOrder: idx + 1,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    });
  }

  const hasMissingGen = importedPeople.some((p) => p.generation === undefined);
  if (hasMissingGen && importedPeople.length > 0) {
    const parentsByChild = new Map<string, string[]>();
    const childrenByParent = new Map<string, string[]>();
    for (const r of importedRelationships) {
      const pList = parentsByChild.get(r.childId) ?? [];
      pList.push(r.parentId);
      parentsByChild.set(r.childId, pList);

      const cList = childrenByParent.get(r.parentId) ?? [];
      cList.push(r.childId);
      childrenByParent.set(r.parentId, cList);
    }

    const genMap = new Map<string, number>();
    for (const p of importedPeople) {
      if (p.generation !== undefined) genMap.set(p.id, p.generation);
    }

    const roots = importedPeople.filter((p) => !(parentsByChild.get(p.id)?.length));
    const queue: string[] = [];
    for (const r of roots) {
      if (!genMap.has(r.id)) genMap.set(r.id, 1);
      queue.push(r.id);
    }

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const currGen = genMap.get(curr) ?? 1;

      for (const u of importedUnions) {
        if (u.partnerIds.includes(curr)) {
          for (const sp of u.partnerIds) {
            if (!genMap.has(sp)) {
              genMap.set(sp, currGen);
              queue.push(sp);
            }
          }
        }
      }

      const kids = childrenByParent.get(curr) ?? [];
      for (const kid of kids) {
        if (!genMap.has(kid)) {
          genMap.set(kid, currGen + 1);
          queue.push(kid);
        }
      }
    }

    for (const p of importedPeople) {
      if (p.generation === undefined && genMap.has(p.id)) {
        p.generation = genMap.get(p.id);
        countWarnings.inferredGeneration++;
      }
    }
  }

  const duplicatePeople: GedcomImportPreview['duplicatePeople'] = [];
  for (const imp of importedPeople) {
    const normImp = normalizeVietnameseText(imp.fullName);
    const match = existingSnapshot?.people.find((ex) => {
      if (normalizeVietnameseText(ex.fullName) !== normImp) return false;
      if (imp.birthDate?.year && ex.birthDate?.year) {
        return imp.birthDate.year === ex.birthDate.year;
      }
      return true;
    });
    if (match) {
      duplicatePeople.push({
        importedName: imp.fullName,
        existingName: match.fullName,
        birthYear: imp.birthDate?.year,
      });
    }
  }

  if (countWarnings.unknownName) {
    warnings.push(`Đặt tên tạm cho ${countWarnings.unknownName} hồ sơ không có thẻ NAME.`);
  }
  if (countWarnings.approximateStatus) {
    warnings.push(`Ước tính trạng thái đã mất cho ${countWarnings.approximateStatus} hồ sơ sinh hơn 115 năm trước.`);
  }
  if (countWarnings.inferredGeneration) {
    warnings.push(`Suy ra đời thứ cho ${countWarnings.inferredGeneration} hồ sơ từ các liên kết gia đình.`);
  }
  if (unsupportedSet.size > 0) {
    warnings.push(
      `Ứng dụng bỏ qua các thẻ GEDCOM chưa hỗ trợ: ${Array.from(
        unsupportedSet
      ).join(', ')}.`
    );
  }
  if (duplicatePeople.length > 0) {
    warnings.push(
      `Phát hiện ${duplicatePeople.length} cá nhân trong tệp GEDCOM có tên và năm sinh trùng với hồ sơ hiện có.`
    );
  }

  const resultSnapshot: GenealogyDatabaseSnapshot = {
    app: 'Gia Phả Việt – Cội Nguồn',
    schemaVersion: 1,
    exportedAt: nowIso,
    settings: {
      ...emptySnapshot.settings,
      rootPersonId: importedPeople[0]?.id,
    },
    branches: importedBranches,
    people: importedPeople,
    unions: importedUnions,
    relationships: importedRelationships,
    lifeEvents: [],
    media: [],
    stories: [],
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    unsupportedTags: Array.from(unsupportedSet),
    duplicatePeople,
    snapshot: resultSnapshot,
    stats: {
      individualsCount: importedPeople.length,
      familiesCount: importedUnions.length,
      relationshipsCount: importedRelationships.length,
      branchesCount: importedBranches.length,
    },
  };
}

export const exportGedcom551 = exportToGedcom551;

export function parseGedcom551(rawGedcom: string): GenealogyDatabaseSnapshot {
  const preview = parseAndPreviewGedcom(rawGedcom);
  if (!preview.valid) throw new Error(preview.errors.join(' '));
  return preview.snapshot;
}

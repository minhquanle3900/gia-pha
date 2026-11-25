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

function parseGedcomDate(raw: string): FlexibleDate {
  const cleaned = raw.trim();
  if (!cleaned) return { precision: 'unknown' };

  const upper = cleaned.toUpperCase();
  let precision: FlexibleDate['precision'] = 'exact';
  let body = upper;

  if (upper.startsWith('ABT ') || upper.startsWith('EST ') || upper.startsWith('CAL ')) {
    precision = 'approx';
    body = upper.slice(4).trim();
  } else if (upper.startsWith('BEF ')) {
    precision = 'before';
    body = upper.slice(4).trim();
  } else if (upper.startsWith('AFT ')) {
    precision = 'after';
    body = upper.slice(4).trim();
  }

  const tokens = body.split(/\s+/).filter(Boolean);
  let day: number | undefined;
  let month: number | undefined;
  let year: number | undefined;

  for (const tok of tokens) {
    const mIdx = GEDCOM_MONTHS.indexOf(tok);
    if (mIdx !== -1) {
      month = mIdx + 1;
    } else if (/^\d{4}$/.test(tok)) {
      year = parseInt(tok, 10);
    } else if (/^\d{1,2}$/.test(tok) && day === undefined) {
      day = parseInt(tok, 10);
    }
  }

  if (!year) {
    return { precision: 'unknown', displayText: cleaned };
  }

  if (precision === 'exact') {
    if (day && month) precision = 'exact';
    else if (month) precision = 'month';
    else precision = 'year';
  }

  return {
    precision,
    day,
    month,
    year,
    displayText: cleaned,
  };
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
  'CHAN',
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

const SUPPORTED_FAM_TAGS = new Set(['HUSB', 'WIFE', 'CHIL', 'MARR', 'DIV', 'NOTE', 'CHAN']);

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
  existingSnapshot: GenealogyDatabaseSnapshot
): GedcomImportPreview {
  const emptySnapshot: GenealogyDatabaseSnapshot = {
    app: 'Gia Phả Việt – Cội Nguồn',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: existingSnapshot.settings,
    branches: [],
    people: [],
    unions: [],
    relationships: [],
    lifeEvents: [],
    media: [],
    stories: [],
  };

  const rawLines = rawGedcom
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (rawLines.length === 0) {
    return {
      valid: false,
      errors: ['Tệp GEDCOM trống.'],
      warnings: [],
      unsupportedTags: [],
      duplicatePeople: [],
      snapshot: emptySnapshot,
      stats: { individualsCount: 0, familiesCount: 0, relationshipsCount: 0, branchesCount: 0 },
    };
  }

  const rootNodes: GedNode[] = [];
  const stack: GedNode[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const m = line.match(/^(\d+)\s+(?:(@[^@]+@)\s+)?([A-Za-z0-9_]+)(?:\s+(.*))?$/);
    if (!m) {
      if (i === 0) {
        errors.push('Dòng đầu tiên không đúng cú pháp chuẩn GEDCOM (cần bắt đầu bằng "0 HEAD").');
        break;
      }
      continue;
    }

    const level = parseInt(m[1], 10);
    const xref = m[2];
    const tag = m[3].toUpperCase();
    const value = m[4] ?? '';

    const node: GedNode = { level, xref, tag, value, children: [] };

    if (level === 0) {
      rootNodes.push(node);
      stack.length = 0;
      stack.push(node);
    } else {
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node);
      }
      stack.push(node);
    }
  }

  const hasHead = rootNodes.some((n) => n.tag === 'HEAD');
  if (!hasHead || errors.length > 0) {
    return {
      valid: false,
      errors:
        errors.length > 0
          ? errors
          : ['Không tìm thấy thẻ tiêu đề chuẩn "0 HEAD" trong tệp GEDCOM.'],
      warnings: [],
      unsupportedTags: [],
      duplicatePeople: [],
      snapshot: emptySnapshot,
      stats: { individualsCount: 0, familiesCount: 0, relationshipsCount: 0, branchesCount: 0 },
    };
  }

  const unsupportedSet = new Set<string>();
  const nowIso = new Date().toISOString();
  const xrefToPersonId = new Map<string, string>();
  const branchByName = new Map<string, FamilyBranch>();

  for (const b of existingSnapshot.branches) {
    branchByName.set(normalizeVietnameseText(b.name), b);
  }

  const importedBranches: FamilyBranch[] = [];
  const importedPeople: Person[] = [];
  const pediByIndiAndFam = new Map<string, LineageType>();

  const indiNodes = rootNodes.filter((n) => n.tag === 'INDI' && n.xref);
  const famNodes = rootNodes.filter((n) => n.tag === 'FAM' && n.xref);

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

    for (const ch of indi.children) {
      if (!SUPPORTED_INDI_TAGS.has(ch.tag)) {
        unsupportedSet.add(`INDI.${ch.tag}`);
        continue;
      }

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
          gender = v === 'M' ? 'male' : v === 'F' ? 'female' : 'unknown';
          break;
        }
        case 'BIRT': {
          const dNode = ch.children.find((c) => c.tag === 'DATE');
          const pNode = ch.children.find((c) => c.tag === 'PLAC');
          if (dNode) birthDate = parseGedcomDate(dNode.value);
          if (pNode) birthPlace = pNode.value.trim();
          break;
        }
        case 'DEAT': {
          isLiving = false;
          const dNode = ch.children.find((c) => c.tag === 'DATE');
          const pNode = ch.children.find((c) => c.tag === 'PLAC');
          if (dNode) deathDate = parseGedcomDate(dNode.value);
          if (pNode) deathPlace = pNode.value.trim();
          break;
        }
        case 'BURI': {
          isLiving = false;
          const pNode = ch.children.find((c) => c.tag === 'PLAC');
          if (pNode) burialPlace = pNode.value.trim();
          break;
        }
        case 'OCCU':
          occupation = extractNodeText(ch);
          break;
        case 'RESI': {
          const pNode = ch.children.find((c) => c.tag === 'PLAC');
          residence = pNode ? pNode.value.trim() : ch.value.trim();
          break;
        }
        case 'NOTE': {
          const txt = extractNodeText(ch);
          biography = biography ? `${biography}\n\n${txt}` : txt;
          break;
        }
        case '_GEN': {
          const parsedGen = parseInt(ch.value.trim(), 10);
          if (!Number.isNaN(parsedGen) && parsedGen > 0) generation = parsedGen;
          break;
        }
        case '_BRAN': {
          const bName = ch.value.trim();
          if (bName) {
            const norm = normalizeVietnameseText(bName);
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
          const parts = ch.value.split('|').map((s) => s.trim());
          const dm = parts[0]?.match(/^(\d{1,2})\/(\d{1,2})$/);
          if (dm) {
            deathAnniversaryLunar = {
              day: parseInt(dm[1], 10),
              month: parseInt(dm[2], 10),
              note: parts[1] || undefined,
            };
          } else if (ch.value.trim()) {
            deathAnniversaryLunar = { note: ch.value.trim() };
          }
          break;
        }
        case 'FAMC': {
          const famXref = ch.value.trim();
          const pedi = ch.children.find((c) => c.tag === 'PEDI')?.value.trim().toLowerCase();
          let lType: LineageType = 'biological';
          if (pedi === 'adopted') lType = 'adoptive';
          else if (pedi === 'foster' || pedi === 'step') lType = 'step';
          pediByIndiAndFam.set(`${indi.xref!}::${famXref}`, lType);
          break;
        }
      }
    }

    if (isLiving && birthDate?.year && new Date().getFullYear() - birthDate.year > 115) {
      isLiving = false;
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
    const husbXref = fam.children.find((c) => c.tag === 'HUSB')?.value.trim();
    const wifeXref = fam.children.find((c) => c.tag === 'WIFE')?.value.trim();
    const chilNodes = fam.children.filter((c) => c.tag === 'CHIL');

    for (const ch of fam.children) {
      if (!SUPPORTED_FAM_TAGS.has(ch.tag)) {
        unsupportedSet.add(`FAM.${ch.tag}`);
      }
    }

    const partnerIds: string[] = [];
    if (husbXref && xrefToPersonId.has(husbXref)) partnerIds.push(xrefToPersonId.get(husbXref)!);
    if (wifeXref && xrefToPersonId.has(wifeXref)) partnerIds.push(xrefToPersonId.get(wifeXref)!);

    let marriageDate: FlexibleDate | undefined;
    let marriagePlace: string | undefined;
    const marrNode = fam.children.find((c) => c.tag === 'MARR');
    if (marrNode) {
      const d = marrNode.children.find((c) => c.tag === 'DATE');
      const p = marrNode.children.find((c) => c.tag === 'PLAC');
      if (d) marriageDate = parseGedcomDate(d.value);
      if (p) marriagePlace = p.value.trim();
    }

    const isDivorced = fam.children.some((c) => c.tag === 'DIV');
    const noteNode = fam.children.find((c) => c.tag === 'NOTE');

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
        notes: noteNode ? extractNodeText(noteNode) : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    chilNodes.forEach((cNode, idx) => {
      const childXref = cNode.value.trim();
      const childId = xrefToPersonId.get(childXref);
      if (!childId) return;

      const lineageType = pediByIndiAndFam.get(`${childXref}::${fam.xref!}`) ?? 'biological';

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
      }
    }
  }

  const duplicatePeople: GedcomImportPreview['duplicatePeople'] = [];
  for (const imp of importedPeople) {
    const normImp = normalizeVietnameseText(imp.fullName);
    const match = existingSnapshot.people.find((ex) => {
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

  const warnings: string[] = [];
  if (unsupportedSet.size > 0) {
    warnings.push(
      `Một số thẻ mở rộng không nằm trong phạm vi chuẩn GEDCOM 5.5.1 cơ bản đã được bỏ qua: ${Array.from(
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
      ...existingSnapshot.settings,
      rootPersonId: importedPeople[0]?.id ?? existingSnapshot.settings.rootPersonId,
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
    valid: importedPeople.length > 0,
    errors:
      importedPeople.length === 0
        ? ['Không tìm thấy bản ghi cá nhân (INDI) nào trong tệp GEDCOM.']
        : [],
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
  const dummySnapshot: GenealogyDatabaseSnapshot = {
    app: 'Gia Phả Việt – Cội Nguồn',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: {
      id: 'default',
      clanName: 'Gia Phả Nhập Từ GEDCOM',
      clanMotto: 'Uống nước nhớ nguồn',
      ancestralHallLocation: 'Việt Nam',
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
    },
    branches: [],
    people: [],
    unions: [],
    relationships: [],
    lifeEvents: [],
    media: [],
    stories: [],
  };
  const preview = parseAndPreviewGedcom(rawGedcom, dummySnapshot);
  return preview.snapshot;
}

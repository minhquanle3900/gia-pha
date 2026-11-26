import { NavigationTab } from '../models/genealogy';

export type NavigationGroup = 'home' | 'genealogy' | 'heritage' | 'rites' | 'more';
export type NavigationDestination = NavigationTab | 'exhibition';
export const NAVIGATION_GROUPS: { id: NavigationGroup; label: string; destination?: NavigationDestination }[] = [
  { id: 'home', label: 'Trang chủ', destination: 'dashboard' },
  { id: 'genealogy', label: 'Gia phả', destination: 'tree' },
  { id: 'heritage', label: 'Di sản', destination: 'exhibition' },
  { id: 'rites', label: 'Lễ giỗ', destination: 'rites' },
  { id: 'more', label: 'Thêm' },
];
export const PAGE_GROUP: Record<NavigationTab, NavigationGroup> = {
  dashboard: 'home', tree: 'genealogy', members: 'genealogy', gallery: 'heritage',
  journal: 'heritage', book: 'heritage', rites: 'rites', stats: 'more', map: 'more', data: 'more',
};
export const GROUP_DESTINATIONS: Record<NavigationGroup, { destination: NavigationDestination; label: string }[]> = {
  home: [],
  genealogy: [{ destination: 'tree', label: 'Cây gia phả' }, { destination: 'members', label: 'Thành viên' }],
  heritage: [{ destination: 'exhibition', label: 'Phòng trưng bày' }, { destination: 'gallery', label: 'Kho kỷ vật' }, { destination: 'journal', label: 'Nhật ký dòng họ' }, { destination: 'book', label: 'Sách phả ký' }],
  rites: [],
  more: [{ destination: 'stats', label: 'Thống kê' }, { destination: 'map', label: 'Bản đồ di cư' }, { destination: 'data', label: 'Dữ liệu & sao lưu' }],
};

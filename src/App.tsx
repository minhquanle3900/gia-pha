import React, { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { hasCompletedOnboarding, OnboardingTour } from './components/OnboardingTour';
import { GenealogyProvider, useGenealogy } from './context/GenealogyContext';
import { FamilyBookPage } from './features/book-print/FamilyBookPage';
import { FamilyTreePage } from './features/family-tree/FamilyTreePage';
import { GalleryPage } from './features/gallery/GalleryPage';
import { DataManagementPage } from './features/import-export/DataManagementPage';
import { KinshipCalculatorModal } from './features/kinship/KinshipCalculatorModal';
import { MigrationMapPage } from './features/migration/MigrationMapPage';
import { DuplicateMergeModal } from './features/people/DuplicateMergeModal';
import { MembersPage } from './features/people/MembersPage';
import { PersonFormModal } from './features/people/PersonFormModal';
import { PersonProfileView } from './features/people/PersonProfileView';
import { RitesAssistantPage } from './features/rites/RitesAssistantPage';
import { QRShareModal } from './features/sharing/QRShareModal';
import { ClanJournalPage } from './features/journal/ClanJournalPage';
import { NavigationTab, Person } from './models/genealogy';
import { DashboardPage } from './pages/DashboardPage';
import { StatsDashboardPage } from './pages/StatsDashboardPage';

const MainWorkspace: React.FC = () => {
  const { loading, error, refresh } = useGenealogy();

  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [galleryEntry, setGalleryEntry] = useState({ view: 'archive' as 'hall' | 'archive', sequence: 0 });
  const [galleryView, setGalleryView] = useState<'hall' | 'archive'>('archive');
  const [viewingPersonId, setViewingPersonId] = useState<string | null>(null);
  const [treeFocusPersonId, setTreeFocusPersonId] = useState<string | undefined>(undefined);

  // Onboarding Tour state
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (!hasCompletedOnboarding()) {
      const timer = setTimeout(() => {
        setTourOpen(true);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, []);

  // Person CRUD Modal state
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  // Kinship Calculator Modal state
  const [kinshipModalOpen, setKinshipModalOpen] = useState(false);
  const [kinshipInitialA, setKinshipInitialA] = useState<string | undefined>(undefined);
  const [kinshipInitialB, setKinshipInitialB] = useState<string | undefined>(undefined);

  // QR Share Modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrPerson, setQrPerson] = useState<Person | null>(null);

  // Duplicate Merge Modal state
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);

  const handleSelectTab = (tab: NavigationTab) => {
    setViewingPersonId(null);
    if (tab === 'gallery') {
      setGalleryView('archive');
      setGalleryEntry(previous => ({ view: 'archive', sequence: previous.sequence + 1 }));
    }
    setActiveTab(tab);
  };

  const handleOpenExhibition = () => {
    setViewingPersonId(null);
    setGalleryView('hall');
    setGalleryEntry(previous => ({ view: 'hall', sequence: previous.sequence + 1 }));
    setActiveTab('gallery');
  };

  const handleOpenProfile = (personId: string) => {
    setViewingPersonId(personId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFocusInTree = (personId: string) => {
    setViewingPersonId(null);
    setTreeFocusPersonId(personId);
    setActiveTab('tree');
  };

  const handleOpenAddPerson = () => {
    setEditingPerson(null);
    setPersonModalOpen(true);
  };

  const handleOpenEditPerson = (person: Person) => {
    setEditingPerson(person);
    setPersonModalOpen(true);
  };

  const handleOpenKinshipWithPerson = (personId: string) => {
    setKinshipInitialA(personId);
    setKinshipInitialB(undefined);
    setKinshipModalOpen(true);
  };

  const handleOpenQrForPerson = (person: Person) => {
    setQrPerson(person);
    setQrModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] p-6">
        <div className="text-center space-y-2">
          <p className="text-2xl font-serif font-bold text-[#1B3B2B]">
            Gia Phả Việt – Cội Nguồn
          </p>
          <p className="text-xs text-[#655A4E]">
            Đang mở sổ phả hệ từ bộ nhớ cục bộ của thiết bị...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-6 space-y-4">
          <h1 className="text-xl font-serif font-bold text-red-900">
            Không thể truy cập bộ nhớ trình duyệt
          </h1>
          <p className="text-sm text-[#4A3F35]">{error}</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#1B3B2B] text-white text-xs font-medium"
          >
            Thử tải lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      activeTab={activeTab}
      galleryView={galleryView}
      onSelectTab={handleSelectTab}
      onOpenExhibition={handleOpenExhibition}
      onQuickAddPerson={handleOpenAddPerson}
      onOpenKinship={() => {
        setKinshipInitialA(undefined);
        setKinshipInitialB(undefined);
        setKinshipModalOpen(true);
      }}
      onOpenQRShare={() => {
        setQrPerson(null);
        setQrModalOpen(true);
      }}
      onOpenDuplicateMerge={() => setDuplicateModalOpen(true)}
      onOpenTour={() => setTourOpen(true)}
      onSelectPerson={handleOpenProfile}
      onFocusInTree={handleFocusInTree}
    >
      {viewingPersonId ? (
        <PersonProfileView
          personId={viewingPersonId}
          onBack={() => setViewingPersonId(null)}
          onSelectPerson={handleOpenProfile}
          onEditPerson={handleOpenEditPerson}
          onFocusInTree={handleFocusInTree}
          onOpenKinship={handleOpenKinshipWithPerson}
          onOpenQr={handleOpenQrForPerson}
        />
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <DashboardPage
              onNavigate={handleSelectTab}
              onSelectPerson={handleOpenProfile}
              onFocusInTree={handleFocusInTree}
              onAddPerson={handleOpenAddPerson}
              onOpenTour={() => setTourOpen(true)}
            />
          )}

          {activeTab === 'stats' && (
            <StatsDashboardPage
              onNavigate={handleSelectTab}
              onSelectPerson={handleOpenProfile}
            />
          )}

          {activeTab === 'tree' && (
            <FamilyTreePage
              initialFocusPersonId={treeFocusPersonId}
              onOpenProfile={handleOpenProfile}
              onEditPerson={handleOpenEditPerson}
              onAddPerson={handleOpenAddPerson}
              onOpenKinship={() => setKinshipModalOpen(true)}
              onOpenBook={() => setActiveTab('book')}
            />
          )}

          {activeTab === 'members' && (
            <MembersPage
              onSelectPerson={handleOpenProfile}
              onFocusInTree={handleFocusInTree}
              onAddPerson={handleOpenAddPerson}
              onOpenDuplicateMerge={() => setDuplicateModalOpen(true)}
            />
          )}

          {activeTab === 'journal' && (
            <ClanJournalPage
              onNavigate={handleSelectTab}
              onSelectPerson={handleOpenProfile}
            />
          )}

          {activeTab === 'gallery' && (
            <GalleryPage onNavigate={handleSelectTab} onSelectPerson={handleOpenProfile} entryRequest={galleryEntry} onViewChange={setGalleryView} />
          )}

          {activeTab === 'rites' && <RitesAssistantPage onSelectPerson={handleOpenProfile} />}

          {activeTab === 'book' && <FamilyBookPage />}

          {activeTab === 'map' && <MigrationMapPage />}

          {activeTab === 'data' && <DataManagementPage />}
        </>
      )}

      {/* Person Form CRUD Modal */}
      <PersonFormModal
        open={personModalOpen}
        editingPerson={editingPerson}
        onClose={() => setPersonModalOpen(false)}
        onSaved={(saved) => {
          if (!editingPerson) {
            setViewingPersonId(saved.id);
          }
        }}
      />

      {/* Kinship Title Calculator Modal */}
      <KinshipCalculatorModal
        open={kinshipModalOpen}
        initialPersonAId={kinshipInitialA}
        initialPersonBId={kinshipInitialB}
        onClose={() => setKinshipModalOpen(false)}
        onSelectPerson={handleOpenProfile}
      />

      {/* QR Offline Share Modal */}
      <QRShareModal
        open={qrModalOpen}
        person={qrPerson}
        onClose={() => setQrModalOpen(false)}
      />

      {/* Duplicate Record Merge Modal */}
      <DuplicateMergeModal
        open={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
      />

      {/* Onboarding Walkthrough Tour */}
      <OnboardingTour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        onNavigateTab={handleSelectTab}
        onOpenAddPerson={handleOpenAddPerson}
      />
    </AppShell>
  );
};

export function App() {
  return (
    <GenealogyProvider>
      <MainWorkspace />
    </GenealogyProvider>
  );
}

export default App;

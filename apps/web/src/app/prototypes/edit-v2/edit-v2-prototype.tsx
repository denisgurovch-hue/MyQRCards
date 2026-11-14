'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ContactIcon, resolveContactKind } from '../../../lib/contact-icon';
import {
  exportFramedJpeg,
  initialCropState,
  loadHtmlImage,
  rotateImageClockwiseJpeg,
  type FrameCropState,
} from '../../../lib/photo-frame-crop';
import {
  publicCoverCssVars,
  resolvePublicCoverMode,
} from '../../../lib/public-cover';
import { AvatarAlignDialog } from './avatar-align-dialog';
import { CoverAlignDialog } from './cover-align-dialog';
import {
  SCENARIO_LABELS,
  MOCK_COVER_DATA_URL,
  cloneDraft,
  createEmptyDraft,
  createFullDraft,
  normalizeContactOrder,
  type ContactOrderKey,
  type PrototypeDraft,
  type PrototypeLink,
  type PrototypeScenario,
} from './mock-data';
import { NestedSheet } from './nested-sheet';

/** Same square frame as PhotoCropDialog / card-photo-editor. */
const AVATAR_FRAME_SIZE = 280;

/** Same aspect as public cover band / card-cover-editor. */
const COVER_FRAME_WIDTH = 360;
const COVER_FRAME_HEIGHT = 152;
const COVER_EXPORT_WIDTH = 1600;
const COVER_EXPORT_HEIGHT = 675;

type AlignSession = {
  objectUrl: string;
  crop: FrameCropState;
  initialCrop: FrameCropState;
  /** Revoke objectUrl when session ends (blob from file pick / rotate). */
  revokeOnClose: boolean;
};

type NestedKind =
  | null
  | 'profile'
  | 'phone'
  | 'email'
  | 'website'
  | 'link'
  | 'add-link'
  | 'cover'
  | 'card-actions'
  | 'cancel-confirm';

type UiFlash = 'idle' | 'saving' | 'saved' | 'error';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

function draftsEqual(a: PrototypeDraft, b: PrototypeDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function CameraGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 8.5h2.2l1.2-2h8.2l1.2 2H19.5A1.5 1.5 0 0 1 21 10v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V10a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="14" r="3.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function ImageGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="13"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="9" cy="10.5" r="1.4" fill="currentColor" />
      <path
        d="m7.5 16.5 3.2-3.4 2.3 2.2 2.4-2.8 3.1 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EditV2Prototype() {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [scenario, setScenario] = useState<PrototypeScenario>('full');
  const [hideLab, setHideLab] = useState(false);
  const [baseline, setBaseline] = useState<PrototypeDraft>(() => createFullDraft());
  const [draft, setDraft] = useState<PrototypeDraft>(() => createFullDraft());
  const [nested, setNested] = useState<NestedKind>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [flash, setFlash] = useState<UiFlash>('idle');
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    jobTitle: '',
    companyName: '',
    summary: '',
  });
  const [contactForm, setContactForm] = useState({
    value: '',
    showEmail: false,
    label: '',
    url: '',
    type: 'telegram' as PrototypeLink['type'],
  });
  const [coverForm, setCoverForm] = useState({
    mode: 'color' as 'color' | 'image' | 'default',
    color: '#0B1520',
  });
  const [coverHot, setCoverHot] = useState(false);
  const [avatarAlign, setAvatarAlign] = useState<AlignSession | null>(null);
  const [avatarAlignBusy, setAvatarAlignBusy] = useState(false);
  const [coverAlign, setCoverAlign] = useState<AlignSession | null>(null);
  const [coverAlignBusy, setCoverAlignBusy] = useState(false);
  const [dragKey, setDragKey] = useState<ContactOrderKey | null>(null);
  const [overKey, setOverKey] = useState<ContactOrderKey | null>(null);
  const dragKeyRef = useRef<ContactOrderKey | null>(null);

  const dirty = useMemo(() => !draftsEqual(baseline, draft), [baseline, draft]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setHideLab(params.get('chrome') === '0');
    const fromQuery = params.get('scenario') as PrototypeScenario | null;
    if (fromQuery && fromQuery in SCENARIO_LABELS) {
      setScenario(fromQuery);
    }
  }, []);

  useEffect(() => {
    applyScenario(scenario);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scenario-driven demo reset
  }, [scenario]);

  function applyScenario(next: PrototypeScenario) {
    setFlash('idle');
    setEditingLinkId(null);

    if (next === 'empty') {
      const empty = createEmptyDraft();
      setBaseline(empty);
      setDraft(cloneDraft(empty));
      setNested(null);
      return;
    }

    const full = createFullDraft();
    if (next === 'dirty') {
      const dirtyDraft = cloneDraft(full);
      dirtyDraft.displayName = 'Денис Гуров (черновик)';
      dirtyDraft.jobTitle = 'Lead Engineer';
      setBaseline(full);
      setDraft(dirtyDraft);
      setNested(null);
      return;
    }

    setBaseline(full);
    setDraft(cloneDraft(full));

    if (next === 'edit-profile') {
      openProfile(full);
      return;
    }
    if (next === 'edit-contact') {
      openEmail(full);
      return;
    }
    if (next === 'add-contact') {
      openAddLink();
      return;
    }
    if (next === 'edit-photo') {
      if (full.photoUrl) {
        void beginAvatarAlign(full.photoUrl, false);
      } else {
        setNested(null);
        window.setTimeout(() => photoInputRef.current?.click(), 120);
      }
      return;
    }
    if (next === 'edit-cover') {
      void beginCoverAlign(MOCK_COVER_DATA_URL, false);
      return;
    }
    if (next === 'saving') {
      setFlash('saving');
      setNested(null);
      return;
    }
    if (next === 'save-error') {
      setFlash('error');
      setNested(null);
      return;
    }
    if (next === 'cancel-confirm') {
      const dirtyDraft = cloneDraft(full);
      dirtyDraft.companyName = 'Другая компания';
      setDraft(dirtyDraft);
      setNested('cancel-confirm');
      return;
    }
    if (next === 'card-actions') {
      setNested('card-actions');
      return;
    }
    setNested(null);
  }

  function openProfile(source: PrototypeDraft = draft) {
    setProfileForm({
      displayName: source.displayName,
      jobTitle: source.jobTitle,
      companyName: source.companyName,
      summary: source.summary,
    });
    setNested('profile');
  }

  function openPhone(source: PrototypeDraft = draft) {
    setContactForm((current) => ({ ...current, value: source.phone }));
    setNested('phone');
  }

  function openEmail(source: PrototypeDraft = draft) {
    setContactForm((current) => ({
      ...current,
      value: source.email,
      showEmail: source.showEmail,
    }));
    setNested('email');
  }

  function openWebsite(source: PrototypeDraft = draft) {
    setContactForm((current) => ({ ...current, value: source.websiteUrl }));
    setNested('website');
  }

  function openLink(link: PrototypeLink) {
    setEditingLinkId(link.id);
    setContactForm((current) => ({
      ...current,
      label: link.label,
      url: link.url,
      type: link.type,
    }));
    setNested('link');
  }

  function openAddLink() {
    setEditingLinkId(null);
    setContactForm((current) => ({
      ...current,
      label: '',
      url: '',
      type: 'telegram',
    }));
    setNested('add-link');
  }

  function openCover(source: PrototypeDraft = draft) {
    setCoverForm({
      mode: source.coverImageUrl
        ? 'image'
        : source.coverColor
          ? 'color'
          : 'default',
      color: source.coverColor ?? '#0B1520',
    });
    setNested('cover');
  }

  function closeNested() {
    setNested(null);
    setEditingLinkId(null);
  }

  function applyProfile() {
    const name = profileForm.displayName.trim();
    if (!name) {
      return;
    }
    setDraft((current) => ({
      ...current,
      displayName: name,
      jobTitle: profileForm.jobTitle.trim(),
      companyName: profileForm.companyName.trim(),
      summary: profileForm.summary.trim(),
    }));
    closeNested();
  }

  function applyPhone() {
    setDraft((current) => ({
      ...current,
      phone: contactForm.value.trim(),
    }));
    closeNested();
  }

  function applyEmail() {
    setDraft((current) => ({
      ...current,
      email: contactForm.value.trim(),
      showEmail: contactForm.showEmail,
    }));
    closeNested();
  }

  function applyWebsite() {
    setDraft((current) => ({
      ...current,
      websiteUrl: contactForm.value.trim(),
    }));
    closeNested();
  }

  function applyLink() {
    const url = contactForm.url.trim();
    if (!url) {
      return;
    }
    const label = contactForm.label.trim() || contactForm.type;
    setDraft((current) => {
      if (editingLinkId) {
        return {
          ...current,
          links: current.links.map((link) =>
            link.id === editingLinkId
              ? { ...link, label, url, type: contactForm.type }
              : link,
          ),
          contactOrder: normalizeContactOrder(current.contactOrder, current.links),
        };
      }
      const id = `link-${Date.now()}`;
      const links = [
        ...current.links,
        {
          id,
          label,
          url,
          type: contactForm.type,
        },
      ];
      return {
        ...current,
        links,
        contactOrder: normalizeContactOrder(
          [...current.contactOrder, id],
          links,
        ),
      };
    });
    closeNested();
  }

  function deleteLink() {
    if (!editingLinkId) {
      return;
    }
    const removedId = editingLinkId;
    setDraft((current) => {
      const links = current.links.filter((link) => link.id !== removedId);
      return {
        ...current,
        links,
        contactOrder: normalizeContactOrder(
          current.contactOrder.filter((key) => key !== removedId),
          links,
        ),
      };
    });
    closeNested();
  }

  function moveContact(fromKey: ContactOrderKey, toKey: ContactOrderKey) {
    if (fromKey === toKey) {
      return;
    }
    setDraft((current) => {
      const order = normalizeContactOrder(current.contactOrder, current.links);
      const from = order.indexOf(fromKey);
      const to = order.indexOf(toKey);
      if (from < 0 || to < 0) {
        return current;
      }
      const next = [...order];
      next.splice(from, 1);
      next.splice(to, 0, fromKey);
      return { ...current, contactOrder: next };
    });
  }

  function onContactHandlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    key: ContactOrderKey,
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragKeyRef.current = key;
    setDragKey(key);
    setOverKey(key);
  }

  function onContactHandlePointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (!dragKeyRef.current) {
      return;
    }
    const el = document.elementFromPoint(event.clientX, event.clientY);
    const row = el?.closest('[data-contact-key]') as HTMLElement | null;
    const key = row?.dataset.contactKey as ContactOrderKey | undefined;
    if (key) {
      setOverKey(key);
    }
  }

  function onContactHandlePointerUp() {
    const from = dragKeyRef.current;
    const to = overKey;
    dragKeyRef.current = null;
    setDragKey(null);
    setOverKey(null);
    if (from && to) {
      moveContact(from, to);
    }
  }

  function applyCover() {
    setDraft((current) => {
      if (coverForm.mode === 'default') {
        return { ...current, coverColor: null, coverImageUrl: null };
      }
      if (coverForm.mode === 'color') {
        return {
          ...current,
          coverColor: coverForm.color,
          coverImageUrl: null,
        };
      }
      // Image mode without a new pick keeps current draft image.
      return {
        ...current,
        coverColor: null,
        coverImageUrl: current.coverImageUrl,
      };
    });
    closeNested();
  }

  function openPhotoPicker() {
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
      photoInputRef.current.click();
    }
  }

  function openCoverPicker() {
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
      coverInputRef.current.click();
    }
  }

  function onAvatarHit() {
    if (draft.photoUrl) {
      void beginAvatarAlign(draft.photoUrl, false);
      return;
    }
    openPhotoPicker();
  }

  function clearAlignSession(
    setter: typeof setAvatarAlign | typeof setCoverAlign,
  ) {
    setter((current) => {
      if (current?.revokeOnClose && current.objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(current.objectUrl);
      }
      return null;
    });
  }

  function clearAvatarAlignSession() {
    clearAlignSession(setAvatarAlign);
  }

  function clearCoverAlignSession() {
    clearAlignSession(setCoverAlign);
  }

  async function beginAvatarAlign(src: string, revokeOnClose: boolean) {
    try {
      const image = await loadHtmlImage(src);
      const crop = initialCropState(
        image.naturalWidth,
        image.naturalHeight,
        AVATAR_FRAME_SIZE,
      );
      clearCoverAlignSession();
      setAvatarAlign({
        objectUrl: src,
        crop,
        initialCrop: crop,
        revokeOnClose,
      });
      setNested(null);
    } catch {
      if (revokeOnClose && src.startsWith('blob:')) {
        URL.revokeObjectURL(src);
      }
    }
  }

  async function beginCoverAlign(src: string, revokeOnClose: boolean) {
    try {
      const image = await loadHtmlImage(src);
      const crop = initialCropState(
        image.naturalWidth,
        image.naturalHeight,
        COVER_FRAME_WIDTH,
        COVER_FRAME_HEIGHT,
      );
      clearAvatarAlignSession();
      setCoverAlign({
        objectUrl: src,
        crop,
        initialCrop: crop,
        revokeOnClose,
      });
      setCoverForm((current) => ({ ...current, mode: 'image' }));
      setNested(null);
    } catch {
      if (revokeOnClose && src.startsWith('blob:')) {
        URL.revokeObjectURL(src);
      }
    }
  }

  function onPhotoFile(file: File | null) {
    if (!file) {
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    void beginAvatarAlign(objectUrl, true);
  }

  function onCoverFile(file: File | null) {
    if (!file) {
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    void beginCoverAlign(objectUrl, true);
  }

  async function applyAvatarAlign() {
    if (!avatarAlign || avatarAlignBusy) {
      return;
    }
    setAvatarAlignBusy(true);
    try {
      const image = await loadHtmlImage(avatarAlign.objectUrl);
      const blob = await exportFramedJpeg(image, avatarAlign.crop);
      const previewUrl = URL.createObjectURL(blob);
      setDraft((current) => {
        if (current.photoUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(current.photoUrl);
        }
        return { ...current, photoUrl: previewUrl };
      });
      clearAvatarAlignSession();
    } finally {
      setAvatarAlignBusy(false);
    }
  }

  async function rotateAvatarAlign() {
    if (!avatarAlign || avatarAlignBusy) {
      return;
    }
    setAvatarAlignBusy(true);
    try {
      const blob = await rotateImageClockwiseJpeg(avatarAlign.objectUrl);
      const nextUrl = URL.createObjectURL(blob);
      try {
        const image = await loadHtmlImage(nextUrl);
        const crop = initialCropState(
          image.naturalWidth,
          image.naturalHeight,
          AVATAR_FRAME_SIZE,
        );
        setAvatarAlign((current) => {
          if (!current) {
            URL.revokeObjectURL(nextUrl);
            return current;
          }
          if (current.revokeOnClose && current.objectUrl.startsWith('blob:')) {
            URL.revokeObjectURL(current.objectUrl);
          }
          return {
            objectUrl: nextUrl,
            crop,
            initialCrop: crop,
            revokeOnClose: true,
          };
        });
      } catch {
        URL.revokeObjectURL(nextUrl);
      }
    } finally {
      setAvatarAlignBusy(false);
    }
  }

  async function applyCoverAlign() {
    if (!coverAlign || coverAlignBusy) {
      return;
    }
    setCoverAlignBusy(true);
    try {
      const image = await loadHtmlImage(coverAlign.objectUrl);
      const blob = await exportFramedJpeg(
        image,
        coverAlign.crop,
        COVER_EXPORT_WIDTH,
        COVER_EXPORT_HEIGHT,
      );
      const previewUrl = URL.createObjectURL(blob);
      setDraft((current) => {
        if (current.coverImageUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(current.coverImageUrl);
        }
        return {
          ...current,
          coverColor: null,
          coverImageUrl: previewUrl,
        };
      });
      clearCoverAlignSession();
    } finally {
      setCoverAlignBusy(false);
    }
  }

  function cancelAvatarAlign() {
    clearAvatarAlignSession();
  }

  function cancelCoverAlign() {
    clearCoverAlignSession();
  }

  function resetAvatarAlign() {
    setAvatarAlign((current) =>
      current
        ? { ...current, crop: { ...current.initialCrop } }
        : current,
    );
  }

  function resetCoverAlign() {
    setCoverAlign((current) =>
      current
        ? { ...current, crop: { ...current.initialCrop } }
        : current,
    );
  }

  function mockRemovePhoto() {
    clearAvatarAlignSession();
    setDraft((current) => {
      if (current.photoUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(current.photoUrl);
      }
      return { ...current, photoUrl: null };
    });
  }

  function onSave() {
    if (!dirty || flash === 'saving') {
      return;
    }
    setFlash('saving');
    window.setTimeout(() => {
      if (scenario === 'save-error') {
        setFlash('error');
        return;
      }
      setBaseline(cloneDraft(draft));
      setFlash('saved');
      window.setTimeout(() => setFlash('idle'), 1600);
    }, 900);
  }

  function requestCancel() {
    if (!dirty) {
      return;
    }
    setNested('cancel-confirm');
  }

  function confirmCancel() {
    setDraft(cloneDraft(baseline));
    setFlash('idle');
    closeNested();
  }

  const coverMode = resolvePublicCoverMode(draft);
  const coverStyle = publicCoverCssVars(draft);
  const initials = draft.displayName.trim().slice(0, 1).toUpperCase() || '?';
  const sheetOpen = nested !== null;
  const barHidden = sheetOpen;
  const contactOrder = useMemo(
    () => normalizeContactOrder(draft.contactOrder, draft.links),
    [draft.contactOrder, draft.links],
  );
  const linksById = useMemo(() => {
    const map = new Map<string, PrototypeLink>();
    for (const link of draft.links) {
      map.set(link.id, link);
    }
    return map;
  }, [draft.links]);

  return (
    <div className={hideLab ? 'edit-v2-root is-chrome-off' : 'edit-v2-root'}>
      {hideLab ? null : (
        <aside className="edit-v2-lab" aria-label="Сценарии прототипа">
          <p className="edit-v2-lab-kicker">Прототип · без API</p>
          <h1 className="edit-v2-lab-title">Редактировать v2</h1>
          <p className="muted edit-v2-lab-note">
            Моки. Mutation endpoints не вызываются. Композиция как у `/u/…`.
          </p>
          <label className="edit-v2-lab-select">
            Сценарий
            <select
              value={scenario}
              onChange={(event) =>
                setScenario(event.target.value as PrototypeScenario)
              }
            >
              {(Object.keys(SCENARIO_LABELS) as PrototypeScenario[]).map((key) => (
                <option key={key} value={key}>
                  {SCENARIO_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <p className="muted edit-v2-lab-meta">
            Статус: <strong>{draft.status}</strong>
            {dirty ? ' · есть изменения' : ' · без изменений'}
          </p>
        </aside>
      )}

      <div className="edit-v2-stage">
        <header className="edit-v2-top">
          <p className="brand brand-mark">
            Sign<span>et</span>
          </p>
          <button
            type="button"
            className="button secondary edit-v2-manage"
            onClick={() => setNested('card-actions')}
          >
            Управление
          </button>
        </header>

        {flash === 'error' ? (
          <p className="error edit-v2-banner" role="alert">
            Не удалось сохранить. Черновик на экране сохранён — можно повторить.
          </p>
        ) : null}
        {flash === 'saved' ? (
          <p className="edit-v2-banner is-ok" role="status">
            Сохранено (мок).
          </p>
        ) : null}

        <main
          className={
            coverHot
              ? 'public-shell edit-v2-shell is-cover-hot'
              : 'public-shell edit-v2-shell'
          }
          data-cover={coverMode}
          style={coverStyle as CSSProperties}
        >
          {/* Visual only: full cover band tint on hover (matches public 42% band). */}
          <div className="edit-v2-cover-tint" aria-hidden="true" />

          <button
            type="button"
            className="edit-v2-cover-badge"
            aria-label="Изменить фон"
            onClick={() => openCover()}
            onMouseEnter={() => setCoverHot(true)}
            onMouseLeave={() => setCoverHot(false)}
            onFocus={() => setCoverHot(true)}
            onBlur={() => setCoverHot(false)}
          >
            <ImageGlyph />
          </button>
          <button
            type="button"
            className="edit-v2-media-hit edit-v2-cover-hit"
            aria-label="Изменить фон"
            tabIndex={-1}
            onClick={() => openCover()}
            onMouseEnter={() => setCoverHot(true)}
            onMouseLeave={() => setCoverHot(false)}
          >
            <span className="edit-v2-media-scrim edit-v2-cover-scrim">
              <span className="edit-v2-media-label">Изменить фон</span>
            </span>
          </button>

          <input
            ref={photoInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            hidden
            onChange={(event) => onPhotoFile(event.target.files?.[0] ?? null)}
          />
          <input
            ref={coverInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            hidden
            onChange={(event) => onCoverFile(event.target.files?.[0] ?? null)}
          />

          <section className="public-card edit-v2-card" aria-label="Черновик визитки">
            <div className="public-photo-wrap edit-v2-photo-wrap">
              {draft.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="public-photo" src={draft.photoUrl} alt="" />
              ) : (
                <div className="public-photo-fallback">{initials}</div>
              )}
              <button
                type="button"
                className="edit-v2-media-hit edit-v2-photo-hit"
                aria-label={
                  draft.photoUrl ? 'Подогнать фото' : 'Добавить фото'
                }
                onClick={onAvatarHit}
              >
                <span className="edit-v2-media-scrim">
                  <span className="edit-v2-media-badge" aria-hidden="true">
                    <CameraGlyph />
                  </span>
                  <span className="edit-v2-media-label">
                    {draft.photoUrl ? 'Подогнать фото' : 'Добавить фото'}
                  </span>
                </span>
              </button>
              {draft.photoUrl ? (
                <button
                  type="button"
                  className="edit-v2-media-remove"
                  aria-label="Удалить фото"
                  onClick={(event) => {
                    event.stopPropagation();
                    mockRemovePhoto();
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>

            <button
              type="button"
              className="edit-v2-block"
              onClick={() => openProfile()}
            >
              <span className="public-name">{draft.displayName}</span>
              {draft.jobTitle ? (
                <span className="public-meta">{draft.jobTitle}</span>
              ) : (
                <span className="edit-v2-placeholder">Добавить должность</span>
              )}
              {draft.companyName ? (
                <span className="public-meta">{draft.companyName}</span>
              ) : (
                <span className="edit-v2-placeholder">Добавить компанию</span>
              )}
              {draft.summary ? (
                <span className="public-summary">{draft.summary}</span>
              ) : (
                <span className="edit-v2-placeholder">Добавить описание</span>
              )}
              <span className="edit-v2-block-hint">Изменить основное</span>
            </button>

            <nav
              className="public-contacts edit-v2-contacts"
              aria-label="Контакты черновика. Перетащите за ручку, чтобы изменить порядок."
            >
              {contactOrder.map((key) => {
                const isDragging = dragKey === key;
                const isOver = overKey === key && dragKey !== null && dragKey !== key;
                if (key === 'phone') {
                  return (
                    <ContactRow
                      key={key}
                      contactKey={key}
                      kind="phone"
                      label={draft.phone || 'Добавить телефон'}
                      empty={!draft.phone}
                      dragging={isDragging}
                      dropTarget={isOver}
                      onClick={() => openPhone()}
                      onHandlePointerDown={onContactHandlePointerDown}
                      onHandlePointerMove={onContactHandlePointerMove}
                      onHandlePointerUp={onContactHandlePointerUp}
                    />
                  );
                }
                if (key === 'email') {
                  return (
                    <ContactRow
                      key={key}
                      contactKey={key}
                      kind="email"
                      label={draft.email || 'Добавить e-mail'}
                      empty={!draft.email}
                      badge={
                        draft.email && !draft.showEmail
                          ? 'Не показывается в публичной визитке'
                          : null
                      }
                      dragging={isDragging}
                      dropTarget={isOver}
                      onClick={() => openEmail()}
                      onHandlePointerDown={onContactHandlePointerDown}
                      onHandlePointerMove={onContactHandlePointerMove}
                      onHandlePointerUp={onContactHandlePointerUp}
                    />
                  );
                }
                if (key === 'website') {
                  return (
                    <ContactRow
                      key={key}
                      contactKey={key}
                      kind="website"
                      label={
                        draft.websiteUrl
                          ? draft.websiteUrl.replace(/^https?:\/\//, '')
                          : 'Добавить сайт'
                      }
                      empty={!draft.websiteUrl}
                      dragging={isDragging}
                      dropTarget={isOver}
                      onClick={() => openWebsite()}
                      onHandlePointerDown={onContactHandlePointerDown}
                      onHandlePointerMove={onContactHandlePointerMove}
                      onHandlePointerUp={onContactHandlePointerUp}
                    />
                  );
                }
                const link = linksById.get(key);
                if (!link) {
                  return null;
                }
                return (
                  <ContactRow
                    key={key}
                    contactKey={key}
                    kind={resolveContactKind({
                      key: link.id,
                      type: link.type,
                      url: link.url,
                      channel: 'link',
                    })}
                    label={link.label}
                    dragging={isDragging}
                    dropTarget={isOver}
                    onClick={() => openLink(link)}
                    onHandlePointerDown={onContactHandlePointerDown}
                    onHandlePointerMove={onContactHandlePointerMove}
                    onHandlePointerUp={onContactHandlePointerUp}
                  />
                );
              })}
            </nav>

            <button
              type="button"
              className="button secondary edit-v2-add-contact"
              onClick={openAddLink}
            >
              Добавить контакт
            </button>
          </section>
        </main>

        <div
          className={
            barHidden
              ? 'edit-v2-bar is-hidden'
              : 'edit-v2-bar'
          }
          role="region"
          aria-label="Общие действия"
        >
          <button
            type="button"
            className="button secondary"
            disabled={!dirty || flash === 'saving'}
            onClick={requestCancel}
          >
            Отменить
          </button>
          <button
            type="button"
            className="button accent"
            disabled={!dirty || flash === 'saving'}
            onClick={onSave}
          >
            {flash === 'saving' ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </div>

      <NestedSheet
        open={nested === 'profile'}
        title="Основное"
        onClose={closeNested}
        footer={
          <>
            <button type="button" className="button secondary" onClick={closeNested}>
              Отмена
            </button>
            <button type="button" className="button accent" onClick={applyProfile}>
              Применить
            </button>
          </>
        }
      >
        <label>
          ФИО *
          <input
            value={profileForm.displayName}
            maxLength={120}
            onChange={(event) =>
              setProfileForm((current) => ({
                ...current,
                displayName: event.target.value,
              }))
            }
          />
        </label>
        <label>
          Должность
          <input
            value={profileForm.jobTitle}
            maxLength={120}
            onChange={(event) =>
              setProfileForm((current) => ({
                ...current,
                jobTitle: event.target.value,
              }))
            }
          />
        </label>
        <label>
          Компания
          <input
            value={profileForm.companyName}
            maxLength={120}
            onChange={(event) =>
              setProfileForm((current) => ({
                ...current,
                companyName: event.target.value,
              }))
            }
          />
        </label>
        <label>
          Описание
          <textarea
            rows={3}
            value={profileForm.summary}
            maxLength={1000}
            onChange={(event) =>
              setProfileForm((current) => ({
                ...current,
                summary: event.target.value,
              }))
            }
          />
        </label>
      </NestedSheet>

      <NestedSheet
        open={nested === 'phone'}
        title="Телефон"
        onClose={closeNested}
        footer={
          <>
            <button type="button" className="button secondary" onClick={closeNested}>
              Отмена
            </button>
            <button type="button" className="button accent" onClick={applyPhone}>
              Применить
            </button>
          </>
        }
      >
        <label>
          Номер
          <input
            value={contactForm.value}
            inputMode="tel"
            onChange={(event) =>
              setContactForm((current) => ({
                ...current,
                value: event.target.value,
              }))
            }
          />
        </label>
      </NestedSheet>

      <NestedSheet
        open={nested === 'email'}
        title="E-mail"
        onClose={closeNested}
        footer={
          <>
            <button type="button" className="button secondary" onClick={closeNested}>
              Отмена
            </button>
            <button type="button" className="button accent" onClick={applyEmail}>
              Применить
            </button>
          </>
        }
      >
        <label>
          E-mail карточки
          <input
            type="email"
            value={contactForm.value}
            onChange={(event) =>
              setContactForm((current) => ({
                ...current,
                value: event.target.value,
              }))
            }
          />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={contactForm.showEmail}
            onChange={(event) =>
              setContactForm((current) => ({
                ...current,
                showEmail: event.target.checked,
              }))
            }
          />
          Показывать e-mail публично
        </label>
        <p className="muted">
          Не подставляем e-mail аккаунта. Сейчас в моке:{' '}
          {contactForm.showEmail ? 'виден' : 'скрыт на публичной странице'}.
        </p>
      </NestedSheet>

      <NestedSheet
        open={nested === 'website'}
        title="Сайт"
        onClose={closeNested}
        footer={
          <>
            <button type="button" className="button secondary" onClick={closeNested}>
              Отмена
            </button>
            <button type="button" className="button accent" onClick={applyWebsite}>
              Применить
            </button>
          </>
        }
      >
        <label>
          URL
          <input
            type="url"
            placeholder="https://"
            value={contactForm.value}
            onChange={(event) =>
              setContactForm((current) => ({
                ...current,
                value: event.target.value,
              }))
            }
          />
        </label>
      </NestedSheet>

      <NestedSheet
        open={nested === 'link' || nested === 'add-link'}
        title={nested === 'add-link' ? 'Новый контакт' : 'Ссылка'}
        onClose={closeNested}
        footer={
          <>
            {nested === 'link' ? (
              <button type="button" className="button secondary" onClick={deleteLink}>
                Удалить
              </button>
            ) : (
              <button type="button" className="button secondary" onClick={closeNested}>
                Отмена
              </button>
            )}
            <button type="button" className="button accent" onClick={applyLink}>
              Применить
            </button>
          </>
        }
      >
        <label>
          Тип
          <select
            value={contactForm.type}
            onChange={(event) =>
              setContactForm((current) => ({
                ...current,
                type: event.target.value as PrototypeLink['type'],
              }))
            }
          >
            <option value="telegram">Telegram</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="link">Другая ссылка</option>
          </select>
        </label>
        <label>
          Подпись
          <input
            value={contactForm.label}
            onChange={(event) =>
              setContactForm((current) => ({
                ...current,
                label: event.target.value,
              }))
            }
          />
        </label>
        <label>
          URL
          <input
            type="url"
            placeholder="https://"
            value={contactForm.url}
            onChange={(event) =>
              setContactForm((current) => ({
                ...current,
                url: event.target.value,
              }))
            }
          />
        </label>
      </NestedSheet>

      <NestedSheet
        open={nested === 'cover'}
        title="Фон"
        onClose={closeNested}
        footer={
          <>
            <button type="button" className="button secondary" onClick={closeNested}>
              Отмена
            </button>
            <button
              type="button"
              className="button accent"
              onClick={() => {
                if (coverForm.mode === 'image' && !draft.coverImageUrl) {
                  openCoverPicker();
                  return;
                }
                applyCover();
              }}
            >
              {coverForm.mode === 'image' && !draft.coverImageUrl
                ? 'Выбрать файл'
                : 'Применить'}
            </button>
          </>
        }
      >
        <div className="edit-v2-cover-modes" role="radiogroup" aria-label="Тип фона">
          {(
            [
              ['default', 'Стандартный'],
              ['color', 'Цвет'],
              ['image', 'Изображение'],
            ] as const
          ).map(([mode, label]) => (
            <label key={mode} className="check-row">
              <input
                type="radio"
                name="cover-mode"
                checked={coverForm.mode === mode}
                onChange={() =>
                  setCoverForm((current) => ({ ...current, mode }))
                }
              />
              {label}
            </label>
          ))}
        </div>
        {coverForm.mode === 'color' ? (
          <label className="edit-v2-color-field">
            Цвет
            <span className="edit-v2-color-row">
              <input
                type="color"
                className="edit-v2-color-input"
                value={coverForm.color}
                onChange={(event) =>
                  setCoverForm((current) => ({
                    ...current,
                    color: event.target.value.toUpperCase(),
                  }))
                }
              />
              <span className="edit-v2-color-hex" aria-hidden="true">
                {coverForm.color}
              </span>
            </span>
          </label>
        ) : null}
        {coverForm.mode === 'image' ? (
          <div className="edit-v2-sheet-actions">
            <button
              type="button"
              className="button secondary"
              onClick={openCoverPicker}
            >
              Выбрать изображение
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => void beginCoverAlign(MOCK_COVER_DATA_URL, false)}
            >
              Подставить mock-картинку
            </button>
            {draft.coverImageUrl ? (
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  void beginCoverAlign(draft.coverImageUrl!, false)
                }
              >
                Подогнать кадр
              </button>
            ) : null}
          </div>
        ) : null}
      </NestedSheet>

      <AvatarAlignDialog
        open={avatarAlign !== null}
        objectUrl={avatarAlign?.objectUrl ?? ''}
        crop={
          avatarAlign?.crop ??
          initialCropState(1, 1, AVATAR_FRAME_SIZE)
        }
        busy={avatarAlignBusy}
        onCropChange={(crop) =>
          setAvatarAlign((current) =>
            current ? { ...current, crop } : current,
          )
        }
        onCancel={cancelAvatarAlign}
        onApply={() => void applyAvatarAlign()}
        onReset={resetAvatarAlign}
        onRotate={() => void rotateAvatarAlign()}
        onPickOther={() => {
          clearAvatarAlignSession();
          openPhotoPicker();
        }}
      />

      <CoverAlignDialog
        open={coverAlign !== null}
        objectUrl={coverAlign?.objectUrl ?? ''}
        crop={
          coverAlign?.crop ??
          initialCropState(1, 1, COVER_FRAME_WIDTH, COVER_FRAME_HEIGHT)
        }
        busy={coverAlignBusy}
        onCropChange={(crop) =>
          setCoverAlign((current) => (current ? { ...current, crop } : current))
        }
        onCancel={cancelCoverAlign}
        onApply={() => void applyCoverAlign()}
        onReset={resetCoverAlign}
        onPickOther={() => {
          clearCoverAlignSession();
          openCoverPicker();
        }}
      />

      <NestedSheet
        open={nested === 'card-actions'}
        title="Управление визиткой"
        onClose={closeNested}
        footer={
          <button type="button" className="button secondary" onClick={closeNested}>
            Закрыть
          </button>
        }
      >
        <label>
          Slug
          <input
            value={draft.slug}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                slug: event.target.value,
              }))
            }
          />
        </label>
        <p className="muted">Статус сейчас: {draft.status}</p>
        <div className="edit-v2-sheet-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              setDraft((current) => ({ ...current, status: 'published' }))
            }
          >
            Опубликовать
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              setDraft((current) => ({ ...current, status: 'draft' }))
            }
          >
            Снять с публикации
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              setDraft((current) => ({ ...current, status: 'archived' }))
            }
          >
            В архив
          </button>
          <button type="button" className="button secondary" disabled>
            Удалить (мок, без действия)
          </button>
        </div>
        <p className="muted">
          По вашему решению v2 — полноценный режим: все действия с визиткой здесь.
        </p>
      </NestedSheet>

      <NestedSheet
        open={nested === 'cancel-confirm'}
        title="Отменить изменения?"
        onClose={closeNested}
        footer={
          <>
            <button type="button" className="button secondary" onClick={closeNested}>
              Продолжить редактирование
            </button>
            <button type="button" className="button accent" onClick={confirmCancel}>
              Отменить изменения
            </button>
          </>
        }
      >
        <p>
          Несохранённые правки текста, контактов, фото и фона этой сессии будут
          сброшены (в прототипе — локально).
        </p>
      </NestedSheet>
    </div>
  );
}

function DragHandleGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="5" cy="4" r="1.2" fill="currentColor" />
      <circle cx="11" cy="4" r="1.2" fill="currentColor" />
      <circle cx="5" cy="8" r="1.2" fill="currentColor" />
      <circle cx="11" cy="8" r="1.2" fill="currentColor" />
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="11" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

function ContactRow({
  contactKey,
  kind,
  label,
  empty,
  badge,
  dragging,
  dropTarget,
  onClick,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
}: {
  contactKey: ContactOrderKey;
  kind: Parameters<typeof ContactIcon>[0]['kind'];
  label: string;
  empty?: boolean;
  badge?: string | null;
  dragging?: boolean;
  dropTarget?: boolean;
  onClick: () => void;
  onHandlePointerDown: (
    event: ReactPointerEvent<HTMLButtonElement>,
    key: ContactOrderKey,
  ) => void;
  onHandlePointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onHandlePointerUp: () => void;
}) {
  const className = [
    'public-contact',
    'edit-v2-contact',
    empty ? 'is-empty' : '',
    dragging ? 'is-dragging' : '',
    dropTarget ? 'is-drop-target' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} data-contact-key={contactKey}>
      <button type="button" className="edit-v2-contact-main" onClick={onClick}>
        <span className="public-contact-icon">
          <ContactIcon kind={kind} />
        </span>
        <span className="edit-v2-contact-copy">
          <span className="public-contact-value">{label}</span>
          {badge ? <span className="edit-v2-privacy">{badge}</span> : null}
        </span>
      </button>
      <button
        type="button"
        className="edit-v2-contact-handle"
        aria-label={`Перетащить: ${label}`}
        onPointerDown={(event) => onHandlePointerDown(event, contactKey)}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
      >
        <DragHandleGlyph />
      </button>
    </div>
  );
}

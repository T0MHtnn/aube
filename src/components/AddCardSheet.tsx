import { useState } from 'react';
import { CARD_TYPES, getCardDefinition, type CardDefinition } from '../cards/registry';
import { SIZE_LABELS, type CardSize } from '../lib/types';
import { CardFrame } from './CardFrame';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import styles from './Sheet.module.css';

type Step =
  | { kind: 'catalogue' }
  | { kind: 'config'; def: CardDefinition }
  | { kind: 'size'; def: CardDefinition; config: Record<string, unknown> };

interface Props {
  /** Reprend directement au choix de la taille (retour de connexion Google) */
  resume?: { type: string; config: Record<string, unknown> } | null;
  onClose: () => void;
  onAdd: (type: string, size: CardSize, config: Record<string, unknown>) => Promise<void>;
}

export function AddCardSheet({ resume, onClose, onAdd }: Props) {
  const [step, setStep] = useState<Step>(() => {
    const def = resume && getCardDefinition(resume.type);
    return def && resume ? { kind: 'size', def, config: resume.config } : { kind: 'catalogue' };
  });

  const choose = (def: CardDefinition) =>
    setStep(def.ConfigForm ? { kind: 'config', def } : { kind: 'size', def, config: {} });

  if (step.kind === 'catalogue') {
    return (
      <Sheet label="Ajouter une carte" onClose={onClose}>
        <div className={styles.head}>
          <h2>Ajouter une carte</h2>
          <button type="button" className={styles.iconButton} aria-label="Fermer" onClick={onClose}>
            <Icon name="close" size={18} strokeWidth={2.4} />
          </button>
        </div>
        <ul className={styles.catalogue}>
          {CARD_TYPES.map((def) => {
            const soon = def.status === 'soon';
            return (
              <li key={def.type}>
                <button type="button" className={styles.row} disabled={soon} onClick={() => choose(def)}>
                  <span className={styles.rowIcon}>
                    <Icon name={def.icon} size={22} />
                  </span>
                  <span className={styles.rowText}>
                    <span className={styles.rowName}>
                      {def.name}
                      {def.source && <span className={styles.badge}>{def.source}</span>}
                    </span>
                    <span>{def.description}</span>
                  </span>
                  {soon ? (
                    <span className={styles.soon}>Bientôt</span>
                  ) : (
                    <span className={styles.rowPlus}>
                      <Icon name="plus" size={16} strokeWidth={2.6} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    );
  }

  const hasConfig = Boolean(step.def.ConfigForm);
  const back = () =>
    setStep(step.kind === 'size' && hasConfig ? { kind: 'config', def: step.def } : { kind: 'catalogue' });

  return (
    <Sheet label={step.def.name} onClose={onClose}>
      <div className={styles.head}>
        <button type="button" className={`${styles.iconButton} ${styles.back}`} aria-label="Retour" onClick={back}>
          <Icon name="back" strokeWidth={2.4} />
        </button>
        <h2>{step.kind === 'size' ? 'Quelle taille ?' : step.def.name}</h2>
        {hasConfig && <span className={styles.step}>Étape {step.kind === 'config' ? 1 : 2} sur 2</span>}
      </div>
      {hasConfig && (
        <div className={styles.progress} aria-hidden="true">
          <span className={styles.done} />
          <span className={step.kind === 'size' ? styles.done : undefined} />
        </div>
      )}

      {step.kind === 'config' && step.def.ConfigForm && (
        <step.def.ConfigForm onSubmit={(config) => setStep({ kind: 'size', def: step.def, config })} />
      )}

      {step.kind === 'size' && <SizeStep def={step.def} config={step.config} onAdd={onAdd} />}
    </Sheet>
  );
}

function SizeStep({
  def,
  config,
  onAdd,
}: {
  def: CardDefinition;
  config: Record<string, unknown>;
  onAdd: Props['onAdd'];
}) {
  const [size, setSize] = useState<CardSize>(def.defaultSize);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onAdd(def.type, size, config);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La carte n’a pas pu être ajoutée. Réessaie.');
      setBusy(false);
    }
  };

  return (
    <>
      <fieldset className={styles.sizes}>
        <legend className="visually-hidden">Taille de la carte</legend>
        {def.sizes.map((s) => (
          <label key={s} className={`${styles.sizeOption} ${s === size ? styles.selected : ''}`}>
            <span className={styles.sizeHead}>
              <input type="radio" name="size" checked={s === size} onChange={() => setSize(s)} />
              <strong>{SIZE_LABELS[s].name}</strong>
              <span>{SIZE_LABELS[s].hint}</span>
            </span>
            <div
              className={styles.preview}
              style={{ width: s === 'small' ? 'var(--cell)' : '100%' }}
              aria-hidden="true"
            >
              <CardFrame card={{ type: def.type, size: s, config }} />
            </div>
          </label>
        ))}
      </fieldset>
      {error && <p className={styles.error}>{error}</p>}
      <button type="button" className={styles.submit} disabled={busy} onClick={submit}>
        {busy ? 'Ajout…' : 'Ajouter au tableau'}
      </button>
    </>
  );
}

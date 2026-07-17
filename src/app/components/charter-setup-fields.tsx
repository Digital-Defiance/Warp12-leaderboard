import {
  OFFICIAL_CHARTER_HOUSE_RULES,
  OFFICIAL_CHARTER_MODULES,
  type CharterHouseRulesInput,
  type CharterModulesInput,
} from '@warp12/tei-core';

import formStyles from '../components/sign-in-panel.module.scss';
import panelStyles from '../components/panel.module.scss';
import styles from './charter-setup-fields.module.scss';

export interface CharterSetupValue {
  modules: CharterModulesInput;
  houseRules: CharterHouseRulesInput;
}

export const DEFAULT_CHARTER_SETUP: CharterSetupValue = {
  modules: { ...OFFICIAL_CHARTER_MODULES },
  houseRules: { ...OFFICIAL_CHARTER_HOUSE_RULES },
};

interface CharterSetupFieldsProps {
  value: CharterSetupValue;
  onChange: (value: CharterSetupValue) => void;
  disabled?: boolean;
  /** Charter fleet size — the hand-size option only applies to 7–8 captains. */
  playerCount?: number;
}

function CheckboxRow({
  checked,
  disabled,
  onChange,
  children,
  className,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children: string;
  className?: string;
}) {
  return (
    <label className={`${styles.checkboxRow} ${className || ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

export function CharterSetupFields({
  value,
  onChange,
  disabled = false,
  playerCount,
}: CharterSetupFieldsProps) {
  const setModules = (patch: CharterModulesInput) =>
    onChange({ ...value, modules: { ...value.modules, ...patch } });

  const setHouseRules = (patch: CharterHouseRulesInput) =>
    onChange({ ...value, houseRules: { ...value.houseRules, ...patch } });

  const applyOfficial = () => onChange(DEFAULT_CHARTER_SETUP);

  return (
    <div className={formStyles.stack}>
      <p className={panelStyles.panelBody}>
        Pick the same lobby options you use at fleet muster — every rated match
        under this crew must match (modules, house rules, fleet size, and
        objective above).
      </p>
      <button
        type="button"
        className={formStyles.buttonSecondary}
        disabled={disabled}
        onClick={applyOfficial}
      >
        Official Warp 12 preset
      </button>

      <h3 className={styles.sectionTitle}>Optional directives</h3>
      <CheckboxRow
        checked={value.modules.continuum ?? false}
        disabled={disabled}
        onChange={(checked) => setModules({ continuum: checked })}
      >
        Module Alpha — Continuum
      </CheckboxRow>
      <CheckboxRow
        checked={value.modules.salamanderPenalty ?? false}
        disabled={disabled}
        onChange={(checked) => setModules({ salamanderPenalty: checked })}
      >
        Module Beta — Salamander penalty
      </CheckboxRow>
      
      <h3 className={styles.sectionTitle}>Rated Modules</h3>
      <CheckboxRow
        checked={value.modules.sensorGrid ?? false}
        disabled={disabled}
        onChange={(checked) => setModules({ sensorGrid: checked })}
      >
        Module Gamma — Sensor Grid (strategic tile market)
      </CheckboxRow>
      {value.modules.sensorGrid ? (
        <div className={`${formStyles.field} ${styles.subOption}`}>
          <label htmlFor="charter-sensor-grid-size">Sensor Grid size</label>
          <select
            id="charter-sensor-grid-size"
            disabled={disabled}
            value={value.modules.sensorGridSize ?? 5}
            onChange={(e) =>
              setModules({
                sensorGridSize: Number(e.target.value),
              })
            }
          >
            <option value={4}>4 tiles</option>
            <option value={5}>5 tiles (default)</option>
          </select>
        </div>
      ) : null}
      <CheckboxRow
        checked={value.modules.warpDriveSpool ?? false}
        disabled={disabled}
        onChange={(checked) => setModules({ warpDriveSpool: checked })}
      >
        Module Delta — Engage Warp Drive (continuous draw until mismatch)
      </CheckboxRow>
      <CheckboxRow
        checked={value.modules.longestTrail ?? false}
        disabled={disabled}
        onChange={(checked) => setModules({ longestTrail: checked })}
      >
        Module Theta — Longest Trail Bonus
      </CheckboxRow>
      {value.modules.longestTrail ? (
        <div className={`${formStyles.field} ${styles.subOption}`}>
          <label htmlFor="charter-longest-trail-bonus">Longest Trail bonus</label>
          <select
            id="charter-longest-trail-bonus"
            disabled={disabled}
            value={value.modules.longestTrailBonus ?? -3}
            onChange={(e) =>
              setModules({
                longestTrailBonus: Number(e.target.value),
              })
            }
          >
            <option value={-3}>-3 points (default)</option>
            <option value={-5}>-5 points</option>
            <option value={-7}>-7 points</option>
          </select>
        </div>
      ) : null}
      <CheckboxRow
        checked={value.modules.doubleDown ?? false}
        disabled={disabled}
        onChange={(checked) => setModules({ doubleDown: checked })}
      >
        Module Iota — Double Down (next player draws extra tiles)
      </CheckboxRow>
      {value.modules.doubleDown ? (
        <div className={`${formStyles.field} ${styles.subOption}`}>
          <label htmlFor="charter-double-down-draw">Extra tiles to draw</label>
          <select
            id="charter-double-down-draw"
            disabled={disabled}
            value={value.modules.doubleDownDrawCount ?? 2}
            onChange={(e) =>
              setModules({
                doubleDownDrawCount: Number(e.target.value),
              })
            }
          >
            <option value={1}>1 tile</option>
            <option value={2}>2 tiles (default)</option>
            <option value={3}>3 tiles</option>
          </select>
        </div>
      ) : null}
      <CheckboxRow
        checked={value.modules.temporalDebt ?? false}
        disabled={disabled}
        onChange={(checked) => setModules({ temporalDebt: checked })}
      >
        Module Eta — Temporal Debt (pay 2 points per draw from uncharted)
      </CheckboxRow>
      {value.modules.temporalDebt ? (
        <div className={`${formStyles.field} ${styles.subOption}`}>
          <label htmlFor="charter-temporal-debt-cost">Cost per debt token</label>
          <select
            id="charter-temporal-debt-cost"
            disabled={disabled}
            value={value.modules.temporalDebtCostPerToken ?? 2}
            onChange={(e) =>
              setModules({
                temporalDebtCostPerToken: Number(e.target.value),
              })
            }
          >
            <option value={1}>1 point</option>
            <option value={2}>2 points (default)</option>
            <option value={3}>3 points</option>
          </select>
        </div>
      ) : null}

      <h3 className={styles.sectionTitle}>Fleet Squadrons</h3>
      <CheckboxRow
        checked={value.modules.squadrons ?? false}
        disabled={disabled}
        onChange={(checked) => setModules({ squadrons: checked })}
      >
        Module Zeta — Fleet Squadrons (shared trails &amp; beacons)
      </CheckboxRow>
      {value.modules.squadrons ? (
        <div className={`${formStyles.field} ${styles.subOption}`}>
          <label htmlFor="charter-squadron-size">Captains per squadron</label>
          <select
            id="charter-squadron-size"
            disabled={disabled}
            value={value.modules.squadronSize ?? 2}
            onChange={(e) =>
              setModules({
                squadronSize: Number(e.target.value) === 3 ? 3 : 2,
              })
            }
          >
            <option value={2}>2 (default)</option>
            <option value={3}>3</option>
          </select>
          <p className={panelStyles.panelBody}>
            Online only. Fleet size must divide evenly. Rated Warp 12 writes
            Squad TEI — never the free-for-all ladder.
          </p>
        </div>
      ) : null}

      <h3 className={styles.sectionTitle}>Warped Modules (Exhibition Only)</h3>
      <CheckboxRow
        checked={value.modules.drafting ?? false}
        disabled={disabled}
        onChange={(checked) => setModules({ drafting: checked })}
      >
        Module Epsilon — Tactical Requisition (Drafting)
      </CheckboxRow>
      <CheckboxRow
        checked={value.modules.temporalInversion ?? false}
        disabled={disabled}
        onChange={(checked) => setModules({ temporalInversion: checked })}
      >
        Module Kappa — Temporal Inversion (even rounds score inverted)
      </CheckboxRow>
      <CheckboxRow
        checked={value.modules.wormholes ?? false}
        disabled={disabled}
        onChange={(checked) => setModules({ wormholes: checked })}
      >
        Module Lambda — Wormholes (trail swap on Neutral Zone double)
      </CheckboxRow>

      <h3 className={styles.sectionTitle}>Game options</h3>
      <div className={formStyles.field}>
        <label htmlFor="charter-double-zero">Double-blank (0-0) score</label>
        <select
          id="charter-double-zero"
          disabled={disabled}
          value={value.houseRules.doubleZeroScore ?? 0}
          onChange={(e) =>
            setHouseRules({
              doubleZeroScore: Number(e.target.value) as 0 | 25 | 50,
            })
          }
        >
          <option value={50}>50 (tournament standard)</option>
          <option value={25}>25</option>
          <option value={0}>0 (pips — Warp 12 default)</option>
        </select>
      </div>

      {(playerCount ?? 0) >= 7 ? (
        <div className={formStyles.field}>
          <label htmlFor="charter-large-fleet-hand-size">
            Large fleet hand size (7–8 captains)
          </label>
          <select
            id="charter-large-fleet-hand-size"
            disabled={disabled}
            value={value.houseRules.largeFleetHandSize ?? 10}
            onChange={(e) =>
              setHouseRules({
                largeFleetHandSize: Number(e.target.value) === 11 ? 11 : 10,
              })
            }
          >
            <option value={10}>10 tiles (Warp 12 default)</option>
            <option value={11}>11 tiles (Galt / University Games)</option>
          </select>
        </div>
      ) : null}

      <CheckboxRow
        checked={value.modules.subspaceFracture ?? false}
        disabled={disabled}
        onChange={(checked) => setModules({ subspaceFracture: checked })}
      >
        Subspace Fracture (chicken foot on doubles)
      </CheckboxRow>
      {value.modules.subspaceFracture ? (
        <div className={formStyles.field}>
          <label htmlFor="charter-fracture-scope">Fracture scope</label>
          <select
            id="charter-fracture-scope"
            disabled={disabled}
            value={value.modules.subspaceFractureScope ?? 'own-trail'}
            onChange={(e) =>
              setModules({
                subspaceFractureScope: e.target
                  .value as NonNullable<CharterModulesInput['subspaceFractureScope']>,
              })
            }
          >
            <option value="own-trail">Own Trail</option>
            <option value="all-captains">All Captains</option>
            <option value="all-doubles">All Doubles</option>
          </select>
        </div>
      ) : null}

      <CheckboxRow
        checked={value.houseRules.requireOwnTrailFirst ?? false}
        disabled={disabled}
        onChange={(checked) => setHouseRules({ requireOwnTrailFirst: checked })}
      >
        Require own trail first (Deluxe-style)
      </CheckboxRow>
      <CheckboxRow
        checked={value.houseRules.neutralZoneAfterAllTrails ?? false}
        disabled={disabled}
        onChange={(checked) =>
          setHouseRules({ neutralZoneAfterAllTrails: checked })
        }
      >
        Neutral Zone after all trails started (Deluxe-style)
      </CheckboxRow>
      <CheckboxRow
        checked={value.houseRules.beaconClearsOnAnyPlay ?? false}
        disabled={disabled}
        onChange={(checked) => setHouseRules({ beaconClearsOnAnyPlay: checked })}
      >
        Beacon clears on any play (Deluxe-style)
      </CheckboxRow>
      <CheckboxRow
        checked={value.houseRules.roundStarterPlaysTwo ?? false}
        disabled={disabled}
        onChange={(checked) => setHouseRules({ roundStarterPlaysTwo: checked })}
      >
        Round starter plays two tiles (Deluxe-style)
      </CheckboxRow>
      {value.houseRules.roundStarterPlaysTwo ? (
        <CheckboxRow
          checked={value.houseRules.roundStarterOwnTrailOnly ?? false}
          disabled={disabled}
          onChange={(checked) => setHouseRules({ roundStarterOwnTrailOnly: checked })}
          className={styles.subOption}
        >
          Restrict both tiles to own trail only
        </CheckboxRow>
      ) : null}
      <CheckboxRow
        checked={value.houseRules.dropToImpulseCall ?? false}
        disabled={disabled}
        onChange={(checked) => setHouseRules({ dropToImpulseCall: checked })}
      >
        Drop to Impulse (announce at one tile; opponents may catch)
      </CheckboxRow>
      {value.houseRules.dropToImpulseCall ? (
        <div className={`${formStyles.field} ${styles.subOption}`}>
          <label htmlFor="charter-dti-penalty">Catch penalty</label>
          <select
            id="charter-dti-penalty"
            disabled={disabled}
            value={value.houseRules.dropToImpulseCatchPenalty ?? 1}
            onChange={(e) =>
              setHouseRules({
                dropToImpulseCatchPenalty: Number(e.target.value) === 2 ? 2 : 1,
              })
            }
          >
            <option value={1}>1 tile</option>
            <option value={2}>2 tiles</option>
          </select>
        </div>
      ) : null}
      <CheckboxRow
        checked={value.houseRules.passRedAlertWithoutDraw ?? false}
        disabled={disabled}
        onChange={(checked) =>
          setHouseRules({ passRedAlertWithoutDraw: checked })
        }
      >
        Pass Red Alert without drawing or shields down — only for the captain who
        charted the double, and only before it passes (Yellow alert)
      </CheckboxRow>
      <CheckboxRow
        checked={value.houseRules.manualShieldControl ?? false}
        disabled={disabled}
        onChange={(checked) => setHouseRules({ manualShieldControl: checked })}
      >
        Manual shield control — open your train any time; close only after
        charting your own trail since opening; one shield change per turn
      </CheckboxRow>
      <CheckboxRow
        checked={value.houseRules.allStopCeremony ?? true}
        disabled={disabled}
        onChange={(checked) => setHouseRules({ allStopCeremony: checked })}
      >
        All Stop! ceremony (auto log/sound after Neutral Zone wins and All Stop!
        echo go-outs)
      </CheckboxRow>
    </div>
  );
}

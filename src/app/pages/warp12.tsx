import { Link } from "react-router-dom";
import styles from './warp12.module.scss';

export const Warp12 = () => {
    return (
     <div id='write'>
        <h1 id='the-command-standard-why-warp-12-is-the-definitive-iwdf-benchmark'>
            <span>The Command Standard: Why Warp 12 is the Definitive <span className={styles.iwdfShort}>IWDF</span> Benchmark</span>
        </h1>
        <p>
            <span>The <span className={styles.iwdfLong}>Interstellar Warp Domino Federation</span> (<span className={styles.iwdfShort}>IWDF</span>) recognizes that commanders
            across the fleet utilize various coordinate pool sizes to train their crews.
            From lightning-fast Warp 9 skirmishes to massive, chaotic Warp 18 fleet engagements,
            every configuration has a place in the culture of multi-trail operations.</span>
        </p>
        <p>
            <span>However, for official federation play, rated campaigns, and the calculation of
            Tactical Engine Intelligence (TEI), the <span className={styles.iwdfShort}>IWDF</span> strictly sanctions </span>
            <strong><span>Warp Factor 12</span></strong><span> as the singular, standardized
            proving ground.</span></p><p><span>Here is the tactical doctrine behind that decision.</span>
        </p>
        <h3 id='1-the-mathematics-of-the-void-strategic-balance'>
            <span>1. The Mathematics of the Void (Strategic Balance)</span>
        </h3>
        <p>
            <span>At the heart of the <span className={styles.iwdfShort}>IWDF&#39;s</span> charter is the belief that a captain’s rating must
            reflect strategic skill, not the luck of the draw. Warp 12—comprising exactly 91
            navigational coordinates—strikes the mathematical sweet spot of multi-trail operations.</span>
        </p>
        <ul>
            <li>
                <p><strong><span>Warp 9 (55 coordinates)</span></strong><span> fundamentally constricts
                the Uncharted Sectors. The boneyard is too shallow to support prolonged tactical routing,
                turning matches into rapid sprints where starting-hand luck dominates over mid-game
                adaptability.</span></p>
            </li>
            <li>
                <p><strong><span>Warp 15 (136 coordinates) and Warp 18 (190 coordinates)</span></strong>
                <span> suffer from the opposite problem: critical mass entropy. While excellent for massive,
                12-to-18 player unrated engagements, the sheer volume of coordinates introduces extreme
                volatility. In these massive pools, statistical noise overpowers deliberate strategy,
                making accurate skill assessment mathematically impossible.</span></p>
            </li>
        </ul>
        <p>
            <span>Warp 12 provides enough coordinates to build complex warp trails and manipulate the
            communal Neutral Zone, while maintaining a perfectly balanced Uncharted Sector pool to punish
            poor resource management.</span>
        </p>
        <h3 id='2-tei-integrity-and-fleet-liquidity'>
            <span>2. TEI Integrity and Fleet Liquidity</span>
        </h3>
        <p>
            <span>Tactical Engine Intelligence (TEI) is the ultimate measure of a captain’s navigational
            acumen. For a rating system to be accurate, prestigious, and highly predictive, it requires
            liquidity—a dense, unified pool of captains competing on the exact same board.</span>
        </p>
        <p>
            <span>To sanction multiple Warp Factors would be to fragment the fleet across disparate ladders.
            A 2,000 TEI rating in a Warp 9 league does not translate to a 2,000 TEI rating in a Warp 18 league.
            By locking global TEI to a single parameter, the <span className={styles.iwdfShort}>IWDF</span>
            ensures that when you look at a rival captain’s rank, you know exactly what they survived to earn it.
            Warp 12 is our 64-square chessboard.</span>
        </p>
        <h3 id='3-the-role-of-auxiliary-sectors-exhibition-play'>
            <span>3. The Role of Auxiliary Sectors (Exhibition Play)</span>
        </h3>
        <p>
            <span>The <span className={styles.iwdfShort}>IWDF&#39;s</span> decision to lock TEI to Warp 12 does not 
            banish other formats from the Spacedock. We fully support captains spinning up custom lobbies for
            extended-set configurations.</span>
        </p>
        <p>
            <span>Warp 9 is fully supported as a high-speed training exercise, and Warp 15 and 18 remain
            available as Unrated Exhibition sectors—perfect for massive fleet gatherings and casual
            operations. They still utilize the exact same engine, the same UI, and the same fleet decorum.</span>
        </p>
        <p>
            <span>But when the stakes are real, and your TEI is on the line, there is only one standard.</span>
        </p>
        <p>
            <strong><span>Chart the sector. Empty your hand. <Link to="https://warp.iwdf.org/factor?factor=12">Master Warp 12</Link>.</span></strong>
        </p>
    </div>
    );
}
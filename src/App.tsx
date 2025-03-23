import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { it } from "date-fns/locale";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [loadingDelta, setLoadingDelta] = useState(false);
  const [loadingInf, setLoadingInf] = useState(false);
  const [delta, setDelta] = useState(20);

  const [inf, setInf] = useState(false);
  const [systems, setSystems] = useState<string[]>([]);
  const [missions, setMissions] = useState<any>({});
  const [marketBuy, setMarketBuy] = useState<any>({});
  const [marketSell, setMarketSell] = useState<any>({});
  const [bounties, setBounties] = useState<any>({});
  const [navData, setNavData] = useState<any>({});
  const [factionKillBonds, setFactionKillBonds] = useState<any>({});
  const [expandedSystems, setExpandedSystems] = useState<{ [key: string]: boolean }>({});
  
  // Set initial dates: endDate to now, startDate to 24 hours ago
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const [startDate, setStartDate] = useState<Date | null>(yesterday);
  const [endDate, setEndDate] = useState<Date | null>(now);

  // Register Italian locale
  registerLocale('it', it);

  async function getDelta() {
    setLoadingDelta(true);
    setInf(false);
    const res = await fetch("http://3.126.237.15/?delta=" + delta)
    setGreetMsg(await res.text());
    setLoadingDelta(false);
  }

  async function activities() {
    setLoadingInf(true);
    setGreetMsg("");
    setInf(true);

    try {
      // Format dates for API requests
      const formatDateForApi = (date: Date | null) => {
        if (!date) return "";
        return date.toISOString();
      };

      const startDateParam = formatDateForApi(startDate);
      const endDateParam = formatDateForApi(endDate);
      const dateParams = `?start_date=${encodeURIComponent(startDateParam)}&end_date=${encodeURIComponent(endDateParam)}`;

      // Systems endpoint doesn't need date parameters
      const systemsRes = await fetch("http://3.126.237.15/bgs/systems/")
      
      // All other endpoints need date parameters
      const missionsRes = await fetch(`http://3.126.237.15/bgs/missions/${dateParams}`)
      const marketBuyRes = await fetch(`http://3.126.237.15/bgs/market_buy/${dateParams}`)
      const marketSellRes = await fetch(`http://3.126.237.15/bgs/market_sell/${dateParams}`)
      const bountiesRes = await fetch(`http://3.126.237.15/bgs/bounties/${dateParams}`)
      const navDataRes = await fetch(`http://3.126.237.15/bgs/nav_data/${dateParams}`)
      const factionKillBondsRes = await fetch(`http://3.126.237.15/bgs/faction_kill_bonds/${dateParams}`)

      const systemsData = await systemsRes.json();
      const missionsData = await missionsRes.json();
      const marketBuyData = await marketBuyRes.json();
      const marketSellData = await marketSellRes.json();
      const bountiesData = await bountiesRes.json();
      const navDataData = await navDataRes.json();
      const factionKillBondsData = await factionKillBondsRes.json();

      setSystems(systemsData);
      setMissions(missionsData);
      setMarketBuy(marketBuyData);
      setMarketSell(marketSellData);
      setBounties(bountiesData);
      setNavData(navDataData);
      setFactionKillBonds(factionKillBondsData);

      // Initialize expanded state for all systems
      const initialExpandedState: { [key: string]: boolean } = {};
      systemsData.forEach((system: string) => {
        initialExpandedState[system] = false;
      });
      setExpandedSystems(initialExpandedState);
    } catch (error) {
      console.error("Error fetching BGS data:", error);
    }

    setLoadingInf(false);
  }

  // Helper function to format credit amounts
  const formatCredits = (creditString: string) => {
    // Ho scoperto che non mi serve riformattare con i punti, le virgole
    // vanno benone
    // return creditString ? creditString.replace(/,/g, ".") : "0";
    return creditString
  };

  // Helper function to toggle system expansion
  const toggleSystemExpansion = (system: string) => {
    setExpandedSystems(prev => ({
      ...prev,
      [system]: !prev[system]
    }));
  };

  // Helper function to check if a system has any data
  const hasSystemData = (system: string) => {
    return (
      (missions[system] && Object.keys(missions[system]).length > 0) ||
      (marketBuy[system] && Object.keys(marketBuy[system]).length > 0) ||
      (marketSell[system] && Object.keys(marketSell[system]).length > 0) ||
      (bounties[system] && Object.keys(bounties[system]).length > 0) ||
      (navData[system] && Object.keys(navData[system]).length > 0) ||
      (factionKillBonds[system] && Object.keys(factionKillBonds[system]).length > 0)
    );
  };

  // Helper function to get missions data for a system
  const getMissionsData = (system: string) => {
    if (!missions[system]) return [];

    const result: { commander: string; faction: string; influence: number }[] = [];

    Object.entries(missions[system]).forEach(([commander, factionData]) => {
      Object.entries(factionData as Record<string, number>).forEach(([faction, influence]) => {
        result.push({ commander, faction, influence });
      });
    });

    return result;
  };

  // Helper function to get market buy data for a system
  const getMarketBuyData = (system: string) => {
    if (!marketBuy[system]) return [];

    const result: { commander: string; station: string; credits: string }[] = [];

    Object.entries(marketBuy[system]).forEach(([commander, stationData]) => {
      Object.entries(stationData as Record<string, string>).forEach(([station, credits]) => {
        result.push({ commander, station, credits: formatCredits(credits) });
      });
    });

    return result;
  };

  // Helper function to get market sell data for a system
  const getMarketSellData = (system: string) => {
    if (!marketSell[system]) return [];

    const result: { commander: string; station: string; credits: string }[] = [];

    Object.entries(marketSell[system]).forEach(([commander, stationData]) => {
      Object.entries(stationData as Record<string, string>).forEach(([station, credits]) => {
        result.push({ commander, station, credits: formatCredits(credits) });
      });
    });

    return result;
  };

  // Helper function to get nav data for a system
  const getNavDataData = (system: string) => {
    if (!navData[system]) return [];

    const result: { commander: string; station: string; credits: string }[] = [];

    Object.entries(navData[system]).forEach(([commander, stationData]) => {
      Object.entries(stationData as Record<string, string>).forEach(([station, credits]) => {
        result.push({ commander, station, credits: formatCredits(credits) });
      });
    });

    return result;
  };

  // Helper function to get bounties data for a system
  const getBountiesData = (system: string) => {
    if (!bounties[system]) return [];

    const result: { commander: string; credits: string }[] = [];

    Object.entries(bounties[system]).forEach(([commander, credits]) => {
      result.push({ commander, credits: formatCredits(credits as string) });
    });

    return result;
  };

  // Helper function to get faction kill bonds data for a system
  const getFactionKillBondsData = (system: string) => {
    if (!factionKillBonds[system]) return [];

    const result: { commander: string; victimFaction: string; awardingFaction: string; totalBond: string }[] = [];

    Object.entries(factionKillBonds[system]).forEach(([commander, bondsData]) => {
      (bondsData as Array<{ awarding_faction: string; total_bond: string; victim_faction: string }>).forEach(bond => {
        result.push({
          commander,
          victimFaction: bond.victim_faction,
          awardingFaction: bond.awarding_faction,
          totalBond: formatCredits(bond.total_bond)
        });
      });
    });

    return result;
  };

  function copyToClipboard(msg: string) {
    navigator.clipboard.writeText('```' + msg + '```');
  }

  return (
    <main className="container">
      <img className="logo" src="dvc.png" width={300} alt="" />
      <h1>Gestione BGS</h1>
      <label htmlFor="delta">Scarto influenza: {delta}</label>
      <input defaultValue={delta} onChange={(e) => setDelta(parseInt(e.target.value))} type="range" min="1" max="100" id="delta" className="delta" name="delta"></input>
      <form
        className="row"
      >
        <button className={greetMsg ? "active" : ""} onClick={(e) => { e.preventDefault(); getDelta(); }} type="submit">
          {loadingDelta ? <span className="loader"></span> : ""}
          <span>Calcola delta</span>
        </button>
        <button className={inf ? "active" : ""} onClick={(e) => { e.preventDefault(); activities(); }} style={{ marginLeft: "1em" }} type="submit">
          {loadingInf ? <span className="loader"></span> : ""}
          <span>Attivita CMDRs</span>
        </button>
      </form>
      <p>
        {greetMsg ? <div>
          <pre>{greetMsg}</pre>
          <button onClick={() => copyToClipboard(greetMsg)}><span>Copia nella clipboard</span></button>
        </div> : ""}
      </p>

      {inf && systems.length > 0 && (
        <div className="bgs-summary">
          <h2>Riepilogo Attività BGS</h2>
          <div className="date-filters" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div className="date-filter">
              <label style={{ marginRight: '1em' }} htmlFor="date-from">Da:</label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                locale="it"
                dateFormat="dd/MM/yyyy HH:mm"
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                className="datetime-select"
              />
            </div>
            <div className="date-filter">
              <label style={{ marginRight: '1em' }} htmlFor="date-to">A:</label>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                locale="it"
                dateFormat="dd/MM/yyyy HH:mm"
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                className="datetime-select"
              />
            </div>
          </div>
          <div className="system-list">
            {systems.filter(system => hasSystemData(system)).map(system => (
              <div key={system} className="system-container">
                <div
                  className={`system-header ${expandedSystems[system] ? 'expanded' : ''}`}
                  onClick={() => toggleSystemExpansion(system)}
                >
                  <h3>{system}</h3>
                  <span className="expand-icon">{expandedSystems[system] ? '▼' : '▶'}</span>
                </div>

                {expandedSystems[system] && (
                  <div className="system-details">
                    {/* Missions Table */}
                    {getMissionsData(system).length > 0 && (
                      <div className="activity-section">
                        <h4>Missioni</h4>
                        <table className="bgs-table">
                          <thead>
                            <tr>
                              <th>CMDR</th>
                              <th>Fazione</th>
                              <th>Influenza</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getMissionsData(system).map((item, index) => (
                              <tr key={`mission-${index}`}>
                                <td>{item.commander}</td>
                                <td>{item.faction}</td>
                                <td>{item.influence}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Market Buy Table */}
                    {getMarketBuyData(system).length > 0 && (
                      <div className="activity-section">
                        <h4>Market Buy</h4>
                        <table className="bgs-table">
                          <thead>
                            <tr>
                              <th>CMDR</th>
                              <th>Stazione</th>
                              <th>Crediti</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getMarketBuyData(system).map((item, index) => (
                              <tr key={`market-buy-${index}`}>
                                <td>{item.commander}</td>
                                <td>{item.station}</td>
                                <td>{item.credits}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Market Sell Table */}
                    {getMarketSellData(system).length > 0 && (
                      <div className="activity-section">
                        <h4>Market Sell</h4>
                        <table className="bgs-table">
                          <thead>
                            <tr>
                              <th>CMDR</th>
                              <th>Stazione</th>
                              <th>Crediti</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getMarketSellData(system).map((item, index) => (
                              <tr key={`market-sell-${index}`}>
                                <td>{item.commander}</td>
                                <td>{item.station}</td>
                                <td>{item.credits}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Nav Data Table */}
                    {getNavDataData(system).length > 0 && (
                      <div className="activity-section">
                        <h4>Nav Data</h4>
                        <table className="bgs-table">
                          <thead>
                            <tr>
                              <th>CMDR</th>
                              <th>Stazione</th>
                              <th>Crediti</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getNavDataData(system).map((item, index) => (
                              <tr key={`nav-data-${index}`}>
                                <td>{item.commander}</td>
                                <td>{item.station}</td>
                                <td>{item.credits}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Bounties Table */}
                    {getBountiesData(system).length > 0 && (
                      <div className="activity-section">
                        <h4>Bounties</h4>
                        <table className="bgs-table">
                          <thead>
                            <tr>
                              <th>CMDR</th>
                              <th>Crediti</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getBountiesData(system).map((item, index) => (
                              <tr key={`bounty-${index}`}>
                                <td>{item.commander}</td>
                                <td>{item.credits}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Faction Kill Bonds Table */}
                    {getFactionKillBondsData(system).length > 0 && (
                      <div className="activity-section">
                        <h4>Faction Kill Bonds</h4>
                        <table className="bgs-table">
                          <thead>
                            <tr>
                              <th>CMDR</th>
                              <th>Fazione Riconoscente</th>
                              <th>Fazione Vittima</th>
                              <th>Bond Totali</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getFactionKillBondsData(system).map((item, index) => (
                              <tr key={`kill-bond-${index}`}>
                                <td>{item.commander}</td>
                                <td>{item.awardingFaction}</td>
                                <td>{item.victimFaction}</td>
                                <td>{item.totalBond}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <footer>&copy; 2025 DVC Corp.</footer>
    </main>
  );
}

export default App;
